/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigOverflowButtons,
  figBooleanAttribute,
  figDefineElement,
  figNextFrame,
  figScrollOverflowPage,
  figSyncOverflowState,
} from "../runtime/index.js";

/**
 * A selectable toolbar with configurable layout and overflow controls.
 * @attr {string} value - The selected item value
 * @attr {boolean} disabled - Disables all items
 * @attr {"horizontal"|"vertical"} layout - Item direction (default: horizontal)
 * @attr {"buttons"|"scrollbar"} overflow - Overflow controls (default: scrollbar)
 * @slot prepend - Fixed content before the scrolling viewport
 * @slot append - Fixed content after the scrolling viewport
 * @fires input - Selected value
 * @fires change - Selected value
 */
class FigToolbelt extends HTMLElement {
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #boundHandleSlotChange = this.#handleSlotChange.bind(this);
  #boundSyncOverflow = this.#syncOverflow.bind(this);
  #viewport = null;
  #itemSlot = null;
  #prependSlot = null;
  #appendSlot = null;
  #mutationObserver = null;
  #resizeObserver = null;
  #navStart = null;
  #navEnd = null;
  #parentDisabledItems = new WeakSet();
  #syncingValue = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const frame = document.createElement("div");
    frame.setAttribute("part", "frame");

    this.#prependSlot = document.createElement("slot");
    this.#prependSlot.name = "prepend";
    this.#prependSlot.setAttribute("part", "prepend");
    this.#prependSlot.hidden = true;
    this.#prependSlot.style.display = "none";

    const scrollRegion = document.createElement("div");
    scrollRegion.setAttribute("part", "scroll-region");

    const startSlot = document.createElement("slot");
    startSlot.name = "start";
    startSlot.style.display = "contents";

    this.#viewport = document.createElement("div");
    this.#viewport.className = "fig-overflow-fade";
    this.#viewport.setAttribute("part", "viewport");
    this.#itemSlot = document.createElement("slot");
    this.#itemSlot.style.display = "contents";
    this.#viewport.append(this.#itemSlot);

    const endSlot = document.createElement("slot");
    endSlot.name = "end";
    endSlot.style.display = "contents";

    this.#appendSlot = document.createElement("slot");
    this.#appendSlot.name = "append";
    this.#appendSlot.setAttribute("part", "append");
    this.#appendSlot.hidden = true;
    this.#appendSlot.style.display = "none";

    scrollRegion.append(startSlot, this.#viewport, endSlot);
    frame.append(this.#prependSlot, scrollRegion, this.#appendSlot);
    shadow.append(frame);

    for (const slot of [
      this.#prependSlot,
      this.#itemSlot,
      this.#appendSlot,
    ]) {
      slot.addEventListener("slotchange", this.#boundHandleSlotChange);
    }
  }

  static get observedAttributes() {
    return ["value", "disabled", "layout", "overflow"];
  }

  get #isVertical() {
    return this.getAttribute("layout") === "vertical";
  }

  get #overflowMode() {
    return this.getAttribute("overflow") === "buttons"
      ? "buttons"
      : "scrollbar";
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "toolbar");
    this.#syncFixedSlots();
    this.#syncOrientation();
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.#viewport.addEventListener("scroll", this.#boundSyncOverflow);
    this.#applyOverflowMode();
    this.#startObserver();
    this.#startResizeObserver();
    figNextFrame(this, () => {
      this.#syncSelection();
      this.#applyDisabled(figBooleanAttribute(this, "disabled"));
      this.#syncTabIndexes();
      this.#syncOverflow();
      this.#scrollSelectedItemIntoView(undefined, "auto");
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.#viewport.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#removeNavButtons();
  }

  get value() {
    return this.#itemValue(this.selectedItem);
  }

  set value(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(value));
    }
  }

  get selectedItem() {
    return (
      this.#items().find((item) => figBooleanAttribute(item, "selected")) ||
      null
    );
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value" && !this.#syncingValue) {
      this.#selectByValue(newValue);
    }
    if (name === "disabled") {
      this.#applyDisabled(newValue !== null && newValue !== "false");
    }
    if (name === "overflow") {
      this.#applyOverflowMode();
      requestAnimationFrame(() => this.#syncOverflow());
    }
    if (name === "layout") {
      this.#syncOrientation();
      if (this.#isVertical) this.#viewport.scrollLeft = 0;
      else this.#viewport.scrollTop = 0;
      this.#applyOverflowMode();
      requestAnimationFrame(() => {
        this.#syncOverflow();
        this.#scrollSelectedItemIntoView(undefined, "auto");
      });
    }
  }

  #items() {
    const itemsByRegion = {
      prepend: [],
      viewport: [],
      append: [],
    };
    const candidates = this.querySelectorAll(
      "fig-toolbelt-item, fig-button:not([data-fig-toolbelt-nav])",
    );
    for (const item of candidates) {
      if (item.closest("fig-toolbelt") !== this) continue;
      if (
        item.localName === "fig-button" &&
        (item.closest("fig-toolbelt-item") || item.closest("fig-menu"))
      ) {
        continue;
      }
      const region = this.#itemRegion(item);
      if (region) itemsByRegion[region].push(item);
    }
    return [
      ...itemsByRegion.prepend,
      ...itemsByRegion.viewport,
      ...itemsByRegion.append,
    ];
  }

  #itemRegion(item) {
    let topLevelChild = item;
    while (topLevelChild.parentElement && topLevelChild.parentElement !== this) {
      topLevelChild = topLevelChild.parentElement;
    }
    if (topLevelChild.parentElement !== this) return null;
    const slot = topLevelChild.getAttribute("slot") || "";
    if (slot === "prepend" || slot === "append") return slot;
    return slot ? null : "viewport";
  }

  #availableItems() {
    return this.#items().filter((item) => !figBooleanAttribute(item, "disabled"));
  }

  #itemValue(item) {
    if (!item) return "";
    if (item.localName === "fig-toolbelt-item") return item.value;
    return (
      item.getAttribute("value") ||
      item.getAttribute("aria-label") ||
      item.textContent?.trim() ||
      ""
    );
  }

  #eventItem(event) {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    const wrappedItem = target.closest("fig-toolbelt-item");
    if (wrappedItem?.closest("fig-toolbelt") === this) return wrappedItem;
    const button = target.closest(
      "fig-button:not([data-fig-toolbelt-nav])",
    );
    if (
      button?.closest("fig-toolbelt") === this &&
      !button.closest("fig-toolbelt-item") &&
      !button.closest("fig-menu")
    ) {
      return button;
    }
    return null;
  }

  #applyDisabled(disabled) {
    if (disabled) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");
    for (const item of this.#items()) {
      if (disabled) {
        if (!figBooleanAttribute(item, "disabled")) {
          this.#parentDisabledItems.add(item);
          item.setAttribute("disabled", "");
        }
      } else if (this.#parentDisabledItems.has(item)) {
        this.#parentDisabledItems.delete(item);
        item.removeAttribute("disabled");
      }
    }
    this.#syncTabIndexes();
  }

  #syncSelection() {
    const declaredValue = this.getAttribute("value");
    if (declaredValue !== null) {
      this.#selectByValue(declaredValue);
      return;
    }

    const selectedItems = this.#items().filter((item) =>
      figBooleanAttribute(item, "selected"),
    );
    const selected = selectedItems[0] || null;
    for (const item of selectedItems.slice(1)) {
      item.removeAttribute("selected");
    }
    if (selected) this.#reflectValue(this.#itemValue(selected));
  }

  #selectByValue(value) {
    const target =
      value === null
        ? null
        : this.#items().find((item) => this.#itemValue(item) === value) || null;
    for (const item of this.#items()) {
      item.toggleAttribute("selected", item === target);
    }
    this.#syncTabIndexes(target);
    if (target) this.#scrollSelectedItemIntoView(target);
  }

  #selectItem(target, { emit = false, focus = false } = {}) {
    if (!target || figBooleanAttribute(target, "disabled")) return false;
    const previousItem = this.selectedItem;
    const previousValue = this.value;
    for (const item of this.#items()) {
      item.toggleAttribute("selected", item === target);
    }
    const nextValue = this.#itemValue(target);
    this.#reflectValue(nextValue);
    this.#syncTabIndexes(target);
    if (focus) target.focus();
    this.#scrollSelectedItemIntoView(target);
    if (emit && (previousItem !== target || previousValue !== nextValue)) {
      this.#emitSelectionEvents();
    }
    return true;
  }

  #reflectValue(value) {
    this.#syncingValue = true;
    this.setAttribute("value", value);
    this.#syncingValue = false;
  }

  #syncTabIndexes(preferredItem) {
    const items = this.#items();
    const availableItems = this.#availableItems();
    const active =
      (preferredItem && availableItems.includes(preferredItem) && preferredItem) ||
      (availableItems.includes(document.activeElement) && document.activeElement) ||
      (availableItems.includes(this.selectedItem) && this.selectedItem) ||
      availableItems[0] ||
      null;
    for (const item of items) {
      item.setAttribute("tabindex", item === active ? "0" : "-1");
    }
  }

  #handleClick(event) {
    if (figBooleanAttribute(this, "disabled")) return;
    const target = this.#eventItem(event);
    if (!target) return;
    this.#selectItem(target, { emit: true });
  }

  #handleKeyDown(event) {
    if (figBooleanAttribute(this, "disabled")) return;
    const target = this.#eventItem(event);
    if (!target) return;

    if (event.key === "Enter" || event.key === " ") {
      if (target.localName === "fig-button") return;
      event.preventDefault();
      this.#selectItem(target, { emit: true });
      return;
    }

    const items = this.#availableItems();
    if (!items.length) return;
    const currentIndex = Math.max(0, items.indexOf(target));
    let nextIndex = currentIndex;
    switch (event.key) {
      case "ArrowLeft":
        if (this.#isVertical) return;
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case "ArrowUp":
        if (!this.#isVertical) return;
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case "ArrowRight":
        if (this.#isVertical) return;
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case "ArrowDown":
        if (!this.#isVertical) return;
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.#syncTabIndexes(items[nextIndex]);
    items[nextIndex].focus();
    this.#scrollItemIntoView(items[nextIndex]);
  }

  #emitSelectionEvents() {
    const detail = this.value;
    this.dispatchEvent(new CustomEvent("input", { detail, bubbles: true }));
    this.dispatchEvent(new CustomEvent("change", { detail, bubbles: true }));
  }

  #handleSlotChange() {
    this.#syncFixedSlots();
    this.#syncSelection();
    this.#syncTabIndexes();
    requestAnimationFrame(() => {
      this.#syncOverflow();
      this.#scrollSelectedItemIntoView();
    });
  }

  #syncFixedSlots() {
    for (const slot of [this.#prependSlot, this.#appendSlot]) {
      const hidden = slot.assignedElements({ flatten: true }).length === 0;
      slot.hidden = hidden;
      if (hidden) {
        slot.style.setProperty("display", "none", "important");
      } else {
        slot.style.removeProperty("display");
      }
    }
  }

  #startObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver((records) => {
      const authoredChange = records.some(
        (record) =>
          record.type === "childList" ||
          (record.target instanceof Element &&
            record.target.matches(
              "fig-toolbelt-item, fig-button:not([data-fig-toolbelt-nav])",
            ) &&
            record.target.closest("fig-toolbelt") === this),
      );
      if (!authoredChange) return;
      this.#applyOverflowMode();
      this.#syncSelection();
      this.#applyDisabled(figBooleanAttribute(this, "disabled"));
      this.#syncTabIndexes();
      requestAnimationFrame(() => {
        this.#syncOverflow();
        this.#scrollSelectedItemIntoView();
      });
    });
    this.#mutationObserver.observe(this, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ["value", "selected", "disabled"],
    });
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => this.#syncOverflow());
    this.#resizeObserver.observe(this);
    this.#resizeObserver.observe(this.#viewport);
  }

  #syncOverflow() {
    if (this.#overflowMode === "scrollbar") return;
    figSyncOverflowState(
      this,
      this.#viewport,
      this.#isVertical ? "y" : "x",
    );
  }

  #syncOrientation() {
    this.setAttribute(
      "aria-orientation",
      this.#isVertical ? "vertical" : "horizontal",
    );
    this.#viewport.classList.add("fig-overflow-fade");
    this.#viewport.classList.toggle(
      "fig-overflow-fade-horizontal",
      !this.#isVertical,
    );
  }

  #applyOverflowMode() {
    if (this.#overflowMode === "scrollbar") {
      this.#removeNavButtons();
    } else {
      this.#createNavButtons();
    }
  }

  #createNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.contains(this.#navStart) &&
      this.contains(this.#navEnd)
    ) {
      this.#positionNavButtons();
      return;
    }
    this.#navStart?.remove();
    this.#navEnd?.remove();
    const buttons = createFigOverflowButtons({
      owner: "toolbelt",
      onStart: () => this.#scrollByPage(-1),
      onEnd: () => this.#scrollByPage(1),
    });
    this.#navStart = buttons.start;
    this.#navEnd = buttons.end;
    this.#navStart.setAttribute("slot", "start");
    this.#navEnd.setAttribute("slot", "end");
    this.#positionNavButtons();
  }

  #positionNavButtons() {
    if (this.firstElementChild !== this.#navStart) this.prepend(this.#navStart);
    if (this.lastElementChild !== this.#navEnd) this.append(this.#navEnd);
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.classList.remove("overflow-start", "overflow-end");
  }

  #scrollByPage(direction) {
    figScrollOverflowPage(
      this.#viewport,
      this.#isVertical ? "y" : "x",
      direction,
    );
  }

  #scrollSelectedItemIntoView(
    item = this.selectedItem,
    behavior = "smooth",
  ) {
    if (item) this.#scrollItemIntoView(item, behavior);
  }

  #scrollItemIntoView(item, behavior = "smooth") {
    if (!item || this.#itemRegion(item) !== "viewport") return;
    requestAnimationFrame(() => {
      if (!this.isConnected || !item.isConnected) return;
      const isVertical = this.#isVertical;
      const hasOverflow = isVertical
        ? this.#viewport.scrollHeight > this.#viewport.clientHeight
        : this.#viewport.scrollWidth > this.#viewport.clientWidth;
      if (!hasOverflow) return;
      const containerRect = this.#viewport.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      if (isVertical) {
        const itemCenter =
          itemRect.top -
          containerRect.top +
          this.#viewport.scrollTop +
          itemRect.height / 2;
        this.#viewport.scrollTo({
          top: itemCenter - this.#viewport.clientHeight / 2,
          behavior,
        });
      } else {
        const itemCenter =
          itemRect.left -
          containerRect.left +
          this.#viewport.scrollLeft +
          itemRect.width / 2;
        this.#viewport.scrollTo({
          left: itemCenter - this.#viewport.clientWidth / 2,
          behavior,
        });
      }
      this.#syncOverflow();
    });
  }
}
figDefineElement("fig-toolbelt", FigToolbelt);

export { FigToolbelt };
