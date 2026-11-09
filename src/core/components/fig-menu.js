/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigOverflowButtons,
  figAdoptVerticalOverflowStyles,
  figBuiltInPolyfillReady,
  figDefineElement,
  figNeedsBuiltInPolyfill,
  figScrollOverflowPage,
  figSyncOverflowState,
  figUniqueId,
  figVerticalOverflowSheet,
} from "../runtime/index.js";
import { figWarnInvariant } from "../../shared/invariants.js";

const FIG_MENU_CHILD_TAGS = new Set([
  "FIG-MENU-ITEM",
  "FIG-SEPARATOR",
  "FIG-MENU-SEPARATOR",
]);
const FIG_MENU_TRIGGER_SLOT = "trigger";

function figIsMenuChild(node) {
  return node?.nodeType === 1 && FIG_MENU_CHILD_TAGS.has(node.tagName);
}

function figMenuTriggerHost(menu, trigger) {
  if (!menu || !trigger) return null;
  let host = trigger;
  while (host.parentElement && host.parentElement !== menu) {
    host = host.parentElement;
  }
  return host.parentElement === menu ? host : null;
}

class FigMenu extends HTMLElement {
  #popup = null;
  #panel = null;
  #itemSlot = null;
  #trigger = null;
  #triggerHost = null;
  #virtualAnchor = null;
  #observer = null;
  #resizeObserver = null;
  #navStart = null;
  #navEnd = null;
  #initialized = false;
  #boundTriggerClick;
  #boundTriggerContextMenu;
  #boundHostClick;
  #boundMenuKeydown;
  #boundPopupLifecycle;
  #boundSlotChange;
  #boundSyncOverflow = this.#syncOverflow.bind(this);
  #focusedIndex = -1;
  #pointerReleaseController = null;
  #pointerReleaseTimer = 0;
  #showAtFrame = 0;
  #openSyncFrame = 0;
  #popupState = "closed";

  static get observedAttributes() {
    return ["position", "offset", "closedby", "disabled", "open", "trigger"];
  }

  constructor() {
    super();
    this.#boundTriggerClick = this.#handleTriggerClick.bind(this);
    this.#boundTriggerContextMenu = this.#handleTriggerContextMenu.bind(this);
    this.#boundHostClick = this.#handleHostClick.bind(this);
    this.#boundMenuKeydown = this.#handleMenuKeydown.bind(this);
    this.#boundPopupLifecycle = this.#handlePopupLifecycle.bind(this);
    this.#boundSlotChange = this.#syncOverflow.bind(this);
    this.#initialize();
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val ?? "");
  }

  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }

  set open(val) {
    if (val) {
      if (this.#isDisabled()) return;
      this.setAttribute("open", "");
    } else {
      this.#cancelPendingOpen();
      this.removeAttribute("open");
    }
  }

  connectedCallback() {
    this.#detectTrigger();
    this.#setupListeners();
    this.#setupOverflow();
    this.#setupObserver();
    this.#syncDisabled();

    if (this.open) {
      this.#openMenu();
    }
  }

  disconnectedCallback() {
    this.#cancelPendingOpen();
    this.#closeMenu();
    this.#teardownListeners();
    this.#teardownOverflow();
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "open") {
      if (newValue === null || newValue === "false") {
        this.#closeMenu();
      } else {
        if (this.#isDisabled()) {
          this.removeAttribute("open");
          return;
        }
        this.#openMenu();
      }
      return;
    }

    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }

    if (this.#popup && (name === "position" || name === "offset" || name === "closedby")) {
      if (newValue !== null) {
        this.#popup.setAttribute(name, newValue);
      } else {
        this.#popup.removeAttribute(name);
      }
    }
  }

  #initialize() {
    if (this.#initialized) return;
    this.#initialized = true;
    const shadow = this.attachShadow({ mode: "open" });
    figAdoptVerticalOverflowStyles(shadow, { icons: true });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: contents;
      }
      /* Listbox chrome comes from document fig-menu::part(listbox).
         Stay in this shadow so item slots keep working — unlike tooltips,
         we cannot portal this popup to the overlay root.
         Overflow/hover/icon chrome lives in figVerticalOverflowSheet. */
      dialog[is="fig-popup"] {
        flex-direction: column;
        overflow: hidden;
        padding: 0;
      }
      dialog[is="fig-popup"][open] {
        display: flex;
      }
      .fig-menu-items {
        display: flex;
        flex-direction: column;
        flex: 0 0 auto;
      }
      .fig-menu-items > ::slotted(fig-menu-item),
      .fig-menu-items > ::slotted(fig-separator),
      .fig-menu-items > ::slotted(fig-menu-separator) {
        flex-shrink: 0;
      }
    `;

    const triggerSlot = document.createElement("slot");
    triggerSlot.setAttribute("name", FIG_MENU_TRIGGER_SLOT);

    const popup = document.createElement("dialog", { is: "fig-popup" });
    popup.setAttribute("is", "fig-popup");
    popup.classList.add("fig-menu-popup");
    popup.setAttribute("part", "listbox");
    popup.setAttribute("theme", "menu");
    popup.setAttribute("role", "menu");
    popup.id = figUniqueId();
    if ("popover" in HTMLElement.prototype) {
      popup.setAttribute("popover", "manual");
    }

    const panel = document.createElement("div");
    panel.className = "fig-menu-options";
    panel.setAttribute("part", "options");
    panel.setAttribute("role", "presentation");

    const items = document.createElement("div");
    items.className = "fig-menu-items";
    const itemSlot = document.createElement("slot");
    items.appendChild(itemSlot);
    panel.appendChild(items);
    popup.appendChild(panel);

    shadow.append(style, triggerSlot, popup);

    this.#popup = popup;
    this.#panel = panel;
    this.#itemSlot = itemSlot;
    this.#syncPopupAttrs();
    popup.addEventListener(
      "fig-popup-lifecycle",
      this.#boundPopupLifecycle,
    );
    itemSlot.addEventListener("slotchange", this.#boundSlotChange);
  }

  #syncPopupAttrs() {
    if (!this.#popup) return;
    const position = this.getAttribute("position") || "bottom left";
    this.#popup.setAttribute("position", position);
    const offset = this.getAttribute("offset");
    if (offset) this.#popup.setAttribute("offset", offset);
    else this.#popup.removeAttribute("offset");
    const closedby = this.getAttribute("closedby");
    if (closedby) this.#popup.setAttribute("closedby", closedby);
    else this.#popup.removeAttribute("closedby");
  }

  #detectTrigger() {
    const explicit = Array.from(
      this.querySelectorAll(
        `[fig-menu-trigger], :scope > [slot="${FIG_MENU_TRIGGER_SLOT}"]`,
      ),
    );
    const inferred = Array.from(
      this.querySelectorAll(
        `:scope > :not(fig-menu-item):not(fig-separator):not(fig-menu-separator):not([slot="${FIG_MENU_TRIGGER_SLOT}"])`,
      ),
    );
    const candidates = [...new Set([...explicit, ...inferred])];
    if (candidates.length > 1) {
      figWarnInvariant(
        `fig-menu-triggers:${candidates.length}`,
        `fig-menu found ${candidates.length} possible triggers; mark exactly one with fig-menu-trigger.`,
      );
    }
    this.#trigger = explicit[0] || inferred[0] || null;
    this.#assignTriggerSlot();
  }

  #assignTriggerSlot() {
    const host = figMenuTriggerHost(this, this.#trigger);
    this.#triggerHost = host;
    if (!host) return;
    if (host.getAttribute("slot") !== FIG_MENU_TRIGGER_SLOT) {
      host.setAttribute("slot", FIG_MENU_TRIGGER_SLOT);
    }
  }

  #usesContextMenuTrigger() {
    const trigger = (this.getAttribute("trigger") || "").toLowerCase();
    return trigger === "contextmenu" || this.hasAttribute("contextmenu");
  }

  #bindTrigger() {
    if (!this.#trigger || !this.#popup) return;
    this.#trigger.addEventListener("click", this.#boundTriggerClick);
    this.#trigger.addEventListener("contextmenu", this.#boundTriggerContextMenu);
    this.#trigger.setAttribute("aria-haspopup", "menu");
    this.#trigger.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.#trigger.setAttribute("aria-controls", this.#popup.id);
    this.#popup.anchor = this.#trigger;
  }

  #unbindTrigger() {
    if (!this.#trigger) return;
    this.#trigger.removeEventListener("click", this.#boundTriggerClick);
    this.#trigger.removeEventListener("contextmenu", this.#boundTriggerContextMenu);
  }

  #setupListeners() {
    this.addEventListener("keydown", this.#boundMenuKeydown);
    this.addEventListener("click", this.#boundHostClick);
    this.#bindTrigger();
    this.#popup?.addEventListener("keydown", this.#boundMenuKeydown);
  }

  #teardownListeners() {
    this.removeEventListener("keydown", this.#boundMenuKeydown);
    this.removeEventListener("click", this.#boundHostClick);
    this.#unbindTrigger();
    this.#popup?.removeEventListener("keydown", this.#boundMenuKeydown);
  }

  #setupObserver() {
    if (this.#observer) return;
    this.#observer = new MutationObserver((mutations) => {
      let triggerChanged = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (figIsMenuChild(node)) continue;
          if (node.parentElement === this) triggerChanged = true;
        }
        for (const node of mutation.removedNodes) {
          if (node === this.#trigger || node === this.#triggerHost) {
            triggerChanged = true;
          }
        }
      }
      if (triggerChanged || !this.#trigger) {
        this.#unbindTrigger();
        this.#detectTrigger();
        this.#bindTrigger();
        this.#syncDisabled();
      }
      this.#syncOverflow();
    });
    this.#observer.observe(this, { childList: true });
  }

  #setupOverflow() {
    if (!this.#panel) return;
    this.#ensureNavButtons();
    this.#panel.addEventListener("scroll", this.#boundSyncOverflow, {
      passive: true,
    });
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => this.#syncOverflow());
    this.#resizeObserver.observe(this.#panel);
    requestAnimationFrame(() => this.#syncOverflow());
  }

  #teardownOverflow() {
    this.#panel?.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#removeNavButtons();
  }

  #syncOverflow() {
    const scrollable = figSyncOverflowState(this.#panel, this.#panel, "y");
    this.classList.toggle(
      "overflow-start",
      Boolean(this.#panel?.classList.contains("overflow-start")),
    );
    this.classList.toggle(
      "overflow-end",
      Boolean(this.#panel?.classList.contains("overflow-end")),
    );
    return scrollable;
  }

  #ensureNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.#panel?.contains(this.#navStart) &&
      this.#panel?.contains(this.#navEnd)
    ) {
      return;
    }
    this.#removeNavButtons();
    const buttons = createFigOverflowButtons({
      owner: "menu",
      startLabel: "Scroll up",
      endLabel: "Scroll down",
      onStart: () => figScrollOverflowPage(this.#panel, "y", -1),
      onEnd: () => figScrollOverflowPage(this.#panel, "y", 1),
    });
    this.#navStart = buttons.start;
    this.#navEnd = buttons.end;
    this.#panel.prepend(this.#navStart);
    this.#panel.append(this.#navEnd);
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.#panel?.classList.remove("overflow-start", "overflow-end");
    this.classList.remove("overflow-start", "overflow-end");
  }

  #getItems() {
    return Array.from(this.querySelectorAll(":scope > fig-menu-item")).filter(
      (item) =>
        !item.hidden &&
        (!item.hasAttribute("disabled") || item.getAttribute("disabled") === "false"),
    );
  }

  #syncFocusedIndex() {
    const items = this.#getItems();
    if (!items.length) {
      this.#focusedIndex = -1;
      return;
    }
    const active = document.activeElement;
    const idx = items.findIndex(
      (item) => item === active || item.contains(active),
    );
    this.#focusedIndex = idx >= 0 ? idx : -1;
  }

  #focusItemAt(index) {
    const items = this.#getItems();
    if (!items.length) return;
    const wrapped = (index + items.length) % items.length;
    this.#focusedIndex = wrapped;
    const item = items[wrapped];
    item.focus();
    this.#scrollItemIntoView(item);
  }

  #scrollItemIntoView(item) {
    const panel = this.#panel;
    if (!panel || !item) return;
    requestAnimationFrame(() => {
      if (!panel.isConnected || !item.isConnected) return;
      const scrollSize = panel.scrollHeight;
      const clientSize = panel.clientHeight;
      if (scrollSize <= clientSize + 1) {
        this.#syncOverflow();
        return;
      }
      const itemRect = item.getBoundingClientRect();
      const hostRect = panel.getBoundingClientRect();
      const elementStart = itemRect.top - hostRect.top + panel.scrollTop;
      const maxScroll = scrollSize - clientSize;
      const nextScroll = Math.max(
        0,
        Math.min(elementStart + itemRect.height / 2 - clientSize / 2, maxScroll),
      );
      panel.scrollTo({ top: nextScroll, behavior: "auto" });
      this.#syncOverflow();
    });
  }

  #syncDisabled() {
    const disabled = this.#isDisabled();
    if (disabled) {
      if (this.open) this.removeAttribute("open");
      else this.#closeMenu();
    }
    if (!this.#trigger) return;
    if (disabled) {
      this.#trigger.setAttribute("disabled", "");
      this.#trigger.setAttribute("aria-disabled", "true");
      this.#trigger.setAttribute("aria-expanded", "false");
    } else {
      this.#trigger.removeAttribute("disabled");
      this.#trigger.removeAttribute("aria-disabled");
    }
  }

  #isDisabled() {
    return (
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false"
    );
  }

  #handleTriggerClick(e) {
    if (this.#usesContextMenuTrigger()) return;
    if (this.#isDisabled()) return;
    e.stopPropagation();
    if (this.open) {
      this.open = false;
    } else {
      if (this.#popup && this.#trigger) {
        this.#popup.anchor = this.#trigger;
      }
      this.open = true;
    }
  }

  #handleTriggerContextMenu(e) {
    if (!this.#usesContextMenuTrigger()) return;
    if (this.#isDisabled()) return;
    e.preventDefault();
    e.stopPropagation();
    this.#showAtAfterPointerRelease(e.clientX, e.clientY);
  }

  #showAtAfterPointerRelease(x, y) {
    this.#cancelPendingOpen();
    const controller = new AbortController();
    this.#pointerReleaseController = controller;
    const finish = (shouldOpen) => {
      if (this.#pointerReleaseController !== controller) return;
      this.#cancelPointerReleaseWait();
      if (shouldOpen && this.isConnected) this.showAt(x, y);
    };
    window.addEventListener("pointerup", () => finish(true), {
      once: true,
      capture: true,
      signal: controller.signal,
    });
    window.addEventListener("pointercancel", () => finish(false), {
      once: true,
      capture: true,
      signal: controller.signal,
    });
    this.#pointerReleaseTimer = window.setTimeout(() => finish(true), 180);
  }

  #cancelPointerReleaseWait() {
    if (this.#pointerReleaseTimer) {
      window.clearTimeout(this.#pointerReleaseTimer);
      this.#pointerReleaseTimer = 0;
    }
    this.#pointerReleaseController?.abort();
    this.#pointerReleaseController = null;
  }

  #cancelPendingOpen() {
    this.#cancelPointerReleaseWait();
    if (this.#showAtFrame) {
      cancelAnimationFrame(this.#showAtFrame);
      this.#showAtFrame = 0;
    }
    if (this.#openSyncFrame) {
      cancelAnimationFrame(this.#openSyncFrame);
      this.#openSyncFrame = 0;
    }
  }

  #handleHostClick(e) {
    if (this.#isDisabled()) return;
    if (this.#trigger?.contains(e.target) || this.#triggerHost?.contains(e.target)) {
      return;
    }
    const item = e.target.closest?.("fig-menu-item");
    // Direct children only — nested fig-menu inside an item has its own host.
    if (!item || item.parentElement !== this) return;
    if (item.hasAttribute("disabled") && item.getAttribute("disabled") !== "false") {
      return;
    }
    e.stopPropagation();
    this.#selectItem(item);
  }

  #handleMenuKeydown(e) {
    if (this.#isDisabled()) return;
    if (e.currentTarget === document && e.key !== "Escape") return;
    // Slotted item keydown crosses the shadow slot, so the popup listener
    // already handles it. Skip the host to avoid double-stepping.
    if (e.currentTarget === this) {
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      if (this.#popup && path.includes(this.#popup)) return;
    }
    if (
      !this.open ||
      (this.#popupState !== "opening" && this.#popupState !== "open")
    ) {
      if (
        this.#trigger?.contains(e.target) &&
        (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        if (this.#popup && this.#trigger) {
          this.#popup.anchor = this.#trigger;
        }
        this.open = true;
        requestAnimationFrame(() => this.#focusItemAt(0));
      }
      return;
    }

    const items = this.#getItems();
    if (!items.length) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        this.#syncFocusedIndex();
        this.#focusItemAt(this.#focusedIndex + 1);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        this.#syncFocusedIndex();
        this.#focusItemAt(this.#focusedIndex - 1);
        break;
      }
      case "Home": {
        e.preventDefault();
        this.#focusItemAt(0);
        break;
      }
      case "End": {
        e.preventDefault();
        this.#focusItemAt(items.length - 1);
        break;
      }
      case "Escape": {
        e.preventDefault();
        this.open = false;
        break;
      }
      case "Enter":
      case " ": {
        this.#syncFocusedIndex();
        const focused = items[this.#focusedIndex];
        if (!focused) return;
        e.preventDefault();
        this.#selectItem(focused);
        break;
      }
    }
  }

  #handlePopupLifecycle(event) {
    this.#popupState = event.detail?.state ?? "closed";
    if (this.#popupState === "closed") {
      if (this.hasAttribute("open")) {
        this.removeAttribute("open");
      }
      this.#trigger?.setAttribute("aria-expanded", "false");
      this.#focusedIndex = -1;
    }
  }

  #selectItem(item) {
    const value = item.getAttribute("value") || item.textContent.trim();
    this.setAttribute("value", value);
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { value, item },
        bubbles: true,
      })
    );
    this.open = false;
  }

  showAt(x, y) {
    this.#cancelPendingOpen();
    if (!this.isConnected || this.#isDisabled()) return;
    this.#virtualAnchor = {
      getBoundingClientRect: () => ({
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
        x,
        y,
      }),
    };
    if (this.#popup) {
      this.#popup.anchor = this.#virtualAnchor;
    }
    if (this.open) this.open = false;
    this.#showAtFrame = requestAnimationFrame(() => {
      this.#showAtFrame = 0;
      if (!this.isConnected || this.#isDisabled()) return;
      this.open = true;
    });
  }

  #openMenu() {
    if (!this.isConnected) {
      this.#closeMenu();
      return;
    }
    if (!this.#popup || this.#isDisabled()) {
      if (this.hasAttribute("open")) this.removeAttribute("open");
      return;
    }
    this.#popup.open = true;
    this.#popupState = this.#popup.lifecycleState ?? "opening";
    document.addEventListener("keydown", this.#boundMenuKeydown, true);
    if (this.#trigger) {
      this.#trigger.setAttribute("aria-expanded", "true");
    }
    this.#focusedIndex = -1;
    if (this.#openSyncFrame) cancelAnimationFrame(this.#openSyncFrame);
    this.#openSyncFrame = requestAnimationFrame(() => {
      this.#openSyncFrame = 0;
      if (!this.isConnected || !this.open) return;
      this.#syncOverflow();
      if (!this.#trigger?.matches?.(":focus-visible")) return;
      this.#focusItemAt(0);
    });
  }

  #closeMenu() {
    this.#cancelPendingOpen();
    if (!this.#popup) return;
    document.removeEventListener("keydown", this.#boundMenuKeydown, true);
    this.#popup.open = false;
    this.#popupState = this.#popup.lifecycleState ?? "closing";
    this.#trigger?.setAttribute("aria-expanded", "false");
  }
}
const defineFigMenu = () => figDefineElement("fig-menu", FigMenu);
if (figNeedsBuiltInPolyfill) {
  figBuiltInPolyfillReady.then(defineFigMenu);
} else {
  defineFigMenu();
}

export { FigMenu };
