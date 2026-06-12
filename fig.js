import "./fig-layer.js";

/**
 * Generates a unique ID string using timestamp and random values
 * @returns {string} A unique identifier
 */
function figIsWebKitOrIOSBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const userAgent = navigator.userAgent || "";
  const isIOSBrowser =
    /\b(iPad|iPhone|iPod)\b/.test(userAgent) ||
    (/\bMacintosh\b/.test(userAgent) && /\bMobile\b/.test(userAgent));
  const isDesktopWebKit =
    /\bAppleWebKit\b/.test(userAgent) &&
    !/\b(Chrome|Chromium|Edg|OPR|SamsungBrowser)\b/.test(userAgent);
  return isIOSBrowser || isDesktopWebKit;
}

/** @param {string} name @param {{ size?: string, className?: string }} [options] */
function createFigIcon(name, options = {}) {
  const icon = document.createElement("fig-icon");
  if (name) icon.setAttribute("name", name);
  if (options.size) icon.setAttribute("size", options.size);
  if (options.className) icon.className = options.className;
  return icon;
}

/** Run callback on the next frame; skip if the host disconnected first. */
function figNextFrame(host, callback) {
  requestAnimationFrame(() => {
    if (host && !host.isConnected) return;
    callback();
  });
}

function createFigOverflowButtons({
  owner,
  onStart,
  onEnd,
  startClass = "",
  endClass = "",
  chevronClass = "",
} = {}) {
  const makeButton = (direction, onPointerDown) => {
    const button = document.createElement("button");
    button.className = [
      "fig-overflow",
      `fig-overflow-${direction}`,
      direction === "start" ? startClass : endClass,
    ]
      .filter(Boolean)
      .join(" ");
    button.dataset.figOverflow = direction;
    if (owner) button.setAttribute(`data-fig-${owner}-nav`, direction);
    button.setAttribute("tabindex", "-1");
    button.setAttribute("aria-label", direction === "start" ? "Scroll back" : "Scroll forward");
    button.appendChild(
      createFigIcon("chevron", {
        size: "small",
        className: ["fig-overflow-chevron", chevronClass].filter(Boolean).join(" "),
      }),
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onPointerDown?.(event);
    });
    return button;
  };

  return {
    start: makeButton("start", onStart),
    end: makeButton("end", onEnd),
  };
}

function figSyncOverflowState(host, scrollEl, axis = "x", threshold = 2) {
  if (!host || !scrollEl) return false;
  const isHorizontal = axis === "x";
  const scrollSize = isHorizontal ? scrollEl.scrollWidth : scrollEl.scrollHeight;
  const clientSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollPosition = isHorizontal ? scrollEl.scrollLeft : scrollEl.scrollTop;
  const scrollable = scrollSize - clientSize > threshold;
  const atStart = !scrollable || scrollPosition <= threshold;
  const atEnd = !scrollable || scrollPosition + clientSize >= scrollSize - threshold;
  host.classList.toggle("overflow-start", !atStart);
  host.classList.toggle("overflow-end", !atEnd);
  return scrollable;
}

function figScrollOverflowPage(scrollEl, axis = "x", direction = 1) {
  if (!scrollEl) return;
  const isHorizontal = axis === "x";
  const pageSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollAmount = pageSize * 0.8 * direction;
  scrollEl.scrollBy({
    [isHorizontal ? "left" : "top"]: scrollAmount,
    behavior: "smooth",
  });
}

function hasFigFillPicker() {
  return typeof customElements !== "undefined" && !!customElements.get("fig-fill-picker");
}

function figSupportsCustomizedBuiltIns() {
  if (
    typeof window === "undefined" ||
    !window.customElements ||
    typeof HTMLButtonElement === "undefined"
  ) {
    return false;
  }

  const testName = `fig-builtin-probe-${Math.random().toString(36).slice(2)}`;
  class FigCustomizedBuiltInProbe extends HTMLButtonElement {}

  try {
    customElements.define(testName, FigCustomizedBuiltInProbe, {
      extends: "button",
    });
    const probe = document.createElement("button", { is: testName });
    return probe instanceof FigCustomizedBuiltInProbe;
  } catch (_error) {
    return false;
  }
}

const figNeedsBuiltInPolyfill =
  figIsWebKitOrIOSBrowser() && !figSupportsCustomizedBuiltIns();
const figBuiltInPolyfillReady = (
  figNeedsBuiltInPolyfill
    ? import("./polyfills/custom-elements-webkit.js")
    : Promise.resolve()
)
  .then(() => {})
  .catch((error) => {
    throw error;
  });

function figDefineCustomizedBuiltIn(name, constructor, options) {
  const define = () => {
    if (!customElements.get(name)) {
      customElements.define(name, constructor, options);
    }
  };

  if (!figNeedsBuiltInPolyfill) {
    define();
    return;
  }

  figBuiltInPolyfillReady.then(define).catch((error) => {
    console.error(
      `[figui3] Failed to load customized built-in polyfill for "${name}".`,
      error,
    );
  });
}

function figUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** Zero-size portal for fixed overlays so they never affect body layout metrics. */
function figGetOverlayRoot() {
  if (!document.body) return null;
  const attr = "data-figui-overlay-root";
  let root = document.body.querySelector(`:scope > [${attr}]`);
  if (!root) {
    root = document.createElement("div");
    root.setAttribute(attr, "");
    document.body.append(root);
  }
  return root;
}

let _figZCounter = 10000;
function figGetHighestZIndex() {
  return _figZCounter++;
}

function figSyncCssVar(el, prop, value) {
  if (value && value.trim()) {
    el.style.setProperty(prop, value.trim());
  } else {
    el.style.removeProperty(prop);
  }
}

let _figSharedCanvas = null;
let _figSharedCtx = null;
function figGetSharedCanvas(width = 1, height = 1) {
  if (!_figSharedCanvas) {
    _figSharedCanvas = document.createElement("canvas");
    _figSharedCtx = _figSharedCanvas.getContext("2d");
  }
  if (_figSharedCanvas.width !== width) _figSharedCanvas.width = width;
  if (_figSharedCanvas.height !== height) _figSharedCanvas.height = height;
  return { canvas: _figSharedCanvas, ctx: _figSharedCtx };
}

/**
 * Checks if the browser supports the native popover API
 * @returns {boolean} True if popover is supported
 */
function figSupportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}

/**
 * A custom button element that supports different types and states.
 * @attr {string} type - The button type: "button" (default), "toggle", "submit", or "link"
 * @attr {boolean} selected - Whether the button is in a selected state
 * @attr {boolean} disabled - Whether the button is disabled
 * @attr {string} href - URL for link type buttons
 * @attr {string} target - Target window for link type buttons (e.g., "_blank")
 */
class FigButton extends HTMLElement {
  type;
  #selected;
  #a11yAttributes = ["aria-label", "aria-labelledby", "aria-describedby", "title"];
  #boundHandleControlKeydown = this.#handleControlKeydown.bind(this);
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleFocus = () => {
    if (this.button?.matches(":focus-visible")) {
      this.setAttribute("data-focus-visible", "");
    }
  };
  #boundHandleBlur = () => {
    this.removeAttribute("data-focus-visible");
  };
  constructor() {
    super();
    this.attachShadow({ mode: "open", delegatesFocus: true });
  }
  connectedCallback() {
    this.type = this.getAttribute("type") || "button";
    if (!this.button) {
      const isControlWrapper = this.type === "select" || this.type === "upload";
      const controlTag = isControlWrapper ? "span" : "button";
      const typeAttr = isControlWrapper ? "" : ` type="${this.type}"`;
      this.shadowRoot.innerHTML = `
            <style>
                button, button:hover, button:active, .fig-button-control {
                    padding: 0 var(--spacer-2);
                    appearance: none;
                    display: flex;
                    border: 0;
                    flex: 1;
                    text-align: center;
                    align-items: stretch;
                    justify-content: center;
                    font: inherit;
                    color: inherit;
                    outline: 0;
                    place-items: center; 
                    background: transparent;
                    margin: calc(var(--spacer-2)*-1);
                    height: var(--spacer-4);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                    min-width: 0;
                }
                :host([size="large"]) button,
                :host([size="large"]) .fig-button-control {
                    height: var(--spacer-5);
                }
                :host([size="large"][icon]) button,
                :host([size="large"][icon]) .fig-button-control {
                    padding: 0;
                }
            </style>
            <${controlTag} class="fig-button-control"${typeAttr}>
                <slot></slot>
            </${controlTag}>
            `;

      this.button = this.shadowRoot.querySelector("button, .fig-button-control");
      this.button.addEventListener("click", this.#boundHandleClick);
      this.button.addEventListener("focus", this.#boundHandleFocus);
      this.button.addEventListener("blur", this.#boundHandleBlur);
      this.addEventListener("keydown", this.#boundHandleControlKeydown);
    }

    this.#selected =
      this.hasAttribute("selected") &&
      this.getAttribute("selected") !== "false";

    this.#syncButtonAttributes();
  }

  get type() {
    return this.getAttribute("type") || "button";
  }
  set type(value) {
    this.setAttribute("type", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.setAttribute("selected", value);
  }

  #isDisabled() {
    return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
  }

  #handleClick() {
    if (this.#isDisabled()) return;
    if (this.type === "toggle") {
      this.toggleAttribute("selected", !this.hasAttribute("selected"));
    }
    if (this.type === "submit") {
      let form = this.closest("form");
      if (form) {
        form.submit();
      }
    }
    if (this.type === "link") {
      const href = this.getAttribute("href");
      const target = this.getAttribute("target");
      if (href) {
        if (target) {
          window.open(href, target);
        } else {
          window.location.href = href;
        }
      }
    }
  }
  #getSlottedControl() {
    if (this.type === "select") {
      return this.querySelector("select, fig-dropdown");
    }
    if (this.type === "upload") {
      return this.querySelector('input[type="file"], input');
    }
    return null;
  }
  #getSlottedSelect() {
    const control = this.#getSlottedControl();
    if (control instanceof HTMLSelectElement) return control;
    if (control?.tagName === "FIG-DROPDOWN") {
      return control.select || control.querySelector?.("select") || null;
    }
    return null;
  }
  #handleControlKeydown(e) {
    if (this.type !== "select") return;
    if (e.key !== "Enter") return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const select = this.#getSlottedSelect();
    if (!select || select.disabled || select.multiple) return;
    if (typeof select.showPicker !== "function") return;
    e.preventDefault();
    try {
      select.showPicker();
    } catch {
      // showPicker can be blocked outside trusted user activation.
    }
  }
  #syncPressedState() {
    if (!this.button) return;
    if (this.type !== "toggle") {
      this.removeAttribute("aria-pressed");
      this.button.removeAttribute("aria-pressed");
      return;
    }
    const pressed = this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.setAttribute("aria-pressed", pressed ? "true" : "false");
    this.button.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  #syncA11yAttributes() {
    if (!this.button) return;
    if (!(this.button instanceof HTMLButtonElement)) return;
    this.#a11yAttributes.forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.button.removeAttribute(name);
      } else {
        this.button.setAttribute(name, value);
      }
    });
  }
  #syncButtonAttributes() {
    if (!this.button) return;
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.disabled = disabled;
    if (this.button instanceof HTMLButtonElement) {
      this.button.disabled = disabled;
      this.button.type = this.type;
      this.button.setAttribute("type", this.type);
    }
    this.#syncA11yAttributes();
    this.#syncPressedState();
  }
  static get observedAttributes() {
    return [
      "disabled",
      "selected",
      "type",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "title",
    ];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case "type": {
        const isWrapper = (type) => type === "select" || type === "upload";
        if (isWrapper(oldValue || "button") !== isWrapper(newValue || "button")) {
          this.button = null;
          this.connectedCallback();
          break;
        }
        this.#syncButtonAttributes();
        break;
      }
      case "disabled":
        this.#syncButtonAttributes();
        break;
      case "selected":
        this.#selected = newValue !== null && newValue !== "false";
        this.#syncPressedState();
        break;
      default:
        this.#syncA11yAttributes();
        break;
    }
  }
  disconnectedCallback() {
    this.removeEventListener("keydown", this.#boundHandleControlKeydown);
  }
}
customElements.define("fig-button", FigButton);

/**
 * A custom dropdown/select element.
 * @attr {string} type - The dropdown type: "select" (default) or "dropdown"
 * @attr {string} value - The currently selected value
 */
class FigDropdown extends HTMLElement {
  #label = "Menu";
  #selectedValue = null; // Stores last selected value for dropdown type
  #boundHandleSelectInput;
  #boundHandleSelectChange;
  #boundHandleSelectKeydown;
  #selectedContentEnabled = false;
  #selectedContentEl = null;

  get label() {
    return this.#label;
  }
  set label(value) {
    this.#label = value;
  }
  #boundSlotChange;
  constructor() {
    super();
    this.select = document.createElement("select");
    this.optionsSlot = document.createElement("slot");
    this.attachShadow({ mode: "open" });
    this.#boundHandleSelectInput = this.#handleSelectInput.bind(this);
    this.#boundHandleSelectChange = this.#handleSelectChange.bind(this);
    this.#boundHandleSelectKeydown = this.#handleSelectKeydown.bind(this);
    this.#boundSlotChange = this.slotChange.bind(this);
  }

  #supportsSelectedContent() {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function")
      return false;
    try {
      return (
        CSS.supports("appearance: base-select") &&
        CSS.supports("selector(::picker(select))")
      );
    } catch {
      return false;
    }
  }

  #enableSelectedContentIfNeeded() {
    const experimental = this.getAttribute("experimental") || "";
    const wantsModern = experimental
      .split(/\s+/)
      .filter(Boolean)
      .includes("modern");

    if (!wantsModern || !this.#supportsSelectedContent()) {
      this.#selectedContentEnabled = false;
      return;
    }

    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute("aria-hidden", "true");
    const selected = document.createElement("selectedcontent");
    button.appendChild(selected);
    this.select.appendChild(button);
    this.#selectedContentEnabled = true;
    this.#selectedContentEl = selected;
  }

  #syncSelectedContent() {
    if (!this.#selectedContentEl) return;
    const selectedOption = this.select.selectedOptions?.[0];
    if (!selectedOption) {
      this.#selectedContentEl.textContent = "";
      return;
    }
    // Fallback mirror for browsers that don't auto-project selectedcontent reliably.
    this.#selectedContentEl.innerHTML = selectedOption.innerHTML;
  }

  #addEventListeners() {
    this.select.addEventListener("input", this.#boundHandleSelectInput);
    this.select.addEventListener("change", this.#boundHandleSelectChange);
    this.select.addEventListener("keydown", this.#boundHandleSelectKeydown);
  }

  #hasPersistentControl(optionEl) {
    if (!optionEl || !(optionEl instanceof Element)) return false;
    return !!optionEl.querySelector(
      'fig-checkbox, fig-switch, input[type="checkbox"]',
    );
  }

  #keepPickerOpen() {
    // Keep menu open for interactive controls inside option content.
    if (typeof this.select.showPicker === "function") {
      requestAnimationFrame(() => {
        try {
          this.select.showPicker();
        } catch {
          // Ignore if browser blocks reopening picker
        }
      });
    }
  }

  connectedCallback() {
    this.type = this.getAttribute("type") || "select";

    this.#label = this.getAttribute("label") || this.#label;
    this.select.setAttribute("aria-label", this.#label);
    this.#syncDisabled();

    if (!this.select.isConnected) {
      this.appendChild(this.select);
    }
    if (!this.optionsSlot.isConnected) {
      this.shadowRoot.appendChild(this.optionsSlot);
    }

    this.optionsSlot.removeEventListener("slotchange", this.#boundSlotChange);
    this.optionsSlot.addEventListener("slotchange", this.#boundSlotChange);

    this.select.removeEventListener("input", this.#boundHandleSelectInput);
    this.select.removeEventListener("change", this.#boundHandleSelectChange);
    this.select.removeEventListener("keydown", this.#boundHandleSelectKeydown);
    this.#addEventListeners();
  }

  slotChange() {
    while (this.select.firstChild) {
      this.select.firstChild.remove();
    }

    this.#enableSelectedContentIfNeeded();

    if (this.type === "dropdown") {
      const hiddenOption = document.createElement("option");
      hiddenOption.setAttribute("hidden", "true");
      hiddenOption.setAttribute("selected", "true");
      hiddenOption.selected = true;
      this.select.appendChild(hiddenOption);
    }
    this.optionsSlot.assignedNodes().forEach((option) => {
      if (option.nodeName === "OPTION" || option.nodeName === "OPTGROUP") {
        this.select.appendChild(option.cloneNode(true));
      }
    });
    this.#syncSelectedValue(this.value);
    this.#syncSelectedContent();
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
  }

  #handleSelectInput(e) {
    const selectedOption = e.target.selectedOptions?.[0];
    if (this.#hasPersistentControl(selectedOption)) {
      if (this.type === "dropdown") {
        this.select.selectedIndex = -1;
      }
      this.#keepPickerOpen();
      return;
    }

    const selectedValue = e.target.value;
    // Store the selected value for dropdown type (before select gets reset)
    if (this.type === "dropdown") {
      this.#selectedValue = selectedValue;
    }
    this.setAttribute("value", selectedValue);
    this.#syncSelectedContent();
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: selectedValue,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleSelectChange(e) {
    const selectedOption = e.target.selectedOptions?.[0];
    if (this.#hasPersistentControl(selectedOption)) {
      if (this.type === "dropdown") {
        this.select.selectedIndex = -1;
      }
      this.#keepPickerOpen();
      return;
    }

    // Get the value before resetting (use stored value for dropdown type)
    const selectedValue =
      this.type === "dropdown" ? this.#selectedValue : this.select.value;
    // Reset to hidden option for dropdown type
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
    this.#syncSelectedContent();
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: selectedValue,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleSelectKeydown(e) {
    if (this.closest('fig-button[type="select"]')) return;
    if (e.key !== "Enter" || e.defaultPrevented) return;
    if (this.#selectedContentEnabled && this.select.matches(":open")) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (this.select.disabled || this.select.multiple) return;
    if (typeof this.select.showPicker !== "function") return;
    e.preventDefault();
    try {
      this.select.showPicker();
    } catch {
      // showPicker can be unavailable during non-user-initiated key events.
    }
  }

  focus() {
    this.select.focus();
  }
  blur() {
    this.select.blur();
  }
  get value() {
    // For dropdown type, return the stored value since the select is reset after selection
    if (this.type === "dropdown") {
      return this.#selectedValue;
    }
    return this.select?.value;
  }
  set value(value) {
    // Store value for dropdown type
    if (this.type === "dropdown") {
      this.#selectedValue = value;
    }
    this.setAttribute("value", value);
  }
  static get observedAttributes() {
    return ["value", "type", "experimental", "label", "disabled"];
  }
  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.select.disabled = disabled;
  }
  #syncSelectedValue(value) {
    // For dropdown type, don't sync the visual selection - it should always show the hidden placeholder
    if (this.type === "dropdown") {
      return;
    }
    if (this.select) {
      this.select.querySelectorAll("option").forEach((o, i) => {
        if (o.value === this.getAttribute("value")) {
          this.select.selectedIndex = i;
        }
      });
    }
    this.#syncSelectedContent();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.#syncSelectedValue(newValue);
    }
    if (name === "type") {
      this.type = newValue;
    }
    if (name === "experimental") {
      this.slotChange();
    }
    if (name === "label") {
      this.#label = newValue;
      this.select.setAttribute("aria-label", this.#label);
    }
    if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  disconnectedCallback() {
    this.optionsSlot.removeEventListener("slotchange", this.#boundSlotChange);
    this.select.removeEventListener("input", this.#boundHandleSelectInput);
    this.select.removeEventListener("change", this.#boundHandleSelectChange);
    this.select.removeEventListener("keydown", this.#boundHandleSelectKeydown);
  }
}

customElements.define("fig-dropdown", FigDropdown);

/* Tooltip */
/**
 * A custom tooltip element that displays on hover or click.
 * @attr {string} action - The trigger action: "hover" (default) or "click"
 * @attr {number} delay - Delay in milliseconds before showing tooltip (default: 500)
 * @attr {string} text - The tooltip text content
 * @attr {string} theme - Optional theme passed to the underlying popup (e.g. "brand").
 * @attr {string} pointer - "false" to hide the beak.
 * @attr {boolean} show - When set, force-show the tooltip (ignores hide).
 */
class FigTooltip extends HTMLElement {
  static #lastShownAt = 0;
  static #lastHiddenAt = 0;
  static #warmupWindow = 1000;
  static #hoverOpen = null;
  static #documentExitListenersReady = false;

  #boundHideOnChromeOpen;
  #boundHidePopupOutsideClick;
  #boundShowDelayedPopup;
  #boundHandlePointerLeave;
  #boundHandleTouchStart;
  #boundHandleTouchMove;
  #boundHandleTouchEnd;
  #boundHandleTouchCancel;
  #boundHandleDialogClose;
  #boundHandleEscape;
  #parentDialog = null;
  #triggerEl = null;
  #childObserver = null;
  #touchTimeout;
  #isTouching = false;
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    let delay = parseInt(this.getAttribute("delay"));
    this.delay = !isNaN(delay) ? delay : 500;

    this.#boundHideOnChromeOpen = this.#hideOnChromeOpen.bind(this);
    this.#boundHidePopupOutsideClick = this.hidePopupOutsideClick.bind(this);
    this.#boundShowDelayedPopup = this.showDelayedPopup.bind(this);
    this.#boundHandlePointerLeave = this.#handlePointerLeave.bind(this);
    this.#boundHandleTouchStart = this.#handleTouchStart.bind(this);
    this.#boundHandleTouchMove = this.#handleTouchMove.bind(this);
    this.#boundHandleTouchEnd = this.#handleTouchEnd.bind(this);
    this.#boundHandleTouchCancel = this.#handleTouchCancel.bind(this);
    this.#boundHandleEscape = this.#handleEscape.bind(this);
    this.#boundHandleDialogClose = () => {
      clearTimeout(this.timeout);
      this.destroy();
      this.isOpen = false;
    };
  }
  connectedCallback() {
    FigTooltip.#ensureDocumentExitListeners();
    this.setup();
    this.#bindTriggerListeners();
    this.setupEventListeners();
    this.#parentDialog = this.closest("dialog");
    if (this.#parentDialog) {
      this.#parentDialog.addEventListener("close", this.#boundHandleDialogClose);
    }
  }

  disconnectedCallback() {
    clearTimeout(this.timeout);
    this.destroy();
    this.#unbindTriggerListeners();
    this.#teardownChildObserver();
    document.removeEventListener(
      "mousedown",
      this.#boundHideOnChromeOpen,
      true,
    );
    document.removeEventListener("keydown", this.#boundHandleEscape, true);
    if (this.#parentDialog) {
      this.#parentDialog.removeEventListener("close", this.#boundHandleDialogClose);
      this.#parentDialog = null;
    }

    if (this.action === "click") {
      document.body.removeEventListener(
        "click",
        this.#boundHidePopupOutsideClick,
      );
    }

    clearTimeout(this.#touchTimeout);
    if (FigTooltip.#hoverOpen === this) FigTooltip.#hoverOpen = null;
  }

  #getTrigger() {
    return this.firstElementChild;
  }

  #teardownChildObserver() {
    this.#childObserver?.disconnect();
    this.#childObserver = null;
  }

  #bindTriggerListeners() {
    this.#unbindTriggerListeners();
    if (this.action === "manual") return;

    const trigger = this.#getTrigger();
    if (!trigger) {
      if (!this.#childObserver && typeof MutationObserver !== "undefined") {
        this.#childObserver = new MutationObserver(() => {
          if (this.#getTrigger()) {
            this.#teardownChildObserver();
            this.#bindTriggerListeners();
          }
        });
        this.#childObserver.observe(this, { childList: true });
      }
      return;
    }

    this.#triggerEl = trigger;
    if (this.action === "hover") {
      if (!this.isTouchDevice()) {
        trigger.addEventListener("pointerenter", this.#boundShowDelayedPopup);
        trigger.addEventListener("pointerleave", this.#boundHandlePointerLeave);
      }
      trigger.addEventListener("touchstart", this.#boundHandleTouchStart, {
        passive: true,
      });
      trigger.addEventListener("touchmove", this.#boundHandleTouchMove, {
        passive: true,
      });
      trigger.addEventListener("touchend", this.#boundHandleTouchEnd, {
        passive: true,
      });
      trigger.addEventListener("touchcancel", this.#boundHandleTouchCancel, {
        passive: true,
      });
    } else if (this.action === "click") {
      trigger.addEventListener("click", this.#boundShowDelayedPopup);
      trigger.addEventListener("touchstart", this.#boundShowDelayedPopup, {
        passive: true,
      });
    }
  }

  #unbindTriggerListeners() {
    const trigger = this.#triggerEl;
    if (!trigger) return;
    if (this.action === "hover") {
      trigger.removeEventListener("pointerenter", this.#boundShowDelayedPopup);
      trigger.removeEventListener("pointerleave", this.#boundHandlePointerLeave);
      trigger.removeEventListener("touchstart", this.#boundHandleTouchStart);
      trigger.removeEventListener("touchmove", this.#boundHandleTouchMove);
      trigger.removeEventListener("touchend", this.#boundHandleTouchEnd);
      trigger.removeEventListener("touchcancel", this.#boundHandleTouchCancel);
    } else if (this.action === "click") {
      trigger.removeEventListener("click", this.#boundShowDelayedPopup);
      trigger.removeEventListener("touchstart", this.#boundShowDelayedPopup);
    }
    this.#triggerEl = null;
  }

  setup() {
    this.style.display = "contents";
  }

  render() {
    this.destroy();
    const supportsPopover =
      typeof HTMLElement !== "undefined" &&
      "popover" in HTMLElement.prototype;

    const content = document.createElement("span");
    // Customized built-in: `is` MUST be passed via createElement options;
    // setAttribute("is", ...) after the fact is a no-op per the HTML spec.
    this.popup = document.createElement("dialog", { is: "fig-popup" });
    // Also set the `is` attribute explicitly so CSS selectors like
    // `dialog[is="fig-popup"]` match. createElement's `is` option upgrades
    // the element but doesn't reflect to the attribute in all engines.
    this.popup.setAttribute("is", "fig-popup");
    this.popup.setAttribute("variant", "tooltip");
    this.popup.setAttribute("data-tooltip-managed", "");
    this.popup.setAttribute("role", "tooltip");
    this.popup.setAttribute("closedby", "closerequest");
    if (supportsPopover) this.popup.setAttribute("popover", "manual");

    const tooltipId = figUniqueId();
    this.popup.setAttribute("id", tooltipId);
    const theme = this.getAttribute("theme");
    if (theme) this.popup.setAttribute("theme", theme);
    const pointer = this.getAttribute("pointer");
    if (pointer !== null) this.popup.setAttribute("pointer", pointer);

    this.popup.append(content);
    content.innerText = this.getAttribute("text") ?? "";

    // Set aria-describedby on the trigger element
    if (this.firstElementChild) {
      this.firstElementChild.setAttribute("aria-describedby", tooltipId);
    }

    // Attach to DOM.
    // - With popover support, body is fine because top-layer promotion handles
    //   stacking above any open <dialog> (including modal).
    // - Without popover support, fall back to today's behavior: nearest open
    //   <dialog> ancestor if present, else document.body.
    if (supportsPopover) {
      (figGetOverlayRoot() ?? document.body).append(this.popup);
    } else {
      const parentDialog = this.closest("dialog");
      if (parentDialog && parentDialog.open) {
        parentDialog.append(this.popup);
      } else {
        (figGetOverlayRoot() ?? document.body).append(this.popup);
      }
    }

    // Bind the popup's anchor to this tooltip's trigger child so fig-popup
    // can position itself and update its beak via data-beak-side.
    this.popup.anchor = this.firstElementChild;
  }

  destroy() {
    if (this.popup) {
      this.popup.hidePopup?.();
      this.popup.remove();
      this.popup = null;
    }
    // Remove the click outside listener if it was added
    if (this.action === "click") {
      document.body.removeEventListener(
        "click",
        this.#boundHidePopupOutsideClick,
      );
    }
  }
  isTouchDevice() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  setupEventListeners() {
    if (this.action === "click") {
      document.body.addEventListener("click", this.#boundHidePopupOutsideClick);
    }

    document.addEventListener("mousedown", this.#boundHideOnChromeOpen, true);
    document.addEventListener("keydown", this.#boundHandleEscape, true);
  }

  get #showPersisted() {
    return this.hasAttribute("show") && this.getAttribute("show") !== "false";
  }

  #isWarmSession() {
    const now = Date.now();
    const windowMs = FigTooltip.#warmupWindow;
    if (this.action === "hover" && FigTooltip.#hoverOpen) return true;
    if (FigTooltip.#lastShownAt && now - FigTooltip.#lastShownAt < windowMs)
      return true;
    if (FigTooltip.#lastHiddenAt && now - FigTooltip.#lastHiddenAt < windowMs)
      return true;
    return false;
  }

  showDelayedPopup() {
    if (this.#showPersisted) return;
    clearTimeout(this.timeout);
    if (this.#isWarmSession()) {
      this.render();
      this.showPopup();
      return;
    }
    this.timeout = setTimeout(() => {
      this.render();
      this.showPopup();
    }, this.delay);
  }

  showPopup() {
    if (this.#parentDialog && !this.#parentDialog.open) return;
    if (!this.firstElementChild) return;
    if (
      this.action === "hover" &&
      FigTooltip.#hoverOpen &&
      FigTooltip.#hoverOpen !== this
    ) {
      FigTooltip.#hoverOpen.hidePopup();
    }
    if (!this.popup) this.render();
    // Keep anchor in sync in case the trigger child was swapped between
    // creation and show.
    this.popup.anchor = this.firstElementChild;
    this.popup.open = true;

    this.isOpen = true;
    if (this.action === "hover") FigTooltip.#hoverOpen = this;
    FigTooltip.#lastShownAt = Date.now();
  }

  hidePopup() {
    if (this.#showPersisted) return;
    clearTimeout(this.timeout);
    clearTimeout(this.#touchTimeout);
    const wasShowing = this.isOpen;
    if (this.popup) {
      this.destroy();
    }

    this.isOpen = false;
    if (FigTooltip.#hoverOpen === this) FigTooltip.#hoverOpen = null;
    if (wasShowing) FigTooltip.#lastHiddenAt = Date.now();
  }

  hidePopupOutsideClick(event) {
    if (this.isOpen && !this.popup.contains(event.target)) {
      this.hidePopup();
    }
  }

  // Pointer event handlers
  #handlePointerLeave(event) {
    // Don't hide immediately if we're in a touch interaction
    if (!this.#isTouching) {
      this.hidePopup();
    }
  }

  // Touch event handlers for mobile support
  #handleTouchStart(event) {
    if (this.action === "hover") {
      this.#isTouching = true;
      // Clear any existing touch timeout
      clearTimeout(this.#touchTimeout);
      // Show popup on touch start for hover action
      this.showDelayedPopup();
    }
  }

  #handleTouchMove(event) {
    if (this.action === "hover" && this.#isTouching) {
      // If user is scrolling/moving, cancel the tooltip after a delay
      clearTimeout(this.#touchTimeout);
      this.#touchTimeout = setTimeout(() => {
        this.#isTouching = false;
        this.hidePopup();
      }, 150);
    }
  }

  #handleTouchEnd(event) {
    if (this.action === "hover" && this.#isTouching) {
      // Delay setting isTouching to false to prevent pointerleave from hiding immediately
      clearTimeout(this.#touchTimeout);
      this.#touchTimeout = setTimeout(() => {
        this.#isTouching = false;
        this.hidePopup();
      }, 300); // Increased delay for better mobile UX
    }
  }

  #handleTouchCancel(event) {
    if (this.action === "hover" && this.#isTouching) {
      this.#isTouching = false;
      clearTimeout(this.#touchTimeout);
      this.hidePopup();
    }
  }

  #handleEscape(event) {
    if ((!this.isOpen && !this.popup) || event.key !== "Escape") return;
    event.preventDefault();
    this.hidePopup();
    this.firstElementChild?.focus?.();
  }

  static get observedAttributes() {
    return ["action", "delay", "open", "pointer", "show", "text", "theme"];
  }
  get text() {
    return this.getAttribute("text") ?? "";
  }
  set text(value) {
    this.setAttribute("text", value);
  }
  #updateText(value) {
    if (!this.popup) return;
    const content = this.popup.firstElementChild ?? this.popup.firstChild;
    if (!content) return;
    content.innerText = value;
    // fig-popup observes content size changes and will reposition itself.
  }
  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") === "true";
  }
  set open(value) {
    this.setAttribute("open", value);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "action") {
      this.action = newValue;
    }
    if (name === "delay") {
      let delay = parseInt(newValue);
      this.delay = !isNaN(delay) ? delay : 500;
    }
    if (name === "open") {
      if (newValue === "true") {
        requestAnimationFrame(() => {
          this.showDelayedPopup();
        });
      } else {
        requestAnimationFrame(() => {
          this.hidePopup();
        });
      }
    }
    if (name === "show") {
      const on = newValue !== null && newValue !== "false";
      if (on) {
        this.showPopup();
      } else {
        this.hidePopup();
      }
    }
    if (name === "text") {
      this.#updateText(newValue ?? "");
    }
    if (name === "pointer") {
      if (this.popup) {
        if (newValue !== null) this.popup.setAttribute("pointer", newValue);
        else this.popup.removeAttribute("pointer");
      }
    }
    if (name === "theme") {
      if (this.popup) {
        if (newValue) this.popup.setAttribute("theme", newValue);
        else this.popup.removeAttribute("theme");
      }
    }
  }

  #hideOnChromeOpen(e) {
    if (!this.isOpen) return;

    // Check if the clicked element is a select or opens a dialog
    const target = e.target;

    // If the target is a child of this.popup, return early
    if (this.popup && this.popup.contains(target)) {
      return;
    }

    if (
      target.tagName === "SELECT" ||
      target.hasAttribute("popover") ||
      target.closest("dialog")
    ) {
      this.hidePopup();
    }
  }

  static #ensureDocumentExitListeners() {
    if (FigTooltip.#documentExitListenersReady) return;
    FigTooltip.#documentExitListenersReady = true;

    const handlePointerLeftDocument = () => {
      FigTooltip.#dismissHoverTooltipsOnDocumentExit();
    };

    document.documentElement.addEventListener(
      "mouseleave",
      handlePointerLeftDocument,
    );
    document.addEventListener("mouseout", (event) => {
      if (event.relatedTarget) return;
      handlePointerLeftDocument();
    });

    // Same-origin embed: leaving the iframe element (e.g. into a parent dialog).
    try {
      const frame = window.frameElement;
      if (frame) {
        frame.addEventListener("mouseleave", handlePointerLeftDocument);
      }
    } catch {}

    window.addEventListener("message", (event) => {
      if (event?.data?.type !== "figui:dismiss-tooltips") return;
      if (window.parent !== window && event.source !== window.parent) return;
      handlePointerLeftDocument();
    });
  }

  static #dismissHoverTooltipsOnDocumentExit() {
    for (const node of document.querySelectorAll("fig-tooltip")) {
      if (!(node instanceof FigTooltip)) continue;
      if (node.action !== "hover") continue;
      if (node.hasAttribute("show") && node.getAttribute("show") !== "false")
        continue;
      if (node.isOpen || node.timeout) node.hidePopup();
    }
  }

  static #programmatic = new WeakMap();

  static show(anchor, text, options = {}) {
    FigTooltip.hide(anchor);
    const delay = options.delay ?? 500;
    const warm =
      Date.now() - FigTooltip.#lastShownAt < FigTooltip.#warmupWindow;
    const effectiveDelay = warm ? 0 : delay;

    const state = { timeout: null, popup: null };
    FigTooltip.#programmatic.set(anchor, state);

    state.timeout = setTimeout(() => {
      const supportsPopover =
        typeof HTMLElement !== "undefined" &&
        "popover" in HTMLElement.prototype;

      const popup = document.createElement("dialog", { is: "fig-popup" });
      popup.setAttribute("is", "fig-popup");
      popup.setAttribute("variant", "tooltip");
      popup.setAttribute("data-tooltip-managed", "");
      popup.setAttribute("role", "tooltip");
      popup.setAttribute("closedby", "closerequest");
      if (supportsPopover) popup.setAttribute("popover", "manual");
      const content = document.createElement("span");
      content.innerText = text;
      popup.append(content);

      if (supportsPopover) {
        (figGetOverlayRoot() ?? document.body).append(popup);
      } else {
        const parentDialog = anchor.closest?.("dialog");
        if (parentDialog && parentDialog.open) {
          parentDialog.append(popup);
        } else {
          (figGetOverlayRoot() ?? document.body).append(popup);
        }
      }

      popup.anchor = anchor;
      popup.open = true;

      state.popup = popup;
      FigTooltip.#lastShownAt = Date.now();
    }, effectiveDelay);
  }

  static hide(anchor) {
    const state = FigTooltip.#programmatic.get(anchor);
    if (!state) return;
    clearTimeout(state.timeout);
    if (state.popup) state.popup.remove();
    FigTooltip.#programmatic.delete(anchor);
  }
}

customElements.define("fig-tooltip", FigTooltip);

/* Text Truncation */
class FigTruncate extends HTMLElement {
  static observedAttributes = ["position", "tail"];

  #originalText = null;
  #boundEnter = null;
  #boundLeave = null;

  connectedCallback() {
    this.#originalText = this.textContent;
    figNextFrame(this, () => {
      this.#render();
      this.#setupTooltip();
    });
  }

  disconnectedCallback() {
    this.#teardownTooltip();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (this.#originalText === null) return;
    this.#render();
  }

  #render() {
    const position = this.getAttribute("position") || "right";
    const text = this.#originalText || "";
    if (position === "middle") {
      const tail = this.getAttribute("tail");
      let splitIndex;
      if (tail) {
        const idx = text.lastIndexOf(tail);
        splitIndex = idx > 0 ? idx : Math.ceil(text.length / 2);
      } else {
        splitIndex = Math.ceil(text.length / 2);
      }
      this.innerHTML = "";
      const startSpan = document.createElement("span");
      startSpan.className = "start";
      startSpan.textContent = text.slice(0, splitIndex);
      const endSpan = document.createElement("span");
      endSpan.className = "end";
      endSpan.textContent = text.slice(splitIndex);
      this.appendChild(startSpan);
      this.appendChild(endSpan);
    } else {
      this.textContent = text;
    }
  }

  #setupTooltip() {
    if (
      !this.hasAttribute("tooltip") ||
      this.getAttribute("tooltip") === "false"
    )
      return;
    this.#boundEnter = () => {
      if (this.scrollWidth <= this.clientWidth) return;
      FigTooltip.show(this, this.#originalText);
    };
    this.#boundLeave = () => {
      FigTooltip.hide(this);
    };
    this.addEventListener("pointerenter", this.#boundEnter);
    this.addEventListener("pointerleave", this.#boundLeave);
  }

  #teardownTooltip() {
    if (this.#boundEnter)
      this.removeEventListener("pointerenter", this.#boundEnter);
    if (this.#boundLeave)
      this.removeEventListener("pointerleave", this.#boundLeave);
    FigTooltip.hide(this);
  }
}
customElements.define("fig-truncate", FigTruncate);

/* Dialog */
/**
 * A custom dialog element for modal and non-modal dialogs.
 * @attr {boolean} open - Whether the dialog is visible
 * @attr {boolean} modal - Whether the dialog should be modal
 * @attr {boolean} drag - Whether the dialog is draggable
 * @attr {string} handle - CSS selector for the drag handle element (e.g., "fig-header"). If not specified, the entire dialog is draggable when drag is enabled.
 * @attr {string} position - Position of the dialog (e.g., "bottom right", "top left", "center center")
 * @attr {string} title - Title text for the auto-generated header. If no fig-header[dialog-header] exists, one is prepended with this title and a close button.
 * @attr {boolean} resizable - Whether the dialog can be manually resized by the user (default: false)
 * @attr {string} closedby - Controls how the dialog can be dismissed: "any" (default, Escape + light dismiss), "closerequest" (Escape only), "none" (programmatic only)
 */
class FigDialog extends HTMLDialogElement {
  constructor() {
    super();
    this._figInit();
  }

  // Lazy initializer used by both the native constructor path and the
  // Safari `is="..."` polyfill (which prototype-swaps existing nodes
  // without invoking the constructor, so class fields are never set).
  _figInit() {
    if (this._figInitialized) return;
    this._figInitialized = true;
    this._isDragging = false;
    this._dragPending = false;
    this._dragStartPos = { x: 0, y: 0 };
    this._dragOffset = { x: 0, y: 0 };
    this._resizeObserver = null;
    this._mutationObserver = null;
    this._autoResizeRafId = 0;
    this._offset = 16;
    this._positionInitialized = false;
    this._dragThreshold = 3;
    this._boundPointerDown = this._handlePointerDown.bind(this);
    this._boundPointerMove = this._handlePointerMove.bind(this);
    this._boundPointerUp = this._handlePointerUp.bind(this);
    this._boundClose = this.close.bind(this);
    this._boundIframeMessage = this._handleIframeMessage.bind(this);
    this._boundContentMutation = this._scheduleAutoResize.bind(this);
    this._boundContentResize = this._scheduleAutoResize.bind(this);
    this._boundRestoreFocus = this._restoreFocus.bind(this);
    this._boundIframeMouseLeave = this._handleIframeMouseLeave.bind(this);
    this._iframeDismissMutationObserver = null;
    this._previousFocus = null;
  }

  get autoresize() {
    return (
      this.hasAttribute("autoresize") &&
      this.getAttribute("autoresize") !== "false"
    );
  }

  connectedCallback() {
    this._figInit();
    this.modal =
      this.hasAttribute("modal") && this.getAttribute("modal") !== "false";

    // Set up drag functionality
    this.drag =
      this.hasAttribute("drag") && this.getAttribute("drag") !== "false";

    this._ensureHeader();

    figNextFrame(this, () => {
      this._addCloseListeners();
      this._setupDragListeners();
      this._applyPosition();
      this._syncAutoResize();
      this._setupIframeDismissListeners();
      this._syncA11y();
    });

    window.addEventListener("message", this._boundIframeMessage);
  }

  disconnectedCallback() {
    this._figInit();
    this._removeDragListeners();
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      button.removeEventListener("click", this._boundClose);
    });
    window.removeEventListener("message", this._boundIframeMessage);
    this._teardownAutoResize();
    this._teardownIframeDismissListeners();
    this.removeEventListener("close", this._boundRestoreFocus);
  }

  _captureFocusBeforeOpen() {
    const active = document.activeElement;
    this._previousFocus =
      active instanceof HTMLElement && active !== document.body && !this.contains(active)
        ? active
        : null;
  }

  _restoreFocus() {
    const target = this._previousFocus;
    this._previousFocus = null;
    if (!target?.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body && !this.contains(active)) return;
    requestAnimationFrame(() => target.focus?.());
  }

  show() {
    this._captureFocusBeforeOpen();
    this.addEventListener("close", this._boundRestoreFocus, { once: true });
    return super.show();
  }

  showModal() {
    this._captureFocusBeforeOpen();
    this.addEventListener("close", this._boundRestoreFocus, { once: true });
    return super.showModal();
  }

  _handleIframeMouseLeave(event) {
    const iframe = event?.currentTarget;
    if (!(iframe instanceof HTMLIFrameElement)) return;
    try {
      iframe.contentWindow?.postMessage({ type: "figui:dismiss-tooltips" }, "*");
    } catch {}
  }

  _syncIframeDismissListeners() {
    for (const iframe of this.querySelectorAll(":scope > iframe")) {
      if (!(iframe instanceof HTMLIFrameElement)) continue;
      if (iframe.dataset.figuiDismissBound === "true") continue;
      iframe.dataset.figuiDismissBound = "true";
      iframe.addEventListener("mouseleave", this._boundIframeMouseLeave);
    }
  }

  _setupIframeDismissListeners() {
    this._syncIframeDismissListeners();
    if (this._iframeDismissMutationObserver) return;
    this._iframeDismissMutationObserver = new MutationObserver(() => {
      this._syncIframeDismissListeners();
    });
    this._iframeDismissMutationObserver.observe(this, {
      childList: true,
      subtree: false,
    });
  }

  _teardownIframeDismissListeners() {
    this._iframeDismissMutationObserver?.disconnect();
    this._iframeDismissMutationObserver = null;
    for (const iframe of this.querySelectorAll(":scope > iframe")) {
      iframe.removeEventListener("mouseleave", this._boundIframeMouseLeave);
      delete iframe.dataset.figuiDismissBound;
    }
  }

  _handleIframeMessage(event) {
    if (!this.autoresize) return;
    const data = event?.data;
    if (!data || data.type !== "figui:iframe-resize") return;
    const source = event.source;
    if (!source) return;
    const iframe = Array.from(this.querySelectorAll("iframe")).find(
      (el) => el.contentWindow === source,
    );
    if (!iframe) return;
    this._resizeForIframe(iframe, data);
  }

  _syncAutoResize() {
    if (this.autoresize) {
      this._setupAutoResize();
      this._scheduleAutoResize();
    } else {
      this._teardownAutoResize();
    }
  }

  _setupAutoResize() {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(this._boundContentResize);
      for (const child of this.children) {
        try {
          this._resizeObserver.observe(child);
        } catch {}
      }
    }
    if (!this._mutationObserver) {
      this._mutationObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes?.forEach((node) => {
            if (node instanceof Element && node.parentElement === this) {
              try {
                this._resizeObserver?.observe(node);
              } catch {}
            }
          });
        }
        this._scheduleAutoResize();
      });
      this._mutationObserver.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }
  }

  _teardownAutoResize() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
    if (this._autoResizeRafId) {
      cancelAnimationFrame(this._autoResizeRafId);
      this._autoResizeRafId = 0;
    }
  }

  _scheduleAutoResize() {
    if (!this.autoresize) return;
    if (this._autoResizeRafId) return;
    this._autoResizeRafId = requestAnimationFrame(() => {
      this._autoResizeRafId = 0;
      this._applyAutoResize();
    });
  }

  _applyAutoResize() {
    if (!this.autoresize) return;
    // When an iframe child is present, defer to the iframe's postMessage
    // broadcast (the only reliable source of its content height).
    if (this.querySelector(":scope > iframe")) return;
    this._resizeToContent(null);
  }

  _computeChrome(skipChild) {
    const cs = window.getComputedStyle(this);
    const verticalBoxExtras =
      parseFloat(cs.paddingTop || "0") +
      parseFloat(cs.paddingBottom || "0") +
      parseFloat(cs.borderTopWidth || "0") +
      parseFloat(cs.borderBottomWidth || "0");

    let siblingsHeight = 0;
    const gap = parseFloat(cs.rowGap || cs.gap || "0") || 0;
    let visibleChildren = 0;
    for (const child of this.children) {
      const rect = child.getBoundingClientRect();
      if (rect.height === 0) continue;
      visibleChildren += 1;
      if (child === skipChild) continue;
      const childCS = window.getComputedStyle(child);
      const marginY =
        parseFloat(childCS.marginTop || "0") +
        parseFloat(childCS.marginBottom || "0");
      siblingsHeight += rect.height + marginY;
    }
    if (gap && visibleChildren > 1) {
      siblingsHeight += gap * (visibleChildren - 1);
    }
    return verticalBoxExtras + siblingsHeight;
  }

  _resizeForIframe(iframe, data) {
    if (typeof data.height !== "number" || !(data.height > 0)) return;
    const chrome = this._computeChrome(iframe);
    this.style.height = `${Math.ceil(data.height + chrome)}px`;
  }

  _resizeToContent() {
    // Let CSS handle the sizing via `height: max-content` (applied by the
    // [autoresize] rule). Just clear any previously applied inline height
    // (e.g. from drag/resize) so the CSS rule wins.
    if (this.style.height) this.style.height = "";
  }

  _ensureHeader() {
    if (this.querySelector("fig-header[dialog-header]")) return;
    const header = document.createElement("fig-header");
    header.setAttribute("dialog-header", "");
    header.setAttribute("data-auto", "");
    const h3 = document.createElement("h3");
    h3.textContent = this.getAttribute("title") || "Dialog";
    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Close");
    const btn = document.createElement("fig-button");
    btn.setAttribute("variant", "ghost");
    btn.setAttribute("icon", "");
    btn.setAttribute("aria-label", "Close dialog");
    btn.setAttribute("close-dialog", "");
    btn.appendChild(createFigIcon("close"));
    tooltip.appendChild(btn);
    header.appendChild(h3);
    header.appendChild(tooltip);
    this.prepend(header);
  }

  _addCloseListeners() {
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      if (!button.hasAttribute("aria-label")) {
        button.setAttribute("aria-label", "Close dialog");
      }
      button.removeEventListener("click", this._boundClose);
      button.addEventListener("click", this._boundClose);
    });
  }

  _syncA11y() {
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      const heading = this.querySelector("fig-header[dialog-header] h1, fig-header[dialog-header] h2, fig-header[dialog-header] h3, fig-header[dialog-header] h4, fig-header[dialog-header] h5, fig-header[dialog-header] h6");
      if (heading) {
        const id = heading.getAttribute("id") || figUniqueId();
        heading.setAttribute("id", id);
        this.setAttribute("aria-labelledby", id);
      }
    }
  }

  _applyPosition() {
    const position = this.getAttribute("position") || "";

    // Apply common styles
    this.style.position = "fixed";
    this.style.transform = "none";

    // Reset position properties
    this.style.top = "auto";
    this.style.bottom = "auto";
    this.style.left = "auto";
    this.style.right = "auto";
    this.style.margin = "0";

    // Parse position attribute
    const hasTop = position.includes("top");
    const hasBottom = position.includes("bottom");
    const hasLeft = position.includes("left");
    const hasRight = position.includes("right");
    const hasVCenter = position.includes("center") && !hasTop && !hasBottom;
    const hasHCenter = position.includes("center") && !hasLeft && !hasRight;

    // Vertical positioning
    if (hasTop) {
      this.style.top = `${this._offset}px`;
    } else if (hasBottom) {
      this.style.bottom = `${this._offset}px`;
    } else if (hasVCenter) {
      this.style.top = "0";
      this.style.bottom = "0";
    }

    // Horizontal positioning
    if (hasLeft) {
      this.style.left = `${this._offset}px`;
    } else if (hasRight) {
      this.style.right = `${this._offset}px`;
    } else if (hasHCenter) {
      this.style.left = "0";
      this.style.right = "0";
    }

    // Apply margin auto for centering (works without knowing dimensions)
    if (hasVCenter && hasHCenter) {
      this.style.margin = "auto";
    } else if (hasVCenter) {
      this.style.marginTop = "auto";
      this.style.marginBottom = "auto";
    } else if (hasHCenter) {
      this.style.marginLeft = "auto";
      this.style.marginRight = "auto";
    }

    this._positionInitialized = true;
  }

  _setupDragListeners() {
    if (this.drag) {
      this.addEventListener("pointerdown", this._boundPointerDown);
      const handleSelector = this.getAttribute("handle");
      const handleEl = handleSelector
        ? this.querySelector(handleSelector)
        : this.querySelector("fig-header, header");
      if (handleEl) {
        handleEl.style.cursor = "grab";
      }
    }
  }

  _removeDragListeners() {
    this.removeEventListener("pointerdown", this._boundPointerDown);
    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);
  }

  _isInteractiveElement(element) {
    // Standard HTML interactive elements
    const interactiveSelectors = [
      "input",
      "button",
      "select",
      "textarea",
      "a",
      "label",
      "details",
      "summary",
      '[contenteditable="true"]',
      "[tabindex]",
    ];

    // Non-interactive fig-* container elements (should allow dragging)
    const nonInteractiveFigElements = [
      "FIG-HEADER",
      "FIG-DIALOG",
      "FIG-FIELD",
      "FIG-TOOLTIP",
      "FIG-CONTENT",
      "FIG-TABS",
      "FIG-TAB",
      "FIG-POPOVER",
      "FIG-SHIMMER",
      "FIG-LAYER",
      "FIG-FILL-PICKER",
    ];

    const isInteractive = (el) =>
      interactiveSelectors.some((selector) => el.matches?.(selector)) ||
      (el.tagName?.startsWith("FIG-") &&
        !nonInteractiveFigElements.includes(el.tagName));

    // Check if the element itself is interactive
    if (isInteractive(element)) {
      return true;
    }

    // Check if any parent element up to the dialog is interactive
    let parent = element.parentElement;
    while (parent && parent !== this) {
      if (isInteractive(parent)) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  _handlePointerDown(e) {
    if (!this.drag) {
      return;
    }

    // Don't interfere with interactive elements (inputs, sliders, buttons, etc.)
    if (this._isInteractiveElement(e.target)) {
      return;
    }

    // If handle attribute is specified, only allow drag from within that element
    // Otherwise, allow dragging from anywhere on the dialog (except interactive elements)
    const handleSelector = this.getAttribute("handle");
    if (handleSelector && handleSelector.trim()) {
      const handleEl = this.querySelector(handleSelector);
      if (!handleEl || !handleEl.contains(e.target)) {
        return;
      }
    }
    // No handle specified = drag from anywhere (original behavior)

    // Don't prevent default yet - just set up pending drag
    // This allows clicks on non-interactive elements like <details> to work
    this._dragPending = true;
    this._dragStartPos.x = e.clientX;
    this._dragStartPos.y = e.clientY;

    // Get current position from computed style
    const rect = this.getBoundingClientRect();

    // Store offset from pointer to dialog top-left corner
    this._dragOffset.x = e.clientX - rect.left;
    this._dragOffset.y = e.clientY - rect.top;

    document.addEventListener("pointermove", this._boundPointerMove);
    document.addEventListener("pointerup", this._boundPointerUp);
  }

  _handlePointerMove(e) {
    // Check if we should start dragging (threshold exceeded)
    if (this._dragPending && !this._isDragging) {
      const dx = Math.abs(e.clientX - this._dragStartPos.x);
      const dy = Math.abs(e.clientY - this._dragStartPos.y);

      if (dx > this._dragThreshold || dy > this._dragThreshold) {
        this._isDragging = true;
        this._dragPending = false;
        this.setPointerCapture(e.pointerId);
        this.style.cursor = "grabbing";

        const rect = this.getBoundingClientRect();
        this.style.top = `${rect.top}px`;
        this.style.left = `${rect.left}px`;
        this.style.bottom = "auto";
        this.style.right = "auto";
        this.style.margin = "0";
      }
    }

    if (!this._isDragging) return;

    this.style.left = `${e.clientX - this._dragOffset.x}px`;
    this.style.top = `${e.clientY - this._dragOffset.y}px`;
    e.preventDefault();
  }

  _handlePointerUp(e) {
    if (this._isDragging) {
      this.releasePointerCapture(e.pointerId);
      this.style.cursor = "";
    }

    this._isDragging = false;
    this._dragPending = false;

    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);

    e.preventDefault();
  }

  static get observedAttributes() {
    return [
      "modal",
      "drag",
      "position",
      "handle",
      "title",
      "resizable",
      "closedby",
      "autoresize",
      "aria-label",
      "aria-labelledby",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._figInit();
    if (name === "autoresize" && this.isConnected) {
      this._syncAutoResize();
    }

    if (name === "drag") {
      this.drag = newValue !== null && newValue !== "false";

      if (this.drag) {
        this._setupDragListeners();
      } else {
        this._removeDragListeners();
        const header = this.querySelector("fig-header, header");
        if (header) {
          header.style.cursor = "";
        }
      }
    }

    if (name === "position" && this._positionInitialized) {
      this._applyPosition();
    }

    if (name === "modal") {
      const wasModal = this.modal;
      this.modal = newValue !== null && newValue !== "false";
      if (this.open && wasModal !== this.modal) {
        this.close();
        if (this.modal) this.showModal();
        else this.show();
      }
    }

    if (name === "closedby") {
      this.closedby = newValue || "any";
    }

    if (name === "title") {
      const autoHeader = this.querySelector("fig-header[data-auto] h3");
      if (autoHeader) {
        autoHeader.textContent = newValue || "Dialog";
      }
      this._syncA11y();
    }

    if (name === "aria-label" || name === "aria-labelledby") {
      this._syncA11y();
    }
  }
}
figDefineCustomizedBuiltIn("fig-dialog", FigDialog, { extends: "dialog" });

/* Toast */
class FigToast extends HTMLDialogElement {
  constructor() {
    super();
    this._figInit();
  }

  _figInit() {
    if (this._figInitialized) return;
    this._figInitialized = true;
    this._defaultOffset = 16;
    this._autoCloseTimer = null;
    this._boundHandleClose = this.handleClose.bind(this);
  }

  connectedCallback() {
    this._figInit();
    if (!this.hasAttribute("theme")) this.setAttribute("theme", "dark");
    this.syncLiveRegion();
    this.addCloseListeners();
    this.applyPosition();
    if (this.hasAttribute("open") && this.getAttribute("open") !== "false") {
      this.showToast();
    }
  }

  disconnectedCallback() {
    this._figInit();
    this.clearAutoClose();
  }

  addCloseListeners() {
    this.querySelectorAll("[close-toast]").forEach((button) => {
      if (!button.hasAttribute("aria-label")) button.setAttribute("aria-label", "Close notification");
      button.removeEventListener("click", this._boundHandleClose);
      button.addEventListener("click", this._boundHandleClose);
    });
  }

  handleClose() {
    this.hideToast();
  }

  applyPosition() {
    this.style.position = "fixed";
    this.style.margin = "0";
    this.style.top = "auto";
    this.style.bottom = `${parseInt(this.getAttribute("offset") ?? this._defaultOffset)}px`;
    this.style.left = "50%";
    this.style.right = "auto";
    this.style.transform = "translateX(-50%)";
  }

  syncLiveRegion() {
    const assertive =
      this.getAttribute("live") === "assertive" ||
      this.getAttribute("theme") === "danger";
    if (!this.hasAttribute("role")) this.setAttribute("role", assertive ? "alert" : "status");
    if (!this.hasAttribute("aria-live")) this.setAttribute("aria-live", assertive ? "assertive" : "polite");
    if (!this.hasAttribute("aria-atomic")) this.setAttribute("aria-atomic", "true");
  }

  startAutoClose() {
    this.clearAutoClose();
    const duration = parseInt(this.getAttribute("duration") ?? "5000");
    if (duration > 0) {
      this._autoCloseTimer = setTimeout(() => this.hideToast(), duration);
    }
  }

  clearAutoClose() {
    if (this._autoCloseTimer) {
      clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }
  }

  showToast() {
    this.syncLiveRegion();
    if (!this.open) this.show();
    this.applyPosition();
    this.startAutoClose();
    this.dispatchEvent(new CustomEvent("toast-show", { bubbles: true }));
  }

  hideToast() {
    this.clearAutoClose();
    if (this.open) this.close();
    this.dispatchEvent(new CustomEvent("toast-hide", { bubbles: true }));
  }

  static get observedAttributes() {
    return ["duration", "offset", "open", "theme", "live"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._figInit();
    if (oldValue === newValue) return;
    if (!this.isConnected) return;
    if (name === "offset") this.applyPosition();
    if (name === "open") {
      if (newValue !== null && newValue !== "false") this.showToast();
      else this.hideToast();
    }
    if (name === "theme" || name === "live") this.syncLiveRegion();
  }
}
figDefineCustomizedBuiltIn("fig-toast", FigToast, { extends: "dialog" });

/* Popup */
/**
 * A floating popup foundation component based on <dialog>.
 * @attr {string} anchor - CSS selector used to resolve the anchor element.
 * @attr {string} position - Preferred placement as "vertical horizontal" (default: "top center").
 * @attr {string} offset - Horizontal and vertical offset as "x y" (default: "0 0").
 * @attr {string} variant - Visual variant. Use variant="popover" to show an anchor beak.
 * @attr {string} theme - Visual theme: "light", "dark", or "menu".
 * @attr {boolean|string} open - Open when present and not "false".
 */
class FigPopup extends HTMLDialogElement {
  _anchorObserver = null;
  _contentObserver = null;
  _mutationObserver = null;
  _anchorTrackRAF = null;
  _lastAnchorRect = null;
  _isPopupActive = false;
  _boundReposition;
  _boundScroll;
  _boundOutsidePointerDown;
  _rafId = null;
  _anchorRef = null;

  _isDragging = false;
  _dragPending = false;
  _dragStartPos = { x: 0, y: 0 };
  _dragOffset = { x: 0, y: 0 };
  _dragThreshold = 3;
  _boundPointerDown;
  _boundPointerMove;
  _boundPointerUp;
  _wasDragged = false;
  _previousFocus = null;
  _boundDocumentKeydown;

  constructor() {
    super();
    this._boundReposition = this.queueReposition.bind(this);
    this._boundScroll = (e) => {
      const target = e.target;
      if (
        this.open &&
        (!(target instanceof Node) || !this.contains(target)) &&
        this.shouldAutoReposition()
      ) {
        this.queueReposition();
      }
    };
    this._boundOutsidePointerDown = this.handleOutsidePointerDown.bind(this);
    this._boundPointerDown = this.handlePointerDown.bind(this);
    this._boundPointerMove = this.handlePointerMove.bind(this);
    this._boundPointerUp = this.handlePointerUp.bind(this);
    this._boundDocumentKeydown = this.handleDocumentKeydown.bind(this);
  }

  ensureInitialized() {
    if (typeof this._anchorObserver === "undefined")
      this._anchorObserver = null;
    if (typeof this._contentObserver === "undefined")
      this._contentObserver = null;
    if (typeof this._mutationObserver === "undefined")
      this._mutationObserver = null;
    if (typeof this._anchorTrackRAF === "undefined")
      this._anchorTrackRAF = null;
    if (typeof this._lastAnchorRect === "undefined")
      this._lastAnchorRect = null;
    if (typeof this._isPopupActive === "undefined") this._isPopupActive = false;
    if (typeof this._rafId === "undefined") this._rafId = null;
    if (typeof this._anchorRef === "undefined") this._anchorRef = null;
    if (typeof this._isDragging === "undefined") this._isDragging = false;
    if (typeof this._dragPending === "undefined") this._dragPending = false;
    if (typeof this._dragStartPos === "undefined")
      this._dragStartPos = { x: 0, y: 0 };
    if (typeof this._dragOffset === "undefined")
      this._dragOffset = { x: 0, y: 0 };
    if (typeof this._dragThreshold !== "number") this._dragThreshold = 3;
    if (typeof this._wasDragged === "undefined") this._wasDragged = false;
    if (typeof this._previousFocus === "undefined") this._previousFocus = null;

    if (typeof this._boundReposition !== "function") {
      this._boundReposition = this.queueReposition.bind(this);
    }
    if (typeof this._boundScroll !== "function") {
      this._boundScroll = (e) => {
        const target = e.target;
        if (
          this.open &&
          (!(target instanceof Node) || !this.contains(target)) &&
          this.shouldAutoReposition()
        ) {
          this.queueReposition();
        }
      };
    }
    if (typeof this._boundOutsidePointerDown !== "function") {
      this._boundOutsidePointerDown = this.handleOutsidePointerDown.bind(this);
    }
    if (typeof this._boundPointerDown !== "function") {
      this._boundPointerDown = this.handlePointerDown.bind(this);
    }
    if (typeof this._boundPointerMove !== "function") {
      this._boundPointerMove = this.handlePointerMove.bind(this);
    }
    if (typeof this._boundPointerUp !== "function") {
      this._boundPointerUp = this.handlePointerUp.bind(this);
    }
    if (typeof this._boundDocumentKeydown !== "function") {
      this._boundDocumentKeydown = this.handleDocumentKeydown.bind(this);
    }
  }

  static get observedAttributes() {
    return [
      "open",
      "anchor",
      "position",
      "offset",
      "variant",
      "theme",
      "drag",
      "handle",
      "autoresize",
      "viewport-margin",
    ];
  }

  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }

  set open(value) {
    if (value === false || value === "false" || value === null) {
      if (!this.open) return;
      this.removeAttribute("open");
      return;
    }
    if (this.open) return;
    this.setAttribute("open", "true");
  }

  get anchor() {
    return this._anchorRef ?? this.getAttribute("anchor");
  }

  set anchor(value) {
    if (value instanceof Element) {
      this._anchorRef = value;
    } else if (typeof value === "string") {
      this._anchorRef = null;
      this.setAttribute("anchor", value);
    } else if (value && typeof value.getBoundingClientRect === "function") {
      this._anchorRef = value;
    } else {
      this._anchorRef = null;
    }
    if (this.open) this.queueReposition();
  }

  connectedCallback() {
    this.ensureInitialized();
    if (this.getAttribute("variant") === "tooltip") {
      if (!this.hasAttribute("position")) {
        this.setAttribute("position", "top center");
      }
      if (!this.hasAttribute("offset")) {
        this.setAttribute("offset", "8 8");
      }
      if (!this.hasAttribute("viewport-margin")) {
        this.setAttribute("viewport-margin", "8");
      }
      if (!this.hasAttribute("theme")) {
        this.setAttribute("theme", "menu");
      }
    }
    if (!this.hasAttribute("position")) {
      this.setAttribute("position", "top center");
    }
    if (!this.hasAttribute("role")) {
      this.setAttribute(
        "role",
        this.getAttribute("variant") === "tooltip" ? "tooltip" : "dialog",
      );
    }
    if (!this.hasAttribute("closedby")) {
      this.setAttribute("closedby", "any");
    }

    this.drag =
      this.hasAttribute("drag") && this.getAttribute("drag") !== "false";

    this.addEventListener("close", () => {
      this.teardownObservers();
      if (this.hasAttribute("open")) {
        this.removeAttribute("open");
      }
    });

    requestAnimationFrame(() => {
      this.setupDragListeners();
    });

    if (this.open) {
      this.showPopup();
    } else {
      this.hidePopup();
    }
  }

  disconnectedCallback() {
    this.ensureInitialized();
    this.teardownObservers();
    this.removeDragListeners();
    document.removeEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );
    document.removeEventListener("keydown", this._boundDocumentKeydown, true);
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.ensureInitialized();
    if (oldValue === newValue) return;

    if (name === "open") {
      if (newValue === null || newValue === "false") {
        this.hidePopup();
        return;
      }
      this.showPopup();
      return;
    }

    if (name === "drag") {
      this.drag = newValue !== null && newValue !== "false";
      if (this.drag) {
        this.setupDragListeners();
      } else {
        this.removeDragListeners();
      }
      return;
    }

    if (this.open) {
      this.queueReposition();
      this.setupObservers();
    }
  }

  showPopup() {
    if (this._isPopupActive) {
      this.queueReposition();
      return;
    }

    this.style.position = "fixed";
    this.style.inset = "auto";
    this.style.margin = "0";
    this.style.zIndex = String(figGetHighestZIndex() + 1);
    this.captureFocusBeforeOpen();

    // When the popup opts into the native popover API, prefer showPopover()
    // so the element is promoted into the browser's top layer (above any
    // modal dialogs) without needing showModal().
    const usePopover =
      this.hasAttribute("popover") &&
      typeof this.showPopover === "function" &&
      !this.matches?.(":popover-open");
    const positionBeforeReveal = this.shouldAutoReposition();
    if (positionBeforeReveal) {
      this.style.visibility = "hidden";
    }
    if (usePopover) {
      try {
        this.showPopover();
      } catch (e) {
        // Fall back to non-modal dialog show below.
      }
    }
    if (!usePopover && !super.open) {
      try {
        this.show();
      } catch (e) {
        // Ignore when dialog cannot be shown yet.
      }
    }
    if (positionBeforeReveal && (this.matches?.(":open") || this.matches?.(":popover-open"))) {
      this.positionPopup();
      this.style.visibility = "";
    }

    this.setupObservers();
    document.addEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );
    document.addEventListener("keydown", this._boundDocumentKeydown, true);
    this._wasDragged = false;
    this.queueReposition();
    this._isPopupActive = true;

    const anchor = this.resolveAnchor();
    if (anchor?.classList) anchor.classList.add("has-popup-open");
  }

  hidePopup() {
    const wasActive =
      this._isPopupActive ||
      this.matches?.(":open") ||
      this.matches?.(":popover-open");
    const anchor = this.resolveAnchor();
    if (anchor?.classList) anchor.classList.remove("has-popup-open");

    this.style.visibility = "";
    this._isPopupActive = false;
    this._wasDragged = false;
    this.teardownObservers();
    document.removeEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );
    document.removeEventListener("keydown", this._boundDocumentKeydown, true);

    if (
      this.hasAttribute("popover") &&
      typeof this.hidePopover === "function" &&
      this.matches?.(":popover-open")
    ) {
      try {
        this.hidePopover();
      } catch (e) {
        // Ignore.
      }
    }
  // Use :open, not super.open — the custom open getter reads the attribute
  // removed just before hidePopup(), so super.open can be false while the
  // native dialog is still open and no "close" event fires.
    if (this.matches?.(":open")) {
      try {
        this.close();
      } catch (e) {
        // Ignore when dialog is not in an open state.
      }
    }
    if (wasActive) this.restoreFocusAfterClose();
  }

  shouldRestoreFocus() {
    return this.getAttribute("variant") !== "tooltip";
  }

  captureFocusBeforeOpen() {
    if (!this.shouldRestoreFocus()) return;
    const active = document.activeElement;
    this._previousFocus =
      active instanceof HTMLElement && active !== document.body && !this.contains(active)
        ? active
        : null;
  }

  restoreFocusAfterClose() {
    if (!this.shouldRestoreFocus()) {
      this._previousFocus = null;
      return;
    }
    const anchor = this.resolveAnchor();
    const target =
      this._previousFocus?.isConnected
        ? this._previousFocus
        : anchor instanceof HTMLElement
          ? anchor
          : null;
    this._previousFocus = null;
    if (!target?.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body && !this.contains(active)) return;
    requestAnimationFrame(() => target.focus?.());
  }

  get autoresize() {
    const val = this.getAttribute("autoresize");
    return val === null || val !== "false";
  }
  set autoresize(value) {
    if (value || value === "") {
      this.setAttribute("autoresize", value === true ? "" : value);
    } else {
      this.removeAttribute("autoresize");
    }
  }

  setupObservers() {
    this.teardownObservers();

    const anchor = this.resolveAnchor();
    if (anchor instanceof Element && "ResizeObserver" in window) {
      this._anchorObserver = new ResizeObserver(this._boundReposition);
      this._anchorObserver.observe(anchor);
    }

    if (this.autoresize) {
      if ("ResizeObserver" in window) {
        this._contentObserver = new ResizeObserver(this._boundReposition);
        this._contentObserver.observe(this);
      }

      this._mutationObserver = new MutationObserver(this._boundReposition);
      this._mutationObserver.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    window.addEventListener("resize", this._boundReposition);
    window.addEventListener("scroll", this._boundScroll, {
      capture: true,
      passive: true,
    });
    this.startAnchorTracking();
  }

  teardownObservers() {
    if (this._anchorObserver) {
      this._anchorObserver.disconnect();
      this._anchorObserver = null;
    }
    if (this._contentObserver) {
      this._contentObserver.disconnect();
      this._contentObserver = null;
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
    window.removeEventListener("resize", this._boundReposition);
    window.removeEventListener("scroll", this._boundScroll, {
      capture: true,
      passive: true,
    });
    this.stopAnchorTracking();
  }

  readRectSnapshot(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  hasRectChanged(prev, next, epsilon = 0.25) {
    if (!prev && !next) return false;
    if (!prev || !next) return true;
    return (
      Math.abs(prev.x - next.x) > epsilon ||
      Math.abs(prev.y - next.y) > epsilon ||
      Math.abs(prev.width - next.width) > epsilon ||
      Math.abs(prev.height - next.height) > epsilon
    );
  }

  startAnchorTracking() {
    this.stopAnchorTracking();
    if (!this.open) return;

    const tick = () => {
      if (!this.open) {
        this._anchorTrackRAF = null;
        return;
      }

      const anchor = this.resolveAnchor();
      const nextRect = this.readRectSnapshot(anchor);
      const canAutoReposition = this.shouldAutoReposition();
      if (
        canAutoReposition &&
        this.hasRectChanged(this._lastAnchorRect, nextRect)
      ) {
        this._lastAnchorRect = nextRect;
        this.queueReposition();
      } else if (!canAutoReposition) {
        // Keep anchor geometry fresh without forcing reposition when user has dragged away.
        this._lastAnchorRect = nextRect;
      }
      this._anchorTrackRAF = requestAnimationFrame(tick);
    };

    this._lastAnchorRect = this.readRectSnapshot(this.resolveAnchor());
    this._anchorTrackRAF = requestAnimationFrame(tick);
  }

  stopAnchorTracking() {
    if (this._anchorTrackRAF !== null) {
      cancelAnimationFrame(this._anchorTrackRAF);
      this._anchorTrackRAF = null;
    }
    this._lastAnchorRect = null;
  }

  handleOutsidePointerDown(event) {
    if (!this.open || !super.open) return;
    const closedby = this.getAttribute("closedby");
    if (closedby === "none" || closedby === "closerequest") return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (this.contains(target)) return;

    const anchor = this.resolveAnchor();
    if (anchor?.contains && anchor.contains(target)) return;

    if (this.isInsideDescendantPopup(target)) return;

    this.open = false;
  }

  handleDocumentKeydown(event) {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (!this.open) return;
    if (this.getAttribute("role") === "menu") return;
    const closedby = this.getAttribute("closedby");
    if (closedby === "none") return;
    const openPopups = Array.from(
      document.querySelectorAll('dialog[is="fig-popup"][open]'),
    ).filter((popup) => popup.open);
    const topPopup = openPopups
      .map((popup) => ({
        popup,
        z: Number.parseInt(getComputedStyle(popup).zIndex || "0", 10) || 0,
      }))
      .sort((a, b) => a.z - b.z)
      .at(-1)?.popup;
    if (topPopup && topPopup !== this) return;
    event.preventDefault();
    this.open = false;
  }

  isInsideDescendantPopup(target) {
    const targetDialog = target.closest?.('dialog[is="fig-popup"]');
    if (!targetDialog || targetDialog === this) return false;

    let current = targetDialog;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const popupAnchor = current.anchor;
      if (!(popupAnchor instanceof Element)) break;
      if (this.contains(popupAnchor)) return true;
      current = popupAnchor.closest?.('dialog[is="fig-popup"]');
    }
    return false;
  }

  // ---- Drag support ----

  setupDragListeners() {
    if (this.drag) {
      this.addEventListener("pointerdown", this._boundPointerDown);
    }
  }

  removeDragListeners() {
    this.removeEventListener("pointerdown", this._boundPointerDown);
    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);
  }

  isInteractiveElement(element) {
    const interactiveSelectors = [
      "input",
      "button",
      "select",
      "textarea",
      "a",
      "label",
      "details",
      "summary",
      '[contenteditable="true"]',
      "[tabindex]",
    ];

    const nonInteractiveFigElements = [
      "FIG-HEADER",
      "FIG-DIALOG",
      "FIG-POPUP",
      "FIG-FIELD",
      "FIG-TOOLTIP",
      "FIG-CONTENT",
      "FIG-TABS",
      "FIG-TAB",
      "FIG-POPOVER",
      "FIG-SHIMMER",
      "FIG-LAYER",
      "FIG-FILL-PICKER",
    ];

    const isInteractive = (el) =>
      interactiveSelectors.some((s) => el.matches?.(s)) ||
      (el.tagName?.startsWith("FIG-") &&
        !nonInteractiveFigElements.includes(el.tagName));

    if (isInteractive(element)) return true;

    let parent = element.parentElement;
    while (parent && parent !== this) {
      if (isInteractive(parent)) return true;
      parent = parent.parentElement;
    }

    return false;
  }

  handlePointerDown(e) {
    if (!this.drag) return;
    if (this.isInteractiveElement(e.target)) return;

    const handleSelector = this.getAttribute("handle");
    if (handleSelector && handleSelector.trim()) {
      const handleEl = this.querySelector(handleSelector);
      if (!handleEl || !handleEl.contains(e.target)) return;
    }

    this._dragPending = true;
    this._dragStartPos.x = e.clientX;
    this._dragStartPos.y = e.clientY;

    const rect = this.getBoundingClientRect();
    this._dragOffset.x = e.clientX - rect.left;
    this._dragOffset.y = e.clientY - rect.top;

    document.addEventListener("pointermove", this._boundPointerMove);
    document.addEventListener("pointerup", this._boundPointerUp);
  }

  handlePointerMove(e) {
    if (this._dragPending && !this._isDragging) {
      const dx = Math.abs(e.clientX - this._dragStartPos.x);
      const dy = Math.abs(e.clientY - this._dragStartPos.y);

      if (dx > this._dragThreshold || dy > this._dragThreshold) {
        this._isDragging = true;
        this._dragPending = false;
        this._wasDragged = true;
        this.setPointerCapture(e.pointerId);
        this.style.cursor = "grabbing";

        const rect = this.getBoundingClientRect();
        this.style.top = `${rect.top}px`;
        this.style.left = `${rect.left}px`;
        this.style.bottom = "auto";
        this.style.right = "auto";
        this.style.margin = "0";
      }
    }

    if (!this._isDragging) return;

    this.style.left = `${e.clientX - this._dragOffset.x}px`;
    this.style.top = `${e.clientY - this._dragOffset.y}px`;
    e.preventDefault();
  }

  handlePointerUp(e) {
    if (this._isDragging) {
      this.releasePointerCapture(e.pointerId);
      this.style.cursor = "";
    }

    this._isDragging = false;
    this._dragPending = false;

    document.removeEventListener("pointermove", this._boundPointerMove);
    document.removeEventListener("pointerup", this._boundPointerUp);
    e.preventDefault();
  }

  // ---- Anchor resolution ----

  resolveAnchor() {
    if (this._anchorRef) return this._anchorRef;

    const selector = this.getAttribute("anchor");
    if (!selector) return null;

    // Local-first: nearest parent subtree.
    const localScope = this.parentElement;
    if (localScope?.querySelector) {
      const localMatch = localScope.querySelector(selector);
      if (localMatch && !this.contains(localMatch)) return localMatch;
    }

    // Fallback: global document query.
    return document.querySelector(selector);
  }

  parsePosition() {
    const raw = (this.getAttribute("position") || "top center")
      .trim()
      .toLowerCase();
    const tokens = raw.split(/\s+/).filter(Boolean);
    const verticalValues = new Set(["top", "center", "bottom"]);
    const horizontalValues = new Set(["left", "center", "right"]);

    let vertical = "top";
    let horizontal = "center";
    let shorthand = null;

    // Treat position as "vertical horizontal" to avoid center ambiguity.
    if (tokens.length >= 2) {
      if (verticalValues.has(tokens[0])) {
        vertical = tokens[0];
      }
      if (horizontalValues.has(tokens[1])) {
        horizontal = tokens[1];
      }
      return { vertical, horizontal, shorthand };
    }

    // Single-token fallback: apply only if non-ambiguous.
    if (tokens.length === 1) {
      const token = tokens[0];
      if (token === "top" || token === "bottom") {
        vertical = token;
        shorthand = token;
      } else if (token === "left" || token === "right") {
        horizontal = token;
        shorthand = token;
      } else if (token === "center") {
        vertical = "center";
        horizontal = "center";
      }
    }

    return { vertical, horizontal, shorthand };
  }

  normalizeOffsetToken(token, fallback = "0px") {
    if (!token) return fallback;
    const trimmed = token.trim();
    if (!trimmed) return fallback;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }

  measureLengthPx(value, axis = "x") {
    if (!value) return 0;
    const normalized = this.normalizeOffsetToken(value, "0px");
    if (normalized.endsWith("px")) {
      const px = parseFloat(normalized);
      return Number.isFinite(px) ? px : 0;
    }

    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.left = "0";
    probe.style.top = "0";
    probe.style.margin = "0";
    probe.style.padding = "0";
    probe.style.border = "0";
    if (axis === "x") {
      probe.style.width = normalized;
      probe.style.height = "0";
    } else {
      probe.style.height = normalized;
      probe.style.width = "0";
    }
    document.body.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    return axis === "x" ? rect.width : rect.height;
  }

  parseOffset() {
    const raw = (this.getAttribute("offset") || "0 0").trim();
    const tokens = raw.split(/\s+/).filter(Boolean);

    const xToken = this.normalizeOffsetToken(tokens[0], "0px");
    const yToken = this.normalizeOffsetToken(tokens[1], "0px");

    return {
      xToken,
      yToken,
      xPx: this.measureLengthPx(xToken, "x"),
      yPx: this.measureLengthPx(yToken, "y"),
    };
  }

  parseViewportMargins() {
    const raw = (this.getAttribute("viewport-margin") || "8").trim();
    const tokens = raw
      .split(/\s+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const d = 8;
    if (tokens.length === 0) return { top: d, right: d, bottom: d, left: d };
    if (tokens.length === 1)
      return {
        top: tokens[0],
        right: tokens[0],
        bottom: tokens[0],
        left: tokens[0],
      };
    if (tokens.length === 2)
      return {
        top: tokens[0],
        right: tokens[1],
        bottom: tokens[0],
        left: tokens[1],
      };
    if (tokens.length === 3)
      return {
        top: tokens[0],
        right: tokens[1],
        bottom: tokens[2],
        left: tokens[1],
      };
    return {
      top: tokens[0],
      right: tokens[1],
      bottom: tokens[2],
      left: tokens[3],
    };
  }

  getPlacementCandidates(vertical, horizontal, shorthand) {
    const opp = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
      center: "center",
    };

    if (shorthand) {
      const isHorizontal = shorthand === "left" || shorthand === "right";
      const perp = isHorizontal ? ["top", "bottom"] : ["left", "right"];
      return [
        { v: vertical, h: horizontal, s: shorthand },
        { v: vertical, h: horizontal, s: opp[shorthand] },
        { v: vertical, h: horizontal, s: perp[0] },
        { v: vertical, h: horizontal, s: perp[1] },
      ];
    }

    if (vertical === "center") {
      return [
        { v: "center", h: horizontal, s: null },
        { v: "center", h: opp[horizontal], s: null },
        { v: "top", h: horizontal, s: null },
        { v: "bottom", h: horizontal, s: null },
        { v: "top", h: opp[horizontal], s: null },
        { v: "bottom", h: opp[horizontal], s: null },
      ];
    }

    if (horizontal === "center") {
      return [
        { v: vertical, h: "center", s: null },
        { v: opp[vertical], h: "center", s: null },
        { v: vertical, h: "left", s: null },
        { v: vertical, h: "right", s: null },
        { v: opp[vertical], h: "left", s: null },
        { v: opp[vertical], h: "right", s: null },
      ];
    }

    return [
      { v: vertical, h: horizontal, s: null },
      { v: opp[vertical], h: horizontal, s: null },
      { v: vertical, h: opp[horizontal], s: null },
      { v: opp[vertical], h: opp[horizontal], s: null },
    ];
  }

  computeCoords(
    anchorRect,
    popupRect,
    vertical,
    horizontal,
    offset,
    shorthand,
  ) {
    let top;
    let left;

    if (shorthand === "left" || shorthand === "right") {
      left =
        shorthand === "left"
          ? anchorRect.left - popupRect.width - offset.xPx
          : anchorRect.right + offset.xPx;
      top = anchorRect.top;
      return { top, left };
    }
    if (shorthand === "top" || shorthand === "bottom") {
      top =
        shorthand === "top"
          ? anchorRect.top - popupRect.height - offset.yPx
          : anchorRect.bottom + offset.yPx;
      left = anchorRect.left;
      return { top, left };
    }

    if (vertical === "top") {
      top = anchorRect.top - popupRect.height - offset.yPx;
    } else if (vertical === "bottom") {
      top = anchorRect.bottom + offset.yPx;
    } else {
      top = anchorRect.top + (anchorRect.height - popupRect.height) / 2;
    }

    if (vertical === "center") {
      // Side placement: popup beside the anchor
      if (horizontal === "left") {
        left = anchorRect.left - popupRect.width - offset.xPx;
      } else if (horizontal === "right") {
        left = anchorRect.right + offset.xPx;
      } else {
        left = anchorRect.left + (anchorRect.width - popupRect.width) / 2;
      }
    } else {
      // Edge alignment: popup above/below, aligned to anchor edge
      if (horizontal === "left") {
        left = anchorRect.left + offset.xPx;
      } else if (horizontal === "right") {
        left = anchorRect.right - popupRect.width - offset.xPx;
      } else {
        left = anchorRect.left + (anchorRect.width - popupRect.width) / 2;
      }
    }

    return { top, left };
  }

  oppositeSide(side) {
    const map = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };
    return map[side] || "bottom";
  }

  getPlacementSide(vertical, horizontal, shorthand) {
    if (shorthand === "top") return "top";
    if (shorthand === "bottom") return "bottom";
    if (shorthand === "left") return "left";
    if (shorthand === "right") return "right";

    if (vertical !== "center") return vertical;
    if (horizontal !== "center") return horizontal;
    return "top";
  }

  lengthToPx(value, fallback = 0) {
    const styles = getComputedStyle(this);
    const raw = String(value || "").trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    if (raw.endsWith("rem")) {
      return n * parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    if (raw.endsWith("em")) {
      return n * parseFloat(styles.fontSize);
    }
    return n;
  }

  radiusForSide(side) {
    const styles = getComputedStyle(this);
    const toPx = (value) => this.lengthToPx(value, 0);
    if (side === "top") {
      return Math.max(
        toPx(styles.borderTopLeftRadius),
        toPx(styles.borderTopRightRadius),
      );
    }
    if (side === "bottom") {
      return Math.max(
        toPx(styles.borderBottomLeftRadius),
        toPx(styles.borderBottomRightRadius),
      );
    }
    if (side === "left") {
      return Math.max(
        toPx(styles.borderTopLeftRadius),
        toPx(styles.borderBottomLeftRadius),
      );
    }
    if (side === "right") {
      return Math.max(
        toPx(styles.borderTopRightRadius),
        toPx(styles.borderBottomRightRadius),
      );
    }
    return 0;
  }

  getBeakEdgeInset(beakSide) {
    const beakWidth = this.lengthToPx(
      getComputedStyle(this).getPropertyValue("--fig-popup-beak-width"),
      16,
    );
    return Math.max(10, this.radiusForSide(beakSide) + beakWidth / 2);
  }

  tracksAnchorBeak() {
    const variant = this.getAttribute("variant");
    return variant === "popover" || variant === "tooltip";
  }

  getViewportBounds(m) {
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const height = vv?.height ?? window.innerHeight;
    const offsetLeft = vv?.offsetLeft ?? 0;
    const offsetTop = vv?.offsetTop ?? 0;

    return {
      minLeft: offsetLeft + m.left,
      minTop: offsetTop + m.top,
      maxRight: offsetLeft + width - m.right,
      maxBottom: offsetTop + height - m.bottom,
    };
  }

  clampToViewport(coords, popupRect, m) {
    const bounds = this.getViewportBounds(m);
    const maxLeft = bounds.maxRight - popupRect.width;
    const maxTop = bounds.maxBottom - popupRect.height;

    return {
      left: Math.min(maxLeft, Math.max(bounds.minLeft, coords.left)),
      top: Math.min(maxTop, Math.max(bounds.minTop, coords.top)),
    };
  }

  resolveCoordsAtViewport(anchorRect, popupRect, coords, placementSide, m) {
    let { left, top } = this.clampToViewport(coords, popupRect, m);
    if (!anchorRect || !this.tracksAnchorBeak()) {
      return { left, top };
    }

    const beakSide = this.oppositeSide(placementSide);
    const bounds = this.getViewportBounds(m);
    const maxLeft = bounds.maxRight - popupRect.width;
    const minLeft = bounds.minLeft;
    const maxTop = bounds.maxBottom - popupRect.height;
    const minTop = bounds.minTop;

    if (beakSide === "top" || beakSide === "bottom") {
      const inset = this.getBeakEdgeInset(beakSide);
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const beakOffset = anchorCenterX - left;
      if (beakOffset < inset) {
        left = anchorCenterX - inset;
      } else if (beakOffset > popupRect.width - inset) {
        left = anchorCenterX - (popupRect.width - inset);
      }
      left = Math.min(maxLeft, Math.max(minLeft, left));
    } else if (beakSide === "left" || beakSide === "right") {
      const inset = this.getBeakEdgeInset(beakSide);
      const anchorCenterY = anchorRect.top + anchorRect.height / 2;
      const beakOffset = anchorCenterY - top;
      if (beakOffset < inset) {
        top = anchorCenterY - inset;
      } else if (beakOffset > popupRect.height - inset) {
        top = anchorCenterY - (popupRect.height - inset);
      }
      top = Math.min(maxTop, Math.max(minTop, top));
    }

    return { left, top };
  }

  canPointAtAnchor(anchorRect, popupRect, left, top, placementSide) {
    if (!anchorRect || !this.tracksAnchorBeak()) return true;

    const beakSide = this.oppositeSide(placementSide);
    const inset = this.getBeakEdgeInset(beakSide);

    if (beakSide === "top" || beakSide === "bottom") {
      const beakOffset = anchorRect.left + anchorRect.width / 2 - left;
      return (
        beakOffset >= inset - 0.5 &&
        beakOffset <= popupRect.width - inset + 0.5
      );
    }

    const beakOffset = anchorRect.top + anchorRect.height / 2 - top;
    return (
      beakOffset >= inset - 0.5 &&
      beakOffset <= popupRect.height - inset + 0.5
    );
  }

  updatePopoverBeak(anchorRect, popupRect, left, top, placementSide) {
    if (!this.tracksAnchorBeak() || !anchorRect) {
      this.style.removeProperty("--fig-popup-beak-offset");
      this.removeAttribute("data-beak-side");
      return;
    }

    const beakSide = this.oppositeSide(placementSide);
    this.setAttribute("data-beak-side", beakSide);

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const measuredRect = this.getBoundingClientRect();
    const rect =
      measuredRect.width > 0 && measuredRect.height > 0
        ? measuredRect
        : popupRect;
    const resolvedLeft = rect.left;
    const resolvedTop = rect.top;
    const edgeInset = this.getBeakEdgeInset(beakSide);

    let beakOffset;
    if (beakSide === "top" || beakSide === "bottom") {
      beakOffset = anchorCenterX - resolvedLeft;
      const min = edgeInset;
      const max = Math.max(min, rect.width - edgeInset);
      beakOffset = Math.min(max, Math.max(min, beakOffset));
    } else {
      beakOffset = anchorCenterY - resolvedTop;
      const min = edgeInset;
      const max = Math.max(min, rect.height - edgeInset);
      beakOffset = Math.min(max, Math.max(min, beakOffset));
    }

    this.style.setProperty("--fig-popup-beak-offset", `${beakOffset}px`);
  }

  overflowScore(coords, popupRect, m) {
    const bounds = this.getViewportBounds(m);
    const right = coords.left + popupRect.width;
    const bottom = coords.top + popupRect.height;

    const overflowLeft = Math.max(0, bounds.minLeft - coords.left);
    const overflowTop = Math.max(0, bounds.minTop - coords.top);
    const overflowRight = Math.max(0, right - bounds.maxRight);
    const overflowBottom = Math.max(0, bottom - bounds.maxBottom);

    return overflowLeft + overflowTop + overflowRight + overflowBottom;
  }

  fits(coords, popupRect, m) {
    return this.overflowScore(coords, popupRect, m) === 0;
  }

  clamp(coords, popupRect, m, anchorRect = null, placementSide = "top") {
    if (anchorRect) {
      return this.resolveCoordsAtViewport(
        anchorRect,
        popupRect,
        coords,
        placementSide,
        m,
      );
    }
    return this.clampToViewport(coords, popupRect, m);
  }

  primaryAxisOverflowPenalty(coords, popupRect, m, placementSide) {
    const bounds = this.getViewportBounds(m);
    let overflow = 0;

    if (placementSide === "top") {
      overflow = Math.max(0, bounds.minTop - coords.top);
    } else if (placementSide === "bottom") {
      overflow = Math.max(0, coords.top + popupRect.height - bounds.maxBottom);
    } else if (placementSide === "left") {
      overflow = Math.max(0, bounds.minLeft - coords.left);
    } else if (placementSide === "right") {
      overflow = Math.max(0, coords.left + popupRect.width - bounds.maxRight);
    }

    return overflow > 0 ? 1000 + overflow : 0;
  }

  placementScore(anchorRect, popupRect, coords, placementSide, m) {
    const resolved = this.resolveCoordsAtViewport(
      anchorRect,
      popupRect,
      coords,
      placementSide,
      m,
    );
    let score = this.overflowScore(resolved, popupRect, m);
    score += this.primaryAxisOverflowPenalty(
      coords,
      popupRect,
      m,
      placementSide,
    );
    if (
      anchorRect &&
      !this.canPointAtAnchor(
        anchorRect,
        popupRect,
        resolved.left,
        resolved.top,
        placementSide,
      )
    ) {
      score += 10000;
    }
    return { score, resolved };
  }

  applyPopupPosition(
    anchorRect,
    popupRect,
    coords,
    placementSide,
    m,
  ) {
    const resolved = this.resolveCoordsAtViewport(
      anchorRect,
      popupRect,
      coords,
      placementSide,
      m,
    );
    this.style.left = `${resolved.left}px`;
    this.style.top = `${resolved.top}px`;
    this.updatePopoverBeak(
      anchorRect,
      popupRect,
      resolved.left,
      resolved.top,
      placementSide,
    );
  }

  positionPopup() {
    if (!this.open) return;

    const popupRect = this.getBoundingClientRect();
    const offset = this.parseOffset();
    const { vertical, horizontal, shorthand } = this.parsePosition();
    const anchor = this.resolveAnchor();
    const m = this.parseViewportMargins();

    if (!anchor) {
      this.updatePopoverBeak(null, popupRect, 0, 0, "top");
      const bounds = this.getViewportBounds(m);
      const centered = {
        left:
          bounds.minLeft +
          (bounds.maxRight - bounds.minLeft - popupRect.width) / 2,
        top:
          bounds.minTop +
          (bounds.maxBottom - bounds.minTop - popupRect.height) / 2,
      };
      const clamped = this.clampToViewport(centered, popupRect, m);
      this.style.left = `${clamped.left}px`;
      this.style.top = `${clamped.top}px`;
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const candidates = this.getPlacementCandidates(
      vertical,
      horizontal,
      shorthand,
    );
    let best = null;
    let bestSide = "top";
    let bestScore = Number.POSITIVE_INFINITY;

    for (const { v, h, s } of candidates) {
      const coords = this.computeCoords(anchorRect, popupRect, v, h, offset, s);
      const placementSide = this.getPlacementSide(v, h, s);
      const { score, resolved } = this.placementScore(
        anchorRect,
        popupRect,
        coords,
        placementSide,
        m,
      );

      if (s) {
        const bounds = this.getViewportBounds(m);
        const primaryFits =
          s === "left" || s === "right"
            ? coords.left >= bounds.minLeft &&
              coords.left + popupRect.width <= bounds.maxRight
            : coords.top >= bounds.minTop &&
              coords.top + popupRect.height <= bounds.maxBottom;
        if (primaryFits && score < 10000) {
          this.applyPopupPosition(
            anchorRect,
            popupRect,
            coords,
            placementSide,
            m,
          );
          return;
        }
      } else if (score === 0) {
        this.applyPopupPosition(
          anchorRect,
          popupRect,
          coords,
          placementSide,
          m,
        );
        return;
      }

      if (score < bestScore) {
        bestScore = score;
        best = resolved;
        bestSide = placementSide;
      }
    }

    this.applyPopupPosition(
      anchorRect,
      popupRect,
      best || { left: 0, top: 0 },
      bestSide,
      m,
    );
  }

  queueReposition() {
    if (!this.open || !this.isPopupDisplayed() || !this.shouldAutoReposition()) {
      return;
    }
    if (this._rafId !== null) return;

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this.positionPopup();
    });
  }

  shouldAutoReposition() {
    if (!(this.drag && this._wasDragged)) return true;
    return !this.resolveAnchor();
  }

  isPopupDisplayed() {
    return Boolean(
      this._isPopupActive ||
        this.matches?.(":open") ||
        this.matches?.(":popover-open"),
    );
  }
}
figDefineCustomizedBuiltIn("fig-popup", FigPopup, { extends: "dialog" });

/* Tabs */
/**
 * A custom tab element for use within FigTabs.
 * @attr {string} label - The text label of the tab
 * @attr {boolean} selected - Whether the tab is currently selected
 */
class FigTab extends HTMLElement {
  #selected;
  #boundHandleClick;
  constructor() {
    super();
    this.content = null;
    this.#selected = false;
    this.#boundHandleClick = this.handleClick.bind(this);
  }
  connectedCallback() {
    this.setAttribute("label", this.innerText);
    this.setAttribute("role", "tab");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    this.addEventListener("click", this.#boundHandleClick);

    figNextFrame(this, () => {
      if (typeof this.getAttribute("content") === "string") {
        this.content = document.querySelector(this.getAttribute("content"));
        if (this.content) {
          const tabId = this.getAttribute("id") || figUniqueId();
          const panelId = this.content.getAttribute("id") || figUniqueId();
          this.setAttribute("id", tabId);
          this.content.setAttribute("id", panelId);
          this.setAttribute("aria-controls", panelId);
          this.content.setAttribute("role", "tabpanel");
          this.content.setAttribute("aria-labelledby", tabId);
          if (this.#selected) {
            this.content.style.display = "block";
            this.setAttribute("aria-selected", "true");
          } else {
            this.content.style.display = "none";
            this.setAttribute("aria-selected", "false");
          }
        }
      }
    });
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.setAttribute("selected", value ? "true" : "false");
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
  }
  handleClick() {
    if (this.hasAttribute("disabled")) return;
    this.selected = true;
    if (this.content) {
      this.content.style.display = "block";
    }
  }

  static get observedAttributes() {
    return ["selected", "disabled"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "selected") {
      this.#selected = newValue !== null && newValue !== "false";
      this.setAttribute("aria-selected", this.#selected ? "true" : "false");
      this.setAttribute("tabindex", this.#selected ? "0" : "-1");
      if (this?.content) {
        this.content.style.display = this.#selected ? "block" : "none";
      }
    }
    if (name === "disabled") {
      const disabled = newValue !== null && newValue !== "false";
      if (disabled) {
        this.setAttribute("aria-disabled", "true");
        this.setAttribute("tabindex", "-1");
      } else {
        this.removeAttribute("aria-disabled");
        this.setAttribute("tabindex", this.#selected ? "0" : "-1");
      }
    }
  }
}
customElements.define("fig-tab", FigTab);

/**
 * A custom tabs container element.
 * @attr {string} name - Identifier for the tabs group
 */
class FigTabs extends HTMLElement {
  #boundHandleClick;
  #boundHandleKeyDown;
  #boundSyncOverflow = this.#syncOverflow.bind(this);
  #mutationObserver = null;
  #resizeObserver = null;
  #navStart = null;
  #navEnd = null;
  #isUnwrapping = false;

  constructor() {
    super();
    this.#boundHandleClick = this.handleClick.bind(this);
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
  }

  static get observedAttributes() {
    return ["value", "name", "disabled"];
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "tabs";
    this.setAttribute("role", "tablist");
    if (this.shadowRoot) this.shadowRoot.replaceChildren();
    this.#removeLegacyScroller();
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("scroll", this.#boundSyncOverflow);
    this.#createNavButtons();
    this.#startObserver();
    this.#startResizeObserver();
    figNextFrame(this, () => {
      const value = this.getAttribute("value");
      if (value) {
        this.#selectByValue(value);
      }
      if (this.hasAttribute("disabled")) {
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
        tab.setAttribute("disabled", "");
        tab.setAttribute("aria-disabled", "true");
        tab.setAttribute("tabindex", "-1");
      } else {
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
    const selected = tabs.find((tab) => tab.hasAttribute("selected")) || this.#availableTabs()[0];
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
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
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
    this.#mutationObserver = new MutationObserver(() => {
      if (this.#isUnwrapping) return;
      this.#removeLegacyScroller();
      this.#createNavButtons();
      this.#syncTabIndexes();
      requestAnimationFrame(() => {
        this.#syncOverflow();
        this.#scrollSelectedTabIntoView();
      });
    });
    this.#mutationObserver.observe(this, { childList: true, subtree: false });
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.classList.remove("overflow-start", "overflow-end");
  }

  #createNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.contains(this.#navStart) &&
      this.contains(this.#navEnd)
    ) {
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
    this.prepend(this.#navStart);
    this.append(this.#navEnd);
  }

  #handleKeyDown(event) {
    const tabs = this.#availableTabs();
    if (!tabs.length) return;
    const currentIndex = tabs.findIndex((tab) => tab.hasAttribute("selected"));
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
    }
  }

  handleClick(event) {
    if (this.hasAttribute("disabled")) return;
    const target = event.target.closest("fig-tab");
    if (!target || !this.contains(target)) return;
    const previousTab = this.selectedTab;
    const previousValue = this.value;
    const tabs = this.querySelectorAll("fig-tab");
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
customElements.define("fig-tabs", FigTabs);

/* Segmented Control */
/**
 * A custom segment element for use within FigSegmentedControl.
 * @attr {string} value - The value associated with this segment
 * @attr {boolean} selected - Whether the segment is currently selected
 */
class FigSegment extends HTMLElement {
  #value;
  #selected;
  #boundHandleClick;
  constructor() {
    super();
    this.#boundHandleClick = this.handleClick.bind(this);
  }
  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "radio");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    this.#syncA11yState();
    this.addEventListener("click", this.#boundHandleClick);
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
  }
  handleClick() {
    const parentControl = this.closest("fig-segmented-control");
    if (
      parentControl &&
      parentControl.hasAttribute("disabled") &&
      parentControl.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    this.setAttribute("selected", "true");
  }
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
    this.setAttribute("value", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.#selected = value;
    this.setAttribute("selected", value);
  }
  static get observedAttributes() {
    return ["selected", "value", "disabled"];
  }
  #syncA11yState() {
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.setAttribute("aria-checked", selected ? "true" : "false");
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
      this.setAttribute("tabindex", selected ? "0" : "-1");
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        this.#value = newValue;
        break;
      case "selected":
        this.#selected = newValue;
        this.#syncA11yState();
        break;
      case "disabled":
        this.#syncA11yState();
        break;
    }
  }
}
customElements.define("fig-segment", FigSegment);

/**
 * A custom segmented control container element.
 * @attr {string} name - Identifier for the segmented control group
 * @attr {string} value - Selected segment value
 * @attr {boolean} animated - Enables animated selection indicator
 * @attr {"equal"|"auto"} sizing - Segment sizing mode
 */
class FigSegmentedControl extends HTMLElement {
  #selectedSegment = null;
  #boundHandleClick = this.handleClick.bind(this);
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #mutationObserver = null;
  #resizeObserver = null;
  #indicatorFrame = 0;
  #indicatorSyncInstant = false;
  #hasRenderedIndicator = false;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["disabled", "value", "animated", "sizing"];
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "segmented-control";
    if (!this.hasAttribute("role")) this.setAttribute("role", "radiogroup");
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.#applyDisabled(
      this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false",
    );
    this.#startSegmentObserver();
    this.#startResizeObserver();

    // Defer initial selection so child segments are available.
    figNextFrame(this, () => {
      this.#syncSelectionFromAttributes({ enforceFallback: true });
      this.#refreshResizeObserverTargets();
      this.#queueIndicatorSync({ forceInstant: true });
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#indicatorFrame) {
      cancelAnimationFrame(this.#indicatorFrame);
      this.#indicatorFrame = 0;
    }
    this.#indicatorSyncInstant = false;
    this.#hasRenderedIndicator = false;
  }

  get selectedSegment() {
    return this.#selectedSegment;
  }

  set selectedSegment(segment) {
    const segments = this.querySelectorAll("fig-segment");
    for (const seg of segments) {
      const shouldBeSelected = seg === segment;
      const isSelected = seg.hasAttribute("selected");
      if (shouldBeSelected && !isSelected) {
        seg.setAttribute("selected", "true");
      } else if (!shouldBeSelected && isSelected) {
        seg.removeAttribute("selected");
      }
    }
    this.#selectedSegment =
      segment instanceof HTMLElement && this.contains(segment) ? segment : null;
    this.#syncSegmentA11y();
    this.#queueIndicatorSync();
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    if (val === null || val === undefined) {
      this.removeAttribute("value");
      return;
    }
    this.setAttribute("value", String(val));
  }

  #emitSelectionEvents(value) {
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: value,
        bubbles: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: value,
        bubbles: true,
      }),
    );
  }

  #resolveSegmentValue(segment) {
    const explicitValue = segment.getAttribute("value");
    if (explicitValue !== null) {
      const trimmedExplicitValue = explicitValue.trim();
      if (trimmedExplicitValue.length > 0) {
        return trimmedExplicitValue;
      }
    }

    return segment.textContent?.trim() || "";
  }

  #getFirstSelectedSegment() {
    const segments = this.querySelectorAll("fig-segment");
    for (const segment of segments) {
      if (segment.hasAttribute("selected")) return segment;
    }
    return null;
  }

  #availableSegments() {
    return Array.from(this.querySelectorAll("fig-segment")).filter(
      (segment) =>
        !segment.hasAttribute("disabled") ||
        segment.getAttribute("disabled") === "false",
    );
  }

  #syncSegmentA11y() {
    const segments = Array.from(this.querySelectorAll("fig-segment"));
    const selected = segments.find((segment) => segment.hasAttribute("selected"));
    segments.forEach((segment) => {
      const disabled =
        segment.hasAttribute("disabled") &&
        segment.getAttribute("disabled") !== "false";
      const isSelected = segment === selected;
      segment.setAttribute("aria-checked", isSelected ? "true" : "false");
      segment.setAttribute("tabindex", !disabled && isSelected ? "0" : "-1");
    });
  }

  #selectSegment(segment) {
    if (!segment) return;
    const previousSegment = this.selectedSegment;
    const previousValue = this.value;
    this.selectedSegment = segment;
    const resolvedValue = this.#resolveSegmentValue(segment);

    if (resolvedValue) {
      this.setAttribute("value", resolvedValue);
    } else {
      this.removeAttribute("value");
    }

    const nextValue = this.value;
    if (previousSegment !== segment || previousValue !== nextValue) {
      this.#emitSelectionEvents(nextValue);
    }
  }

  #handleKeyDown(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    const segments = this.#availableSegments();
    if (!segments.length) return;
    const currentIndex = segments.findIndex((segment) =>
      segment.hasAttribute("selected"),
    );
    let nextIndex = currentIndex >= 0 ? currentIndex : 0;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        nextIndex = nextIndex > 0 ? nextIndex - 1 : segments.length - 1;
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        nextIndex = nextIndex < segments.length - 1 ? nextIndex + 1 : 0;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = segments.length - 1;
        break;
      case " ":
      case "Enter": {
        const active = event.target.closest("fig-segment");
        if (active && this.contains(active)) {
          event.preventDefault();
          this.#selectSegment(active);
        }
        return;
      }
      default:
        return;
    }

    const next = segments[nextIndex];
    this.#selectSegment(next);
    next.focus();
    requestAnimationFrame(() => {
      if (this.contains(next)) next.focus();
    });
  }

  #selectByValue(value) {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) return false;

    const segments = this.querySelectorAll("fig-segment");
    for (const segment of segments) {
      const segmentValue = this.#resolveSegmentValue(segment);
      if (!segmentValue) continue;
      if (segmentValue === normalizedValue) {
        this.selectedSegment = segment;
        return true;
      }
    }

    return false;
  }

  #isAnimatedEnabled() {
    const rawAnimated = this.getAttribute("animated");
    if (rawAnimated === null) return false;
    if (rawAnimated === "") return true;
    return rawAnimated.trim().toLowerCase() === "true";
  }

  #queueIndicatorSync({ forceInstant = false } = {}) {
    this.#indicatorSyncInstant = this.#indicatorSyncInstant || forceInstant;
    if (this.#indicatorFrame) return;

    this.#indicatorFrame = requestAnimationFrame(() => {
      this.#indicatorFrame = 0;
      const nextForceInstant = this.#indicatorSyncInstant;
      this.#indicatorSyncInstant = false;
      this.#syncIndicator({ forceInstant: nextForceInstant });
    });
  }

  #syncIndicator({ forceInstant = false } = {}) {
    const isDisabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const isAnimated = this.#isAnimatedEnabled();
    const activeSegment =
      this.#selectedSegment && this.contains(this.#selectedSegment)
        ? this.#selectedSegment
        : this.#getFirstSelectedSegment();

    if (isDisabled || !isAnimated) {
      this.style.setProperty("--seg-indicator-opacity", "0");
      this.style.setProperty("--seg-indicator-transition-duration", "0ms");
      this.removeAttribute("data-indicator-ready");
      if (!isAnimated || isDisabled) {
        this.#hasRenderedIndicator = false;
      }
      return;
    }

    if (!activeSegment) {
      // During transient mutation/paint windows, keep the previous indicator
      // state to avoid flicker while the next selected segment resolves.
      if (this.#hasRenderedIndicator) return;
      this.style.setProperty("--seg-indicator-opacity", "0");
      this.style.setProperty("--seg-indicator-transition-duration", "0ms");
      this.removeAttribute("data-indicator-ready");
      return;
    }

    const hostRect = this.getBoundingClientRect();
    const segmentRect = activeSegment.getBoundingClientRect();
    if (hostRect.width <= 0 || segmentRect.width <= 0) {
      if (this.#hasRenderedIndicator) return;
      this.style.setProperty("--seg-indicator-opacity", "0");
      this.style.setProperty("--seg-indicator-transition-duration", "0ms");
      this.removeAttribute("data-indicator-ready");
      return;
    }

    const x = Math.max(0, segmentRect.left - hostRect.left);
    this.style.setProperty("--seg-indicator-x", `${x}px`);
    this.style.setProperty("--seg-indicator-w", `${segmentRect.width}px`);
    this.style.setProperty("--seg-indicator-opacity", "1");
    this.style.setProperty(
      "--seg-indicator-transition-duration",
      !this.#hasRenderedIndicator || forceInstant ? "0ms" : "150ms",
    );
    this.setAttribute("data-indicator-ready", "true");
    this.#hasRenderedIndicator = true;
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#queueIndicatorSync();
    });
    this.#refreshResizeObserverTargets();
  }

  #refreshResizeObserverTargets() {
    if (!this.#resizeObserver) return;
    this.#resizeObserver.disconnect();
    this.#resizeObserver.observe(this);
    this.querySelectorAll("fig-segment").forEach((segment) => {
      this.#resizeObserver?.observe(segment);
    });
  }

  #syncSelectionFromAttributes({ enforceFallback = false } = {}) {
    const segments = this.querySelectorAll("fig-segment");
    if (segments.length === 0) {
      this.#selectedSegment = null;
      this.#queueIndicatorSync({ forceInstant: true });
      return;
    }

    const rawValue = this.getAttribute("value");
    const normalizedValue = rawValue?.trim() ?? "";
    if (rawValue !== null) {
      if (normalizedValue !== rawValue) {
        this.setAttribute("value", normalizedValue);
        return;
      }

      if (normalizedValue && this.#selectByValue(normalizedValue)) {
        return;
      }
    }

    const selected = this.#getFirstSelectedSegment();
    if (selected) {
      this.selectedSegment = selected;
      return;
    }

    if (enforceFallback) {
      this.selectedSegment = segments[0];
    }
  }

  #startSegmentObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver((mutations) => {
      let shouldResync = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          shouldResync = true;
          break;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement &&
          mutation.target.tagName.toLowerCase() === "fig-segment" &&
          (mutation.attributeName === "value" ||
            mutation.attributeName === "selected")
        ) {
          shouldResync = true;
          break;
        }

        if (mutation.type === "characterData") {
          shouldResync = true;
          break;
        }
      }

      if (shouldResync) {
        this.#applyDisabled(
          this.hasAttribute("disabled") &&
            this.getAttribute("disabled") !== "false",
        );
        this.#refreshResizeObserverTargets();
        this.#syncSelectionFromAttributes({ enforceFallback: true });
        this.#syncSegmentA11y();
      }
    });

    this.#mutationObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value", "selected"],
    });
  }

  handleClick(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    const segment = event.target.closest("fig-segment");
    if (!segment || !this.contains(segment)) return;

    this.#selectSegment(segment);
  }

  #applyDisabled(disabled) {
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.querySelectorAll("fig-segment").forEach((segment) => {
      if (disabled) {
        segment.setAttribute("disabled", "");
        segment.setAttribute("aria-disabled", "true");
      } else {
        segment.removeAttribute("disabled");
        segment.removeAttribute("aria-disabled");
      }
    });
    this.#syncSegmentA11y();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "disabled") {
      this.#applyDisabled(newValue !== null && newValue !== "false");
      this.#queueIndicatorSync({ forceInstant: true });
      return;
    }

    if (name === "value") {
      this.#syncSelectionFromAttributes({ enforceFallback: false });
      return;
    }

    if (name === "animated") {
      if (!this.#isAnimatedEnabled()) {
        this.#hasRenderedIndicator = false;
      }
      this.#queueIndicatorSync({ forceInstant: true });
      return;
    }

    if (name === "sizing") {
      this.#queueIndicatorSync({ forceInstant: true });
    }
  }
}
customElements.define("fig-segmented-control", FigSegmentedControl);

/* Options */
/**
 * A responsive option picker that renders as a segmented control by default,
 * automatically swapping to a dropdown when any label overflows.
 * @attr {string} options - Comma-separated list of option labels
 * @attr {string} value - Currently selected value
 * @attr {boolean} disabled - Disables the control
 * @attr {boolean} full - Full-width segmented control
 * @attr {string} sizing - Segment sizing mode: "equal" (default) or "auto"
 */
class FigOptions extends HTMLElement {
  static get observedAttributes() {
    return ["options", "value", "disabled", "full", "sizing"];
  }

  #currentMode = "segments"; // "segments" | "dropdown"
  #naturalWidth = 0;
  #resizeObserver = null;
  #parsedOptions = [];
  #childControl = null;
  #suppressEvents = false;

  #normalizeChildEventValue(e) {
    const detailValue = e?.detail;
    if (typeof detailValue === "string") return detailValue;
    const fallbackValue =
      e?.currentTarget?.value ?? e?.target?.value ?? this.getAttribute("value");
    if (fallbackValue === null || fallbackValue === undefined) return null;
    return String(fallbackValue);
  }

  #canReuseControl() {
    if (this.#parsedOptions.length === 0) return false;
    const segments = this.querySelector(":scope > fig-segmented-control");
    if (segments) {
      const opts = segments.querySelectorAll("fig-segment");
      if (opts.length !== this.#parsedOptions.length) return false;
      return Array.from(opts).every(
        (seg, i) => seg.getAttribute("value") === this.#parsedOptions[i],
      );
    }
    const dropdown = this.querySelector(":scope > fig-dropdown");
    if (dropdown) {
      const opts = dropdown.querySelectorAll("option");
      return (
        opts.length === this.#parsedOptions.length &&
        Array.from(opts).every(
          (opt, i) => opt.textContent?.trim() === this.#parsedOptions[i],
        )
      );
    }
    return false;
  }

  #reuseControl() {
    const segments = this.querySelector(":scope > fig-segmented-control");
    if (segments) {
      this.#childControl = segments;
      this.#currentMode = "segments";
    } else {
      this.#childControl = this.querySelector(":scope > fig-dropdown");
      this.#currentMode = "dropdown";
    }
    this.#syncValueToChild();
  }

  connectedCallback() {
    this.#parseOptions();
    if (this.#canReuseControl()) {
      this.#reuseControl();
      this.#startResizeObserver();
      figNextFrame(this, () => figNextFrame(this, () => this.#checkOverflow()));
      return;
    }
    this.#renderSegments();
    this.#startResizeObserver();
    figNextFrame(this, () => figNextFrame(this, () => this.#checkOverflow()));
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    if (val === null || val === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(val));
    }
  }

  get options() {
    return this.#parsedOptions.slice();
  }

  set options(val) {
    if (Array.isArray(val)) {
      const hasComma = val.some((v) => String(v).includes(","));
      const str = hasComma ? JSON.stringify(val) : val.join(",");
      this.setAttribute("options", str);
    } else {
      this.setAttribute("options", String(val || ""));
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "options") {
      this.#parseOptions();
      this.#rebuildCurrentControl();
      return;
    }

    if (name === "value") {
      this.#syncValueToChild();
      return;
    }

    if (name === "disabled") {
      this.#syncAttrToChild("disabled");
      return;
    }

    if (name === "full") {
      this.#syncAttrToChild("full");
      return;
    }

    if (name === "sizing") {
      this.#syncAttrToChild("sizing");
      this.#rebuildCurrentControl();
    }
  }

  #parseOptions() {
    const raw = this.getAttribute("options") || "";
    if (raw.startsWith("[")) {
      try { this.#parsedOptions = JSON.parse(raw); return; } catch {}
    }
    const delimiter = raw.includes("\n") ? "\n" : ",";
    this.#parsedOptions = raw.split(delimiter).map((s) => s.trim()).filter(Boolean);
  }

  #renderSegments() {
    this.innerHTML = "";
    if (this.#parsedOptions.length === 0) return;

    const sc = document.createElement("fig-segmented-control");
    sc.setAttribute("sizing", this.getAttribute("sizing") || "equal");

    if (this.hasAttribute("disabled")) sc.setAttribute("disabled", "");
    if (this.hasAttribute("full")) sc.setAttribute("full", "");

    const currentValue = this.getAttribute("value");

    for (const opt of this.#parsedOptions) {
      const seg = document.createElement("fig-segment");
      seg.setAttribute("value", opt);
      seg.textContent = opt;
      if (currentValue === opt) {
        seg.setAttribute("selected", "true");
      }
      sc.appendChild(seg);
    }

    if (currentValue) sc.setAttribute("value", currentValue);

    sc.addEventListener("input", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (nextValue === null) return;
      this.#suppressEvents = true;
      this.setAttribute("value", nextValue);
      this.#suppressEvents = false;
      this.dispatchEvent(
        new CustomEvent("input", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });
    sc.addEventListener("change", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (nextValue === null) return;
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.appendChild(sc);
    this.#childControl = sc;
    this.#currentMode = "segments";
  }

  #renderDropdown() {
    this.innerHTML = "";
    if (this.#parsedOptions.length === 0) return;

    const dd = document.createElement("fig-dropdown");
    if (this.hasAttribute("disabled")) dd.setAttribute("disabled", "");

    const currentValue = this.getAttribute("value");

    for (const opt of this.#parsedOptions) {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      if (currentValue === opt) option.selected = true;
      dd.appendChild(option);
    }

    if (currentValue) dd.setAttribute("value", currentValue);

    dd.addEventListener("input", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (!nextValue) return;
      this.#suppressEvents = true;
      this.setAttribute("value", nextValue);
      this.#suppressEvents = false;
      this.dispatchEvent(
        new CustomEvent("input", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });
    dd.addEventListener("change", (e) => {
      e.stopPropagation();
      if (this.#suppressEvents) return;
      const nextValue = this.#normalizeChildEventValue(e);
      if (!nextValue) return;
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: nextValue,
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.appendChild(dd);
    this.#childControl = dd;
    this.#currentMode = "dropdown";
  }

  #rebuildCurrentControl() {
    if (this.#currentMode === "segments") {
      this.#renderSegments();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.#checkOverflow());
      });
    } else {
      this.#renderDropdown();
    }
  }

  #syncValueToChild() {
    if (!this.#childControl || this.#suppressEvents) return;
    const val = this.getAttribute("value") || "";
    this.#childControl.value = val;
  }

  #syncAttrToChild(attr) {
    if (!this.#childControl) return;
    if (this.hasAttribute(attr)) {
      this.#childControl.setAttribute(attr, this.getAttribute(attr) || "");
    } else {
      this.#childControl.removeAttribute(attr);
    }
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#checkOverflow();
    });
    this.#resizeObserver.observe(this);
  }

  #isSegmentTruncated(seg) {
    const range = document.createRange();
    range.selectNodeContents(seg);
    const textWidth = range.getBoundingClientRect().width;
    const segRect = seg.getBoundingClientRect();
    const segWidth = segRect.width;
    const cs = getComputedStyle(seg);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const contentWidth = segWidth - padL - padR;
    return textWidth > contentWidth + 0.5;
  }

  #anySegmentTruncated() {
    const segments = this.querySelectorAll("fig-segment");
    for (const seg of segments) {
      if (this.#isSegmentTruncated(seg)) return true;
    }
    return false;
  }

  #checkOverflow() {
    if (this.#parsedOptions.length <= 1) return;

    if (this.#currentMode === "segments") {
      const sc = this.#childControl;
      const containerOverflow = sc && sc.scrollWidth > sc.clientWidth + 1;
      if (containerOverflow || this.#anySegmentTruncated()) {
        this.#naturalWidth = this.clientWidth;
        this.#renderDropdown();
      }
    } else {
      if (this.#naturalWidth > 0 && this.clientWidth >= this.#naturalWidth) {
        this.#renderSegments();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const sc = this.#childControl;
            const containerOverflow = sc && sc.scrollWidth > sc.clientWidth + 1;
            if (containerOverflow || this.#anySegmentTruncated()) {
              this.#renderDropdown();
            }
          });
        });
      }
    }
  }
}
customElements.define("fig-options", FigOptions);

/* Slider */
/**
 * A custom slider input element.
 * @attr {string} type - The slider type: "range", "hue", "delta", "stepper", or "opacity"
 * @attr {number} value - The current value of the slider
 * @attr {number} min - The minimum value
 * @attr {number} max - The maximum value
 * @attr {number} step - The step increment
 * @attr {boolean} text - Whether to show a text input alongside the slider (default true)
 * @attr {string} placeholder - Placeholder for the number input when text is enabled
 * @attr {string} units - The units to display after the value
 * @attr {number} transform - A multiplier for the displayed value
 * @attr {boolean} disabled - Whether the slider is disabled
 * @attr {string} color - The color for the slider track (for opacity type)
 */
class FigSlider extends HTMLElement {
  #isInteracting = false;
  #showEmptyTextValue = false;
  #isSyncingValueAttribute = false;
  #value = "";
  #a11yAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
    "aria-valuetext",
  ];
  // Private fields declarations
  #typeDefaults = {
    range: { min: 0, max: 100, step: 1 },
    hue: { min: 0, max: 255, step: 1 },
    delta: { min: -100, max: 100, step: 1 },
    stepper: { min: 0, max: 100, step: 25 },
    opacity: { min: 0, max: 100, step: 0.1, color: "#FF0000" },
  };

  #boundHandleInput;
  #boundHandleChange;
  #boundHandleTextInput;
  #boundHandleTextChange;
  #boundHandleKeyDown;
  #boundRangePointerDown;
  #boundRangePointerUp;
  #lastSliderComplete = null;
  #lastSliderDefault = null;
  #lastSliderUnchanged = null;

  constructor() {
    super();
    this.initialInnerHTML = this.innerHTML;

    // Bind the event handlers
    this.#boundHandleInput = (e) => {
      e.stopPropagation();
      this.#handleInput();
    };

    this.#boundHandleChange = (e) => {
      e.stopPropagation();
      this.#handleChange();
    };
    this.#boundHandleKeyDown = (e) => {
      this.#handleKeyDown(e);
    };

    this.#boundHandleTextInput = (e) => {
      e.stopPropagation();
      this.#handleTextInput();
    };

    this.#boundHandleTextChange = (e) => {
      e.stopPropagation();
      this.#handleTextChange();
    };
    this.#boundRangePointerDown = () => {
      this.#isInteracting = true;
    };
    this.#boundRangePointerUp = () => {
      this.#isInteracting = false;
    };
  }

  #readAttributesFromMarkup() {
    const rawValue = this.getAttribute("value");
    this.type = this.getAttribute("type") || "range";
    this.variant = this.getAttribute("variant") || "default";
    this.text = this.getAttribute("text") !== "false";
    this.units = this.getAttribute("units") || "";
    this.transform = Number(this.getAttribute("transform") || 1);
    this.disabled = this.getAttribute("disabled") ? true : false;
    this.precision = this.hasAttribute("precision")
      ? Number(this.getAttribute("precision"))
      : null;
    this.placeholder =
      this.getAttribute("placeholder") !== null
        ? this.getAttribute("placeholder")
        : "##";

    const defaults = this.#typeDefaults[this.type];
    this.min = Number(this.getAttribute("min") || defaults.min);
    this.max = Number(this.getAttribute("max") || defaults.max);
    this.step = Number(this.getAttribute("step") || defaults.step);
    this.color = this.getAttribute("color") || defaults?.color;
    this.default = this.hasAttribute("default")
      ? this.getAttribute("default")
      : this.type === "delta"
        ? 0
        : this.min;
    this.#showEmptyTextValue =
      this.type !== "range" &&
      (rawValue === null ||
        (typeof rawValue === "string" && rawValue.trim() === ""));
    this.value = this.#normalizeSliderValue(rawValue);
  }

  #canReuseRenderedMarkup() {
    const range = this.querySelector("[type=range]");
    if (!range) return false;
    const wantsText = this.getAttribute("text") !== "false";
    return wantsText === !!this.querySelector("fig-input-number");
  }

  #updateRenderedMarkup() {
    this.#readAttributesFromMarkup();
    if (this.color) {
      this.style.setProperty("--color", this.color);
    } else {
      this.style.removeProperty("--color");
    }

    this.input = this.querySelector("[type=range]");
    this.inputContainer = this.querySelector(".fig-slider-input-container");
    this.input.className = this.type;
    this.input.min = String(this.min);
    this.input.max = String(this.max);
    this.input.step = String(this.step);
    this.input.value = String(this.value);
    this.input.disabled = this.disabled;
    if (this.text) this.input.setAttribute("tabindex", "-1");
    else this.input.removeAttribute("tabindex");
    this.input.setAttribute("aria-valuemin", String(this.min));
    this.input.setAttribute("aria-valuemax", String(this.max));
    this.input.setAttribute("aria-valuenow", String(this.value));

    this.figInputNumber = this.querySelector("fig-input-number");
    if (this.figInputNumber) {
      this.figInputNumber.setAttribute("placeholder", this.placeholder);
      this.figInputNumber.setAttribute("min", String(this.min));
      this.figInputNumber.setAttribute("max", String(this.max));
      this.figInputNumber.setAttribute("transform", String(this.transform));
      this.figInputNumber.setAttribute("step", String(this.step));
      this.figInputNumber.setAttribute(
        "value",
        this.#showEmptyTextValue ? "" : String(this.value),
      );
      if (this.units) this.figInputNumber.setAttribute("units", this.units);
      else this.figInputNumber.removeAttribute("units");
      if (this.precision !== null) {
        this.figInputNumber.setAttribute("precision", String(this.precision));
      } else {
        this.figInputNumber.removeAttribute("precision");
      }
      this.figInputNumber.disabled = this.disabled;
      this.figInputNumber.toggleAttribute("disabled", this.disabled);
    }
  }

  #bindControlListeners() {
    this.#syncInputA11yAttributes();
    this.input.removeEventListener("input", this.#boundHandleInput);
    this.input.addEventListener("input", this.#boundHandleInput);
    this.input.removeEventListener("change", this.#boundHandleChange);
    this.input.addEventListener("change", this.#boundHandleChange);
    this.input.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.input.addEventListener("keydown", this.#boundHandleKeyDown);
    this.input.removeEventListener("pointerdown", this.#boundRangePointerDown);
    this.input.addEventListener("pointerdown", this.#boundRangePointerDown);
    this.input.removeEventListener("pointerup", this.#boundRangePointerUp);
    this.input.addEventListener("pointerup", this.#boundRangePointerUp);

    if (this.default) {
      this.style.setProperty(
        "--default",
        this.#calculateNormal(this.default),
      );
    }

    if (this.figInputNumber) {
      this.#syncTextInputA11yAttributes();
      this.figInputNumber.removeEventListener(
        "input",
        this.#boundHandleTextInput,
      );
      this.figInputNumber.addEventListener(
        "input",
        this.#boundHandleTextInput,
      );
      this.figInputNumber.removeEventListener(
        "change",
        this.#boundHandleTextChange,
      );
      this.figInputNumber.addEventListener(
        "change",
        this.#boundHandleTextChange,
      );
    }
  }

  #regenerateInnerHTML() {
    this.#readAttributesFromMarkup();

    if (this.color) {
      this.style.setProperty("--color", this.color);
    }

    let html = "";
    let slider = `<div class="fig-slider-input-container" role="group">
                <input 
                    type="range"
                    ${this.text ? 'tabindex="-1"' : ""}
                    ${this.disabled ? "disabled" : ""}
                    min="${this.min}"
                    max="${this.max}"
                    step="${this.step}"
                    class="${this.type}"
                    value="${this.value}"
                    aria-valuemin="${this.min}"
                    aria-valuemax="${this.max}"
                    aria-valuenow="${this.value}">
                ${this.initialInnerHTML}
            </div>`;
    if (this.text) {
      html = `${slider}
                    <fig-input-number
                        placeholder="${this.placeholder}"
                        min="${this.min}"
                        max="${this.max}"
                        transform="${this.transform}"
                        step="${this.step}"
                        value="${this.#showEmptyTextValue ? "" : this.value}"
                        ${this.units ? `units="${this.units}"` : ""}
                        ${this.precision !== null ? `precision="${this.precision}"` : ""}>
                    </fig-input-number>`;
    } else {
      html = slider;
    }
    this.innerHTML = html;

    this.input = this.querySelector("[type=range]");
    this.inputContainer = this.querySelector(".fig-slider-input-container");
    this.figInputNumber = this.querySelector("fig-input-number");
    this.#bindControlListeners();

    this.datalist = this.querySelector("datalist");
    if (this.datalist) {
      this.inputContainer.append(this.datalist);
      this.datalist.setAttribute(
        "id",
        this.datalist.getAttribute("id") || figUniqueId(),
      );
      this.input.setAttribute("list", this.datalist.getAttribute("id"));
    } else if (this.type === "stepper") {
      this.datalist = document.createElement("datalist");
      this.datalist.setAttribute("id", figUniqueId());
      let steps = (this.max - this.min) / this.step + 1;
      for (let i = 0; i < steps; i++) {
        let option = document.createElement("option");
        option.setAttribute("value", this.min + i * this.step);
        this.datalist.append(option);
      }
      this.inputContainer.append(this.datalist);
      this.input.setAttribute("list", this.datalist.getAttribute("id"));
    } else if (this.type === "delta") {
      this.datalist = document.createElement("datalist");
      this.datalist.setAttribute("id", figUniqueId());
      let option = document.createElement("option");
      option.setAttribute("value", this.default);
      this.datalist.append(option);
      this.inputContainer.append(this.datalist);
      this.input.setAttribute("list", this.datalist.getAttribute("id"));
    }
    if (this.datalist) {
      let defaultOption = this.datalist.querySelector(
        `option[value='${this.default}']`,
      );
      if (defaultOption) {
        defaultOption.setAttribute("default", "true");
      }
    }
    this.#syncValue();
  }

  connectedCallback() {
    if (this.#canReuseRenderedMarkup()) {
      this.#updateRenderedMarkup();
      this.#bindControlListeners();
      this.#syncValue();
      return;
    }
    this.#regenerateInnerHTML();
  }

  get value() {
    if (this.#value !== "") return this.#value;
    const rawValue = this.getAttribute("value");
    if (rawValue !== null) return String(this.#normalizeSliderValue(rawValue));
    return "";
  }

  set value(value) {
    const rawValue = value === null || value === undefined ? "" : String(value);
    const hasParsedBounds = this.min !== undefined || this.max !== undefined;
    const normalized = hasParsedBounds
      ? String(this.#normalizeSliderValue(rawValue))
      : rawValue;
    this.#value = normalized;
    if (this.getAttribute("value") !== normalized) {
      this.#isSyncingValueAttribute = true;
      this.setAttribute("value", normalized);
      this.#isSyncingValueAttribute = false;
    }
    if (this.input && this.input.value !== normalized) {
      this.input.value = normalized;
      this.input.setAttribute("aria-valuenow", normalized);
    }
    if (this.figInputNumber) {
      this.figInputNumber.setAttribute(
        "value",
        this.#showEmptyTextValue ? "" : normalized,
      );
    }
    if (this.input) this.#syncProperties();
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("input", this.#boundHandleInput);
      this.input.removeEventListener("change", this.#boundHandleChange);
      this.input.removeEventListener("keydown", this.#boundHandleKeyDown);
      this.input.removeEventListener("pointerdown", this.#boundRangePointerDown);
      this.input.removeEventListener("pointerup", this.#boundRangePointerUp);
    }
    if (this.figInputNumber) {
      this.figInputNumber.removeEventListener(
        "input",
        this.#boundHandleTextInput,
      );
      this.figInputNumber.removeEventListener(
        "change",
        this.#boundHandleTextChange,
      );
    }
  }

  #handleTextInput() {
    if (this.figInputNumber) {
      const rawTextValue = this.figInputNumber.value;
      this.#showEmptyTextValue =
        rawTextValue === null ||
        rawTextValue === undefined ||
        (typeof rawTextValue === "string" && rawTextValue.trim() === "");
      const normalized = this.#normalizeSliderValue(rawTextValue);
      this.value = normalized;
      this.input.value = String(normalized);
      this.#syncValue();
      this.dispatchEvent(
        new CustomEvent("input", { detail: this.value, bubbles: true }),
      );
    }
  }
  #calculateNormal(value) {
    const { min, max } = this.#getBounds();
    const range = max - min;
    if (range === 0) return 0;
    return (Number(value) - min) / range;
  }
  #toFiniteNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  #getBounds() {
    let min = this.#toFiniteNumber(this.min);
    let max = this.#toFiniteNumber(this.max);
    if (min === null) min = 0;
    if (max === null) max = min;
    if (min > max) {
      [min, max] = [max, min];
    }
    return { min, max };
  }
  #clampToBounds(value) {
    const { min, max } = this.#getBounds();
    return Math.min(max, Math.max(min, value));
  }
  #getFallbackValue() {
    if (this.type === "delta") {
      const deltaDefault = this.#toFiniteNumber(this.default);
      if (deltaDefault !== null) return this.#clampToBounds(deltaDefault);
      return this.#clampToBounds(0);
    }
    if (this.type === "range") {
      const { min, max } = this.#getBounds();
      return this.#clampToBounds(min + (max - min) / 2);
    }
    const { min } = this.#getBounds();
    return min;
  }
  #normalizeSliderValue(rawValue) {
    const parsed = this.#toFiniteNumber(rawValue);
    if (parsed === null) return this.#getFallbackValue();
    return this.#clampToBounds(parsed);
  }
  #syncProperties() {
    const complete = this.#calculateNormal(this.value);
    const defaultValue = this.#calculateNormal(this.default);
    const unchanged = complete === defaultValue ? 1 : 0;

    if (this.#lastSliderComplete !== complete) {
      this.style.setProperty("--slider-complete", complete);
      this.#lastSliderComplete = complete;
    }
    if (this.#lastSliderDefault !== defaultValue) {
      this.style.setProperty("--default", defaultValue);
      this.#lastSliderDefault = defaultValue;
    }
    if (this.#lastSliderUnchanged !== unchanged) {
      this.style.setProperty("--unchanged", unchanged);
      this.#lastSliderUnchanged = unchanged;
    }
  }
  #syncValue() {
    let val = this.input.value;
    this.value = val;
    this.#syncProperties();
    // Update ARIA value
    this.input.setAttribute("aria-valuenow", val);
    if (this.figInputNumber) {
      this.figInputNumber.setAttribute(
        "value",
        this.#showEmptyTextValue ? "" : val,
      );
    }
  }
  #syncInputA11yAttributes() {
    if (!this.input) return;
    if (this.text) {
      this.input.setAttribute("aria-hidden", "true");
      ["aria-label", "aria-labelledby", "aria-describedby", "aria-valuetext"].forEach(
        (name) => this.input.removeAttribute(name),
      );
      this.#syncTextInputA11yAttributes();
      return;
    }
    this.input.removeAttribute("aria-hidden");
    this.#a11yAttributes.forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.input.removeAttribute(name);
      } else {
        this.input.setAttribute(name, value);
      }
    });
  }
  #syncTextInputA11yAttributes() {
    if (!this.figInputNumber) return;
    ["aria-label", "aria-labelledby", "aria-describedby", "aria-invalid", "aria-required"].forEach(
      (name) => {
        const value = this.getAttribute(name);
        if (value === null) {
          this.figInputNumber.removeAttribute(name);
        } else {
          this.figInputNumber.setAttribute(name, value);
        }
      },
    );
  }

  #handleInput() {
    this.#showEmptyTextValue = false;
    this.#syncValue();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
  }

  #handleChange() {
    this.#isInteracting = false;
    this.#showEmptyTextValue = false;
    this.#syncValue();
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleKeyDown(event) {
    if (this.disabled || !event.shiftKey) return;
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    this.#showEmptyTextValue = false;

    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
    const current = this.#toFiniteNumber(this.input.value) ?? this.#getFallbackValue();
    const step = this.#toFiniteNumber(this.step) ?? 1;
    const nextValue = this.#normalizeSliderValue(current + step * 10 * direction);

    this.value = nextValue;
    this.input.value = String(nextValue);
    this.#syncValue();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleTextChange() {
    if (this.figInputNumber) {
      const rawTextValue = this.figInputNumber.value;
      this.#showEmptyTextValue =
        rawTextValue === null ||
        rawTextValue === undefined ||
        (typeof rawTextValue === "string" && rawTextValue.trim() === "");
      const normalized = this.#normalizeSliderValue(rawTextValue);
      this.value = normalized;
      this.input.value = String(normalized);
      this.#syncValue();
      this.dispatchEvent(
        new CustomEvent("change", { detail: this.value, bubbles: true }),
      );
    }
  }

  static get observedAttributes() {
    return [
      "value",
      "step",
      "min",
      "max",
      "type",
      "variant",
      "disabled",
      "color",
      "units",
      "transform",
      "text",
      "placeholder",
      "default",
      "precision",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
      "aria-valuetext",
    ];
  }

  focus() {
    if (this.text && this.figInputNumber) {
      this.figInputNumber.focus();
      return;
    }
    this.input.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value" && this.#isSyncingValueAttribute) return;
    if (this.input) {
      switch (name) {
        case "color":
          this.color = newValue;
          this.style.setProperty("--color", this.color);
          break;
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          if (this.figInputNumber) {
            this.figInputNumber.disabled = this.disabled;
            this.figInputNumber.setAttribute("disabled", this.disabled);
          }
          break;
        case "value":
          if (this.#isInteracting) break;
          this.#showEmptyTextValue =
            newValue === null ||
            (typeof newValue === "string" && newValue.trim() === "");
          this.value = this.#normalizeSliderValue(newValue);
          this.input.value = String(this.value);
          this.#syncValue();
          if (this.figInputNumber) {
            this.figInputNumber.setAttribute(
              "value",
              this.#showEmptyTextValue ? "" : this.value,
            );
          }
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          if (this.figInputNumber) {
            this.figInputNumber.setAttribute("transform", this.transform);
          }
          break;
        case "precision":
          this.precision = newValue !== null ? Number(newValue) : null;
          if (this.figInputNumber) {
            if (this.precision !== null) {
              this.figInputNumber.setAttribute("precision", this.precision);
            } else {
              this.figInputNumber.removeAttribute("precision");
            }
          }
          break;
        case "placeholder":
          this.placeholder = newValue !== null ? newValue : "##";
          if (this.figInputNumber) {
            this.figInputNumber.setAttribute("placeholder", this.placeholder);
          }
          break;
        case "default":
          this.default =
            newValue !== null ? newValue : this.type === "delta" ? 0 : this.min;
          this.#syncProperties();
          break;
        case "min":
        case "max":
        case "step":
        case "type":
        case "variant":
        case "units":
          this[name] = newValue;
          this.#regenerateInnerHTML();
          break;
        case "text":
          this.text = newValue !== "false";
          this.#regenerateInnerHTML();
          break;
        case "aria-label":
        case "aria-labelledby":
        case "aria-describedby":
        case "aria-invalid":
        case "aria-required":
        case "aria-valuetext":
          this.#syncInputA11yAttributes();
          break;
        default:
          this[name] = this.input[name] = newValue;
          this.#syncValue();
          break;
      }
    }
  }
}
customElements.define("fig-slider", FigSlider);

/**
 * A custom text input element.
 * @attr {string} type - Input type: "text" (default) or "number"
 * @attr {string} value - The current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {boolean} multiline - Whether to use a textarea instead of input
 * @attr {number} min - Minimum value (for number type)
 * @attr {number} max - Maximum value (for number type)
 * @attr {number} step - Step increment (for number type)
 * @attr {number} transform - A multiplier for displayed number values
 */
class FigInputText extends HTMLElement {
  #isInteracting = false;
  #passwordVisible = false;
  #boundMouseMove;
  #boundMouseUp;
  #boundWindowBlur;
  #boundMouseDown;
  #boundInputChange;
  #boundNativeInput;
  #boundFocusControl;
  #a11yAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
  ];

  constructor() {
    super();
    // Pre-bind the event handlers once
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = this.#handleMouseUp.bind(this);
    this.#boundWindowBlur = this.#handleMouseUp.bind(this);
    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundInputChange = (e) => {
      e.stopPropagation();
      this.#handleInputChange(e);
    };
    this.#boundNativeInput = () => {
      this.#syncSearchClearVisibility();
    };
    this.#boundFocusControl = this.focus.bind(this);
  }

  connectedCallback() {
    this.multiline = this.hasAttribute("multiline") || false;
    this.value = this.getAttribute("value") || "";
    this.type = this.getAttribute("type") || "text";
    this.placeholder = this.getAttribute("placeholder") || "";
    this.name = this.getAttribute("name") || null;
    this.readonly =
      this.hasAttribute("readonly") &&
      this.getAttribute("readonly") !== "false";

    if (this.type === "number") {
      if (this.getAttribute("step")) {
        this.step = Number(this.getAttribute("step"));
      }
      if (this.getAttribute("min")) {
        this.min = Number(this.getAttribute("min"));
      }
      if (this.getAttribute("max")) {
        this.max = Number(this.getAttribute("max"));
      }
      this.transform = Number(this.getAttribute("transform") || 1);
      if (this.getAttribute("value")) {
        this.value = Number(this.value);
      }
    }

    this.input = this.#ensureInputControl();
    this.input.readOnly = this.readonly;
    this.#syncInputA11yAttributes();
    this.#syncSearchPrefix();
    this.#syncSearchClear();
    this.#syncSearchClearVisibility();
    this.#syncPasswordToggle();

    if (this.type === "number") {
      if (this.getAttribute("min")) {
        this.input.setAttribute("min", this.#transformNumber(this.min));
      }
      if (this.getAttribute("max")) {
        this.input.setAttribute("max", this.#transformNumber(this.max));
      }
      if (this.getAttribute("step")) {
        this.input.setAttribute("step", this.#transformNumber(this.step));
      }
      this.addEventListener("pointerdown", this.#boundMouseDown);
    }
    this.input.removeEventListener("change", this.#boundInputChange);
    this.input.addEventListener("change", this.#boundInputChange);
    this.input.removeEventListener("input", this.#boundNativeInput);
    this.input.addEventListener("input", this.#boundNativeInput);
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("change", this.#boundInputChange);
      this.input.removeEventListener("input", this.#boundNativeInput);
    }
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
  }

  focus() {
    this.input.focus();
  }
  #ensureInputControl() {
    const wantsTextarea = this.multiline;
    const existing = this.querySelector("input,textarea");
    if (existing) {
      const matches = wantsTextarea
        ? existing.tagName === "TEXTAREA"
        : existing.tagName === "INPUT";
      if (matches) return existing;
    }

    let html = `<input 
      type="${this.type}" 
      ${this.name ? `name="${this.name}"` : ""}
      placeholder="${this.placeholder}"
      value="${
        this.type === "number" ? this.#transformNumber(this.value) : this.value
      }" />`;
    if (wantsTextarea) {
      html = `<textarea  
      placeholder="${this.placeholder}">${this.value}</textarea>`;
    }

    const append = this.querySelector("[slot=append]");
    const prepend = this.querySelector("[slot=prepend]");

    this.innerHTML = html;

    if (prepend) {
      prepend.removeEventListener("click", this.#boundFocusControl);
      prepend.addEventListener("click", this.#boundFocusControl);
      this.prepend(prepend);
    }
    if (append) {
      append.removeEventListener("click", this.#boundFocusControl);
      append.addEventListener("click", this.#boundFocusControl);
      this.append(append);
    }

    return this.querySelector("input,textarea");
  }
  #syncInputA11yAttributes() {
    if (!this.input) return;
    this.#a11yAttributes.forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.input.removeAttribute(name);
      } else {
        this.input.setAttribute(name, value);
      }
    });
  }
  #syncSearchPrefix() {
    const generated = this.querySelector(
      '[slot="prepend"][data-generated="search-prefix"]',
    );
    if (this.type !== "search") {
      generated?.remove();
      return;
    }
    const prepend = this.querySelector('[slot="prepend"]');
    if (prepend && prepend !== generated) return;
    if (generated) {
      const icon = generated.querySelector("fig-icon");
      if (icon && icon.getAttribute("name") !== "search") {
        icon.setAttribute("name", "search");
      }
      return;
    }

    const icon = createFigIcon("search");
    icon.setAttribute("slot", "prepend");
    icon.setAttribute("data-generated", "search-prefix");
    icon.setAttribute("color", "var(--figma-color-icon)");
    icon.addEventListener("click", this.#boundFocusControl);
    this.prepend(icon);
  }
  #syncSearchClear() {
    const generated = this.querySelector(
      '[slot="append"][data-generated="search-clear"]',
    );
    if (this.type !== "search") {
      generated?.remove();
      return;
    }
    const append = this.querySelector('[slot="append"]');
    if (append && append !== generated) return;
    if (generated) {
      const icon = generated.querySelector("fig-icon");
      if (icon && icon.getAttribute("name") !== "close") {
        icon.setAttribute("name", "close");
      }
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.setAttribute("slot", "append");
    wrapper.setAttribute("data-generated", "search-clear");

    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Clear search");

    const button = document.createElement("fig-button");
    button.setAttribute("variant", "ghost");
    button.setAttribute("icon", "");
    button.setAttribute("aria-label", "Clear search");

    const icon = createFigIcon("close", { size: "small" });
    icon.setAttribute("color", "var(--figma-color-icon-secondary)");
    button.append(icon);
    tooltip.append(button);
    wrapper.append(tooltip);
    this.append(wrapper);

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.input || this.input.value === "") {
        this.focus();
        return;
      }
      this.value = "";
      this.input.value = "";
      this.dispatchEvent(new CustomEvent("input", { detail: "", bubbles: true }));
      this.dispatchEvent(new CustomEvent("change", { detail: "", bubbles: true }));
      this.#syncSearchClearVisibility();
      this.focus();
    });
  }
  #syncSearchClearVisibility() {
    if (this.type !== "search") {
      this.removeAttribute("data-search-has-value");
      return;
    }
    this.toggleAttribute("data-search-has-value", !!this.input?.value);
  }
  #syncPasswordToggle() {
    const generated = this.querySelector(
      '[slot="append"][data-generated="password-toggle"]',
    );
    if (this.type !== "password") {
      generated?.remove();
      this.#passwordVisible = false;
      return;
    }
    const append = this.querySelector('[slot="append"]');
    if (append && append !== generated) return;
    if (generated) {
      this.#updatePasswordToggle(generated);
      return;
    }

    const wrapper = document.createElement("span");
    wrapper.setAttribute("slot", "append");
    wrapper.setAttribute("data-generated", "password-toggle");

    const tooltip = document.createElement("fig-tooltip");
    const button = document.createElement("fig-button");
    button.setAttribute("variant", "ghost");
    button.setAttribute("icon", "");

    const icon = createFigIcon("visible", { size: "small" });
    icon.setAttribute("color", "var(--figma-color-icon-secondary)");
    button.append(icon);
    tooltip.append(button);
    wrapper.append(tooltip);
    this.append(wrapper);
    this.#updatePasswordToggle(wrapper);

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.#passwordVisible = !this.#passwordVisible;
      if (this.input) {
        this.input.type = this.#passwordVisible ? "text" : "password";
      }
      this.#updatePasswordToggle(wrapper);
      this.focus();
    });
  }
  #updatePasswordToggle(wrapper) {
    const tooltip = wrapper.querySelector("fig-tooltip");
    const button = wrapper.querySelector("fig-button");
    const icon = wrapper.querySelector("fig-icon");
    const label = this.#passwordVisible ? "Hide password" : "Show password";
    tooltip?.setAttribute("text", label);
    button?.setAttribute("aria-label", label);
    icon?.setAttribute("name", this.#passwordVisible ? "visible" : "hidden");
  }
  #transformNumber(value) {
    if (value === "") return "";
    let transformed = Number(value) * (this.transform || 1);
    transformed = this.#formatNumber(transformed);
    return transformed;
  }
  #handleInputChange(e) {
    e.stopPropagation();
    let value = e.target.value;
    let valueTransformed = value;
    if (this.type === "number") {
      value = value / (this.transform || 1);
      value = this.#sanitizeInput(value, false);
      valueTransformed = value * (this.transform || 1);
    }
    this.value = value;
    this.input.value = valueTransformed;
    this.#syncSearchClearVisibility();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }
  #handleMouseMove(e) {
    if (this.type !== "number") return;
    if (e.buttons === 0) {
      this.#handleMouseUp();
      return;
    }
    let step = (this.step || 1) * e.movementX;
    let value = Number(this.input.value);
    value = value / (this.transform || 1) + step;
    value = this.#sanitizeInput(value, false);
    let valueTransformed = value * (this.transform || 1);
    value = this.#formatNumber(value);
    valueTransformed = this.#formatNumber(valueTransformed);
    this.value = value;
    this.input.value = valueTransformed;
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }
  #handleMouseDown(e) {
    if (this.type !== "number") return;
    if (e.altKey || e.target.closest("[slot]")) {
      this.#isInteracting = true;
      this.input.style.cursor =
        this.style.cursor =
        document.body.style.cursor =
          "ew-resize";
      this.style.userSelect = "none";
      window.addEventListener("pointermove", this.#boundMouseMove);
      window.addEventListener("pointerup", this.#boundMouseUp);
      window.addEventListener("blur", this.#boundWindowBlur);
    }
  }
  #handleMouseUp(e) {
    if (this.type !== "number") return;
    this.#isInteracting = false;
    this.input.style.cursor =
      this.style.cursor =
      document.body.style.cursor =
        "";
    this.style.userSelect = "all";
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
  }
  #sanitizeInput(value, transform = true) {
    let sanitized = value;
    if (this.type === "number") {
      sanitized = Number(sanitized);
      if (typeof this.min === "number") {
        sanitized = Math.max(
          transform ? this.#transformNumber(this.min) : this.min,
          sanitized,
        );
      }
      if (typeof this.max === "number") {
        sanitized = Math.min(
          transform ? this.#transformNumber(this.max) : this.max,
          sanitized,
        );
      }

      sanitized = this.#formatNumber(sanitized);
    }
    return sanitized;
  }
  #formatNumber(num, precision = 2) {
    // Check if the number has any decimal places after rounding
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(precision);
  }

  /*
  get value() {
    return this.value;
  }

  set value(val) {
    this.value = val;
    this.setAttribute("value", val);
  }*/

  static get observedAttributes() {
    return [
      "value",
      "placeholder",
      "label",
      "disabled",
      "readonly",
      "type",
      "step",
      "min",
      "max",
      "transform",
      "name",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          break;
        case "readonly":
          this.readonly = newValue !== null && newValue !== "false";
          this.input.readOnly = this.readonly;
          break;
        case "transform":
          if (this.type === "number") {
            this.transform = Number(newValue) || 1;
            this.input.value = this.#transformNumber(this.value);
          }
          break;
        case "value":
          if (this.#isInteracting) break;
          let value = newValue;
          if (this.type === "number") {
            value = this.#sanitizeInput(value, false);
            this.value = value;
            this.input.value = this.#transformNumber(value);
          } else {
            this.value = value;
            this.input.value = value;
          }
          this.#syncSearchClearVisibility();
          break;
        case "min":
        case "max":
        case "step":
          this[name] = this.input[name] = Number(newValue);
          if (this.input) {
            this.input.setAttribute(name, newValue);
          }
          break;
        case "name":
          this[name] = this.input[name] = newValue;
          this.input.setAttribute("name", newValue);
          break;
        case "placeholder":
          this.placeholder = newValue ?? "";
          this.input.placeholder = this.placeholder;
          break;
        case "type":
          this.type = newValue || "text";
          this.input.type = this.type;
          this.#syncSearchPrefix();
          this.#syncSearchClear();
          this.#syncSearchClearVisibility();
          this.#syncPasswordToggle();
          break;
        case "aria-label":
        case "aria-labelledby":
        case "aria-describedby":
        case "aria-invalid":
        case "aria-required":
          this.#syncInputA11yAttributes();
          break;
        default:
          this[name] = this.input[name] = newValue;
          break;
      }
    }
  }
}
customElements.define("fig-input-text", FigInputText);

/**
 * A custom numeric input element that uses type="text" with inputmode="decimal".
 * Supports units display and all standard number input attributes.
 * @attr {string} value - The current numeric value
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {number} min - Minimum value
 * @attr {number} max - Maximum value
 * @attr {number} step - Step increment
 * @attr {number} transform - A multiplier for displayed number values
 * @attr {string} units - Unit string to append/prepend to displayed value (e.g., "%", "°", "$")
 * @attr {string} units-disallow - Comma-separated units to disallow (defaults to "px")
 * @attr {string} unit-position - Position of unit: "suffix" (default) or "prefix"
 * @attr {string} name - Form field name
 */
class FigInputNumber extends HTMLElement {
  #boundMouseMove;
  #boundMouseUp;
  #boundWindowBlur;
  #boundMouseDown;
  #boundInputChange;
  #boundInput;
  #boundFocus;
  #boundBlur;
  #boundKeyDown;
  #boundFocusControl;
  #units;
  #rawUnits;
  #unitsDisallow;
  #unitPosition;
  #precision;
  #isInteracting = false;
  #stepperEl = null;
  #a11yAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
  ];
  static #DEFAULT_UNITS_DISALLOW = "px";

  #parseUnitsDisallowList(value) {
    return (value || "")
      .split(",")
      .map((unit) => unit.trim().toLowerCase())
      .filter(Boolean);
  }

  #resolveUnits(rawUnits) {
    const unit = (rawUnits || "").trim();
    if (!unit) return "";
    const disallowList = this.#unitsDisallow ?? [];
    return disallowList.includes(unit.toLowerCase()) ? "" : unit;
  }

  #setUnitsFromAttributes() {
    this.#units = this.#resolveUnits(this.#rawUnits);
  }

  #syncSteppers(hasSteppers) {
    if (hasSteppers && !this.#stepperEl) {
      this.#stepperEl = document.createElement("span");
      this.#stepperEl.className = "fig-steppers";
      this.#stepperEl.innerHTML =
        `<button class="fig-stepper-up" tabindex="-1" aria-label="Increase"></button>` +
        `<button class="fig-stepper-down" tabindex="-1" aria-label="Decrease"></button>`;
      this.#stepperEl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.closest("button");
        if (!btn || this.disabled || btn.disabled) return;
        const dir = btn.classList.contains("fig-stepper-up") ? 1 : -1;
        this.#stepValue(dir);
        this.input.focus();
      });
      this.append(this.#stepperEl);
    } else if (!hasSteppers && this.#stepperEl) {
      this.#stepperEl.remove();
      this.#stepperEl = null;
    }
    this.#syncStepperState();
  }

  #syncStepperState() {
    if (!this.#stepperEl) return;
    const up = this.#stepperEl.querySelector(".fig-stepper-up");
    const down = this.#stepperEl.querySelector(".fig-stepper-down");
    if (!up || !down) return;

    const numericValue = this.input
      ? this.#getNumericValue(this.input.value)
      : this.value;
    const current =
      numericValue !== "" && numericValue !== null && numericValue !== undefined
        ? Number(numericValue) / (this.transform || 1)
        : Number(this.value);
    const hasCurrent = Number.isFinite(current);
    const disabled = Boolean(this.disabled);
    const atMin =
      hasCurrent && typeof this.min === "number" && current <= this.min;
    const atMax =
      hasCurrent && typeof this.max === "number" && current >= this.max;

    up.disabled = disabled || atMax;
    down.disabled = disabled || atMin;
  }

  #stepValue(direction) {
    const step = this.step || 1;
    let numericValue = this.#getNumericValue(this.input.value);
    let value =
      (numericValue !== "" ? Number(numericValue) / (this.transform || 1) : 0) +
      step * direction;
    value = this.#sanitizeInput(value, false);
    this.value = value;
    this.input.value = this.#formatWithUnit(this.value);
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  constructor() {
    super();
    // Pre-bind the event handlers once
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = this.#handleMouseUp.bind(this);
    this.#boundWindowBlur = this.#handleMouseUp.bind(this);
    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundInputChange = (e) => {
      e.stopPropagation();
      this.#handleInputChange(e);
    };
    this.#boundInput = (e) => {
      e.stopPropagation();
      this.#handleInput(e);
    };
    this.#boundFocus = (e) => {
      this.#handleFocus(e);
    };
    this.#boundBlur = (e) => {
      this.#handleBlur(e);
    };
    this.#boundKeyDown = (e) => {
      this.#handleKeyDown(e);
    };
    this.#boundFocusControl = this.focus.bind(this);
  }

  connectedCallback() {
    const valueAttr = this.getAttribute("value");
    this.value =
      valueAttr !== null && valueAttr !== "" ? Number(valueAttr) : "";
    this.placeholder = this.getAttribute("placeholder") || "";
    this.name = this.getAttribute("name") || null;
    this.#rawUnits = this.getAttribute("units") || "";
    const unitsDisallowAttr = this.getAttribute("units-disallow");
    this.#unitsDisallow = this.#parseUnitsDisallowList(
      unitsDisallowAttr === null
        ? FigInputNumber.#DEFAULT_UNITS_DISALLOW
        : unitsDisallowAttr,
    );
    this.#setUnitsFromAttributes();
    this.#unitPosition = this.getAttribute("unit-position") || "suffix";
    this.#precision = this.hasAttribute("precision")
      ? Number(this.getAttribute("precision"))
      : 2;

    if (this.getAttribute("step")) {
      this.step = Number(this.getAttribute("step"));
    }
    if (this.getAttribute("min")) {
      this.min = Number(this.getAttribute("min"));
    }
    if (this.getAttribute("max")) {
      this.max = Number(this.getAttribute("max"));
    }
    this.transform = Number(this.getAttribute("transform") || 1);

    const hasSteppers =
      this.hasAttribute("steppers") &&
      this.getAttribute("steppers") !== "false";

    this.input = this.#ensureInputControl();
    this.#syncInputA11yAttributes();

    if (this.getAttribute("min")) {
      this.min = Number(this.getAttribute("min"));
    }
    if (this.getAttribute("max")) {
      this.max = Number(this.getAttribute("max"));
    }
    if (this.getAttribute("step")) {
      this.step = Number(this.getAttribute("step"));
    }

    this.#syncSteppers(hasSteppers);

    // Set disabled state if present
    if (this.hasAttribute("disabled")) {
      const disabledAttr = this.getAttribute("disabled");
      this.disabled = this.input.disabled = disabledAttr !== "false";
    }
    this.#syncStepperState();
    this.#syncSpinbuttonAria();

    this.addEventListener("pointerdown", this.#boundMouseDown);
    this.input.removeEventListener("change", this.#boundInputChange);
    this.input.addEventListener("change", this.#boundInputChange);
    this.input.removeEventListener("input", this.#boundInput);
    this.input.addEventListener("input", this.#boundInput);
    this.input.removeEventListener("focus", this.#boundFocus);
    this.input.addEventListener("focus", this.#boundFocus);
    this.input.removeEventListener("blur", this.#boundBlur);
    this.input.addEventListener("blur", this.#boundBlur);
    this.input.removeEventListener("keydown", this.#boundKeyDown);
    this.input.addEventListener("keydown", this.#boundKeyDown);
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("change", this.#boundInputChange);
      this.input.removeEventListener("input", this.#boundInput);
      this.input.removeEventListener("focus", this.#boundFocus);
      this.input.removeEventListener("blur", this.#boundBlur);
      this.input.removeEventListener("keydown", this.#boundKeyDown);
    }
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
  }

  focus() {
    this.input.focus();
  }

  #ensureInputControl() {
    const existing = this.querySelector("input");
    if (existing) return existing;

    const html = `<input 
      type="text"
      inputmode="decimal"
      ${this.name ? `name="${this.name}"` : ""}
      placeholder="${this.placeholder}"
      value="${this.#formatWithUnit(this.value)}" />`;

    const append = this.querySelector("[slot=append]");
    const prepend = this.querySelector("[slot=prepend]");

    this.innerHTML = html;

    if (prepend) {
      prepend.removeEventListener("click", this.#boundFocusControl);
      prepend.addEventListener("click", this.#boundFocusControl);
      this.prepend(prepend);
    }
    if (append) {
      append.removeEventListener("click", this.#boundFocusControl);
      append.addEventListener("click", this.#boundFocusControl);
      this.append(append);
    }

    return this.querySelector("input");
  }

  #syncInputA11yAttributes() {
    if (!this.input) return;
    this.#a11yAttributes.forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.input.removeAttribute(name);
      } else {
        this.input.setAttribute(name, value);
      }
    });
  }

  #syncSpinbuttonAria() {
    if (!this.input) return;
    this.input.setAttribute("role", "spinbutton");
    if (typeof this.min === "number") {
      this.input.setAttribute("aria-valuemin", String(this.min));
    } else {
      this.input.removeAttribute("aria-valuemin");
    }
    if (typeof this.max === "number") {
      this.input.setAttribute("aria-valuemax", String(this.max));
    } else {
      this.input.removeAttribute("aria-valuemax");
    }
    const value = this.value === "" ? null : Number(this.value);
    if (Number.isFinite(value)) {
      this.input.setAttribute("aria-valuenow", String(value));
      this.input.setAttribute("aria-valuetext", this.#formatWithUnit(this.value));
    } else {
      this.input.removeAttribute("aria-valuenow");
      this.input.removeAttribute("aria-valuetext");
    }
  }

  #getNumericValue(str) {
    if (!str) return "";
    if (!this.#units) {
      // No units, just extract numeric value
      let value = str.replace(/[^\d.-]/g, "");
      // Prevent multiple decimal points
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }
      return value;
    }
    let value = str.replace(this.#units, "").trim();
    value = value.replace(/[^\d.-]/g, "");
    // Prevent multiple decimal points
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }
    return value;
  }

  #formatWithUnit(numericValue) {
    if (
      numericValue === "" ||
      numericValue === null ||
      numericValue === undefined
    )
      return "";
    // numericValue is the internal (non-transformed) value
    // For display, we apply transform and format
    let displayValue = Number(numericValue) * (this.transform || 1);
    if (isNaN(displayValue)) return "";
    displayValue = this.#formatNumber(displayValue);
    if (!this.#units) return displayValue.toString();
    if (this.#unitPosition === "prefix") {
      return this.#units + displayValue;
    } else {
      return displayValue + this.#units;
    }
  }

  #transformNumber(value) {
    if (value === "" || value === null || value === undefined) return "";
    let transformed = Number(value) * (this.transform || 1);
    transformed = this.#formatNumber(transformed);
    return transformed.toString();
  }

  #handleFocus(e) {
    this.#isInteracting = true;
    setTimeout(() => {
      const value = e.target.value;
      if (value && this.#units) {
        if (this.#unitPosition === "prefix") {
          e.target.setSelectionRange(this.#units.length, value.length);
        } else {
          const unitPos = value.indexOf(this.#units);
          if (unitPos > -1) {
            e.target.setSelectionRange(0, unitPos);
          }
        }
      }
    }, 0);
  }

  #handleBlur(e) {
    this.#isInteracting = false;
    let numericValue = this.#getNumericValue(e.target.value);
    if (numericValue !== "") {
      let val = Number(numericValue) / (this.transform || 1);
      val = this.#sanitizeInput(val, false);
      this.value = val;
      e.target.value = this.#formatWithUnit(this.value);
    } else {
      this.value = "";
      e.target.value = "";
    }
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleKeyDown(e) {
    if (this.disabled) return;

    // Only handle arrow up/down
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

    e.preventDefault();

    const step = this.step || 1;
    // Shift multiplies step by 10
    const multiplier = e.shiftKey ? 10 : 1;
    const delta = step * multiplier * (e.key === "ArrowUp" ? 1 : -1);

    let numericValue = this.#getNumericValue(this.input.value);
    let value =
      (numericValue !== "" ? Number(numericValue) / (this.transform || 1) : 0) +
      delta;
    value = this.#sanitizeInput(value, false);
    this.value = value;
    this.input.value = this.#formatWithUnit(this.value);
    this.#syncStepperState();
    this.#syncSpinbuttonAria();

    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleInput(e) {
    let numericValue = this.#getNumericValue(e.target.value);
    if (numericValue !== "") {
      this.value = Number(numericValue) / (this.transform || 1);
    } else {
      this.value = "";
    }
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
  }

  #handleInputChange(e) {
    e.stopPropagation();
    let numericValue = this.#getNumericValue(e.target.value);
    if (numericValue !== "") {
      let val = Number(numericValue) / (this.transform || 1);
      val = this.#sanitizeInput(val, false);
      this.value = val;
      e.target.value = this.#formatWithUnit(this.value);
    } else {
      this.value = "";
      e.target.value = "";
    }
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleMouseMove(e) {
    if (this.disabled) return;
    if (e.buttons === 0) {
      this.#handleMouseUp();
      return;
    }
    let step = (this.step || 1) * e.movementX;
    let numericValue = this.#getNumericValue(this.input.value);
    let value = Number(numericValue) / (this.transform || 1) + step;
    value = this.#sanitizeInput(value, false);
    this.value = value;
    this.input.value = this.#formatWithUnit(this.value);
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleMouseDown(e) {
    if (this.disabled) return;
    if (e.altKey || e.target.closest("[slot]")) {
      this.#isInteracting = true;
      this.input.style.cursor =
        this.style.cursor =
        document.body.style.cursor =
          "ew-resize";
      this.style.userSelect = "none";
      window.addEventListener("pointermove", this.#boundMouseMove);
      window.addEventListener("pointerup", this.#boundMouseUp);
      window.addEventListener("blur", this.#boundWindowBlur);
    }
  }

  #handleMouseUp(e) {
    this.#isInteracting = false;
    this.input.style.cursor =
      this.style.cursor =
      document.body.style.cursor =
        "";
    this.style.userSelect = "all";
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
  }

  #sanitizeInput(value, transform = true) {
    let sanitized = Number(value);
    if (isNaN(sanitized)) return "";
    if (typeof this.min === "number") {
      sanitized = Math.max(this.min, sanitized);
    }
    if (typeof this.max === "number") {
      sanitized = Math.min(this.max, sanitized);
    }
    sanitized = this.#formatNumber(sanitized);
    return sanitized;
  }

  #formatNumber(num) {
    const precision = this.#precision ?? 2;
    const factor = Math.pow(10, precision);
    const rounded = Math.round(num * factor) / factor;
    // Only show decimals if needed and up to precision
    return Number.isInteger(rounded)
      ? rounded
      : parseFloat(rounded.toFixed(precision));
  }

  static get observedAttributes() {
    return [
      "value",
      "placeholder",
      "disabled",
      "step",
      "min",
      "max",
      "transform",
      "name",
      "units",
      "units-disallow",
      "unit-position",
      "steppers",
      "precision",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          this.#syncStepperState();
          break;
        case "units":
          this.#rawUnits = newValue || "";
          this.#setUnitsFromAttributes();
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncSpinbuttonAria();
          break;
        case "units-disallow":
          this.#unitsDisallow = this.#parseUnitsDisallowList(
            newValue === null
              ? FigInputNumber.#DEFAULT_UNITS_DISALLOW
              : newValue,
          );
          this.#setUnitsFromAttributes();
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncSpinbuttonAria();
          break;
        case "unit-position":
          this.#unitPosition = newValue || "suffix";
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncSpinbuttonAria();
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncSpinbuttonAria();
          break;
        case "value":
          if (this.#isInteracting) break;
          let value =
            newValue !== null && newValue !== "" ? Number(newValue) : "";
          if (value !== "") {
            value = this.#sanitizeInput(value, false);
          }
          this.value = value;
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncStepperState();
          this.#syncSpinbuttonAria();
          break;
        case "min":
        case "max":
        case "step":
          if (newValue === null || newValue === "") {
            this[name] = undefined;
            this.#syncStepperState();
            this.#syncSpinbuttonAria();
            break;
          }
          this[name] = Number(newValue);
          this.#syncStepperState();
          this.#syncSpinbuttonAria();
          break;
        case "steppers": {
          const hasSteppers = newValue !== null && newValue !== "false";
          this.#syncSteppers(hasSteppers);
          break;
        }
        case "precision":
          this.#precision = newValue !== null ? Number(newValue) : 2;
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncSpinbuttonAria();
          break;
        case "name":
          this[name] = this.input[name] = newValue;
          this.input.setAttribute("name", newValue);
          break;
        case "placeholder":
          this.placeholder = newValue ?? "";
          this.input.placeholder = this.placeholder;
          break;
        case "aria-label":
        case "aria-labelledby":
        case "aria-describedby":
        case "aria-invalid":
        case "aria-required":
          this.#syncInputA11yAttributes();
          break;
        default:
          this[name] = this.input[name] = newValue;
          break;
      }
    }
  }
}
customElements.define("fig-input-number", FigInputNumber);

/* Avatar */
class FigAvatar extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.src = this.getAttribute("src");
    this.name = this.getAttribute("name");
    this.initials = this.getInitials(this.name);
    this.setAttribute("initials", this.initials);
    this.setSrc(this.src);
    this.img = this.querySelector("img");
  }
  setSrc(src) {
    this.src = src;
    if (src) {
      this.innerHTML = `<img src="${this.src}" ${
        this.name ? `alt="${this.name}"` : ""
      } />`;
    }
  }
  getInitials(name) {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
      : "";
  }
  static get observedAttributes() {
    return ["src", "href", "name"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    this[name] = newValue;
    if (name === "name") {
      this.img?.setAttribute("alt", newValue);
      this.name = newValue;
      this.initials = this.getInitials(this.name);
      this.setAttribute("initials", this.initials);
    } else if (name === "src") {
      this.src = newValue;
      this.setSrc(this.src);
    }
  }
}
customElements.define("fig-avatar", FigAvatar);

/* Form Field */
class FigField extends HTMLElement {
  #toggleable = false;
  #chevron = null;
  #boundToggle = null;
  #boundFocus = null;
  #boundLabelEnter = null;
  #boundLabelLeave = null;
  #childrenObserver = null;

  constructor() {
    super();
    this.#boundToggle = this.#toggle.bind(this);
    this.#boundFocus = this.focus.bind(this);
    this.#boundLabelEnter = this.#onLabelEnter.bind(this);
    this.#boundLabelLeave = this.#onLabelLeave.bind(this);
  }

  static get observedAttributes() {
    return ["label"];
  }

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#setup();
      this.#observeChildren();
    });
  }

  #observeChildren() {
    if (this.#childrenObserver || typeof MutationObserver === "undefined") return;
    this.#childrenObserver = new MutationObserver(() => {
      this.#setup();
    });
    this.#childrenObserver.observe(this, { childList: true });
  }

  #setup() {
    const previousLabel = this.label;
    const previousChevron = this.#chevron;
    previousLabel?.removeEventListener("click", this.#boundToggle);
    previousLabel?.removeEventListener("click", this.#boundFocus);
    previousLabel?.removeEventListener("pointerenter", this.#boundLabelEnter);
    previousLabel?.removeEventListener("pointerleave", this.#boundLabelLeave);
    previousChevron?.removeEventListener("click", this.#boundToggle);

    this.label = this.querySelector(":scope>label");
    this.input = Array.from(this.childNodes).find((node) =>
      node.nodeType === Node.ELEMENT_NODE &&
      node.nodeName.toLowerCase().startsWith("fig-") &&
      !(node instanceof Element && node.classList.contains("fig-field-chevron")),
    );

    this.#toggleable = !!(this.input && "open" in this.input);

    if (this.#toggleable && this.label) {
      if (!this.#chevron || !this.#chevron.isConnected) {
        this.#chevron = createFigIcon("chevron", {
          size: "small",
          className: "fig-field-chevron",
        });
        this.insertBefore(this.#chevron, this.label);
      }

      this.#chevron.addEventListener("click", this.#boundToggle);
      this.label.addEventListener("click", this.#boundToggle);
    } else if (this.input && this.label) {
      this.label.addEventListener("click", this.#boundFocus);
    }

    if (this.input && this.label && !this.#toggleable) {
      this.#syncLabelAssociation();
    }

    if (this.label) {
      this.label.removeEventListener("pointerenter", this.#boundLabelEnter);
      this.label.addEventListener("pointerenter", this.#boundLabelEnter);
      this.label.removeEventListener("pointerleave", this.#boundLabelLeave);
      this.label.addEventListener("pointerleave", this.#boundLabelLeave);
    }
  }

  disconnectedCallback() {
    this.#childrenObserver?.disconnect();
    this.#childrenObserver = null;
    if (this.label) FigTooltip.hide(this.label);
    if (this.label && this.#boundToggle) {
      this.label.removeEventListener("click", this.#boundToggle);
    }
    if (this.label && this.#boundFocus) {
      this.label.removeEventListener("click", this.#boundFocus);
    }
    if (this.label && this.#boundLabelEnter) {
      this.label.removeEventListener("pointerenter", this.#boundLabelEnter);
    }
    if (this.label && this.#boundLabelLeave) {
      this.label.removeEventListener("pointerleave", this.#boundLabelLeave);
    }
    if (this.#chevron && this.#boundToggle) {
      this.#chevron.removeEventListener("click", this.#boundToggle);
    }
  }

  #toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.input && typeof this.input.open !== "undefined") {
      this.input.open = !this.input.open;
    }
  }

  #onLabelEnter() {
    if (!this.label || this.label.scrollWidth <= this.label.clientWidth) return;
    FigTooltip.show(this.label, this.label.textContent.trim());
  }

  #onLabelLeave() {
    if (this.label) FigTooltip.hide(this.label);
  }

  #syncLabelAssociation() {
    if (!this.input || !this.label) return;
    const labelId = this.label.getAttribute("id") || figUniqueId();
    this.label.setAttribute("id", labelId);
    const nativeInputs = this.input.querySelectorAll("input, select, textarea");
    if (nativeInputs.length === 1) {
      const nativeInput = nativeInputs[0];
      const inputId = nativeInput.getAttribute("id") || figUniqueId();
      nativeInput.setAttribute("id", inputId);
      this.label.setAttribute("for", inputId);
      if (this.input.getAttribute("aria-labelledby") === labelId) {
        this.input.removeAttribute("aria-labelledby");
      }
      if (!nativeInput.hasAttribute("aria-labelledby")) {
        nativeInput.setAttribute("aria-labelledby", labelId);
      }
      return;
    }
    this.label.removeAttribute("for");
    if (!this.input.hasAttribute("aria-label") && !this.input.hasAttribute("aria-labelledby")) {
      this.input.setAttribute("aria-labelledby", labelId);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (this.label) {
          this.label.textContent = newValue;
          this.#syncLabelAssociation();
        }
        break;
    }
  }

  focus() {
    if (!this.input) return;
    if (this.input.contains(document.activeElement)) return;
    const nativeInputs = this.input.querySelectorAll("input, select, textarea");
    if (nativeInputs.length === 1) {
      nativeInputs[0].focus();
      nativeInputs[0].click();
    } else {
      this.input.focus();
      if (nativeInputs.length === 0) {
        this.input.click();
      }
    }
  }
}
customElements.define("fig-field", FigField);

/* Color swatch */
class FigInputColor extends HTMLElement {
  rgba;
  hex;
  #alphaPercent = 100;
  #swatch;
  #fillPicker;
  #textInput;
  #alphaInput;
  #suppressNativeColorClick = false;
  #pendingFillPickerPointerOpen = false;
  #nativeColorClickTimer = null;
  #boundSwatchPointerDown = this.#handleSwatchPointerDown.bind(this);
  #boundSwatchClick = this.#handleSwatchClick.bind(this);
  #boundSwatchKeyDown = this.#handleSwatchKeyDown.bind(this);
  #boundHandleInput = this.#handleInput.bind(this);
  #boundTextInput = this.#handleTextInput.bind(this);
  #boundChange = this.#handleChange.bind(this);
  #boundAlphaInput = this.#handleAlphaInput.bind(this);
  #boundFillPickerInput = this.#handleFillPickerInput.bind(this);
  constructor() {
    super();
  }

  get alpha() {
    return this.getAttribute("alpha");
  }
  set alpha(value) {
    if (value === null || value === undefined || value === false) {
      this.removeAttribute("alpha");
    } else {
      this.setAttribute("alpha", String(value));
    }
  }

  #fillPickerAttrs() {
    const attrs = {};
    const experimental = this.getAttribute("experimental");
    if (experimental) attrs["experimental"] = experimental;
    for (const { name, value } of this.attributes) {
      if (name.startsWith("picker-") && name !== "picker-anchor") {
        attrs[name.slice(7)] = value;
      }
    }
    if (!attrs["dialog-position"]) attrs["dialog-position"] = "left";
    return attrs;
  }

  #buildFillPickerAttrs() {
    const attrs = this.#fillPickerAttrs();
    return Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
  }

  connectedCallback() {
    if (this.#canReuseUI()) {
      this.#refreshUI();
      return;
    }
    this.#buildUI();
  }

  disconnectedCallback() {
    this.#teardownControlListeners();
  }

  #canReuseUI() {
    const showText = this.getAttribute("text") !== "false";
    return showText
      ? !!this.querySelector(":scope > .input-combo")
      : !!this.querySelector(":scope > fig-chit");
  }

  #refreshUI() {
    this.#setValues(this.getAttribute("value"));
    this.#swatch = this.querySelector("fig-chit");
    this.#fillPicker = this.querySelector("fig-fill-picker");
    this.#textInput = this.querySelector("fig-input-text:not([type=number])");
    this.#alphaInput = this.querySelector("fig-input-number");
    if (this.#textInput) {
      this.#textInput.setAttribute(
        "value",
        this.hexOpaque.slice(1).toUpperCase(),
      );
    }
    if (this.#alphaInput) {
      this.#alphaInput.setAttribute("value", String(this.#alphaPercent));
    }
    if (this.#swatch) {
      this.#swatch.setAttribute("background", this.hexOpaque);
      this.#swatch.setAttribute("alpha", String(this.rgba.a));
    }
    this.#syncA11yAttributes();
    this.#bindControlListeners();
  }

  #teardownControlListeners() {
    if (this.#swatch) {
      this.#swatch.removeEventListener(
        "pointerdown",
        this.#boundSwatchPointerDown,
        { capture: true },
      );
      this.#swatch.removeEventListener("click", this.#boundSwatchClick, {
        capture: true,
      });
      const swatchInput = this.#swatch.querySelector('input[type="color"]');
      swatchInput?.removeEventListener("keydown", this.#boundSwatchKeyDown);
      this.#swatch.removeEventListener("input", this.#boundHandleInput);
    }
    this.#textInput?.removeEventListener("input", this.#boundTextInput);
    this.#textInput?.removeEventListener("change", this.#boundChange);
    this.#alphaInput?.removeEventListener("input", this.#boundAlphaInput);
    this.#alphaInput?.removeEventListener("change", this.#boundChange);
    this.#fillPicker?.removeEventListener("input", this.#boundFillPickerInput);
    this.#fillPicker?.removeEventListener("change", this.#boundChange);
  }

  #bindControlListeners() {
    if (this.#swatch) {
      this.#swatch.disabled = this.hasAttribute("disabled");
      const swatchInput = this.#swatch.querySelector('input[type="color"]');
      if (this.#textInput || this.hasAttribute("swatch-disabled")) {
        swatchInput?.setAttribute("tabindex", "-1");
      }
      if (this.hasAttribute("swatch-disabled")) {
        swatchInput?.setAttribute("disabled", "");
        if (swatchInput) swatchInput.style.pointerEvents = "none";
      }
      this.#swatch.addEventListener(
        "pointerdown",
        this.#boundSwatchPointerDown,
        { capture: true },
      );
      this.#swatch.addEventListener("click", this.#boundSwatchClick, {
        capture: true,
      });
      swatchInput?.addEventListener("keydown", this.#boundSwatchKeyDown);
      this.#swatch.addEventListener("input", this.#boundHandleInput);
    }
    if (this.#textInput) {
      this.#textInput.addEventListener("input", this.#boundTextInput);
      this.#textInput.addEventListener("change", this.#boundChange);
    }
    if (this.#alphaInput) {
      this.#alphaInput.addEventListener("input", this.#boundAlphaInput);
      this.#alphaInput.addEventListener("change", this.#boundChange);
    }
    if (this.#fillPicker) {
      this.#fillPicker.addEventListener("input", this.#boundFillPickerInput);
      this.#fillPicker.addEventListener("change", this.#boundChange);
    }
  }

  #buildUI() {
    this.#setValues(this.getAttribute("value"));

    const showAlpha = this.getAttribute("alpha") !== "false";
    const disabled = this.#disabled;
    const disabledAttr = disabled ? " disabled" : "";

    let html = ``;
    const showText = this.getAttribute("text") !== "false";
    if (showText) {
      let label = `<fig-input-text 
        type="text"
        placeholder="000000"
        value="${this.hexOpaque.slice(1).toUpperCase()}"${disabledAttr}>
      </fig-input-text>`;
      if (showAlpha) {
        label += `<fig-tooltip text="Opacity">
                    <fig-input-number 
                        placeholder="##" 
                        min="0"
                        max="100"
                        value="${this.#alphaPercent}"
                        units="%"${disabledAttr}>
                    </fig-input-number>
                </fig-tooltip>`;
      }

      let swatchElement = "";
      swatchElement = `<fig-chit background="${this.hexOpaque}" alpha="${this.rgba.a}"${disabledAttr}></fig-chit>`;

      html = `<div class="input-combo">
                ${swatchElement}
                ${label}
            </div>`;
    } else {
      html = `<fig-chit background="${this.hexOpaque}" alpha="${this.rgba.a}"${disabledAttr}></fig-chit>`;
    }
    this.innerHTML = html;

    this.#swatch = this.querySelector("fig-chit");
    this.#fillPicker = this.querySelector("fig-fill-picker");
    this.#textInput = this.querySelector("fig-input-text:not([type=number])");
    this.#alphaInput = this.querySelector("fig-input-number");
    this.#syncA11yAttributes();

    if (this.#textInput) {
      const hex = this.rgbAlphaToHex(this.rgba, 1);
      this.#textInput.value = hex.slice(1).toUpperCase();
      if (this.#swatch) {
        this.#swatch.background = hex;
      }
    }

    this.#bindControlListeners();
  }

  #syncFillPicker() {
    if (!this.#fillPicker) return;
    for (const [name, value] of Object.entries(this.#fillPickerAttrs())) {
      this.#fillPicker.setAttribute(name, value);
    }
    this.#fillPicker.setAttribute("mode", "solid");
    if (this.getAttribute("alpha") !== "false") {
      this.#fillPicker.removeAttribute("alpha");
    } else {
      this.#fillPicker.setAttribute("alpha", "false");
    }
    if (this.hasAttribute("disabled")) {
      this.#fillPicker.setAttribute("disabled", "");
    } else {
      this.#fillPicker.removeAttribute("disabled");
    }
    this.#fillPicker.anchorElement = this;
    this.#fillPicker.setAttribute(
      "value",
      JSON.stringify({
        type: "solid",
        color: this.hexOpaque,
        opacity: this.#alphaPercent,
      }),
    );
  }

  #ensureFillPicker() {
    if (!hasFigFillPicker()) return null;
    if (this.#fillPicker?.isConnected) {
      this.#syncFillPicker();
      return this.#fillPicker;
    }

    const picker = document.createElement("fig-fill-picker");
    picker.innerHTML = "<span hidden></span>";
    picker.addEventListener("input", this.#handleFillPickerInput.bind(this));
    picker.addEventListener("change", this.#handleChange.bind(this));
    this.appendChild(picker);
    this.#fillPicker = picker;
    this.#syncFillPicker();
    return picker;
  }

  #openFillPicker() {
    if (this.hasAttribute("disabled") || this.hasAttribute("swatch-disabled")) return false;
    const picker = this.#ensureFillPicker();
    if (!picker) return false;
    requestAnimationFrame(() => picker.open?.());
    return true;
  }

  #cancelNativeColorEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  #handleSwatchPointerDown(event) {
    if (!hasFigFillPicker()) return;
    if (this.hasAttribute("disabled") || this.hasAttribute("swatch-disabled")) return;
    this.#pendingFillPickerPointerOpen = true;
    this.#suppressNativeColorClick = true;
    if (this.#nativeColorClickTimer) clearTimeout(this.#nativeColorClickTimer);
    this.#nativeColorClickTimer = setTimeout(() => {
      this.#suppressNativeColorClick = false;
      this.#pendingFillPickerPointerOpen = false;
      this.#nativeColorClickTimer = null;
    }, 500);
    this.#cancelNativeColorEvent(event);
  }

  #handleSwatchClick(event) {
    if (!this.#suppressNativeColorClick) return;
    this.#suppressNativeColorClick = false;
    if (this.#nativeColorClickTimer) {
      clearTimeout(this.#nativeColorClickTimer);
      this.#nativeColorClickTimer = null;
    }
    this.#cancelNativeColorEvent(event);
    if (this.#pendingFillPickerPointerOpen) {
      this.#pendingFillPickerPointerOpen = false;
      this.#openFillPicker();
    }
  }

  #handleSwatchKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!hasFigFillPicker()) return;
    if (!this.#openFillPicker()) return;
    this.#cancelNativeColorEvent(event);
  }

  #setValues(hexValue) {
    const colorValue = hexValue || "#D9D9D9";
    this.rgba = this.convertToRGBA(colorValue);
    this.value = this.rgbAlphaToHex(
      {
        r: isNaN(this.rgba.r) ? 0 : this.rgba.r,
        g: isNaN(this.rgba.g) ? 0 : this.rgba.g,
        b: isNaN(this.rgba.b) ? 0 : this.rgba.b,
      },
      this.rgba.a,
    );
    this.hexWithAlpha = this.value.toUpperCase();
    this.hexOpaque = this.hexWithAlpha.slice(0, 7);
    this.#alphaPercent = colorValue.length > 7 ? (this.rgba.a * 100).toFixed(0) : 100;
    this.style.setProperty("--alpha", this.rgba.a);
  }

  #handleTextInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    // Add # prefix if not present for internal processing
    let inputValue = event.target.value.replace("#", "");
    this.#setValues("#" + inputValue);
    if (this.#alphaInput) {
      this.#alphaInput.setAttribute("value", this.#alphaPercent);
    }
    if (this.#swatch) {
      this.#swatch.setAttribute("background", this.hexOpaque);
    }
    this.#emitInputEvent();
  }

  #handleAlphaInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    // fig-input-number stores numeric value internally, ensure it's a number
    const alphaValue = Number(event.target.value) || 0;
    const alpha = Math.round((alphaValue / 100) * 255);
    const alphaHex = alpha.toString(16).padStart(2, "0");
    this.#setValues(this.hexOpaque + alphaHex);
    if (this.#swatch) {
      this.#swatch.setAttribute("alpha", this.rgba.a);
    }
    if (this.#fillPicker) {
      this.#fillPicker.setAttribute(
        "value",
        JSON.stringify({
          type: "solid",
          color: this.hexOpaque,
          opacity: this.#alphaPercent,
        }),
      );
    }
    this.#emitInputEvent();
  }

  #handleChange(event) {
    event.stopPropagation();
    this.#emitChangeEvent();
  }

  focus() {
    if (this.#textInput) {
      this.#textInput.focus();
      return;
    }
    this.#swatch?.focus();
  }

  #accessibleName() {
    return this.getAttribute("aria-label") || "Color";
  }

  #syncA11yAttributes() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (this.#disabled) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");

    const describedBy = this.getAttribute("aria-describedby");
    const invalid = this.getAttribute("aria-invalid");
    const required = this.getAttribute("aria-required");
    const labelledBy = this.getAttribute("aria-labelledby");
    const name = this.#accessibleName();

    if (this.#textInput) {
      this.#textInput.setAttribute("aria-label", `${name} hex color`);
      if (describedBy) this.#textInput.setAttribute("aria-describedby", describedBy);
      else this.#textInput.removeAttribute("aria-describedby");
      if (invalid) this.#textInput.setAttribute("aria-invalid", invalid);
      else this.#textInput.removeAttribute("aria-invalid");
      if (required) this.#textInput.setAttribute("aria-required", required);
      else this.#textInput.removeAttribute("aria-required");
    }

    if (this.#alphaInput) {
      this.#alphaInput.setAttribute("aria-label", `${name} opacity`);
      if (describedBy) this.#alphaInput.setAttribute("aria-describedby", describedBy);
      else this.#alphaInput.removeAttribute("aria-describedby");
      if (invalid) this.#alphaInput.setAttribute("aria-invalid", invalid);
      else this.#alphaInput.removeAttribute("aria-invalid");
      if (required) this.#alphaInput.setAttribute("aria-required", required);
      else this.#alphaInput.removeAttribute("aria-required");
    }

    if (!this.#textInput) {
      const swatchInput = this.#swatch?.querySelector('input[type="color"]');
      if (!swatchInput) return;
      if (labelledBy) {
        swatchInput.setAttribute("aria-labelledby", labelledBy);
        swatchInput.removeAttribute("aria-label");
      } else {
        swatchInput.setAttribute("aria-label", name);
        swatchInput.removeAttribute("aria-labelledby");
      }
      if (describedBy) swatchInput.setAttribute("aria-describedby", describedBy);
      else swatchInput.removeAttribute("aria-describedby");
    }
  }

  #handleInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    this.#setValues(event.target.value);
    if (this.#textInput) {
      // Display without # prefix
      this.#textInput.setAttribute(
        "value",
        this.hexOpaque.slice(1).toUpperCase(),
      );
    }
    this.#emitInputEvent();
  }

  #handleFillPickerInput(event) {
    event.stopPropagation();
    const detail = event.detail;
    if (detail && detail.color) {
      // Build hex value with alpha included
      let hexValue = detail.color;
      if (detail.alpha !== undefined) {
        const alphaHex = Math.round(detail.alpha * 255)
          .toString(16)
          .padStart(2, "0");
        hexValue = detail.color + alphaHex;
      }
      this.#setValues(hexValue);
      if (this.#textInput) {
        this.#textInput.setAttribute(
          "value",
          this.hexOpaque.slice(1).toUpperCase(),
        );
      }
      if (this.#alphaInput && detail.alpha !== undefined) {
        this.#alphaInput.setAttribute("value", Math.round(detail.alpha * 100));
      }
      if (this.#swatch) {
        this.#swatch.setAttribute("background", this.hexOpaque);
        this.#swatch.setAttribute("alpha", this.rgba.a);
      }
      this.#emitInputEvent();
    }
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, hex: this.hex, rgba: this.rgba },
      }),
    );
  }
  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, hex: this.hex, rgba: this.rgba },
      }),
    );
  }

  static get observedAttributes() {
    return [
      "value",
      "style",
      "mode",
      "experimental",
      "alpha",
      "text",
      "disabled",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
    ];
  }

  get mode() {
    return this.getAttribute("mode");
  }
  set mode(value) {
    this.setAttribute("mode", value);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Skip if value hasn't actually changed
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        this.#setValues(newValue);
        if (this.#textInput) {
          this.#textInput.setAttribute("value", this.value);
        }
        if (this.#swatch) {
          this.#swatch.setAttribute("background", this.hexOpaque);
          this.#swatch.setAttribute("alpha", this.rgba.a);
        }
        if (this.#fillPicker) {
          this.#fillPicker.setAttribute(
            "value",
            JSON.stringify({
              type: "solid",
              color: this.hexOpaque,
              opacity: this.#alphaPercent,
            }),
          );
        }
        if (this.#alphaInput) {
          this.#alphaInput.setAttribute("value", this.#alphaPercent);
        }
        // NOTE: Do NOT emit input events here!
        // Input events should only fire from user interactions, not programmatic changes.
        // Emitting here causes infinite loops with React and other frameworks.
        break;
      case "mode":
        this.#syncFillPicker();
        break;
      case "alpha":
      case "text":
        if (this.isConnected) this.#buildUI();
        break;
      case "disabled":
        this.#syncDisabled();
        break;
      case "aria-label":
      case "aria-labelledby":
      case "aria-describedby":
      case "aria-invalid":
      case "aria-required":
        this.#syncA11yAttributes();
        break;
    }
  }

  get #disabled() {
    return (
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false"
    );
  }

  #syncDisabled() {
    const disabled = this.#disabled;
    for (const child of [this.#swatch, this.#textInput, this.#alphaInput]) {
      if (!child) continue;
      if (disabled) child.setAttribute("disabled", "");
      else child.removeAttribute("disabled");
    }
    this.#syncA11yAttributes();
    if (this.#fillPicker) {
      this.#syncFillPicker();
    }
  }

  rgbAlphaToHex({ r, g, b }, a = 1) {
    // Ensure r, g, b are integers between 0 and 255
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    // Ensure alpha is between 0 and 1
    a = Math.max(0, Math.min(1, a));

    // Convert to hex and pad with zeros if necessary
    const hexR = r.toString(16).padStart(2, "0");
    const hexG = g.toString(16).padStart(2, "0");
    const hexB = b.toString(16).padStart(2, "0");

    // If alpha is 1, return 6-digit hex
    if (a === 1) {
      return `#${hexR}${hexG}${hexB}`.toUpperCase();
    }

    // Otherwise, include alpha in 8-digit hex
    const alpha = Math.round(a * 255);
    const hexA = alpha.toString(16).padStart(2, "0");
    return `#${hexR}${hexG}${hexB}${hexA}`.toUpperCase();
  }

  convertToRGBA(color) {
    let r,
      g,
      b,
      a = 1;

    // Handle hex colors
    if (color.startsWith("#")) {
      let hex = color.slice(1);
      if (hex.length === 8) {
        a = parseInt(hex.slice(6), 16) / 255;
        hex = hex.slice(0, 6);
      }
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    // Handle rgba colors
    else if (color.startsWith("rgba") || color.startsWith("rgb")) {
      let matches = color.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/,
      );
      if (matches) {
        r = parseInt(matches[1]);
        g = parseInt(matches[2]);
        b = parseInt(matches[3]);
        a = matches[4] ? parseFloat(matches[4]) : 1;
      }
    }
    // Handle hsla colors
    else if (color.startsWith("hsla") || color.startsWith("hsl")) {
      let matches = color.match(
        /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*(\d+(?:\.\d+)?))?\)/,
      );
      if (matches) {
        let h = parseInt(matches[1]) / 360;
        let s = parseInt(matches[2]) / 100;
        let l = parseInt(matches[3]) / 100;
        a = matches[4] ? parseFloat(matches[4]) : 1;

        if (s === 0) {
          r = g = b = l; // achromatic
        } else {
          let hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          let p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
        }

        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
      }
    }
    // If it's not recognized, return null
    else {
      return null;
    }

    return { r, g, b, a };
  }
}
customElements.define("fig-input-color", FigInputColor);

/* Input Fill */
const GRADIENT_INTERPOLATION_SPACES = [
  "srgb",
  "srgb-linear",
  "display-p3",
  "oklab",
  "oklch",
];
const GRADIENT_HUE_INTERPOLATIONS = [
  "shorter",
  "longer",
  "increasing",
  "decreasing",
];

const GRADIENT_PICKER_SPACES = ["srgb", "srgb-linear", "oklab", "oklch"];

function normalizeGradientConfig(gradient) {
  const next = { ...(gradient ?? {}) };
  let interpolationSpace = String(
    next.interpolationSpace ?? "srgb",
  ).toLowerCase();
  if (!GRADIENT_INTERPOLATION_SPACES.includes(interpolationSpace)) {
    interpolationSpace = "srgb";
  }
  next.interpolationSpace = interpolationSpace;

  const hueInterpolation = String(
    next.hueInterpolation ?? "shorter",
  ).toLowerCase();
  next.hueInterpolation = GRADIENT_HUE_INTERPOLATIONS.includes(hueInterpolation)
    ? hueInterpolation
    : "shorter";
  return next;
}

function gradientToValueShape(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  const output = {
    ...normalized,
    interpolationSpace: normalized.interpolationSpace,
  };
  if (normalized.interpolationSpace === "oklch") {
    output.hueInterpolation = normalized.hueInterpolation;
  } else {
    delete output.hueInterpolation;
  }
  return output;
}

function gradientInterpolationClause(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  if (normalized.interpolationSpace === "srgb") {
    return "";
  }
  if (normalized.interpolationSpace === "oklch") {
    return `in oklch ${normalized.hueInterpolation} hue`;
  }
  return `in ${normalized.interpolationSpace}`;
}

function figHexToRGB(hex) {
  const h = hex.replace(/^#/, "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function figRGBToLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function figLinearToSRGB(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

function figRGBToOklab(r, g, b) {
  const lr = figRGBToLinear(r);
  const lg = figRGBToLinear(g);
  const lb = figRGBToLinear(b);
  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function figOklabToRGB(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: figLinearToSRGB(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: figLinearToSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: figLinearToSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

function figOklabToOklch(L, a, b) {
  return {
    l: L,
    c: Math.sqrt(a * a + b * b),
    h: (Math.atan2(b, a) * 180) / Math.PI,
  };
}

function figOklchToOklab(l, c, h) {
  const hRad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) };
}

function figInterpolateHue(h1, h2, t, mode) {
  let a = ((h1 % 360) + 360) % 360;
  let b = ((h2 % 360) + 360) % 360;
  let diff = b - a;
  switch (mode) {
    case "longer":
      if (diff > 0 && diff < 180) diff -= 360;
      else if (diff < 0 && diff > -180) diff += 360;
      else if (diff === 0) diff = 0;
      break;
    case "increasing":
      if (diff < 0) diff += 360;
      break;
    case "decreasing":
      if (diff > 0) diff -= 360;
      break;
    default:
      if (diff > 180) diff -= 360;
      else if (diff < -180) diff += 360;
      break;
  }
  return (((a + diff * t) % 360) + 360) % 360;
}

function figSampleGradientAt(
  stops,
  position,
  interpolationSpace,
  hueInterpolation,
) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const pos = position * 100;
  if (sorted.length === 0) return "#888888";
  if (pos <= sorted[0].position) return sorted[0].color;
  if (pos >= sorted[sorted.length - 1].position)
    return sorted[sorted.length - 1].color;

  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].position < pos) i++;
  const s1 = sorted[i];
  const s2 = sorted[i + 1];
  const range = s2.position - s1.position;
  const t = range > 0 ? (pos - s1.position) / range : 0;

  const c1 = figHexToRGB(s1.color);
  const c2 = figHexToRGB(s2.color);

  let r, g, b;
  const space = interpolationSpace || "oklab";

  if (space === "srgb-linear") {
    const lr1 = figRGBToLinear(c1.r),
      lg1 = figRGBToLinear(c1.g),
      lb1 = figRGBToLinear(c1.b);
    const lr2 = figRGBToLinear(c2.r),
      lg2 = figRGBToLinear(c2.g),
      lb2 = figRGBToLinear(c2.b);
    r = figLinearToSRGB(lr1 + (lr2 - lr1) * t);
    g = figLinearToSRGB(lg1 + (lg2 - lg1) * t);
    b = figLinearToSRGB(lb1 + (lb2 - lb1) * t);
  } else if (space === "oklch") {
    const lab1 = figRGBToOklab(c1.r, c1.g, c1.b);
    const lab2 = figRGBToOklab(c2.r, c2.g, c2.b);
    const lch1 = figOklabToOklch(lab1.l, lab1.a, lab1.b);
    const lch2 = figOklabToOklch(lab2.l, lab2.a, lab2.b);
    const L = lch1.l + (lch2.l - lch1.l) * t;
    const C = lch1.c + (lch2.c - lch1.c) * t;
    const H = figInterpolateHue(
      lch1.h,
      lch2.h,
      t,
      hueInterpolation || "shorter",
    );
    const lab = figOklchToOklab(L, C, H);
    const rgb = figOklabToRGB(lab.l, lab.a, lab.b);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
  } else {
    const lab1 = figRGBToOklab(c1.r, c1.g, c1.b);
    const lab2 = figRGBToOklab(c2.r, c2.g, c2.b);
    const L = lab1.l + (lab2.l - lab1.l) * t;
    const a = lab1.a + (lab2.a - lab1.a) * t;
    const bv = lab1.b + (lab2.b - lab1.b) * t;
    const rgb = figOklabToRGB(L, a, bv);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
  }

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

function hslToP3(h, s, l) {
  const sRGB = hslToSRGB(h, s, l);
  return sRGB.map((c) => +(c / 255).toFixed(4));
}

function hslToSRGB(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * A fill input that supports solid colors, gradients, images, and videos.
 * @attr {string} value - JSON string with fill data
 * @attr {boolean} disabled - Whether the input is disabled
 * @fires input - When the fill value changes
 * @fires change - When the fill value is committed
 */
class FigInputFill extends HTMLElement {
  #fillType = "solid";
  #fillPicker;
  #opacityInput;
  #hexInput;

  // Fill data storage
  #solid = { color: "#D9D9D9", alpha: 1 };
  #gradient = {
    type: "linear",
    angle: 180,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };
  #image = { url: null, scaleMode: "fill", scale: 50, opacity: 1 };
  #video = { url: null, scaleMode: "fill", opacity: 1 };
  #webcam = { snapshot: null, opacity: 1 };

  constructor() {
    super();
  }

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "mode",
      "experimental",
      "alpha",
      "aria-label",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
    ];
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    this.#parseValue();
    this.#render();
  }

  disconnectedCallback() {
    this.#fillPicker = null;
    this.#opacityInput = null;
    this.#hexInput = null;
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;

    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed.type) this.#fillType = parsed.type;

      switch (this.#fillType) {
        case "solid":
          if (parsed.color) this.#solid.color = parsed.color;
          if (parsed.alpha !== undefined) this.#solid.alpha = parsed.alpha;
          if (parsed.opacity !== undefined)
            this.#solid.alpha = parsed.opacity / 100;
          break;
        case "gradient":
          if (parsed.gradient) {
            this.#gradient = normalizeGradientConfig({
              ...this.#gradient,
              ...parsed.gradient,
            });
          }
          break;
        case "image":
          if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
          break;
        case "video":
          if (parsed.video) this.#video = { ...this.#video, ...parsed.video };
          break;
        case "webcam":
          if (parsed.webcam)
            this.#webcam = { ...this.#webcam, ...parsed.webcam };
          if (parsed.opacity !== undefined)
            this.#webcam.opacity = parsed.opacity;
          break;
      }
    } catch (e) {
      // If not JSON, treat as hex color
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#solid.color = valueAttr.slice(0, 7);
        if (valueAttr.length > 7) {
          const alphaHex = valueAttr.slice(7, 9);
          this.#solid.alpha = parseInt(alphaHex, 16) / 255;
        }
      }
    }
  }

  #buildFillPickerAttrs() {
    const attrs = {};
    // Backward-compat: direct attributes forwarded to fill picker
    const mode = this.getAttribute("mode");
    if (mode) attrs["mode"] = mode;
    const experimental = this.getAttribute("experimental");
    if (experimental) attrs["experimental"] = experimental;
    const alpha = this.getAttribute("alpha");
    if (alpha) attrs["alpha"] = alpha;
    // picker-* overrides (except anchor, handled programmatically)
    for (const { name, value } of this.attributes) {
      if (name.startsWith("picker-") && name !== "picker-anchor") {
        attrs[name.slice(7)] = value;
      }
    }
    if (!attrs["dialog-position"]) attrs["dialog-position"] = "left";
    return Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
  }

  #fillPickerChitBackground() {
    switch (this.#fillType) {
      case "solid":
        return this.#solid.color;
      case "gradient": {
        const sorted = [...this.#gradient.stops].sort(
          (a, b) => a.position - b.position,
        );
        const stops = sorted
          .map((stop) => {
            const alpha = (stop.opacity ?? 100) / 100;
            if (alpha >= 1) return `${stop.color} ${stop.position}%`;
            const { r, g, b } = figHexToRGB(stop.color);
            return `rgba(${r}, ${g}, ${b}, ${alpha}) ${stop.position}%`;
          })
          .join(", ");
        return `linear-gradient(${this.#gradient.angle}deg ${gradientInterpolationClause(this.#gradient)}, ${stops})`;
      }
      case "image":
        return this.#image.url ? `url(${this.#image.url})` : "#D9D9D9";
      default:
        return "#D9D9D9";
    }
  }

  #fillPickerChitAlpha() {
    switch (this.#fillType) {
      case "solid":
        return this.#solid.alpha;
      case "image":
        return this.#image.opacity ?? 1;
      case "video":
        return this.#video.opacity ?? 1;
      case "webcam":
        return this.#webcam.opacity ?? 1;
      default:
        return 1;
    }
  }

  #syncDisabled() {
    const disabled = this.hasAttribute("disabled");
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    for (const child of [
      this.#fillPicker,
      this.#opacityInput,
      this.#hexInput,
    ]) {
      if (!child) continue;
      if (disabled) child.setAttribute("disabled", "");
      else child.removeAttribute("disabled");
    }
  }

  #syncA11y() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    this.#syncDisabled();
    const name = this.getAttribute("aria-label") || "Fill";
    const describedBy = this.getAttribute("aria-describedby");
    const invalid = this.getAttribute("aria-invalid");
    const required = this.getAttribute("aria-required");
    const syncState = (el, label) => {
      if (!el) return;
      el.setAttribute("aria-label", label);
      if (describedBy) el.setAttribute("aria-describedby", describedBy);
      else el.removeAttribute("aria-describedby");
      if (invalid) el.setAttribute("aria-invalid", invalid);
      else el.removeAttribute("aria-invalid");
      if (required) el.setAttribute("aria-required", required);
      else el.removeAttribute("aria-required");
    };
    syncState(this.#fillPicker, `${name} picker`);
    syncState(this.#hexInput, `${name} hex color`);
    syncState(this.#opacityInput, `${name} opacity`);
  }

  #render() {
    const disabled = this.hasAttribute("disabled");
    const fillPickerValue = JSON.stringify(this.value);
    const showAlpha = this.getAttribute("alpha") !== "false";

    const opacityHtml = (value) =>
      showAlpha
        ? `<fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${value}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`
        : "";

    let controlsHtml = "";

    switch (this.#fillType) {
      case "solid":
        controlsHtml = `
          <fig-input-text 
            type="text"
            class="fig-input-fill-hex"
            placeholder="000000"
            value="${this.#solid.color.slice(1).toUpperCase()}"
            ${disabled ? "disabled" : ""}>
          </fig-input-text>
          ${opacityHtml(Math.round(this.#solid.alpha * 100))}`;
        break;

      case "gradient": {
        const gradientLabel =
          this.#gradient.type.charAt(0).toUpperCase() +
          this.#gradient.type.slice(1);
        controlsHtml = `
          <label class="fig-input-fill-label">${gradientLabel}</label>
          ${opacityHtml(100)}`;
        break;
      }

      case "image":
        controlsHtml = `
          <label class="fig-input-fill-label">Image</label>
          ${opacityHtml(Math.round((this.#image.opacity ?? 1) * 100))}`;
        break;

      case "video":
        controlsHtml = `
          <label class="fig-input-fill-label">Video</label>
          ${opacityHtml(Math.round((this.#video.opacity ?? 1) * 100))}`;
        break;

      case "webcam":
        controlsHtml = `
          <label class="fig-input-fill-label">Webcam</label>
          ${opacityHtml(Math.round((this.#webcam.opacity ?? 1) * 100))}`;
        break;
    }

    const fpAttrs = this.#buildFillPickerAttrs();
    this.innerHTML = `
      <div class="input-combo">
        <fig-fill-picker ${fpAttrs} value='${fillPickerValue}' ${
          disabled ? "disabled" : ""
        }>
          <fig-chit background="${this.#fillPickerChitBackground()}" alpha="${this.#fillPickerChitAlpha()}"${disabled ? " disabled" : ""}></fig-chit>
        </fig-fill-picker>
        ${controlsHtml}
      </div>`;

    this.#setupEventListeners();
  }

  #setupEventListeners() {
    this.#fillPicker = this.querySelector("fig-fill-picker");
    this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
    this.#hexInput = this.querySelector(".fig-input-fill-hex");
    const label = this.querySelector(".fig-input-fill-label");
    this.#syncA11y();

    // Label click triggers fill picker
    if (label && this.#fillPicker) {
      label.addEventListener("click", () => {
        const chit = this.#fillPicker.querySelector("fig-chit");
        if (chit) {
          chit.click();
        }
      });
    }

    if (this.#fillPicker) {
      const anchor = this.getAttribute("picker-anchor");
      if (!anchor || anchor === "self") {
        this.#fillPicker.anchorElement = this;
      } else {
        const el = document.querySelector(anchor);
        if (el) this.#fillPicker.anchorElement = el;
      }

      this.#fillPicker.addEventListener("input", (e) => {
        e.stopPropagation();
        const detail = e.detail;
        if (!detail) return;

        const newType = detail.type;
        const typeChanged = newType !== this.#fillType;

        // Update internal state
        this.#fillType = newType;
        switch (newType) {
          case "solid":
            this.#solid.color = detail.color;
            this.#solid.alpha = detail.alpha;
            break;
          case "gradient":
            if (detail.gradient) {
              this.#gradient = normalizeGradientConfig({
                ...this.#gradient,
                ...detail.gradient,
              });
            }
            break;
          case "image":
            if (detail.image) this.#image = detail.image;
            break;
          case "video":
            if (detail.video) this.#video = detail.video;
            break;
        }

        // Update controls (don't re-render to keep dialog open)
        if (typeChanged) {
          this.#updateControlsForType();
        } else {
          this.#updateControls();
        }

        this.#emitInput();
      });

      this.#fillPicker.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }

    // Hex input (solid only)
    if (this.#hexInput) {
      this.#hexInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const hex = "#" + e.target.value.replace("#", "");
        this.#solid.color = hex;
        this.#updateFillPicker();
        this.#emitInput();
      });
      this.#hexInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }

    // Opacity input (all fill types)
    if (this.#opacityInput) {
      this.#opacityInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const parsed = parseFloat(e.target.value);
        const opacity = isNaN(parsed) ? 100 : parsed;
        const alpha = opacity / 100;
        switch (this.#fillType) {
          case "solid":
            this.#solid.alpha = alpha;
            break;
          case "gradient":
            break;
          case "image":
            this.#image.opacity = alpha;
            break;
          case "video":
            this.#video.opacity = alpha;
            break;
          case "webcam":
            this.#webcam.opacity = alpha;
            break;
        }
        this.#updateFillPicker();
        // Update the chit's alpha
        this.#updateChitAlpha(alpha);
        this.#emitInput();
      });
      this.#opacityInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }
  }

  #updateControls() {
    // Update UI controls without full re-render
    switch (this.#fillType) {
      case "solid":
        if (this.#hexInput) {
          this.#hexInput.setAttribute(
            "value",
            this.#solid.color.slice(1).toUpperCase(),
          );
        }
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round(this.#solid.alpha * 100),
          );
        }
        break;
      case "gradient": {
        const label = this.querySelector(".fig-input-fill-label");
        if (label) {
          const newLabel =
            this.#gradient.type.charAt(0).toUpperCase() +
            this.#gradient.type.slice(1);
          label.textContent = newLabel;
        }
        break;
      }
      case "image":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#image.opacity ?? 1) * 100),
          );
        }
        break;
      case "video":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#video.opacity ?? 1) * 100),
          );
        }
        break;
      case "webcam":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#webcam.opacity ?? 1) * 100),
          );
        }
        break;
    }
  }

  #updateControlsForType() {
    // Update only the controls (not the fill picker) when type changes
    const disabled = this.hasAttribute("disabled");
    const combo = this.querySelector(".input-combo");
    if (!combo) return;

    // Remove old controls (keep the fill picker)
    const oldLabel = combo.querySelector(".fig-input-fill-label");
    const oldHex = combo.querySelector(".fig-input-fill-hex");
    const oldOpacity = combo.querySelector(".fig-input-fill-opacity");
    const oldTooltips = combo.querySelectorAll("fig-tooltip");

    oldLabel?.remove();
    oldHex?.remove();
    oldTooltips.forEach((t) => t.remove());

    // Generate new controls HTML
    let controlsHtml = "";
    switch (this.#fillType) {
      case "solid":
        controlsHtml = `
          <fig-input-text 
            type="text"
            class="fig-input-fill-hex"
            placeholder="000000"
            value="${this.#solid.color.slice(1).toUpperCase()}"
            ${disabled ? "disabled" : ""}>
          </fig-input-text>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round(this.#solid.alpha * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "gradient": {
        const gradientLabel =
          this.#gradient.type.charAt(0).toUpperCase() +
          this.#gradient.type.slice(1);
        controlsHtml = `
          <label class="fig-input-fill-label">${gradientLabel}</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="100"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      }
      case "image":
        controlsHtml = `
          <label class="fig-input-fill-label">Image</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#image.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "video":
        controlsHtml = `
          <label class="fig-input-fill-label">Video</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#video.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "webcam":
        controlsHtml = `
          <label class="fig-input-fill-label">Webcam</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#webcam.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
    }

    // Append new controls after the fill picker
    combo.insertAdjacentHTML("beforeend", controlsHtml);

    // Re-setup event listeners for the new controls
    this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
    this.#hexInput = this.querySelector(".fig-input-fill-hex");
    const label = this.querySelector(".fig-input-fill-label");
    this.#syncA11y();

    // Label click triggers fill picker
    if (label && this.#fillPicker) {
      label.addEventListener("click", () => {
        const chit = this.#fillPicker.querySelector("fig-chit");
        if (chit) {
          chit.click();
        }
      });
    }

    // Hex input (solid only)
    if (this.#hexInput) {
      this.#hexInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const hex = "#" + e.target.value.replace("#", "");
        this.#solid.color = hex;
        this.#updateFillPicker();
        this.#emitInput();
      });
      this.#hexInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }

    // Opacity input
    if (this.#opacityInput) {
      this.#opacityInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const parsed = parseFloat(e.target.value);
        const opacity = isNaN(parsed) ? 100 : parsed;
        const alpha = opacity / 100;
        switch (this.#fillType) {
          case "solid":
            this.#solid.alpha = alpha;
            break;
          case "gradient":
            break;
          case "image":
            this.#image.opacity = alpha;
            break;
          case "video":
            this.#video.opacity = alpha;
            break;
          case "webcam":
            this.#webcam.opacity = alpha;
            break;
        }
        this.#updateFillPicker();
        this.#updateChitAlpha(alpha);
        this.#emitInput();
      });
      this.#opacityInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }
  }

  #updateFillPicker() {
    if (this.#fillPicker) {
      this.#fillPicker.setAttribute("value", JSON.stringify(this.value));
    }
  }

  #updateChitAlpha(alpha) {
    if (this.#fillPicker) {
      const chit = this.#fillPicker.querySelector("fig-chit");
      if (chit) {
        chit.setAttribute("alpha", alpha);
      }
    }
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  get value() {
    switch (this.#fillType) {
      case "solid":
        return {
          type: "solid",
          color: this.#solid.color,
          alpha: this.#solid.alpha,
          opacity: Math.round(this.#solid.alpha * 100), // FigFillPicker expects opacity 0-100
        };
      case "gradient":
        return {
          type: "gradient",
          gradient: gradientToValueShape(this.#gradient),
        };
      case "image":
        return {
          type: "image",
          image: { ...this.#image },
        };
      case "video":
        return {
          type: "video",
          video: { ...this.#video },
        };
      case "webcam":
        return {
          type: "webcam",
          webcam: { ...this.#webcam },
        };
      default:
        return { type: this.#fillType };
    }
  }

  set value(val) {
    if (typeof val === "string") {
      this.setAttribute("value", val);
    } else {
      this.setAttribute("value", JSON.stringify(val));
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        const prevType = this.#fillType;
        this.#parseValue();
        if (this.#fillPicker) {
          if (this.#fillType !== prevType) {
            this.#render();
          } else {
            this.#updateFillPicker();
            this.#updateControls();
          }
        }
        break;
      case "disabled":
        this.#syncDisabled();
        break;
      case "mode":
      case "experimental":
        // Pass through to internal fill picker
        if (this.#fillPicker) {
          if (newValue) {
            this.#fillPicker.setAttribute(name, newValue);
          } else {
            this.#fillPicker.removeAttribute(name);
          }
        }
        break;
      case "aria-label":
      case "aria-describedby":
      case "aria-invalid":
      case "aria-required":
        this.#syncA11y();
        break;
    }
  }
}
customElements.define("fig-input-fill", FigInputFill);

/* Input Palette */
/**
 * A palette of solid colors, each rendered as a fig-input-color swatch.
 * Manages an internal array of colors with optional add/remove support.
 * @attr {string} value - JSON array of hex strings or {color,alpha} objects, or comma-separated hex
 * @attr {boolean} disabled - Whether the palette is disabled
 * @attr {boolean} fixed - When set (or `fixed="true"`), palette length is locked — no add or remove
 * @attr {number} min - Minimum number of colors (default: 2)
 * @attr {number} max - Maximum number of colors (default: 8); add button hidden at max
 * @fires input - During color editing (detail: full color array)
 * @fires change - On committed color edits or add (detail: full color array)
 */
class FigInputPalette extends HTMLElement {
  #colors = [];
  #inlinePickers = [];
  #expandedPickers = [];
  #renderRAF = null;
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);

  static get observedAttributes() {
    return ["value", "disabled", "min", "max", "open", "fixed"];
  }

  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }

  set open(value) {
    const was = this.open;
    if (value) {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
    if (was !== !!value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: !!value },
          bubbles: true,
        }),
      );
    }
  }

  get #isFixed() {
    return (
      this.hasAttribute("fixed") && this.getAttribute("fixed") !== "false"
    );
  }

  get #min() {
    const v = parseInt(this.getAttribute("min"));
    return isNaN(v) ? 2 : v;
  }

  get #max() {
    const v = parseInt(this.getAttribute("max"));
    return isNaN(v) ? 8 : v;
  }

  connectedCallback() {
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    if (this.#renderRAF) cancelAnimationFrame(this.#renderRAF);
    this.#renderRAF = requestAnimationFrame(() => {
      this.#renderRAF = null;
      if (!this.isConnected) return;
      this.#parseValue();
      this.#render();
    });
  }

  disconnectedCallback() {
    if (this.#renderRAF) {
      cancelAnimationFrame(this.#renderRAF);
      this.#renderRAF = null;
    }
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.#inlinePickers = [];
    this.#expandedPickers = [];
  }

  #handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== this && !event.target?.closest?.(".palette-colors-inline")) return;
    if (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") return;
    event.preventDefault();
    event.stopPropagation();
    this.open = true;
    this.querySelector(".palette-colors-inline")?.setAttribute("aria-expanded", "true");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        this.#parseValue();
        this.#syncPickers();
        break;
      case "disabled":
        this.#syncDisabled();
        break;
      case "min":
      case "max":
      case "fixed":
        this.#render();
        break;
      case "open":
        // CSS handles visibility; no re-render needed
        break;
    }
  }

  #parseValue() {
    const raw = this.getAttribute("value");
    if (!raw) {
      this.#colors = [];
      return;
    }

    const trimmed = raw.trim();

    // Try JSON first
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        this.#colors = parsed.map((entry) => {
          if (typeof entry === "string") {
            return {
              color: entry.slice(0, 7),
              alpha:
                entry.length > 7 ? parseInt(entry.slice(7, 9), 16) / 255 : 1,
            };
          }
          if (entry && typeof entry === "object") {
            return {
              color: entry.color || "#D9D9D9",
              alpha:
                entry.alpha !== undefined
                  ? entry.alpha
                  : entry.opacity !== undefined
                    ? entry.opacity / 100
                    : 1,
            };
          }
          return { color: "#D9D9D9", alpha: 1 };
        });
        return;
      }
    } catch (e) {
      // Not JSON — try comma-separated hex
    }

    // Comma-separated hex
    if (trimmed.includes(",")) {
      this.#colors = trimmed.split(",").map((s) => {
        const hex = s.trim();
        return {
          color: hex.slice(0, 7),
          alpha: hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1,
        };
      });
      return;
    }

    // Single hex
    if (trimmed.startsWith("#")) {
      this.#colors = [
        {
          color: trimmed.slice(0, 7),
          alpha:
            trimmed.length > 7 ? parseInt(trimmed.slice(7, 9), 16) / 255 : 1,
        },
      ];
      return;
    }

    this.#colors = [];
  }

  get value() {
    return this.#colors.map((c) => ({ ...c }));
  }

  set value(val) {
    if (typeof val === "string") {
      this.setAttribute("value", val);
    } else {
      this.setAttribute("value", JSON.stringify(val));
    }
  }

  #render() {
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";

    this.innerHTML = "";
    this.#inlinePickers = [];
    this.#expandedPickers = [];

    const inlineWrap = document.createElement("div");
    inlineWrap.className = "palette-colors-inline";
    inlineWrap.setAttribute("role", "button");
    inlineWrap.setAttribute("aria-expanded", String(this.open));
    inlineWrap.setAttribute("aria-label", "Edit palette colors");
    const openPalette = () => {
      if (
        this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false"
      )
        return;
      this.open = true;
      inlineWrap.setAttribute("aria-expanded", "true");
    };
    inlineWrap.addEventListener("click", openPalette);
    inlineWrap.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      openPalette();
    });

    const wrap = document.createElement("div");
    wrap.className = "palette-colors";
    this.#colors.forEach((entry, i) => {
      wrap.appendChild(
        this.#createPicker(entry, i, disabled, { inline: true }),
      );
    });
    inlineWrap.appendChild(wrap);
    this.appendChild(inlineWrap);

    if (!this.#isFixed) this.#createAddButton(disabled, this);

    const expandedWrap = document.createElement("div");
    expandedWrap.className = "palette-colors-expanded";
    this.#colors.forEach((entry, i) => {
      expandedWrap.appendChild(this.#createPicker(entry, i, disabled));
      if (!this.#isFixed) {
        expandedWrap.appendChild(this.#createRemoveButton(i, disabled));
      }
    });
    this.appendChild(expandedWrap);
  }

  #createPicker(entry, index, disabled, { inline = false } = {}) {
    const hexAlpha =
      entry.alpha < 1
        ? entry.color +
          Math.round(entry.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : entry.color;
    const ic = document.createElement("fig-input-color");
    ic.setAttribute("value", hexAlpha);
    if (inline) {
      ic.setAttribute("text", "false");
      ic.setAttribute("alpha", "true");
      ic.setAttribute("swatch-disabled", "");
    } else {
      ic.setAttribute("text", "true");
      ic.setAttribute("alpha", "true");
      ic.setAttribute("full", "");
    }
    if (disabled) ic.setAttribute("disabled", "");

    const siblingList = inline ? this.#expandedPickers : this.#inlinePickers;

    const updateFromPicker = (e) => {
      e.stopPropagation();
      const el = e.currentTarget;
      this.#colors[index] = {
        color: el.hexOpaque || this.#colors[index].color,
        alpha: el.rgba ? el.rgba.a : this.#colors[index].alpha,
      };
      const sibling = siblingList[index];
      if (sibling) {
        const entry = this.#colors[index];
        const hex =
          entry.alpha < 1
            ? entry.color +
              Math.round(entry.alpha * 255)
                .toString(16)
                .padStart(2, "0")
            : entry.color;
        sibling.setAttribute("value", hex);
      }
    };

    ic.addEventListener("input", (e) => {
      updateFromPicker(e);
      this.#emitInput();
    });

    ic.addEventListener("change", (e) => {
      updateFromPicker(e);
      this.#emitChange();
    });

    if (inline) this.#inlinePickers.push(ic);
    else this.#expandedPickers.push(ic);
    return ic;
  }

  #createRemoveButton(index, disabled) {
    const btn = document.createElement("fig-button");
    btn.setAttribute("variant", "ghost");
    btn.setAttribute("icon", "true");
    btn.setAttribute("aria-label", "Remove color");
    btn.className = "palette-remove-btn";
    if (disabled || this.#colors.length <= this.#min) btn.setAttribute("disabled", "");
    btn.appendChild(createFigIcon("minus"));
    btn.addEventListener("click", () => {
      if (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") return;
      this.#removeColor(index);
    });
    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Remove color");
    tooltip.appendChild(btn);
    return tooltip;
  }

  #removeColor(index) {
    if (this.#isFixed) return;
    if (index < 0 || index >= this.#colors.length) return;
    if (this.#colors.length <= this.#min) return;
    this.#colors.splice(index, 1);
    this.#inlinePickers = [];
    this.#expandedPickers = [];
    this.#render();
    this.#emitChange();
  }

  #createAddButton(disabled, parent = this) {
    const atMax = this.#colors.length >= this.#max;
    const addBtn = document.createElement("fig-button");
    addBtn.setAttribute("variant", "ghost");
    addBtn.setAttribute("icon", "true");
    addBtn.setAttribute("aria-label", "Add color");
    addBtn.className = "palette-add-btn";
    if (disabled || atMax) addBtn.setAttribute("disabled", "");
    addBtn.appendChild(createFigIcon("add"));
    addBtn.addEventListener("click", () => {
      if (
        this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false"
      )
        return;
      if (this.#colors.length >= this.#max) return;
      this.open = true;
      this.#addColor({ color: "#D9D9D9", alpha: 1 });
    });
    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Add color");
    tooltip.appendChild(addBtn);
    parent.appendChild(tooltip);
  }

  #addColor(entry) {
    if (this.#isFixed) return;
    this.#colors.push(entry);
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const index = this.#colors.length - 1;

    const inlineIc = this.#createPicker(entry, index, disabled, {
      inline: true,
    });
    const wrap = this.querySelector(".palette-colors");
    if (wrap) wrap.appendChild(inlineIc);

    const expandedIc = this.#createPicker(entry, index, disabled);
    const expandedWrap = this.querySelector(".palette-colors-expanded");
    if (expandedWrap) {
      expandedWrap.appendChild(expandedIc);
      expandedWrap.appendChild(this.#createRemoveButton(index, disabled));
    }

    if (this.#colors.length >= this.#max) {
      const addBtn = this.querySelector(".palette-add-btn");
      if (addBtn) addBtn.setAttribute("disabled", "");
    }
    this.#syncRemoveButtons(disabled);
    this.#emitChange();
  }

  #updateChit(index) {
    const entry = this.#colors[index];
    if (!entry) return;
    const hexAlpha =
      entry.alpha < 1
        ? entry.color +
          Math.round(entry.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : entry.color;
    const inl = this.#inlinePickers[index];
    if (inl) inl.setAttribute("value", hexAlpha);
    const exp = this.#expandedPickers[index];
    if (exp) exp.setAttribute("value", hexAlpha);
  }

  #syncPickers() {
    if (this.#inlinePickers.length !== this.#colors.length) {
      this.#render();
      return;
    }
    this.#colors.forEach((_, i) => {
      this.#updateChit(i);
    });
  }

  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    [...this.#inlinePickers, ...this.#expandedPickers].forEach((fp) => {
      if (disabled) fp.setAttribute("disabled", "");
      else fp.removeAttribute("disabled");
    });
    const addBtn = this.querySelector(".palette-add-btn");
    if (addBtn) {
      if (disabled || this.#colors.length >= this.#max) addBtn.setAttribute("disabled", "");
      else addBtn.removeAttribute("disabled");
    }
    this.#syncRemoveButtons(disabled);
  }

  #syncRemoveButtons(disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") {
    const shouldDisable = disabled || this.#colors.length <= this.#min;
    this.querySelectorAll(".palette-remove-btn").forEach((btn) => {
      if (shouldDisable) btn.setAttribute("disabled", "");
      else btn.removeAttribute("disabled");
    });
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }
}
customElements.define("fig-input-palette", FigInputPalette);

/* Input Gradient */
/**
 * A gradient-only fill input built on top of fig-fill-picker.
 * @attr {string} value - JSON string with gradient fill data
 * @attr {boolean} disabled - Whether the input is disabled
 * @fires input - When the gradient value changes
 * @fires change - When the gradient value is committed
 */
class FigInputGradient extends HTMLElement {
  static SHIFT_SNAP = 5;
  #chit;
  #track;
  #handleDragging = false;
  #arrowTooltipTimer = null;
  #colorObserver = null;
  #repositionRAF = null;
  #gradient = {
    type: "linear",
    angle: 90,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "disabled", "edit", "mode"];
  }

  get #editMode() {
    const attr = this.getAttribute("edit");
    if (attr === "false") return "false";
    if (attr === "picker") return "picker";
    return "true";
  }

  get #isEditable() {
    return this.#editMode === "true";
  }

  get #stopHandleMode() {
    return this.getAttribute("mode") === "tip" ? "tip" : "handle";
  }

  #firstStopHandle() {
    if (!this.#track) return null;
    return this.#track.querySelector(
      "fig-handle:not(.fig-input-gradient-ghost):not([disabled])",
    );
  }

  #syncFocusTarget() {
    const disabled = this.hasAttribute("disabled");
    if (disabled) {
      this.setAttribute("tabindex", "-1");
      return;
    }
    this.setAttribute("tabindex", this.#isEditable ? "-1" : "0");
  }

  #normalizeGradient(gradient) {
    return {
      ...normalizeGradientConfig(gradient),
      type: "linear",
      angle: 90,
    };
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
    this.removeEventListener("keydown", this.#onPickerKeyDown);
    this.addEventListener("keydown", this.#onPickerKeyDown);
    if (this.#isEditable) document.addEventListener("keydown", this.#onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this.#onKeyDown);
    this.removeEventListener("keydown", this.#onPickerKeyDown);
    if (this.#colorObserver) {
      this.#colorObserver.disconnect();
      this.#colorObserver = null;
    }
    if (this.#repositionRAF !== null) {
      cancelAnimationFrame(this.#repositionRAF);
      this.#repositionRAF = null;
    }
    clearTimeout(this.#arrowTooltipTimer);
    this.removeEventListener("pointerenter", this.#onTrackEnter);
    this.removeEventListener("pointermove", this.#onTrackMove);
    this.removeEventListener("pointerleave", this.#onTrackLeave);
    this.removeEventListener("click", this.#onTrackClick);
    this.removeEventListener("dblclick", this.#onTrackDblClick);
  }

  #onKeyDown = (e) => {
    const active = document.activeElement;
    const isTyping =
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable);
    if (!this.#track) return;

    if (e.key === "Tab" && !isTyping) {
      const selected = this.#track.querySelector(
        "fig-handle[selected]:not(.fig-input-gradient-ghost)",
      );
      if (!selected) return;
      e.preventDefault();
      const handles = [
        ...this.#track.querySelectorAll(
          "fig-handle:not(.fig-input-gradient-ghost)",
        ),
      ];
      const curIdx = handles.indexOf(selected);
      const next = e.shiftKey
        ? (curIdx - 1 + handles.length) % handles.length
        : (curIdx + 1) % handles.length;
      selected.deselect();
      handles[next].select();
      return;
    }

    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping) {
      const selected = this.#track.querySelector(
        "fig-handle[selected]:not(.fig-input-gradient-ghost)",
      );
      if (!selected) return;
      const idx = parseInt(selected.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      e.preventDefault();
      const delta =
        (e.key === "ArrowRight" ? 1 : -1) *
        (e.shiftKey ? FigInputGradient.SHIFT_SNAP : 1);
      const stop = this.#gradient.stops[idx];
      stop.position = Math.max(0, Math.min(100, stop.position + delta));
      selected.setAttribute("value", `${stop.position}% 50%`);
      const tip = selected.closest("fig-tooltip");
      if (tip) {
        tip.text = `${Math.round(stop.position)}%`;
        tip.setAttribute("show", "true");
        tip.showPopup();
        selected.hideColorTip();
        clearTimeout(this.#arrowTooltipTimer);
        this.#arrowTooltipTimer = setTimeout(() => {
          tip.removeAttribute("show");
          selected.showColorTip();
        }, 600);
      }
      this.#syncChit();
      this.#emitInput();
      this.#emitChange();
      return;
    }

    if (e.key !== "Delete" && e.key !== "Backspace") return;
    if (isTyping) return;
    if (this.#gradient.stops.length <= 2) return;
    const selected = this.#track.querySelector(
      "fig-handle[selected]:not(.fig-input-gradient-ghost)",
    );
    if (!selected) return;
    const idx = parseInt(selected.dataset.stopIndex, 10);
    if (isNaN(idx) || !this.#gradient.stops[idx]) return;
    e.preventDefault();
    selected.removeAttribute("selected");
    this.#gradient.stops.splice(idx, 1);
    this.#syncHandles();
    this.#syncChit();
    this.#emitInput();
    this.#emitChange();
  };

  #onPickerKeyDown = (e) => {
    if (this.#editMode !== "picker") return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (this.hasAttribute("disabled")) return;
    const picker = this.querySelector("fig-fill-picker");
    if (!picker || typeof picker.open !== "function") return;
    e.preventDefault();
    picker.open();
  };

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;
    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed?.type === "gradient" && parsed.gradient) {
        this.#gradient = this.#normalizeGradient({
          ...this.#gradient,
          ...parsed.gradient,
        });
        return;
      }
      if (parsed?.gradient) {
        this.#gradient = this.#normalizeGradient({
          ...this.#gradient,
          ...parsed.gradient,
        });
      }
    } catch (e) {
      // Ignore invalid JSON and keep current/default gradient.
    }
  }

  #buildGradientCSS() {
    const gradient = this.#normalizeGradient(this.#gradient);
    const sorted = [...gradient.stops].sort(
      (a, b) => a.position - b.position,
    );
    const stops = sorted
      .map((s) => {
        const alpha = (s.opacity ?? 100) / 100;
        if (alpha >= 1) return `${s.color} ${s.position}%`;
        const { r, g, b } = figHexToRGB(s.color);
        return `rgba(${r}, ${g}, ${b}, ${alpha}) ${s.position}%`;
      })
      .join(", ");
    const interp = gradientInterpolationClause(gradient);
    const interpolation = interp ? ` ${interp}` : "";
    return `linear-gradient(${gradient.angle}deg${interpolation}, ${stops})`;
  }

  #stopColorCSS(stop) {
    const alpha = (stop.opacity ?? 100) / 100;
    if (alpha >= 1) return stop.color;
    const { r, g, b } = figHexToRGB(stop.color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  #buildStopHandles() {
    const disabled = this.hasAttribute("disabled");
    const tipAttr = this.#stopHandleMode === "tip" ? ' tip="color"' : "";
    return this.#gradient.stops
      .map(
        (stop, i) =>
          `<fig-tooltip action="manual" text="${Math.round(stop.position)}%"><fig-handle drag drag-axes="x" drag-surface=".fig-input-gradient-track" type="color"${tipAttr} color="${this.#stopColorCSS(stop)}" value="${stop.position}% 50%" hit-area="4" data-stop-index="${i}"${disabled ? " disabled" : ""}></fig-handle></fig-tooltip>`,
      )
      .join("");
  }

  #ghostHandle = null;
  #addedOnPointerDown = false;

  #render() {
    const disabled = this.hasAttribute("disabled");
    const mode = this.#editMode;

    if (mode === "picker" && hasFigFillPicker()) {
      const experimental = this.getAttribute("experimental");
      const expAttr = experimental ? ` experimental="${experimental}"` : "";
      const gradientValue = JSON.stringify(this.value);
      this.innerHTML = `
        <fig-fill-picker mode="gradient"${expAttr} value='${gradientValue}'${disabled ? " disabled" : ""}>
          <fig-chit background="${this.#buildGradientCSS()}"${disabled ? " disabled" : ""}></fig-chit>
        </fig-fill-picker>`;
      this.#chit = this.querySelector("fig-chit");
      this.#track = null;
      this.#setupPickerEvents();
      this.#syncFocusTarget();
      return;
    }

    this.innerHTML = `
      <fig-chit background="${this.#buildGradientCSS()}"${disabled ? " disabled" : ""}></fig-chit>
      ${mode === "true" || mode === "picker" ? `<div class="fig-input-gradient-track">${this.#buildStopHandles()}</div>` : ""}`;
    this.#chit = this.querySelector("fig-chit");
    this.#track = this.querySelector(".fig-input-gradient-track");

    if (mode === "true" || mode === "picker") {
      this.#setupGhostHandle();
      this.#setupEventListeners();
    }
    this.#syncFocusTarget();
  }

  #setupPickerEvents() {
    const picker = this.querySelector("fig-fill-picker");
    if (!picker) return;
    picker.anchorElement = this;

    const syncFromPicker = (e) => {
      e.stopPropagation();
      const detail = e.detail;
      if (!detail?.gradient) return;
      this.#gradient = this.#normalizeGradient({
        ...this.#gradient,
        ...detail.gradient,
      });
      this.#syncChit();
    };

    picker.addEventListener("input", (e) => {
      syncFromPicker(e);
      this.#emitInput();
    });

    picker.addEventListener("change", (e) => {
      syncFromPicker(e);
      this.#emitChange();
    });
  }

  #sampleGradientColor(position) {
    return figSampleGradientAt(
      this.#gradient.stops,
      position,
      this.#gradient.interpolationSpace,
      this.#gradient.hueInterpolation,
    );
  }

  #setupGhostHandle() {
    if (!this.#track || this.hasAttribute("disabled")) return;

    const ghost = document.createElement("fig-handle");
    ghost.classList.add("fig-input-gradient-ghost");
    ghost.setAttribute("type", "color");
    if (this.#stopHandleMode === "tip") ghost.setAttribute("tip", "add");
    ghost.style.position = "absolute";
    ghost.style.top = "50%";
    ghost.style.transform = "translate(-50%, -50%)";
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0";
    ghost.style.transition = "opacity 0.15s";

    this.#track.appendChild(ghost);
    this.#ghostHandle = ghost;

    this.addEventListener("pointerenter", this.#onTrackEnter);
    this.addEventListener("pointermove", this.#onTrackMove);
    this.addEventListener("pointerleave", this.#onTrackLeave);
    this.addEventListener("click", this.#onTrackClick);
    this.addEventListener("dblclick", this.#onTrackDblClick);
  }

  #showGhost() {
    if (!this.#ghostHandle) return;
    this.#ghostHandle.style.opacity = "1";
  }

  #hideGhost() {
    if (!this.#ghostHandle) return;
    this.#ghostHandle.style.opacity = "0";
  }

  #onTrackEnter = () => {
    if (this.#handleDragging) return;
    this.#showGhost();
  };

  #onTrackLeave = () => {
    this.#hideGhost();
  };

  #onTrackMove = (e) => {
    if (this.#handleDragging) {
      this.#hideGhost();
      return;
    }
    if (!this.#ghostHandle || !this.#track) return;
    if (e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) {
      this.#hideGhost();
      return;
    }
    const trackRect = this.#track.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(1, (e.clientX - trackRect.left) / trackRect.width),
    );
    this.#ghostHandle.style.left = `${pct * 100}%`;
    const color = this.#sampleGradientColor(pct);
    this.#ghostHandle.setAttribute("color", color);
    this.#showGhost();
  };

  #distributeStops() {
    const count = this.#gradient.stops.length;
    if (count < 2) return;
    for (let i = 0; i < count; i++) {
      this.#gradient.stops[i].position = Math.round((i / (count - 1)) * 100);
    }
    this.#syncHandles();
    this.#syncChit();
    this.#emitInput();
    this.#emitChange();
  }

  #onTrackDblClick = (e) => {
    if (!this.#track) return;
    if (!e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) return;
    this.#distributeStops();
    this.#track.querySelectorAll("fig-handle[selected]").forEach((h) => {
      h.removeAttribute("selected");
    });
  };

  #onTrackClick = (e) => {
    if (!this.#track) return;
    if (this.#handleDragging) return;
    if (this.#addedOnPointerDown) {
      this.#addedOnPointerDown = false;
      return;
    }
    if (e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) {
      if (e.shiftKey) {
        const clickedHandle = e.target.closest("fig-handle");
        const stopIdx = parseInt(clickedHandle?.dataset.stopIndex, 10);
        this.#distributeStops();
        if (!isNaN(stopIdx)) {
          this.#track
            .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
            .forEach((h) => {
              if (parseInt(h.dataset.stopIndex, 10) === stopIdx) h.select();
              else h.deselect();
            });
        }
        e.stopPropagation();
      }
      return;
    }
    const trackRect = this.#track.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(1, (e.clientX - trackRect.left) / trackRect.width),
    );
    const position = Math.round(pct * 100);
    const color = this.#sampleGradientColor(pct);
    this.#gradient.stops.push({ position, color, opacity: 100 });
    this.#gradient.stops.sort((a, b) => a.position - b.position);
    const newIndex = this.#gradient.stops.findIndex(
      (s) => s.position === position && s.color === color,
    );
    this.#syncHandles();
    this.#syncChit();
    this.#emitInput();
    this.#emitChange();

    requestAnimationFrame(() => {
      const handles = this.#track.querySelectorAll(
        "fig-handle:not(.fig-input-gradient-ghost)",
      );
      const newHandle = handles[newIndex];
      if (newHandle) newHandle.click();
    });
  };

  #repositionHandles() {
    this.#repositionRAF = null;
    if (!this.isConnected) return;
    if (!this.#track) return;
    const stops = this.#gradient.stops;
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((h, i) => {
        if (i >= stops.length) return;
        h.removeAttribute("value");
        h.setAttribute("value", `${stops[i].position}% 50%`);
      });
  }

  refreshLayout() {
    this.#repositionHandles();
  }

  #scheduleRepositionHandles() {
    if (this.#repositionRAF !== null) return;
    this.#repositionRAF = requestAnimationFrame(() => this.#repositionHandles());
  }

  #syncHandles() {
    if (!this.#track) return;
    const handles = this.#track.querySelectorAll(
      "fig-handle:not(.fig-input-gradient-ghost)",
    );
    const stops = this.#gradient.stops;

    if (handles.length !== stops.length) {
      const ghost = this.#ghostHandle;
      this.#track.innerHTML = this.#buildStopHandles();
      if (ghost) this.#track.appendChild(ghost);
      this.#syncHandleMode();
      this.#reobserveHandleColors();
      this.#scheduleRepositionHandles();
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const h = handles[i];
      const stop = stops[i];
      h.dataset.stopIndex = i;
      h.setAttribute("value", `${stop.position}% 50%`);
      h.setAttribute("color", this.#stopColorCSS(stop));
      if (this.#stopHandleMode === "tip") {
        h.setAttribute("tip", "color");
      } else {
        h.removeAttribute("tip");
      }
      const tip = h.closest("fig-tooltip");
      if (tip) tip.setAttribute("text", `${Math.round(stop.position)}%`);
    }
    this.#syncHandleMode();
  }

  #syncHandleMode() {
    if (!this.#track) return;
    const useTip = this.#stopHandleMode === "tip";
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((handle) => {
        if (useTip) handle.setAttribute("tip", "color");
        else handle.removeAttribute("tip");
      });
    if (this.#ghostHandle) {
      if (useTip) this.#ghostHandle.setAttribute("tip", "add");
      else this.#ghostHandle.removeAttribute("tip");
    }
  }

  #reobserveHandleColors() {
    if (!this.#colorObserver || !this.#track) return;
    this.#colorObserver.disconnect();
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((h) => {
        this.#colorObserver.observe(h, {
          attributes: true,
          attributeFilter: ["color"],
        });
      });
  }

  #syncStopIndices() {
    if (!this.#track) return;
    const handles = this.#track.querySelectorAll(
      "fig-handle:not(.fig-input-gradient-ghost)",
    );
    const stops = this.#gradient.stops;
    const used = new Set();
    handles.forEach((h) => {
      const pos = Math.round(parseFloat(h.getAttribute("value")) || 0);
      const color = (h.getAttribute("color") || "").toUpperCase();
      let best = -1;
      for (let i = 0; i < stops.length; i++) {
        if (used.has(i)) continue;
        if (
          stops[i].position === pos &&
          stops[i].color.toUpperCase() === color
        ) {
          best = i;
          break;
        }
      }
      if (best === -1) {
        let minDist = Infinity;
        for (let i = 0; i < stops.length; i++) {
          if (used.has(i)) continue;
          const d = Math.abs(stops[i].position - pos);
          if (d < minDist) {
            minDist = d;
            best = i;
          }
        }
      }
      if (best !== -1) {
        used.add(best);
        h.dataset.stopIndex = best;
      }
    });
  }

  #syncChit() {
    if (!this.#chit) return;
    this.#chit.setAttribute("background", this.#buildGradientCSS());
  }

  #setupEventListeners() {
    if (!this.#track) return;

    this.#track.addEventListener("pointerdown", (e) => {
      if (this.hasAttribute("disabled")) return;
      if (e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const trackRect = this.#track.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - trackRect.left) / trackRect.width),
      );
      const position = Math.round(pct * 100);
      const color = this.#sampleGradientColor(pct);
      this.#gradient.stops.push({ position, color, opacity: 100 });
      this.#gradient.stops.sort((a, b) => a.position - b.position);
      const newIndex = this.#gradient.stops.findIndex(
        (s) => s.position === position && s.color === color,
      );
      this.#addedOnPointerDown = true;
      this.#syncHandles();
      this.#syncChit();
      this.#emitInput();
      this.#hideGhost();

      const handles = this.#track.querySelectorAll(
        "fig-handle:not(.fig-input-gradient-ghost)",
      );
      const newHandle = handles[newIndex];
      if (newHandle) {
        this.#track
          .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
          .forEach((h) => {
            if (h !== newHandle) h.deselect();
          });
        newHandle.select();
        newHandle.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            clientX: e.clientX,
            clientY: e.clientY,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            button: e.button,
            buttons: e.buttons,
          }),
        );
      }
    });

    this.#track.addEventListener("input", (e) => {
      const handle = e.target.closest("fig-handle");
      if (!handle) return;
      e.stopPropagation();
      if (e.detail?.color) {
        const idx = parseInt(handle.dataset.stopIndex, 10);
        if (!isNaN(idx) && this.#gradient.stops[idx]) {
          this.#gradient.stops[idx].color = e.detail.color;
          if (e.detail.opacity !== undefined) {
            this.#gradient.stops[idx].opacity = e.detail.opacity;
          }
          handle.setAttribute(
            "color",
            this.#stopColorCSS(this.#gradient.stops[idx]),
          );
          this.#syncChit();
          this.#emitInput();
        }
        return;
      }
      if (!this.#handleDragging) handle.style.zIndex = "5";
      this.#handleDragging = true;
      const idx = parseInt(handle.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      const px = e.detail?.px ?? 0;
      const rawPosition = Math.round(px * 100);
      let position = rawPosition;
      const trackW = this.#track.getBoundingClientRect().width;
      if (e.detail?.shiftKey) {
        position =
          Math.round(position / FigInputGradient.SHIFT_SNAP) *
          FigInputGradient.SHIFT_SNAP;
      } else {
        const snapPct = trackW > 0 ? (5 / trackW) * 100 : 0;
        for (let i = 0; i < this.#gradient.stops.length; i++) {
          if (i === idx) continue;
          if (
            Math.abs(this.#gradient.stops[i].position - position) <= snapPct
          ) {
            position = this.#gradient.stops[i].position;
            break;
          }
        }
      }
      this.#gradient.stops[idx].position = position;
      if (position !== rawPosition) {
        handle.style.left = `${(position / 100) * trackW}px`;
      }
      const tooltip = handle.closest("fig-tooltip");
      if (tooltip) {
        tooltip.text = `${Math.round(position)}%`;
        if (!tooltip.hasAttribute("show")) {
          tooltip.setAttribute("show", "true");
          handle.hideColorTip();
        }
      }
      this.#syncChit();
      this.#emitInput();
    });

    this.#track.addEventListener("change", (e) => {
      const handle = e.target.closest("fig-handle");
      if (!handle) return;
      e.stopPropagation();
      if (e.detail?.color) {
        const idx = parseInt(handle.dataset.stopIndex, 10);
        if (!isNaN(idx) && this.#gradient.stops[idx]) {
          this.#gradient.stops[idx].color = e.detail.color;
          if (e.detail.opacity !== undefined) {
            this.#gradient.stops[idx].opacity = e.detail.opacity;
          }
          handle.setAttribute(
            "color",
            this.#stopColorCSS(this.#gradient.stops[idx]),
          );
          this.#syncChit();
          this.#emitChange();
        }
        return;
      }
      handle.style.zIndex = "";
      const tooltip = handle.closest("fig-tooltip");
      if (tooltip) tooltip.removeAttribute("show");
      handle.showColorTip();
      const idx = parseInt(handle.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      const px = e.detail?.px ?? 0;
      let position = Math.round(px * 100);
      const trackW = this.#track.getBoundingClientRect().width;
      const snapPct = trackW > 0 ? (5 / trackW) * 100 : 0;
      for (let i = 0; i < this.#gradient.stops.length; i++) {
        if (i === idx) continue;
        if (Math.abs(this.#gradient.stops[i].position - position) <= snapPct) {
          position = this.#gradient.stops[i].position;
          break;
        }
      }
      this.#gradient.stops[idx].position = position;
      handle.style.left = `${(position / 100) * trackW}px`;
      this.#gradient.stops.sort((a, b) => a.position - b.position);
      this.#syncStopIndices();
      this.#syncChit();
      this.#emitChange();
      requestAnimationFrame(() => {
        this.#handleDragging = false;
      });
    });

    this.#colorObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName !== "color") continue;
        const handle = m.target;
        if (handle.classList.contains("fig-input-gradient-ghost")) continue;
        const idx = parseInt(handle.dataset.stopIndex, 10);
        if (isNaN(idx) || !this.#gradient.stops[idx]) continue;
        const newColor = handle.getAttribute("color");
        if (!newColor || !newColor.startsWith("#")) continue;
        if (newColor !== this.#gradient.stops[idx].color) {
          this.#gradient.stops[idx].color = newColor;
          this.#syncChit();
          this.#emitInput();
        }
      }
    });
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((h) => {
        this.#colorObserver.observe(h, {
          attributes: true,
          attributeFilter: ["color"],
        });
      });
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  get value() {
    return {
      type: "gradient",
      gradient: gradientToValueShape(this.#normalizeGradient(this.#gradient)),
    };
  }

  set value(val) {
    if (typeof val === "string") {
      this.setAttribute("value", val);
    } else {
      this.setAttribute("value", JSON.stringify(val));
    }
  }

  focus(options) {
    if (this.hasAttribute("disabled")) return;
    if (this.#isEditable) {
      const firstHandle = this.#firstStopHandle();
      if (firstHandle) {
        firstHandle.focus(options);
        return;
      }
    }
    HTMLElement.prototype.focus.call(this, options);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case "value":
        this.#parseValue();
        this.#syncChit();
        this.#syncHandles();
        break;
      case "disabled":
        this.#syncDisabled();
        break;
      case "edit":
        this.#render();
        if (this.#isEditable) {
          document.addEventListener("keydown", this.#onKeyDown);
        } else {
          document.removeEventListener("keydown", this.#onKeyDown);
        }
        break;
      case "mode":
        this.#syncHandleMode();
        break;
    }
  }

  #syncDisabled() {
    const disabled = this.hasAttribute("disabled");
    this.#syncFocusTarget();
    if (this.#chit) {
      if (disabled) this.#chit.setAttribute("disabled", "");
      else this.#chit.removeAttribute("disabled");
    }
    if (this.#track) {
      for (const handle of this.#track.querySelectorAll("fig-handle")) {
        if (disabled) handle.setAttribute("disabled", "");
        else handle.removeAttribute("disabled");
      }
    }
  }
}
customElements.define("fig-input-gradient", FigInputGradient);

/* Checkbox */
/**
 * A custom checkbox input element.
 * @attr {boolean} checked - Whether the checkbox is checked
 * @attr {boolean} disabled - Whether the checkbox is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The form field name
 * @attr {string} value - The value when checked
 */
class FigCheckbox extends HTMLElement {
  #labelElement = null;
  #boundHandleInput;

  constructor() {
    super();
    this.input = document.createElement("input");
    this.name = this.getAttribute("name") || "checkbox";
    this.input.value = this.getAttribute("value") || "";
    this.input.setAttribute("id", figUniqueId());
    this.input.setAttribute("name", this.name);
    this.input.setAttribute("type", "checkbox");
    this.#boundHandleInput = this.handleInput.bind(this);
  }
  connectedCallback() {
    // Reuse cloned internals when this element is duplicated via option.cloneNode(true).
    const existingInput = this.querySelector(":scope > input");
    if (existingInput) {
      this.input = existingInput;
    } else if (!this.input.parentNode) {
      this.append(this.input);
    }

    this.input.removeEventListener("change", this.#boundHandleInput);
    this.input.addEventListener("change", this.#boundHandleInput);
    this.#syncInputState();

    const existingLabel = this.querySelector(":scope > label");
    if (existingLabel) {
      this.#labelElement = existingLabel;
      this.#labelElement.setAttribute("for", this.input.id);
    }

    // Only create label if label attribute is present
    if (this.hasAttribute("label")) {
      this.#createLabel();
      this.#labelElement.innerText = this.getAttribute("label");
    }

    this.render();
  }
  static get observedAttributes() {
    return ["disabled", "label", "checked", "name", "value", "indeterminate"];
  }

  #createLabel() {
    if (!this.#labelElement) {
      this.#labelElement = document.createElement("label");
      this.#labelElement.setAttribute("for", this.input.id);
    }
    // Add to DOM if not already there and input is in the DOM
    if (
      this.#labelElement &&
      !this.#labelElement.parentNode &&
      this.input.parentNode
    ) {
      this.input.after(this.#labelElement);
    }
  }

  render() {}

  #isAttrOn(name) {
    return this.hasAttribute(name) && this.getAttribute(name) !== "false";
  }

  #syncAriaChecked() {
    if (this.input.indeterminate) {
      this.input.setAttribute("aria-checked", "mixed");
    } else {
      this.input.setAttribute("aria-checked", this.input.checked ? "true" : "false");
    }
  }

  #syncInputState() {
    const checked = this.#isAttrOn("checked");
    const indeterminate = this.#isAttrOn("indeterminate") && !checked;
    const disabled = this.#isAttrOn("disabled");
    this.input.checked = checked;
    this.input.indeterminate = indeterminate;
    this.input.disabled = disabled;
    this.input.value = this.getAttribute("value") || "";
    this.input.setAttribute("name", this.getAttribute("name") || this.name);
    if (indeterminate) {
      this.input.setAttribute("indeterminate", "true");
    } else {
      this.input.removeAttribute("indeterminate");
    }
    this.#syncAriaChecked();
  }

  focus() {
    this.input.focus();
  }

  get value() {
    return this.input.value;
  }

  set value(val) {
    this.input.value = val;
    this.setAttribute("value", val);
  }

  get checked() {
    return this.input.checked;
  }

  set checked(val) {
    this.input.checked = val;
    if (val) {
      this.setAttribute("checked", "");
    } else {
      this.removeAttribute("checked");
    }
  }

  disconnectedCallback() {
    this.input.removeEventListener("change", this.#boundHandleInput);
    this.input.remove();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (newValue) {
          this.#createLabel();
          this.#labelElement.innerText = newValue;
        } else if (this.#labelElement) {
          this.#labelElement.remove();
          this.#labelElement = null;
        }
        break;
      case "checked":
        if (this.#isAttrOn("checked") && this.hasAttribute("indeterminate")) {
          this.removeAttribute("indeterminate");
        }
        this.#syncInputState();
        break;
      case "indeterminate":
        this.#syncInputState();
        break;
      case "disabled":
        this.#syncInputState();
        break;
      case "name":
        this.input.setAttribute("name", newValue || this.name);
        break;
      case "value":
        this.input.value = newValue || "";
        break;
      default:
        this.input[name] = newValue;
        this.input.setAttribute(name, newValue);
        break;
    }
  }

  handleInput(e) {
    e.stopPropagation();
    this.input.indeterminate = false;
    this.input.removeAttribute("indeterminate");
    if (this.hasAttribute("indeterminate")) {
      this.removeAttribute("indeterminate");
    }
    this.#syncAriaChecked();
    // Sync attribute with input state (without triggering setter loop)
    if (this.input.checked) {
      this.setAttribute("checked", "");
    } else {
      this.removeAttribute("checked");
    }
    // Emit both input and change events
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        composed: true,
        detail: { checked: this.input.checked, value: this.input.value },
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { checked: this.input.checked, value: this.input.value },
      }),
    );
  }
}
customElements.define("fig-checkbox", FigCheckbox);

/* Radio */
/**
 * A custom radio input element extending FigCheckbox.
 * @attr {boolean} checked - Whether the radio is selected
 * @attr {boolean} disabled - Whether the radio is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The radio group name
 * @attr {string} value - The value when selected
 */
class FigRadio extends FigCheckbox {
  constructor() {
    super();
    this.input.setAttribute("type", "radio");
    this.input.setAttribute("name", this.getAttribute("name") || "radio");
  }
}
customElements.define("fig-radio", FigRadio);

/* Switch */
/**
 * A custom switch/toggle input element extending FigCheckbox.
 * @attr {boolean} checked - Whether the switch is on
 * @attr {boolean} disabled - Whether the switch is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The form field name
 * @attr {string} value - The value when on
 */
class FigSwitch extends FigCheckbox {
  render() {
    this.input.setAttribute("class", "switch");
    this.input.setAttribute("role", "switch");
  }
}
customElements.define("fig-switch", FigSwitch);

/* Combo Input */
/**
 * A custom combo input with text and dropdown.
 * @attr {string} options - Comma-separated list of dropdown options
 * @attr {string} placeholder - Placeholder text for the input
 * @attr {string} value - The current input value
 * @attr {boolean} disabled - Disables the input and dropdown button
 * @attr {string} experimental - Feature flag passed to internal fig-dropdown
 */
class FigComboInput extends HTMLElement {
  static observedAttributes = [
    "options",
    "placeholder",
    "value",
    "disabled",
    "experimental",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
  ];

  #usesCustomDropdown = false;
  #input = null;
  #dropdown = null;
  #button = null;
  #customDropdown = null;
  #internalUpdate = false;
  #a11yAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
  ];

  #boundHandleDropdownInput = this.#handleDropdownInput.bind(this);
  #boundHandleTextInput = this.#handleTextInput.bind(this);
  #boundHandleTextChange = this.#handleTextChange.bind(this);

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val ?? "");
  }

  #canReuseMarkup() {
    return !!this.querySelector(":scope > .input-combo");
  }

  #refreshMarkup() {
    this.#input = this.querySelector("fig-input-text");
    this.#button = this.querySelector("fig-button");
    this.#dropdown = this.querySelector("fig-dropdown");
    if (this.#input) {
      this.#input.setAttribute("value", this.value);
      this.#input.setAttribute(
        "placeholder",
        this.getAttribute("placeholder") || "",
      );
    }
    this.#syncA11yAttributes();
  }

  connectedCallback() {
    this.#customDropdown =
      Array.from(this.children).find(
        (child) => child.tagName === "FIG-DROPDOWN",
      ) || null;
    this.#usesCustomDropdown = this.#customDropdown !== null;
    if (this.#customDropdown) {
      this.#customDropdown.remove();
    }

    if (this.#canReuseMarkup()) {
      this.#refreshMarkup();
      this.#setupListeners();
    } else {
      this.#render();
      this.#setupListeners();
    }

    if (this.hasAttribute("disabled")) {
      this.#applyDisabled(true);
    }
  }

  disconnectedCallback() {
    this.#teardownListeners();
  }

  #render() {
    const options = this.#getOptions();
    const placeholder = this.getAttribute("placeholder") || "";
    const currentValue = this.value;
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? ` experimental="${experimental}"` : "";
    const dropdownLabel = this.#dropdownLabel();

    const dropdownHTML = this.#usesCustomDropdown
      ? ""
      : `<fig-dropdown type="dropdown" label="${dropdownLabel}"${expAttr}>${options.map((o) => `<option>${o.trim()}</option>`).join("")}</fig-dropdown>`;

    this.innerHTML = `<div class="input-combo">
  <fig-input-text placeholder="${placeholder}" value="${currentValue}"></fig-input-text>
  <fig-button type="select" variant="input" icon>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.87868 7.12132L8 9.24264L10.1213 7.12132" stroke="currentColor" stroke-opacity="0.9" stroke-linecap="round"/>
    </svg>
    ${dropdownHTML}
  </fig-button>
</div>`;

    this.#input = this.querySelector("fig-input-text");
    this.#button = this.querySelector("fig-button");

    if (this.#usesCustomDropdown && this.#customDropdown && this.#button) {
      if (!this.#customDropdown.hasAttribute("type")) {
        this.#customDropdown.setAttribute("type", "dropdown");
      }
      if (!this.#customDropdown.hasAttribute("label")) {
        this.#customDropdown.setAttribute("label", dropdownLabel);
      }
      if (experimental) {
        this.#customDropdown.setAttribute("experimental", experimental);
      }
      this.#button.append(this.#customDropdown);
    }

    this.#dropdown = this.querySelector("fig-dropdown");
    this.#syncA11yAttributes();
  }

  #setupListeners() {
    this.#teardownListeners();
    this.#dropdown?.addEventListener("input", this.#boundHandleDropdownInput);
    this.#input?.addEventListener("input", this.#boundHandleTextInput);
    this.#input?.addEventListener("change", this.#boundHandleTextChange);
  }

  #teardownListeners() {
    this.#dropdown?.removeEventListener("input", this.#boundHandleDropdownInput);
    this.#input?.removeEventListener("input", this.#boundHandleTextInput);
    this.#input?.removeEventListener("change", this.#boundHandleTextChange);
  }

  #handleDropdownInput(e) {
    e.stopPropagation();
    const val = e.target.closest("fig-dropdown")?.value ?? "";
    this.#internalUpdate = true;
    this.setAttribute("value", val);
    this.#internalUpdate = false;
    if (this.#input) this.#input.setAttribute("value", val);
    this.#emitInput();
    this.#emitChange();
  }

  #handleTextInput(e) {
    e.stopPropagation();
    const val = e.target.value ?? "";
    this.#internalUpdate = true;
    this.setAttribute("value", val);
    this.#internalUpdate = false;
    this.#emitInput();
  }

  #handleTextChange(e) {
    e.stopPropagation();
    const val = e.target.value ?? "";
    this.#internalUpdate = true;
    this.setAttribute("value", val);
    this.#internalUpdate = false;
    this.#emitChange();
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value },
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value },
      }),
    );
  }

  #getOptions() {
    return (this.getAttribute("options") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  #controlName() {
    return (
      this.getAttribute("aria-label") ||
      this.getAttribute("placeholder") ||
      "Combo input"
    ).trim();
  }

  #dropdownLabel() {
    return `${this.#controlName()} options`;
  }

  #syncA11yAttributes() {
    if (this.#input) {
      this.#a11yAttributes.forEach((name) => {
        const value = this.getAttribute(name);
        if (value === null) this.#input.removeAttribute(name);
        else this.#input.setAttribute(name, value);
      });
    }
    if (this.#dropdown && !this.#dropdown.hasAttribute("aria-label")) {
      this.#dropdown.setAttribute("label", this.#dropdownLabel());
    }
  }

  #applyDisabled(disabled) {
    if (this.#input) {
      if (disabled) this.#input.setAttribute("disabled", "");
      else this.#input.removeAttribute("disabled");
    }
    if (this.#button) {
      if (disabled) this.#button.setAttribute("disabled", "");
      else this.#button.removeAttribute("disabled");
    }
    if (this.#dropdown) {
      if (disabled) this.#dropdown.setAttribute("disabled", "");
      else this.#dropdown.removeAttribute("disabled");
    }
  }

  focus() {
    this.#input?.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case "options":
        if (this.#dropdown && !this.#usesCustomDropdown) {
          const options = this.#getOptions();
          this.#dropdown.innerHTML = options
            .map((o) => `<option>${o}</option>`)
            .join("");
        }
        break;
      case "placeholder":
        if (this.#input) this.#input.setAttribute("placeholder", newValue || "");
        this.#syncA11yAttributes();
        break;
      case "value":
        if (!this.#internalUpdate && this.#input) {
          this.#input.setAttribute("value", newValue || "");
        }
        break;
      case "disabled":
        this.#applyDisabled(newValue !== null && newValue !== "false");
        break;
      case "experimental":
        if (this.#dropdown) {
          if (newValue) this.#dropdown.setAttribute("experimental", newValue);
          else if (!this.#usesCustomDropdown)
            this.#dropdown.removeAttribute("experimental");
        }
        break;
      case "aria-label":
      case "aria-labelledby":
      case "aria-describedby":
      case "aria-invalid":
      case "aria-required":
        this.#syncA11yAttributes();
        break;
    }
  }
}
customElements.define("fig-combo-input", FigComboInput);

/* Chit */
/**
 * A color/gradient/image swatch element.
 * @attr {string} background - Any CSS background value: color (#FF0000, rgba(...)), gradient (linear-gradient(...)), or image (url(...))
 * @attr {string} size - Size of the chip: "small" (default) or "large"
 * @attr {boolean} selected - Whether the chip shows a selection ring
 * @attr {boolean} disabled - Whether the chip is disabled
 * @attr {number} alpha - Opacity value (0-1) to display the color with transparency
 */
class FigChit extends HTMLElement {
  #type = "color"; // 'color', 'gradient', 'image'
  #boundHandleInput = null;
  #internalUpdate = false; // Flag to prevent re-render during internal input

  constructor() {
    super();
    this.#boundHandleInput = this.#handleInput.bind(this);
  }

  static get observedAttributes() {
    return [
      "background",
      "size",
      "selected",
      "disabled",
      "alpha",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
    ];
  }

  connectedCallback() {
    this.#render();
    this.#updateAlpha();
    this.#syncA11y();
  }

  #updateAlpha() {
    const alpha = this.getAttribute("alpha");
    if (alpha !== null) {
      this.style.setProperty("--alpha", alpha);
    } else {
      this.style.removeProperty("--alpha");
    }
  }

  #detectType(bg) {
    if (!bg) return "color";
    const lower = bg.toLowerCase();
    if (lower.includes("gradient")) return "gradient";
    if (lower.includes("url(")) return "image";
    return "color";
  }

  #toHex(color) {
    if (!color) return "#D9D9D9";
    if (color.startsWith("#")) return color.slice(0, 7);
    try {
      const { ctx } = figGetSharedCanvas(1, 1);
      ctx.fillStyle = color;
      return ctx.fillStyle;
    } catch {
      return "#D9D9D9";
    }
  }

  #resolveBackground(bg) {
    if (!bg || !bg.includes("var(")) return bg;
    const prev = this.style.background;
    this.style.background = bg;
    const cs = getComputedStyle(this);
    const bgImage = cs.backgroundImage;
    const bgColor = cs.backgroundColor;
    this.style.background = prev;
    if (bgImage && bgImage !== "none") return bgImage;
    return bgColor || bg;
  }

  #render() {
    const rawBg = this.getAttribute("background") || "#D9D9D9";
    const isVar = rawBg.includes("var(");
    const bg = isVar ? this.#resolveBackground(rawBg) : rawBg;
    const newType = this.#detectType(bg);

    // Only rebuild DOM if type changes
    if (newType !== this.#type || !this.input) {
      this.#type = newType;
      this.setAttribute("data-type", this.#type);

      // Clean up old input listener if exists
      if (this.input) {
        this.input.removeEventListener("input", this.#boundHandleInput);
      }

      if (this.#type === "color") {
        const hex = this.#toHex(bg);
        this.innerHTML = `<div></div><input type="color" value="${hex}" />`;
        this.input = this.querySelector("input");
        if (!isVar) {
          this.input.addEventListener("input", this.#boundHandleInput);
        }
        this.#syncA11y();
      } else {
        this.innerHTML = "<div></div>";
        this.input = null;
        this.#syncA11y();
      }
    } else if (this.#type === "color" && this.input) {
      const hex = this.#toHex(bg);
      if (this.input.value !== hex) {
        this.input.value = hex;
      }
    }

    const isImage =
      /^(linear-gradient|radial-gradient|conic-gradient|repeating-|url)\s*\(/i.test(
        rawBg,
      );
    this.style.setProperty(
      "--chit-background",
      isImage ? rawBg : `linear-gradient(${rawBg}, ${rawBg})`,
    );
  }

  #syncA11y() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    if (this.input) {
      this.input.disabled = disabled;
      const labelledBy = this.getAttribute("aria-labelledby");
      const label = this.getAttribute("aria-label") || "Color swatch";
      const describedBy = this.getAttribute("aria-describedby");
      if (labelledBy) {
        this.input.setAttribute("aria-labelledby", labelledBy);
        this.input.removeAttribute("aria-label");
      } else {
        this.input.setAttribute("aria-label", label);
        this.input.removeAttribute("aria-labelledby");
      }
      if (describedBy) this.input.setAttribute("aria-describedby", describedBy);
      else this.input.removeAttribute("aria-describedby");
      this.removeAttribute("role");
      this.removeAttribute("aria-hidden");
      return;
    }
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-hidden", "true");
    } else {
      this.setAttribute("role", "img");
      this.removeAttribute("aria-hidden");
    }
  }

  #handleInput(e) {
    // Update background attribute without triggering full re-render
    this.#internalUpdate = true;
    this.setAttribute("background", e.target.value);
    this.#internalUpdate = false;
    // The native input/change events bubble naturally
  }

  get background() {
    return this.getAttribute("background");
  }

  set background(value) {
    this.setAttribute("background", value);
  }

  focus() {
    this.input?.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "background") {
      if (this.#internalUpdate) {
        const isImg =
          /^(linear-gradient|radial-gradient|conic-gradient|repeating-|url)\s*\(/i.test(
            newValue,
          );
        this.style.setProperty(
          "--chit-background",
          isImg ? newValue : `linear-gradient(${newValue}, ${newValue})`,
        );
        return;
      }
      this.#render();
    } else if (name === "alpha") {
      this.#updateAlpha();
    } else if (
      name === "disabled" ||
      name === "aria-label" ||
      name === "aria-labelledby" ||
      name === "aria-describedby"
    ) {
      this.#syncA11y();
    }
  }

  get alpha() {
    return this.getAttribute("alpha");
  }

  set alpha(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("alpha");
    } else {
      this.setAttribute("alpha", value);
    }
  }
}
customElements.define("fig-chit", FigChit);
class FigSwatch extends FigChit {}
customElements.define("fig-swatch", FigSwatch);

/* Media */
/**
 * @attr {string} src - Media source URL
 * @attr {string} type - "image" (default) or "video" (for fig-media)
 * @attr {string} alt - Alt text for the generated image (default "")
 * @attr {boolean} upload - Show upload overlay (generates fig-input-file)
 * @attr {string} label - Upload button label (default "Upload")
 * @attr {string} size - small | medium | large | auto (token-sized square)
 * @attr {string} aspect-ratio - CSS aspect-ratio value
 * @attr {string} fit - CSS object-fit value
 * @attr {boolean} checkerboard - Show checkerboard behind transparent media
 * @attr {boolean} controls - Video controls visibility (default false)
 * @attr {boolean} autoplay - Video autoplay
 * @attr {boolean} loop - Video loop
 * @attr {boolean} muted - Video muted
 * @attr {string} poster - Video poster image URL
 * @attr {string} aria-label - Accessible label forwarded to generated video
 * @attr {string} aria-labelledby - Accessible label reference forwarded to generated video
 *
 * Sizing model:
 *   - Default: host shrinkwraps to its inner <img>/<video> intrinsic size.
 *   - `size` attribute applies a token-sized square.
 *   - `aspect-ratio` attribute fills container width and applies the ratio.
 */
class FigMedia extends HTMLElement {
  #src = null;
  #mediaEl = null;
  #previewEl = null;
  #fileInput = null;
  #blobUrl = null;
  #previewSrc = null;
  #file = null;
  #boundHandleFileInput = this.#handleFileInput.bind(this);
  #boundHandleMediaPlay = this.#handleMediaPlay.bind(this);
  #boundHandleMediaPause = this.#handleMediaPause.bind(this);
  #boundHandleMediaEnded = this.#handleMediaEnded.bind(this);
  #controlsEl = null;
  #controlsWiredFor = null;
  #controlsWiredControls = null;
  #controlsSync = null;
  #controlsOnPlay = null;
  #controlsOnPause = null;
  #controlsOnSeek = null;

  static get observedAttributes() {
    return [
      "src",
      "type",
      "alt",
      "upload",
      "label",
      "aspect-ratio",
      "fit",
      "checkerboard",
      "controls",
      "autoplay",
      "loop",
      "muted",
      "poster",
      "aria-label",
      "aria-labelledby",
      "title",
    ];
  }

  get mediaKind() {
    const type = (this.getAttribute("type") || "image").toLowerCase();
    return type === "video" ? "video" : "image";
  }

  get src() {
    return this.#src;
  }
  set src(value) {
    this.#src = value || "";
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("src");
    } else {
      this.setAttribute("src", value);
    }
  }

  get file() {
    return this.#file;
  }

  #currentMediaSrc() {
    return this.#previewSrc || this.#src || "";
  }

  /**
   * Returns a base64 data URL for the loaded image.
   * Requires a CORS-clean image (same-origin or with appropriate Access-Control headers);
   * cross-origin images without proper headers will throw a tainted-canvas error.
   */
  async getBase64() {
    if (this.mediaKind !== "image") return null;
    if (!this.#currentMediaSrc()) return null;
    if (!this.#mediaEl) return null;
    try {
      if (typeof this.#mediaEl.decode === "function") {
        await this.#mediaEl.decode();
      } else if (!this.#mediaEl.complete) {
        await new Promise((resolve, reject) => {
          this.#mediaEl.addEventListener("load", resolve, { once: true });
          this.#mediaEl.addEventListener("error", reject, { once: true });
        });
      }
    } catch {
      // continue; canvas draw will throw if image truly unusable
    }
    const w = this.#mediaEl.naturalWidth;
    const h = this.#mediaEl.naturalHeight;
    if (!(w > 0) || !(h > 0)) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(this.#mediaEl, 0, 0);
    return canvas.toDataURL();
  }

  connectedCallback() {
    this.#src = this.getAttribute("src") || "";

    const ar = this.getAttribute("aspect-ratio");
    if (ar) {
      this.style.setProperty("--fig-media-aspect-ratio", ar);
    } else {
      this.style.setProperty("--fig-media-aspect-ratio", "4/3");
    }
    const fit = this.getAttribute("fit");
    if (fit) {
      this.style.setProperty("--fig-media-fit", fit);
    }

    this.querySelectorAll("fig-chit[data-generated]").forEach((el) => el.remove());
    this.#ensurePreviewElement();
    this.#ensureMediaElement();
    this.#syncGeneratedMediaElement();
    this.#syncMediaAccessibility();

    const isUpload = this.hasAttribute("upload") && this.getAttribute("upload") !== "false";
    if (isUpload && !this.querySelector("fig-input-file[data-generated]")) {
      this.#createFileInput();
    }
  }

  disconnectedCallback() {
    this.#fileInput?.removeEventListener("change", this.#boundHandleFileInput);
    this.#removeMediaElementListeners();
    this.#removeControls();
    if (this.#blobUrl) {
      URL.revokeObjectURL(this.#blobUrl);
      this.#blobUrl = null;
    }
    this.#previewSrc = null;
  }

  #removeMediaElementListeners() {
    if (!this.#mediaEl) return;
    if (this.#mediaEl.tagName === "VIDEO") {
      this.#mediaEl.removeEventListener("play", this.#boundHandleMediaPlay);
      this.#mediaEl.removeEventListener("pause", this.#boundHandleMediaPause);
      this.#mediaEl.removeEventListener("ended", this.#boundHandleMediaEnded);
    }
  }

  #ensurePreviewElement() {
    if (this.#previewEl?.isConnected) return;
    const existing = this.querySelector(":scope > fig-preview");
    if (existing) {
      this.#previewEl = existing;
      return;
    }
    const preview = document.createElement("fig-preview");
    preview.setAttribute("data-generated", "");
    this.prepend(preview);
    this.#previewEl = preview;
  }

  #userProvidedMediaEl() {
    const tag = this.mediaKind === "video" ? "video" : "img";
    return this.querySelector(`${tag}:not([data-generated])`);
  }

  #ensureMediaElement() {
    const userEl = this.#userProvidedMediaEl();
    if (userEl) {
      this.#ensurePreviewElement();
      if (this.#mediaEl && this.#mediaEl !== userEl) {
        this.#removeMediaElementListeners();
        if (this.#mediaEl.hasAttribute("data-generated")) {
          this.#mediaEl.remove();
        }
      }
      this.#mediaEl = userEl;
      if (this.#previewEl && userEl.parentElement !== this.#previewEl) {
        this.#previewEl.append(userEl);
      }
      this.#syncMediaAccessibility();
      return;
    }

    this.#ensurePreviewElement();
    const expectedTag = this.mediaKind === "video" ? "VIDEO" : "IMG";
    if (this.#mediaEl && this.#mediaEl.tagName !== expectedTag) {
      this.#removeMediaElementListeners();
      if (this.#mediaEl.hasAttribute("data-generated")) {
        this.#mediaEl.remove();
      }
      this.#mediaEl = null;
    }
    if (this.#mediaEl) return;

    if (this.mediaKind === "video") {
      const video = document.createElement("video");
      video.setAttribute("data-generated", "");
      video.className = "fig-media-element";
      video.setAttribute("playsinline", "");
      video.preload = "auto";
      this.#previewEl.append(video);
      this.#mediaEl = video;
      this.#mediaEl.addEventListener("play", this.#boundHandleMediaPlay);
      this.#mediaEl.addEventListener("pause", this.#boundHandleMediaPause);
      this.#mediaEl.addEventListener("ended", this.#boundHandleMediaEnded);
      const seekToFirstFrame = () => {
        if (this.#mediaEl?.autoplay) return;
        try {
          this.#mediaEl.currentTime = 0.001;
        } catch {}
      };
      this.#mediaEl.addEventListener("loadedmetadata", seekToFirstFrame, { once: true });
    } else {
      const img = document.createElement("img");
      img.setAttribute("data-generated", "");
      img.className = "fig-media-element";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = this.getAttribute("alt") || "";
      this.#previewEl.append(img);
      this.#mediaEl = img;
    }
  }

  #syncMediaAccessibility() {
    if (!this.#mediaEl) return;
    if (this.#mediaEl.tagName === "IMG") {
      if (
        this.hasAttribute("alt") ||
        this.#mediaEl.hasAttribute("data-generated")
      ) {
        this.#mediaEl.alt = this.getAttribute("alt") || "";
      }
      return;
    }
    if (this.#mediaEl.tagName !== "VIDEO") return;
    ["aria-label", "aria-labelledby", "title"].forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.#mediaEl.removeAttribute(name);
      } else {
        this.#mediaEl.setAttribute(name, value);
      }
    });
  }

  #isEnabledAttr(name, defaultEnabled = false) {
    if (!this.hasAttribute(name)) return defaultEnabled;
    return this.getAttribute(name) !== "false";
  }

  #syncGeneratedMediaElement() {
    if (!this.#mediaEl) return;
    if (!this.#mediaEl.hasAttribute("data-generated")) return;
    const src = this.#currentMediaSrc();
    if (this.#mediaEl.getAttribute("src") !== src) {
      if (src) {
        this.#mediaEl.setAttribute("src", src);
      } else {
        this.#mediaEl.removeAttribute("src");
        if (this.#mediaEl.tagName === "VIDEO") this.#mediaEl.load();
      }
    }
    if (this.#mediaEl.tagName === "IMG") {
      this.#syncMediaAccessibility();
      return;
    }
    const poster = this.getAttribute("poster");
    if (poster) {
      this.#mediaEl.setAttribute("poster", poster);
    } else {
      this.#mediaEl.removeAttribute("poster");
    }
    this.#mediaEl.controls = false;
    this.#mediaEl.removeAttribute("controls");
    this.#mediaEl.autoplay = this.#isEnabledAttr("autoplay", false);
    this.#mediaEl.loop = this.#isEnabledAttr("loop", false);
    this.#mediaEl.muted = this.#isEnabledAttr("muted", false);
    this.#mediaEl.playsInline = true;
    this.#syncMediaAccessibility();
    this.#syncControlsVisibility();
  }

  get mediaEl() {
    return this.#mediaEl;
  }

  #syncControlsVisibility() {
    if (this.mediaKind !== "video") {
      this.#removeControls();
      return;
    }
    const userControls = this.querySelector(
      ":scope > fig-media-controls:not([data-generated])",
    );
    if (userControls) {
      if (this.#controlsEl !== userControls) {
        this.#removeControls();
        this.#controlsEl = userControls;
      }
      this.#wireControlsToMedia();
      return;
    }
    if (this.#isEnabledAttr("controls", false)) {
      this.#ensureControls();
    } else {
      this.#removeControls();
    }
  }

  #ensureControls() {
    if (this.#controlsEl && this.#controlsEl.isConnected) {
      this.#wireControlsToMedia();
      return;
    }
    const controls = document.createElement("fig-media-controls");
    controls.setAttribute("data-generated", "");
    this.append(controls);
    this.#controlsEl = controls;
    this.#wireControlsToMedia();
  }

  #wireControlsToMedia() {
    if (!this.#controlsEl || !this.#mediaEl) return;
    if (
      this.#controlsWiredFor === this.#mediaEl &&
      this.#controlsWiredControls === this.#controlsEl
    ) {
      return;
    }
    this.#unwireControls();

    const controls = this.#controlsEl;
    const video = this.#mediaEl;
    this.#controlsWiredFor = video;
    this.#controlsWiredControls = controls;

    let pendingSeekTime = null;
    const syncFromVideo = () => {
      controls.playing = !video.paused && !video.ended;
      if (Number.isFinite(video.duration)) controls.duration = video.duration;
      if (pendingSeekTime !== null) {
        if (Math.abs(video.currentTime - pendingSeekTime) < 0.25) {
          pendingSeekTime = null;
        } else {
          return;
        }
      }
      controls.time = video.currentTime || 0;
    };
    const onPlay = () => {
      const p = video.play?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const onPause = () => video.pause?.();
    const onSeek = (e) => {
      const next = Number(e?.detail?.time);
      if (!Number.isFinite(next)) return;
      pendingSeekTime = next;
      try { video.currentTime = next; } catch {}
    };

    this.#controlsSync = syncFromVideo;
    this.#controlsOnPlay = onPlay;
    this.#controlsOnPause = onPause;
    this.#controlsOnSeek = onSeek;

    video.addEventListener("play", syncFromVideo);
    video.addEventListener("pause", syncFromVideo);
    video.addEventListener("ended", syncFromVideo);
    video.addEventListener("timeupdate", syncFromVideo);
    video.addEventListener("loadedmetadata", syncFromVideo);
    video.addEventListener("durationchange", syncFromVideo);
    video.addEventListener("seeked", syncFromVideo);
    controls.addEventListener("play", onPlay);
    controls.addEventListener("pause", onPause);
    controls.addEventListener("seek", onSeek);

    syncFromVideo();
  }

  #unwireControls() {
    const video = this.#controlsWiredFor;
    const controls = this.#controlsWiredControls;
    if (video && this.#controlsSync) {
      video.removeEventListener("play", this.#controlsSync);
      video.removeEventListener("pause", this.#controlsSync);
      video.removeEventListener("ended", this.#controlsSync);
      video.removeEventListener("timeupdate", this.#controlsSync);
      video.removeEventListener("loadedmetadata", this.#controlsSync);
      video.removeEventListener("durationchange", this.#controlsSync);
      video.removeEventListener("seeked", this.#controlsSync);
    }
    if (controls) {
      if (this.#controlsOnPlay) controls.removeEventListener("play", this.#controlsOnPlay);
      if (this.#controlsOnPause) controls.removeEventListener("pause", this.#controlsOnPause);
      if (this.#controlsOnSeek) controls.removeEventListener("seek", this.#controlsOnSeek);
    }
    this.#controlsWiredFor = null;
    this.#controlsWiredControls = null;
    this.#controlsSync = null;
    this.#controlsOnPlay = null;
    this.#controlsOnPause = null;
    this.#controlsOnSeek = null;
  }

  #removeControls() {
    this.#unwireControls();
    if (!this.#controlsEl) return;
    if (this.#controlsEl.hasAttribute("data-generated")) {
      this.#controlsEl.remove();
    }
    this.#controlsEl = null;
  }

  toggle() {
    if (!this.#mediaEl || this.mediaKind !== "video") return;
    if (this.#mediaEl.paused || this.#mediaEl.ended) this.play();
    else this.pause();
  }

  play() {
    if (this.mediaKind !== "video" || !this.#mediaEl) return;
    const p = this.#mediaEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  pause() {
    if (this.mediaKind !== "video" || !this.#mediaEl) return;
    this.#mediaEl.pause();
  }

  #createFileInput() {
    const fi = document.createElement("fig-input-file");
    fi.setAttribute("data-generated", "");
    fi.setAttribute("accepts", this.mediaKind === "video" ? "video/*" : "image/*");
    fi.setAttribute("variant", "overlay");
    const defaultLabel = this.getAttribute("label") || "Upload";
    fi.setAttribute("label", this.#src ? "Replace" : defaultLabel);
    if (this.#file?.name) {
      fi.setAttribute("filename", this.#file.name);
    } else if (this.#src) {
      fi.setAttribute("url", this.#src);
    }
    fi.addEventListener("change", this.#boundHandleFileInput);
    this.#ensurePreviewElement();
    this.#previewEl.append(fi);
    this.#fileInput = fi;
  }

  #removeFileInput() {
    if (this.#fileInput) {
      this.#fileInput.removeEventListener("change", this.#boundHandleFileInput);
      this.#fileInput.remove();
      this.#fileInput = null;
    }
  }

  #handleFileInput(e) {
    if (e.target !== this.#fileInput) return;
    const file = e.detail?.files?.[0];
    const cleared = e.detail?.cleared === true;

    if (!file) {
      if (this.#blobUrl) {
        URL.revokeObjectURL(this.#blobUrl);
        this.#blobUrl = null;
      }
      this.#file = null;
      this.#previewSrc = null;
      if (cleared) this.src = "";
      this.#syncGeneratedMediaElement();
      if (this.#fileInput) {
        const defaultLabel = this.getAttribute("label") || "Upload";
        this.#fileInput.setAttribute("label", this.#src ? "Replace" : defaultLabel);
        this.#fileInput.removeAttribute("filename");
        if (this.#src) {
          this.#fileInput.setAttribute("url", this.#src);
        } else {
          this.#fileInput.removeAttribute("url");
        }
      }
      this.dispatchEvent(
        new CustomEvent("change", { bubbles: true, cancelable: true }),
      );
      return;
    }

    if (this.#blobUrl) {
      URL.revokeObjectURL(this.#blobUrl);
    }
    this.#file = file;
    this.#blobUrl = URL.createObjectURL(file);
    this.#previewSrc = this.#blobUrl;

    this.#syncGeneratedMediaElement();

    this.dispatchEvent(
      new CustomEvent("loaded", {
        bubbles: true,
        cancelable: true,
        detail: { file, src: this.#blobUrl },
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, cancelable: true }),
    );

    if (this.#fileInput) {
      this.#fileInput.removeAttribute("url");
      this.#fileInput.setAttribute("filename", file.name);
      this.#fileInput.setAttribute("label", "Replace");
    }
  }

  #emitPlaybackEvent(type) {
    if (!this.#mediaEl) return;
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          src: this.#src || "",
          currentTime: this.#mediaEl.currentTime,
          duration: this.#mediaEl.duration,
        },
      }),
    );
  }

  #handleMediaPlay() {
    this.#emitPlaybackEvent("play");
  }

  #handleMediaPause() {
    this.#emitPlaybackEvent("pause");
  }

  #handleMediaEnded() {
    this.#emitPlaybackEvent("ended");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "src") {
      const nextSrc = newValue || "";
      const isCurrentPreviewBlob =
        nextSrc && (nextSrc === this.#previewSrc || nextSrc === this.#blobUrl);
      this.#src = nextSrc;
      if (this.#blobUrl && !isCurrentPreviewBlob) {
        URL.revokeObjectURL(this.#blobUrl);
        this.#blobUrl = null;
        this.#previewSrc = null;
        this.#file = null;
      }
      this.#syncGeneratedMediaElement();
      if (this.#fileInput) {
        const defaultLabel = this.getAttribute("label") || "Upload";
        this.#fileInput.setAttribute("label", this.#src ? "Replace" : defaultLabel);
        if (this.#src) {
          if (this.#file?.name) {
            this.#fileInput.removeAttribute("url");
            this.#fileInput.setAttribute("filename", this.#file.name);
          } else {
            this.#fileInput.setAttribute("url", this.#src);
            this.#fileInput.removeAttribute("filename");
          }
        } else {
          this.#fileInput.removeAttribute("url");
          this.#fileInput.removeAttribute("filename");
        }
      }
    }

    if (name === "type") {
      this.#ensureMediaElement();
      this.#syncGeneratedMediaElement();
      if (this.#fileInput) {
        this.#fileInput.setAttribute(
          "accepts",
          this.mediaKind === "video" ? "video/*" : "image/*",
        );
      }
    }

    if (["alt", "aria-label", "aria-labelledby", "title"].includes(name)) {
      this.#syncMediaAccessibility();
    }

    if (name === "upload") {
      const on = newValue !== null && newValue !== "false";
      if (on && !this.#fileInput) {
        this.#createFileInput();
      } else if (!on) {
        this.#removeFileInput();
      }
    }

    if (name === "aspect-ratio") {
      if (newValue) {
        this.style.setProperty("--fig-media-aspect-ratio", newValue);
      } else {
        this.style.removeProperty("--fig-media-aspect-ratio");
      }
    }

    if (name === "fit") {
      if (newValue) {
        this.style.setProperty("--fig-media-fit", newValue);
      } else {
        this.style.removeProperty("--fig-media-fit");
      }
    }

    if (name === "label" && this.#fileInput) {
      const defaultLabel = this.getAttribute("label") || "Upload";
      this.#fileInput.setAttribute("label", this.#src ? "Replace" : defaultLabel);
    }

    if (["controls", "autoplay", "loop", "muted", "poster"].includes(name)) {
      this.#syncGeneratedMediaElement();
    }
  }
}

customElements.define("fig-media", FigMedia);

class FigImage extends FigMedia {
  get mediaKind() {
    return "image";
  }
}
customElements.define("fig-image", FigImage);

class FigVideo extends FigMedia {
  get mediaKind() {
    return "video";
  }
}
customElements.define("fig-video", FigVideo);

/**
 * <fig-media-controls> — Standalone playback controls UI.
 *
 * Renders a play/pause button, a scrubber slider, and a MM:SS time display.
 * Holds its own state via attributes — no media element required.
 *
 * Attributes:
 *   - `playing` (boolean presence) — current play/pause state
 *   - `duration` (number, seconds) — total track length
 *   - `time` (number, seconds) — current playhead position
 *
 * Events:
 *   - `play` — emitted when the user toggles playback on (detail: { playing: true })
 *   - `pause` — emitted when the user toggles playback off (detail: { playing: false })
 *   - `seek` — emitted when the user drags the scrubber (detail: { time })
 *
 * Properties: `playing`, `duration`, `time` mirror the attributes.
 */
class FigMediaControls extends HTMLElement {
  #playBtn = null;
  #playTooltip = null;
  #timeSlider = null;
  #timeEl = null;
  #userSeeking = false;
  #rendered = false;

  static get observedAttributes() {
    return ["playing", "duration", "time"];
  }

  connectedCallback() {
    this.#render();
    this.#syncPlayingUi();
    this.#syncTimeUi();
  }

  get playing() {
    return this.hasAttribute("playing") && this.getAttribute("playing") !== "false";
  }
  set playing(value) {
    if (value) this.setAttribute("playing", "");
    else this.removeAttribute("playing");
  }

  get duration() {
    const n = Number(this.getAttribute("duration"));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  set duration(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      this.removeAttribute("duration");
      return;
    }
    this.setAttribute("duration", String(n));
  }

  get time() {
    const n = Number(this.getAttribute("time"));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  set time(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      this.removeAttribute("time");
      return;
    }
    this.setAttribute("time", String(n));
  }

  attributeChangedCallback(name) {
    if (!this.#rendered) return;
    if (name === "playing") this.#syncPlayingUi();
    if (name === "duration" || name === "time") this.#syncTimeUi();
  }

  #render() {
    if (this.#rendered) return;
    this.#rendered = true;
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-label", "Media controls");
    }

    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Play");
    const btn = document.createElement("fig-button");
    btn.setAttribute("variant", "ghost");
    btn.setAttribute("size", "small");
    btn.setAttribute("icon", "true");
    btn.setAttribute("aria-label", "Play");
    const icon = createFigIcon("play", {
      className: "fig-media-controls-play-icon",
    });
    btn.append(icon);
    tooltip.append(btn);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    const slider = document.createElement("fig-slider");
    slider.setAttribute("text", "false");
    slider.setAttribute("min", "0");
    slider.setAttribute("max", String(this.duration));
    slider.setAttribute("step", "1");
    slider.setAttribute("value", String(this.time));
    slider.setAttribute("full", "");
    slider.setAttribute("aria-label", "Seek");
    slider.setAttribute(
      "aria-valuetext",
      this.#formatTimeValueText(this.time, this.duration),
    );
    const timeEl = document.createElement("span");
    timeEl.className = "fig-media-controls-time";
    timeEl.textContent = this.#formatTime(this.time);

    const handleSeek = (e) => {
      const host = e.currentTarget;
      const next = Number(host?.value);
      if (!Number.isFinite(next)) return;
      this.#userSeeking = true;
      this.setAttribute("time", String(next));
      this.dispatchEvent(
        new CustomEvent("seek", {
          bubbles: true,
          composed: true,
          detail: { time: next },
        }),
      );
      requestAnimationFrame(() => {
        this.#userSeeking = false;
      });
    };
    slider.addEventListener("input", handleSeek);
    slider.addEventListener("change", handleSeek);

    this.append(tooltip, slider, timeEl);

    this.#playBtn = btn;
    this.#playTooltip = tooltip;
    this.#timeSlider = slider;
    this.#timeEl = timeEl;
  }

  #formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  #formatTimeValueText(time, duration = 0) {
    const current = this.#formatTime(time);
    if (!Number.isFinite(duration) || duration <= 0) return current;
    return `${current} of ${this.#formatTime(duration)}`;
  }

  #syncPlayingUi() {
    if (!this.#playBtn) return;
    const playing = this.playing;
    this.#playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.#playTooltip?.setAttribute("text", playing ? "Pause" : "Play");
    const icon = this.#playBtn.querySelector(".fig-media-controls-play-icon");
    if (icon) {
      icon.setAttribute("name", playing ? "pause" : "play");
    }
  }

  #syncTimeUi() {
    if (!this.#timeSlider) return;
    const duration = this.duration;
    if (Number(this.#timeSlider.getAttribute("max")) !== duration) {
      this.#timeSlider.setAttribute("max", String(duration));
    }
    const t = this.time;
    if (!this.#userSeeking) {
      this.#timeSlider.setAttribute("value", String(t));
    }
    this.#timeSlider.setAttribute(
      "aria-valuetext",
      this.#formatTimeValueText(t, duration),
    );
    if (this.#timeEl) this.#timeEl.textContent = this.#formatTime(t);
  }

  toggle() {
    const next = !this.playing;
    this.playing = next;
    this.dispatchEvent(
      new CustomEvent(next ? "play" : "pause", {
        bubbles: true,
        composed: true,
        detail: { playing: next },
      }),
    );
  }

  play() {
    if (this.playing) return;
    this.toggle();
  }

  pause() {
    if (!this.playing) return;
    this.toggle();
  }
}
customElements.define("fig-media-controls", FigMediaControls);

/* File Upload Input */
class FigInputFile extends HTMLElement {
  static observedAttributes = ["accepts", "label", "disabled", "multiple", "variant", "url", "filename"];

  #fileInput = null;
  #filenameEl = null;
  #clearBtn = null;
  #tooltipEl = null;
  #uploadBtn = null;
  #files = null;

  get files() {
    return this.#files;
  }

  get #urlFilename() {
    const filename = this.getAttribute("filename");
    if (filename) return filename;
    const url = this.getAttribute("url");
    if (!url) return "";
    try {
      const path = new URL(url, location.href).pathname;
      const name = path.split("/").pop();
      return name ? decodeURIComponent(name) : url;
    } catch {
      return url;
    }
  }

  get value() {
    if (this.#files && this.#files.length > 0) {
      if (this.#files.length === 1) return this.#files[0].name;
      return `${this.#files.length} files`;
    }
    return this.#urlFilename;
  }

  connectedCallback() {
    this.#render();
    this.addEventListener("dragover", this.#onDragOver);
    this.addEventListener("dragleave", this.#onDragLeave);
    this.addEventListener("drop", this.#onDrop);
  }

  disconnectedCallback() {
    this.#fileInput?.removeEventListener("change", this.#onFileChange);
    this.#clearBtn?.removeEventListener("click", this.#onClear);
    this.removeEventListener("dragover", this.#onDragOver);
    this.removeEventListener("dragleave", this.#onDragLeave);
    this.removeEventListener("drop", this.#onDrop);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.#render();
  }

  clear() {
    this.#files = null;
    if (this.#fileInput) this.#fileInput.value = "";
    this.removeAttribute("url");
    this.removeAttribute("filename");
    this.#render();
    this.#emitEvents({ cleared: true });
  }

  #emitEvents(extraDetail = {}) {
    const detail = { files: this.#files, ...extraDetail };
    this.dispatchEvent(new CustomEvent("input", { detail, bubbles: true }));
    this.dispatchEvent(new CustomEvent("change", { detail, bubbles: true }));
  }

  #onFileChange = () => {
    if (this.#fileInput.files.length > 0) {
      this.#files = this.#fileInput.files;
      this.removeAttribute("url");
      this.#render();
      this.#emitEvents();
    }
  };

  #onClear = (e) => {
    e.stopPropagation();
    this.clear();
  };

  #onDragOver = (e) => {
    e.preventDefault();
    if (!this.hasAttribute("dragover")) {
      this.setAttribute("dragover", "");
      if (this.#uploadBtn) {
        this.#uploadBtn.dataset.prevText = this.#uploadBtn.textContent;
        this.#uploadBtn.textContent = "Drop file";
      }
    }
  };

  #onDragLeave = () => {
    this.removeAttribute("dragover");
    if (this.#uploadBtn && this.#uploadBtn.dataset.prevText !== undefined) {
      this.#uploadBtn.textContent = this.#uploadBtn.dataset.prevText;
      delete this.#uploadBtn.dataset.prevText;
    }
  };

  #onDrop = (e) => {
    e.preventDefault();
    this.removeAttribute("dragover");
    if (this.#uploadBtn && this.#uploadBtn.dataset.prevText !== undefined) {
      this.#uploadBtn.textContent = this.#uploadBtn.dataset.prevText;
      delete this.#uploadBtn.dataset.prevText;
    }
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;

    const accepts = this.getAttribute("accepts");
    let dropped = Array.from(e.dataTransfer.files);
    if (accepts) {
      const allowed = accepts.split(",").map((s) => s.trim().toLowerCase());
      dropped = dropped.filter((file) => {
        const ext = "." + file.name.split(".").pop().toLowerCase();
        const mime = file.type.toLowerCase();
        return allowed.some(
          (a) =>
            a === ext ||
            a === mime ||
            (a.endsWith("/*") && mime.startsWith(a.slice(0, -1))),
        );
      });
    }
    if (!this.hasAttribute("multiple")) {
      dropped = dropped.slice(0, 1);
    }
    if (dropped.length === 0) return;

    const dt = new DataTransfer();
    dropped.forEach((f) => dt.items.add(f));
    this.#files = dt.files;
    if (this.#fileInput) {
      this.#fileInput.files = dt.files;
    }
    this.removeAttribute("url");
    this.#render();
    this.#emitEvents();
  };

  #render() {
    const accepts = this.getAttribute("accepts") || "";
    const label = this.getAttribute("label") || "Upload";
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const multiple = this.hasAttribute("multiple");
    const variant = this.getAttribute("variant") || "input";
    const hasFile =
      (this.#files && this.#files.length > 0) ||
      !!this.getAttribute("url") ||
      !!this.getAttribute("filename");

    this.innerHTML = "";

    if (hasFile) {
      const tooltipText = accepts
        ? `Accepts ${accepts
            .split(",")
            .map((s) => s.trim())
            .join(", ")}`
        : "";

      this.#uploadBtn = document.createElement("fig-button");
      this.#uploadBtn.setAttribute("variant", variant);
      this.#uploadBtn.setAttribute("type", "upload");
      this.#uploadBtn.className = "fig-input-file-filename";
      if (disabled) this.#uploadBtn.setAttribute("disabled", "");
      const truncEl = document.createElement("fig-truncate");
      truncEl.setAttribute("position", "middle");
      truncEl.setAttribute("tooltip", "");
      const filename = this.value;
      const dotIdx = filename.lastIndexOf(".");
      if (dotIdx > 0) truncEl.setAttribute("tail", filename.slice(dotIdx));
      truncEl.textContent = filename;
      this.#uploadBtn.appendChild(truncEl);

      this.#fileInput = document.createElement("input");
      this.#fileInput.type = "file";
      this.#fileInput.title = "";
      if (accepts) this.#fileInput.setAttribute("accept", accepts);
      if (multiple) this.#fileInput.setAttribute("multiple", "");
      this.#fileInput.addEventListener("change", this.#onFileChange);
      this.#uploadBtn.appendChild(this.#fileInput);

      if (tooltipText) {
        this.#tooltipEl = document.createElement("fig-tooltip");
        this.#tooltipEl.setAttribute("text", tooltipText);
        this.#tooltipEl.appendChild(this.#uploadBtn);
        this.appendChild(this.#tooltipEl);
      } else {
        this.appendChild(this.#uploadBtn);
      }

      const clearTooltip = document.createElement("fig-tooltip");
      clearTooltip.setAttribute("text", "Remove");
      this.#clearBtn = document.createElement("fig-button");
      this.#clearBtn.setAttribute("variant", variant === "overlay" ? "overlay" : "ghost");
      this.#clearBtn.setAttribute("icon", "true");
      this.#clearBtn.setAttribute("aria-label", "Remove");
      this.#clearBtn.className = "fig-input-file-clear";
      if (disabled) this.#clearBtn.setAttribute("disabled", "");
      this.#clearBtn.replaceChildren(createFigIcon("minus"));
      this.#clearBtn.addEventListener("click", this.#onClear);
      clearTooltip.appendChild(this.#clearBtn);
      this.appendChild(clearTooltip);
    } else {
      const tooltipText = accepts
        ? `Accepts ${accepts
            .split(",")
            .map((s) => s.trim())
            .join(", ")}`
        : "";

      if (tooltipText) {
        this.#tooltipEl = document.createElement("fig-tooltip");
        this.#tooltipEl.setAttribute("text", tooltipText);
      }

      this.#uploadBtn = document.createElement("fig-button");
      this.#uploadBtn.setAttribute("variant", variant);
      this.#uploadBtn.setAttribute("type", "upload");
      this.#uploadBtn.textContent = label;
      if (disabled) this.#uploadBtn.setAttribute("disabled", "");

      this.#fileInput = document.createElement("input");
      this.#fileInput.type = "file";
      this.#fileInput.title = "";
      if (accepts) this.#fileInput.setAttribute("accept", accepts);
      if (multiple) this.#fileInput.setAttribute("multiple", "");
      this.#fileInput.addEventListener("change", this.#onFileChange);
      this.#uploadBtn.appendChild(this.#fileInput);

      if (this.#tooltipEl) {
        this.#tooltipEl.appendChild(this.#uploadBtn);
        this.appendChild(this.#tooltipEl);
      } else {
        this.appendChild(this.#uploadBtn);
      }
    }
  }
}
customElements.define("fig-input-file", FigInputFile);

/**
 * A bezier / spring easing curve editor with draggable control points.
 * @attr {string} value - Bezier: "0.42, 0, 0.58, 1" or Spring: "spring(200, 15, 1)"
 * @attr {number} precision - Decimal places for output values (default 2)
 * @attr {boolean} edit - Show the editor and custom preset options (default true; set "false" for presets only)
 */
class FigEasingCurve extends HTMLElement {
  #cp1 = { x: 0.42, y: 0 };
  #cp2 = { x: 0.58, y: 1 };
  #spring = { stiffness: 200, damping: 15, mass: 1 };
  #mode = "bezier";
  #precision = 2;
  #isDragging = null;
  #svg = null;
  #curve = null;
  #line1 = null;
  #line2 = null;
  #handle1 = null;
  #handle2 = null;
  #bezierEndpointStart = null;
  #bezierEndpointEnd = null;
  #dropdown = null;
  #valueInput = null;
  #presetName = null;
  #targetLine = null;
  #springDuration = 0.8;
  #drawWidth = 200;
  #drawHeight = 200;
  #bounds = null;
  #diagonal = null;
  #resizeObserver = null;
  #bezierHandleRadius = 5;
  #bezierEndpointRadius = 2;
  #durationBarWidth = 10;
  #durationBarHeight = 10;
  #durationBarRadius = 3;

  static PRESETS = [
    { group: null, name: "Linear", type: "bezier", value: [0, 0, 1, 1] },
    {
      group: "Bezier",
      name: "Ease in",
      type: "bezier",
      value: [0.42, 0, 1, 1],
    },
    {
      group: "Bezier",
      name: "Ease out",
      type: "bezier",
      value: [0, 0, 0.58, 1],
    },
    {
      group: "Bezier",
      name: "Ease in and out",
      type: "bezier",
      value: [0.42, 0, 0.58, 1],
    },
    {
      group: "Bezier",
      name: "Ease in back",
      type: "bezier",
      value: [0.6, -0.28, 0.735, 0.045],
    },
    {
      group: "Bezier",
      name: "Ease out back",
      type: "bezier",
      value: [0.175, 0.885, 0.32, 1.275],
    },
    {
      group: "Bezier",
      name: "Ease in and out back",
      type: "bezier",
      value: [0.68, -0.55, 0.265, 1.55],
    },
    { group: "Bezier", name: "Custom bezier", type: "bezier", value: null },
    {
      group: "Spring",
      name: "Gentle",
      type: "spring",
      spring: { stiffness: 120, damping: 14, mass: 1 },
    },
    {
      group: "Spring",
      name: "Quick",
      type: "spring",
      spring: { stiffness: 380, damping: 20, mass: 1 },
    },
    {
      group: "Spring",
      name: "Bouncy",
      type: "spring",
      spring: { stiffness: 250, damping: 8, mass: 1 },
    },
    {
      group: "Spring",
      name: "Slow",
      type: "spring",
      spring: { stiffness: 60, damping: 11, mass: 1 },
    },
    { group: "Spring", name: "Custom spring", type: "spring", spring: null },
  ];

  static get observedAttributes() {
    return ["value", "precision", "aspect-ratio", "edit"];
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "2");
    figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
    const val = this.getAttribute("value");
    if (val) this.#parseValue(val);
    this.#presetName = this.#matchPreset();
    this.#render();
    this.#setupResizeObserver();
  }

  disconnectedCallback() {
    this.#isDragging = null;
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      if (this.#svg) {
        this.#syncViewportSize();
        this.#updatePaths();
      }
      return;
    }

    if (name === "edit") {
      if (this.isConnected) this.#render();
      return;
    }

    if (name === "value" && newValue) {
      const prevMode = this.#mode;
      this.#parseValue(newValue);
      this.#presetName = this.#matchPreset();
      if (prevMode !== this.#mode && this.#isEditEnabled()) {
        this.#render();
      } else {
        if (this.#svg) this.#updatePaths();
        this.#syncDropdown();
        this.#syncValueInput();
      }
    }
    if (name === "precision") {
      this.#precision = parseInt(newValue || "2");
    }
  }

  get value() {
    if (this.#mode === "spring") {
      const { stiffness, damping, mass } = this.#spring;
      return `spring(${stiffness}, ${damping}, ${mass})`;
    }
    const p = this.#precision;
    return `${this.#cp1.x.toFixed(p)}, ${this.#cp1.y.toFixed(p)}, ${this.#cp2.x.toFixed(p)}, ${this.#cp2.y.toFixed(p)}`;
  }

  get cssValue() {
    if (this.#mode === "spring") {
      const points = this.#simulateSpring();
      const samples = 20;
      const step = Math.max(1, Math.floor(points.length / samples));
      const vals = [];
      for (let i = 0; i < points.length; i += step) {
        vals.push(points[i].value.toFixed(3));
      }
      if (points.length > 0)
        vals.push(points[points.length - 1].value.toFixed(3));
      return `linear(${vals.join(", ")})`;
    }
    const p = this.#precision;
    return `cubic-bezier(${this.#cp1.x.toFixed(p)}, ${this.#cp1.y.toFixed(p)}, ${this.#cp2.x.toFixed(p)}, ${this.#cp2.y.toFixed(p)})`;
  }

  get preset() {
    return this.#presetName;
  }

  set value(v) {
    this.setAttribute("value", v);
  }

  #parseValue(str) {
    const springMatch = str.match(
      /^spring\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/,
    );
    if (springMatch) {
      this.#mode = "spring";
      this.#spring.stiffness = parseFloat(springMatch[1]);
      this.#spring.damping = parseFloat(springMatch[2]);
      this.#spring.mass = parseFloat(springMatch[3]);
      return true;
    }
    const parts = str.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 4 && parts.every((n) => !isNaN(n))) {
      this.#mode = "bezier";
      this.#cp1.x = parts[0];
      this.#cp1.y = parts[1];
      this.#cp2.x = parts[2];
      this.#cp2.y = parts[3];
      return true;
    }
    return false;
  }

  #matchPreset() {
    const ep = 0.001;
    if (this.#mode === "bezier") {
      for (const p of FigEasingCurve.PRESETS) {
        if (p.type !== "bezier" || !p.value) continue;
        if (
          Math.abs(this.#cp1.x - p.value[0]) < ep &&
          Math.abs(this.#cp1.y - p.value[1]) < ep &&
          Math.abs(this.#cp2.x - p.value[2]) < ep &&
          Math.abs(this.#cp2.y - p.value[3]) < ep
        )
          return p.name;
      }
      return "Custom bezier";
    }
    for (const p of FigEasingCurve.PRESETS) {
      if (p.type !== "spring" || !p.spring) continue;
      if (
        Math.abs(this.#spring.stiffness - p.spring.stiffness) < ep &&
        Math.abs(this.#spring.damping - p.spring.damping) < ep &&
        Math.abs(this.#spring.mass - p.spring.mass) < ep
      )
        return p.name;
    }
    return "Custom spring";
  }

  // --- Spring simulation ---

  #simulateSpring() {
    const { stiffness, damping, mass } = this.#spring;
    const dt = 0.004;
    const maxTime = 5;
    const points = [];
    let pos = 0,
      vel = 0;
    for (let t = 0; t <= maxTime; t += dt) {
      const force = -stiffness * (pos - 1) - damping * vel;
      vel += (force / mass) * dt;
      pos += vel * dt;
      points.push({ t, value: pos });
      if (t > 0.1 && Math.abs(pos - 1) < 0.0005 && Math.abs(vel) < 0.0005)
        break;
    }
    return points;
  }

  static #springIcon(spring, size = 24) {
    const { stiffness, damping, mass } = spring;
    const dt = 0.004;
    const maxTime = 5;
    const pts = [];
    let pos = 0,
      vel = 0;
    for (let t = 0; t <= maxTime; t += dt) {
      const force = -stiffness * (pos - 1) - damping * vel;
      vel += (force / mass) * dt;
      pos += vel * dt;
      pts.push({ t, value: pos });
      if (t > 0.1 && Math.abs(pos - 1) < 0.001 && Math.abs(vel) < 0.001) break;
    }
    const totalTime = pts[pts.length - 1].t || 1;
    let maxVal = 1;
    for (const p of pts) if (p.value > maxVal) maxVal = p.value;
    let minVal = 0;
    for (const p of pts) if (p.value < minVal) minVal = p.value;
    const range = Math.max(maxVal - minVal, 1);
    const pad = 6;
    const s = size - pad * 2;
    const step = Math.max(1, Math.floor(pts.length / 30));
    let d = "";
    for (let i = 0; i < pts.length; i += step) {
      const x = pad + (pts[i].t / totalTime) * s;
      const y = pad + (1 - (pts[i].value - minVal) / range) * s;
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><path d="${d}" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/></svg>`;
  }

  static curveIcon(cp1x, cp1y, cp2x, cp2y, size = 24) {
    const draw = 12;
    const pad = (size - draw) / 2;
    const samples = 48;
    const points = [];

    const cubic = (p0, p1, p2, p3, t) => {
      const mt = 1 - t;
      return (
        mt * mt * mt * p0 +
        3 * mt * mt * t * p1 +
        3 * mt * t * t * p2 +
        t * t * t * p3
      );
    };

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      points.push({
        x: cubic(0, cp1x, cp2x, 1, t),
        y: cubic(0, cp1y, cp2y, 1, t),
      });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = Math.max(maxX - minX, 1e-6);
    const rangeY = Math.max(maxY - minY, 1e-6);
    const toX = (x) => pad + ((x - minX) / rangeX) * draw;
    const toY = (y) => pad + (1 - (y - minY) / rangeY) * draw;

    let d = "";
    for (let i = 0; i < points.length; i++) {
      const px = toX(points[i].x);
      const py = toY(points[i].y);
      d += `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><path d="${d}" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`;
  }

  // --- Rendering ---

  #isEditEnabled() {
    return this.getAttribute("edit") !== "false";
  }

  #render() {
    this.classList.toggle("spring-mode", this.#mode === "spring");
    this.classList.toggle("bezier-mode", this.#mode !== "spring");
    this.#syncMetricsFromCSS();
    this.innerHTML = this.#getInnerHTML();
    this.#cacheRefs();
    if (this.#svg) {
      this.#syncHandleSizes();
      this.#syncViewportSize();
      this.#updatePaths();
    }
    this.#syncValueInput();
    this.#setupEvents();
  }

  static #escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  #getDropdownHTML() {
    let optionsHTML = "";
    let currentGroup = undefined;
    for (const p of FigEasingCurve.PRESETS) {
      if (!this.#isEditEnabled() && !p.value && !p.spring) continue;
      if (p.group !== currentGroup) {
        if (currentGroup !== undefined) optionsHTML += `</optgroup>`;
        if (p.group) optionsHTML += `<optgroup label="${p.group}">`;
        currentGroup = p.group;
      }
      let icon;
      if (p.type === "spring") {
        const sp = p.spring || this.#spring;
        icon = FigEasingCurve.#springIcon(sp);
      } else {
        const v = p.value || [
          this.#cp1.x,
          this.#cp1.y,
          this.#cp2.x,
          this.#cp2.y,
        ];
        icon = FigEasingCurve.curveIcon(...v);
      }
      const selected = p.name === this.#presetName ? " selected" : "";
      optionsHTML += `<option value="${p.name}"${selected}>${icon} ${p.name}</option>`;
    }
    if (currentGroup) optionsHTML += `</optgroup>`;
    return `<fig-dropdown class="fig-easing-curve-dropdown" full experimental="modern">${optionsHTML}</fig-dropdown>`;
  }

  #getInnerHTML() {
    const size = 200;
    const dropdown = this.#getDropdownHTML();
    if (!this.#isEditEnabled()) return dropdown;
    const valueInput = `<fig-input-text class="fig-easing-curve-value-input" value="${FigEasingCurve.#escapeAttribute(this.value)}" full></fig-input-text>`;

    if (this.#mode === "spring") {
      const targetY = 40;
      const startY = 180;
      return `${dropdown}<div class="fig-easing-curve-svg-container"><svg viewBox="0 0 ${size} ${size}" class="fig-easing-curve-svg">
        <rect class="fig-easing-curve-bounds" x="0" y="0" width="${size}" height="${size}"/>
        <line class="fig-easing-curve-target" x1="0" y1="${targetY}" x2="${size}" y2="${targetY}"/>
        <line class="fig-easing-curve-diagonal" x1="0" y1="${startY}" x2="0" y2="${startY}"/>
        <path class="fig-easing-curve-path"/>
        <foreignObject class="fig-easing-curve-handle" data-handle="bounce" width="20" height="20"><fig-handle size="small" drag aria-label="Spring bounce handle"></fig-handle></foreignObject>
        <foreignObject class="fig-easing-curve-handle fig-easing-curve-duration-bar" data-handle="duration" width="20" height="20"><fig-handle size="small" drag drag-axes="x" aria-label="Spring duration handle"></fig-handle></foreignObject>
      </svg></div>${valueInput}`;
    }

    return `${dropdown}<div class="fig-easing-curve-svg-container"><svg viewBox="0 0 ${size} ${size}" class="fig-easing-curve-svg">
      <rect class="fig-easing-curve-bounds" x="0" y="0" width="${size}" height="${size}"/>
      <line class="fig-easing-curve-diagonal" x1="0" y1="${size}" x2="${size}" y2="0"/>
      <line class="fig-easing-curve-arm" data-arm="1"/>
      <line class="fig-easing-curve-arm" data-arm="2"/>
      <path class="fig-easing-curve-path"/>
      <circle class="fig-easing-curve-endpoint" data-endpoint="start" r="${this.#bezierEndpointRadius}"/>
      <circle class="fig-easing-curve-endpoint" data-endpoint="end" r="${this.#bezierEndpointRadius}"/>
      <foreignObject class="fig-easing-curve-handle" data-handle="1" width="20" height="20"><fig-handle size="small" drag aria-label="First easing control point"></fig-handle></foreignObject>
      <foreignObject class="fig-easing-curve-handle" data-handle="2" width="20" height="20"><fig-handle size="small" drag aria-label="Second easing control point"></fig-handle></foreignObject>
    </svg></div>${valueInput}`;
  }

  #readCssNumber(name, fallback) {
    const raw = getComputedStyle(this).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  #syncMetricsFromCSS() {
    this.#bezierEndpointRadius = this.#readCssNumber(
      "--easing-bezier-endpoint-radius",
      this.#bezierEndpointRadius,
    );
    this.#durationBarRadius = this.#readCssNumber(
      "--easing-duration-bar-radius",
      this.#durationBarRadius,
    );
  }

  #cacheRefs() {
    this.#svg = this.querySelector(".fig-easing-curve-svg");
    this.#curve = this.querySelector(".fig-easing-curve-path");
    this.#line1 = this.querySelector('[data-arm="1"]');
    this.#line2 = this.querySelector('[data-arm="2"]');
    this.#handle1 =
      this.querySelector('[data-handle="1"]') ||
      this.querySelector('[data-handle="bounce"]');
    this.#handle2 =
      this.querySelector('[data-handle="2"]') ||
      this.querySelector('[data-handle="duration"]');
    this.#bezierEndpointStart = this.querySelector('[data-endpoint="start"]');
    this.#bezierEndpointEnd = this.querySelector('[data-endpoint="end"]');
    this.#dropdown = this.querySelector(".fig-easing-curve-dropdown");
    this.#valueInput = this.querySelector(".fig-easing-curve-value-input");
    this.#targetLine = this.querySelector(".fig-easing-curve-target");
    this.#bounds = this.querySelector(".fig-easing-curve-bounds");
    this.#diagonal = this.querySelector(".fig-easing-curve-diagonal");
  }

  #syncHandleSizes() {
    const h1El = this.#handle1?.querySelector("fig-handle");
    const h2El = this.#handle2?.querySelector("fig-handle");
    if (h1El) {
      const w = h1El.offsetWidth || this.#bezierHandleRadius * 2;
      const h = h1El.offsetHeight || this.#bezierHandleRadius * 2;
      this.#bezierHandleRadius = Math.max(w, h) / 2;
      this.#handle1.setAttribute("width", w);
      this.#handle1.setAttribute("height", h);
    }
    if (h2El) {
      const w = h2El.offsetWidth || this.#durationBarWidth;
      const h = h2El.offsetHeight || this.#durationBarHeight;
      if (this.#mode === "spring") {
        this.#durationBarWidth = w;
        this.#durationBarHeight = h;
      }
      this.#handle2.setAttribute("width", w);
      this.#handle2.setAttribute("height", h);
    }
  }

  #setupResizeObserver() {
    if (this.#resizeObserver || !window.ResizeObserver) return;
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#syncViewportSize()) {
        this.#updatePaths();
      }
    });
    this.#resizeObserver.observe(this);
  }

  #syncViewportSize() {
    if (!this.#svg) return false;
    const rect = this.#svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 200));
    const height = Math.max(1, Math.round(rect.height || 200));
    const changed = width !== this.#drawWidth || height !== this.#drawHeight;
    this.#drawWidth = width;
    this.#drawHeight = height;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    return changed;
  }

  // --- Coordinate helpers ---

  #toSVG(nx, ny) {
    return { x: nx * this.#drawWidth, y: (1 - ny) * this.#drawHeight };
  }

  #fromSVG(sx, sy) {
    return { x: sx / this.#drawWidth, y: 1 - sy / this.#drawHeight };
  }

  #springScale = { minVal: 0, maxVal: 1.2, totalTime: 1 };

  #springToSVG(nt, nv) {
    const pad = 20;
    const draw = this.#drawHeight - pad * 2;
    const { minVal, maxVal } = this.#springScale;
    const range = maxVal - minVal || 1;
    return {
      x: nt * this.#drawWidth,
      y: pad + (1 - (nv - minVal) / range) * draw,
    };
  }

  // --- Path updates ---

  #updatePaths() {
    this.#syncViewportSize();
    if (this.#mode === "spring") {
      this.#updateSpringPaths();
    } else {
      this.#updateBezierPaths();
    }
  }

  #syncActiveBezierArm() {
    this.#line1?.classList.toggle(
      "is-active",
      this.#mode === "bezier" && this.#isDragging === 1,
    );
    this.#line2?.classList.toggle(
      "is-active",
      this.#mode === "bezier" && this.#isDragging === 2,
    );
  }

  #updateBezierPaths() {
    if (this.#bounds) {
      this.#bounds.setAttribute("x", "0");
      this.#bounds.setAttribute("y", "0");
      this.#bounds.setAttribute("width", this.#drawWidth);
      this.#bounds.setAttribute("height", this.#drawHeight);
    }
    if (this.#diagonal) {
      this.#diagonal.setAttribute("x1", "0");
      this.#diagonal.setAttribute("y1", this.#drawHeight);
      this.#diagonal.setAttribute("x2", this.#drawWidth);
      this.#diagonal.setAttribute("y2", "0");
    }

    const p0 = this.#toSVG(0, 0);
    const p1 = this.#toSVG(this.#cp1.x, this.#cp1.y);
    const p2 = this.#toSVG(this.#cp2.x, this.#cp2.y);
    const p3 = this.#toSVG(1, 1);

    this.#curve.setAttribute(
      "d",
      `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
    );
    this.#line1.setAttribute("x1", p0.x);
    this.#line1.setAttribute("y1", p0.y);
    this.#line1.setAttribute("x2", p1.x);
    this.#line1.setAttribute("y2", p1.y);
    this.#line2.setAttribute("x1", p3.x);
    this.#line2.setAttribute("y1", p3.y);
    this.#line2.setAttribute("x2", p2.x);
    this.#line2.setAttribute("y2", p2.y);
    const hr = this.#bezierHandleRadius;
    this.#handle1.setAttribute("x", p1.x - hr);
    this.#handle1.setAttribute("y", p1.y - hr);
    this.#handle2.setAttribute("x", p2.x - hr);
    this.#handle2.setAttribute("y", p2.y - hr);
    if (this.#bezierEndpointStart) {
      this.#bezierEndpointStart.setAttribute("cx", p0.x);
      this.#bezierEndpointStart.setAttribute("cy", p0.y);
    }
    if (this.#bezierEndpointEnd) {
      this.#bezierEndpointEnd.setAttribute("cx", p3.x);
      this.#bezierEndpointEnd.setAttribute("cy", p3.y);
    }
    this.#syncBezierHandleTabOrder();
  }

  #syncBezierHandleTabOrder() {
    if (!this.#svg || !this.#handle1 || !this.#handle2) return;
    const handles =
      this.#cp1.y >= this.#cp2.y
        ? [this.#handle1, this.#handle2]
        : [this.#handle2, this.#handle1];
    for (const handle of handles) {
      this.#svg.append(handle);
    }
  }

  #updateSpringPaths() {
    if (this.#bounds) {
      this.#bounds.setAttribute("x", "0");
      this.#bounds.setAttribute("y", "0");
      this.#bounds.setAttribute("width", this.#drawWidth);
      this.#bounds.setAttribute("height", this.#drawHeight);
    }

    const points = this.#simulateSpring();
    if (!points.length) return;
    const totalTime = points[points.length - 1].t || 1;

    let minVal = 0,
      maxVal = 1;
    for (const p of points) {
      if (p.value < minVal) minVal = p.value;
      if (p.value > maxVal) maxVal = p.value;
    }
    const maxDistFromCenter = Math.max(
      Math.abs(minVal - 1),
      Math.abs(maxVal - 1),
      0.01,
    );
    const valPad = 0;
    this.#springScale = {
      minVal: 1 - maxDistFromCenter - valPad,
      maxVal: 1 + maxDistFromCenter + valPad,
      totalTime,
    };

    const durationNorm = Math.max(0.05, Math.min(0.95, this.#springDuration));
    let d = "";
    for (let i = 0; i < points.length; i++) {
      const nt = (points[i].t / totalTime) * durationNorm;
      const pt = this.#springToSVG(nt, points[i].value);
      d += (i === 0 ? "M" : "L") + pt.x.toFixed(1) + "," + pt.y.toFixed(1);
    }
    const flatStart = this.#springToSVG(durationNorm, 1);
    const flatEnd = this.#springToSVG(1, 1);
    d += `L${flatStart.x.toFixed(1)},${flatStart.y.toFixed(1)} L${flatEnd.x.toFixed(1)},${flatEnd.y.toFixed(1)}`;
    this.#curve.setAttribute("d", d);

    // Update target line position at value=1
    if (this.#targetLine) {
      const tl = this.#springToSVG(0, 1);
      const tr = this.#springToSVG(1, 1);
      this.#targetLine.setAttribute("x1", tl.x);
      this.#targetLine.setAttribute("y1", tl.y);
      this.#targetLine.setAttribute("x2", tr.x);
      this.#targetLine.setAttribute("y2", tr.y);
    }

    // Bounce handle: at first overshoot peak
    const peak = this.#findPeakOvershoot(points);
    const peakNorm = (peak.t / totalTime) * durationNorm;
    const peakPt = this.#springToSVG(peakNorm, peak.value);
    const hr = this.#bezierHandleRadius;
    this.#handle1.setAttribute("x", peakPt.x - hr);
    this.#handle1.setAttribute("y", peakPt.y - hr);

    // Duration handle: on the target line
    const targetPt = this.#springToSVG(durationNorm, 1);
    this.#handle2.setAttribute("x", targetPt.x - this.#durationBarWidth / 2);
    this.#handle2.setAttribute("y", targetPt.y - this.#durationBarHeight / 2);
  }

  #findPeakOvershoot(points) {
    let peak = { t: 0, value: 1 };
    let passedTarget = false;
    for (const p of points) {
      if (p.value >= 0.99) passedTarget = true;
      if (passedTarget && p.value > peak.value) {
        peak = { t: p.t, value: p.value };
      }
    }
    return peak;
  }

  // --- Dropdown ---

  #syncDropdown() {
    if (!this.#dropdown) return;
    this.#dropdown.value = this.#presetName;
    this.#refreshCustomPresetIcons();
  }

  #syncValueInput() {
    if (!this.#valueInput) return;
    this.#valueInput.setAttribute("value", this.value);
  }

  #parseManualBezierValue(value) {
    const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }
    if (parts[0] < 0 || parts[0] > 1 || parts[2] < 0 || parts[2] > 1) {
      return null;
    }
    return parts;
  }

  #applyManualValue(value, eventType) {
    const parts = this.#parseManualBezierValue(value);
    if (!parts) {
      if (eventType === "change") this.#syncValueInput();
      return;
    }

    const prevMode = this.#mode;
    this.#mode = "bezier";
    this.#cp1.x = parts[0];
    this.#cp1.y = parts[1];
    this.#cp2.x = parts[2];
    this.#cp2.y = parts[3];

    this.#presetName = this.#matchPreset();
    if (prevMode !== this.#mode) {
      this.#render();
    } else {
      this.#updatePaths();
      this.#syncDropdown();
      if (eventType === "change") this.#syncValueInput();
    }
    this.#emit(eventType);
  }

  #setOptionIconByValue(root, optionValue, icon) {
    if (!root) return;
    for (const option of root.querySelectorAll("option")) {
      if (option.value === optionValue) {
        option.innerHTML = `${icon} ${optionValue}`;
      }
    }
  }

  #refreshCustomPresetIcons() {
    if (!this.#dropdown) return;
    if (!this.#isEditEnabled()) return;
    const bezierIcon = FigEasingCurve.curveIcon(
      this.#cp1.x,
      this.#cp1.y,
      this.#cp2.x,
      this.#cp2.y,
    );
    const springIcon = FigEasingCurve.#springIcon(this.#spring);

    // Update both slotted options and the cloned native select options.
    this.#setOptionIconByValue(this.#dropdown, "Custom bezier", bezierIcon);
    this.#setOptionIconByValue(this.#dropdown, "Custom spring", springIcon);
    this.#setOptionIconByValue(
      this.#dropdown.select,
      "Custom bezier",
      bezierIcon,
    );
    this.#setOptionIconByValue(
      this.#dropdown.select,
      "Custom spring",
      springIcon,
    );
  }

  #syncAfterHandleInput(eventType) {
    this.#updatePaths();
    this.#presetName = this.#matchPreset();
    this.#syncDropdown();
    this.#syncValueInput();
    this.#emit(eventType);
  }

  #handleBezierKeyboard(event, handle) {
    const step = event.shiftKey ? 0.1 : 0.01;
    const point = handle === 1 ? this.#cp1 : this.#cp2;

    switch (event.key) {
      case "ArrowLeft":
        point.x -= step;
        break;
      case "ArrowRight":
        point.x += step;
        break;
      case "ArrowUp":
        point.y += step;
        break;
      case "ArrowDown":
        point.y -= step;
        break;
      case "Home":
        point.x = 0;
        point.y = 0;
        break;
      case "End":
        point.x = 1;
        point.y = 1;
        break;
      default:
        return false;
    }

    point.x = Math.max(0, Math.min(1, Math.round(point.x * 100) / 100));
    point.y = Math.round(point.y * 100) / 100;
    this.#syncAfterHandleInput("input");
    this.#emit("change");
    return true;
  }

  #handleSpringKeyboard(event, handleType) {
    const unit = event.shiftKey ? 10 : 1;

    if (handleType === "bounce") {
      switch (event.key) {
        case "ArrowUp":
          this.#spring.damping = Math.max(1, Math.round(this.#spring.damping - unit));
          break;
        case "ArrowDown":
          this.#spring.damping = Math.max(1, Math.round(this.#spring.damping + unit));
          break;
        case "Home":
          this.#spring.damping = 1;
          break;
        case "End":
          this.#spring.damping = 50;
          break;
        default:
          return false;
      }
    } else {
      const dx = unit * 2;
      switch (event.key) {
        case "ArrowLeft":
          this.#springDuration = Math.max(0.05, this.#springDuration - dx / 200);
          this.#spring.stiffness = Math.max(10, Math.round(this.#spring.stiffness + dx * 1.5));
          break;
        case "ArrowRight":
          this.#springDuration = Math.min(0.95, this.#springDuration + dx / 200);
          this.#spring.stiffness = Math.max(10, Math.round(this.#spring.stiffness - dx * 1.5));
          break;
        case "Home":
          this.#springDuration = 0.05;
          break;
        case "End":
          this.#springDuration = 0.95;
          break;
        default:
          return false;
      }
    }

    this.#syncAfterHandleInput("input");
    this.#emit("change");
    return true;
  }

  #setupHandleInteraction(handleContainer, handle) {
    const handleEl = handleContainer?.querySelector("fig-handle");
    if (!handleEl) return;

    handleEl.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.#mode === "bezier") {
          this.#startBezierDrag(event, Number(handle));
        } else {
          this.#startSpringDrag(event, handle);
        }
      },
      { capture: true },
    );

    handleEl.addEventListener(
      "keydown",
      (event) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
            event.key,
          )
        ) {
          return;
        }
        const handled =
          this.#mode === "bezier"
            ? this.#handleBezierKeyboard(event, Number(handle))
            : this.#handleSpringKeyboard(event, handle);
        if (!handled) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  // --- Events ---

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          mode: this.#mode,
          value: this.value,
          cssValue: this.cssValue,
          preset: this.#presetName,
        },
      }),
    );
  }

  #setupEvents() {
    if (this.#svg && this.#mode === "bezier") {
      this.#setupHandleInteraction(this.#handle1, "1");
      this.#setupHandleInteraction(this.#handle2, "2");
      this.#handle1.addEventListener("pointerdown", (e) =>
        this.#startBezierDrag(e, 1),
      );
      this.#handle2.addEventListener("pointerdown", (e) =>
        this.#startBezierDrag(e, 2),
      );

      const bezierSurface = this.querySelector(
        ".fig-easing-curve-svg-container",
      );
      if (bezierSurface) {
        bezierSurface.addEventListener("pointerdown", (e) => {
          if (e.target?.closest?.(".fig-easing-curve-handle, fig-handle"))
            return;
          this.#startBezierDrag(e, this.#bezierHandleForClientHalf(e));
        });
      }
    } else if (this.#svg) {
      this.#setupHandleInteraction(this.#handle1, "bounce");
      this.#setupHandleInteraction(this.#handle2, "duration");
      this.#handle1.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.#startSpringDrag(e, "bounce");
      });
      this.#handle2.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.#startSpringDrag(e, "duration");
      });

      const springSurface = this.querySelector(
        ".fig-easing-curve-svg-container",
      );
      if (springSurface) {
        springSurface.addEventListener("pointerdown", (e) => {
          if (e.target?.closest?.(".fig-easing-curve-handle, fig-handle"))
            return;
          this.#startSpringDrag(e, "duration");
        });
      }
    }

    if (this.#dropdown) {
      this.#dropdown.addEventListener("change", (e) => {
        const name = e.detail;
        const preset = FigEasingCurve.PRESETS.find((p) => p.name === name);
        if (!preset) return;

        if (preset.type === "bezier") {
          if (preset.value) {
            this.#cp1.x = preset.value[0];
            this.#cp1.y = preset.value[1];
            this.#cp2.x = preset.value[2];
            this.#cp2.y = preset.value[3];
          }
          this.#presetName = name;
          if (this.#mode !== "bezier") {
            this.#mode = "bezier";
            this.#render();
          } else if (this.#svg) {
            this.#updatePaths();
            this.#syncValueInput();
          }
        } else if (preset.type === "spring") {
          if (preset.spring) {
            this.#spring = { ...preset.spring };
          }
          this.#presetName = name;
          if (this.#mode !== "spring") {
            this.#mode = "spring";
            this.#render();
          } else if (this.#svg) {
            this.#updatePaths();
            this.#syncValueInput();
          }
        }
        this.#emit("input");
        this.#emit("change");
      });
    }

    if (this.#valueInput) {
      this.#valueInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const value = e.detail ?? e.target?.value;
        if (typeof value !== "string") return;
        this.#applyManualValue(value, "input");
      });
      this.#valueInput.addEventListener("change", (e) => {
        e.stopPropagation();
        const value = e.detail ?? e.target?.value;
        if (typeof value !== "string") return;
        this.#applyManualValue(value, "change");
      });
    }
  }

  #clientToSVG(e) {
    const ctm = this.#svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * e.clientX + inv.c * e.clientY + inv.e,
      y: inv.b * e.clientX + inv.d * e.clientY + inv.f,
    };
  }

  #bezierHandleForClientHalf(e) {
    const svgPt = this.#clientToSVG(e);
    return svgPt.x <= this.#drawWidth / 2 ? 1 : 2;
  }

  #startBezierDrag(e, handle) {
    e.preventDefault();
    this.#isDragging = handle;
    this.#syncActiveBezierArm();

    const onMove = (e) => {
      if (!this.#isDragging) return;
      const svgPt = this.#clientToSVG(e);
      const norm = this.#fromSVG(svgPt.x, svgPt.y);

      norm.x = Math.round(norm.x * 100) / 100;
      norm.y = Math.round(norm.y * 100) / 100;
      norm.x = Math.max(0, Math.min(1, norm.x));

      if (this.#isDragging === 1) {
        this.#cp1.x = norm.x;
        this.#cp1.y = norm.y;
      } else {
        this.#cp2.x = norm.x;
        this.#cp2.y = norm.y;
      }
      this.#updatePaths();
      this.#presetName = this.#matchPreset();
      this.#syncDropdown();
      this.#syncValueInput();
      this.#emit("input");
    };

    const onUp = () => {
      this.#isDragging = null;
      this.#syncActiveBezierArm();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      this.#emit("change");
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  #startSpringDrag(e, handleType) {
    e.preventDefault();
    this.#isDragging = handleType;

    const startDamping = this.#spring.damping;
    const startStiffness = this.#spring.stiffness;
    const startDuration = this.#springDuration;
    const startY = e.clientY;
    const startX = e.clientX;

    const onMove = (e) => {
      if (!this.#isDragging) return;

      if (handleType === "bounce") {
        const dy = e.clientY - startY;
        this.#spring.damping = Math.max(
          1,
          Math.round(startDamping + dy * 0.15),
        );
      } else {
        const dx = e.clientX - startX;
        this.#springDuration = Math.max(
          0.05,
          Math.min(0.95, startDuration + dx / 200),
        );
        this.#spring.stiffness = Math.max(
          10,
          Math.round(startStiffness - dx * 1.5),
        );
      }

      this.#updatePaths();
      this.#presetName = this.#matchPreset();
      this.#syncDropdown();
      this.#syncValueInput();
      this.#emit("input");
    };

    const onUp = () => {
      this.#isDragging = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      this.#emit("change");
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }
}
customElements.define("fig-easing-curve", FigEasingCurve);

/**
 * A 3D rotation control with an interactive cube preview.
 * @attr {string} value - CSS transform string, e.g. "rotateX(20deg) rotateY(-35deg) rotateZ(0deg)".
 * @attr {number} precision - Decimal places for angle output (default 1).
 */
class Fig3DRotate extends HTMLElement {
  #rx = 0;
  #ry = 0;
  #rz = 0;
  #precision = 1;
  #isDragging = false;
  #isShiftHeld = false;
  #cube = null;
  #container = null;
  #boundKeyDown = null;
  #boundKeyUp = null;
  #boundContainerPointerDown = (e) => this.#startDrag(e);
  #eventAbort = null;
  #fields = [];
  #fieldInputs = {};
  #fieldInputHandlers = {};

  static get observedAttributes() {
    return [
      "value",
      "precision",
      "aspect-ratio",
      "fields",
      "perspective",
      "perspective-origin",
      "transform-origin",
      "selected",
      "drag",
    ];
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "1");
    figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
    figSyncCssVar(this, "--perspective", this.getAttribute("perspective"));
    figSyncCssVar(
      this,
      "--perspective-origin",
      this.getAttribute("perspective-origin"),
    );
    this.#syncTransformOrigin(this.getAttribute("transform-origin"));
    this.#parseFields(this.getAttribute("fields"));
    const val = this.getAttribute("value");
    if (val) this.#parseValue(val);
    if (this.querySelector(".fig-3d-rotate-container")) {
      this.#reuseRenderedMarkup();
    } else {
      this.#render();
    }
    this.#syncSelected(this.getAttribute("selected"));
    this.#syncDragState();
  }

  disconnectedCallback() {
    this.#isDragging = false;
    this.#teardownEvents();
  }

  #reuseRenderedMarkup() {
    this.#container = this.querySelector(".fig-3d-rotate-container");
    this.#cube = this.querySelector(".fig-3d-rotate-cube");
    this.#wireFieldInputs();
    this.#updateCube();
    this.#setupEvents();
  }

  #teardownEvents() {
    this.#eventAbort?.abort();
    this.#eventAbort = null;
    if (this.#boundKeyDown) {
      window.removeEventListener("keydown", this.#boundKeyDown);
      window.removeEventListener("keyup", this.#boundKeyUp);
      this.#boundKeyDown = null;
      this.#boundKeyUp = null;
    }
  }

  #syncTransformOrigin(value) {
    if (!value || !value.trim()) {
      this.style.removeProperty("--transform-origin");
      return;
    }
    const parts = value.trim().split(/\s+/);
    if (parts.length === 2) {
      this.style.setProperty(
        "--transform-origin",
        `${parts[0]} ${parts[1]} -50cqi`,
      );
    } else {
      this.style.setProperty("--transform-origin", value.trim());
    }
  }

  #syncDragState() {
    if (!this.#container) return;
    this.#container.style.cursor = this.#dragEnabled ? "" : "default";
  }

  #syncSelected(value) {
    if (!this.#cube) return;
    const faces = this.#cube.querySelectorAll(".fig-3d-rotate-face");
    const name = value ? value.trim().toLowerCase() : "";
    for (const face of faces) {
      face.classList.toggle(
        "selected",
        name !== "" && face.classList.contains(name),
      );
    }
  }

  #parseFields(str) {
    if (!str || !str.trim()) {
      this.#fields = [];
      return;
    }
    const valid = ["rotateX", "rotateY", "rotateZ"];
    this.#fields = str
      .split(",")
      .map((s) => s.trim())
      .filter((s) => valid.includes(s));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      return;
    }
    if (name === "perspective") {
      figSyncCssVar(this, "--perspective", newValue);
      return;
    }
    if (name === "perspective-origin") {
      figSyncCssVar(this, "--perspective-origin", newValue);
      return;
    }
    if (name === "transform-origin") {
      this.#syncTransformOrigin(newValue);
      return;
    }
    if (name === "selected") {
      this.#syncSelected(newValue);
      return;
    }
    if (name === "drag") {
      this.#syncDragState();
      return;
    }
    if (name === "fields") {
      this.#parseFields(newValue);
      if (this.#cube) this.#render();
      return;
    }
    if (!this.#cube) return;
    if (name === "value" && newValue) {
      if (this.#isDragging) return;
      this.#parseValue(newValue);
      this.#updateCube();
      this.#syncFieldInputs();
    }
    if (name === "precision") {
      this.#precision = parseInt(newValue || "1");
    }
  }

  get value() {
    const p = this.#precision;
    return `rotateX(${this.#rx.toFixed(p)}deg) rotateY(${this.#ry.toFixed(p)}deg) rotateZ(${this.#rz.toFixed(p)}deg)`;
  }

  set value(v) {
    this.setAttribute("value", v);
  }

  get rotateX() {
    return this.#rx;
  }
  get rotateY() {
    return this.#ry;
  }
  get rotateZ() {
    return this.#rz;
  }

  #parseValue(str) {
    const rxMatch = str.match(/rotateX\(\s*(-?[\d.]+)\s*deg\s*\)/);
    const ryMatch = str.match(/rotateY\(\s*(-?[\d.]+)\s*deg\s*\)/);
    const rzMatch = str.match(/rotateZ\(\s*(-?[\d.]+)\s*deg\s*\)/);
    if (rxMatch) this.#rx = parseFloat(rxMatch[1]);
    if (ryMatch) this.#ry = parseFloat(ryMatch[1]);
    if (rzMatch) this.#rz = parseFloat(rzMatch[1]);
  }

  #render() {
    const axisLabels = { rotateX: "X", rotateY: "Y", rotateZ: "Z" };
    const axisValues = {
      rotateX: this.#rx,
      rotateY: this.#ry,
      rotateZ: this.#rz,
    };
    const fieldsHTML = this.#fields
      .map(
        (axis) =>
          `<fig-input-number
            name="${axis}"
            step="1"
            precision="1"
            value="${axisValues[axis]}"
            units="°">
            <span slot="prepend">${axisLabels[axis]}</span>
          </fig-input-number>`,
      )
      .join("");

    this.innerHTML = `<div class="fig-3d-rotate-container" tabindex="0">
      <div class="fig-3d-rotate-scene">
        <div class="fig-3d-rotate-cube">
          <div class="fig-3d-rotate-face front"></div>
          <div class="fig-3d-rotate-face back"></div>
          <div class="fig-3d-rotate-face right"></div>
          <div class="fig-3d-rotate-face left"></div>
          <div class="fig-3d-rotate-face top"></div>
          <div class="fig-3d-rotate-face bottom"></div>
        </div>
      </div>
    </div>${fieldsHTML}`;
    this.#container = this.querySelector(".fig-3d-rotate-container");
    this.#cube = this.querySelector(".fig-3d-rotate-cube");
    this.#wireFieldInputs();
    this.#updateCube();
    this.#setupEvents();
  }

  #wireFieldInputs() {
    this.#fieldInputs = {};
    for (const axis of this.#fields) {
      const input = this.querySelector(`fig-input-number[name="${axis}"]`);
      if (!input) continue;
      this.#fieldInputs[axis] = input;
      if (!this.#fieldInputHandlers[axis]) {
        this.#fieldInputHandlers[axis] = (e) => {
          e.stopPropagation();
          const val = parseFloat(e.target.value);
          if (isNaN(val)) return;
          if (axis === "rotateX") this.#rx = val;
          else if (axis === "rotateY") this.#ry = val;
          else if (axis === "rotateZ") this.#rz = val;
          this.#updateCube();
          this.#emit(e.type);
        };
      }
      const handler = this.#fieldInputHandlers[axis];
      input.removeEventListener("input", handler);
      input.removeEventListener("change", handler);
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    }
  }

  #syncFieldInputs() {
    const axisValues = {
      rotateX: this.#rx,
      rotateY: this.#ry,
      rotateZ: this.#rz,
    };
    for (const axis of this.#fields) {
      const input = this.#fieldInputs[axis];
      if (input)
        input.setAttribute("value", axisValues[axis].toFixed(this.#precision));
    }
  }

  #updateCube() {
    if (!this.#cube) return;
    this.#cube.style.transform = `rotateX(${this.#rx}deg) rotateY(${this.#ry}deg) rotateZ(${this.#rz}deg)`;
  }

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          value: this.value,
          rotateX: this.#rx,
          rotateY: this.#ry,
          rotateZ: this.#rz,
        },
      }),
    );
  }

  #snapToIncrement(angle) {
    if (!this.#isShiftHeld) return angle;
    return Math.round(angle / 15) * 15;
  }

  #setupEvents() {
    this.#teardownEvents();
    if (!this.#container) return;
    this.#eventAbort = new AbortController();
    this.#container.addEventListener("pointerdown", this.#boundContainerPointerDown, {
      signal: this.#eventAbort.signal,
    });
    this.#boundKeyDown = (e) => {
      if (e.key === "Shift") this.#isShiftHeld = true;
    };
    this.#boundKeyUp = (e) => {
      if (e.key === "Shift") this.#isShiftHeld = false;
    };
    window.addEventListener("keydown", this.#boundKeyDown);
    window.addEventListener("keyup", this.#boundKeyUp);
  }

  get #dragEnabled() {
    const attr = this.getAttribute("drag");
    return attr === null || attr.toLowerCase() !== "false";
  }

  #startDrag(e) {
    if (!this.#dragEnabled) return;
    e.preventDefault();
    this.#isDragging = true;
    this.#container.classList.add("dragging");
    this.#container.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startRx = this.#rx;
    const startRy = this.#ry;

    const onMove = (e) => {
      if (!this.#isDragging) return;
      if (e.buttons === 0) {
        onEnd();
        return;
      }
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.#ry = this.#snapToIncrement(startRy + dx * 0.5);
      this.#rx = this.#snapToIncrement(startRx - dy * 0.5);
      this.#updateCube();
      this.#syncFieldInputs();
      this.setAttribute("value", this.value);
      this.#emit("input");
    };

    const onEnd = () => {
      if (!this.#isDragging) return;
      this.setAttribute("value", this.value);
      this.#isDragging = false;
      this.#container.classList.remove("dragging");
      this.#container.removeEventListener("pointermove", onMove);
      this.#container.removeEventListener("pointerup", onEnd);
      this.#container.removeEventListener("pointercancel", onEnd);
      this.#container.removeEventListener("lostpointercapture", onEnd);
      this.#emit("change");
    };

    this.#container.addEventListener("pointermove", onMove);
    this.#container.addEventListener("pointerup", onEnd);
    this.#container.addEventListener("pointercancel", onEnd);
    this.#container.addEventListener("lostpointercapture", onEnd);
  }
}
customElements.define("fig-3d-rotate", Fig3DRotate);

/**
 * A transform-origin grid control with draggable handle.
 * @attr {string} value - CSS transform-origin pair, e.g. "50% 50%".
 * @attr {number} precision - Decimal places for percentage output (default 0).
 * @attr {boolean} drag - Enable handle dragging (default true).
 * @attr {boolean} fields - Show X/Y percentage fields when present/true (default false).
 */
class FigOriginGrid extends HTMLElement {
  #x = 50;
  #y = 50;
  #precision = 0;
  #grid = null;
  #cells = [];
  #handle = null;
  #xInput = null;
  #yInput = null;
  #isDragging = false;
  #isSyncingValueAttr = false;
  #activePointerId = null;
  #boundHandlePointerMove = null;
  #boundHandlePointerEnd = null;

  static SNAP_POINTS = [0, 16.6667, 33.3333, 50, 66.6667, 83.3333, 100];

  static get observedAttributes() {
    return ["value", "precision", "aspect-ratio", "drag", "fields"];
  }

  #reuseRenderedMarkup() {
    this.#grid = this.querySelector(".origin-grid");
    this.#cells = Array.from(this.querySelectorAll(".origin-grid-cell"));
    this.#handle = this.querySelector("fig-handle");
    this.#xInput = this.querySelector('fig-input-number[name="x"]');
    this.#yInput = this.querySelector('fig-input-number[name="y"]');
    this.#syncHandlePosition();
    this.#syncOverflowState();
    this.#syncValueInputs();
    this.#setupEvents();
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "0");
    figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
    this.#applyIncomingValue(this.getAttribute("value"));

    if (this.querySelector(".fig-origin-grid-surface")) {
      this.#reuseRenderedMarkup();
    } else {
      this.#render();
    }
    this.#syncDragState();
    this.#syncValueAttribute();
  }

  disconnectedCallback() {
    this.#isDragging = false;
    this.#detachHandleDragListeners();
    this.#teardownEvents();
  }

  get value() {
    const p = this.#precision;
    return `${this.#x.toFixed(p)}% ${this.#y.toFixed(p)}%`;
  }

  set value(v) {
    this.setAttribute("value", v);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      return;
    }
    if (name === "drag") {
      this.#syncDragState();
      return;
    }
    if (name === "fields") {
      this.#render();
      this.#syncDragState();
      this.#syncValueAttribute();
      return;
    }
    if (name === "precision") {
      this.#precision = parseInt(newValue || "0");
      this.#syncValueInputs();
      this.#syncValueAttribute();
      return;
    }
    if (name === "value") {
      if (this.#isSyncingValueAttr || this.#isDragging) return;
      this.#applyIncomingValue(newValue);
      this.#syncHandlePosition();
      this.#syncOverflowState();
      this.#syncValueInputs();
    }
  }

  get #dragEnabled() {
    const attr = this.getAttribute("drag");
    return attr === null || attr.toLowerCase() !== "false";
  }

  get #fieldsEnabled() {
    const attr = this.getAttribute("fields");
    if (attr === null) return false;
    return attr.toLowerCase() !== "false";
  }

  #syncDragState() {
    if (!this.#grid) return;
    this.#grid.classList.toggle("drag-disabled", !this.#dragEnabled);
  }

  #clampPercentage(value) {
    return Math.max(0, Math.min(100, value));
  }

  #parseAxisValue(raw, axis) {
    const token = (raw || "").trim().toLowerCase();
    if (!token) return axis === "x" ? this.#x : this.#y;

    const keywordMap =
      axis === "x"
        ? { left: 0, center: 50, right: 100 }
        : { top: 0, center: 50, bottom: 100 };
    if (token in keywordMap) return keywordMap[token];

    const numeric = Number.parseFloat(token.replace("%", ""));
    if (Number.isFinite(numeric)) return numeric;

    return axis === "x" ? this.#x : this.#y;
  }

  #parseValue(value) {
    const parts = value.trim().replace(/,/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length < 1) return;

    if (parts.length === 1) {
      const same = this.#parseAxisValue(parts[0], "x");
      this.#x = same;
      this.#y = same;
      return;
    }

    this.#x = this.#parseAxisValue(parts[0], "x");
    this.#y = this.#parseAxisValue(parts[1], "y");
  }

  #applyIncomingValue(value) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      this.#x = 50;
      this.#y = 50;
      return;
    }
    this.#parseValue(normalized);
  }

  #render() {
    const cells = Array.from({ length: 9 }, (_, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return `<span class="origin-grid-cell" data-col="${col}" data-row="${row}">
        <span class="origin-grid-dot"></span>
      </span>`;
    }).join("");

    const xValue = this.#x.toFixed(this.#precision);
    const yValue = this.#y.toFixed(this.#precision);
    const fieldsMarkup = this.#fieldsEnabled
      ? `<div class="origin-values">
      <fig-input-number name="x" value="${xValue}" step="1" units="%"><span slot="prepend">X</span></fig-input-number>
      <fig-input-number name="y" value="${yValue}" step="1" units="%"><span slot="prepend">Y</span></fig-input-number>
    </div>`
      : "";

    this.innerHTML = `<div class="fig-origin-grid-surface">
      <div class="origin-grid" aria-label="Transform origin grid">
        <div class="origin-grid-cells">${cells}</div>
        <fig-handle></fig-handle>
      </div>
    </div>
    ${fieldsMarkup}`;

    this.#grid = this.querySelector(".origin-grid");
    this.#cells = Array.from(this.querySelectorAll(".origin-grid-cell"));
    this.#handle = this.querySelector("fig-handle");
    this.#xInput = this.querySelector('fig-input-number[name="x"]');
    this.#yInput = this.querySelector('fig-input-number[name="y"]');
    this.#syncHandlePosition();
    this.#syncOverflowState();
    this.#syncValueInputs();
    this.#setupEvents();
  }

  #syncValueInputs() {
    const xValue = this.#x.toFixed(this.#precision);
    const yValue = this.#y.toFixed(this.#precision);
    if (this.#xInput) {
      this.#xInput.setAttribute("value", xValue);
    }
    if (this.#yInput) {
      this.#yInput.setAttribute("value", yValue);
    }
  }

  #syncValueAttribute() {
    const next = this.value;
    if (this.getAttribute("value") === next) return;
    this.#isSyncingValueAttr = true;
    this.setAttribute("value", next);
    this.#isSyncingValueAttr = false;
  }

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          value: this.value,
          x: this.#x,
          y: this.#y,
        },
      }),
    );
  }

  #syncHandlePosition() {
    if (!this.#handle) return;
    // Constrain draggable visual bounds to the 3x3 dot centers.
    const toVisual = (value) =>
      16.6667 + (this.#clampPercentage(value) / 100) * 66.6667;
    this.#handle.style.left = `${toVisual(this.#x)}%`;
    this.#handle.style.top = `${toVisual(this.#y)}%`;
  }

  #syncOverflowState() {
    if (!this.#handle) return;
    const overflowX = this.#x < 0 || this.#x > 100;
    const overflowY = this.#y < 0 || this.#y > 100;
    const overflowLeft = this.#x < 0;
    const overflowRight = this.#x > 100;
    const overflowUp = this.#y < 0;
    const overflowDown = this.#y > 100;

    this.#handle.classList.toggle("beyond-bounds-x", overflowX);
    this.#handle.classList.toggle("beyond-bounds-y", overflowY);
    this.#handle.classList.toggle("overflow-left", overflowLeft);
    this.#handle.classList.toggle("overflow-right", overflowRight);
    this.#handle.classList.toggle("overflow-up", overflowUp);
    this.#handle.classList.toggle("overflow-down", overflowDown);
  }

  #gridCellFromClient(clientX, clientY) {
    if (!this.#grid) return null;
    const rect = this.#grid.getBoundingClientRect();
    const nx = (clientX - rect.left) / Math.max(rect.width, 1);
    const ny = (clientY - rect.top) / Math.max(rect.height, 1);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    const col = Math.max(0, Math.min(2, Math.floor(nx * 3)));
    const row = Math.max(0, Math.min(2, Math.floor(ny * 3)));
    return this.#cells.find(
      (cell) =>
        Number(cell.getAttribute("data-col")) === col &&
        Number(cell.getAttribute("data-row")) === row,
    );
  }

  #clearHoveredCells() {
    for (const cell of this.#cells) {
      cell.classList.remove("is-hovered");
    }
  }

  #setHoveredCell(cell) {
    this.#clearHoveredCells();
    if (cell) cell.classList.add("is-hovered");
  }

  #setFromPercent(x, y, eventType) {
    const nextX = Number(x);
    const nextY = Number(y);
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;
    if (nextX === this.#x && nextY === this.#y && eventType === "input") return;

    this.#x = nextX;
    this.#y = nextY;
    this.#syncHandlePosition();
    this.#syncOverflowState();
    this.#syncValueInputs();
    this.#syncValueAttribute();
    this.#emit(eventType);
  }

  #clientToPercent(clientX, clientY) {
    if (!this.#grid) return { x: this.#x, y: this.#y };
    const rect = this.#grid.getBoundingClientRect();
    const insetX = rect.width / 6;
    const insetY = rect.height / 6;
    const usableWidth = Math.max(1, rect.width - insetX * 2);
    const usableHeight = Math.max(1, rect.height - insetY * 2);
    const nx = (clientX - (rect.left + insetX)) / usableWidth;
    const ny = (clientY - (rect.top + insetY)) / usableHeight;
    return {
      x: nx * 100,
      y: ny * 100,
    };
  }

  #cellCenterFromClient(clientX, clientY) {
    if (!this.#grid) return { x: 50, y: 50 };
    const rect = this.#grid.getBoundingClientRect();
    const colRaw = ((clientX - rect.left) / Math.max(rect.width, 1)) * 3;
    const rowRaw = ((clientY - rect.top) / Math.max(rect.height, 1)) * 3;
    const col = Math.max(0, Math.min(2, Math.floor(colRaw)));
    const row = Math.max(0, Math.min(2, Math.floor(rowRaw)));
    return {
      x: col * 50,
      y: row * 50,
    };
  }

  #snapPercentage(value) {
    const threshold = 2.5;
    let closest = value;
    let closestDistance = Infinity;
    for (const point of FigOriginGrid.SNAP_POINTS) {
      const distance = Math.abs(value - point);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = point;
      }
    }
    return closestDistance <= threshold ? closest : value;
  }

  #maybeSnapPoint(point, shiftKey) {
    if (!shiftKey) return point;
    return {
      x: this.#snapPercentage(point.x),
      y: this.#snapPercentage(point.y),
    };
  }

  #moveHandleByKeyboard(event) {
    if (!this.#dragEnabled) return false;
    const step = event.shiftKey ? 10 : 1;
    let nextX = this.#x;
    let nextY = this.#y;

    switch (event.key) {
      case "ArrowLeft":
        nextX -= step;
        break;
      case "ArrowRight":
        nextX += step;
        break;
      case "ArrowUp":
        nextY -= step;
        break;
      case "ArrowDown":
        nextY += step;
        break;
      case "Home":
        nextX = 0;
        nextY = 0;
        break;
      case "End":
        nextX = 100;
        nextY = 100;
        break;
      default:
        return false;
    }

    this.#setFromPercent(
      this.#clampPercentage(nextX),
      this.#clampPercentage(nextY),
      "input",
    );
    this.#emit("change");
    return true;
  }

  #detachHandleDragListeners() {
    if (
      !this.#grid ||
      !this.#boundHandlePointerMove ||
      !this.#boundHandlePointerEnd
    )
      return;
    this.#grid.removeEventListener("pointermove", this.#boundHandlePointerMove);
    this.#grid.removeEventListener("pointerup", this.#boundHandlePointerEnd);
    this.#grid.removeEventListener(
      "pointercancel",
      this.#boundHandlePointerEnd,
    );
    this.#grid.removeEventListener(
      "lostpointercapture",
      this.#boundHandlePointerEnd,
    );
    this.#boundHandlePointerMove = null;
    this.#boundHandlePointerEnd = null;
  }

  #startGridDrag(e) {
    if (!this.#grid || !this.#dragEnabled) return;
    e.preventDefault();
    this.#isDragging = true;
    this.#activePointerId = e.pointerId;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const dragThresholdPx = 3;
    let didDrag = false;
    this.#grid.setPointerCapture(e.pointerId);

    this.#boundHandlePointerMove = (moveEvent) => {
      if (!this.#isDragging || moveEvent.pointerId !== this.#activePointerId)
        return;
      const dx = moveEvent.clientX - startClientX;
      const dy = moveEvent.clientY - startClientY;
      const distance = Math.hypot(dx, dy);
      if (!didDrag && distance < dragThresholdPx) return;
      if (!didDrag) {
        didDrag = true;
        this.#grid.classList.add("is-dragging");
        this.#clearHoveredCells();
      }
      const nextPoint = this.#maybeSnapPoint(
        this.#clientToPercent(moveEvent.clientX, moveEvent.clientY),
        moveEvent.shiftKey,
      );
      this.#setFromPercent(nextPoint.x, nextPoint.y, "input");
    };

    this.#boundHandlePointerEnd = (endEvent) => {
      if (!this.#isDragging || endEvent.pointerId !== this.#activePointerId)
        return;
      this.#isDragging = false;
      this.#activePointerId = null;
      this.#grid.classList.remove("is-dragging");
      this.#clearHoveredCells();
      this.#detachHandleDragListeners();
      if (!didDrag) {
        // Click behavior: snap to the center of the clicked cell.
        const center = this.#cellCenterFromClient(startClientX, startClientY);
        this.#setFromPercent(center.x, center.y, "input");
      }
      this.#emit("change");
    };

    this.#grid.addEventListener("pointermove", this.#boundHandlePointerMove);
    this.#grid.addEventListener("pointerup", this.#boundHandlePointerEnd);
    this.#grid.addEventListener("pointercancel", this.#boundHandlePointerEnd);
    this.#grid.addEventListener(
      "lostpointercapture",
      this.#boundHandlePointerEnd,
    );
  }

  #eventAbort = null;

  #teardownEvents() {
    this.#eventAbort?.abort();
    this.#eventAbort = null;
  }

  #setupEvents() {
    this.#teardownEvents();
    if (!this.#grid || !this.#handle) return;

    this.#eventAbort = new AbortController();
    const { signal } = this.#eventAbort;

    this.#grid.addEventListener(
      "pointerdown",
      (e) => {
        const hovered = this.#gridCellFromClient(e.clientX, e.clientY);
        this.#setHoveredCell(hovered);

        if (this.#dragEnabled) {
          this.#startGridDrag(e);
          return;
        }

        const center = this.#cellCenterFromClient(e.clientX, e.clientY);
        this.#setFromPercent(center.x, center.y, "input");
        this.#emit("change");
      },
      { signal },
    );

    this.#grid.addEventListener(
      "pointermove",
      (e) => {
        if (this.#isDragging) return;
        const hovered = this.#gridCellFromClient(e.clientX, e.clientY);
        this.#setHoveredCell(hovered);
      },
      { signal },
    );

    this.#grid.addEventListener(
      "pointerleave",
      () => {
        this.#clearHoveredCells();
      },
      { signal },
    );

    this.#handle.addEventListener(
      "keydown",
      (e) => {
        if (!this.#moveHandleByKeyboard(e)) return;
        e.preventDefault();
        e.stopPropagation();
      },
      { signal },
    );

    const bindValueInput = (inputEl, axis) => {
      if (!inputEl) return;
      const handle = (e) => {
        const next = Number.parseFloat(e.target.value);
        if (!Number.isFinite(next)) return;
        if (axis === "x") {
          this.#setFromPercent(next, this.#y, "input");
        } else {
          this.#setFromPercent(this.#x, next, "input");
        }
      };
      inputEl.addEventListener("input", handle, { signal });
      inputEl.addEventListener("change", handle, { signal });
      inputEl.addEventListener(
        "focusout",
        () => {
          this.#emit("change");
        },
        { signal },
      );
    };

    bindValueInput(this.#xInput, "x");
    bindValueInput(this.#yInput, "y");
  }
}
customElements.define("fig-origin-grid", FigOriginGrid);

/**
 * A custom joystick input element.
 * @attr {string} value - The current position of the joystick (e.g., "50% 50%").
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {number} transform - A scaling factor for the output.
 * @attr {boolean} fields - Whether to display X and Y inputs.
 * @attr {string} aspect-ratio - Aspect ratio for the joystick plane container.
 * @attr {string} axis-labels - Comma- or space-delimited labels. 1 token: top. 2 tokens: x y. 4 tokens: left right top bottom.
 */
class FigInputJoystick extends HTMLElement {
  #boundPlanePointerDown = null;
  #boundHandlePointerDown = null;
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundXInput = null;
  #boundYInput = null;
  #boundXFocusOut = null;
  #boundYFocusOut = null;
  #isSyncingValueAttr = false;
  #defaultPosition = { x: 0.5, y: 0.5 };
  #initialized = false;

  constructor() {
    super();

    this.position = { x: 0.5, y: 0.5 };
    this.isDragging = false;
    this.plane = null;
    this.cursor = null;
    this.xInput = null;
    this.yInput = null;
    this.coordinates = "screen";
    this.#boundPlanePointerDown = (e) => this.#handlePlanePointerDown(e);
    this.#boundHandlePointerDown = () => {
      this.isDragging = true;
      this.plane?.classList.add("dragging");
    };
    this.#boundHandleInput = (e) => this.#handleHandleInput(e);
    this.#boundHandleChange = () => this.#handleHandleChange();
    this.#boundXInput = (e) => this.#handleXInput(e);
    this.#boundYInput = (e) => this.#handleYInput(e);
    this.#boundXFocusOut = () => this.#handleFieldFocusOut();
    this.#boundYFocusOut = () => this.#handleFieldFocusOut();
  }

  #reuseRenderedMarkup() {
    this.#setupListeners();
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#syncResetButton();
    this.#initialized = true;
  }

  connectedCallback() {
    figNextFrame(this, () => {
      this.precision = this.getAttribute("precision") || 3;
      this.precision = parseInt(this.precision);
      this.transform = this.getAttribute("transform") || 1;
      this.transform = Number(this.transform);
      this.coordinates = this.getAttribute("coordinates") || "screen";
      figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
      if (!this.hasAttribute("value")) {
        this.setAttribute("value", "50% 50%");
      }

      if (this.querySelector(".fig-input-joystick-plane")) {
        this.#reuseRenderedMarkup();
        return;
      }

      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
      this.#syncValueAttribute();
      this.#syncResetButton();
      this.#initialized = true;
    });
  }

  // Convert Y for display (CSS uses top-down, math uses bottom-up)
  #displayY(y) {
    return this.coordinates === "math" ? 1 - y : y;
  }

  disconnectedCallback() {
    this.#cleanupListeners();
  }

  get #fieldsEnabled() {
    const fields = this.getAttribute("fields");
    if (fields === null) return false;
    return fields.toLowerCase() !== "false";
  }

  #render() {
    this.innerHTML = this.#getInnerHTML();
  }

  #getAxisLabels() {
    const raw = (this.getAttribute("axis-labels") || "").trim();
    if (!raw) {
      return { left: "", right: "", top: "", bottom: "", leftNoRotate: false };
    }
    const tokens = raw.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 1) {
      return {
        left: "",
        right: "",
        top: tokens[0],
        bottom: "",
        leftNoRotate: false,
      };
    }
    if (tokens.length === 2) {
      const [x, y] = tokens;
      return { left: x, right: "", top: "", bottom: y, leftNoRotate: true };
    }
    if (tokens.length === 4) {
      const [left, right, top, bottom] = tokens;
      return { left, right, top, bottom, leftNoRotate: false };
    }
    return { left: "", right: "", top: "", bottom: "", leftNoRotate: false };
  }

  #getInnerHTML() {
    const axisLabels = this.#getAxisLabels();
    const labelsMarkup = [
      axisLabels.left
        ? `<label class="fig-joystick-axis-label left${axisLabels.leftNoRotate ? " no-rotate" : ""}" aria-hidden="true">${axisLabels.left}</label>`
        : "",
      axisLabels.right
        ? `<label class="fig-joystick-axis-label right" aria-hidden="true">${axisLabels.right}</label>`
        : "",
      axisLabels.top
        ? `<label class="fig-joystick-axis-label top" aria-hidden="true">${axisLabels.top}</label>`
        : "",
      axisLabels.bottom
        ? `<label class="fig-joystick-axis-label bottom" aria-hidden="true">${axisLabels.bottom}</label>`
        : "",
    ].join("");

    return `        
          <div class="fig-input-joystick-plane-container">
            ${labelsMarkup}
            <div class="fig-input-joystick-plane">
              <div class="fig-input-joystick-guides"></div>
              <fig-handle drag drag-surface=".fig-input-joystick-plane" drag-axes="x,y" drag-snapping="modifier"></fig-handle>
            </div>
            <fig-tooltip text="Reset">
              <fig-button variant="ghost" icon="true" class="fig-joystick-reset" aria-label="Reset to default">
                <fig-icon name="reset" size="small"></fig-icon>
              </fig-button>
            </fig-tooltip>
          </div>
          ${
            this.#fieldsEnabled
              ? `<div class="joystick-values">
                  <fig-input-number
                    name="x"
                    step="1"
                    value="${(this.position.x * 100).toFixed(this.precision)}"
                    min="0"
                    max="100"
                    units="%">
                    <span slot="prepend">X</span>
                  </fig-input-number>
                  <fig-input-number
                    name="y"
                    step="1"
                    min="0"
                    max="100"
                    value="${(this.position.y * 100).toFixed(this.precision)}"
                    units="%">
                    <span slot="prepend">Y</span>
                  </fig-input-number>
                </div>`
              : ""
          }
        `;
  }

  #setupListeners() {
    this.plane = this.querySelector(".fig-input-joystick-plane");
    this.cursor = this.querySelector("fig-handle");
    this.xInput = this.querySelector("fig-input-number[name='x']");
    this.yInput = this.querySelector("fig-input-number[name='y']");
    this.plane?.addEventListener("pointerdown", this.#boundPlanePointerDown);
    this.cursor?.addEventListener("pointerdown", this.#boundHandlePointerDown);
    this.cursor?.addEventListener("input", this.#boundHandleInput);
    this.cursor?.addEventListener("change", this.#boundHandleChange);
    const resetBtn = this.querySelector(".fig-joystick-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.#resetToDefault());
    }
    if (this.#fieldsEnabled && this.xInput && this.yInput) {
      this.xInput.addEventListener("input", this.#boundXInput);
      this.xInput.addEventListener("change", this.#boundXInput);
      this.xInput.addEventListener("focusout", this.#boundXFocusOut);
      this.yInput.addEventListener("input", this.#boundYInput);
      this.yInput.addEventListener("change", this.#boundYInput);
      this.yInput.addEventListener("focusout", this.#boundYFocusOut);
    }
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("pointerdown", this.#boundPlanePointerDown);
    this.cursor?.removeEventListener(
      "pointerdown",
      this.#boundHandlePointerDown,
    );
    this.cursor?.removeEventListener("input", this.#boundHandleInput);
    this.cursor?.removeEventListener("change", this.#boundHandleChange);
    this.plane?.classList.remove("dragging");
    this.isDragging = false;
    if (this.#fieldsEnabled && this.xInput && this.yInput) {
      this.xInput.removeEventListener("input", this.#boundXInput);
      this.xInput.removeEventListener("change", this.#boundXInput);
      this.xInput.removeEventListener("focusout", this.#boundXFocusOut);
      this.yInput.removeEventListener("input", this.#boundYInput);
      this.yInput.removeEventListener("change", this.#boundYInput);
      this.yInput.removeEventListener("focusout", this.#boundYFocusOut);
    }
  }

  #handleXInput(e) {
    const next = Number.parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;
    this.position.x = Math.max(0, Math.min(1, next / 100));
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#emitInputEvent();
  }

  #handleYInput(e) {
    const next = Number.parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;
    this.position.y = Math.max(0, Math.min(1, next / 100));
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#emitInputEvent();
  }

  #handleFieldFocusOut() {
    this.#syncValueAttribute();
    this.#emitChangeEvent();
  }

  #applyScreenPosition(screenX, screenY, { syncHandle = true } = {}) {
    const x = Math.max(0, Math.min(1, screenX));
    const yScreen = Math.max(0, Math.min(1, screenY));
    const y = this.coordinates === "math" ? 1 - yScreen : yScreen;
    this.position = { x, y };
    if (syncHandle) this.#syncHandlePosition();
    this.#syncValueAttribute();
  }

  #handlePlanePointerDown(e) {
    if (!this.plane || !this.cursor) return;
    if (e.target?.closest?.(".fig-joystick-reset, fig-tooltip, fig-handle"))
      return;
    const rect = this.plane.getBoundingClientRect();
    const screenX = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    const screenY =
      rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
    this.cursor.value = `${Math.round(screenX * 100)}% ${Math.round(screenY * 100)}%`;
    this.#applyScreenPosition(screenX, screenY, { syncHandle: false });
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleHandleInput(e) {
    const detail = e.detail ?? {};
    if (typeof detail.px !== "number" || typeof detail.py !== "number") return;
    this.#applyScreenPosition(detail.px, detail.py, { syncHandle: false });
    this.#emitInputEvent();
  }

  #handleHandleChange() {
    this.isDragging = false;
    this.plane?.classList.remove("dragging");
    this.#syncValueAttribute();
    this.#emitChangeEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, x: this.position.x, y: this.position.y },
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, x: this.position.x, y: this.position.y },
      }),
    );
  }

  #syncHandlePosition() {
    const displayY = this.#displayY(this.position.y);
    if (this.cursor) {
      this.cursor.value = `${this.position.x * 100}% ${displayY * 100}%`;
    }
    // Also sync text inputs if they exist (convert to percentage 0-100)
    if (this.#fieldsEnabled && this.xInput && this.yInput) {
      this.xInput.setAttribute("value", Math.round(this.position.x * 100));
      this.yInput.setAttribute("value", Math.round(this.position.y * 100));
    }
  }

  #syncValueAttribute() {
    const next = this.value;
    if (this.getAttribute("value") !== next) {
      this.#isSyncingValueAttr = true;
      this.setAttribute("value", next);
      this.#isSyncingValueAttr = false;
    }
    this.#syncResetButton();
  }

  #syncResetButton() {
    const d = this.#defaultPosition;
    const isDefault =
      Math.round(this.position.x * 100) === Math.round(d.x * 100) &&
      Math.round(this.position.y * 100) === Math.round(d.y * 100);
    this.toggleAttribute("default", isDefault);
    this.style.setProperty("--is-not-default", isDefault ? "0" : "1");
  }

  #resetToDefault() {
    this.position = { ...this.#defaultPosition };
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  focus() {
    this.cursor?.focus();
  }
  static get observedAttributes() {
    return [
      "value",
      "precision",
      "transform",
      "fields",
      "coordinates",
      "aspect-ratio",
      "axis-labels",
    ];
  }
  get value() {
    return `${Math.round(this.position.x * 100)}% ${Math.round(this.position.y * 100)}%`;
  }
  set value(value) {
    const normalized = value == null ? "" : String(value).trim();
    if (!normalized) {
      this.position = { x: 0.5, y: 0.5 };
    } else {
      const parts = normalized.split(/[\s,]+/).filter(Boolean);
      const parseAxis = (token) => {
        if (!token) return 0.5;
        const isPercent = token.includes("%");
        const numeric = Number.parseFloat(token.replace(/%/g, "").trim());
        if (!Number.isFinite(numeric)) return 0.5;
        const decimal =
          isPercent || Math.abs(numeric) > 1 ? numeric / 100 : numeric;
        return Math.max(0, Math.min(1, decimal));
      };
      const x = parseAxis(parts[0]);
      const y = parseAxis(parts[1] ?? parts[0]);
      this.position = { x, y };
    }
    if (this.#initialized) {
      this.#syncHandlePosition();
      this.#syncResetButton();
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      return;
    }
    if (name === "value") {
      if (this.#isSyncingValueAttr || this.isDragging) return;
      this.value = newValue;
    }
    if (name === "precision") {
      this.precision = parseInt(newValue);
    }
    if (name === "transform") {
      this.transform = Number(newValue);
    }
    if (name === "fields" && newValue !== oldValue) {
      this.#cleanupListeners();
      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
    }
    if (name === "axis-labels" && newValue !== oldValue) {
      this.#cleanupListeners();
      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
    }
    if (name === "coordinates") {
      this.coordinates = newValue || "screen";
      this.#syncHandlePosition();
    }
  }
}

customElements.define("fig-joystick", FigInputJoystick);


// FigInputAngle moved to fig-lab.js
// FigShimmer
class FigShimmer extends HTMLElement {
  get durationPropertyName() {
    return this.localName === "fig-skeleton"
      ? "--fig-skeleton-duration"
      : "--fig-shimmer-duration";
  }

  connectedCallback() {
    const duration = this.getAttribute("duration");
    if (duration) {
      this.style.setProperty(this.durationPropertyName, duration);
    }
    this.#syncA11y();
  }

  static get observedAttributes() {
    return ["duration", "playing", "aria-label", "aria-labelledby"];
  }

  get playing() {
    return this.getAttribute("playing") !== "false";
  }

  set playing(value) {
    if (value) {
      this.removeAttribute("playing"); // Default is playing
    } else {
      this.setAttribute("playing", "false");
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "duration") {
      this.style.setProperty(this.durationPropertyName, newValue || "1.5s");
    }
    if (name === "playing" || name === "aria-label" || name === "aria-labelledby") {
      this.#syncA11y();
    }
  }

  #syncA11y() {
    const playing = this.playing;
    this.setAttribute("aria-busy", playing ? "true" : "false");
    if (this.hasAttribute("aria-label") || this.hasAttribute("aria-labelledby")) {
      if (!this.hasAttribute("role")) this.setAttribute("role", "status");
      this.removeAttribute("aria-hidden");
    } else {
      this.removeAttribute("role");
      this.setAttribute("aria-hidden", "true");
    }
  }
}
customElements.define("fig-shimmer", FigShimmer);

// FigSkeleton
class FigSkeleton extends FigShimmer {
  connectedCallback() {
    super.connectedCallback();
    this.inert = true;
    this.setAttribute("inert", "");
  }
}
customElements.define("fig-skeleton", FigSkeleton);

// FigGroup
class FigGroup extends HTMLElement {
  static observedAttributes = ["name", "collapsible", "open"];

  #header = null;
  #chevron = null;

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    if (this.#chevron) {
      this.#chevron.removeEventListener("click", this.#handleToggle);
    }
    if (this.#header) {
      this.#header.removeEventListener("click", this.#handleToggle);
      this.#header.removeEventListener("keydown", this.#handleHeaderKeyDown);
      this.#header.querySelector("h3")?.removeEventListener("click", this.#handleToggle);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "open") {
      this.#header?.setAttribute("aria-expanded", String(this.open));
      return;
    }
    this.#render();
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    const was = this.open;
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
    this.#header?.setAttribute("aria-expanded", String(!!value));
    if (was !== !!value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: !!value },
          bubbles: true,
        }),
      );
    }
  }

  #handleToggle = (e) => {
    e.stopPropagation();
    this.open = !this.open;
  };

  #handleHeaderKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    this.open = !this.open;
  };

  #render() {
    const isCollapsible = this.hasAttribute("collapsible");
    const nameAttr = this.getAttribute("name");
    const label = nameAttr || (isCollapsible ? "Group" : null);

    // Check if user supplied their own fig-header
    const userHeader = this.querySelector(":scope > fig-header");

    if (!label && !isCollapsible && !userHeader) {
      if (this.#header && this.#header.dataset.generated) {
        this.#header.remove();
        this.#header = null;
        this.#chevron = null;
      }
      return;
    }

    if (userHeader) {
      this.#header = userHeader;
    } else if (!this.#header || !this.#header.dataset.generated) {
      this.#header = document.createElement("fig-header");
      this.#header.setAttribute("borderless", "");
      this.#header.dataset.generated = "true";
      this.prepend(this.#header);
    }

    // Ensure h3 exists inside header
    let h3 = this.#header.querySelector("h3");
    if (!h3) {
      h3 = document.createElement("h3");
      this.#header.prepend(h3);
    }
    if (!h3.id) h3.id = figUniqueId();
    if (this.#header.dataset.generated) {
      h3.textContent = label;
    }
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-labelledby", h3.id);
    }

    if (isCollapsible) {
      if (!h3.querySelector(".fig-group-chevron")) {
        const chevron = createFigIcon("chevron", {
          size: "small",
          className: "fig-group-chevron",
        });
        h3.prepend(chevron);
      }
      this.#chevron = h3.querySelector(".fig-group-chevron");
      h3.removeEventListener("click", this.#handleToggle);
      this.#header.removeEventListener("click", this.#handleToggle);
      this.#header.addEventListener("click", this.#handleToggle);
      this.#header.setAttribute("role", "button");
      this.#header.setAttribute("tabindex", "0");
      this.#header.setAttribute("aria-expanded", String(this.open));
      this.#header.removeEventListener("keydown", this.#handleHeaderKeyDown);
      this.#header.addEventListener("keydown", this.#handleHeaderKeyDown);

      if (!this.hasAttribute("open")) {
        this.setAttribute("open", "false");
        this.#header.setAttribute("aria-expanded", "false");
      }
    } else {
      h3.removeEventListener("click", this.#handleToggle);
      this.#header.removeEventListener("click", this.#handleToggle);
      this.#header.removeAttribute("role");
      this.#header.removeAttribute("tabindex");
      this.#header.removeAttribute("aria-expanded");
      this.#header.removeEventListener("keydown", this.#handleHeaderKeyDown);
      if (this.#chevron) {
        this.#chevron.remove();
        this.#chevron = null;
      }
      this.removeAttribute("open");
    }
  }
}
customElements.define("fig-group", FigGroup);

/**
 * A presentational header element used inside fig-dialog, fig-group, and other containers.
 * Styling is handled entirely in CSS; this registration makes it a known custom element.
 *
 * @attr {boolean} borderless - Removes the bottom border
 * @attr {boolean} dialog-header - Marks this as a dialog header (auto-generated by fig-dialog)
 */
class FigHeader extends HTMLElement {}
customElements.define("fig-header", FigHeader);

/**
 * fig-footer
 * @element fig-footer
 * @attr {boolean} borderless - Removes the top border
 */
class FigFooter extends HTMLElement {}
customElements.define("fig-footer", FigFooter);

/* Presentational elements (CSS-only, no behavior) */
class FigSpinner extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "status");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-label", "Loading");
    }
  }
}
customElements.define("fig-spinner", FigSpinner);

/**
 * A styled visual preview layer for arbitrary content such as images, canvas,
 * video, SVG, or custom rendered surfaces.
 * @attr {string} fit - CSS object-fit value for direct media children
 */
class FigPreview extends HTMLElement {
  static get observedAttributes() {
    return ["fit"];
  }

  connectedCallback() {
    this.#syncFit();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "fit") this.#syncFit();
  }

  #syncFit() {
    const fit = this.getAttribute("fit");
    if (fit) {
      this.style.setProperty("--fig-preview-fit", fit);
    } else {
      this.style.removeProperty("--fig-preview-fit");
    }
  }
}
customElements.define("fig-preview", FigPreview);

/** @type {Record<string, string | { medium: string, small: string }>} */
const FIG_ICON_TOKENS = {
  chevron: "--icon-16-chevron",
  checkmark: "--icon-16-checkmark",
  reset: "--icon-16-reset",
  "arrow-left": "--icon-16-arrow-left",
  steppers: "--icon-24-steppers",
  eyedropper: "--icon-24-eyedropper",
  add: "--icon-24-add",
  minus: "--icon-24-minus",
  back: "--icon-24-back",
  forward: "--icon-24-forward",
  close: { medium: "--icon-24-close", small: "--icon-16-close" },
  rotate: "--icon-24-rotate",
  swap: "--icon-24-swap",
  play: "--icon-24-play",
  pause: "--icon-24-pause",
  search: "--icon-24-search",
  visible: { medium: "--icon-24-visible", small: "--icon-16-visible" },
  hidden: { medium: "--icon-24-hidden", small: "--icon-16-hidden" },
};

function figIconCssVar(name, size = "medium") {
  const token = name && FIG_ICON_TOKENS[name];
  if (!token) return "";

  const tokenName =
    typeof token === "string"
      ? token
      : token[size === "small" ? "small" : "medium"];
  return tokenName ? `var(${tokenName})` : "";
}

/**
 * Masked icon using design-token SVGs from :root.
 * @attr {string} name - Icon name (chevron, add, close, …)
 * @attr {'small'|'medium'} size - Display size; medium (default) uses --spacer-4, small uses --spacer-3
 * @attr {string} color - Icon fill color (applied as background-color for the mask)
 */
class FigIcon extends HTMLElement {
  static get observedAttributes() {
    return ["name", "size", "color"];
  }

  connectedCallback() {
    this.#sync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this.#sync();
  }

  #sync() {
    const iconName = this.getAttribute("name");
    const size = this.getAttribute("size") || "medium";
    const cssVar = figIconCssVar(iconName, size);
    if (cssVar) this.style.setProperty("--icon", cssVar);
    else this.style.removeProperty("--icon");

    if (size === "small") {
      this.style.setProperty("--size", "var(--spacer-3)");
    } else {
      this.style.removeProperty("--size");
    }

    const color = this.getAttribute("color");
    if (color) this.style.backgroundColor = color;
    else this.style.removeProperty("background-color");

    if (!this.hasAttribute("aria-hidden")) {
      this.setAttribute("aria-hidden", "true");
    }
  }
}
customElements.define("fig-icon", FigIcon);

class FigContent extends HTMLElement {}
customElements.define("fig-content", FigContent);

class FigTabContent extends HTMLElement {}
customElements.define("fig-tab-content", FigTabContent);

class FigButtonCombo extends HTMLElement {}
customElements.define("fig-button-combo", FigButtonCombo);

class FigInputCombo extends HTMLElement {}
customElements.define("fig-input-combo", FigInputCombo);



/* Color Tip */
/**
 * A compact solid-color tip that wraps fig-fill-picker.
 * @attr {string} value - Solid color string (hex/rgb/hsl/named)
 * @attr {boolean} selected - Whether the tip is selected
 * @attr {boolean} disabled - Whether the tip is disabled
 * @fires input - While color changes
 * @fires change - When color is committed
 */
class FigColorTip extends HTMLElement {
  #fillPicker = null;
  #chit = null;
  #chitSelectedObserver = null;
  #boundHandleInput = this.#handlePickerInput.bind(this);
  #boundHandleChange = this.#handlePickerChange.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "selected",
      "disabled",
      "alpha",
      "control",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
    ];
  }

  get #controlMode() {
    return this.getAttribute("control") || "color";
  }

  connectedCallback() {
    this.#render();
    this.#syncFromAttributes();
  }

  disconnectedCallback() {
    this.#teardownListeners();
    this.removeEventListener("click", this.#handleControlClick);
  }

  #teardownListeners() {
    if (this.#fillPicker) {
      this.#fillPicker.removeEventListener("input", this.#boundHandleInput);
      this.#fillPicker.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.#chit) {
      this.#chit.removeEventListener("input", this.#boundHandleInput);
      this.#chit.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.#chitSelectedObserver) {
      this.#chitSelectedObserver.disconnect();
      this.#chitSelectedObserver = null;
    }
  }

  #observeChitSelected() {
    if (this.#chitSelectedObserver) {
      this.#chitSelectedObserver.disconnect();
      this.#chitSelectedObserver = null;
    }
    if (!this.#chit) return;
    this.#chitSelectedObserver = new MutationObserver(() => {
      const chitSelected =
        this.#chit?.hasAttribute("selected") &&
        this.#chit.getAttribute("selected") !== "false";
      if (chitSelected) {
        if (!this.hasAttribute("selected")) this.setAttribute("selected", "");
      } else if (this.hasAttribute("selected")) {
        this.removeAttribute("selected");
      }
    });
    this.#chitSelectedObserver.observe(this.#chit, {
      attributes: true,
      attributeFilter: ["selected"],
    });
  }

  get #alphaEnabled() {
    const v = this.getAttribute("alpha");
    return v === null || v !== "false";
  }

  #render() {
    const mode = this.#controlMode;
    if (mode === "add" || mode === "remove") {
      const iconName = mode === "add" ? "add" : "minus";
      const label = this.getAttribute("aria-label") || (mode === "add" ? "Add color stop" : "Remove color stop");
      this.innerHTML = `<fig-button icon variant="ghost" aria-label="${label}"><fig-icon name="${iconName}"></fig-icon></fig-button>`;
      this.#fillPicker = null;
      this.#chit = null;
      this.addEventListener("click", this.#handleControlClick);
      this.#syncA11y();
      return;
    }
    this.removeEventListener("click", this.#handleControlClick);

    const rawValue = (this.getAttribute("value") || "").trim();
    const color = this.#normalizeColor(rawValue);
    const alpha = this.#extractAlpha(rawValue);
    const alphaAttr = this.#alphaEnabled ? "" : 'alpha="false"';
    const pickerValue =
      alpha < 1
        ? JSON.stringify({
            type: "solid",
            color,
            opacity: Math.round(alpha * 100),
          })
        : JSON.stringify({ type: "solid", color });
    const chitAlphaAttr = alpha < 1 ? ` alpha="${alpha}"` : "";
    this.innerHTML = hasFigFillPicker()
      ? `<fig-fill-picker mode="solid" ${alphaAttr} value='${pickerValue}'>
          <fig-chit background="${color}"${chitAlphaAttr}></fig-chit>
        </fig-fill-picker>`
      : `<fig-chit background="${color}"${chitAlphaAttr}></fig-chit>`;

    this.#fillPicker = this.querySelector("fig-fill-picker");
    this.#chit = this.querySelector("fig-chit");
    this.#teardownListeners();
    this.#fillPicker?.addEventListener("input", this.#boundHandleInput);
    this.#fillPicker?.addEventListener("change", this.#boundHandleChange);
    if (!this.#fillPicker) {
      this.#chit?.addEventListener("input", this.#boundHandleInput);
      this.#chit?.addEventListener("change", this.#boundHandleChange);
    }
    this.#observeChitSelected();
    this.#syncA11y();
  }

  #handleControlClick = () => {
    const mode = this.#controlMode;
    this.dispatchEvent(
      new CustomEvent(mode, { bubbles: true, composed: true }),
    );
  };

  #normalizeHex(hex) {
    if (!hex) return "#D9D9D9";
    const raw = hex.replace("#", "").trim();
    if (raw.length === 3 || raw.length === 4) {
      const [r, g, b] = raw;
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    if (raw.length === 6 || raw.length === 8) {
      return `#${raw.slice(0, 6)}`.toUpperCase();
    }
    return "#D9D9D9";
  }

  #extractAlpha(colorValue) {
    if (!colorValue) return 1;
    const v = String(colorValue).trim();
    const hex = v.replace(/^#/, "");
    if (/^[0-9a-f]{4}$/i.test(hex)) {
      const a = hex[3];
      return parseInt(`${a}${a}`, 16) / 255;
    }
    if (/^[0-9a-f]{8}$/i.test(hex)) {
      return parseInt(hex.slice(6, 8), 16) / 255;
    }
    const rgbaMatch = v.match(
      /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i,
    );
    if (rgbaMatch) return parseFloat(rgbaMatch[1]);
    return 1;
  }

  #normalizeColor(colorValue) {
    if (!colorValue) return "#D9D9D9";
    const value = String(colorValue).trim();

    if (value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        if (parsed?.color) {
          return this.#normalizeColor(parsed.color);
        }
      } catch {
        // Ignore parse errors and continue.
      }
    }

    if (value.startsWith("#")) {
      return this.#normalizeHex(value);
    }
    if (/^[0-9a-f]{3,4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(value)) {
      return this.#normalizeHex(value);
    }

    try {
      const { ctx } = figGetSharedCanvas(1, 1);
      ctx.fillStyle = "#000000";
      ctx.fillStyle = value;
      const resolved = ctx.fillStyle;
      if (resolved.startsWith("#")) {
        return this.#normalizeHex(resolved);
      }
      const rgb = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgb) {
        const toHex = (v) =>
          Math.max(0, Math.min(255, Number(v)))
            .toString(16)
            .padStart(2, "0");
        return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`.toUpperCase();
      }
    } catch {
      // Fall through to default.
    }

    return "#D9D9D9";
  }

  #syncFromAttributes() {
    const rawAttr = this.getAttribute("value");
    const color = this.#normalizeColor(rawAttr);
    const alpha = this.#extractAlpha(rawAttr);
    if (rawAttr !== color && alpha >= 1) {
      this.setAttribute("value", color);
      return;
    }

    if (this.#fillPicker) {
      this.#syncA11y();
      const pickerVal =
        alpha < 1
          ? { type: "solid", color, opacity: Math.round(alpha * 100) }
          : { type: "solid", color };
      this.#fillPicker.setAttribute("value", JSON.stringify(pickerVal));
      if (this.#alphaEnabled) {
        this.#fillPicker.removeAttribute("alpha");
      } else {
        this.#fillPicker.setAttribute("alpha", "false");
      }
      if (this.hasAttribute("disabled")) {
        this.#fillPicker.setAttribute("disabled", "");
      } else {
        this.#fillPicker.removeAttribute("disabled");
      }
    }

    if (this.#chit) {
      this.#syncA11y();
      this.#chit.setAttribute("background", color);
      if (alpha < 1) {
        this.#chit.setAttribute("alpha", String(alpha));
      } else {
        this.#chit.removeAttribute("alpha");
      }
      if (this.hasAttribute("disabled")) {
        this.#chit.setAttribute("disabled", "");
      } else {
        this.#chit.removeAttribute("disabled");
      }
    }
  }

  #syncA11y() {
    const mode = this.#controlMode;
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.setAttribute("aria-pressed", selected ? "true" : "false");
    if (mode === "add" || mode === "remove") {
      const button = this.querySelector("fig-button");
      const label = this.getAttribute("aria-label") || (mode === "add" ? "Add color stop" : "Remove color stop");
      button?.setAttribute("aria-label", label);
      if (disabled) button?.setAttribute("disabled", "");
      else button?.removeAttribute("disabled");
      return;
    }

    const target = this.#fillPicker || this.#chit;
    if (!target) return;
    const label = this.getAttribute("aria-label") || "Color stop";
    const labelledBy = this.getAttribute("aria-labelledby");
    const describedBy = this.getAttribute("aria-describedby");
    if (labelledBy) {
      target.setAttribute("aria-labelledby", labelledBy);
      target.removeAttribute("aria-label");
    } else {
      target.setAttribute("aria-label", label);
      target.removeAttribute("aria-labelledby");
    }
    if (describedBy) target.setAttribute("aria-describedby", describedBy);
    else target.removeAttribute("aria-describedby");
  }

  #updateColorFromPicker(detail, type) {
    const nextColor = this.#normalizeColor(detail?.color);
    const prevColor = this.#normalizeColor(this.getAttribute("value"));
    if (nextColor !== prevColor) {
      this.setAttribute("value", nextColor);
    } else {
      this.#syncFromAttributes();
    }

    const eventDetail = { color: this.value };
    if (this.#alphaEnabled) {
      if (detail?.opacity !== undefined) {
        eventDetail.opacity = detail.opacity;
      } else if (detail?.alpha !== undefined) {
        eventDetail.opacity = Math.round(detail.alpha * 100);
      }
    }

    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: eventDetail,
      }),
    );
  }

  #handlePickerInput(event) {
    event.stopPropagation();
    this.#updateColorFromPicker(event.detail || { color: event.target?.value }, "input");
  }

  #handlePickerChange(event) {
    event.stopPropagation();
    this.#updateColorFromPicker(event.detail || { color: event.target?.value }, "change");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (!this.isConnected) return;

    switch (name) {
      case "control":
        this.#render();
        break;
      case "value":
      case "selected":
      case "disabled":
      case "aria-label":
      case "aria-labelledby":
      case "aria-describedby":
        this.#syncFromAttributes();
        this.#syncA11y();
        break;
    }
  }

  get value() {
    return this.#normalizeColor(this.getAttribute("value"));
  }
  set value(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("value");
      return;
    }
    this.setAttribute("value", this.#normalizeColor(value));
  }

  get selected() {
    return this.hasAttribute("selected");
  }
  set selected(value) {
    this.toggleAttribute("selected", Boolean(value));
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }
}
customElements.define("fig-color-tip", FigColorTip);

/* Choice */
/**
 * A generic choice container for use within FigChooser.
 * @attr {string} value - Identifier for this choice
 * @attr {boolean} selected - Whether this choice is currently selected
 * @attr {boolean} disabled - Whether this choice is disabled
 */
class FigChoice extends HTMLElement {
  static get observedAttributes() {
    return ["selected", "disabled"];
  }

  connectedCallback() {
    this.setAttribute("role", "option");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
    this.setAttribute(
      "aria-selected",
      this.hasAttribute("selected") ? "true" : "false",
    );
    if (this.hasAttribute("disabled")) {
      this.setAttribute("aria-disabled", "true");
    }
  }

  attributeChangedCallback(name) {
    if (name === "selected") {
      this.setAttribute(
        "aria-selected",
        this.hasAttribute("selected") ? "true" : "false",
      );
    }
    if (name === "disabled") {
      const isDisabled =
        this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false";
      if (isDisabled) {
        this.setAttribute("aria-disabled", "true");
        this.setAttribute("tabindex", "-1");
      } else {
        this.removeAttribute("aria-disabled");
        this.setAttribute("tabindex", "0");
      }
    }
  }
}
customElements.define("fig-choice", FigChoice);

/* Chooser */
/**
 * A selection controller for a list of choice elements.
 * @attr {string} choice-element - CSS selector for child choices (default: "fig-choice")
 * @attr {string} layout - Layout mode: "vertical" (default), "horizontal", "grid"
 * @attr {number} columns - Number of columns when layout="grid" (default: 2)
 * @attr {string} value - Value of the currently selected choice
 * @attr {boolean} disabled - Whether the chooser is disabled
 */
class FigChooser extends HTMLElement {
  #selectedChoice = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #boundSyncOverflow = this.#syncOverflow.bind(this);
  #mutationObserver = null;
  #resizeObserver = null;
  #navStart = null;
  #navEnd = null;
  #dragState = null;
  #isUnwrapping = false;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "choice-element",
      "columns",
      "drag",
      "layout",
      "overflow",
      "loop",
    ];
  }

  get #overflowMode() {
    return this.getAttribute("overflow") === "scrollbar"
      ? "scrollbar"
      : "buttons";
  }

  get #dragEnabled() {
    const attr = this.getAttribute("drag");
    return attr === null || attr !== "false";
  }

  get #choiceSelector() {
    return this.getAttribute("choice-element") || "fig-choice";
  }

  #syncGridColumns() {
    const raw = this.getAttribute("columns");
    const columns = raw === null ? NaN : Number(raw);
    if (Number.isInteger(columns) && columns > 0) {
      this.style.setProperty("--fig-chooser-grid-columns", String(columns));
    } else {
      this.style.removeProperty("--fig-chooser-grid-columns");
    }
  }

  get choices() {
    return Array.from(this.querySelectorAll(`:scope > ${this.#choiceSelector}`));
  }

  get selectedChoice() {
    return this.#selectedChoice;
  }

  set selectedChoice(element) {
    if (element && !this.contains(element)) return;
    const choices = this.choices;
    for (const choice of choices) {
      const shouldSelect = choice === element;
      const isSelected = choice.hasAttribute("selected");
      if (shouldSelect && !isSelected) {
        choice.setAttribute("selected", "");
      } else if (!shouldSelect && isSelected) {
        choice.removeAttribute("selected");
      }
    }
    this.#selectedChoice = element;
    const val = element?.getAttribute("value") ?? "";
    if (this.getAttribute("value") !== val) {
      if (val) {
        this.setAttribute("value", val);
      }
    }
    this.#scrollToChoice(element);
  }

  get value() {
    return this.#selectedChoice?.getAttribute("value") ?? "";
  }

  set value(val) {
    if (val === null || val === undefined || val === "") return;
    this.setAttribute("value", String(val));
  }

  connectedCallback() {
    this.setAttribute("role", "listbox");
    if (this.shadowRoot) this.shadowRoot.replaceChildren();
    this.#syncGridColumns();
    this.#removeLegacyScroller();
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("scroll", this.#boundSyncOverflow);
    this.#applyOverflowMode();
    this.#setupDrag();
    this.#startObserver();
    this.#startResizeObserver();

    figNextFrame(this, () => {
      this.#syncSelection();
      this.#syncOverflow();
      this.#scheduleInitialScrollSettle();
    });
  }

  #scheduleInitialScrollSettle() {
    const resettle = () => {
      if (!this.isConnected) return;
      if (this.#selectedChoice) {
        this.#scrollToChoice(this.#selectedChoice, "auto");
      }
    };
    const wireImages = () => {
      const imgs = this.querySelectorAll("img, video");
      for (const m of imgs) {
        if (m.tagName === "IMG" ? m.complete : m.readyState >= 1) continue;
        const done = () => {
          m.removeEventListener("load", done);
          m.removeEventListener("loadedmetadata", done);
          m.removeEventListener("error", done);
          resettle();
        };
        m.addEventListener("load", done);
        m.addEventListener("loadedmetadata", done);
        m.addEventListener("error", done);
      }
    };
    requestAnimationFrame(() => {
      wireImages();
      resettle();
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#teardownDrag();
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#removeNavButtons();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value" && newValue !== oldValue && newValue) {
      this.#selectByValue(newValue);
    }
    if (name === "disabled") {
      const isDisabled = newValue !== null && newValue !== "false";
      const choices = this.choices;
      for (const choice of choices) {
        if (isDisabled) {
          choice.setAttribute("aria-disabled", "true");
          choice.setAttribute("tabindex", "-1");
        } else {
          choice.removeAttribute("aria-disabled");
          choice.setAttribute("tabindex", "0");
        }
      }
    }
    if (name === "choice-element") {
      requestAnimationFrame(() => this.#syncSelection());
    }
    if (name === "columns") {
      this.#syncGridColumns();
    }
    if (name === "drag") {
      if (this.#dragEnabled) {
        this.#setupDrag();
      } else {
        this.#teardownDrag();
      }
    }
    if (name === "overflow") {
      this.#applyOverflowMode();
    }
    if (name === "layout") {
      this.#applyOverflowMode();
      requestAnimationFrame(() => this.#syncOverflow());
    }
  }

  #syncSelection() {
    const choices = this.choices;
    if (!choices.length) {
      this.#selectedChoice = null;
      return;
    }

    const valueAttr = this.getAttribute("value");
    if (valueAttr && this.#selectByValue(valueAttr)) return;

    const alreadySelected = choices.find((c) => c.hasAttribute("selected"));
    if (alreadySelected) {
      this.selectedChoice = alreadySelected;
      return;
    }

    this.selectedChoice = choices[0];
  }

  #selectByValue(value) {
    const choices = this.choices;
    for (const choice of choices) {
      if (choice.getAttribute("value") === value) {
        this.selectedChoice = choice;
        return true;
      }
    }
    return false;
  }

  #findChoiceFromTarget(target) {
    const selector = this.#choiceSelector;
    let el = target;
    while (el && el !== this) {
      if (el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  #handleClick(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    const choice = this.#findChoiceFromTarget(event.target);
    if (!choice) return;
    if (
      choice.hasAttribute("disabled") &&
      choice.getAttribute("disabled") !== "false"
    )
      return;
    this.selectedChoice = choice;
    this.#emitEvents();
  }

  #handleKeyDown(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    const choices = this.choices.filter(
      (c) =>
        !c.hasAttribute("disabled") || c.getAttribute("disabled") === "false",
    );
    if (!choices.length) return;
    const currentIndex = choices.indexOf(this.#selectedChoice);
    let nextIndex = currentIndex;

    const loop = this.hasAttribute("loop");

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        if (currentIndex < choices.length - 1) {
          nextIndex = currentIndex + 1;
        } else if (loop) {
          nextIndex = 0;
        }
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        if (currentIndex > 0) {
          nextIndex = currentIndex - 1;
        } else if (loop) {
          nextIndex = choices.length - 1;
        }
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = choices.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (document.activeElement?.matches(this.#choiceSelector)) {
          const focused = this.#findChoiceFromTarget(document.activeElement);
          if (focused && focused !== this.#selectedChoice) {
            this.selectedChoice = focused;
            this.#emitEvents();
          }
        }
        return;
      default:
        return;
    }

    if (nextIndex !== currentIndex && choices[nextIndex]) {
      this.selectedChoice = choices[nextIndex];
      choices[nextIndex].focus();
      this.#emitEvents();
    }
  }

  #emitEvents() {
    const val = this.value;
    this.dispatchEvent(
      new CustomEvent("input", { detail: val, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: val, bubbles: true }),
    );
  }

  #syncOverflow() {
    if (this.#overflowMode === "scrollbar") return;
    const isHorizontal = this.getAttribute("layout") === "horizontal";
    figSyncOverflowState(this, this, isHorizontal ? "x" : "y");
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#syncOverflow();
    });
    this.#resizeObserver.observe(this);
  }

  #setupDrag() {
    if (this.#dragState?.bound) return;
    if (!this.#dragEnabled) return;

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("[data-fig-chooser-nav]")) return;
      const isHorizontal = this.getAttribute("layout") === "horizontal";
      const hasOverflow = isHorizontal
        ? this.scrollWidth > this.clientWidth
        : this.scrollHeight > this.clientHeight;
      if (!hasOverflow) return;

      this.#dragState.active = true;
      this.#dragState.didDrag = false;
      this.#dragState.startX = e.clientX;
      this.#dragState.startY = e.clientY;
      this.#dragState.scrollLeft = this.scrollLeft;
      this.#dragState.scrollTop = this.scrollTop;
      this.style.cursor = "grab";
      this.style.userSelect = "none";
    };

    const onPointerMove = (e) => {
      if (!this.#dragState.active) return;
      const isHorizontal = this.getAttribute("layout") === "horizontal";
      const dx = e.clientX - this.#dragState.startX;
      const dy = e.clientY - this.#dragState.startY;

      if (!this.#dragState.didDrag && Math.abs(isHorizontal ? dx : dy) > 3) {
        this.#dragState.didDrag = true;
        this.style.cursor = "grabbing";
        this.setPointerCapture(e.pointerId);
      }

      if (!this.#dragState.didDrag) return;

      if (isHorizontal) {
        this.scrollLeft = this.#dragState.scrollLeft - dx;
      } else {
        this.scrollTop = this.#dragState.scrollTop - dy;
      }
    };

    const onPointerUp = (e) => {
      if (!this.#dragState.active) return;
      const wasDrag = this.#dragState.didDrag;
      this.#dragState.active = false;
      this.#dragState.didDrag = false;
      this.style.cursor = "";
      this.style.userSelect = "";
      if (e.pointerId !== undefined) {
        try {
          this.releasePointerCapture(e.pointerId);
        } catch {}
      }
      if (wasDrag) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClick = (e) => {
      if (this.#dragState?.suppressClick) {
        e.stopPropagation();
        e.preventDefault();
        this.#dragState.suppressClick = false;
      }
    };

    const onPointerUpCapture = (e) => {
      if (this.#dragState?.didDrag) {
        this.#dragState.suppressClick = true;
        setTimeout(() => {
          if (this.#dragState) this.#dragState.suppressClick = false;
        }, 0);
      }
    };

    this.#dragState = {
      active: false,
      didDrag: false,
      suppressClick: false,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0,
      bound: true,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onClick,
      onPointerUpCapture,
    };

    this.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    this.addEventListener("pointerup", onPointerUpCapture, true);
    this.addEventListener("click", onClick, true);
  }

  #teardownDrag() {
    if (!this.#dragState?.bound) return;
    this.removeEventListener("pointerdown", this.#dragState.onPointerDown);
    window.removeEventListener("pointermove", this.#dragState.onPointerMove);
    window.removeEventListener("pointerup", this.#dragState.onPointerUp);
    this.removeEventListener(
      "pointerup",
      this.#dragState.onPointerUpCapture,
      true,
    );
    this.removeEventListener("click", this.#dragState.onClick, true);
    this.style.cursor = "";
    this.style.userSelect = "";
    this.#dragState = null;
  }

  #removeLegacyScroller() {
    if (this.#isUnwrapping) return;
    const legacy = this.querySelector(":scope > [data-fig-chooser-scroll]");
    if (!legacy) return;

    this.#isUnwrapping = true;
    try {
      const nodes = Array.from(legacy.childNodes);
      legacy.replaceWith(...nodes);
    } finally {
      this.#isUnwrapping = false;
    }
  }

  #applyOverflowMode() {
    if (this.#overflowMode === "scrollbar") {
      this.#removeNavButtons();
    } else {
      this.#createNavButtons();
    }
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.classList.remove("overflow-start", "overflow-end");
  }

  #createNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.contains(this.#navStart) &&
      this.contains(this.#navEnd)
    ) {
      return;
    }

    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;

    const buttons = createFigOverflowButtons({
      owner: "chooser",
      startClass: "fig-chooser-nav-start",
      endClass: "fig-chooser-nav-end",
      chevronClass: "fig-chooser-nav-chevron",
      onStart: () => this.#scrollByPage(-1),
      onEnd: () => this.#scrollByPage(1),
    });
    this.#navStart = buttons.start;
    this.#navEnd = buttons.end;

    this.prepend(this.#navStart);
    this.append(this.#navEnd);
  }

  #scrollByPage(direction) {
    const isHorizontal = this.getAttribute("layout") === "horizontal";
    figScrollOverflowPage(this, isHorizontal ? "x" : "y", direction);
  }

  #scrollToChoice(el, behavior = "smooth") {
    if (!el) return;
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const overflowY = this.scrollHeight > this.clientHeight;
      const overflowX = this.scrollWidth > this.clientWidth;
      if (!overflowX && !overflowY) return;

      const choiceRect = el.getBoundingClientRect();
      const hostRect = this.getBoundingClientRect();
      const options = { behavior };
      let shouldScroll = false;
      const threshold = 2;

      if (overflowY) {
        const fullyVisible =
          choiceRect.top >= hostRect.top - 1 &&
          choiceRect.bottom <= hostRect.bottom + 1;
        const topVisible = choiceRect.top >= hostRect.top - 1;
        const bottomVisible = choiceRect.bottom <= hostRect.bottom + 1;
        const atScrollStart = this.scrollTop <= threshold;
        const needsScroll =
          !fullyVisible &&
          (!topVisible ||
            (!bottomVisible && !atScrollStart) ||
            choiceRect.top >= hostRect.bottom - 1);
        if (needsScroll) {
          const choiceTop = choiceRect.top - hostRect.top + this.scrollTop;
          const maxScroll = this.scrollHeight - this.clientHeight;
          options.top = Math.max(
            0,
            Math.min(
              choiceTop + choiceRect.height / 2 - this.clientHeight / 2,
              maxScroll,
            ),
          );
          shouldScroll = true;
        }
      }

      if (overflowX) {
        const fullyVisible =
          choiceRect.left >= hostRect.left - 1 &&
          choiceRect.right <= hostRect.right + 1;
        const startVisible = choiceRect.left >= hostRect.left - 1;
        const endVisible = choiceRect.right <= hostRect.right + 1;
        const atScrollStart = this.scrollLeft <= threshold;
        const needsScroll =
          !fullyVisible &&
          (!startVisible ||
            (!endVisible && !atScrollStart) ||
            choiceRect.left >= hostRect.right - 1);
        if (needsScroll) {
          const choiceLeft = choiceRect.left - hostRect.left + this.scrollLeft;
          const maxScroll = this.scrollWidth - this.clientWidth;
          options.left = Math.max(
            0,
            Math.min(
              choiceLeft + choiceRect.width / 2 - this.clientWidth / 2,
              maxScroll,
            ),
          );
          shouldScroll = true;
        }
      }

      if (shouldScroll) {
        this.scrollTo(options);
      }
      this.#syncOverflow();
    });
  }

  #startObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver(() => {
      if (this.#isUnwrapping) return;
      this.#removeLegacyScroller();
      this.#applyOverflowMode();
      const choices = this.choices;
      if (this.#selectedChoice && !choices.includes(this.#selectedChoice)) {
        this.#selectedChoice = null;
        this.#syncSelection();
      } else if (!this.#selectedChoice && choices.length) {
        this.#syncSelection();
      }
      requestAnimationFrame(() => this.#syncOverflow());
    });
    this.#mutationObserver.observe(this, { childList: true, subtree: false });
  }
}
customElements.define("fig-chooser", FigChooser);

/* Handle */
class FigHandle extends HTMLElement {
  static observedAttributes = [
    "color",
    "selected",
    "disabled",
    "drag",
    "drag-surface",
    "drag-axes",
    "drag-snapping",
    "value",
    "type",
    "tip",
    "hit-area",
    "hit-area-mode",
    "aria-label",
    "aria-labelledby",
  ];

  #isDragging = false;
  #didDrag = false;
  #boundPointerDown = null;
  #applyingValue = false;
  #colorTip = null;
  #directColorPicker = null;
  #nativeColorInput = null;
  #hitAreaEl = null;

  get #tipMode() {
    const mode = (this.getAttribute("tip") || "").trim().toLowerCase();
    return mode === "color" || mode === "add" || mode === "remove"
      ? mode
      : null;
  }

  get #canOpenColorPicker() {
    return !this.hasAttribute("data-no-color-picker");
  }

  get #dragEnabled() {
    const v = this.getAttribute("drag");
    return v !== null && v !== "false";
  }

  get #axes() {
    const v = (this.getAttribute("drag-axes") || "x,y").toLowerCase();
    return { x: v.includes("x"), y: v.includes("y") };
  }

  get #dragSnappingMode() {
    const raw = this.getAttribute("drag-snapping");
    if (raw === null) return "false";
    const normalized = raw.trim().toLowerCase();
    if (normalized === "modifier") return "modifier";
    if (normalized === "" || normalized === "true") return "true";
    return "false";
  }

  #shouldSnap(shiftKey) {
    const mode = this.#dragSnappingMode;
    if (mode === "true") return true;
    if (mode === "modifier") return !!shiftKey;
    return false;
  }

  #snapGuide(value) {
    if (value < 0.1) return 0;
    if (value > 0.9) return 1;
    if (value > 0.4 && value < 0.6) return 0.5;
    return value;
  }

  #snapDiagonal(x, y) {
    const diff = Math.abs(x - y);
    if (diff < 0.1) {
      const avg = (x + y) / 2;
      return { x: avg, y: avg };
    }
    if (Math.abs(1 - x - y) < 0.1) return { x, y: 1 - x };
    return { x, y };
  }

  #getContainer() {
    const attr = this.getAttribute("drag-surface");
    if (!attr || attr === "parent") return this.parentElement;
    return this.closest(attr);
  }

  get value() {
    const container = this.#getContainer();
    if (!container) return "0% 0%";
    const { px, py } = this.#positionDetail(container.getBoundingClientRect());
    return `${Math.round(px * 100)}% ${Math.round(py * 100)}%`;
  }

  set value(v) {
    this.setAttribute("value", v ?? "0% 0%");
  }

  #parseValue(str) {
    const normalized = str == null ? "" : String(str).trim();
    if (!normalized) return { xPct: 0, yPct: 0 };

    const parts = normalized.split(/[\s,]+/).filter(Boolean);

    const parseToken = (token) => {
      if (!token) return 0;
      const hasPx = token.includes("px");
      const hasPct = token.includes("%");
      const numeric = parseFloat(token.replace(/[%px]/g, ""));
      if (!Number.isFinite(numeric)) return 0;
      if (hasPx) return { px: numeric };
      if (hasPct || Math.abs(numeric) > 1)
        return Math.max(0, Math.min(100, numeric));
      return Math.max(0, Math.min(100, numeric * 100));
    };

    const xToken = parseToken(parts[0]);
    const yToken = parseToken(parts[1] ?? parts[0]);
    return { xToken, yToken };
  }

  #applyValue(str) {
    const container = this.#getContainer();
    if (!container) return;

    const { xToken, yToken } = this.#parseValue(str);
    const rect = container.getBoundingClientRect();

    const resolvePx = (token, containerDim) => {
      if (token && typeof token === "object" && "px" in token) {
        return Math.max(0, Math.min(containerDim, token.px));
      }
      return null;
    };

    const resolveResponsive = (token) => {
      const pct = typeof token === "number" ? token : 0;
      return `${pct}%`;
    };

    const axes = this.#axes;
    this.#syncPositionTranslate(axes);
    if (axes.x) {
      const xPx = resolvePx(xToken, rect.width);
      this.style.left =
        xPx === null ? resolveResponsive(xToken) : `${Math.round(xPx)}px`;
    }
    if (axes.y) {
      const yPx = resolvePx(yToken, rect.height);
      this.style.top =
        yPx === null ? resolveResponsive(yToken) : `${Math.round(yPx)}px`;
    }
  }

  #syncPositionTranslate(axes = this.#axes) {
    this.style.setProperty(
      "--fig-handle-position-translate",
      `${axes.x ? "-50%" : "0"} ${axes.y ? "-50%" : "0"}`,
    );
  }

  #syncValueAttribute() {
    this.#applyingValue = true;
    this.setAttribute("value", this.value);
    this.#applyingValue = false;
  }

  get #hitAreaMode() {
    return this.getAttribute("hit-area-mode") || "handle";
  }

  #parseHitArea() {
    const raw = this.getAttribute("hit-area");
    if (!raw) return null;
    const tokens = raw.trim().split(/\s+/);
    let vPad = 0,
      hPad = 0,
      circle = false;
    const nums = [];
    for (const t of tokens) {
      if (t === "circle") {
        circle = true;
        continue;
      }
      const n = parseFloat(t);
      if (Number.isFinite(n)) nums.push(n);
    }
    if (nums.length >= 2) {
      vPad = nums[0];
      hPad = nums[1];
    } else if (nums.length === 1) {
      vPad = nums[0];
      hPad = nums[0];
    } else return null;
    return { vPad, hPad, circle };
  }

  #syncHitArea() {
    const parsed = this.#parseHitArea();
    if (!parsed) {
      if (this.#hitAreaEl) {
        this.#hitAreaEl.remove();
        this.#hitAreaEl = null;
      }
      this.style.removeProperty("--fig-handle-hit-area-size");
      return;
    }
    if (!this.#hitAreaEl) {
      const el = document.createElement("div");
      el.classList.add("fig-handle-hit-area");
      el.addEventListener("pointerdown", (e) => this.#onHitAreaPointerDown(e));
      this.prepend(el);
      this.#hitAreaEl = el;
    }
    this.style.setProperty(
      "--fig-handle-hit-area-size",
      String(parsed.hPad * 2),
    );
    if (parsed.circle) {
      this.#hitAreaEl.style.borderRadius = "50%";
    } else {
      this.#hitAreaEl.style.borderRadius = "inherit";
    }
  }

  #onHitAreaPointerDown(e) {
    if (this.hasAttribute("disabled")) return;
    if (e.target !== this.#hitAreaEl) return;
    if (this.#hitAreaMode === "delegate") {
      e.preventDefault();
      e.stopPropagation();
      this.dispatchEvent(
        new CustomEvent("hitareadown", {
          bubbles: true,
          detail: { originalEvent: e },
        }),
      );
    } else {
      this.#onPointerDown(e);
    }
  }

  connectedCallback() {
    this.#syncA11y();
    this.#syncDrag();
    this.#syncHitArea();
    this.addEventListener("click", this.#handleSelect);
    document.addEventListener("pointerdown", this.#handleDeselect);
    document.addEventListener("keydown", this.#handleKeyDown);
    const initial = this.getAttribute("value");
    if (initial) this.#applyValue(initial);
    if (this.#tipMode) this.#showColorTip();
  }

  disconnectedCallback() {
    this.#teardownDrag();
    this.#hideColorTip();
    this.#removeDirectColorPicker();
    this.#removeNativeColorInput();
    if (this.#hitAreaEl) {
      this.#hitAreaEl.remove();
      this.#hitAreaEl = null;
    }
    this.removeEventListener("click", this.#handleSelect);
    document.removeEventListener("pointerdown", this.#handleDeselect);
    document.removeEventListener("keydown", this.#handleKeyDown);
  }

  select() {
    if (this.hasAttribute("disabled")) return;
    this.setAttribute("selected", "");
  }

  deselect() {
    this.removeAttribute("selected");
  }

  #handleSelect = (e) => {
    if (this.#didDrag) {
      this.#didDrag = false;
      return;
    }
    if (
      this.getAttribute("type") === "color" &&
      this.#canOpenColorPicker &&
      !this.#tipMode
    ) {
      this.#openDirectColorPicker();
      return;
    }
    this.select();
  };

  #handleDeselect = (e) => {
    if (this.contains(e.target)) return;
    if ((this.#colorTip || this.#directColorPicker) && e.target.closest?.("dialog, [popover]")) return;
    this.deselect();
  };

  #handleKeyDown = (e) => {
    if (e.defaultPrevented) return;
    if (
      e.target === this &&
      this.#dragEnabled &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
    ) {
      if (this.#moveByKeyboard(e)) {
        e.preventDefault();
        if (!this.hasAttribute("selected")) this.select();
      }
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target === this && !this.hasAttribute("selected")) {
      e.preventDefault();
      if (
        this.getAttribute("type") === "color" &&
        this.#canOpenColorPicker &&
        !this.#tipMode
      ) {
        this.#openDirectColorPicker();
      } else {
        this.select();
      }
      return;
    }
    if (!this.hasAttribute("selected")) return;
    if (this.getAttribute("type") !== "color") return;
    if (!this.#canOpenColorPicker) return;
    e.preventDefault();
    if (!this.#tipMode) {
      this.#openDirectColorPicker();
    }
  };

  #moveByKeyboard(event) {
    if (this.hasAttribute("disabled")) return false;
    const container = this.#getContainer();
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const axes = this.#axes;
    const current = this.#positionDetail(rect);
    const pctStep = event.shiftKey ? 0.1 : 0.01;
    let px = current.px;
    let py = current.py;

    switch (event.key) {
      case "ArrowLeft":
        if (!axes.x) return false;
        px -= pctStep;
        break;
      case "ArrowRight":
        if (!axes.x) return false;
        px += pctStep;
        break;
      case "ArrowUp":
        if (!axes.y) return false;
        py -= pctStep;
        break;
      case "ArrowDown":
        if (!axes.y) return false;
        py += pctStep;
        break;
      case "Home":
        if (axes.x) px = 0;
        if (axes.y) py = 0;
        break;
      case "End":
        if (axes.x) px = 1;
        if (axes.y) py = 1;
        break;
      default:
        return false;
    }

    px = Math.max(0, Math.min(1, px));
    py = Math.max(0, Math.min(1, py));
    this.#syncPositionTranslate(axes);
    if (axes.x) this.style.left = `${Math.round(px * rect.width)}px`;
    if (axes.y) this.style.top = `${Math.round(py * rect.height)}px`;
    this.#syncValueAttribute();
    const detail = {
      ...this.#positionDetail(rect),
      shiftKey: event.shiftKey,
      keyboard: true,
    };
    this.dispatchEvent(new CustomEvent("input", { bubbles: true, detail }));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true, detail }));
    return true;
  }

  attributeChangedCallback(name, _old, value) {
    if (name === "color") {
      if (!value || value === "false" || value === "true") {
        this.style.removeProperty("--fill");
      } else {
        this.style.setProperty("--fill", value);
      }
      if (this.#colorTip && this.#tipMode === "color" && value) {
        this.#colorTip.setAttribute("value", value);
      }
      this.#syncDirectColorPickerValue();
    }
    if (name === "drag") this.#syncDrag();
    if (name === "hit-area") this.#syncHitArea();
    if (name === "selected") this.#syncColorTipSelected();
    if (
      name === "selected" ||
      name === "disabled" ||
      name === "type" ||
      name === "tip" ||
      name === "aria-label" ||
      name === "aria-labelledby"
    ) {
      this.#syncA11y();
    }
    if (name === "value" && !this.#applyingValue && !this.#isDragging) {
      this.#applyValue(value);
    }
    if (name === "tip") {
      this.#hideColorTip();
      if (this.#tipMode) {
        this.#removeDirectColorPicker();
        this.#showColorTip();
      }
    }
  }

  #syncDrag() {
    if (this.#dragEnabled && !this.#boundPointerDown) {
      this.#boundPointerDown = (e) => this.#onPointerDown(e);
      this.addEventListener("pointerdown", this.#boundPointerDown);
    } else if (!this.#dragEnabled && this.#boundPointerDown) {
      this.#teardownDrag();
    }
  }

  #syncA11y() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    if (!this.hasAttribute("role")) this.setAttribute("role", "button");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", disabled ? "-1" : "0");
    else if (disabled) this.setAttribute("tabindex", "-1");
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.setAttribute("aria-pressed", selected ? "true" : "false");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      const mode = this.#tipMode || this.getAttribute("type") || "handle";
      this.setAttribute(
        "aria-label",
        mode === "color" ? "Color handle" : mode === "add" ? "Add handle" : mode === "remove" ? "Remove handle" : "Handle",
      );
    }
  }

  #teardownDrag() {
    if (this.#boundPointerDown) {
      this.removeEventListener("pointerdown", this.#boundPointerDown);
      this.#boundPointerDown = null;
    }
    this.#isDragging = false;
  }

  #onPointerDown(e) {
    if (!this.#dragEnabled || this.hasAttribute("disabled")) return;
    e.preventDefault();
    const container = this.#getContainer();
    if (!container) return;

    this.#isDragging = true;
    const axes = this.#axes;
    let lastRect = null;

    const handleRect = this.getBoundingClientRect();
    const handleCenterX = handleRect.left + handleRect.width / 2;
    const handleCenterY = handleRect.top + handleRect.height / 2;
    const offsetX = e.clientX - handleCenterX;
    const offsetY = e.clientY - handleCenterY;

    const startX = e.clientX;
    const startY = e.clientY;
    const DRAG_THRESHOLD = 3;

    const clampAndApply = (clientX, clientY, shiftKey = false) => {
      const rect = container.getBoundingClientRect();
      lastRect = rect;
      const currentPosition = this.#positionDetail(rect);
      const rawCenterX = clientX - offsetX - rect.left;
      const rawCenterY = clientY - offsetY - rect.top;

      const clampedCenterX = Math.max(0, Math.min(rect.width, rawCenterX));
      const clampedCenterY = Math.max(0, Math.min(rect.height, rawCenterY));

      let centerX =
        rect.width > 0
          ? (axes.x ? clampedCenterX / rect.width : currentPosition.px)
          : 0.5;
      let centerY =
        rect.height > 0
          ? (axes.y ? clampedCenterY / rect.height : currentPosition.py)
          : 0.5;

      if (this.#shouldSnap(shiftKey)) {
        if (axes.x) centerX = this.#snapGuide(centerX);
        if (axes.y) centerY = this.#snapGuide(centerY);
        if (axes.x && axes.y) {
          const diagonal = this.#snapDiagonal(centerX, centerY);
          centerX = diagonal.x;
          centerY = diagonal.y;
        }
      }

      this.#syncPositionTranslate(axes);
      if (axes.x) {
        this.style.left = `${Math.round(Math.max(0, Math.min(rect.width, centerX * rect.width)))}px`;
      }
      if (axes.y) {
        this.style.top = `${Math.round(Math.max(0, Math.min(rect.height, centerY * rect.height)))}px`;
      }
    };

    const onMove = (e) => {
      if (!this.#isDragging) return;
      if (!this.#didDrag) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        this.#closeColorPickerForDrag();
        this.classList.add("dragging");
        this.style.cursor = "grabbing";
        if (!this.hasAttribute("selected")) this.select();
      }
      this.#didDrag = true;
      clampAndApply(e.clientX, e.clientY, e.shiftKey);
      this.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: {
            ...this.#positionDetail(lastRect),
            shiftKey: e.shiftKey,
          },
        }),
      );
    };

    const onUp = (e) => {
      this.#isDragging = false;
      this.style.cursor = "";
      this.classList.remove("dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (this.#didDrag) {
        clampAndApply(e.clientX, e.clientY, e.shiftKey);
        this.#syncValueAttribute();
        this.#applyValue(this.getAttribute("value"));
        this.dispatchEvent(
          new CustomEvent("change", {
            bubbles: true,
            detail: this.#positionDetail(lastRect),
          }),
        );
        const swallowClick = (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
        };
        this.addEventListener("click", swallowClick, {
          capture: true,
          once: true,
        });
      } else {
        this.#syncValueAttribute();
      }
      this.#didDrag = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  showColorTip() {
    if (!this.#tipMode) return;
    if (this.#colorTip) {
      this.#colorTip.style.display = "";
      return;
    }
    this.#showColorTip();
  }

  hideColorTip() {
    if (!this.#colorTip) return;
    this.#colorTip.style.display = "none";
  }

  #normalizeColorForPicker(rawValue = this.getAttribute("color")) {
    const fallback = { color: "#D9D9D9", opacity: 100 };
    const value = String(rawValue || "").trim();
    if (!value) return fallback;

    const normalizeHex = (hex) => {
      const raw = hex.replace("#", "").trim();
      if (raw.length === 3 || raw.length === 4) {
        const [r, g, b, a] = raw;
        return {
          color: `#${r}${r}${g}${g}${b}${b}`.toUpperCase(),
          opacity: a ? Math.round((parseInt(`${a}${a}`, 16) / 255) * 100) : 100,
        };
      }
      if (raw.length === 6 || raw.length === 8) {
        return {
          color: `#${raw.slice(0, 6)}`.toUpperCase(),
          opacity:
            raw.length === 8
              ? Math.round((parseInt(raw.slice(6, 8), 16) / 255) * 100)
              : 100,
        };
      }
      return fallback;
    };

    const rgbToHex = (r, g, b) => {
      const toHex = (v) =>
        Math.max(0, Math.min(255, Math.round(Number(v))))
          .toString(16)
          .padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };

    if (value.startsWith("#")) return normalizeHex(value);

    try {
      const { ctx } = figGetSharedCanvas(1, 1);
      ctx.fillStyle = "#000000";
      ctx.fillStyle = value;
      const resolved = ctx.fillStyle;
      if (resolved.startsWith("#")) return normalizeHex(resolved);
      const rgb = resolved.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/i,
      );
      if (rgb) {
        return {
          color: rgbToHex(rgb[1], rgb[2], rgb[3]),
          opacity: rgb[4] !== undefined ? Math.round(parseFloat(rgb[4]) * 100) : 100,
        };
      }
    } catch {
      // Fall through to fallback.
    }

    return fallback;
  }

  #directColorPickerValue() {
    const { color, opacity } = this.#normalizeColorForPicker();
    return JSON.stringify(
      opacity < 100 ? { type: "solid", color, opacity } : { type: "solid", color },
    );
  }

  #syncDirectColorPickerValue() {
    if (!this.#directColorPicker) return;
    this.#directColorPicker.setAttribute("value", this.#directColorPickerValue());
  }

  #ensureDirectColorPicker() {
    if (!hasFigFillPicker()) return null;
    if (this.#directColorPicker) return this.#directColorPicker;

    const picker = document.createElement("fig-fill-picker");
    picker.setAttribute("mode", "solid");
    picker.setAttribute("alpha", "true");
    picker.setAttribute("dialog-offset", "8 8");
    picker.setAttribute("value", this.#directColorPickerValue());
    picker.anchorElement = this;

    const trigger = document.createElement("span");
    trigger.hidden = true;
    picker.appendChild(trigger);

    picker.addEventListener("input", this.#handleDirectColorPickerInput);
    picker.addEventListener("change", this.#handleDirectColorPickerChange);
    picker.addEventListener("close", this.#handleDirectColorPickerClose);
    this.appendChild(picker);
    this.#directColorPicker = picker;
    return picker;
  }

  #openDirectColorPicker() {
    if (this.hasAttribute("disabled")) return;
    const picker = this.#ensureDirectColorPicker();
    if (!picker) {
      this.#openNativeColorPicker();
      return;
    }
    this.setAttribute("selected", "");
    this.#syncDirectColorPickerValue();
    picker.open();
  }

  #removeDirectColorPicker() {
    if (!this.#directColorPicker) return;
    this.#directColorPicker.removeEventListener("input", this.#handleDirectColorPickerInput);
    this.#directColorPicker.removeEventListener("change", this.#handleDirectColorPickerChange);
    this.#directColorPicker.removeEventListener("close", this.#handleDirectColorPickerClose);
    this.#directColorPicker.close();
    this.#directColorPicker.remove();
    this.#directColorPicker = null;
    this.removeAttribute("selected");
  }

  #ensureNativeColorInput() {
    if (this.#nativeColorInput) return this.#nativeColorInput;
    const input = document.createElement("input");
    input.type = "color";
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    input.style.position = "fixed";
    input.style.inlineSize = "1px";
    input.style.blockSize = "1px";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.addEventListener("input", this.#handleNativeColorInput);
    input.addEventListener("change", this.#handleNativeColorChange);
    this.appendChild(input);
    this.#nativeColorInput = input;
    return input;
  }

  #openNativeColorPicker() {
    const input = this.#ensureNativeColorInput();
    const { color } = this.#normalizeColorForPicker();
    input.value = color;
    this.setAttribute("selected", "");
    input.click();
  }

  #removeNativeColorInput() {
    if (!this.#nativeColorInput) return;
    this.#nativeColorInput.removeEventListener("input", this.#handleNativeColorInput);
    this.#nativeColorInput.removeEventListener("change", this.#handleNativeColorChange);
    this.#nativeColorInput.remove();
    this.#nativeColorInput = null;
  }

  #closeColorPickerForDrag() {
    if (this.getAttribute("type") !== "color") return;
    this.#directColorPicker?.close();
  }

  #showColorTip() {
    const mode = this.#tipMode;
    if (!mode) return;
    if (this.#colorTip) return;
    const tip = document.createElement("fig-color-tip");
    if (mode === "add" || mode === "remove") {
      tip.setAttribute("control", mode);
    } else {
      tip.setAttribute("value", this.getAttribute("color") || "#D9D9D9");
      tip.setAttribute("alpha", "true");
    }
    tip.addEventListener("input", this.#handleColorTipInput);
    tip.addEventListener("change", this.#handleColorTipChange);
    tip.addEventListener("add", this.#handleColorTipControl);
    tip.addEventListener("remove", this.#handleColorTipControl);
    this.appendChild(tip);
    this.#colorTip = tip;
    this.#syncColorTipSelected();
  }

  #hideColorTip() {
    if (!this.#colorTip) return;
    this.#colorTip.removeEventListener("input", this.#handleColorTipInput);
    this.#colorTip.removeEventListener("change", this.#handleColorTipChange);
    this.#colorTip.removeEventListener("add", this.#handleColorTipControl);
    this.#colorTip.removeEventListener("remove", this.#handleColorTipControl);
    this.#colorTip.remove();
    this.#colorTip = null;
  }

  #syncColorTipSelected() {
    if (!this.#colorTip || this.#tipMode !== "color") return;
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.#colorTip.toggleAttribute("selected", selected);
  }

  #colorWithOpacity(hex, opacity) {
    if (opacity === undefined || opacity >= 100) return hex;
    const { r, g, b } = figHexToRGB(hex);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  }

  #detailFromPicker(detail) {
    if (!detail?.color) return null;
    const opacity =
      detail.opacity !== undefined
        ? detail.opacity
        : detail.alpha !== undefined
          ? Math.round(detail.alpha * 100)
          : undefined;
    return { color: detail.color, opacity };
  }

  #handleDirectColorPickerInput = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromPicker(e.detail);
    if (!detail) return;
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail,
      }),
    );
  };

  #handleDirectColorPickerChange = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromPicker(e.detail);
    if (!detail) return;
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail,
      }),
    );
  };

  #detailFromNativeColor(value) {
    const { opacity } = this.#normalizeColorForPicker();
    return opacity < 100 ? { color: value, opacity } : { color: value };
  }

  #handleNativeColorInput = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromNativeColor(e.target.value);
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail,
      }),
    );
  };

  #handleNativeColorChange = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromNativeColor(e.target.value);
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.removeAttribute("selected");
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail,
      }),
    );
  };

  #handleDirectColorPickerClose = () => {
    this.removeAttribute("selected");
  };

  #handleColorTipInput = (e) => {
    e.stopPropagation();
    if (e.detail?.color) {
      this.setAttribute(
        "color",
        this.#colorWithOpacity(e.detail.color, e.detail.opacity),
      );
      this.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { color: e.detail.color, opacity: e.detail.opacity },
        }),
      );
    }
  };

  #handleColorTipChange = (e) => {
    e.stopPropagation();
    if (e.detail?.color) {
      this.setAttribute(
        "color",
        this.#colorWithOpacity(e.detail.color, e.detail.opacity),
      );
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: { color: e.detail.color, opacity: e.detail.opacity },
        }),
      );
    }
  };

  #handleColorTipControl = (e) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(e.type, { bubbles: true, composed: true }),
    );
  };

  #positionDetail(containerRect) {
    const rect = containerRect || this.#getContainer()?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, px: 0, py: 0 };
    const handleRect = this.getBoundingClientRect();
    const hw = this.offsetWidth / 2;
    const hh = this.offsetHeight / 2;
    const x = handleRect.left - rect.left;
    const y = handleRect.top - rect.top;
    const centerX = x + hw;
    const centerY = y + hh;
    const px = rect.width > 0 ? centerX / rect.width : 0;
    const py = rect.height > 0 ? centerY / rect.height : 0;
    return { x, y, px, py };
  }
}
customElements.define("fig-handle", FigHandle);

// ─── Menu ────────────────────────────────────────────────────────────────────

class FigMenuItem extends HTMLElement {
  static get observedAttributes() {
    return ["value", "disabled"];
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val ?? "");
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "menuitem");
    }
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "-1");
    }
    this.#syncDisabled();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
      if (!this.hasAttribute("tabindex")) {
        this.setAttribute("tabindex", "-1");
      }
    }
  }
}
customElements.define("fig-menu-item", FigMenuItem);

class FigMenuSeparator extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "separator");
    }
  }
}
customElements.define("fig-menu-separator", FigMenuSeparator);

class FigMenu extends HTMLElement {
  #popup = null;
  #trigger = null;
  #observer = null;
  #boundTriggerClick;
  #boundPopupClick;
  #boundMenuKeydown;
  #boundPopupClose;
  #focusedIndex = -1;

  static get observedAttributes() {
    return ["position", "offset", "closedby", "disabled", "open"];
  }

  constructor() {
    super();
    this.#boundTriggerClick = this.#handleTriggerClick.bind(this);
    this.#boundPopupClick = this.#handlePopupClick.bind(this);
    this.#boundMenuKeydown = this.#handleMenuKeydown.bind(this);
    this.#boundPopupClose = this.#handlePopupClose.bind(this);
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
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
  }

  connectedCallback() {
    this.#detectTrigger();
    this.#createPopup();
    this.#moveItemsToPopup();
    this.#setupListeners();
    this.#setupObserver();
    this.#syncDisabled();

    if (this.open) {
      this.#openMenu();
    }
  }

  disconnectedCallback() {
    this.#teardownListeners();
    document.removeEventListener("keydown", this.#boundMenuKeydown, true);
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
    if (this.#popup) {
      this.#popup.removeEventListener("close", this.#boundPopupClose);
      this.#popup.remove();
      this.#popup = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "open") {
      if (newValue === null || newValue === "false") {
        this.#closeMenu();
      } else {
        this.#openMenu();
      }
      return;
    }

    if (name === "disabled") {
      if (this.#trigger) {
        if (newValue !== null && newValue !== "false") {
          this.#trigger.setAttribute("disabled", "");
        } else {
          this.#trigger.removeAttribute("disabled");
        }
      }
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

  #detectTrigger() {
    this.#trigger =
      this.querySelector("[fig-menu-trigger]") ||
      this.querySelector(":scope > :not(fig-menu-item):not(fig-menu-separator)");
  }

  #createPopup() {
    this.#popup = document.createElement("dialog", { is: "fig-popup" });
    this.#popup.setAttribute("is", "fig-popup");
    this.#popup.setAttribute("theme", "menu");
    this.#popup.setAttribute("role", "menu");
    this.#popup.setAttribute("id", this.#popup.getAttribute("id") || figUniqueId());

    const position = this.getAttribute("position") || "bottom left";
    this.#popup.setAttribute("position", position);

    const offset = this.getAttribute("offset");
    if (offset) this.#popup.setAttribute("offset", offset);

    const closedby = this.getAttribute("closedby");
    if (closedby) this.#popup.setAttribute("closedby", closedby);

    if (this.#trigger) {
      this.#popup.anchor = this.#trigger;
    }

    this.#popup.addEventListener("close", this.#boundPopupClose);
    this.appendChild(this.#popup);
  }

  #moveItemsToPopup() {
    const items = Array.from(this.querySelectorAll(
      ":scope > fig-menu-item, :scope > fig-menu-separator"
    ));
    for (const item of items) {
      this.#popup.appendChild(item);
    }
  }

  #setupListeners() {
    this.addEventListener("keydown", this.#boundMenuKeydown);
    if (this.#trigger) {
      this.#trigger.addEventListener("click", this.#boundTriggerClick);
      this.#trigger.setAttribute("aria-haspopup", "menu");
      this.#trigger.setAttribute("aria-expanded", "false");
      this.#trigger.setAttribute("aria-controls", this.#popup.getAttribute("id"));
    }
    if (this.#popup) {
      this.#popup.addEventListener("click", this.#boundPopupClick);
      this.#popup.addEventListener("keydown", this.#boundMenuKeydown);
    }
  }

  #teardownListeners() {
    this.removeEventListener("keydown", this.#boundMenuKeydown);
    if (this.#trigger) {
      this.#trigger.removeEventListener("click", this.#boundTriggerClick);
    }
    if (this.#popup) {
      this.#popup.removeEventListener("click", this.#boundPopupClick);
      this.#popup.removeEventListener("keydown", this.#boundMenuKeydown);
    }
  }

  #setupObserver() {
    this.#observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1 || node === this.#popup) continue;
          if (
            (node.tagName === "FIG-MENU-ITEM" || node.tagName === "FIG-MENU-SEPARATOR") &&
            node.parentElement === this
          ) {
            this.#popup.appendChild(node);
          } else if (!this.#trigger && node.parentElement === this) {
            this.#detectTrigger();
            if (this.#trigger) {
              this.#trigger.addEventListener("click", this.#boundTriggerClick);
              this.#trigger.setAttribute("aria-haspopup", "menu");
              this.#trigger.setAttribute("aria-expanded", "false");
              this.#trigger.setAttribute("aria-controls", this.#popup.getAttribute("id"));
              this.#popup.anchor = this.#trigger;
              this.#syncDisabled();
            }
          }
        }
      }
    });
    this.#observer.observe(this, { childList: true });
  }

  #getItems() {
    if (!this.#popup) return [];
    return Array.from(this.#popup.querySelectorAll("fig-menu-item")).filter(
      (item) =>
        !item.hasAttribute("disabled") || item.getAttribute("disabled") === "false",
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
    items[wrapped].focus();
  }

  #syncDisabled() {
    if (!this.#trigger) return;
    const disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    if (disabled) {
      this.#trigger.setAttribute("disabled", "");
      this.#trigger.setAttribute("aria-disabled", "true");
      this.#trigger.setAttribute("aria-expanded", "false");
    } else {
      this.#trigger.removeAttribute("disabled");
      this.#trigger.removeAttribute("aria-disabled");
    }
  }

  #handleTriggerClick(e) {
    if (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") return;
    e.stopPropagation();
    const popupShowing = this.#popup?.matches?.(":open") ?? false;
    if (this.open && !popupShowing) {
      this.removeAttribute("open");
    }
    const effectiveOpen = this.open && popupShowing;
    if (effectiveOpen) {
      this.open = false;
    } else {
      this.open = true;
    }
  }

  #handlePopupClick(e) {
    const item = e.target.closest("fig-menu-item");
    if (!item) return;
    if (item.hasAttribute("disabled") && item.getAttribute("disabled") !== "false") return;

    this.#selectItem(item);
  }

  #handleMenuKeydown(e) {
    if (e.currentTarget === document && e.key !== "Escape") return;
    if (e.currentTarget === this && this.#popup?.contains(e.target)) return;
    if (!this.open || !this.#popup?.matches?.(":open")) {
      if (
        this.#trigger?.contains(e.target) &&
        (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
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
        this.#trigger?.focus();
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

  #handlePopupClose() {
    if (this.hasAttribute("open")) {
      this.removeAttribute("open");
    }
    if (this.#trigger) {
      this.#trigger.setAttribute("aria-expanded", "false");
      this.#trigger.focus();
    }
    this.#focusedIndex = -1;
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

  #openMenu() {
    if (!this.#popup) return;
    this.#popup.open = true;
    document.addEventListener("keydown", this.#boundMenuKeydown, true);
    if (this.#trigger) {
      this.#trigger.setAttribute("aria-expanded", "true");
    }
    this.#focusedIndex = -1;
    requestAnimationFrame(() => {
      if (!this.#trigger?.matches?.(":focus-visible")) return;
      this.#focusItemAt(0);
    });
  }

  #closeMenu() {
    if (!this.#popup) return;
    document.removeEventListener("keydown", this.#boundMenuKeydown, true);
    this.#popup.open = false;
    this.#trigger?.setAttribute("aria-expanded", "false");
  }
}
customElements.define("fig-menu", FigMenu);
