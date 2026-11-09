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
 * A custom tabs container element.
 * @attr {string} name - Identifier for the tabs group
 * @attr {"buttons"|"fade"} overflow - Overflow treatment (default: buttons)
 */
class FigTabs extends HTMLElement {
  #boundBeginClick;
  #boundHandleClick;
  #boundHandleKeyDown;
  #boundSyncOverflow = this.#syncOverflow.bind(this);
  #mutationObserver = null;
  #resizeObserver = null;
  #navStart = null;
  #navEnd = null;
  #clickInProgress = false;
  #isUnwrapping = false;
  #parentDisabledTabs = new WeakSet();

  constructor() {
    super();
    this.#boundBeginClick = this.#beginClick.bind(this);
    this.#boundHandleClick = this.handleClick.bind(this);
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
  }

  static get observedAttributes() {
    return ["value", "name", "disabled", "overflow"];
  }

  get #overflowMode() {
    return this.getAttribute("overflow") === "fade" ? "fade" : "buttons";
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "tabs";
    this.setAttribute("role", "tablist");
    if (this.shadowRoot) this.shadowRoot.replaceChildren();
    this.#removeLegacyScroller();
    this.addEventListener("click", this.#boundBeginClick, true);
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("scroll", this.#boundSyncOverflow);
    this.#applyOverflowMode();
    this.#startObserver();
    this.#startResizeObserver();
    figNextFrame(this, () => {
      const value = this.getAttribute("value");
      if (value) {
        this.#selectByValue(value);
      } else {
        const selected = this.querySelector(
          'fig-tab[selected]:not([selected="false"])',
        );
        if (selected) {
          this.selectedTab = selected;
          const selectedValue = this.#resolveTabValue(selected);
          if (selectedValue) this.setAttribute("value", selectedValue);
        }
      }
      if (figBooleanAttribute(this, "disabled")) {
        this.#applyDisabled(true);
      }
      this.#syncTabIndexes();
      this.#syncOverflow();
      this.#scrollSelectedTabIntoView(undefined, "auto");
    });
  }

  #applyDisabled(disabled) {
    const tabs = this.querySelectorAll("fig-tab");
    tabs.forEach((tab) => {
      if (disabled) {
        const alreadyDisabled =
          tab.hasAttribute("disabled") && tab.getAttribute("disabled") !== "false";
        if (!alreadyDisabled) {
          this.#parentDisabledTabs.add(tab);
          tab.setAttribute("disabled", "");
        }
        tab.setAttribute("aria-disabled", "true");
        tab.setAttribute("tabindex", "-1");
      } else if (this.#parentDisabledTabs.has(tab)) {
        this.#parentDisabledTabs.delete(tab);
        tab.removeAttribute("disabled");
        tab.removeAttribute("aria-disabled");
      }
    });
    this.#syncTabIndexes();
  }

  #availableTabs() {
    return Array.from(this.querySelectorAll("fig-tab")).filter(
      (tab) => !tab.hasAttribute("disabled") || tab.getAttribute("disabled") === "false",
    );
  }

  #syncTabIndexes() {
    const tabs = Array.from(this.querySelectorAll("fig-tab"));
    const selected =
      tabs.find(
        (tab) =>
          tab.hasAttribute("selected") && tab.getAttribute("selected") !== "false",
      ) || this.#availableTabs()[0];
    tabs.forEach((tab) => {
      const disabled = tab.hasAttribute("disabled") && tab.getAttribute("disabled") !== "false";
      tab.setAttribute("tabindex", !disabled && tab === selected ? "0" : "-1");
    });
  }

  #scrollSelectedTabIntoView(tab = this.selectedTab, behavior = "smooth") {
    const target =
      tab ||
      this.querySelector('fig-tab[selected]:not([selected="false"])') ||
      this.#availableTabs()[0];
    if (!target) return;

    requestAnimationFrame(() => {
      if (!this.isConnected || !target.isConnected) return;
      const overflowX = this.scrollWidth > this.clientWidth;
      if (!overflowX) return;

      const containerRect = this.getBoundingClientRect();
      const tabRect = target.getBoundingClientRect();
      const tabCenter =
        tabRect.left - containerRect.left + this.scrollLeft + tabRect.width / 2;

      this.scrollTo({
        left: tabCenter - this.clientWidth / 2,
        behavior,
      });
      this.#syncOverflow();
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundBeginClick, true);
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#clickInProgress = false;
    this.#removeNavButtons();
  }

  #removeLegacyScroller() {
    if (this.#isUnwrapping) return;
    const legacy = this.querySelector(":scope > [data-fig-tabs-scroll]");
    if (!legacy) return;

    this.#isUnwrapping = true;
    try {
      const nodes = Array.from(legacy.childNodes);
      legacy.replaceWith(...nodes);
    } finally {
      this.#isUnwrapping = false;
    }
  }

  #syncOverflow() {
    figSyncOverflowState(this, this, "x");
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => this.#syncOverflow());
    this.#resizeObserver.observe(this);
  }

  #startObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver((records) => {
      if (this.#isUnwrapping) return;
      const tabStateChanged = records.some(
        (record) =>
          record.type === "attributes" &&
          record.target instanceof Element &&
          record.target.matches("fig-tab"),
      );
      if (tabStateChanged) {
        const selectedRecord = [...records].reverse().find(
          (record) =>
            record.type === "attributes" &&
            record.attributeName === "selected" &&
            record.target instanceof Element &&
            record.target.matches(
              'fig-tab[selected]:not([selected="false"])',
            ),
        );
        if (!this.#clickInProgress) {
          this.#reconcileTabState(selectedRecord?.target);
        }
      }
      const authoredChange = records.some((record) =>
        record.type === "childList" &&
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            !(node instanceof Element) ||
            !node.matches("[data-fig-tabs-nav]"),
        ),
      );
      if (!authoredChange && !tabStateChanged) return;
      this.#removeLegacyScroller();
      this.#applyOverflowMode();
      this.#syncTabIndexes();
      requestAnimationFrame(() => {
        this.#syncOverflow();
        this.#scrollSelectedTabIntoView();
      });
    });
    this.#mutationObserver.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "selected", "value"],
      subtree: true,
    });
  }

  #reconcileTabState(preferred) {
    const selected =
      preferred?.isConnected && figBooleanAttribute(preferred, "selected")
        ? preferred
        : this.querySelector('fig-tab[selected]:not([selected="false"])');
    if (selected) {
      this.querySelectorAll("fig-tab").forEach((tab) => {
        if (tab !== selected) tab.removeAttribute("selected");
      });
      this.selectedTab = selected;
      const value = this.#resolveTabValue(selected);
      if (this.getAttribute("value") !== value) {
        if (value) this.setAttribute("value", value);
        else this.removeAttribute("value");
      }
    }
    this.#syncTabIndexes();
  }

  #beginClick(event) {
    if (!event.target?.closest?.("fig-tab")) return;
    this.#clickInProgress = true;
    setTimeout(() => {
      this.#clickInProgress = false;
    }, 0);
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.classList.remove("overflow-start", "overflow-end");
  }

  #applyOverflowMode() {
    const fade = this.#overflowMode === "fade";
    this.classList.toggle("fig-overflow-fade", fade);
    this.classList.toggle("fig-overflow-fade-horizontal", fade);
    if (fade) {
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
      owner: "tabs",
      onStart: () => figScrollOverflowPage(this, "x", -1),
      onEnd: () => figScrollOverflowPage(this, "x", 1),
    });
    this.#navStart = buttons.start;
    this.#navEnd = buttons.end;
    this.#positionNavButtons();
  }

  #positionNavButtons() {
    if (this.firstElementChild !== this.#navStart) {
      this.prepend(this.#navStart);
    }
    if (this.lastElementChild !== this.#navEnd) {
      this.append(this.#navEnd);
    }
  }

  #handleKeyDown(event) {
    const tabs = this.#availableTabs();
    if (!tabs.length) return;
    const currentIndex = tabs.findIndex((tab) =>
      figBooleanAttribute(tab, "selected"),
    );
    let newIndex = currentIndex >= 0 ? currentIndex : 0;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex && tabs[newIndex]) {
      this.querySelectorAll("fig-tab").forEach((tab) => tab.removeAttribute("selected"));
      this.selectedTab = tabs[newIndex];
      tabs[newIndex].setAttribute("selected", "true");
      const val = this.#resolveTabValue(tabs[newIndex]);
      if (val) this.setAttribute("value", val);
      else this.removeAttribute("value");
      tabs[newIndex].focus();
      this.#syncTabIndexes();
      this.#scrollSelectedTabIntoView(tabs[newIndex]);
      this.#emitSelectionEvents();
    }
  }

  get value() {
    return this.#resolveTabValue(this.selectedTab);
  }

  set value(val) {
    this.setAttribute("value", val);
  }

  #emitSelectionEvents() {
    const val = this.value;
    this.dispatchEvent(
      new CustomEvent("input", { detail: val, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: val, bubbles: true }),
    );
  }

  #resolveTabValue(tab) {
    if (!tab) return "";
    const attrValue = tab.getAttribute("value");
    if (attrValue !== null) return attrValue;
    return tab.textContent?.trim() || "";
  }

  #selectByValue(value) {
    const tabs = this.querySelectorAll("fig-tab");
    for (const tab of tabs) {
      if (this.#resolveTabValue(tab) === value) {
        this.selectedTab = tab;
        tab.setAttribute("selected", "true");
      } else {
        tab.removeAttribute("selected");
      }
    }
    this.#syncTabIndexes();
    this.#scrollSelectedTabIntoView(this.selectedTab);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (newValue !== oldValue) {
          this.#selectByValue(newValue);
        }
        break;
      case "disabled":
        this.#applyDisabled(newValue !== null && newValue !== "false");
        break;
      case "overflow":
        this.#applyOverflowMode();
        requestAnimationFrame(() => this.#syncOverflow());
        break;
    }
  }

  handleClick(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    const target = event.target.closest("fig-tab");
    if (!target || !this.contains(target)) return;
    if (
      target.hasAttribute("disabled") &&
      target.getAttribute("disabled") !== "false"
    )
      return;
    const tabs = this.querySelectorAll("fig-tab");
    const previousTab = this.selectedTab;
    const previousValue =
      this.getAttribute("value") ?? this.#resolveTabValue(previousTab);
    for (const tab of tabs) {
      if (tab === target) {
        this.selectedTab = tab;
        tab.setAttribute("selected", "true");
      } else {
        tab.removeAttribute("selected");
      }
    }
    const val = this.#resolveTabValue(target);
    if (val) this.setAttribute("value", val);
    else this.removeAttribute("value");
    this.#syncTabIndexes();
    this.#scrollSelectedTabIntoView(target);
    if (previousTab !== target || previousValue !== this.value) {
      this.#emitSelectionEvents();
    }
  }
}
figDefineElement("fig-tabs", FigTabs);

export { FigTabs };
