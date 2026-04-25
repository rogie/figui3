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

/**
 * Gets the highest z-index currently in use on the page
 * @returns {number} The highest z-index found, minimum of 1000
 */
function figGetHighestZIndex() {
  let highest = 1000; // Baseline minimum

  // Check all elements with inline z-index or computed z-index
  const elements = document.querySelectorAll("*");
  for (const el of elements) {
    const zIndex = parseInt(getComputedStyle(el).zIndex, 10);
    if (!isNaN(zIndex) && zIndex > highest) {
      highest = zIndex;
    }
  }

  return highest;
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
  constructor() {
    super();
    this.attachShadow({ mode: "open", delegatesFocus: true });
  }
  connectedCallback() {
    this.type = this.getAttribute("type") || "button";
    this.shadowRoot.innerHTML = `
            <style>
                button, button:hover, button:active {
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
                :host([size="large"]) button {
                    height: var(--spacer-5);
                }
                :host([size="large"][icon]) button {
                    padding: 0;
                }
            </style>
            <button type="${this.type}">
                <slot></slot>
            </button>
            `;

    this.#selected =
      this.hasAttribute("selected") &&
      this.getAttribute("selected") !== "false";

    requestAnimationFrame(() => {
      this.button = this.shadowRoot.querySelector("button");
      this.button.addEventListener("click", this.#handleClick.bind(this));

      // Forward focus-visible state to host element
      this.button.addEventListener("focus", () => {
        if (this.button.matches(":focus-visible")) {
          this.setAttribute("data-focus-visible", "");
        }
      });
      this.button.addEventListener("blur", () => {
        this.removeAttribute("data-focus-visible");
      });
    });
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

  #handleClick() {
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
  static get observedAttributes() {
    return ["disabled", "selected"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.button) {
      this.button[name] = newValue;
      switch (name) {
        case "disabled":
          this.disabled = this.button.disabled =
            newValue !== null && newValue !== "false";
          break;
        case "type":
          this.type = newValue;
          this.button.type = this.type;
          this.button.setAttribute("type", this.type);
          break;
        case "selected":
          this.#selected = newValue === "true";
          break;
      }
    }
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
  #selectedContentEnabled = false;
  #selectedContentEl = null;

  get label() {
    return this.#label;
  }
  set label(value) {
    this.#label = value;
  }
  constructor() {
    super();
    this.select = document.createElement("select");
    this.optionsSlot = document.createElement("slot");
    this.attachShadow({ mode: "open" });
    this.#boundHandleSelectInput = this.#handleSelectInput.bind(this);
    this.#boundHandleSelectChange = this.#handleSelectChange.bind(this);
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

    this.appendChild(this.select);
    this.shadowRoot.appendChild(this.optionsSlot);

    this.optionsSlot.addEventListener("slotchange", this.slotChange.bind(this));

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
    return ["value", "type", "experimental"];
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
  }
}

customElements.define("fig-dropdown", FigDropdown);

/* Tooltip */
/**
 * A custom tooltip element that displays on hover or click.
 * @attr {string} action - The trigger action: "hover" (default) or "click"
 * @attr {number} delay - Delay in milliseconds before showing tooltip (default: 500)
 * @attr {string} text - The tooltip text content
 * @attr {string} offset - Comma-separated offset values: left,top,right,bottom
 */
class FigTooltip extends HTMLElement {
  static #lastShownAt = 0;
  static #warmupWindow = 500;

  #boundHideOnChromeOpen;
  #boundHidePopupOutsideClick;
  #touchTimeout;
  #isTouching = false;
  #observer = null;
  #repositionRAF = null;
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    let delay = parseInt(this.getAttribute("delay"));
    this.delay = !isNaN(delay) ? delay : 500;

    // Bind methods that will be used as event listeners
    this.#boundHideOnChromeOpen = this.#hideOnChromeOpen.bind(this);
    this.#boundHidePopupOutsideClick = this.hidePopupOutsideClick.bind(this);
  }
  connectedCallback() {
    this.setup();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.destroy();
    // Remove global listeners
    document.removeEventListener(
      "mousedown",
      this.#boundHideOnChromeOpen,
      true,
    );
    // Disconnect mutation observer
    this.#stopObserving();

    // Remove click outside listener for click action
    if (this.action === "click") {
      document.body.removeEventListener(
        "click",
        this.#boundHidePopupOutsideClick,
      );
    }

    // Clean up touch-related timers and listeners
    clearTimeout(this.#touchTimeout);
    if (this.action === "hover") {
      this.removeEventListener("touchstart", this.#handleTouchStart);
      this.removeEventListener("touchmove", this.#handleTouchMove);
      this.removeEventListener("touchend", this.#handleTouchEnd);
      this.removeEventListener("touchcancel", this.#handleTouchCancel);
    } else if (this.action === "click") {
      this.removeEventListener("touchstart", this.showDelayedPopup);
    }
  }

  setup() {
    this.style.display = "contents";
  }

  render() {
    this.destroy();
    let content = document.createElement("span");
    this.popup = document.createElement("span");
    this.popup.setAttribute("class", "fig-tooltip");
    this.popup.setAttribute("role", "tooltip");
    const tooltipId = figUniqueId();
    this.popup.setAttribute("id", tooltipId);
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.display = "inline-flex";
    this.popup.style.pointerEvents = "none";
    this.popup.append(content);
    content.innerText = this.getAttribute("text");
    // Set aria-describedby on the trigger element
    if (this.firstElementChild) {
      this.firstElementChild.setAttribute("aria-describedby", tooltipId);
    }

    // If tooltip is inside a dialog, append to dialog to stay in top layer
    const parentDialog = this.closest("dialog");
    if (parentDialog && parentDialog.open) {
      parentDialog.append(this.popup);
    } else {
      document.body.append(this.popup);
    }

    const text = content.childNodes[0];
    if (text) {
      const range = document.createRange();
      range.setStartBefore(text);
      range.setEndAfter(text);
      const clientRect = range.getBoundingClientRect();
      content.style.width = `${clientRect.width}px`;
    }
  }

  destroy() {
    this.#stopObserving();
    if (this.popup) {
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
    if (this.action === "manual") return;
    if (this.action === "hover") {
      if (!this.isTouchDevice()) {
        this.addEventListener("pointerenter", this.showDelayedPopup.bind(this));
        this.addEventListener(
          "pointerleave",
          this.#handlePointerLeave.bind(this),
        );
      }
      // Touch support for mobile hover simulation
      this.addEventListener("touchstart", this.#handleTouchStart.bind(this), {
        passive: true,
      });
      this.addEventListener("touchmove", this.#handleTouchMove.bind(this), {
        passive: true,
      });
      this.addEventListener("touchend", this.#handleTouchEnd.bind(this), {
        passive: true,
      });
      this.addEventListener("touchcancel", this.#handleTouchCancel.bind(this), {
        passive: true,
      });
    } else if (this.action === "click") {
      this.addEventListener("click", this.showDelayedPopup.bind(this));
      document.body.addEventListener("click", this.#boundHidePopupOutsideClick);

      // Touch support for better mobile responsiveness
      this.addEventListener("touchstart", this.showDelayedPopup.bind(this), {
        passive: true,
      });
    }

    // Add listener for chrome interactions
    document.addEventListener("mousedown", this.#boundHideOnChromeOpen, true);
  }

  getOffset() {
    const defaultOffset = { left: 8, top: 4, right: 8, bottom: 4 };
    const offsetAttr = this.getAttribute("offset");
    if (!offsetAttr) return defaultOffset;

    const [left, top, right, bottom] = offsetAttr.split(",").map(Number);
    return {
      left: isNaN(left) ? defaultOffset.left : left,
      top: isNaN(top) ? defaultOffset.top : top,
      right: isNaN(right) ? defaultOffset.right : right,
      bottom: isNaN(bottom) ? defaultOffset.bottom : bottom,
    };
  }

  get #showPersisted() {
    return this.hasAttribute("show") && this.getAttribute("show") !== "false";
  }

  showDelayedPopup() {
    if (this.#showPersisted) return;
    this.render();
    clearTimeout(this.timeout);
    const warm =
      Date.now() - FigTooltip.#lastShownAt < FigTooltip.#warmupWindow;
    const effectiveDelay = warm ? 0 : this.delay;
    this.timeout = setTimeout(this.showPopup.bind(this), effectiveDelay);
  }

  showPopup() {
    if (!this.popup) this.render();
    this.popup.style.display = "block";
    this.popup.style.visibility = "hidden";
    this.#repositionPopup();
    this.popup.style.opacity = "1";
    this.popup.style.visibility = "visible";
    this.popup.style.pointerEvents = "all";
    this.popup.style.zIndex = figGetHighestZIndex() + 1;

    this.isOpen = true;
    FigTooltip.#lastShownAt = Date.now();
    this.#startObserving();
  }

  #repositionPopup() {
    if (!this.popup || !this.firstElementChild) return;

    const rect = this.firstElementChild.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    const offset = this.getOffset();

    const container = this.popup.parentElement;
    const containerRect =
      container && container !== document.body
        ? container.getBoundingClientRect()
        : { left: 0, top: 0 };

    // Position the tooltip above the element
    let top = rect.top - popupRect.height - offset.top - containerRect.top;
    let left =
      rect.left + (rect.width - popupRect.width) / 2 - containerRect.left;
    this.popup.setAttribute("position", "top");

    // Adjust if tooltip would go off-screen
    if (top + containerRect.top < 0) {
      this.popup.setAttribute("position", "bottom");
      top = rect.bottom + offset.bottom - containerRect.top;
    }
    const absLeft = left + containerRect.left;
    if (absLeft < offset.left) {
      left = offset.left - containerRect.left;
    } else if (absLeft + popupRect.width > window.innerWidth - offset.right) {
      left =
        window.innerWidth - popupRect.width - offset.right - containerRect.left;
    }

    // Calculate the center of the target element relative to the tooltip
    const targetCenter = rect.left - containerRect.left + rect.width / 2;
    const beakOffset = targetCenter - left;

    // Set the beak offset as a CSS custom property
    this.popup.style.setProperty("--beak-offset", `${beakOffset}px`);

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }

  hidePopup() {
    if (this.#showPersisted) return;
    clearTimeout(this.timeout);
    clearTimeout(this.#touchTimeout);
    this.#stopObserving();
    if (this.popup) {
      this.popup.style.opacity = "0";
      this.popup.style.display = "block";
      this.popup.style.pointerEvents = "none";
      this.destroy();
    }

    this.isOpen = false;
    FigTooltip.#lastShownAt = Date.now();
  }

  #startObserving() {
    this.#stopObserving();
    const target = this.firstElementChild;
    if (!target) return;

    this.#observer = new MutationObserver(() => {
      if (this.#repositionRAF) cancelAnimationFrame(this.#repositionRAF);
      this.#repositionRAF = requestAnimationFrame(() => {
        this.#repositionPopup();
      });
    });

    this.#observer.observe(target, {
      attributes: true,
      attributeFilter: ["style", "class", "transform"],
    });
  }

  #stopObserving() {
    if (this.#repositionRAF) {
      cancelAnimationFrame(this.#repositionRAF);
      this.#repositionRAF = null;
    }
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
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

  static get observedAttributes() {
    return ["action", "delay", "open", "show", "text"];
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
    content.style.width = "";
    const textNode = content.childNodes[0];
    if (textNode) {
      const range = document.createRange();
      range.setStartBefore(textNode);
      range.setEndAfter(textNode);
      content.style.width = `${range.getBoundingClientRect().width}px`;
    }
    if (this.isOpen) this.#repositionPopup();
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
}

customElements.define("fig-tooltip", FigTooltip);

/* Dialog */
/**
 * A custom dialog element for modal and non-modal dialogs.
 * @attr {boolean} open - Whether the dialog is visible
 * @attr {boolean} modal - Whether the dialog should be modal
 * @attr {boolean} drag - Whether the dialog is draggable
 * @attr {string} handle - CSS selector for the drag handle element (e.g., "fig-header"). If not specified, the entire dialog is draggable when drag is enabled.
 * @attr {string} position - Position of the dialog (e.g., "bottom right", "top left", "center center")
 */
class FigDialog extends HTMLDialogElement {
  #isDragging = false;
  #dragPending = false;
  #dragStartPos = { x: 0, y: 0 };
  #dragOffset = { x: 0, y: 0 };
  #boundPointerDown;
  #boundPointerMove;
  #boundPointerUp;
  #offset = 16; // 1rem in pixels
  #positionInitialized = false;
  #dragThreshold = 3; // pixels before drag starts

  constructor() {
    super();
    this.#boundPointerDown = this.#handlePointerDown.bind(this);
    this.#boundPointerMove = this.#handlePointerMove.bind(this);
    this.#boundPointerUp = this.#handlePointerUp.bind(this);
  }

  connectedCallback() {
    this.modal =
      this.hasAttribute("modal") && this.getAttribute("modal") !== "false";

    // Set up drag functionality
    this.drag =
      this.hasAttribute("drag") && this.getAttribute("drag") !== "false";

    requestAnimationFrame(() => {
      this.#addCloseListeners();
      this.#setupDragListeners();
      this.#applyPosition();
    });
  }

  disconnectedCallback() {
    this.#removeDragListeners();
  }

  #addCloseListeners() {
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      button.removeEventListener("click", this.close);
      button.addEventListener("click", this.close.bind(this));
    });
  }

  #applyPosition() {
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
      this.style.top = `${this.#offset}px`;
    } else if (hasBottom) {
      this.style.bottom = `${this.#offset}px`;
    } else if (hasVCenter) {
      this.style.top = "0";
      this.style.bottom = "0";
    }

    // Horizontal positioning
    if (hasLeft) {
      this.style.left = `${this.#offset}px`;
    } else if (hasRight) {
      this.style.right = `${this.#offset}px`;
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

    this.#positionInitialized = true;
  }

  #setupDragListeners() {
    if (this.drag) {
      this.addEventListener("pointerdown", this.#boundPointerDown);
      const handleSelector = this.getAttribute("handle");
      const handleEl = handleSelector
        ? this.querySelector(handleSelector)
        : this.querySelector("fig-header, header");
      if (handleEl) {
        handleEl.style.cursor = "grab";
      }
    }
  }

  #removeDragListeners() {
    this.removeEventListener("pointerdown", this.#boundPointerDown);
    document.removeEventListener("pointermove", this.#boundPointerMove);
    document.removeEventListener("pointerup", this.#boundPointerUp);
  }

  #isInteractiveElement(element) {
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

  #handlePointerDown(e) {
    if (!this.drag) {
      return;
    }

    // Don't interfere with interactive elements (inputs, sliders, buttons, etc.)
    if (this.#isInteractiveElement(e.target)) {
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
    this.#dragPending = true;
    this.#dragStartPos.x = e.clientX;
    this.#dragStartPos.y = e.clientY;

    // Get current position from computed style
    const rect = this.getBoundingClientRect();

    // Store offset from pointer to dialog top-left corner
    this.#dragOffset.x = e.clientX - rect.left;
    this.#dragOffset.y = e.clientY - rect.top;

    document.addEventListener("pointermove", this.#boundPointerMove);
    document.addEventListener("pointerup", this.#boundPointerUp);
  }

  #handlePointerMove(e) {
    // Check if we should start dragging (threshold exceeded)
    if (this.#dragPending && !this.#isDragging) {
      const dx = Math.abs(e.clientX - this.#dragStartPos.x);
      const dy = Math.abs(e.clientY - this.#dragStartPos.y);

      if (dx > this.#dragThreshold || dy > this.#dragThreshold) {
        this.#isDragging = true;
        this.#dragPending = false;
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

    if (!this.#isDragging) return;

    this.style.left = `${e.clientX - this.#dragOffset.x}px`;
    this.style.top = `${e.clientY - this.#dragOffset.y}px`;
    e.preventDefault();
  }

  #handlePointerUp(e) {
    if (this.#isDragging) {
      this.releasePointerCapture(e.pointerId);
      this.style.cursor = "";
    }

    this.#isDragging = false;
    this.#dragPending = false;

    document.removeEventListener("pointermove", this.#boundPointerMove);
    document.removeEventListener("pointerup", this.#boundPointerUp);

    e.preventDefault();
  }

  static get observedAttributes() {
    return ["modal", "drag", "position", "handle"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "drag") {
      this.drag = newValue !== null && newValue !== "false";

      if (this.drag) {
        this.#setupDragListeners();
      } else {
        this.#removeDragListeners();
        const header = this.querySelector("fig-header, header");
        if (header) {
          header.style.cursor = "";
        }
      }
    }

    if (name === "position" && this.#positionInitialized) {
      this.#applyPosition();
    }
  }
}
figDefineCustomizedBuiltIn("fig-dialog", FigDialog, { extends: "dialog" });

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

  constructor() {
    super();
    this._boundReposition = this.queueReposition.bind(this);
    this._boundScroll = (e) => {
      if (
        this.open &&
        !this.contains(e.target) &&
        this.shouldAutoReposition()
      ) {
        this.queueReposition();
      }
    };
    this._boundOutsidePointerDown = this.handleOutsidePointerDown.bind(this);
    this._boundPointerDown = this.handlePointerDown.bind(this);
    this._boundPointerMove = this.handlePointerMove.bind(this);
    this._boundPointerUp = this.handlePointerUp.bind(this);
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

    if (typeof this._boundReposition !== "function") {
      this._boundReposition = this.queueReposition.bind(this);
    }
    if (typeof this._boundScroll !== "function") {
      this._boundScroll = (e) => {
        if (
          this.open &&
          !this.contains(e.target) &&
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
    } else {
      this._anchorRef = null;
    }
    if (this.open) this.queueReposition();
  }

  connectedCallback() {
    this.ensureInitialized();
    if (!this.hasAttribute("position")) {
      this.setAttribute("position", "top center");
    }
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "dialog");
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

    if (!super.open) {
      try {
        this.show();
      } catch (e) {
        // Ignore when dialog cannot be shown yet.
      }
    }

    this.setupObservers();
    document.addEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );
    this._wasDragged = false;
    this.queueReposition();
    this._isPopupActive = true;

    const anchor = this.resolveAnchor();
    if (anchor) anchor.classList.add("has-popup-open");
  }

  hidePopup() {
    const anchor = this.resolveAnchor();
    if (anchor) anchor.classList.remove("has-popup-open");

    this._isPopupActive = false;
    this._wasDragged = false;
    this.teardownObservers();
    document.removeEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );

    if (super.open) {
      try {
        this.close();
      } catch (e) {
        // Ignore when dialog is not in an open state.
      }
    }
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
    if (anchor && "ResizeObserver" in window) {
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
    if (anchor && anchor.contains(target)) return;

    if (this.isInsideDescendantPopup(target)) return;

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

  updatePopoverBeak(anchorRect, popupRect, left, top, placementSide) {
    if (this.getAttribute("variant") !== "popover" || !anchorRect) {
      this.style.removeProperty("--beak-offset");
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
    // Always use the rendered popup rect so beak alignment matches real final placement.
    const resolvedLeft = rect.left;
    const resolvedTop = rect.top;
    const edgeInset = 10;

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

    this.style.setProperty("--beak-offset", `${beakOffset}px`);
  }

  overflowScore(coords, popupRect, m) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const right = coords.left + popupRect.width;
    const bottom = coords.top + popupRect.height;

    const overflowLeft = Math.max(0, m.left - coords.left);
    const overflowTop = Math.max(0, m.top - coords.top);
    const overflowRight = Math.max(0, right - (vw - m.right));
    const overflowBottom = Math.max(0, bottom - (vh - m.bottom));

    return overflowLeft + overflowTop + overflowRight + overflowBottom;
  }

  fits(coords, popupRect, m) {
    return this.overflowScore(coords, popupRect, m) === 0;
  }

  clamp(coords, popupRect, m) {
    const minLeft = m.left;
    const minTop = m.top;
    const maxLeft = Math.max(
      m.left,
      window.innerWidth - popupRect.width - m.right,
    );
    const maxTop = Math.max(
      m.top,
      window.innerHeight - popupRect.height - m.bottom,
    );

    return {
      left: Math.min(maxLeft, Math.max(minLeft, coords.left)),
      top: Math.min(maxTop, Math.max(minTop, coords.top)),
    };
  }

  positionPopup() {
    if (!this.open || !super.open) return;

    const popupRect = this.getBoundingClientRect();
    const offset = this.parseOffset();
    const { vertical, horizontal, shorthand } = this.parsePosition();
    const anchor = this.resolveAnchor();
    const m = this.parseViewportMargins();

    if (!anchor) {
      this.updatePopoverBeak(null, popupRect, 0, 0, "top");
      const centered = {
        left:
          m.left + (window.innerWidth - m.right - m.left - popupRect.width) / 2,
        top:
          m.top +
          (window.innerHeight - m.bottom - m.top - popupRect.height) / 2,
      };
      const clamped = this.clamp(centered, popupRect, m);
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

      if (s) {
        const clamped = this.clamp(coords, popupRect, m);
        const primaryFits =
          s === "left" || s === "right"
            ? coords.left >= m.left &&
              coords.left + popupRect.width <= window.innerWidth - m.right
            : coords.top >= m.top &&
              coords.top + popupRect.height <= window.innerHeight - m.bottom;
        if (primaryFits) {
          this.style.left = `${clamped.left}px`;
          this.style.top = `${clamped.top}px`;
          this.updatePopoverBeak(
            anchorRect,
            popupRect,
            clamped.left,
            clamped.top,
            placementSide,
          );
          return;
        }
        const score = this.overflowScore(coords, popupRect, m);
        if (score < bestScore) {
          bestScore = score;
          best = clamped;
          bestSide = placementSide;
        }
      } else {
        if (this.fits(coords, popupRect, m)) {
          this.style.left = `${coords.left}px`;
          this.style.top = `${coords.top}px`;
          this.updatePopoverBeak(
            anchorRect,
            popupRect,
            coords.left,
            coords.top,
            placementSide,
          );
          return;
        }
        const score = this.overflowScore(coords, popupRect, m);
        if (score < bestScore) {
          bestScore = score;
          best = coords;
          bestSide = placementSide;
        }
      }
    }

    const clamped = this.clamp(best || { left: 0, top: 0 }, popupRect, m);
    this.style.left = `${clamped.left}px`;
    this.style.top = `${clamped.top}px`;
    this.updatePopoverBeak(
      anchorRect,
      popupRect,
      clamped.left,
      clamped.top,
      bestSide,
    );
  }

  queueReposition() {
    if (!this.open || !this.shouldAutoReposition()) return;
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
  constructor() {
    super();
    this.content = null;
    this.#selected = false;
  }
  connectedCallback() {
    this.setAttribute("label", this.innerText);
    this.setAttribute("role", "tab");
    this.setAttribute("tabindex", "0");
    this.addEventListener("click", this.handleClick.bind(this));

    requestAnimationFrame(() => {
      if (typeof this.getAttribute("content") === "string") {
        this.content = document.querySelector(this.getAttribute("content"));
        if (this.content) {
          this.content.setAttribute("role", "tabpanel");
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
    this.removeEventListener("click", this.handleClick);
  }
  handleClick() {
    this.selected = true;
    if (this.content) {
      this.content.style.display = "block";
    }
  }

  static get observedAttributes() {
    return ["selected"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "selected") {
      this.#selected = newValue !== null && newValue !== "false";
      this.setAttribute("aria-selected", this.#selected ? "true" : "false");
      if (this?.content) {
        this.content.style.display = this.#selected ? "block" : "none";
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
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "name", "disabled"];
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "tabs";
    this.setAttribute("role", "tablist");
    this.addEventListener("click", this.handleClick.bind(this));
    this.addEventListener("keydown", this.#handleKeyDown.bind(this));
    requestAnimationFrame(() => {
      const value = this.getAttribute("value");
      if (value) {
        this.#selectByValue(value);
      }
      if (this.hasAttribute("disabled")) {
        this.#applyDisabled(true);
      }
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
        tab.setAttribute("tabindex", "0");
      }
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
    this.removeEventListener("keydown", this.#handleKeyDown);
  }

  #handleKeyDown(event) {
    const tabs = Array.from(this.querySelectorAll("fig-tab"));
    const currentIndex = tabs.findIndex((tab) => tab.hasAttribute("selected"));
    let newIndex = currentIndex;

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
      tabs.forEach((tab) => tab.removeAttribute("selected"));
      this.selectedTab = tabs[newIndex];
      this.setAttribute("value", tabs[newIndex].getAttribute("value") || "");
      tabs[newIndex].focus();
    }
  }

  get value() {
    return this.selectedTab?.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val);
  }

  #selectByValue(value) {
    const tabs = this.querySelectorAll("fig-tab");
    for (const tab of tabs) {
      if (tab.getAttribute("value") === value) {
        this.selectedTab = tab;
        tab.setAttribute("selected", "true");
      } else {
        tab.removeAttribute("selected");
      }
    }
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
    const target = event.target;
    if (target.nodeName.toLowerCase() === "fig-tab") {
      const tabs = this.querySelectorAll("fig-tab");
      for (const tab of tabs) {
        if (tab === target) {
          this.selectedTab = tab;
          tab.setAttribute("selected", "true");
          this.setAttribute("value", tab.getAttribute("value") || "");
        } else {
          tab.removeAttribute("selected");
        }
      }
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
  constructor() {
    super();
  }
  connectedCallback() {
    this.addEventListener("click", this.handleClick.bind(this));
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
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
    return ["selected", "value"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        this.#value = newValue;
        break;
      case "selected":
        this.#selected = newValue;
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
    this.addEventListener("click", this.#boundHandleClick);
    this.#applyDisabled(
      this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false",
    );
    this.#startSegmentObserver();
    this.#startResizeObserver();

    // Defer initial selection so child segments are available.
    requestAnimationFrame(() => {
      this.#syncSelectionFromAttributes({ enforceFallback: true });
      this.#refreshResizeObserverTargets();
      this.#queueIndicatorSync({ forceInstant: true });
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
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

/* Slider */
/**
 * A custom slider input element.
 * @attr {string} type - The slider type: "range", "hue", "delta", "stepper", or "opacity"
 * @attr {number} value - The current value of the slider
 * @attr {number} min - The minimum value
 * @attr {number} max - The maximum value
 * @attr {number} step - The step increment
 * @attr {boolean} text - Whether to show a text input alongside the slider
 * @attr {string} placeholder - Placeholder for the number input when text is enabled
 * @attr {string} units - The units to display after the value
 * @attr {number} transform - A multiplier for the displayed value
 * @attr {boolean} disabled - Whether the slider is disabled
 * @attr {string} color - The color for the slider track (for opacity type)
 */
class FigSlider extends HTMLElement {
  #isInteracting = false;
  #showEmptyTextValue = false;
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

    this.#boundHandleTextInput = (e) => {
      e.stopPropagation();
      this.#handleTextInput();
    };

    this.#boundHandleTextChange = (e) => {
      e.stopPropagation();
      this.#handleTextChange();
    };
  }

  #regenerateInnerHTML() {
    const rawValue = this.getAttribute("value");
    this.type = this.getAttribute("type") || "range";
    this.variant = this.getAttribute("variant") || "default";
    this.text =
      this.hasAttribute("text") && this.getAttribute("text") !== "false";
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
      rawValue === null ||
      (typeof rawValue === "string" && rawValue.trim() === "");
    this.value = this.#normalizeSliderValue(rawValue);

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

    //child nodes hack
    requestAnimationFrame(() => {
      this.input = this.querySelector("[type=range]");
      this.inputContainer = this.querySelector(".fig-slider-input-container");
      this.input.removeEventListener("input", this.#boundHandleInput);
      this.input.addEventListener("input", this.#boundHandleInput);
      this.input.removeEventListener("change", this.#boundHandleChange);
      this.input.addEventListener("change", this.#boundHandleChange);
      this.input.addEventListener("pointerdown", () => {
        this.#isInteracting = true;
      });
      this.input.addEventListener("pointerup", () => {
        this.#isInteracting = false;
      });

      if (this.default) {
        this.style.setProperty(
          "--default",
          this.#calculateNormal(this.default),
        );
      }

      this.datalist = this.querySelector("datalist");
      this.figInputNumber = this.querySelector("fig-input-number");
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
      if (this.figInputNumber) {
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

      this.#syncValue();
    });
  }

  connectedCallback() {
    this.#regenerateInnerHTML();
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("input", this.#boundHandleInput);
      this.input.removeEventListener("change", this.#boundHandleChange);
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
    const { min } = this.#getBounds();
    return min;
  }
  #normalizeSliderValue(rawValue) {
    const parsed = this.#toFiniteNumber(rawValue);
    if (parsed === null) return this.#getFallbackValue();
    return this.#clampToBounds(parsed);
  }
  #syncProperties() {
    let complete = this.#calculateNormal(this.value);
    this.style.setProperty("--slider-complete", complete);
    let defaultValue = this.#calculateNormal(this.default);
    this.style.setProperty("--default", defaultValue);
    this.style.setProperty("--unchanged", complete === defaultValue ? 1 : 0);
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
    ];
  }

  focus() {
    this.input.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
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
          this.text = newValue !== null && newValue !== "false";
          this.#regenerateInnerHTML();
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
  #boundMouseMove;
  #boundMouseUp;
  #boundWindowBlur;
  #boundMouseDown;
  #boundInputChange;

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
        this.input.setAttribute("min", String(this.min));
      }
      if (this.getAttribute("max")) {
        this.input.setAttribute("max", String(this.max));
      }
      if (this.getAttribute("step")) {
        this.input.setAttribute("step", String(this.step));
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

    let html = `<input 
      type="${this.type}" 
      ${this.name ? `name="${this.name}"` : ""}
      placeholder="${this.placeholder}"
      value="${
        this.type === "number" ? this.#transformNumber(this.value) : this.value
      }" />`;
    if (this.multiline) {
      html = `<textarea  
      placeholder="${this.placeholder}">${this.value}</textarea>`;
    }

    //child nodes hack
    requestAnimationFrame(() => {
      let append = this.querySelector("[slot=append]");
      let prepend = this.querySelector("[slot=prepend]");

      this.innerHTML = html;

      if (prepend) {
        prepend.addEventListener("click", this.focus.bind(this));
        this.prepend(prepend);
      }
      if (append) {
        append.addEventListener("click", this.focus.bind(this));
        this.append(append);
      }

      this.input = this.querySelector("input,textarea");
      this.input.readOnly = this.readonly;

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
    });
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("change", this.#boundInputChange);
    }
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
  }

  focus() {
    this.input.focus();
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
    this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
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
  #units;
  #unitPosition;
  #precision;
  #isInteracting = false;
  #stepperEl = null;

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
        if (!btn || this.disabled) return;
        const dir = btn.classList.contains("fig-stepper-up") ? 1 : -1;
        this.#stepValue(dir);
        this.input.focus();
      });
      this.append(this.#stepperEl);
    } else if (!hasSteppers && this.#stepperEl) {
      this.#stepperEl.remove();
      this.#stepperEl = null;
    }
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
  }

  connectedCallback() {
    const valueAttr = this.getAttribute("value");
    this.value =
      valueAttr !== null && valueAttr !== "" ? Number(valueAttr) : "";
    this.placeholder = this.getAttribute("placeholder") || "";
    this.name = this.getAttribute("name") || null;
    this.#units = this.getAttribute("units") || "";
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

    let html = `<input 
      type="text"
      inputmode="decimal"
      ${this.name ? `name="${this.name}"` : ""}
      placeholder="${this.placeholder}"
      value="${this.#formatWithUnit(this.value)}" />`;

    //child nodes hack
    requestAnimationFrame(() => {
      let append = this.querySelector("[slot=append]");
      let prepend = this.querySelector("[slot=prepend]");

      this.innerHTML = html;

      if (prepend) {
        prepend.addEventListener("click", this.focus.bind(this));
        this.prepend(prepend);
      }
      if (append) {
        append.addEventListener("click", this.focus.bind(this));
        this.append(append);
      }

      this.input = this.querySelector("input");

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
    });
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
    this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
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
      "unit-position",
      "steppers",
      "precision",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          break;
        case "units":
          this.#units = newValue || "";
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "unit-position":
          this.#unitPosition = newValue || "suffix";
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          this.input.value = this.#formatWithUnit(this.value);
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
          break;
        case "min":
        case "max":
        case "step":
          if (newValue === null || newValue === "") {
            this[name] = undefined;
            break;
          }
          this[name] = Number(newValue);
          break;
        case "steppers": {
          const hasSteppers = newValue !== null && newValue !== "false";
          this.#syncSteppers(hasSteppers);
          break;
        }
        case "precision":
          this.#precision = newValue !== null ? Number(newValue) : 2;
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "name":
          this[name] = this.input[name] = newValue;
          this.input.setAttribute("name", newValue);
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
    requestAnimationFrame(() => {
      this.img = this.querySelector("img");
    });
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
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["label"];
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      this.label = this.querySelector(":scope>label");
      this.input = Array.from(this.childNodes).find((node) =>
        node.nodeName.toLowerCase().startsWith("fig-"),
      );
      if (this.input && this.label) {
        this.label.addEventListener("click", this.focus.bind(this));
        let inputId = this.input.getAttribute("id") || figUniqueId();
        this.input.setAttribute("id", inputId);
        this.label.setAttribute("for", inputId);
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (this.label) {
          this.label.textContent = newValue;
        }
        break;
    }
  }

  focus() {
    this.input.focus();
  }
}
customElements.define("fig-field", FigField);

/* Field + Slider wrapper */
class FigFieldSlider extends HTMLElement {
  #field = null;
  #label = null;
  #slider = null;
  #observer = null;
  #managedSliderAttrs = new Set();
  #steppersSyncFrame = 0;
  #boundHandleSliderInput = null;
  #boundHandleSliderChange = null;
  #ignoredSliderAttrs = new Set(["variant", "color", "text", "full"]);

  static get observedAttributes() {
    return ["label", "direction"];
  }

  connectedCallback() {
    if (!this.#field) {
      this.#initialize();
    }

    this.#syncField();
    this.#syncSliderAttributes();
    this.#bindSliderEvents();

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncSlider = false;

        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            if (
              mutation.attributeName &&
              this.#ignoredSliderAttrs.has(mutation.attributeName)
            ) {
              continue;
            }
            if (
              mutation.attributeName === "label" ||
              mutation.attributeName === "direction"
            ) {
              syncField = true;
            } else {
              syncSlider = true;
            }
          }
        }

        if (syncField) this.#syncField();
        if (syncSlider) this.#syncSliderAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    if (this.#steppersSyncFrame) {
      cancelAnimationFrame(this.#steppersSyncFrame);
      this.#steppersSyncFrame = 0;
    }
    this.#unbindSliderEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction") {
      this.#syncField();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter((node) => {
      return (
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
      );
    });

    const field = document.createElement("fig-field");
    const label = document.createElement("label");
    const slider = document.createElement("fig-slider");
    slider.setAttribute("text", "true");
    for (const attrName of this.#getForwardedSliderAttrNames()) {
      const value = this.getAttribute(attrName);
      slider.setAttribute(attrName, value ?? "");
    }

    field.append(label, slider);

    this.#field = field;
    this.#label = label;
    this.#slider = slider;

    this.replaceChildren(field);

    for (const node of initialChildren) {
      this.#slider.appendChild(node);
    }
  }

  #syncField() {
    if (!this.#field || !this.#label) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      if (this.#label.parentElement === this.#field) {
        this.#label.remove();
      }
    } else {
      this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
  }

  #syncSliderAttributes() {
    if (!this.#slider) return;
    const hostAttrs = this.#getForwardedSliderAttrNames();

    const nextManaged = new Set(hostAttrs.filter((name) => name !== "text"));

    for (const attrName of this.#managedSliderAttrs) {
      if (!nextManaged.has(attrName)) {
        this.#slider.removeAttribute(attrName);
      }
    }

    for (const attrName of hostAttrs) {
      if (attrName === "text") continue;
      const value = this.getAttribute(attrName);
      this.#slider.setAttribute(attrName, value ?? "");
    }

    this.#slider.removeAttribute("variant");
    this.#slider.removeAttribute("color");
    this.#slider.removeAttribute("transform");
    this.#slider.removeAttribute("full");
    this.#slider.setAttribute("text", "true");

    const sliderType = (this.getAttribute("type") || "range").toLowerCase();
    if (sliderType === "delta" || sliderType === "stepper") {
      this.#slider.setAttribute(
        "default",
        this.getAttribute("default") ?? "50",
      );
    } else if (!this.hasAttribute("default")) {
      this.#slider.removeAttribute("default");
    }
    if (sliderType === "stepper") {
      this.#slider.setAttribute("step", this.getAttribute("step") ?? "10");
    } else if (!this.hasAttribute("step")) {
      this.#slider.removeAttribute("step");
    }
    if (sliderType === "opacity") {
      this.#slider.style.setProperty(
        "--color",
        "var(--figma-color-bg-tertiary)",
      );
    } else {
      this.#slider.style.removeProperty("--color");
    }

    this.#managedSliderAttrs = nextManaged;
    this.#queueSteppersSync();
  }

  #getForwardedSliderAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "steppers",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !this.#ignoredSliderAttrs.has(name),
    );
  }

  #queueSteppersSync() {
    if (this.#steppersSyncFrame) {
      cancelAnimationFrame(this.#steppersSyncFrame);
    }
    this.#steppersSyncFrame = requestAnimationFrame(() => {
      this.#steppersSyncFrame = 0;
      this.#syncSteppersToNumberInput();
    });
  }

  #syncSteppersToNumberInput() {
    if (!this.#slider) return;
    const numberInput = this.#slider.querySelector("fig-input-number");
    if (!numberInput) return;

    const hasSteppers =
      this.hasAttribute("steppers") &&
      this.getAttribute("steppers") !== "false";
    if (!hasSteppers) {
      numberInput.removeAttribute("steppers");
      return;
    }

    const steppersValue = this.getAttribute("steppers");
    numberInput.setAttribute("steppers", steppersValue ?? "");
  }

  #bindSliderEvents() {
    if (!this.#slider) return;
    if (!this.#boundHandleSliderInput) {
      this.#boundHandleSliderInput = this.#forwardSliderEvent.bind(
        this,
        "input",
      );
    }
    if (!this.#boundHandleSliderChange) {
      this.#boundHandleSliderChange = this.#forwardSliderEvent.bind(
        this,
        "change",
      );
    }
    this.#slider.addEventListener("input", this.#boundHandleSliderInput);
    this.#slider.addEventListener("change", this.#boundHandleSliderChange);
  }

  #unbindSliderEvents() {
    if (!this.#slider) return;
    if (this.#boundHandleSliderInput) {
      this.#slider.removeEventListener("input", this.#boundHandleSliderInput);
    }
    if (this.#boundHandleSliderChange) {
      this.#slider.removeEventListener("change", this.#boundHandleSliderChange);
    }
  }

  #forwardSliderEvent(type, event) {
    event.stopPropagation();
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : this.#slider?.value;
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }
}
customElements.define("fig-field-slider", FigFieldSlider);

/* Color swatch */
class FigInputColor extends HTMLElement {
  rgba;
  hex;
  #alphaPercent = 100;
  #swatch;
  #fillPicker;
  #textInput;
  #alphaInput;
  constructor() {
    super();
  }

  get picker() {
    return this.getAttribute("picker") || "native";
  }
  set picker(value) {
    this.setAttribute("picker", value);
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

  #buildFillPickerAttrs() {
    const attrs = {};
    const experimental = this.getAttribute("experimental");
    if (experimental) attrs["experimental"] = experimental;
    // picker-* attributes forwarded to fill picker (except anchor, handled programmatically)
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

  connectedCallback() {
    if (this.#renderRAF) cancelAnimationFrame(this.#renderRAF);
    this.#renderRAF = requestAnimationFrame(() => {
      this.#renderRAF = null;
      this.#buildUI();
    });
  }

  #renderRAF = null;

  #buildUI() {
    this.#setValues(this.getAttribute("value"));

    const useFigmaPicker = this.picker === "figma";
    const hidePicker = this.picker === "false";
    const showAlpha = this.getAttribute("alpha") === "true";
    const fpAttrs = this.#buildFillPickerAttrs();
    const disabled = this.#disabled;
    const disabledAttr = disabled ? " disabled" : "";

    let html = ``;
    const showText = this.getAttribute("text") === "true";
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
      if (!hidePicker) {
        swatchElement = useFigmaPicker
          ? `<fig-fill-picker mode="solid" ${fpAttrs} ${
              showAlpha ? "" : 'alpha="false"'
            } value='{"type":"solid","color":"${this.hexOpaque}","opacity":${
              this.#alphaPercent
            }}'${disabledAttr}></fig-fill-picker>`
          : `<fig-chit background="${this.hexOpaque}" alpha="${this.rgba.a}"${disabledAttr}></fig-chit>`;
      }

      html = `<div class="input-combo">
                ${swatchElement}
                ${label}
            </div>`;
    } else {
      if (hidePicker) {
        html = ``;
      } else {
        html = useFigmaPicker
          ? `<fig-fill-picker mode="solid" ${fpAttrs} ${
              showAlpha ? "" : 'alpha="false"'
            } value='{"type":"solid","color":"${this.hexOpaque}","opacity":${
              this.#alphaPercent
            }}'${disabledAttr}></fig-fill-picker>`
          : `<fig-chit background="${this.hexOpaque}" alpha="${this.rgba.a}"${disabledAttr}></fig-chit>`;
      }
    }
    this.innerHTML = html;

    requestAnimationFrame(() => {
      this.#swatch = this.querySelector("fig-chit");
      this.#fillPicker = this.querySelector("fig-fill-picker");
      this.#textInput = this.querySelector("fig-input-text:not([type=number])");
      this.#alphaInput = this.querySelector("fig-input-number");

      // Setup swatch (native picker)
      if (this.#swatch) {
        this.#swatch.disabled = this.hasAttribute("disabled");
        this.#swatch.addEventListener("input", this.#handleInput.bind(this));
      }

      // Setup fill picker (figma picker)
      if (this.#fillPicker) {
        const anchor = this.getAttribute("picker-anchor");
        if (anchor === "self") {
          this.#fillPicker.anchorElement = this;
        } else if (anchor) {
          const el = document.querySelector(anchor);
          if (el) this.#fillPicker.anchorElement = el;
        }
        if (this.hasAttribute("disabled")) {
          this.#fillPicker.setAttribute("disabled", "");
        }
        this.#fillPicker.addEventListener(
          "input",
          this.#handleFillPickerInput.bind(this),
        );
        this.#fillPicker.addEventListener(
          "change",
          this.#handleChange.bind(this),
        );
      }

      if (this.#textInput) {
        const hex = this.rgbAlphaToHex(this.rgba, 1);
        // Display without # prefix
        this.#textInput.value = hex.slice(1).toUpperCase();
        if (this.#swatch) {
          this.#swatch.background = hex;
        }
        this.#textInput.addEventListener(
          "input",
          this.#handleTextInput.bind(this),
        );
        this.#textInput.addEventListener(
          "change",
          this.#handleChange.bind(this),
        );
      }

      if (this.#alphaInput) {
        this.#alphaInput.addEventListener(
          "input",
          this.#handleAlphaInput.bind(this),
        );
        this.#alphaInput.addEventListener(
          "change",
          this.#handleChange.bind(this),
        );
      }
    });
  }
  #setValues(hexValue) {
    this.rgba = this.convertToRGBA(hexValue);
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
    if (hexValue.length > 7) {
      this.#alphaPercent = (this.rgba.a * 100).toFixed(0);
    }
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
    this.#swatch.focus();
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
    const e = new CustomEvent("input", {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(e);
  }
  #emitChangeEvent() {
    const e = new CustomEvent("change", {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(e);
  }

  static get observedAttributes() {
    return ["value", "style", "mode", "picker", "experimental", "alpha", "text", "disabled"];
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
        // Mode attribute is passed through to fig-fill-picker when used
        if (this.#fillPicker && newValue) {
          this.#fillPicker.setAttribute("mode", newValue);
        }
        break;
      case "picker":
        // Picker type change requires re-render
        break;
      case "alpha":
      case "text":
        if (this.isConnected) this.#buildUI();
        break;
      case "disabled":
        this.#syncDisabled();
        break;
    }
  }

  get #disabled() {
    return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
  }

  #syncDisabled() {
    const disabled = this.#disabled;
    for (const child of [this.#swatch, this.#textInput, this.#alphaInput]) {
      if (!child) continue;
      if (disabled) child.setAttribute("disabled", "");
      else child.removeAttribute("disabled");
    }
    if (this.#fillPicker) {
      if (disabled) this.#fillPicker.setAttribute("disabled", "");
      else this.#fillPicker.removeAttribute("disabled");
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

const GRADIENT_PICKER_SPACES = ["srgb-linear", "oklab", "oklch"];

function normalizeGradientConfig(gradient) {
  const next = { ...(gradient ?? {}) };
  let interpolationSpace = String(
    next.interpolationSpace ?? "oklab",
  ).toLowerCase();
  if (!GRADIENT_INTERPOLATION_SPACES.includes(interpolationSpace)) {
    interpolationSpace = "oklab";
  }
  if (interpolationSpace === "srgb" || interpolationSpace === "display-p3") {
    interpolationSpace = "oklab";
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
  if (normalized.interpolationSpace === "oklch") {
    return `in oklch ${normalized.hueInterpolation} hue`;
  }
  return `in ${normalized.interpolationSpace}`;
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
    interpolationSpace: "oklab",
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
    return ["value", "disabled", "mode", "experimental", "alpha"];
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
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

  #syncDisabled() {
    const disabled = this.hasAttribute("disabled");
    for (const child of [this.#fillPicker, this.#opacityInput, this.#hexInput]) {
      if (!child) continue;
      if (disabled) child.setAttribute("disabled", "");
      else child.removeAttribute("disabled");
    }
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

      case "gradient":
        const gradientLabel =
          this.#gradient.type.charAt(0).toUpperCase() +
          this.#gradient.type.slice(1);
        controlsHtml = `
          <label class="fig-input-fill-label">${gradientLabel}</label>
          ${opacityHtml(this.#gradient.stops[0]?.opacity ?? 100)}`;
        break;

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
        }></fig-fill-picker>
        ${controlsHtml}
      </div>`;

    this.#setupEventListeners();
  }

  #setupEventListeners() {
    requestAnimationFrame(() => {
      this.#fillPicker = this.querySelector("fig-fill-picker");
      this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
      this.#hexInput = this.querySelector(".fig-input-fill-hex");
      const label = this.querySelector(".fig-input-fill-label");

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
              // Apply to all stops
              this.#gradient.stops.forEach((stop) => {
                stop.opacity = opacity;
              });
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
    });
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
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            this.#gradient.stops[0]?.opacity ?? 100,
          );
        }
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
      case "gradient":
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
              value="${this.#gradient.stops[0]?.opacity ?? 100}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
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
    requestAnimationFrame(() => {
      this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
      this.#hexInput = this.querySelector(".fig-input-fill-hex");
      const label = this.querySelector(".fig-input-fill-label");

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
              this.#gradient.stops.forEach((stop) => {
                stop.opacity = opacity;
              });
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
    });
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
    }
  }
}
customElements.define("fig-input-fill", FigInputFill);

/* Input Palette */
/**
 * A palette of solid colors, each rendered as a fig-input-color swatch.
 * Manages an internal array of colors with add support.
 * @attr {string} value - JSON array of hex strings or {color,alpha} objects, or comma-separated hex
 * @attr {boolean} disabled - Whether the palette is disabled
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

  static get observedAttributes() {
    return ["value", "disabled", "min", "max", "expanded", "add"];
  }

  get #expanded() {
    return this.hasAttribute("expanded") && this.getAttribute("expanded") !== "false";
  }

  get #showAdd() {
    return !this.hasAttribute("add") || this.getAttribute("add") !== "false";
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
    if (this.#renderRAF) cancelAnimationFrame(this.#renderRAF);
    this.#renderRAF = requestAnimationFrame(() => {
      this.#renderRAF = null;
      this.#parseValue();
      this.#render();
    });
  }

  disconnectedCallback() {
    if (this.#renderRAF) {
      cancelAnimationFrame(this.#renderRAF);
      this.#renderRAF = null;
    }
    this.#inlinePickers = [];
    this.#expandedPickers = [];
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
      case "expanded":
      case "add":
        this.#render();
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
            return { color: entry.slice(0, 7), alpha: entry.length > 7 ? parseInt(entry.slice(7, 9), 16) / 255 : 1 };
          }
          if (entry && typeof entry === "object") {
            return {
              color: entry.color || "#D9D9D9",
              alpha: entry.alpha !== undefined ? entry.alpha : (entry.opacity !== undefined ? entry.opacity / 100 : 1),
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
      this.#colors = [{
        color: trimmed.slice(0, 7),
        alpha: trimmed.length > 7 ? parseInt(trimmed.slice(7, 9), 16) / 255 : 1,
      }];
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
    const disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";

    this.innerHTML = "";
    this.#inlinePickers = [];
    this.#expandedPickers = [];

    const inlineWrap = document.createElement("div");
    inlineWrap.className = "palette-colors-inline";

    const wrap = document.createElement("div");
    wrap.className = "palette-colors";
    this.#colors.forEach((entry, i) => {
      wrap.appendChild(this.#createPicker(entry, i, disabled, { inline: true }));
    });
    inlineWrap.appendChild(wrap);

    if (this.#showAdd) this.#createAddButton(disabled, inlineWrap);
    this.appendChild(inlineWrap);

    const expandedWrap = document.createElement("div");
    expandedWrap.className = "palette-colors-expanded";
    this.#colors.forEach((entry, i) => {
      expandedWrap.appendChild(this.#createPicker(entry, i, disabled));
    });
    this.appendChild(expandedWrap);
  }

  #createPicker(entry, index, disabled, { inline = false } = {}) {
    const hexAlpha = entry.alpha < 1
      ? entry.color + Math.round(entry.alpha * 255).toString(16).padStart(2, "0")
      : entry.color;
    const ic = document.createElement("fig-input-color");
    ic.setAttribute("value", hexAlpha);
    ic.setAttribute("picker", "figma");
    ic.setAttribute("picker-anchor", "self");
    if (inline) {
      ic.setAttribute("text", "false");
      ic.setAttribute("alpha", "true");
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
        const hex = entry.alpha < 1
          ? entry.color + Math.round(entry.alpha * 255).toString(16).padStart(2, "0")
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

  #createAddButton(disabled, parent = this) {
    const atMax = this.#colors.length >= this.#max;
    const addBtn = document.createElement("fig-button");
    addBtn.setAttribute("variant", "ghost");
    addBtn.setAttribute("icon", "true");
    addBtn.setAttribute("aria-label", "Add color");
    addBtn.className = "palette-add-btn";
    if (disabled || atMax) addBtn.setAttribute("disabled", "");
    addBtn.innerHTML = `<span class="fig-mask-icon" style="--icon: var(--icon-add)"></span>`;
    addBtn.addEventListener("click", () => {
      if (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") return;
      if (this.#colors.length >= this.#max) return;
      this.#addColor({ color: "#D9D9D9", alpha: 1 });
    });
    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Add color");
    tooltip.appendChild(addBtn);
    parent.appendChild(tooltip);
  }

  #addColor(entry) {
    this.#colors.push(entry);
    const disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const index = this.#colors.length - 1;

    const inlineIc = this.#createPicker(entry, index, disabled, { inline: true });
    const wrap = this.querySelector(".palette-colors");
    if (wrap) wrap.appendChild(inlineIc);

    const expandedIc = this.#createPicker(entry, index, disabled);
    const expandedWrap = this.querySelector(".palette-colors-expanded");
    if (expandedWrap) expandedWrap.appendChild(expandedIc);

    if (this.#colors.length >= this.#max) {
      const addBtn = this.querySelector(".palette-add-btn");
      if (addBtn) addBtn.setAttribute("disabled", "");
    }
    this.#emitChange();
  }

  #updateChit(index) {
    const entry = this.#colors[index];
    if (!entry) return;
    const hexAlpha = entry.alpha < 1
      ? entry.color + Math.round(entry.alpha * 255).toString(16).padStart(2, "0")
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
    const disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    [...this.#inlinePickers, ...this.#expandedPickers].forEach((fp) => {
      if (disabled) fp.setAttribute("disabled", "");
      else fp.removeAttribute("disabled");
    });
    const addBtn = this.querySelector(".palette-add-btn");
    if (addBtn) {
      if (disabled) addBtn.setAttribute("disabled", "");
      else addBtn.removeAttribute("disabled");
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
  #gradient = {
    type: "linear",
    angle: 180,
    interpolationSpace: "oklab",
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
    return ["value", "disabled"];
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
    document.addEventListener("keydown", this.#onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this.#onKeyDown);
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
      const delta = (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? FigInputGradient.SHIFT_SNAP : 1);
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

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;
    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed?.type === "gradient" && parsed.gradient) {
        this.#gradient = normalizeGradientConfig({
          ...this.#gradient,
          ...parsed.gradient,
        });
        return;
      }
      if (parsed?.gradient) {
        this.#gradient = normalizeGradientConfig({
          ...this.#gradient,
          ...parsed.gradient,
        });
      }
    } catch (e) {
      // Ignore invalid JSON and keep current/default gradient.
    }
  }

  #buildGradientCSS() {
    const sorted = [...this.#gradient.stops].sort(
      (a, b) => a.position - b.position,
    );
    const stops = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
    return `linear-gradient(${this.#gradient.angle}deg, ${stops})`;
  }

  #buildStopHandles() {
    const disabled = this.hasAttribute("disabled");
    return this.#gradient.stops
      .map(
        (stop, i) =>
          `<fig-tooltip action="manual" text="${Math.round(stop.position)}%"><fig-handle drag drag-axes="x" drag-surface=".fig-input-gradient-track" type="color" color="${stop.color}" value="${stop.position}% 50%" data-stop-index="${i}"${disabled ? " disabled" : ""}></fig-handle></fig-tooltip>`,
      )
      .join("");
  }

  #ghostHandle = null;

  #render() {
    const disabled = this.hasAttribute("disabled");
    this.innerHTML = `
      <fig-chit size="medium" background="${this.#buildGradientCSS()}"${disabled ? " disabled" : ""}></fig-chit>
      <div class="fig-input-gradient-track">${this.#buildStopHandles()}</div>`;
    this.#chit = this.querySelector("fig-chit");
    this.#track = this.querySelector(".fig-input-gradient-track");
    this.#setupGhostHandle();
    this.#setupEventListeners();
  }

  #sampleGradientColor(position) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    for (const stop of this.#gradient.stops) {
      try {
        grad.addColorStop(stop.position / 100, stop.color);
      } catch {
        /* skip invalid */
      }
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 1);
    const px = Math.round(Math.max(0, Math.min(255, position * 255)));
    const [r, g, b] = ctx.getImageData(px, 0, 1, 1).data;
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  #setupGhostHandle() {
    if (!this.#track || this.hasAttribute("disabled")) return;

    const ghost = document.createElement("fig-handle");
    ghost.classList.add("fig-input-gradient-ghost");
    ghost.style.position = "absolute";
    ghost.style.top = "50%";
    ghost.style.transform = "translate(-50%, -50%)";
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0";
    ghost.style.transition = "opacity 0.15s";
    ghost.style.overflow = "visible";

    const tip = document.createElement("fig-color-tip");
    tip.setAttribute("control", "add");
    tip.style.position = "absolute";
    tip.style.bottom = "calc(100% + 6px)";
    tip.style.left = "50%";
    tip.style.transform = "translateX(-50%)";
    tip.style.zIndex = "10";
    ghost.appendChild(tip);

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
    if (e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) {
      if (e.shiftKey) {
        const clickedHandle = e.target.closest("fig-handle");
        const stopIdx = parseInt(clickedHandle?.dataset.stopIndex, 10);
        this.#distributeStops();
        if (!isNaN(stopIdx)) {
          this.#track.querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)").forEach((h) => {
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
      this.#reobserveHandleColors();
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const h = handles[i];
      const stop = stops[i];
      h.dataset.stopIndex = i;
      h.setAttribute("value", `${stop.position}% 50%`);
      h.setAttribute("color", stop.color);
      const tip = h.closest("fig-tooltip");
      if (tip) tip.setAttribute("text", `${Math.round(stop.position)}%`);
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

    this.#track.addEventListener("input", (e) => {
      const handle = e.target.closest("fig-handle");
      if (!handle) return;
      e.stopPropagation();
      if (!this.#handleDragging) handle.style.zIndex = "5";
      this.#handleDragging = true;
      const idx = parseInt(handle.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      const px = e.detail?.px ?? 0;
      const rawPosition = Math.round(px * 100);
      let position = rawPosition;
      const trackW = this.#track.getBoundingClientRect().width;
      if (e.detail?.shiftKey) {
        position = Math.round(position / FigInputGradient.SHIFT_SNAP) * FigInputGradient.SHIFT_SNAP;
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
        handle.style.left = `${(position / 100) * trackW - handle.offsetWidth / 2}px`;
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
      handle.style.left = `${(position / 100) * trackW - handle.offsetWidth / 2}px`;
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
        if (newColor && newColor !== this.#gradient.stops[idx].color) {
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
      gradient: gradientToValueShape(this.#gradient),
    };
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
        this.#parseValue();
        this.#syncChit();
        this.#syncHandles();
        break;
      case "disabled":
        this.#syncDisabled();
        break;
    }
  }

  #syncDisabled() {
    const disabled = this.hasAttribute("disabled");
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
    this.input.setAttribute("role", "checkbox");
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

    this.input.checked =
      this.hasAttribute("checked") && this.getAttribute("checked") !== "false";
    this.input.removeEventListener("change", this.#boundHandleInput);
    this.input.addEventListener("change", this.#boundHandleInput);

    if (this.hasAttribute("disabled")) {
      this.input.disabled = true;
    }
    if (this.hasAttribute("indeterminate")) {
      this.input.indeterminate = true;
      this.input.setAttribute("indeterminate", "true");
    }

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
        this.input.checked =
          this.hasAttribute("checked") &&
          this.getAttribute("checked") !== "false";
        if (this.input.checked && this.hasAttribute("indeterminate")) {
          this.removeAttribute("indeterminate");
        }
        this.input.indeterminate =
          this.hasAttribute("indeterminate") &&
          this.getAttribute("indeterminate") !== "false" &&
          !this.input.checked;
        if (this.input.indeterminate) {
          this.input.setAttribute("indeterminate", "true");
        } else {
          this.input.removeAttribute("indeterminate");
        }
        break;
      case "indeterminate":
        this.input.indeterminate =
          this.hasAttribute("indeterminate") &&
          this.getAttribute("indeterminate") !== "false" &&
          !this.input.checked;
        if (this.input.indeterminate) {
          this.input.setAttribute("indeterminate", "true");
        } else {
          this.input.removeAttribute("indeterminate");
        }
        break;
      case "value":
        this.input.value = newValue;
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
    // Update ARIA state
    this.input.setAttribute("aria-checked", this.input.checked);
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

/* Toast */
/**
 * A toast notification element for non-modal, time-based messages.
 * Always positioned at bottom center of the screen.
 * @attr {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss, default: 5000)
 * @attr {number} offset - Distance from bottom edge in pixels (default: 16)
 * @attr {string} theme - Visual theme: "dark" (default), "light", "danger", "brand"
 * @attr {boolean} open - Whether the toast is visible
 */
class FigToast extends HTMLDialogElement {
  _defaultOffset = 16; // 1rem in pixels
  _autoCloseTimer = null;

  constructor() {
    super();
  }

  getOffset() {
    return parseInt(this.getAttribute("offset") ?? this._defaultOffset);
  }

  connectedCallback() {
    if (typeof this._defaultOffset !== "number") {
      this._defaultOffset = 16;
    }
    if (typeof this._autoCloseTimer === "undefined") {
      this._autoCloseTimer = null;
    }

    // Set default theme if not specified
    if (!this.hasAttribute("theme")) {
      this.setAttribute("theme", "dark");
    }

    // Ensure toast is closed by default
    // Remove native open attribute if present and not explicitly "true"
    const shouldOpen =
      this.getAttribute("open") === "true" || this.getAttribute("open") === "";
    if (this.hasAttribute("open") && !shouldOpen) {
      this.removeAttribute("open");
    }

    // Close the dialog initially (override native behavior)
    if (!shouldOpen) {
      this.close();
    }

    requestAnimationFrame(() => {
      this.addCloseListeners();
      this.applyPosition();

      // Auto-show if open attribute is explicitly true
      if (shouldOpen) {
        this.showToast();
      }
    });
  }

  disconnectedCallback() {
    this.clearAutoClose();
  }

  addCloseListeners() {
    this.querySelectorAll("[close-toast]").forEach((button) => {
      button.removeEventListener("click", this.handleClose);
      button.addEventListener("click", this.handleClose.bind(this));
    });
  }

  handleClose() {
    this.hideToast();
  }

  applyPosition() {
    // Always bottom center
    this.style.position = "fixed";
    this.style.margin = "0";
    this.style.top = "auto";
    this.style.bottom = `${this.getOffset()}px`;
    this.style.left = "50%";
    this.style.right = "auto";
    this.style.transform = "translateX(-50%)";
  }

  startAutoClose() {
    this.clearAutoClose();

    const duration = parseInt(this.getAttribute("duration") ?? "5000");
    if (duration > 0) {
      this._autoCloseTimer = setTimeout(() => {
        this.hideToast();
      }, duration);
    }
  }

  clearAutoClose() {
    if (this._autoCloseTimer) {
      clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }
  }

  #resolveAutoTheme() {
    if (this.getAttribute("theme") !== "auto") return;
    const cs = getComputedStyle(document.documentElement).colorScheme || "";
    const isDark = cs.includes("dark");
    this.style.colorScheme = isDark ? "light" : "dark";
  }

  /**
   * Show the toast notification (non-modal)
   */
  showToast() {
    this.#resolveAutoTheme();
    this.show(); // Non-modal show
    this.applyPosition();
    this.startAutoClose();
    this.dispatchEvent(new CustomEvent("toast-show", { bubbles: true }));
  }

  /**
   * Hide the toast notification
   */
  hideToast() {
    this.clearAutoClose();
    this.close();
    this.dispatchEvent(new CustomEvent("toast-hide", { bubbles: true }));
  }

  static get observedAttributes() {
    return ["duration", "offset", "open", "theme"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "offset") {
      this.applyPosition();
    }

    if (name === "open") {
      if (newValue !== null && newValue !== "false") {
        this.showToast();
      } else {
        this.hideToast();
      }
    }

    if (name === "theme") {
      if (newValue === "auto") {
        this.#resolveAutoTheme();
      } else {
        this.style.removeProperty("color-scheme");
      }
    }
  }
}
figDefineCustomizedBuiltIn("fig-toast", FigToast, { extends: "dialog" });

/* Combo Input */
/**
 * A custom combo input with text and dropdown.
 * @attr {string} options - Comma-separated list of dropdown options
 * @attr {string} placeholder - Placeholder text for the input
 * @attr {string} value - The current input value
 */
class FigComboInput extends HTMLElement {
  #usesCustomDropdown = false;
  #boundHandleSelectInput = null;

  constructor() {
    super();
    this.#boundHandleSelectInput = this.handleSelectInput.bind(this);
  }
  getOptionsFromAttribute() {
    return (this.getAttribute("options") || "").split(",");
  }
  connectedCallback() {
    const customDropdown =
      Array.from(this.children).find(
        (child) => child.tagName === "FIG-DROPDOWN",
      ) || null;
    this.#usesCustomDropdown = customDropdown !== null;
    if (customDropdown) {
      customDropdown.remove();
    }

    this.options = this.getOptionsFromAttribute();
    this.placeholder = this.getAttribute("placeholder") || "";
    this.value = this.getAttribute("value") || "";
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";
    const dropdownHTML = this.#usesCustomDropdown
      ? ""
      : `<fig-dropdown type="dropdown" ${expAttr}>
                              ${this.options
                                .map((option) => `<option>${option}</option>`)
                                .join("")}
                            </fig-dropdown>`;
    this.innerHTML = `<div class="input-combo">
                        <fig-input-text placeholder="${this.placeholder}">
                        </fig-input-text> 
                        <fig-button type="select" variant="input" icon>
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
  <path d='M5.87868 7.12132L8 9.24264L10.1213 7.12132' stroke='currentColor' stroke-opacity="0.9" stroke-linecap='round'/>
</svg>
                            ${dropdownHTML}
                        </fig-button>
                    </div>`;
    requestAnimationFrame(() => {
      this.input = this.querySelector("fig-input-text");
      const button = this.querySelector("fig-button");

      if (this.#usesCustomDropdown && customDropdown && button) {
        if (!customDropdown.hasAttribute("type")) {
          customDropdown.setAttribute("type", "dropdown");
        }
        if (experimental) {
          customDropdown.setAttribute("experimental", experimental);
        }
        button.append(customDropdown);
      }
      this.dropdown = this.querySelector("fig-dropdown");

      this.dropdown?.removeEventListener("input", this.#boundHandleSelectInput);
      this.dropdown?.addEventListener("input", this.#boundHandleSelectInput);

      if (this.input) {
        this.input.setAttribute("value", this.value);
      }

      // Apply initial disabled state
      if (this.hasAttribute("disabled")) {
        this.#applyDisabled(true);
      }
    });
  }
  disconnectedCallback() {
    this.dropdown?.removeEventListener("input", this.#boundHandleSelectInput);
  }
  handleSelectInput(e) {
    this.setAttribute("value", e.target.closest("fig-dropdown").value);
  }
  handleInput(e) {
    this.value = this.input.value;
  }
  static get observedAttributes() {
    return ["options", "placeholder", "value", "disabled", "experimental"];
  }
  focus() {
    this.input.focus();
  }
  #applyDisabled(disabled) {
    if (this.input) {
      if (disabled) {
        this.input.setAttribute("disabled", "");
      } else {
        this.input.removeAttribute("disabled");
      }
    }
    const button = this.querySelector("fig-button");
    if (button) {
      if (disabled) {
        button.setAttribute("disabled", "");
      } else {
        button.removeAttribute("disabled");
      }
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "options":
        this.options = newValue.split(",");
        if (this.dropdown && !this.#usesCustomDropdown) {
          this.dropdown.innerHTML = this.options
            .map((option) => `<option>${option}</option>`)
            .join("");
        }
        break;
      case "placeholder":
        this.placeholder = newValue;
        if (this.input) {
          this.input.setAttribute("placeholder", newValue);
        }
        break;
      case "value":
        this.value = newValue;
        if (this.input) {
          this.input.setAttribute("value", newValue);
        }
        break;
      case "disabled":
        this.#applyDisabled(newValue !== null && newValue !== "false");
        break;
      case "experimental":
        if (this.dropdown) {
          if (newValue) {
            this.dropdown.setAttribute("experimental", newValue);
          } else if (!this.#usesCustomDropdown) {
            this.dropdown.removeAttribute("experimental");
          }
        }
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
    return ["background", "size", "selected", "disabled", "alpha"];
  }

  connectedCallback() {
    this.#render();
    this.#updateAlpha();
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
    // Convert color to hex for the native input
    if (!color) return "#D9D9D9";
    if (color.startsWith("#")) return color.slice(0, 7);
    // Use canvas to convert rgba/named colors to hex
    try {
      const ctx = document.createElement("canvas").getContext("2d");
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
        this.innerHTML = `<input type="color" value="${hex}" />`;
        this.input = this.querySelector("input");
        if (!isVar) {
          this.input.addEventListener("input", this.#boundHandleInput);
        }
      } else {
        this.innerHTML = "";
        this.input = null;
      }
    } else if (this.#type === "color" && this.input) {
      const hex = this.#toHex(bg);
      if (this.input.value !== hex) {
        this.input.value = hex;
      }
    }

    // Always update CSS variable with raw value so vars stay reactive
    this.style.setProperty("--chit-background", rawBg);
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
      // Skip full re-render if this was triggered by internal input
      if (this.#internalUpdate) {
        this.style.setProperty("--chit-background", newValue);
        return;
      }
      this.#render();
    } else if (name === "alpha") {
      this.#updateAlpha();
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

/* Upload */
/**
 * A custom image upload element.
 * @attr {string} src - The current image source URL
 * @attr {boolean} upload - Whether to show the upload button
 * @attr {string} label - The upload button label
 * @attr {string} size - Size of the image preview
 */
class FigImage extends HTMLElement {
  #src = null;
  #boundHandleFileInput = this.#handleFileInput.bind(this);
  #boundHandleDownload = this.#handleDownload.bind(this);
  constructor() {
    super();
  }
  #getInnerHTML() {
    const cb =
      this.hasAttribute("checkerboard") &&
      this.getAttribute("checkerboard") !== "false";
    const bg = this.src
      ? `url(${this.src})`
      : cb
        ? "url()"
        : "var(--figma-color-bg-secondary)";
    return `<fig-chit size="large" data-type="image" background="${bg}" disabled${cb ? " checkerboard" : ""}></fig-chit><div>${
      this.upload
        ? `<fig-button variant="overlay" type="upload">
          ${this.label} 
          <input type="file" accept="image/*" />
        </fig-button>`
        : ""
    } ${
      this.download
        ? `<fig-button variant="overlay" icon="true" type="download">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.5 13C17.7761 13 18 13.2239 18 13.5V16.5C18 17.3284 17.3284 18 16.5 18H7.5C6.67157 18 6 17.3284 6 16.5V13.5C6 13.2239 6.22386 13 6.5 13C6.77614 13 7 13.2239 7 13.5V16.5C7 16.7761 7.22386 17 7.5 17H16.5C16.7761 17 17 16.7761 17 16.5V13.5C17 13.2239 17.2239 13 17.5 13ZM12 6C12.2761 6 12.5 6.22386 12.5 6.5V12.293L14.6465 10.1465C14.8417 9.95122 15.1583 9.95122 15.3535 10.1465C15.5488 10.3417 15.5488 10.6583 15.3535 10.8535L12.3535 13.8535C12.2597 13.9473 12.1326 14 12 14C11.9006 14 11.8042 13.9704 11.7227 13.916L11.6465 13.8535L8.64648 10.8535C8.45122 10.6583 8.45122 10.3417 8.64648 10.1465C8.84175 9.95122 9.15825 9.95122 9.35352 10.1465L11.5 12.293V6.5C11.5 6.22386 11.7239 6 12 6Z" fill="black"/>
</svg></fig-button>`
        : ""
    }</div>`;
  }
  connectedCallback() {
    this.#src = this.getAttribute("src") || "";
    this.upload =
      this.hasAttribute("upload") && this.getAttribute("upload") !== "false";
    this.download =
      this.hasAttribute("download") &&
      this.getAttribute("download") !== "false";
    this.label = this.getAttribute("label") || "Upload";
    this.size = this.getAttribute("size") || "small";
    this.innerHTML = this.#getInnerHTML();
    this.#updateRefs();
    const ar = this.getAttribute("aspect-ratio");
    if (ar && ar !== "auto") {
      this.style.setProperty("--aspect-ratio", ar);
    }
    const fit = this.getAttribute("fit");
    if (fit) {
      this.style.setProperty("--fit", fit);
    }
  }
  disconnectedCallback() {
    this.fileInput?.removeEventListener("change", this.#boundHandleFileInput);
    this.downloadButton?.removeEventListener(
      "click",
      this.#boundHandleDownload,
    );
  }

  #updateRefs() {
    requestAnimationFrame(() => {
      this.chit = this.querySelector("fig-chit");
      if (this.upload) {
        this.uploadButton = this.querySelector("fig-button[type='upload']");
        this.fileInput = this.uploadButton?.querySelector("input");
        this.fileInput?.removeEventListener(
          "change",
          this.#boundHandleFileInput,
        );
        this.fileInput?.addEventListener("change", this.#boundHandleFileInput);
      }
      if (this.download) {
        this.downloadButton = this.querySelector("fig-button[type='download']");
        this.downloadButton?.removeEventListener(
          "click",
          this.#boundHandleDownload,
        );
        this.downloadButton?.addEventListener(
          "click",
          this.#boundHandleDownload,
        );
      }
    });
  }
  #handleDownload() {
    //force blob download
    const link = document.createElement("a");
    link.href = this.blob;
    link.download = "image.png";
    link.click();
  }
  async #loadImage(src) {
    // Get blob from canvas
    await new Promise((resolve) => {
      this.image = new Image();
      this.image.crossOrigin = "Anonymous";
      this.image.onload = async () => {
        this.aspectRatio = this.image.width / this.image.height;
        const ar = this.getAttribute("aspect-ratio");
        if (!ar || ar === "auto") {
          this.style.setProperty(
            "--aspect-ratio",
            `${this.image.width}/${this.image.height}`,
          );
        }
        this.dispatchEvent(
          new CustomEvent("loaded", {
            bubbles: true,
            cancelable: true,
            detail: {
              blob: this.blob,
              base64: this.base64,
            },
          }),
        );
        resolve();

        // Create canvas to extract blob and base64 from image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = this.image.width;
        canvas.height = this.image.height;
        ctx.drawImage(this.image, 0, 0);

        // Get base64 from canvas
        this.base64 = canvas.toDataURL();

        // Get blob from canvas
        canvas.toBlob((blob) => {
          if (this.blob) {
            URL.revokeObjectURL(this.blob);
          }
          if (blob) {
            this.blob = URL.createObjectURL(blob);
          }
        });
      };
      this.image.src = src;
    });
  }
  async #handleFileInput(e) {
    if (this.blob) {
      URL.revokeObjectURL(this.blob);
    }
    this.blob = URL.createObjectURL(e.target.files[0]);
    //set base64 url
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    //await this data url to be set
    await new Promise((resolve) => {
      reader.onload = (e) => {
        this.base64 = e.target.result;
        resolve();
      };
    });
    //emit event for loaded
    this.dispatchEvent(
      new CustomEvent("loaded", {
        bubbles: true,
        cancelable: true,
        detail: {
          blob: this.blob,
          base64: this.base64,
        },
      }),
    );
    //emit for change too
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      }),
    );
    this.setAttribute("src", this.blob);
  }
  static get observedAttributes() {
    return ["src", "upload", "download", "aspect-ratio", "fit", "checkerboard"];
  }
  get src() {
    return this.#src;
  }
  set src(value) {
    this.#src = value;
    this.setAttribute("src", value);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "src") {
      this.#src = newValue;
      if (this.chit) {
        const hasCb =
          this.hasAttribute("checkerboard") &&
          this.getAttribute("checkerboard") !== "false";
        if (this.#src) {
          this.chit.setAttribute("background", `url(${this.#src})`);
        } else {
          this.chit.setAttribute(
            "background",
            hasCb ? "url()" : "var(--figma-color-bg-secondary)",
          );
        }
      }
      if (this.#src) {
        this.#loadImage(this.#src);
      }
    }
    if (name === "upload") {
      this.upload = newValue !== null && newValue !== "false";
      this.innerHTML = this.#getInnerHTML();
      this.#updateRefs();
    }
    if (name === "download") {
      this.download = newValue !== null && newValue !== "false";
      this.innerHTML = this.#getInnerHTML();
      this.#updateRefs();
    }
    if (name === "size") {
      this.size = newValue;
    }
    if (name === "aspect-ratio") {
      if (newValue && newValue !== "auto") {
        this.style.setProperty("--aspect-ratio", newValue);
      } else if (!newValue) {
        this.style.removeProperty("--aspect-ratio");
      }
    }
    if (name === "fit") {
      if (newValue) {
        this.style.setProperty("--fit", newValue);
      } else {
        this.style.removeProperty("--fit");
      }
    }
    if (name === "checkerboard") {
      if (this.chit) {
        if (newValue !== null && newValue !== "false") {
          this.chit.setAttribute("checkerboard", "");
        } else {
          this.chit.removeAttribute("checkerboard");
        }
      }
    }
  }
}
customElements.define("fig-image", FigImage);

/**
 * A bezier / spring easing curve editor with draggable control points.
 * @attr {string} value - Bezier: "0.42, 0, 0.58, 1" or Spring: "spring(200, 15, 1)"
 * @attr {number} precision - Decimal places for output values (default 2)
 * @attr {boolean} dropdown - Show a preset dropdown selector
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
    return ["value", "precision", "aspect-ratio"];
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "2");
    this.#syncAspectRatioVar(this.getAttribute("aspect-ratio"));
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

  #syncAspectRatioVar(value) {
    if (value && value.trim()) {
      this.style.setProperty("--aspect-ratio", value.trim());
    } else {
      this.style.removeProperty("--aspect-ratio");
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      this.#syncAspectRatioVar(newValue);
      if (this.#svg) {
        this.#syncViewportSize();
        this.#updatePaths();
      }
      return;
    }

    if (!this.#svg) return;
    if (name === "value" && newValue) {
      const prevMode = this.#mode;
      this.#parseValue(newValue);
      this.#presetName = this.#matchPreset();
      if (prevMode !== this.#mode) {
        this.#render();
      } else {
        this.#updatePaths();
        this.#syncDropdown();
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
      return;
    }
    const parts = str.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length >= 4 && parts.every((n) => !isNaN(n))) {
      this.#mode = "bezier";
      this.#cp1.x = parts[0];
      this.#cp1.y = parts[1];
      this.#cp2.x = parts[2];
      this.#cp2.y = parts[3];
    }
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

  #render() {
    this.classList.toggle("spring-mode", this.#mode === "spring");
    this.classList.toggle("bezier-mode", this.#mode !== "spring");
    this.#syncMetricsFromCSS();
    this.innerHTML = this.#getInnerHTML();
    this.#cacheRefs();
    this.#syncHandleSizes();
    this.#syncViewportSize();
    this.#updatePaths();
    this.#setupEvents();
  }

  #getDropdownHTML() {
    if (this.getAttribute("dropdown") !== "true") return "";
    let optionsHTML = "";
    let currentGroup = undefined;
    for (const p of FigEasingCurve.PRESETS) {
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

    if (this.#mode === "spring") {
      const targetY = 40;
      const startY = 180;
      return `${dropdown}<div class="fig-easing-curve-svg-container"><svg viewBox="0 0 ${size} ${size}" class="fig-easing-curve-svg">
        <rect class="fig-easing-curve-bounds" x="0" y="0" width="${size}" height="${size}"/>
        <line class="fig-easing-curve-target" x1="0" y1="${targetY}" x2="${size}" y2="${targetY}"/>
        <line class="fig-easing-curve-diagonal" x1="0" y1="${startY}" x2="0" y2="${startY}"/>
        <path class="fig-easing-curve-path"/>
        <foreignObject class="fig-easing-curve-handle" data-handle="bounce" width="20" height="20"><fig-handle size="small"></fig-handle></foreignObject>
        <foreignObject class="fig-easing-curve-handle fig-easing-curve-duration-bar" data-handle="duration" width="20" height="20"><fig-handle size="small"></fig-handle></foreignObject>
      </svg></div>`;
    }

    return `${dropdown}<div class="fig-easing-curve-svg-container"><svg viewBox="0 0 ${size} ${size}" class="fig-easing-curve-svg">
      <rect class="fig-easing-curve-bounds" x="0" y="0" width="${size}" height="${size}"/>
      <line class="fig-easing-curve-diagonal" x1="0" y1="${size}" x2="${size}" y2="0"/>
      <line class="fig-easing-curve-arm" data-arm="1"/>
      <line class="fig-easing-curve-arm" data-arm="2"/>
      <path class="fig-easing-curve-path"/>
      <circle class="fig-easing-curve-endpoint" data-endpoint="start" r="${this.#bezierEndpointRadius}"/>
      <circle class="fig-easing-curve-endpoint" data-endpoint="end" r="${this.#bezierEndpointRadius}"/>
      <foreignObject class="fig-easing-curve-handle" data-handle="1" width="20" height="20"><fig-handle size="small"></fig-handle></foreignObject>
      <foreignObject class="fig-easing-curve-handle" data-handle="2" width="20" height="20"><fig-handle size="small"></fig-handle></foreignObject>
    </svg></div>`;
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
    if (this.#mode === "bezier") {
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
    } else {
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
          } else {
            this.#updatePaths();
          }
        } else if (preset.type === "spring") {
          if (preset.spring) {
            this.#spring = { ...preset.spring };
          }
          this.#presetName = name;
          if (this.#mode !== "spring") {
            this.#mode = "spring";
            this.#render();
          } else {
            this.#updatePaths();
          }
        }
        this.#emit("input");
        this.#emit("change");
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
  #fields = [];
  #fieldInputs = {};

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
    this.#syncAspectRatioVar(this.getAttribute("aspect-ratio"));
    this.#syncPerspectiveVar(this.getAttribute("perspective"));
    this.#syncCSSVar(
      "--perspective-origin",
      this.getAttribute("perspective-origin"),
    );
    this.#syncTransformOrigin(this.getAttribute("transform-origin"));
    this.#parseFields(this.getAttribute("fields"));
    const val = this.getAttribute("value");
    if (val) this.#parseValue(val);
    this.#render();
    this.#syncSelected(this.getAttribute("selected"));
    this.#syncDragState();
  }

  disconnectedCallback() {
    this.#isDragging = false;
    if (this.#boundKeyDown) {
      window.removeEventListener("keydown", this.#boundKeyDown);
      window.removeEventListener("keyup", this.#boundKeyUp);
    }
  }

  #syncAspectRatioVar(value) {
    if (value && value.trim()) {
      this.style.setProperty("--aspect-ratio", value.trim());
    } else {
      this.style.removeProperty("--aspect-ratio");
    }
  }

  #syncPerspectiveVar(value) {
    if (value && value.trim()) {
      this.style.setProperty("--perspective", value.trim());
    } else {
      this.style.removeProperty("--perspective");
    }
  }

  #syncCSSVar(prop, value) {
    if (value && value.trim()) {
      this.style.setProperty(prop, value.trim());
    } else {
      this.style.removeProperty(prop);
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
      this.#syncAspectRatioVar(newValue);
      return;
    }
    if (name === "perspective") {
      this.#syncPerspectiveVar(newValue);
      return;
    }
    if (name === "perspective-origin") {
      this.#syncCSSVar("--perspective-origin", newValue);
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
    this.#fieldInputs = {};
    for (const axis of this.#fields) {
      const input = this.querySelector(`fig-input-number[name="${axis}"]`);
      if (input) {
        this.#fieldInputs[axis] = input;
        const handleFieldValue = (e) => {
          e.stopPropagation();
          const val = parseFloat(e.target.value);
          if (isNaN(val)) return;
          if (axis === "rotateX") this.#rx = val;
          else if (axis === "rotateY") this.#ry = val;
          else if (axis === "rotateZ") this.#rz = val;
          this.#updateCube();
          this.#emit(e.type);
        };
        input.addEventListener("input", handleFieldValue);
        input.addEventListener("change", handleFieldValue);
      }
    }
    this.#updateCube();
    this.#setupEvents();
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
    this.#container.addEventListener("pointerdown", (e) => this.#startDrag(e));
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

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "0");
    this.#syncAspectRatioVar(this.getAttribute("aspect-ratio"));
    this.#applyIncomingValue(this.getAttribute("value"));

    this.#render();
    this.#syncDragState();
    this.#syncValueAttribute();
  }

  disconnectedCallback() {
    this.#isDragging = false;
    this.#detachHandleDragListeners();
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
      this.#syncAspectRatioVar(newValue);
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

  #syncAspectRatioVar(value) {
    if (value && value.trim()) {
      this.style.setProperty("--aspect-ratio", value.trim());
    } else {
      this.style.removeProperty("--aspect-ratio");
    }
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

  #setupEvents() {
    if (!this.#grid || !this.#handle) return;

    this.#grid.addEventListener("pointerdown", (e) => {
      const hovered = this.#gridCellFromClient(e.clientX, e.clientY);
      this.#setHoveredCell(hovered);

      if (this.#dragEnabled) {
        this.#startGridDrag(e);
        return;
      }

      const center = this.#cellCenterFromClient(e.clientX, e.clientY);
      this.#setFromPercent(center.x, center.y, "input");
      this.#emit("change");
    });

    this.#grid.addEventListener("pointermove", (e) => {
      if (this.#isDragging) return;
      const hovered = this.#gridCellFromClient(e.clientX, e.clientY);
      this.#setHoveredCell(hovered);
    });

    this.#grid.addEventListener("pointerleave", () => {
      this.#clearHoveredCells();
    });

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
      inputEl.addEventListener("input", handle);
      inputEl.addEventListener("change", handle);
      inputEl.addEventListener("focusout", () => {
        this.#emit("change");
      });
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
 * @attr {string} axis-labels - Space-delimited labels. 1 token: top. 2 tokens: x y. 4 tokens: left right top bottom.
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

  constructor() {
    super();

    this.position = { x: 0.5, y: 0.5 };
    this.isDragging = false;
    this.plane = null;
    this.cursor = null;
    this.xInput = null;
    this.yInput = null;
    this.coordinates = "screen";
    this.#initialized = false;
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

  #initialized = false;

  connectedCallback() {
    // Initialize position
    requestAnimationFrame(() => {
      this.precision = this.getAttribute("precision") || 3;
      this.precision = parseInt(this.precision);
      this.transform = this.getAttribute("transform") || 1;
      this.transform = Number(this.transform);
      this.coordinates = this.getAttribute("coordinates") || "screen";
      this.#syncAspectRatioVar(this.getAttribute("aspect-ratio"));
      if (!this.hasAttribute("value")) {
        this.setAttribute("value", "50% 50%");
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

  #syncAspectRatioVar(value) {
    if (value && value.trim()) {
      this.style.setProperty("--aspect-ratio", value.trim());
    } else {
      this.style.removeProperty("--aspect-ratio");
    }
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
    const tokens = raw.split(/\s+/).filter(Boolean);
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
          <div class="fig-input-joystick-plane-container" tabindex="0">
            ${labelsMarkup}
            <div class="fig-input-joystick-plane">
              <div class="fig-input-joystick-guides"></div>
              <fig-handle drag drag-surface=".fig-input-joystick-plane" drag-axes="x,y" drag-snapping="modifier"></fig-handle>
            </div>
            <fig-tooltip text="Reset">
              <fig-button variant="ghost" icon="true" class="fig-joystick-reset" aria-label="Reset to default">
                <span class="fig-mask-icon" style="--icon: var(--icon-reset)"></span>
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
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
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
    const container = this.querySelector(".fig-input-joystick-plane-container");
    container?.focus();
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
      this.#syncAspectRatioVar(newValue);
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

/**
 * A custom angle chooser input element.
 * @attr {number} value - The current angle of the handle in degrees.
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {boolean} text - Whether to display a text input for the angle value.
 * @attr {boolean} dial - Whether to display the circular dial control. Defaults to true.
 * @attr {number} adjacent - The adjacent value of the angle.
 * @attr {number} opposite - The opposite value of the angle.
 * @attr {boolean} rotations - Whether to display a rotation count (×N) when rotations > 1. Defaults to false.
 */
class FigInputAngle extends HTMLElement {
  // Private fields
  #adjacent;
  #opposite;
  #prevRawAngle = null;
  #boundHandleRawChange;

  constructor() {
    super();

    this.angle = 0;
    this.#adjacent = 1;
    this.#opposite = 0;
    this.isDragging = false;
    this.isShiftHeld = false;
    this.handle = null;
    this.angleInput = null;
    this.plane = null;
    this.units = "°";
    this.min = null;
    this.max = null;
    this.dial = true;
    this.showRotations = false;
    this.rotationSpan = null;

    this.#boundHandleRawChange = this.#handleRawChange.bind(this);
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      this.precision = this.getAttribute("precision") || 1;
      this.precision = parseInt(this.precision);
      this.text = this.getAttribute("text") === "true";

      let rawUnits = this.getAttribute("units") || "°";
      if (rawUnits === "deg") rawUnits = "°";
      this.units = rawUnits;

      this.min = this.hasAttribute("min")
        ? Number(this.getAttribute("min"))
        : null;
      this.max = this.hasAttribute("max")
        ? Number(this.getAttribute("max"))
        : null;
      this.dial = this.#readBooleanAttribute("dial", true);
      this.showRotations = this.#readRotationsEnabled();

      this.#render();
      this.#setupListeners();

      this.#syncHandlePosition();
      if (this.text && this.angleInput) {
        this.angleInput.setAttribute(
          "value",
          this.angle.toFixed(this.precision),
        );
      }
    });
  }

  disconnectedCallback() {
    this.#cleanupListeners();
  }

  #render() {
    this.innerHTML = this.#getInnerHTML();
  }

  #readBooleanAttribute(name, defaultValue = false) {
    const value = this.getAttribute(name);
    if (value === null) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "true") return true;
    if (normalized === "false") return false;
    return true;
  }

  #readRotationsEnabled() {
    if (this.hasAttribute("rotations")) {
      return this.#readBooleanAttribute("rotations", false);
    }
    // Backward-compat alias
    if (this.hasAttribute("show-rotations")) {
      return this.#readBooleanAttribute("show-rotations", false);
    }
    return false;
  }

  #getInnerHTML() {
    const step = this.#getStepForUnit();
    const minAttr = this.min !== null ? `min="${this.min}"` : "";
    const maxAttr = this.max !== null ? `max="${this.max}"` : "";
    return `
        ${
          this.dial
            ? `<div class="fig-input-angle-plane" tabindex="0">
          <div class="fig-input-angle-handle"></div>
        </div>`
            : ""
        }
        ${
          this.text
            ? `<fig-input-number
                name="angle"
                step="${step}"
                value="${this.angle}"
                ${minAttr}
                ${maxAttr}
                units="${this.units}">
                ${this.showRotations ? `<span slot="append" class="fig-input-angle-rotations"></span>` : ""}
              </fig-input-number>`
            : ""
        }
    `;
  }

  #getRotationCount() {
    const degrees = Math.abs(this.#toDegrees(this.angle));
    return Math.floor(degrees / 360);
  }

  #updateRotationDisplay() {
    if (!this.rotationSpan) return;
    const rotations = this.#getRotationCount();
    if (rotations > 1) {
      this.rotationSpan.textContent = `\u00d7${rotations}`;
      this.rotationSpan.style.display = "";
    } else {
      this.rotationSpan.textContent = "";
      this.rotationSpan.style.display = "none";
    }
  }

  #getStepForUnit() {
    switch (this.units) {
      case "rad":
        return 0.01;
      case "turn":
        return 0.001;
      default:
        return 0.1;
    }
  }

  // --- Unit conversion helpers ---

  #toDegrees(value) {
    switch (this.units) {
      case "rad":
        return (value * 180) / Math.PI;
      case "turn":
        return value * 360;
      default:
        return value;
    }
  }

  #fromDegrees(degrees) {
    switch (this.units) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  #convertAngle(value, fromUnit, toUnit) {
    // Convert to degrees first
    let degrees;
    switch (fromUnit) {
      case "rad":
        degrees = (value * 180) / Math.PI;
        break;
      case "turn":
        degrees = value * 360;
        break;
      default:
        degrees = value;
    }
    // Convert from degrees to target
    switch (toUnit) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  // --- Event listeners ---

  #setupListeners() {
    this.handle = this.querySelector(".fig-input-angle-handle");
    this.plane = this.querySelector(".fig-input-angle-plane");
    this.angleInput = this.querySelector("fig-input-number[name='angle']");
    this.rotationSpan = this.querySelector(".fig-input-angle-rotations");
    this.#updateRotationDisplay();
    this.plane?.addEventListener("mousedown", this.#handleMouseDown.bind(this));
    this.plane?.addEventListener(
      "touchstart",
      this.#handleTouchStart.bind(this),
    );
    window.addEventListener("keydown", this.#handleKeyDown.bind(this));
    window.addEventListener("keyup", this.#handleKeyUp.bind(this));
    if (this.text && this.angleInput) {
      this.angleInput.addEventListener(
        "input",
        this.#handleAngleInput.bind(this),
      );
    }
    // Capture-phase listener for unit suffix parsing
    this.addEventListener("change", this.#boundHandleRawChange, true);
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("mousedown", this.#handleMouseDown);
    this.plane?.removeEventListener("touchstart", this.#handleTouchStart);
    window.removeEventListener("keydown", this.#handleKeyDown);
    window.removeEventListener("keyup", this.#handleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#handleAngleInput);
    }
    this.removeEventListener("change", this.#boundHandleRawChange, true);
  }

  #handleRawChange(e) {
    // Only intercept native change events from the raw <input> element
    if (!e.target?.matches?.("input")) return;
    const raw = e.target.value;
    const match = raw.match(/^(-?\d*\.?\d+)\s*(turn|rad|deg|°)$/i);
    if (match) {
      const num = parseFloat(match[1]);
      let fromUnit = match[2].toLowerCase();
      if (fromUnit === "deg") fromUnit = "°";
      if (fromUnit !== this.units) {
        const converted = this.#convertAngle(num, fromUnit, this.units);
        e.target.value = String(converted);
      }
    }
  }

  #handleAngleInput(e) {
    e.stopPropagation();
    this.angle = Number(e.target.value);
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
    this.#updateRotationDisplay();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  // --- Angle calculation ---

  #calculateAdjacentAndOpposite() {
    const degrees = this.#toDegrees(this.angle);
    const radians = (degrees * Math.PI) / 180;
    this.#adjacent = Math.cos(radians);
    this.#opposite = Math.sin(radians);
  }

  #snapToIncrement(angle) {
    if (!this.isShiftHeld) return angle;
    const increment = 45;
    return Math.round(angle / increment) * increment;
  }

  #getRawAngle(e) {
    const rect = this.plane.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  }

  #updateAngle(e) {
    let rawAngle = this.#getRawAngle(e);
    // Normalize to 0-360 for snap and positioning
    let normalizedAngle = ((rawAngle % 360) + 360) % 360;
    normalizedAngle = this.#snapToIncrement(normalizedAngle);

    const isBounded = this.min !== null || this.max !== null;

    if (isBounded) {
      // Bounded: absolute position
      this.angle = this.#fromDegrees(normalizedAngle);
    } else {
      // Unbounded: cumulative winding
      if (this.#prevRawAngle === null) {
        // First event of this drag — snap to clicked position, preserving revolution
        this.#prevRawAngle = normalizedAngle;
        const currentDeg = this.#toDegrees(this.angle);
        const currentMod = ((currentDeg % 360) + 360) % 360;
        let delta = normalizedAngle - currentMod;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle += this.#fromDegrees(delta);
      } else {
        // Subsequent events — accumulate delta
        let delta = normalizedAngle - this.#prevRawAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle += this.#fromDegrees(delta);
        this.#prevRawAngle = normalizedAngle;
      }
    }

    this.#calculateAdjacentAndOpposite();

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();

    this.#emitInputEvent();
  }

  // --- Event dispatching ---

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  // --- Handle position ---

  #syncHandlePosition() {
    if (this.handle) {
      const degrees = this.#toDegrees(this.angle);
      const radians = (degrees * Math.PI) / 180;
      const radius = this.plane.offsetWidth / 2 - this.handle.offsetWidth / 2;
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      this.handle.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  // --- Mouse/Touch handlers ---

  #handleMouseDown(e) {
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      this.#emitChangeEvent();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  #handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const handleTouchEnd = () => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      this.#emitChangeEvent();
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }

  // --- Keyboard handlers ---

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }

  focus() {
    this.plane?.focus();
  }

  // --- Attributes ---

  static get observedAttributes() {
    return [
      "value",
      "precision",
      "text",
      "min",
      "max",
      "units",
      "dial",
      "rotations",
      "show-rotations",
    ];
  }

  get value() {
    return this.angle;
  }

  get adjacent() {
    return this.#adjacent;
  }

  get opposite() {
    return this.#opposite;
  }

  set value(value) {
    if (isNaN(value)) {
      console.error("Invalid value: must be a number.");
      return;
    }
    this.angle = value;
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
    if (this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (this.isDragging) break;
        this.value = Number(newValue);
        break;
      case "precision":
        this.precision = parseInt(newValue);
        break;
      case "text":
        if (newValue !== oldValue) {
          this.text = newValue?.toLowerCase() === "true";
          if (this.isConnected) {
            this.#render();
            this.#setupListeners();
            this.#syncHandlePosition();
          }
        }
        break;
      case "dial":
        this.dial = this.#readBooleanAttribute("dial", true);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "units": {
        let units = newValue || "°";
        if (units === "deg") units = "°";
        this.units = units;
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      }
      case "min":
        this.min = newValue !== null ? Number(newValue) : null;
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "max":
        this.max = newValue !== null ? Number(newValue) : null;
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "rotations":
      case "show-rotations":
        this.showRotations = this.#readRotationsEnabled();
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
    }
  }
}
customElements.define("fig-input-angle", FigInputAngle);

// FigShimmer
class FigShimmer extends HTMLElement {
  connectedCallback() {
    const duration = this.getAttribute("duration");
    if (duration) {
      this.style.setProperty("--shimmer-duration", duration);
    }
  }

  static get observedAttributes() {
    return ["duration", "playing"];
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
      this.style.setProperty("--shimmer-duration", newValue || "1.5s");
    }
    // playing is handled purely by CSS attribute selectors
  }
}
customElements.define("fig-shimmer", FigShimmer);

// FigSkeleton
class FigSkeleton extends FigShimmer {}
customElements.define("fig-skeleton", FigSkeleton);

// FigLayer
class FigLayer extends HTMLElement {
  static get observedAttributes() {
    return ["open", "visible"];
  }

  #chevron = null;
  #boundHandleChevronClick = null;

  connectedCallback() {
    // Use requestAnimationFrame to ensure child elements have rendered
    requestAnimationFrame(() => {
      this.#injectChevron();
    });
  }

  disconnectedCallback() {
    if (this.#chevron && this.#boundHandleChevronClick) {
      this.#chevron.removeEventListener("click", this.#boundHandleChevronClick);
    }
  }

  #injectChevron() {
    const row = this.querySelector(":scope > .fig-layer-row");
    if (!row) return;

    // Check if chevron already exists
    if (row.querySelector(".fig-layer-chevron")) return;

    // Always create chevron element - CSS handles visibility via :has(fig-layer)
    this.#chevron = document.createElement("span");
    this.#chevron.className = "fig-layer-chevron";
    row.prepend(this.#chevron);

    // Add click listener to chevron only
    this.#boundHandleChevronClick = this.#handleChevronClick.bind(this);
    this.#chevron.addEventListener("click", this.#boundHandleChevronClick);
  }

  #handleChevronClick(e) {
    e.stopPropagation();
    this.open = !this.open;
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    const oldValue = this.open;
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
    if (oldValue !== value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: value },
          bubbles: true,
        }),
      );
    }
  }

  get visible() {
    const attr = this.getAttribute("visible");
    return attr !== "false";
  }

  set visible(value) {
    const oldValue = this.visible;
    if (value) {
      this.setAttribute("visible", "true");
    } else {
      this.setAttribute("visible", "false");
    }
    if (oldValue !== value) {
      this.dispatchEvent(
        new CustomEvent("visibilitychange", {
          detail: { visible: value },
          bubbles: true,
        }),
      );
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "open") {
      const isOpen = newValue !== null && newValue !== "false";
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: isOpen },
          bubbles: true,
        }),
      );
    }

    if (name === "visible") {
      const isVisible = newValue !== "false";
      this.dispatchEvent(
        new CustomEvent("visibilitychange", {
          detail: { visible: isVisible },
          bubbles: true,
        }),
      );
    }
  }
}
customElements.define("fig-layer", FigLayer);

// FigFillPicker
/**
 * A comprehensive fill picker component supporting solid colors, gradients, images, video, and webcam.
 * Uses display: contents and wraps a trigger element that opens a dialog picker.
 *
 * @attr {string} value - JSON-encoded fill value
 * @attr {boolean} disabled - Whether the picker is disabled
 * @attr {boolean} alpha - Whether to show alpha/opacity controls (default: true)
 * @attr {string} dialog-position - Position of the popup (default: "left")
 */
class FigFillPicker extends HTMLElement {
  #trigger = null;
  #chit = null;
  #dialog = null;
  #activeTab = "solid";
  anchorElement = null;

  // Fill state
  #fillType = "solid";
  #gamut = "srgb"; // "srgb" or "display-p3"
  #color = { h: 0, s: 0, v: 85, a: 1 }; // Default gray #D9D9D9
  #colorInputMode = "hex";
  #gradient = {
    type: "linear",
    angle: 0,
    centerX: 50,
    centerY: 50,
    interpolationSpace: "oklab",
    hueInterpolation: "shorter",
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };
  #image = { url: null, scaleMode: "fill", scale: 50 };
  #video = { url: null, scaleMode: "fill", scale: 50 };
  #webcam = { stream: null, snapshot: null };

  // Custom mode slots and data
  #customSlots = {};
  #customData = {};

  // DOM references for solid tab
  #colorArea = null;
  #colorAreaHandle = null;
  #hueSlider = null;
  #opacitySlider = null;
  #isDraggingColor = false;
  #teardownColorAreaEvents = null;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "disabled", "alpha", "mode", "experimental"];
  }

  connectedCallback() {
    // Use display: contents
    this.style.display = "contents";

    requestAnimationFrame(() => {
      this.#setupTrigger();
      this.#parseValue();
      this.#updateChit();
    });
  }

  disconnectedCallback() {
    if (this.#teardownColorAreaEvents) {
      this.#teardownColorAreaEvents();
      this.#teardownColorAreaEvents = null;
    }
    if (this.#chit) this.#chit.removeAttribute("selected");
    if (this.#dialog) {
      this.#dialog.close();
      this.#dialog.remove();
    }
  }

  #setupTrigger() {
    const child = Array.from(this.children).find(
      (el) => !el.getAttribute("slot")?.startsWith("mode-"),
    );

    if (!child) {
      // Scenario 1: Empty - create fig-chit
      this.#chit = document.createElement("fig-chit");
      this.#chit.setAttribute("background", "#D9D9D9");
      this.appendChild(this.#chit);
      this.#trigger = this.#chit;
    } else if (child.tagName === "FIG-CHIT") {
      // Scenario 2: Has fig-chit - use and populate it
      this.#chit = child;
      this.#trigger = child;
    } else {
      // Scenario 3: Other element - trigger only, no populate
      this.#trigger = child;
      this.#chit = null;
    }

    this.#trigger.addEventListener("click", (e) => {
      if (this.hasAttribute("disabled")) return;
      e.stopPropagation();
      e.preventDefault();
      this.#openDialog();
    });

    // Prevent fig-chit's internal color input from opening system picker
    if (this.#chit) {
      requestAnimationFrame(() => {
        const input = this.#chit.querySelector('input[type="color"]');
        if (input) {
          input.style.pointerEvents = "none";
        }
      });
    }
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;

    const builtinTypes = ["solid", "gradient", "image", "video", "webcam"];

    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed.type) this.#fillType = parsed.type;
      if (parsed.color) {
        // Handle both hex string and HSV object
        if (typeof parsed.color === "string") {
          this.#color = this.#hexToHSV(parsed.color);
        } else if (
          typeof parsed.color === "object" &&
          parsed.color.h !== undefined
        ) {
          this.#color = parsed.color;
        }
      }
      // Parse opacity (0-100) and convert to alpha (0-1)
      if (parsed.opacity !== undefined) {
        this.#color.a = parsed.opacity / 100;
      }
      if (parsed.colorSpace === "display-p3" || parsed.colorSpace === "srgb") {
        this.#gamut = parsed.colorSpace;
      }
      if (parsed.gradient) {
        this.#gradient = normalizeGradientConfig({
          ...this.#gradient,
          ...parsed.gradient,
        });
      }
      if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
      if (parsed.video) this.#video = { ...this.#video, ...parsed.video };

      // Store full parsed data for custom (non-built-in) types
      if (parsed.type && !builtinTypes.includes(parsed.type)) {
        const { type, ...rest } = parsed;
        this.#customData[parsed.type] = rest;
      }
    } catch (e) {
      // If not JSON, treat as hex color
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#color = this.#hexToHSV(valueAttr);
      }
    }
  }

  #updateChit() {
    if (!this.#chit) return;

    let bg;
    let bgSize = "cover";
    let bgPosition = "center";

    switch (this.#fillType) {
      case "solid":
        bg = this.#hsvToHex(this.#color);
        break;
      case "gradient":
        bg = this.#getGradientCSS();
        break;
      case "image":
        if (this.#image.url) {
          bg = `url(${this.#image.url})`;
          const sizing = this.#getBackgroundSizing(
            this.#image.scaleMode,
            this.#image.scale,
          );
          bgSize = sizing.size;
          bgPosition = sizing.position;
        } else {
          bg = "";
        }
        break;
      case "video":
        if (this.#video.url) {
          bg = `url(${this.#video.url})`;
          const sizing = this.#getBackgroundSizing(
            this.#video.scaleMode,
            this.#video.scale,
          );
          bgSize = sizing.size;
          bgPosition = sizing.position;
        } else {
          bg = "";
        }
        break;
      default:
        const slot = this.#customSlots[this.#fillType];
        bg = slot?.element?.getAttribute("chit-background") || "#D9D9D9";
    }

    this.#chit.setAttribute("background", bg);
    this.#chit.style.setProperty("--chit-bg-size", bgSize);
    this.#chit.style.setProperty("--chit-bg-position", bgPosition);

    // For solid colors, also update the alpha
    if (this.#fillType === "solid") {
      this.#chit.setAttribute("alpha", this.#color.a);
    } else {
      this.#chit.removeAttribute("alpha");
    }
  }

  #getBackgroundSizing(scaleMode, scale) {
    switch (scaleMode) {
      case "fill":
        return { size: "cover", position: "center" };
      case "fit":
        return { size: "contain", position: "center" };
      case "crop":
        return { size: "cover", position: "center" };
      case "tile":
        return { size: `${scale}%`, position: "top left" };
      default:
        return { size: "cover", position: "center" };
    }
  }

  #openDialog() {
    if (!this.#dialog) {
      this.#createDialog();
    }

    this.#switchTab(this.#fillType);

    const gamutEl = this.#dialog.querySelector(".fig-fill-picker-gamut");
    if (gamutEl) gamutEl.value = this.#gamut;

    if (this.#chit) this.#chit.setAttribute("selected", "true");

    this.#dialog.open = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.#drawColorArea();
        this.#updateHandlePosition();
      });
    });
  }

  #createDialog() {
    // Collect slotted custom mode content before any DOM changes
    this.#customSlots = {};
    this.querySelectorAll('[slot^="mode-"]').forEach((el) => {
      const modeName = el.getAttribute("slot").slice(5);
      this.#customSlots[modeName] = {
        element: el,
        label:
          el.getAttribute("label") ||
          modeName.charAt(0).toUpperCase() + modeName.slice(1),
      };
    });

    this.#dialog = document.createElement("dialog", { is: "fig-popup" });
    this.#dialog.setAttribute("is", "fig-popup");
    this.#dialog.setAttribute("drag", "true");
    this.#dialog.setAttribute("handle", "fig-header");
    this.#dialog.setAttribute("autoresize", "false");
    this.#dialog.classList.add("fig-fill-picker-dialog");

    this.#dialog.anchor = this.anchorElement || this.#trigger;
    const dialogPosition = this.getAttribute("dialog-position") || "left";
    this.#dialog.setAttribute("position", dialogPosition);

    const builtinModes = ["solid", "gradient", "image", "video", "webcam"];
    const builtinLabels = {
      solid: "Solid",
      gradient: "Gradient",
      image: "Image",
      video: "Video",
      webcam: "Webcam",
    };

    // Build allowed modes: built-ins filtered normally, custom names accepted if slot exists
    const mode = this.getAttribute("mode");
    let allowedModes;
    if (mode) {
      const requested = mode.split(",").map((m) => m.trim().toLowerCase());
      allowedModes = requested.filter(
        (m) => builtinModes.includes(m) || this.#customSlots[m],
      );
      if (allowedModes.length === 0) allowedModes = [...builtinModes];
    } else {
      allowedModes = [...builtinModes];
    }

    // Build labels map: built-in labels + custom slot labels
    const modeLabels = { ...builtinLabels };
    for (const [name, { label }] of Object.entries(this.#customSlots)) {
      modeLabels[name] = label;
    }

    if (!allowedModes.includes(this.#fillType)) {
      this.#fillType = allowedModes[0];
      this.#activeTab = allowedModes[0];
    }

    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    let headerContent;
    if (allowedModes.length === 1) {
      headerContent = `<h3 class="fig-fill-picker-type-label">${modeLabels[allowedModes[0]]}</h3>`;
    } else {
      const options = allowedModes
        .map((m) => `<option value="${m}">${modeLabels[m]}</option>`)
        .join("\n          ");
      headerContent = `<fig-dropdown class="fig-fill-picker-type" ${expAttr} value="${this.#fillType}">
          ${options}
        </fig-dropdown>`;
    }

    // Generate tab containers for all allowed modes
    const tabDivs = allowedModes
      .map((m) => `<div class="fig-fill-picker-tab" data-tab="${m}"></div>`)
      .join("\n        ");

    const gamutDropdown = `<fig-dropdown class="fig-fill-picker-gamut" ${expAttr} value="${this.#gamut}">
          <option value="srgb">sRGB</option>
          <option value="display-p3">Display P3</option>
        </fig-dropdown>`;

    this.#dialog.innerHTML = `
      <fig-header>
        ${headerContent}
        ${gamutDropdown}
        <fig-button icon variant="ghost" class="fig-fill-picker-close">
          <span class="fig-mask-icon" style="--icon: var(--icon-close)"></span>
        </fig-button>
      </fig-header>
      <fig-content>
        ${tabDivs}
      </fig-content>
    `;

    document.body.appendChild(this.#dialog);

    // Populate custom tab containers and emit modeready
    for (const [modeName, { element }] of Object.entries(this.#customSlots)) {
      const container = this.#dialog.querySelector(`[data-tab="${modeName}"]`);
      if (!container) continue;

      // Move children (not the element itself) for vanilla HTML usage
      while (element.firstChild) {
        container.appendChild(element.firstChild);
      }

      // Emit modeready so frameworks can render into the container
      this.dispatchEvent(
        new CustomEvent("modeready", {
          bubbles: true,
          detail: { mode: modeName, container },
        }),
      );
    }

    // Setup type dropdown switching (only if not locked)
    const typeDropdown = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeDropdown) {
      typeDropdown.addEventListener("change", (e) => {
        this.#switchTab(e.target.value);
      });
    }

    // Setup gamut dropdown
    const gamutEl = this.#dialog.querySelector(".fig-fill-picker-gamut");
    if (gamutEl) {
      const handleGamutChange = (e) => {
        const val = e.currentTarget?.value ?? e.target?.value ?? e.detail;
        if (val && val !== this.#gamut) {
          this.#gamut = val;
          this.#onGamutChange();
        }
      };
      gamutEl.addEventListener("input", handleGamutChange);
      gamutEl.addEventListener("change", handleGamutChange);
    }

    this.#dialog
      .querySelector(".fig-fill-picker-close")
      .addEventListener("click", () => {
        this.#dialog.open = false;
      });

    const onDialogClose = () => {
      if (this.#chit) this.#chit.removeAttribute("selected");
      this.#emitChange();
    };
    this.#dialog.addEventListener("close", onDialogClose);

    const observer = new MutationObserver(() => {
      const isOpen = this.#dialog.hasAttribute("open") && this.#dialog.getAttribute("open") !== "false";
      if (!isOpen) onDialogClose();
    });
    observer.observe(this.#dialog, { attributes: true, attributeFilter: ["open"] });

    // Initialize built-in tabs (skip any overridden by custom slots)
    const builtinInits = {
      solid: () => this.#initSolidTab(),
      gradient: () => this.#initGradientTab(),
      image: () => this.#initImageTab(),
      video: () => this.#initVideoTab(),
      webcam: () => this.#initWebcamTab(),
    };
    for (const [name, init] of Object.entries(builtinInits)) {
      if (!this.#customSlots[name] && allowedModes.includes(name)) init();
    }

    // Listen for input/change from custom tab content
    for (const modeName of Object.keys(this.#customSlots)) {
      if (builtinModes.includes(modeName)) continue;
      const container = this.#dialog.querySelector(`[data-tab="${modeName}"]`);
      if (!container) continue;
      container.addEventListener("input", (e) => {
        if (e.target === this) return;
        e.stopPropagation();
        if (e.detail) this.#customData[modeName] = e.detail;
        this.#emitInput();
      });
      container.addEventListener("change", (e) => {
        if (e.target === this) return;
        e.stopPropagation();
        if (e.detail) this.#customData[modeName] = e.detail;
        this.#emitChange();
      });
    }
  }

  #switchTab(tabName) {
    // Only allow switching to modes that have a tab container in the dialog
    const tab = this.#dialog?.querySelector(
      `.fig-fill-picker-tab[data-tab="${tabName}"]`,
    );
    if (!tab) return;

    this.#activeTab = tabName;
    this.#fillType = tabName;

    // Update dropdown selection (only exists if not locked)
    const typeDropdown = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeDropdown && typeDropdown.value !== tabName) {
      typeDropdown.value = tabName;
    }

    // Show/hide tab content
    const tabContents = this.#dialog.querySelectorAll(".fig-fill-picker-tab");
    tabContents.forEach((content) => {
      if (content.dataset.tab === tabName) {
        content.style.display = "block";
      } else {
        content.style.display = "none";
      }
    });

    // Zero out content padding for custom mode tabs
    const contentEl = this.#dialog.querySelector("fig-content");
    if (contentEl) {
      contentEl.style.padding = this.#customSlots[tabName] ? "0" : "";
    }

    // Update tab-specific UI after visibility change
    if (tabName === "gradient") {
      // Use RAF to ensure layout is complete before updating angle input
      requestAnimationFrame(() => {
        this.#updateGradientUI();
      });
    }

    this.#updateChit();
    this.#emitInput();
  }

  // ============ SOLID TAB ============
  #initSolidTab() {
    const container = this.#dialog.querySelector('[data-tab="solid"]');
    const showAlpha = this.getAttribute("alpha") !== "false";
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";
    const savedMode = localStorage.getItem("figui-color-input-mode");
    if (
      savedMode &&
      ["hex", "rgb", "hsl", "hsb", "lab", "lch"].includes(savedMode)
    ) {
      this.#colorInputMode = savedMode;
    }

    container.innerHTML = `
      <fig-preview class="fig-fill-picker-color-area">
        <canvas width="200" height="200"></canvas>
        <fig-handle
          drag
          drag-surface=".fig-fill-picker-color-area"
          drag-axes="x,y"
          drag-snapping="modifier"
        ></fig-handle>
      </fig-preview>
      <div class="fig-fill-picker-sliders">
        <fig-tooltip text="Sample color"><fig-button icon variant="ghost" class="fig-fill-picker-eyedropper"><span class="fig-mask-icon" style="--icon: var(--icon-eyedropper)"></span></fig-button></fig-tooltip>
        <fig-slider type="hue" variant="neue" min="0" max="360" value="${
          this.#color.h
        }"></fig-slider>
        ${
          showAlpha
            ? `<fig-slider type="opacity" variant="neue" text="true" units="%" min="0" max="100" value="${
                this.#color.a * 100
              }" color="${this.#hsvToHex(this.#color)}"></fig-slider>`
            : ""
        }
      </div>
      <fig-field class="fig-fill-picker-inputs" direction="horizontal">
        <fig-dropdown class="fig-fill-picker-input-mode" ${expAttr} value="${this.#colorInputMode}">
          <option value="hex">Hex</option>
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
          <option value="hsb">HSB</option>
          <option value="lab">LAB</option>
          <option value="lch">LCH</option>
        </fig-dropdown>
        <span class="fig-fill-picker-input-fields"></span>
      </fig-field>
    `;

    // Setup color area
    this.#colorArea = container.querySelector("canvas");
    this.#colorAreaHandle = container.querySelector("fig-handle");
    this.#drawColorArea();
    this.#updateHandlePosition();
    this.#setupColorAreaEvents();

    // Setup hue slider
    this.#hueSlider = container.querySelector('fig-slider[type="hue"]');
    this.#hueSlider.addEventListener("input", (e) => {
      this.#color.h = parseFloat(e.target.value);
      this.#drawColorArea();
      this.#updateHandlePosition();
      this.#updateColorInputs();
      this.#emitInput();
    });
    this.#hueSlider.addEventListener("change", () => {
      this.#emitChange();
    });

    // Setup opacity slider
    if (showAlpha) {
      this.#opacitySlider = container.querySelector(
        'fig-slider[type="opacity"]',
      );
      this.#opacitySlider.addEventListener("input", (e) => {
        this.#color.a = parseFloat(e.target.value) / 100;
        this.#updateColorInputs();
        this.#emitInput();
      });
      this.#opacitySlider.addEventListener("change", () => {
        this.#emitChange();
      });
    }

    // Setup color input mode dropdown
    const modeDropdown = container.querySelector(".fig-fill-picker-input-mode");
    modeDropdown.addEventListener("input", (e) => {
      this.#colorInputMode = e.target.value;
      localStorage.setItem("figui-color-input-mode", this.#colorInputMode);
      this.#rebuildColorInputFields();
    });

    // Build initial color input fields
    this.#rebuildColorInputFields();

    // Setup eyedropper
    const eyedropper = container.querySelector(".fig-fill-picker-eyedropper");
    if ("EyeDropper" in window) {
      eyedropper.addEventListener("click", async () => {
        try {
          const dropper = new EyeDropper();
          const result = await dropper.open();
          this.#color = { ...this.#hexToHSV(result.sRGBHex), a: this.#color.a };
          this.#drawColorArea();
          this.#updateHandlePosition();
          this.#updateColorInputs();
          this.#emitInput();
        } catch (e) {
          // User cancelled or error
        }
      });
    } else {
      eyedropper.setAttribute("disabled", "");
      eyedropper.title = "EyeDropper not supported in this browser";
    }
  }

  #onGamutChange() {
    // Recreate the solid canvas with the new color space
    const solidContainer = this.#dialog?.querySelector('[data-tab="solid"]');
    if (solidContainer) {
      const oldCanvas = solidContainer.querySelector("canvas");
      if (oldCanvas) {
        const newCanvas = document.createElement("canvas");
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        oldCanvas.replaceWith(newCanvas);
        this.#colorArea = newCanvas;
        this.#setupColorAreaEvents();
      }
      this.#drawColorArea();
      this.#updateHandlePosition();
    }
    // Refresh gradient preview if gradient tab exists
    this.#updateGradientPreview();
    this.#emitInput();
  }

  #drawColorArea() {
    // Refresh canvas reference in case DOM changed
    if (!this.#colorArea && this.#dialog) {
      this.#colorArea = this.#dialog.querySelector('[data-tab="solid"] canvas');
    }
    if (!this.#colorArea) return;

    const colorSpace = this.#gamut === "display-p3" ? "display-p3" : "srgb";
    const ctx = this.#colorArea.getContext("2d", { colorSpace });
    if (!ctx) return;

    const width = this.#colorArea.width;
    const height = this.#colorArea.height;

    ctx.clearRect(0, 0, width, height);

    const hue = this.#color.h;
    const isP3 = this.#gamut === "display-p3";

    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    if (isP3) {
      gradH.addColorStop(0, "color(display-p3 1 1 1)");
      const [r, g, b] = hslToP3(hue, 100, 50);
      gradH.addColorStop(1, `color(display-p3 ${r} ${g} ${b})`);
    } else {
      gradH.addColorStop(0, "#FFFFFF");
      gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    }

    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "rgba(0,0,0,1)");

    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }

  #updateHandlePosition(retryCount = 0) {
    if (!this.#colorAreaHandle || !this.#colorArea) return;

    const rect = this.#colorArea.getBoundingClientRect();

    // If the canvas isn't visible yet (0 dimensions), schedule a retry (max 5 attempts)
    if ((rect.width === 0 || rect.height === 0) && retryCount < 5) {
      requestAnimationFrame(() => this.#updateHandlePosition(retryCount + 1));
      return;
    }

    const xPct = Math.max(0, Math.min(100, this.#color.s));
    const yPct = Math.max(0, Math.min(100, 100 - this.#color.v));

    this.#colorAreaHandle.setAttribute("value", `${xPct}% ${yPct}%`);
    this.#colorAreaHandle.setAttribute(
      "color",
      this.#hsvToHex({ ...this.#color, a: 1 }),
    );
  }

  #updateColorFromAreaPosition(x, y, opts = {}) {
    const { updateHandle = true, emitInput = true, emitChange = false } = opts;
    this.#color.s = Math.max(0, Math.min(100, x * 100));
    this.#color.v = Math.max(0, Math.min(100, (1 - y) * 100));
    if (this.#colorAreaHandle) {
      this.#colorAreaHandle.setAttribute(
        "color",
        this.#hsvToHex({ ...this.#color, a: 1 }),
      );
    }
    if (updateHandle) this.#updateHandlePosition();
    this.#updateColorInputs();
    if (emitInput) this.#emitInput();
    if (emitChange) this.#emitChange();
  }

  #setupColorAreaEvents() {
    if (this.#teardownColorAreaEvents) {
      this.#teardownColorAreaEvents();
      this.#teardownColorAreaEvents = null;
    }
    if (!this.#colorArea || !this.#colorAreaHandle) return;

    const colorAreaEl = this.#colorArea.parentElement || this.#colorArea;
    const colorAreaHandleEl = this.#colorAreaHandle;

    let isPlaneDragging = false;

    const updatePlaneFromEvent = (e, opts = {}) => {
      const rect = colorAreaEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      this.#updateColorFromAreaPosition(x / rect.width, y / rect.height, opts);
    };

    const onPlanePointerDown = (e) => {
      if (e.button !== 0) return;
      if (
        e.target === colorAreaHandleEl ||
        colorAreaHandleEl.contains(e.target)
      )
        return;
      isPlaneDragging = true;
      this.#isDraggingColor = true;
      colorAreaEl.setPointerCapture(e.pointerId);
      updatePlaneFromEvent(e, { updateHandle: true, emitInput: true });
    };

    const onPlanePointerMove = (e) => {
      if (!isPlaneDragging) return;
      if (e.buttons === 0) {
        onPlaneDragEnd();
        return;
      }
      updatePlaneFromEvent(e, { updateHandle: true, emitInput: true });
    };

    const onPlaneDragEnd = () => {
      if (!isPlaneDragging) return;
      isPlaneDragging = false;
      this.#isDraggingColor = false;
      this.#emitChange();
    };

    const onHandleInput = (e) => {
      this.#isDraggingColor = true;
      const px = e.detail?.px;
      const py = e.detail?.py;
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      colorAreaHandleEl.setAttribute("value", `${px * 100}% ${py * 100}%`);
      this.#updateColorFromAreaPosition(px, py, {
        updateHandle: false,
        emitInput: true,
      });
    };

    const onHandleChange = (e) => {
      const px = e.detail?.px;
      const py = e.detail?.py;
      if (Number.isFinite(px) && Number.isFinite(py)) {
        colorAreaHandleEl.setAttribute("value", `${px * 100}% ${py * 100}%`);
        this.#updateColorFromAreaPosition(px, py, {
          updateHandle: false,
          emitInput: false,
        });
      }
      this.#isDraggingColor = false;
      this.#emitChange();
    };

    colorAreaEl.addEventListener("pointerdown", onPlanePointerDown);
    colorAreaEl.addEventListener("pointermove", onPlanePointerMove);
    colorAreaEl.addEventListener("pointerup", onPlaneDragEnd);
    colorAreaEl.addEventListener("pointercancel", onPlaneDragEnd);
    colorAreaEl.addEventListener("lostpointercapture", onPlaneDragEnd);

    colorAreaHandleEl.addEventListener("input", onHandleInput);
    colorAreaHandleEl.addEventListener("change", onHandleChange);

    this.#teardownColorAreaEvents = () => {
      colorAreaEl.removeEventListener("pointerdown", onPlanePointerDown);
      colorAreaEl.removeEventListener("pointermove", onPlanePointerMove);
      colorAreaEl.removeEventListener("pointerup", onPlaneDragEnd);
      colorAreaEl.removeEventListener("pointercancel", onPlaneDragEnd);
      colorAreaEl.removeEventListener("lostpointercapture", onPlaneDragEnd);

      colorAreaHandleEl.removeEventListener("input", onHandleInput);
      colorAreaHandleEl.removeEventListener("change", onHandleChange);
      this.#isDraggingColor = false;
    };
  }

  #rebuildColorInputFields() {
    const container = this.#dialog?.querySelector(
      ".fig-fill-picker-input-fields",
    );
    if (!container) return;

    const wrap = (tooltip, html) =>
      `<fig-tooltip text="${tooltip}">${html}</fig-tooltip>`;

    const num = (cls, min, max, step) =>
      `<fig-input-number class="${cls}" min="${min}" max="${max}"${step != null ? ` step="${step}"` : ""}></fig-input-number>`;

    let html;
    switch (this.#colorInputMode) {
      case "rgb":
        html = `<div class="input-combo">
          ${wrap("Red", num("fig-fill-picker-ci-r", 0, 255))}
          ${wrap("Green", num("fig-fill-picker-ci-g", 0, 255))}
          ${wrap("Blue", num("fig-fill-picker-ci-b", 0, 255))}
        </div>`;
        break;
      case "hsl":
        html = `<div class="input-combo">
          ${wrap("Hue", num("fig-fill-picker-ci-h", 0, 360))}
          ${wrap("Saturation", num("fig-fill-picker-ci-s", 0, 100))}
          ${wrap("Lightness", num("fig-fill-picker-ci-l", 0, 100))}
        </div>`;
        break;
      case "hsb":
        html = `<div class="input-combo">
          ${wrap("Hue", num("fig-fill-picker-ci-h", 0, 360))}
          ${wrap("Saturation", num("fig-fill-picker-ci-s", 0, 100))}
          ${wrap("Brightness", num("fig-fill-picker-ci-v", 0, 100))}
        </div>`;
        break;
      case "lab":
        html = `<div class="input-combo">
          ${wrap("Lightness", num("fig-fill-picker-ci-okl", 0, 100))}
          ${wrap("Green-Red axis", num("fig-fill-picker-ci-oka", -0.4, 0.4, 0.001))}
          ${wrap("Blue-Yellow axis", num("fig-fill-picker-ci-okb", -0.4, 0.4, 0.001))}
        </div>`;
        break;
      case "lch":
        html = `<div class="input-combo">
          ${wrap("Lightness", num("fig-fill-picker-ci-okl", 0, 100))}
          ${wrap("Chroma", num("fig-fill-picker-ci-okc", 0, 0.4, 0.001))}
          ${wrap("Hue", num("fig-fill-picker-ci-okh", 0, 360))}
        </div>`;
        break;
      default: // hex
        html = `<fig-input-text class="fig-fill-picker-ci-hex" placeholder="FFFFFF"></fig-input-text>`;
        break;
    }

    container.innerHTML = html;
    this.#wireColorInputEvents();
    requestAnimationFrame(() => this.#updateColorInputs());
  }

  #wireColorInputEvents() {
    const container = this.#dialog?.querySelector(
      ".fig-fill-picker-input-fields",
    );
    if (!container) return;

    const onInput = () => {
      if (this.#isDraggingColor) return;
      const color = this.#readColorFromInputs();
      if (!color) return;
      this.#color = { ...color, a: this.#color.a };
      this.#drawColorArea();
      this.#updateHandlePosition();
      if (this.#hueSlider) {
        this.#hueSlider.setAttribute("value", this.#color.h);
      }
      this.#emitInput();
    };

    const onChange = () => this.#emitChange();

    const inputs = container.querySelectorAll(
      "fig-input-number, fig-input-text",
    );
    inputs.forEach((el) => {
      el.addEventListener("input", onInput);
      el.addEventListener("change", onChange);
    });
  }

  #readColorFromInputs() {
    const q = (cls) => this.#dialog?.querySelector(`.${cls}`);
    const val = (cls) => parseFloat(q(cls)?.value ?? 0);

    switch (this.#colorInputMode) {
      case "rgb":
        return this.#rgbToHSV({
          r: val("fig-fill-picker-ci-r"),
          g: val("fig-fill-picker-ci-g"),
          b: val("fig-fill-picker-ci-b"),
        });
      case "hsl": {
        const rgb = this.#hslToRGB({
          h: val("fig-fill-picker-ci-h"),
          s: val("fig-fill-picker-ci-s"),
          l: val("fig-fill-picker-ci-l"),
        });
        return this.#rgbToHSV(rgb);
      }
      case "hsb":
        return {
          h: val("fig-fill-picker-ci-h"),
          s: val("fig-fill-picker-ci-s"),
          v: val("fig-fill-picker-ci-v"),
          a: 1,
        };
      case "lab": {
        const rgb = this.#oklabToRGB({
          l: val("fig-fill-picker-ci-okl") / 100,
          a: val("fig-fill-picker-ci-oka"),
          b: val("fig-fill-picker-ci-okb"),
        });
        return this.#rgbToHSV(rgb);
      }
      case "lch": {
        const rgb = this.#oklchToRGB({
          l: val("fig-fill-picker-ci-okl") / 100,
          c: val("fig-fill-picker-ci-okc"),
          h: val("fig-fill-picker-ci-okh"),
        });
        return this.#rgbToHSV(rgb);
      }
      default: {
        // hex
        const hexEl = q("fig-fill-picker-ci-hex");
        if (!hexEl) return null;
        let hex = hexEl.value.replace(/^#/, "");
        if (hex.length === 3)
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return this.#hexToHSV(`#${hex}`);
      }
    }
  }

  #updateColorInputs() {
    if (!this.#dialog) return;

    const hex = this.#hsvToHex(this.#color);
    const rgb = this.#hsvToRGB(this.#color);
    const q = (cls) => this.#dialog.querySelector(`.${cls}`);
    const set = (cls, v) => {
      const el = q(cls);
      if (el) el.setAttribute("value", v);
    };

    switch (this.#colorInputMode) {
      case "rgb":
        set("fig-fill-picker-ci-r", rgb.r);
        set("fig-fill-picker-ci-g", rgb.g);
        set("fig-fill-picker-ci-b", rgb.b);
        break;
      case "hsl": {
        const hsl = this.#rgbToHSL(rgb);
        set("fig-fill-picker-ci-h", Math.round(hsl.h));
        set("fig-fill-picker-ci-s", Math.round(hsl.s));
        set("fig-fill-picker-ci-l", Math.round(hsl.l));
        break;
      }
      case "hsb":
        set("fig-fill-picker-ci-h", Math.round(this.#color.h));
        set("fig-fill-picker-ci-s", Math.round(this.#color.s));
        set("fig-fill-picker-ci-v", Math.round(this.#color.v));
        break;
      case "lab": {
        const lab = this.#rgbToOKLAB(rgb);
        set("fig-fill-picker-ci-okl", Math.round(lab.l * 100));
        set("fig-fill-picker-ci-oka", +lab.a.toFixed(3));
        set("fig-fill-picker-ci-okb", +lab.b.toFixed(3));
        break;
      }
      case "lch": {
        const lch = this.#rgbToOKLCH(rgb);
        set("fig-fill-picker-ci-okl", Math.round(lch.l * 100));
        set("fig-fill-picker-ci-okc", +lch.c.toFixed(3));
        set("fig-fill-picker-ci-okh", Math.round(lch.h));
        break;
      }
      default: // hex
        set("fig-fill-picker-ci-hex", hex.replace(/^#/, "").toUpperCase());
        break;
    }

    if (this.#opacitySlider) {
      this.#opacitySlider.setAttribute("color", hex);
    }

    this.#updateChit();
  }

  // ============ GRADIENT TAB ============
  #initGradientTab() {
    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-gradient-header" direction="horizontal">
        <fig-dropdown class="fig-fill-picker-gradient-type" ${expAttr} value="${
          this.#gradient.type
        }">
          <option value="linear" selected>Linear</option>
          <option value="radial">Radial</option>
          <option value="angular">Angular</option>
        </fig-dropdown>
        <fig-tooltip text="Rotate gradient">
          <fig-input-angle class="fig-fill-picker-gradient-angle" value="${
            (this.#gradient.angle - 90 + 360) % 360
          }"></fig-input-angle>
        </fig-tooltip>
        <div class="fig-fill-picker-gradient-center input-combo" style="display: none;">
          <fig-input-number min="0" max="100" value="${
            this.#gradient.centerX
          }" units="%" class="fig-fill-picker-gradient-cx"></fig-input-number>
          <fig-input-number min="0" max="100" value="${
            this.#gradient.centerY
          }" units="%" class="fig-fill-picker-gradient-cy"></fig-input-number>
        </div>
        <fig-tooltip text="Flip gradient">
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-flip">
            <span class="fig-mask-icon" style="--icon: var(--icon-swap)"></span>
          </fig-button>
        </fig-tooltip>
      </fig-field>
      <fig-preview class="fig-fill-picker-gradient-preview">
        <div class="fig-fill-picker-gradient-bar"></div>
        <div class="fig-fill-picker-gradient-stops-handles"></div>
      </fig-preview>
      <fig-field class="fig-fill-picker-gradient-interpolation" direction="horizontal">
        <label>Mixing</label>
        <fig-dropdown class="fig-fill-picker-gradient-space" full ${expAttr} value="${
          this.#gradient.interpolationSpace === "oklch"
            ? `oklch-${this.#gradient.hueInterpolation || "shorter"}`
            : this.#gradient.interpolationSpace
        }">
          <optgroup label="sRGB">
            <option value="srgb-linear">Linear</option>
          </optgroup>
          <optgroup label="OKLab">
            <option value="oklab">Perceptual</option>
          </optgroup>
          <optgroup label="OKLCH">
            <option value="oklch-shorter">Shorter hue</option>
            <option value="oklch-longer">Longer hue</option>
            <option value="oklch-increasing">Increasing hue</option>
            <option value="oklch-decreasing">Decreasing hue</option>
          </optgroup>
        </fig-dropdown>
      </fig-field>
      <div class="fig-fill-picker-gradient-stops">
        <fig-header class="fig-fill-picker-gradient-stops-header" borderless>
          <span>Stops</span>
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-add" title="Add stop">
            <span class="fig-mask-icon" style="--icon: var(--icon-add)"></span>
          </fig-button>
        </fig-header>
        <div class="fig-fill-picker-gradient-stops-list"></div>
      </div>
    `;

    this.#updateGradientUI();
    this.#setupGradientEvents(container);
  }

  #setupGradientEvents(container) {
    // Type dropdown
    const typeDropdown = container.querySelector(
      ".fig-fill-picker-gradient-type",
    );
    const getDropdownValue = (event) =>
      event.currentTarget?.value ?? event.target?.value ?? event.detail;

    const handleTypeChange = (e) => {
      this.#gradient.type = getDropdownValue(e);
      this.#updateGradientUI();
      this.#emitInput();
    };
    typeDropdown.addEventListener("input", handleTypeChange);
    typeDropdown.addEventListener("change", handleTypeChange);

    const interpolationDropdown = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    const handleInterpolationChange = (e) => {
      const val = getDropdownValue(e);
      let space = val;
      let hue = "shorter";
      if (val.startsWith("oklch-")) {
        space = "oklch";
        hue = val.slice(6);
      }
      this.#gradient = normalizeGradientConfig({
        ...this.#gradient,
        interpolationSpace: space,
        hueInterpolation: hue,
      });
      this.#updateGradientUI();
      this.#emitInput();
    };
    interpolationDropdown?.addEventListener("input", handleInterpolationChange);
    interpolationDropdown?.addEventListener(
      "change",
      handleInterpolationChange,
    );

    // Angle input
    // Convert from fig-input-angle coordinates (0° = right) to CSS coordinates (0° = up)
    const angleInput = container.querySelector(
      ".fig-fill-picker-gradient-angle",
    );
    angleInput.addEventListener("input", (e) => {
      const pickerAngle = parseFloat(e.target.value) || 0;
      this.#gradient.angle = (pickerAngle + 90) % 360;
      this.#updateGradientPreview();
      this.#emitInput();
    });

    // Center X/Y inputs
    const cxInput = container.querySelector(".fig-fill-picker-gradient-cx");
    const cyInput = container.querySelector(".fig-fill-picker-gradient-cy");
    cxInput?.addEventListener("input", (e) => {
      this.#gradient.centerX = parseFloat(e.target.value) || 50;
      this.#updateGradientPreview();
      this.#emitInput();
    });
    cyInput?.addEventListener("input", (e) => {
      this.#gradient.centerY = parseFloat(e.target.value) || 50;
      this.#updateGradientPreview();
      this.#emitInput();
    });

    // Flip button
    container
      .querySelector(".fig-fill-picker-gradient-flip")
      .addEventListener("click", () => {
        this.#gradient.stops.forEach((stop) => {
          stop.position = 100 - stop.position;
        });
        this.#gradient.stops.sort((a, b) => a.position - b.position);
        this.#updateGradientUI();
        this.#emitInput();
      });

    // Add stop button
    container
      .querySelector(".fig-fill-picker-gradient-add")
      .addEventListener("click", () => {
        const midPosition = 50;
        this.#gradient.stops.push({
          position: midPosition,
          color: "#888888",
          opacity: 100,
        });
        this.#gradient.stops.sort((a, b) => a.position - b.position);
        this.#updateGradientUI();
        this.#emitInput();
      });
  }

  #updateGradientUI() {
    if (!this.#dialog) return;

    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    if (!container) return;
    this.#gradient = normalizeGradientConfig(this.#gradient);

    // Show/hide angle vs center inputs
    const angleInput = container.querySelector(
      ".fig-fill-picker-gradient-angle",
    );
    const centerInputs = container.querySelector(
      ".fig-fill-picker-gradient-center",
    );

    if (this.#gradient.type === "radial") {
      angleInput.style.display = "none";
      centerInputs.style.display = "flex";
    } else {
      angleInput.style.display = "block";
      centerInputs.style.display = "none";
      // Sync angle input value (convert CSS angle to picker angle)
      const pickerAngle = (this.#gradient.angle - 90 + 360) % 360;
      angleInput.setAttribute("value", pickerAngle);
    }

    const interpolationDropdown = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    if (interpolationDropdown) {
      interpolationDropdown.value =
        this.#gradient.interpolationSpace === "oklch"
          ? `oklch-${this.#gradient.hueInterpolation || "shorter"}`
          : this.#gradient.interpolationSpace;
    }

    this.#updateGradientPreview();
    this.#updateGradientStopsList();
  }

  #updateGradientPreview() {
    if (!this.#dialog) return;

    const preview = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-preview",
    );
    const bar = this.#dialog.querySelector(".fig-fill-picker-gradient-bar");
    if (preview || bar) {
      const css = this.#getGradientCSS();
      if (bar) bar.style.background = css;
      if (preview) preview.style.background = css;
    }

    this.#updateChit();
  }

  #updateGradientStopsList() {
    if (!this.#dialog) return;

    const list = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-stops-list",
    );
    if (!list) return;

    list.innerHTML = this.#gradient.stops
      .map(
        (stop, index) => `
      <fig-field class="fig-fill-picker-gradient-stop-row" direction="horizontal" data-index="${index}">
        <fig-input-number class="fig-fill-picker-stop-position" min="0" max="100" value="${
          stop.position
        }" units="%"></fig-input-number>
        <fig-input-color class="fig-fill-picker-stop-color" text="true" alpha="true" picker="figma" picker-dialog-position="right" value="${
          stop.color
        }"></fig-input-color>
        <fig-button icon variant="ghost" class="fig-fill-picker-stop-remove" ${
          this.#gradient.stops.length <= 2 ? "disabled" : ""
        }>
          <span class="fig-mask-icon" style="--icon: var(--icon-minus)"></span>
        </fig-button>
      </fig-field>
    `,
      )
      .join("");

    // Setup event listeners for each stop
    list
      .querySelectorAll(".fig-fill-picker-gradient-stop-row")
      .forEach((row) => {
        const index = parseInt(row.dataset.index);

        row
          .querySelector(".fig-fill-picker-stop-position")
          .addEventListener("input", (e) => {
            this.#gradient.stops[index].position =
              parseFloat(e.target.value) || 0;
            this.#updateGradientPreview();
            this.#emitInput();
          });

        const stopColor = row.querySelector(".fig-fill-picker-stop-color");
        const stopFillPicker = stopColor.querySelector("fig-fill-picker");
        if (stopFillPicker) {
          stopFillPicker.anchorElement = this.#dialog;
        } else {
          requestAnimationFrame(() => {
            const fp = stopColor.querySelector("fig-fill-picker");
            if (fp) fp.anchorElement = this.#dialog;
          });
        }

        stopColor.addEventListener("input", (e) => {
          this.#gradient.stops[index].color =
            e.target.hexOpaque || e.target.value;
          const parsedAlpha = parseFloat(e.target.alpha);
          this.#gradient.stops[index].opacity = isNaN(parsedAlpha)
            ? 100
            : parsedAlpha;
          this.#updateGradientPreview();
          this.#emitInput();
        });

        row
          .querySelector(".fig-fill-picker-stop-remove")
          .addEventListener("click", () => {
            if (this.#gradient.stops.length > 2) {
              this.#gradient.stops.splice(index, 1);
              this.#updateGradientUI();
              this.#emitInput();
            }
          });
      });
  }

  #buildGradientCSS(interpolationSpaceOverride, includeInterpolation = true) {
    const gradient = normalizeGradientConfig({
      ...this.#gradient,
      interpolationSpace:
        interpolationSpaceOverride ?? this.#gradient.interpolationSpace,
    });
    const isP3 = this.#gamut === "display-p3";
    const stops = gradient.stops
      .map((s) => {
        const color = isP3
          ? this.#hexToP3(s.color, s.opacity / 100)
          : this.#hexToRGBA(s.color, s.opacity / 100);
        return `${color} ${s.position}%`;
      })
      .join(", ");
    const interpolation = includeInterpolation
      ? ` ${gradientInterpolationClause(gradient)}`
      : "";
    switch (gradient.type) {
      case "linear":
        return `linear-gradient(${gradient.angle}deg${interpolation}, ${stops})`;
      case "radial":
        return `radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%${interpolation}, ${stops})`;
      case "angular":
        return `conic-gradient(from ${gradient.angle}deg${interpolation}, ${stops})`;
      default:
        return `linear-gradient(${gradient.angle}deg${interpolation}, ${stops})`;
    }
  }

  #testGradientSupport(css) {
    const el = document.createElement("div");
    el.style.background = css;
    return !!el.style.background;
  }

  #getGradientCSS() {
    const preferred = this.#buildGradientCSS(undefined, true);
    if (this.#testGradientSupport(preferred)) return preferred;

    const oklabFallback = this.#buildGradientCSS("oklab", true);
    if (this.#testGradientSupport(oklabFallback)) return oklabFallback;

    return this.#buildGradientCSS("oklab", false);
  }

  // ============ IMAGE TAB ============
  #initImageTab() {
    const container = this.#dialog.querySelector('[data-tab="image"]');
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-media-header" direction="horizontal">
        <fig-dropdown class="fig-fill-picker-scale-mode" ${expAttr} value="${
          this.#image.scaleMode
        }">
          <option value="fill" selected>Fill</option>
          <option value="fit">Fit</option>
          <option value="crop">Crop</option>
          <option value="tile">Tile</option>
        </fig-dropdown>
        <fig-input-number class="fig-fill-picker-scale" min="1" max="200" value="${
          this.#image.scale
        }" units="%" style="display: none;"></fig-input-number>
      </fig-field>
      <div class="fig-fill-picker-media-preview">
        <div class="fig-fill-picker-checkerboard"></div>
        <div class="fig-fill-picker-image-preview"></div>
        <fig-button variant="overlay" class="fig-fill-picker-upload">
          Upload from computer
          <input type="file" accept="image/*" style="display: none;" />
        </fig-button>
      </div>
    `;

    this.#setupImageEvents(container);
  }

  #setupImageEvents(container) {
    const scaleModeDropdown = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const scaleInput = container.querySelector(".fig-fill-picker-scale");
    const uploadBtn = container.querySelector(".fig-fill-picker-upload");
    const fileInput = container.querySelector('input[type="file"]');
    const preview = container.querySelector(".fig-fill-picker-image-preview");

    scaleModeDropdown.addEventListener("change", (e) => {
      this.#image.scaleMode = e.target.value;
      scaleInput.style.display = e.target.value === "tile" ? "block" : "none";
      this.#updateImagePreview(preview);
      this.#updateChit();
      this.#emitInput();
    });

    scaleInput.addEventListener("input", (e) => {
      this.#image.scale = parseFloat(e.target.value) || 100;
      this.#updateImagePreview(preview);
      this.#updateChit();
      this.#emitInput();
    });

    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.#image.url = e.target.result;
          this.#updateImagePreview(preview);
          this.#updateChit();
          this.#emitInput();
        };
        reader.readAsDataURL(file);
      }
    });

    // Drag and drop
    const previewArea = container.querySelector(
      ".fig-fill-picker-media-preview",
    );
    previewArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      previewArea.classList.add("dragover");
    });
    previewArea.addEventListener("dragleave", () => {
      previewArea.classList.remove("dragover");
    });
    previewArea.addEventListener("drop", (e) => {
      e.preventDefault();
      previewArea.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.#image.url = e.target.result;
          this.#updateImagePreview(preview);
          this.#updateChit();
          this.#emitInput();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  #updateImagePreview(element) {
    const container = element.closest(".fig-fill-picker-media-preview");
    if (!this.#image.url) {
      element.style.display = "none";
      container?.classList.remove("has-media");
      return;
    }

    element.style.display = "block";
    container?.classList.add("has-media");
    element.style.backgroundImage = `url(${this.#image.url})`;
    element.style.backgroundPosition = "center";

    switch (this.#image.scaleMode) {
      case "fill":
        element.style.backgroundSize = "cover";
        element.style.backgroundRepeat = "no-repeat";
        break;
      case "fit":
        element.style.backgroundSize = "contain";
        element.style.backgroundRepeat = "no-repeat";
        break;
      case "crop":
        element.style.backgroundSize = "cover";
        element.style.backgroundRepeat = "no-repeat";
        break;
      case "tile":
        element.style.backgroundSize = `${this.#image.scale}%`;
        element.style.backgroundRepeat = "repeat";
        element.style.backgroundPosition = "top left";
        break;
    }
  }

  // For video elements (still uses object-fit)
  #updateVideoPreviewStyle(element) {
    element.style.objectPosition = "center";
    element.style.width = "100%";
    element.style.height = "100%";

    switch (this.#video.scaleMode) {
      case "fill":
      case "crop":
        element.style.objectFit = "cover";
        break;
      case "fit":
        element.style.objectFit = "contain";
        break;
    }
  }

  // ============ VIDEO TAB ============
  #initVideoTab() {
    const container = this.#dialog.querySelector('[data-tab="video"]');
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-media-header" direction="horizontal">
        <fig-dropdown class="fig-fill-picker-scale-mode" ${expAttr} value="${
          this.#video.scaleMode
        }">
          <option value="fill" selected>Fill</option>
          <option value="fit">Fit</option>
          <option value="crop">Crop</option>
        </fig-dropdown>
      </fig-field>
      <div class="fig-fill-picker-media-preview">
        <div class="fig-fill-picker-checkerboard"></div>
        <video class="fig-fill-picker-video-preview" style="display: none;" muted loop></video>
        <fig-button variant="overlay" class="fig-fill-picker-upload">
          Upload from computer
          <input type="file" accept="video/*" style="display: none;" />
        </fig-button>
      </div>
    `;

    this.#setupVideoEvents(container);
  }

  #setupVideoEvents(container) {
    const scaleModeDropdown = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const uploadBtn = container.querySelector(".fig-fill-picker-upload");
    const fileInput = container.querySelector('input[type="file"]');
    const preview = container.querySelector(".fig-fill-picker-video-preview");

    scaleModeDropdown.addEventListener("change", (e) => {
      this.#video.scaleMode = e.target.value;
      this.#updateVideoPreviewStyle(preview);
      this.#updateChit();
      this.#emitInput();
    });

    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    // Drag and drop
    const previewArea = container.querySelector(
      ".fig-fill-picker-media-preview",
    );

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.#video.url = URL.createObjectURL(file);
        preview.src = this.#video.url;
        preview.style.display = "block";
        preview.play();
        previewArea.classList.add("has-media");
        this.#updateVideoPreviewStyle(preview);
        this.#updateChit();
        this.#emitInput();
      }
    });

    previewArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      previewArea.classList.add("dragover");
    });
    previewArea.addEventListener("dragleave", () => {
      previewArea.classList.remove("dragover");
    });
    previewArea.addEventListener("drop", (e) => {
      e.preventDefault();
      previewArea.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        this.#video.url = URL.createObjectURL(file);
        preview.src = this.#video.url;
        preview.style.display = "block";
        preview.play();
        previewArea.classList.add("has-media");
        this.#updateVideoPreviewStyle(preview);
        this.#updateChit();
        this.#emitInput();
      }
    });
  }

  // ============ WEBCAM TAB ============
  #initWebcamTab() {
    const container = this.#dialog.querySelector('[data-tab="webcam"]');
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <div class="fig-fill-picker-webcam-preview">
        <div class="fig-fill-picker-checkerboard"></div>
        <video class="fig-fill-picker-webcam-video" autoplay muted playsinline></video>
        <div class="fig-fill-picker-webcam-status">
          <span>Camera access required</span>
        </div>
      </div>
      <fig-field class="fig-fill-picker-webcam-controls" direction="horizontal">
        <fig-dropdown class="fig-fill-picker-camera-select" ${expAttr} style="display: none;">
        </fig-dropdown>
        <fig-button class="fig-fill-picker-webcam-capture" variant="primary">
          Capture
        </fig-button>
      </fig-field>
    `;

    this.#setupWebcamEvents(container);
  }

  #setupWebcamEvents(container) {
    const video = container.querySelector(".fig-fill-picker-webcam-video");
    const status = container.querySelector(".fig-fill-picker-webcam-status");
    const captureBtn = container.querySelector(
      ".fig-fill-picker-webcam-capture",
    );
    const cameraSelect = container.querySelector(
      ".fig-fill-picker-camera-select",
    );

    const startWebcam = async (deviceId = null) => {
      try {
        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        };

        if (this.#webcam.stream) {
          this.#webcam.stream.getTracks().forEach((track) => track.stop());
        }

        this.#webcam.stream =
          await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = this.#webcam.stream;
        video.style.display = "block";
        status.style.display = "none";

        // Enumerate cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");

        if (cameras.length > 1) {
          cameraSelect.style.display = "block";
          cameraSelect.innerHTML = cameras
            .map(
              (cam, i) =>
                `<option value="${cam.deviceId}">${
                  cam.label || `Camera ${i + 1}`
                }</option>`,
            )
            .join("");
        }
      } catch (err) {
        console.error("Webcam error:", err.name, err.message);
        let message = "Camera access denied";
        if (err.name === "NotAllowedError") {
          message = "Camera permission denied";
        } else if (err.name === "NotFoundError") {
          message = "No camera found";
        } else if (err.name === "NotReadableError") {
          message = "Camera in use by another app";
        } else if (err.name === "OverconstrainedError") {
          message = "Camera constraints not supported";
        } else if (!window.isSecureContext) {
          message = "Camera requires secure context";
        }
        status.innerHTML = `<span>${message}</span>`;
        status.style.display = "flex";
        video.style.display = "none";
      }
    };

    // Start webcam when tab is shown
    const observer = new MutationObserver(() => {
      if (container.style.display !== "none" && !this.#webcam.stream) {
        startWebcam();
      }
    });
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["style"],
    });

    cameraSelect.addEventListener("change", (e) => {
      startWebcam(e.target.value);
    });

    captureBtn.addEventListener("click", () => {
      if (!this.#webcam.stream) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      this.#webcam.snapshot = canvas.toDataURL("image/png");
      this.#image.url = this.#webcam.snapshot;
      this.#fillType = "image";
      this.#updateChit();
      this.#emitInput();

      // Switch to image tab to show result
      this.#switchTab("image");
      const tabs = this.#dialog.querySelector("fig-tabs");
      tabs.value = "image";
    });
  }

  // ============ COLOR CONVERSION UTILITIES ============
  #hsvToRGB(hsv) {
    const h = hsv.h / 360;
    const s = hsv.s / 100;
    const v = hsv.v / 100;

    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  #rgbToHSV(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      v: v * 100,
      a: 1,
    };
  }

  #hsvToHex(hsv) {
    // Safety check for valid HSV object
    if (
      !hsv ||
      typeof hsv.h !== "number" ||
      typeof hsv.s !== "number" ||
      typeof hsv.v !== "number"
    ) {
      return "#D9D9D9"; // Default gray
    }
    const rgb = this.#hsvToRGB(hsv);
    const toHex = (n) => {
      const val = isNaN(n) ? 217 : Math.max(0, Math.min(255, Math.round(n)));
      return val.toString(16).padStart(2, "0");
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  #hexToHSV(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return this.#rgbToHSV({ r, g, b });
  }

  #hexToRGBA(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  #hexToP3(hex, alpha = 1) {
    const r = +(parseInt(hex.slice(1, 3), 16) / 255).toFixed(4);
    const g = +(parseInt(hex.slice(3, 5), 16) / 255).toFixed(4);
    const b = +(parseInt(hex.slice(5, 7), 16) / 255).toFixed(4);
    return `color(display-p3 ${r} ${g} ${b} / ${alpha})`;
  }

  #rgbToHSL(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  #hslToRGB(hsl) {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  // OKLAB/OKLCH conversions (simplified)
  #rgbToOKLAB(rgb) {
    // Convert to linear sRGB
    const toLinear = (c) => {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const r = toLinear(rgb.r);
    const g = toLinear(rgb.g);
    const b = toLinear(rgb.b);

    // Convert to LMS
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    // Convert to Oklab
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return {
      l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    };
  }

  #rgbToOKLCH(rgb) {
    const lab = this.#rgbToOKLAB(rgb);
    return {
      l: lab.l,
      c: Math.sqrt(lab.a * lab.a + lab.b * lab.b),
      h: ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360,
    };
  }

  #oklabToRGB(lab) {
    const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
    const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
    const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const toSRGB = (c) => {
      const v =
        c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(1, v)) * 255);
    };

    return {
      r: toSRGB(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      g: toSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      b: toSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    };
  }

  #oklchToRGB(lch) {
    const hRad = (lch.h * Math.PI) / 180;
    return this.#oklabToRGB({
      l: lch.l,
      a: lch.c * Math.cos(hRad),
      b: lch.c * Math.sin(hRad),
    });
  }

  // ============ EVENT EMITTERS ============
  #emitInput() {
    this.#updateChit();
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

  // ============ PUBLIC API ============
  get value() {
    const base = { type: this.#fillType, colorSpace: this.#gamut };

    switch (this.#fillType) {
      case "solid":
        return {
          ...base,
          color: this.#hsvToHex(this.#color),
          alpha: this.#color.a,
          hsv: { ...this.#color },
        };
      case "gradient":
        return {
          ...base,
          gradient: gradientToValueShape(this.#gradient),
          css: this.#getGradientCSS(),
        };
      case "image":
        return {
          ...base,
          image: { ...this.#image },
        };
      case "video":
        return {
          ...base,
          video: { ...this.#video },
        };
      case "webcam":
        return {
          ...base,
          image: { url: this.#webcam.snapshot, scaleMode: "fill", scale: 50 },
        };
      default:
        return { ...base, ...this.#customData[this.#fillType] };
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
        this.#parseValue();
        this.#updateChit();
        if (this.#dialog) {
          // Update dialog UI if open - but don't rebuild if user is dragging
          if (!this.#isDraggingColor) {
            // Just update the handle position and color inputs without rebuilding
            this.#updateHandlePosition();
            this.#updateColorInputs();
            // Update hue slider
            if (this.#hueSlider) {
              this.#hueSlider.setAttribute("value", this.#color.h);
            }
            // Update opacity slider
            if (this.#opacitySlider) {
              this.#opacitySlider.setAttribute("value", this.#color.a * 100);
              this.#opacitySlider.setAttribute(
                "color",
                this.#hsvToHex(this.#color),
              );
            }
          }
        }
        break;
      case "disabled":
        // Handled in click listener
        break;
    }
  }
}
customElements.define("fig-fill-picker", FigFillPicker);

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
  #boundHandleInput = this.#handlePickerInput.bind(this);
  #boundHandleChange = this.#handlePickerChange.bind(this);

  static get observedAttributes() {
    return ["value", "selected", "disabled", "alpha", "control"];
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
    if (!this.#fillPicker) return;
    this.#fillPicker.removeEventListener("input", this.#boundHandleInput);
    this.#fillPicker.removeEventListener("change", this.#boundHandleChange);
  }

  #watchPickerDialog = () => {
    requestAnimationFrame(() => {
      const dialog = document.querySelector(".fig-fill-picker-dialog[open]");
      if (!dialog) return;
      dialog.addEventListener("close", () => this.removeAttribute("selected"), {
        once: true,
      });
    });
  };

  get #alphaEnabled() {
    const v = this.getAttribute("alpha");
    return v === null || v !== "false";
  }

  #render() {
    const mode = this.#controlMode;
    if (mode === "add" || mode === "remove") {
      const icon = mode === "add" ? "var(--icon-add)" : "var(--icon-minus)";
      this.innerHTML = `<fig-button icon variant="ghost"><span class="fig-mask-icon" style="--icon: ${icon}"></span></fig-button>`;
      this.#fillPicker = null;
      this.#chit = null;
      this.addEventListener("click", this.#handleControlClick);
      return;
    }
    this.removeEventListener("click", this.#handleControlClick);

    const color = this.#normalizeColor(this.getAttribute("value"));
    const alphaAttr = this.#alphaEnabled ? "" : 'alpha="false"';
    this.innerHTML = `
      <fig-fill-picker mode="solid" ${alphaAttr} value='${JSON.stringify({ type: "solid", color })}'>
        <fig-chit background="${color}"></fig-chit>
      </fig-fill-picker>`;

    this.#fillPicker = this.querySelector("fig-fill-picker");
    this.#chit = this.querySelector("fig-chit");
    this.#teardownListeners();
    this.#fillPicker?.addEventListener("input", this.#boundHandleInput);
    this.#fillPicker?.addEventListener("change", this.#boundHandleChange);
    this.#chit?.addEventListener("click", () => {
      this.setAttribute("selected", "");
      this.#watchPickerDialog();
    });
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

    try {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return "#D9D9D9";
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
    const color = this.#normalizeColor(this.getAttribute("value"));
    if (this.getAttribute("value") !== color) {
      this.setAttribute("value", color);
      return;
    }

    if (this.#fillPicker) {
      this.#fillPicker.setAttribute(
        "value",
        JSON.stringify({ type: "solid", color }),
      );
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
      this.#chit.setAttribute("background", color);
      if (this.hasAttribute("disabled")) {
        this.#chit.setAttribute("disabled", "");
      } else {
        this.#chit.removeAttribute("disabled");
      }
    }
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
    if (this.#alphaEnabled && detail?.opacity !== undefined) {
      eventDetail.opacity = detail.opacity;
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
    this.#updateColorFromPicker(event.detail, "input");
  }

  #handlePickerChange(event) {
    event.stopPropagation();
    this.#updateColorFromPicker(event.detail, "change");
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
        this.#syncFromAttributes();
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

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "disabled", "choice-element", "drag", "overflow", "loop", "padding"];
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

  get choices() {
    return Array.from(this.querySelectorAll(this.#choiceSelector));
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
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("scroll", this.#boundSyncOverflow);
    this.#applyOverflowMode();
    this.#setupDrag();
    this.#startObserver();
    this.#startResizeObserver();

    requestAnimationFrame(() => {
      this.#syncSelection();
      this.#syncOverflow();
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
    const threshold = 2;

    if (isHorizontal) {
      const atStart = this.scrollLeft <= threshold;
      const atEnd =
        this.scrollLeft + this.clientWidth >= this.scrollWidth - threshold;
      this.classList.toggle("overflow-start", !atStart);
      this.classList.toggle("overflow-end", !atEnd);
    } else {
      const atStart = this.scrollTop <= threshold;
      const atEnd =
        this.scrollTop + this.clientHeight >= this.scrollHeight - threshold;
      this.classList.toggle("overflow-start", !atStart);
      this.classList.toggle("overflow-end", !atEnd);
    }
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
    if (this.#navStart) return;

    this.#navStart = document.createElement("button");
    this.#navStart.className = "fig-chooser-nav-start";
    this.#navStart.setAttribute("tabindex", "-1");
    this.#navStart.setAttribute("aria-label", "Scroll back");

    this.#navEnd = document.createElement("button");
    this.#navEnd.className = "fig-chooser-nav-end";
    this.#navEnd.setAttribute("tabindex", "-1");
    this.#navEnd.setAttribute("aria-label", "Scroll forward");

    this.#navStart.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.#scrollByPage(-1);
    });

    this.#navEnd.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.#scrollByPage(1);
    });

    this.prepend(this.#navStart);
    this.append(this.#navEnd);
  }

  #scrollByPage(direction) {
    const isHorizontal = this.getAttribute("layout") === "horizontal";
    const pageSize = isHorizontal ? this.clientWidth : this.clientHeight;
    const scrollAmount = pageSize * 0.8 * direction;

    this.scrollBy({
      [isHorizontal ? "left" : "top"]: scrollAmount,
      behavior: "smooth",
    });
  }

  #scrollToChoice(el) {
    if (!el) return;
    requestAnimationFrame(() => {
      const overflowY = this.scrollHeight > this.clientHeight;
      const overflowX = this.scrollWidth > this.clientWidth;
      if (!overflowX && !overflowY) return;

      const options = { behavior: "smooth" };

      if (overflowY) {
        const target =
          el.offsetTop - this.clientHeight / 2 + el.offsetHeight / 2;
        options.top = target;
      }

      if (overflowX) {
        const target =
          el.offsetLeft - this.clientWidth / 2 + el.offsetWidth / 2;
        options.left = target;
      }

      this.scrollTo(options);
    });
  }

  #startObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver(() => {
      const choices = this.choices;
      if (this.#selectedChoice && !choices.includes(this.#selectedChoice)) {
        this.#selectedChoice = null;
        this.#syncSelection();
      } else if (!this.#selectedChoice && choices.length) {
        this.#syncSelection();
      }
    });
    this.#mutationObserver.observe(this, { childList: true, subtree: true });
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
    "control",
  ];

  #isDragging = false;
  #didDrag = false;
  #boundPointerDown = null;
  #applyingValue = false;
  #colorTip = null;

  get #controlMode() {
    return this.getAttribute("control") || null;
  }

  get #hasControlMode() {
    return this.#controlMode === "add" || this.#controlMode === "remove";
  }

  get #isGhost() {
    return this.classList.contains("fig-input-gradient-ghost");
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
    const rect = container.getBoundingClientRect();
    const hw = this.offsetWidth / 2;
    const hh = this.offsetHeight / 2;
    const x = parseFloat(this.style.left) || 0;
    const y = parseFloat(this.style.top) || 0;
    const px = rect.width > 0 ? ((x + hw) / rect.width) * 100 : 0;
    const py = rect.height > 0 ? ((y + hh) / rect.height) * 100 : 0;
    return `${Math.round(px)}% ${Math.round(py)}%`;
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
    const hw = this.offsetWidth / 2;
    const hh = this.offsetHeight / 2;

    const resolve = (token, containerDim, halfHandle) => {
      if (token && typeof token === "object" && "px" in token) {
        return Math.max(
          -halfHandle,
          Math.min(containerDim - halfHandle, token.px - halfHandle),
        );
      }
      const pct = typeof token === "number" ? token : 0;
      const center = (pct / 100) * containerDim;
      return Math.max(
        -halfHandle,
        Math.min(containerDim - halfHandle, center - halfHandle),
      );
    };

    const axes = this.#axes;
    if (axes.x) this.style.left = `${Math.round(resolve(xToken, rect.width, hw))}px`;
    if (axes.y) this.style.top = `${Math.round(resolve(yToken, rect.height, hh))}px`;
  }

  #syncValueAttribute() {
    this.#applyingValue = true;
    this.setAttribute("value", this.value);
    this.#applyingValue = false;
  }

  connectedCallback() {
    this.#syncDrag();
    this.addEventListener("click", this.#handleSelect);
    document.addEventListener("pointerdown", this.#handleDeselect);
    document.addEventListener("keydown", this.#handleKeyDown);
    const initial = this.getAttribute("value");
    if (initial) this.#applyValue(initial);
    if (this.#hasControlMode && !this.#isGhost) this.#showColorTip();
  }

  disconnectedCallback() {
    this.#teardownDrag();
    this.#hideColorTip();
    this.removeEventListener("click", this.#handleSelect);
    document.removeEventListener("pointerdown", this.#handleDeselect);
    document.removeEventListener("keydown", this.#handleKeyDown);
  }

  select() {
    if (this.hasAttribute("disabled")) return;
    this.setAttribute("selected", "");
    if (this.getAttribute("type") === "color" && !this.#isDragging) this.#showColorTip();
  }

  deselect() {
    this.removeAttribute("selected");
    this.#hideColorTip();
  }

  #handleSelect = (e) => {
    if (this.#hasControlMode) return;
    if (this.#didDrag) {
      this.#didDrag = false;
      return;
    }
    this.select();
  };

  #handleDeselect = (e) => {
    if (this.#hasControlMode) return;
    if (this.contains(e.target)) return;
    if (this.#colorTip && e.target.closest?.("dialog, [popover]")) return;
    this.deselect();
  };

  #handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (!this.hasAttribute("selected")) return;
    if (this.getAttribute("type") !== "color") return;
    if (this.#colorTip) return;
    e.preventDefault();
    this.#showColorTip();
  };

  attributeChangedCallback(name, _old, value) {
    if (name === "color") {
      if (!value || value === "false" || value === "true") {
        this.style.removeProperty("--fill");
      } else {
        this.style.setProperty("--fill", value);
      }
      if (this.#colorTip && value) {
        this.#colorTip.setAttribute("value", value);
      }
    }
    if (name === "drag") this.#syncDrag();
    if (name === "value" && !this.#applyingValue && !this.#isDragging) {
      this.#applyValue(value);
    }
    if (name === "control" && !this.#isGhost) {
      if (this.#hasControlMode) {
        this.#hideColorTip();
        this.#showColorTip();
      } else {
        this.#hideColorTip();
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
    const containerRect = container.getBoundingClientRect();
    const handleW = this.offsetWidth;
    const handleH = this.offsetHeight;

    const clampAndApply = (clientX, clientY, shiftKey = false) => {
      const rect = container.getBoundingClientRect();
      const currentLeft = parseFloat(this.style.left) || 0;
      const currentTop = parseFloat(this.style.top) || 0;
      const rawX = clientX - rect.left - handleW / 2;
      const rawY = clientY - rect.top - handleH / 2;

      const clampedX = Math.max(
        -handleW / 2,
        Math.min(rect.width - handleW / 2, rawX),
      );
      const clampedY = Math.max(
        -handleH / 2,
        Math.min(rect.height - handleH / 2, rawY),
      );

      let centerX =
        rect.width > 0
          ? ((axes.x ? clampedX : currentLeft) + handleW / 2) / rect.width
          : 0.5;
      let centerY =
        rect.height > 0
          ? ((axes.y ? clampedY : currentTop) + handleH / 2) / rect.height
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

      if (axes.x) {
        const left = centerX * rect.width - handleW / 2;
        this.style.left = `${Math.round(Math.max(-handleW / 2, Math.min(rect.width - handleW / 2, left)))}px`;
      }
      if (axes.y) {
        const top = centerY * rect.height - handleH / 2;
        this.style.top = `${Math.round(Math.max(-handleH / 2, Math.min(rect.height - handleH / 2, top)))}px`;
      }
    };

    const onMove = (e) => {
      if (!this.#isDragging) return;
      if (!this.#didDrag) {
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
            ...this.#positionDetail(container.getBoundingClientRect()),
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
        this.dispatchEvent(
          new CustomEvent("change", {
            bubbles: true,
            detail: this.#positionDetail(container.getBoundingClientRect()),
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

  #showColorTip() {
    if (this.#colorTip) return;
    const tip = document.createElement("fig-color-tip");
    if (this.#hasControlMode) {
      tip.setAttribute("control", this.#controlMode);
    } else {
      tip.setAttribute("value", this.getAttribute("color") || "#D9D9D9");
      tip.setAttribute("alpha", "true");
      tip.setAttribute("selected", "");
    }
    tip.addEventListener("input", this.#handleColorTipInput);
    tip.addEventListener("change", this.#handleColorTipChange);
    tip.addEventListener("add", this.#handleColorTipControl);
    tip.addEventListener("remove", this.#handleColorTipControl);
    this.appendChild(tip);
    this.#colorTip = tip;
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

  #handleColorTipInput = (e) => {
    e.stopPropagation();
    if (e.detail?.color) this.setAttribute("color", e.detail.color);
  };

  #handleColorTipChange = (e) => {
    e.stopPropagation();
    if (e.detail?.color) this.setAttribute("color", e.detail.color);
  };

  #handleColorTipControl = (e) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(e.type, { bubbles: true, composed: true }),
    );
  };

  #positionDetail(containerRect) {
    const hw = this.offsetWidth / 2;
    const hh = this.offsetHeight / 2;
    const x = parseFloat(this.style.left) || 0;
    const y = parseFloat(this.style.top) || 0;
    const px = containerRect.width > 0 ? (x + hw) / containerRect.width : 0;
    const py = containerRect.height > 0 ? (y + hh) / containerRect.height : 0;
    return { x, y, px, py };
  }
}
customElements.define("fig-handle", FigHandle);
