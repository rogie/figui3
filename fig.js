function figUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
function figSupportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}

/**
 * A custom button element that supports different types and states.
 * @attr {string} type - The button type: "button" (default), "toggle", or "submit"
 * @attr {boolean} selected - Whether the button is in a selected state
 * @attr {boolean} disabled - Whether the button is disabled
 */
class FigButton extends HTMLElement {
  type;
  #selected;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
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
    });
  }

  get type() {
    return this.type;
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
      this.closest("form").dispatchEvent(new Event("submit"));
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
            newValue === "true" ||
            (newValue === undefined && newValue !== null);
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
window.customElements.define("fig-button", FigButton);

/**
 * A custom dropdown/select element.
 * @attr {string} type - The dropdown type: "select" (default) or "dropdown"
 * @attr {string} value - The currently selected value
 */
class FigDropdown extends HTMLElement {
  constructor() {
    super();
    this.select = document.createElement("select");
    this.optionsSlot = document.createElement("slot");
    this.attachShadow({ mode: "open" });
  }

  #addEventListeners() {
    this.select.addEventListener("input", this.#handleSelectInput.bind(this));
    this.select.addEventListener("change", this.#handleSelectChange.bind(this));
  }

  connectedCallback() {
    this.type = this.getAttribute("type") || "select";

    this.appendChild(this.select);
    this.shadowRoot.appendChild(this.optionsSlot);

    this.optionsSlot.addEventListener("slotchange", this.slotChange.bind(this));

    this.#addEventListeners();
  }

  slotChange() {
    while (this.select.firstChild) {
      this.select.firstChild.remove();
    }

    if (this.type === "dropdown") {
      const hiddenOption = document.createElement("option");
      hiddenOption.setAttribute("hidden", "true");
      hiddenOption.setAttribute("selected", "true");
      this.select.appendChild(hiddenOption);
    }
    this.optionsSlot.assignedNodes().forEach((option) => {
      if (option.nodeName === "OPTION" || option.nodeName === "OPTGROUP") {
        this.select.appendChild(option.cloneNode(true));
      }
    });
    this.#syncSelectedValue(this.value);
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
  }

  #handleSelectInput(e) {
    this.value = e.target.value;
    this.setAttribute("value", this.value);
  }
  #handleSelectChange() {
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
  }
  focus() {
    this.select.focus();
  }
  blur() {
    this.select.blur();
  }
  get value() {
    return this.select?.value;
  }
  set value(value) {
    this.setAttribute("value", value);
  }
  static get observedAttributes() {
    return ["value", "type"];
  }
  #syncSelectedValue(value) {
    if (this.select) {
      this.select.querySelectorAll("option").forEach((o, i) => {
        if (o.value === this.getAttribute("value")) {
          this.select.selectedIndex = i;
        }
      });
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.#syncSelectedValue(newValue);
    }
    if (name === "type") {
      this.type = newValue;
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
  #boundHideOnChromeOpen;
  #boundHideOnDragStart;
  #touchTimeout;
  #isTouching = false;
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    let delay = parseInt(this.getAttribute("delay"));
    this.delay = !isNaN(delay) ? delay : 500;

    // Bind methods that will be used as event listeners
    this.#boundHideOnChromeOpen = this.#hideOnChromeOpen.bind(this);
    this.#boundHideOnDragStart = this.hidePopup.bind(this);
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
      true
    );
    // Remove mousedown listener
    this.removeEventListener("mousedown", this.#boundHideOnDragStart);

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
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.display = "inline-flex";
    this.popup.style.pointerEvents = "none";
    this.popup.append(content);
    content.innerText = this.getAttribute("text");
    document.body.append(this.popup);
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
    if (this.popup) {
      this.popup.remove();
    }
    document.body.addEventListener("click", this.hidePopupOutsideClick);
  }
  isTouchDevice() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  setupEventListeners() {
    if (this.action === "hover") {
      if (!this.isTouchDevice()) {
        this.addEventListener("pointerenter", this.showDelayedPopup.bind(this));
        this.addEventListener(
          "pointerleave",
          this.#handlePointerLeave.bind(this)
        );
      }
      // Add mousedown listener instead of dragstart
      this.addEventListener("mousedown", this.#boundHideOnDragStart);

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
      document.body.addEventListener(
        "click",
        this.hidePopupOutsideClick.bind(this)
      );

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

  showDelayedPopup() {
    this.render();
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.showPopup.bind(this), this.delay);
  }

  showPopup() {
    const rect = this.firstElementChild.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    const offset = this.getOffset();

    // Position the tooltip above the element
    let top = rect.top - popupRect.height - offset.top;
    let left = rect.left + (rect.width - popupRect.width) / 2;
    this.popup.setAttribute("position", "top");

    // Adjust if tooltip would go off-screen
    if (top < 0) {
      this.popup.setAttribute("position", "bottom");
      top = rect.bottom + offset.bottom; // Position below instead
    }
    if (left < offset.left) {
      left = offset.left;
    } else if (left + popupRect.width > window.innerWidth - offset.right) {
      left = window.innerWidth - popupRect.width - offset.right;
    }

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
    this.popup.style.opacity = "1";
    this.popup.style.visibility = "visible";
    this.popup.style.display = "block";
    this.popup.style.pointerEvents = "all";
    this.popup.style.zIndex = parseInt(new Date().getTime() / 1000);

    this.isOpen = true;
  }

  hidePopup() {
    clearTimeout(this.timeout);
    clearTimeout(this.#touchTimeout);
    this.popup.style.opacity = "0";
    this.popup.style.display = "block";
    this.popup.style.pointerEvents = "none";
    this.destroy();
    this.isOpen = false;
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
    return ["action", "delay", "open"];
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

/* Popover */
/**
 * A custom popover element extending FigTooltip.
 * @attr {string} action - The trigger action: "click" (default) or "hover"
 * @attr {string} size - The size of the popover
 */
class FigPopover extends FigTooltip {
  constructor() {
    super();
    this.action = this.getAttribute("action") || "click";
    this.delay = parseInt(this.getAttribute("delay")) || 0;
  }
  render() {
    this.popup = this.popup || this.querySelector("[popover]");
    this.popup.setAttribute("class", "fig-popover");
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.display = "inline-flex";
    document.body.append(this.popup);
  }
}
customElements.define("fig-popover", FigPopover);

/* Dialog */
/**
 * A custom dialog element for modal and non-modal dialogs.
 * @attr {boolean} open - Whether the dialog is visible
 * @attr {boolean} modal - Whether the dialog should be modal
 */
class FigDialog extends HTMLDialogElement {
  connectedCallback() {
    this.modal =
      this.hasAttribute("modal") && this.getAttribute("modal") !== "false";
    requestAnimationFrame(() => {
      this.#addCloseListeners();
    });
  }

  #addCloseListeners() {
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      button.removeEventListener("click", this.close);
      button.addEventListener("click", this.close.bind(this));
    });
  }
}
customElements.define("fig-dialog", FigDialog, { extends: "dialog" });

class FigPopover2 extends HTMLElement {
  #popover;
  #trigger;
  #id;
  #delay;
  #timeout;
  #action;

  constructor() {
    super();
  }
  connectedCallback() {
    this.#popover = this.querySelector("[popover]");
    this.#trigger = this;
    this.#delay = Number(this.getAttribute("delay")) || 0;
    this.#action = this.getAttribute("trigger-action") || "click";
    this.#id = `tooltip-${figUniqueId()}`;
    if (this.#popover) {
      this.#popover.setAttribute("id", this.#id);
      this.#popover.setAttribute("role", "tooltip");
      this.#popover.setAttribute("popover", "manual");
      this.#popover.style["position-anchor"] = `--${this.#id}`;

      this.#trigger.setAttribute("popovertarget", this.#id);
      this.#trigger.setAttribute("popovertargetaction", "toggle");
      this.#trigger.style["anchor-name"] = `--${this.#id}`;

      if (this.#action === "hover") {
        this.#trigger.addEventListener("mouseover", this.handleOpen.bind(this));
        this.#trigger.addEventListener("mouseout", this.handleClose.bind(this));
      } else {
        this.#trigger.addEventListener("click", this.handleToggle.bind(this));
      }

      document.body.append(this.#popover);
    }
  }

  handleClose() {
    clearTimeout(this.#timeout);
    this.#popover.hidePopover();
  }
  handleToggle() {
    if (this.#popover.matches(":popover-open")) {
      this.handleClose();
    } else {
      this.handleOpen();
    }
  }
  handleOpen() {
    clearTimeout(this.#timeout);
    this.#timeout = setTimeout(() => {
      this.#popover.showPopover();
    }, this.#delay);
  }
}
window.customElements.define("fig-popover-2", FigPopover2);

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
    this.addEventListener("click", this.handleClick.bind(this));

    requestAnimationFrame(() => {
      if (typeof this.getAttribute("content") === "string") {
        this.content = document.querySelector(this.getAttribute("content"));
        if (this.#selected) {
          this.content.style.display = "block";
        } else {
          this.content.style.display = "none";
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
      if (this?.content) {
        this.content.style.display = this.#selected ? "block" : "none";
      }
    }
  }
}
window.customElements.define("fig-tab", FigTab);

/**
 * A custom tabs container element.
 * @attr {string} name - Identifier for the tabs group
 */
class FigTabs extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.name = this.getAttribute("name") || "tabs";
    this.addEventListener("click", this.handleClick.bind(this));
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }
  handleClick(event) {
    const target = event.target;
    if (target.nodeName.toLowerCase() === "fig-tab") {
      const tabs = this.querySelectorAll("fig-tab");
      for (const tab of tabs) {
        if (tab === target) {
          this.selectedTab = tab;
        } else {
          tab.removeAttribute("selected");
        }
      }
    }
  }
}
window.customElements.define("fig-tabs", FigTabs);

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
window.customElements.define("fig-segment", FigSegment);

/**
 * A custom segmented control container element.
 * @attr {string} name - Identifier for the segmented control group
 */
class FigSegmentedControl extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.name = this.getAttribute("name") || "segmented-control";
    this.addEventListener("click", this.handleClick.bind(this));
  }
  handleClick(event) {
    const target = event.target;
    if (target.nodeName.toLowerCase() === "fig-segment") {
      const segments = this.querySelectorAll("fig-segment");
      for (const segment of segments) {
        if (segment === target) {
          this.selectedSegment = segment;
        } else {
          segment.removeAttribute("selected");
        }
      }
    }
  }
}
window.customElements.define("fig-segmented-control", FigSegmentedControl);

/* Slider */
/**
 * A custom slider input element.
 * @attr {string} type - The slider type: "range", "hue", "delta", "stepper", or "opacity"
 * @attr {number} value - The current value of the slider
 * @attr {number} min - The minimum value
 * @attr {number} max - The maximum value
 * @attr {number} step - The step increment
 * @attr {boolean} text - Whether to show a text input alongside the slider
 * @attr {string} units - The units to display after the value
 * @attr {number} transform - A multiplier for the displayed value
 * @attr {boolean} disabled - Whether the slider is disabled
 * @attr {string} color - The color for the slider track (for opacity type)
 */
class FigSlider extends HTMLElement {
  // Private fields declarations
  #typeDefaults = {
    range: { min: 0, max: 100, step: 1 },
    hue: { min: 0, max: 255, step: 1 },
    delta: { min: -100, max: 100, step: 1 },
    stepper: { min: 0, max: 100, step: 25 },
    opacity: { min: 0, max: 100, step: 0.1, color: "#FF0000" },
  };

  #boundHandleInput;
  #boundHandleTextInput;

  constructor() {
    super();
    this.initialInnerHTML = this.innerHTML;

    // Bind the event handlers
    this.#boundHandleInput = (e) => {
      e.stopPropagation();
      this.#handleInput();
    };

    this.#boundHandleTextInput = (e) => {
      e.stopPropagation();
      this.#handleTextInput();
    };
  }

  #regenerateInnerHTML() {
    this.value = Number(this.getAttribute("value") || 0);
    this.type = this.getAttribute("type") || "range";
    this.text = this.getAttribute("text") || false;
    this.units = this.getAttribute("units") || "";
    this.transform = Number(this.getAttribute("transform") || 1);
    this.disabled = this.getAttribute("disabled") ? true : false;

    const defaults = this.#typeDefaults[this.type];
    this.min = Number(this.getAttribute("min") || defaults.min);
    this.max = Number(this.getAttribute("max") || defaults.max);
    this.step = Number(this.getAttribute("step") || defaults.step);
    this.color = this.getAttribute("color") || defaults?.color;
    this.default = this.getAttribute("default") || this.min;

    if (this.color) {
      this.style.setProperty("--color", this.color);
    }

    let html = "";
    let slider = `<div class="fig-slider-input-container">
                <input 
                    type="range"
                    ${this.disabled ? "disabled" : ""}
                    min="${this.min}"
                    max="${this.max}"
                    step="${this.step}"
                    class="${this.type}"
                    value="${this.value}">
                ${this.initialInnerHTML}
            </div>`;
    if (this.text) {
      html = `${slider}
                    <fig-input-text
                        placeholder="##"
                        type="number"
                        min="${this.min}"
                        max="${this.max}"
                        transform="${this.transform}"
                        step="${this.step}"
                        value="${this.value}">
                        ${
                          this.units
                            ? `<span slot="append">${this.units}</span>`
                            : ""
                        }
                    </fig-input-text>`;
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

      if (this.default) {
        this.style.setProperty(
          "--default",
          this.#calculateNormal(this.default)
        );
      }

      this.datalist = this.querySelector("datalist");
      this.figInputText = this.querySelector("fig-input-text");
      if (this.datalist) {
        this.inputContainer.append(this.datalist);
        this.datalist.setAttribute(
          "id",
          this.datalist.getAttribute("id") || figUniqueId()
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
          `option[value='${this.default}']`
        );
        if (defaultOption) {
          defaultOption.setAttribute("default", "true");
        }
      }
      if (this.figInputText) {
        this.figInputText.removeEventListener(
          "input",
          this.#boundHandleTextInput
        );
        this.figInputText.addEventListener("input", this.#boundHandleTextInput);
      }

      this.#syncValue();
    });
  }

  connectedCallback() {
    this.#regenerateInnerHTML();
  }

  #handleTextInput() {
    if (this.figInputText) {
      this.value = this.input.value = this.figInputText.value;
      this.#syncProperties();
      this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    }
  }
  #calculateNormal(value) {
    let min = Number(this.min);
    let max = Number(this.max);
    return (Number(value) - min) / (max - min);
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
    if (this.figInputText) {
      this.figInputText.setAttribute("value", val);
    }
  }

  #handleInput() {
    this.#syncValue();
    this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
  }

  static get observedAttributes() {
    return [
      "value",
      "step",
      "min",
      "max",
      "type",
      "disabled",
      "color",
      "units",
      "transform",
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
            newValue === "true" ||
            (newValue === undefined && newValue !== null);
          if (this.figInputText) {
            this.figInputText.disabled = this.disabled;
            this.figInputText.setAttribute("disabled", this.disabled);
          }
          break;
        case "value":
          this.value = newValue;
          if (this.figInputText) {
            this.figInputText.setAttribute("value", newValue);
          }
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          if (this.figInputText) {
            this.figInputText.setAttribute("transform", this.transform);
          }
          break;
        case "min":
        case "max":
        case "step":
        case "type":
        case "text":
        case "units":
          this[name] = newValue;
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
window.customElements.define("fig-slider", FigSlider);

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
  #boundMouseMove;
  #boundMouseUp;
  #boundMouseDown;
  #boundInputChange;

  constructor() {
    super();
    // Pre-bind the event handlers once
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = this.#handleMouseUp.bind(this);
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
    this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
  }
  #handleMouseMove(e) {
    if (this.type !== "number") return;
    if (e.altKey) {
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
  }
  #handleMouseDown(e) {
    if (this.type !== "number") return;
    if (e.altKey) {
      this.input.style.cursor =
        this.style.cursor =
        document.body.style.cursor =
          "ew-resize";
      this.style.userSelect = "none";
      // Use the pre-bound handlers
      window.addEventListener("pointermove", this.#boundMouseMove);
      window.addEventListener("pointerup", this.#boundMouseUp);
    }
  }
  #handleMouseUp(e) {
    if (this.type !== "number") return;
    this.input.style.cursor =
      this.style.cursor =
      document.body.style.cursor =
        "";
    this.style.userSelect = "all";
    // Remove the pre-bound handlers
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
  }
  #sanitizeInput(value, transform = true) {
    let sanitized = value;
    if (this.type === "number") {
      sanitized = Number(sanitized);
      if (typeof this.min === "number") {
        sanitized = Math.max(
          transform ? this.#transformNumber(this.min) : this.min,
          sanitized
        );
      }
      if (typeof this.max === "number") {
        sanitized = Math.min(
          transform ? this.#transformNumber(this.max) : this.max,
          sanitized
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
            newValue === "true" ||
            (newValue === undefined && newValue !== null);
          break;
        case "transform":
          if (this.type === "number") {
            this.transform = Number(newValue) || 1;
            this.input.value = this.#transformNumber(this.value);
          }
          break;
        case "value":
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
window.customElements.define("fig-input-text", FigInputText);

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
window.customElements.define("fig-avatar", FigAvatar);

/* Form Field */
class FigField extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    requestAnimationFrame(() => {
      this.label = this.querySelector(":scope>label");
      this.input = Array.from(this.childNodes).find((node) =>
        node.nodeName.toLowerCase().startsWith("fig-")
      );
      if (this.input && this.label) {
        this.label.addEventListener("click", this.focus.bind(this));
        let inputId = this.input.getAttribute("id") || figUniqueId();
        this.input.setAttribute("id", inputId);
        this.label.setAttribute("for", inputId);
      }
    });
  }
  focus() {
    this.input.focus();
  }
}
window.customElements.define("fig-field", FigField);

/* Color swatch */
class FigInputColor extends HTMLElement {
  rgba;
  hex;
  alpha = 100;
  #swatch;
  #textInput;
  #alphaInput;
  constructor() {
    super();
  }
  connectedCallback() {
    this.#setValues(this.getAttribute("value"));

    let html = ``;
    if (this.getAttribute("text")) {
      let label = `<fig-input-text 
        type="text"
        placeholder="#000000"
        value="${this.value}">
      </fig-input-text>`;
      if (this.getAttribute("alpha") === "true") {
        label += `<fig-tooltip text="Opacity">
                    <fig-input-text 
                        placeholder="##" 
                        type="number"
                        min="0"
                        max="100"
                        value="${this.alpha}">
                        <span slot="append">%</slot>
                    </fig-input-text>
                </fig-tooltip>`;
      }
      html = `<div class="input-combo">
                <fig-chit type="color" disabled="false" value="${this.hexOpaque}"></fig-chit>
                ${label}
            </div>`;
    } else {
      html = `<fig-chit type="color" disabled="false" value="${this.hexOpaque}"></fig-chit>`;
    }
    this.innerHTML = html;

    requestAnimationFrame(() => {
      this.#swatch = this.querySelector("fig-chit[type=color]");
      this.#textInput = this.querySelector("fig-input-text:not([type=number])");
      this.#alphaInput = this.querySelector("fig-input-text[type=number]");

      this.#swatch.disabled = this.hasAttribute("disabled");
      this.#swatch.addEventListener("input", this.#handleInput.bind(this));

      if (this.#textInput) {
        this.#textInput.value = this.#swatch.value = this.rgbAlphaToHex(
          this.rgba,
          1
        );
        this.#textInput.addEventListener(
          "input",
          this.#handleTextInput.bind(this)
        );
        this.#textInput.addEventListener(
          "change",
          this.#handleChange.bind(this)
        );
      }

      if (this.#alphaInput) {
        this.#alphaInput.addEventListener(
          "input",
          this.#handleAlphaInput.bind(this)
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
      this.rgba.a
    );
    this.hexWithAlpha = this.value.toUpperCase();
    this.hexOpaque = this.hexWithAlpha.slice(0, 7);
    if (hexValue.length > 7) {
      this.alpha = (this.rgba.a * 100).toFixed(0);
    }
    this.style.setProperty("--alpha", this.rgba.a);
  }

  #handleTextInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    this.#setValues(event.target.value);
    if (this.#alphaInput) {
      this.#alphaInput.setAttribute("value", this.alpha);
    }
    if (this.#swatch) {
      this.#swatch.setAttribute("value", this.hexOpaque);
    }
    this.#emitInputEvent();
  }

  #handleAlphaInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    const alpha = Math.round((event.target.value / 100) * 255);
    const alphaHex = alpha.toString(16).padStart(2, "0");
    this.#setValues(this.hexOpaque + alphaHex);
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
      this.#textInput.setAttribute("value", this.value);
    }
    this.#emitInputEvent();
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
    return ["value", "style"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        this.#setValues(newValue);
        if (this.#textInput) {
          this.#textInput.setAttribute("value", this.value);
        }
        if (this.#swatch) {
          this.#swatch.setAttribute("value", this.hexOpaque);
        }
        if (this.#alphaInput) {
          this.#alphaInput.setAttribute("value", this.alpha);
        }
        this.#emitInputEvent();
        break;
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
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/
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
        /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*(\d+(?:\.\d+)?))?\)/
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
window.customElements.define("fig-input-color", FigInputColor);

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
  constructor() {
    super();
    this.input = document.createElement("input");
    this.name = this.getAttribute("name") || "checkbox";
    this.value = this.getAttribute("value") || "";
    this.input.setAttribute("id", figUniqueId());
    this.input.setAttribute("name", this.name);
    this.input.setAttribute("type", "checkbox");
    this.labelElement = document.createElement("label");
    this.labelElement.setAttribute("for", this.input.id);
  }
  connectedCallback() {
    this.checked = this.input.checked =
      this.hasAttribute("checked") && this.getAttribute("checked") !== "false";
    this.input.addEventListener("change", this.handleInput.bind(this));

    if (this.hasAttribute("disabled")) {
      this.input.disabled = true;
    }
    if (this.hasAttribute("indeterminate")) {
      this.input.indeterminate = true;
      this.input.setAttribute("indeterminate", "true");
    }

    this.append(this.input);
    this.append(this.labelElement);

    this.render();
  }
  static get observedAttributes() {
    return ["disabled", "label", "checked", "name", "value"];
  }

  render() {}

  focus() {
    this.input.focus();
  }

  disconnectedCallback() {
    this.input.remove();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        this.labelElement.innerText = newValue;
        break;
      case "checked":
        this.checked = this.input.checked =
          this.hasAttribute("checked") &&
          this.getAttribute("checked") !== "false";

        break;
      default:
        this.input[name] = newValue;
        this.input.setAttribute(name, newValue);
        break;
    }
  }

  handleInput(e) {
    this.input.indeterminate = false;
    this.input.removeAttribute("indeterminate");
    this.value = this.input.value;
    this.checked = this.input.checked;
  }
}
window.customElements.define("fig-checkbox", FigCheckbox);

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
window.customElements.define("fig-radio", FigRadio);

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
  }
}
window.customElements.define("fig-switch", FigSwitch);

/* Bell */
class FigBell extends HTMLElement {
  constructor() {
    super();
  }
}
window.customElements.define("fig-bell", FigBell);

/* Badge */
class FigBadge extends HTMLElement {
  constructor() {
    super();
  }
}
window.customElements.define("fig-badge", FigBadge);

/* Accordion */
class FigAccordion extends HTMLElement {
  constructor() {
    super();
  }
}
window.customElements.define("fig-accordion", FigAccordion);

/* Combo Input */
/**
 * A custom combo input with text and dropdown.
 * @attr {string} options - Comma-separated list of dropdown options
 * @attr {string} placeholder - Placeholder text for the input
 * @attr {string} value - The current input value
 */
class FigComboInput extends HTMLElement {
  constructor() {
    super();
  }
  getOptionsFromAttribute() {
    return (this.getAttribute("options") || "").split(",");
  }
  connectedCallback() {
    this.options = this.getOptionsFromAttribute();
    this.placeholder = this.getAttribute("placeholder") || "";
    this.value = this.getAttribute("value") || "";
    this.innerHTML = `<div class="input-combo">
                        <fig-input-text placeholder="${this.placeholder}">
                        </fig-input-text> 
                        <fig-button type="select" variant="input" icon>
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
  <path d='M5.87868 7.12132L8 9.24264L10.1213 7.12132' stroke='currentColor' stroke-opacity="0.9" stroke-linecap='round'/>
</svg>
                            <fig-dropdown type="dropdown">
                              ${this.options
                                .map((option) => `<option>${option}</option>`)
                                .join("")}
                            </fig-dropdown>
                        </fig-button>
                    </div>`;
    requestAnimationFrame(() => {
      this.input = this.querySelector("fig-input-text");
      this.dropdown = this.querySelector("fig-dropdown");

      this.dropdown.addEventListener(
        "input",
        this.handleSelectInput.bind(this)
      );
    });
  }
  handleSelectInput(e) {
    this.setAttribute("value", e.target.closest("fig-dropdown").value);
  }
  handleInput(e) {
    this.value = this.input.value;
  }
  static get observedAttributes() {
    return ["options", "placeholder", "value"];
  }
  focus() {
    this.input.focus();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "options") {
      this.options = newValue.split(",");
      if (this.dropdown) {
        this.dropdown.innerHTML = this.options
          .map((option) => `<option>${option}</option>`)
          .join("");
      }
    }
    if (name === "placeholder") {
      this.placeholder = newValue;
    }
    if (name === "value") {
      this.value = newValue;
      this.input.setAttribute("value", newValue);
    }
  }
}
window.customElements.define("fig-combo-input", FigComboInput);

/* Chit */
/**
 * A custom color/image chip element.
 * @attr {string} type - The chip type: "color" or "image"
 * @attr {string} src - Image source URL (for image type)
 * @attr {string} value - Color value (for color type)
 * @attr {string} size - Size of the chip: "small" (default) or "large"
 * @attr {boolean} disabled - Whether the chip is disabled
 */
class FigChit extends HTMLElement {
  #src = null;
  constructor() {
    super();
  }
  connectedCallback() {
    this.type = this.getAttribute("type") || "color";
    this.#src = this.getAttribute("src") || "";
    this.value = this.getAttribute("value") || "#000000";
    this.size = this.getAttribute("size") || "small";
    this.disabled = this.getAttribute("disabled") === "true";
    this.innerHTML = `<input type="color" value="${this.value}" />`;
    this.#updateSrc(this.src);

    requestAnimationFrame(() => {
      this.input = this.querySelector("input");
    });
  }
  #updateSrc(src) {
    if (src) {
      this.#src = src;
      this.style.setProperty("--src", `url(${src})`);
    } else {
      this.style.removeProperty("--src");
      this.#src = null;
    }
  }
  static get observedAttributes() {
    return ["src", "value", "disabled"];
  }
  get src() {
    return this.#src;
  }
  set src(value) {
    this.#src = value;
    this.setAttribute("src", value);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "src":
        this.#updateSrc(newValue);
        break;
      case "disabled":
        this.disabled = newValue.toLowerCase() === "true";
        break;
      default:
        if (this.input) {
          this.input[name] = newValue;
        }
        this.#updateSrc(this.src);
        break;
    }
  }
}
window.customElements.define("fig-chit", FigChit);

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
  constructor() {
    super();
  }
  #getInnerHTML() {
    return `<fig-chit type="image" size="large" ${
      this.src ? `src="${this.src}"` : ""
    } disabled="true"></fig-chit><div>${
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
    this.upload = this.getAttribute("upload") === "true";
    this.download = this.getAttribute("download") === "true";
    this.label = this.getAttribute("label") || "Upload";
    this.size = this.getAttribute("size") || "small";
    this.innerHTML = this.#getInnerHTML();
    this.#updateRefs();
  }
  disconnectedCallback() {
    this.fileInput.removeEventListener(
      "change",
      this.#handleFileInput.bind(this)
    );
  }

  #updateRefs() {
    requestAnimationFrame(() => {
      this.chit = this.querySelector("fig-chit");
      if (this.upload) {
        this.uploadButton = this.querySelector("fig-button[type='upload']");
        this.fileInput = this.uploadButton?.querySelector("input");
        this.fileInput.removeEventListener(
          "change",
          this.#handleFileInput.bind(this)
        );
        this.fileInput.addEventListener(
          "change",
          this.#handleFileInput.bind(this)
        );
      }
      if (this.download) {
        this.downloadButton = this.querySelector("fig-button[type='download']");
        this.downloadButton.removeEventListener(
          "click",
          this.#handleDownload.bind(this)
        );
        this.downloadButton.addEventListener(
          "click",
          this.#handleDownload.bind(this)
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
        this.style.setProperty(
          "--aspect-ratio",
          `${this.image.width}/${this.image.height}`
        );
        this.dispatchEvent(
          new CustomEvent("loaded", {
            bubbles: true,
            cancelable: true,
            detail: {
              blob: this.blob,
              base64: this.base64,
            },
          })
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
          this.blob = URL.createObjectURL(blob);
        });
      };
      this.image.src = src;
    });
  }
  async #handleFileInput(e) {
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
      })
    );
    //emit for change too
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      })
    );
    this.setAttribute("src", this.blob);
  }
  static get observedAttributes() {
    return ["src", "upload"];
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
      //this.src = newValue;
      if (this.chit) {
        this.chit.setAttribute("src", this.#src);
      }
      if (this.#src) {
        this.#loadImage(this.#src);
      }
    }
    if (name === "upload" || name === "download") {
      this.upload = newValue.toLowerCase() === "true";
      this.download = newValue.toLowerCase() === "true";
      this.innerHTML = this.#getInnerHTML();
      this.#updateRefs();
    }
    if (name === "size") {
      this.size = newValue;
    }
  }
}
window.customElements.define("fig-image", FigImage);

/**
 * A custom joystick input element.
 * @attr {string} value - The current position of the joystick (e.g., "0.5,0.5").
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {number} transform - A scaling factor for the output.
 * @attr {boolean} text - Whether to display text inputs for X and Y values.
 */
class FigInputJoystick extends HTMLElement {
  constructor() {
    super();

    this.position = { x: 0.5, y: 0.5 };
    this.value = [0.5, 0.5];
    this.isDragging = false;
    this.isShiftHeld = false;
    this.plane = null;
    this.cursor = null;
    this.xInput = null;
    this.yInput = null;

    // Initialize position
    requestAnimationFrame(() => {
      this.precision = this.getAttribute("precision") || 3;
      this.precision = parseInt(this.precision);
      this.transform = this.getAttribute("transform") || 1;
      this.transform = Number(this.transform);
      this.text = this.getAttribute("text") === "true";

      this.#render();

      this.#setupListeners();

      this.#syncHandlePosition();
      if (this.text && this.xInput && this.yInput) {
        this.xInput.setAttribute(
          "value",
          this.position.x.toFixed(this.precision)
        );
        this.yInput.setAttribute(
          "value",
          this.position.y.toFixed(this.precision)
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
  #getInnerHTML() {
    return `        
          <div class="fig-input-joystick-plane-container" tabindex="0">
            <div class="fig-input-joystick-plane">
              <div class="fig-input-joystick-guides"></div>
              <div class="fig-input-joystick-handle"></div>
            </div>
          </div>
          ${
            this.text
              ? `<fig-input-text 
                  type="number"
                  name="x"
                  step="0.01"
                  value="${this.position.x}"
                  min="0"
                  max="1">
                  <span slot="prepend">X</span>
                </fig-input-text>
                <fig-input-text 
                  type="number" 
                  name="y" 
                  step="0.01" 
                  min="0" 
                  max="1"
                  value="${this.position.y}"> 
                  <span slot="prepend">Y</span>
                </fig-input-text>`
              : ""
          }
        `;
  }

  #setupListeners() {
    this.plane = this.querySelector(".fig-input-joystick-plane");
    this.cursor = this.querySelector(".fig-input-joystick-handle");
    this.xInput = this.querySelector("fig-input-text[name='x']");
    this.yInput = this.querySelector("fig-input-text[name='y']");
    this.plane.addEventListener("mousedown", this.#handleMouseDown.bind(this));
    this.plane.addEventListener(
      "touchstart",
      this.#handleTouchStart.bind(this)
    );
    window.addEventListener("keydown", this.#handleKeyDown.bind(this));
    window.addEventListener("keyup", this.#handleKeyUp.bind(this));
    if (this.text && this.xInput && this.yInput) {
      this.xInput.addEventListener("input", this.#handleXInput.bind(this));
      this.yInput.addEventListener("input", this.#handleYInput.bind(this));
    }
  }

  #cleanupListeners() {
    this.plane.removeEventListener("mousedown", this.#handleMouseDown);
    window.removeEventListener("keydown", this.#handleKeyDown);
    window.removeEventListener("keyup", this.#handleKeyUp);
    if (this.text && this.xInput && this.yInput) {
      this.xInput.removeEventListener("input", this.#handleXInput);
      this.yInput.removeEventListener("input", this.#handleYInput);
    }
  }

  #handleXInput(e) {
    e.stopPropagation();
    this.position.x = Number(e.target.value);
    this.#syncHandlePosition();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleYInput(e) {
    e.stopPropagation();
    this.position.y = Number(e.target.value);
    this.#syncHandlePosition();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #snapToGuide(value) {
    if (!this.isShiftHeld) return value;
    if (value < 0.1) return 0;
    if (value > 0.9) return 1;
    if (value > 0.4 && value < 0.6) return 0.5;
    return value;
  }

  #snapToDiagonal(x, y) {
    if (!this.isShiftHeld) return { x, y };
    const diff = Math.abs(x - y);
    if (diff < 0.1) return { x: (x + y) / 2, y: (x + y) / 2 };
    if (Math.abs(1 - x - y) < 0.1) return { x, y: 1 - x };
    return { x, y };
  }

  #updatePosition(e) {
    const rect = this.plane.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    x = this.#snapToGuide(x);
    y = this.#snapToGuide(y);

    const snapped = this.#snapToDiagonal(x, y);
    this.position = snapped;

    this.cursor.style.left = `${snapped.x * 100}%`;
    this.cursor.style.top = `${snapped.y * 100}%`; // Invert Y for display
    if (this.text && this.xInput && this.yInput) {
      this.xInput.setAttribute("value", snapped.x.toFixed(3));
      this.yInput.setAttribute("value", snapped.y.toFixed(3));
    }

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
      })
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      })
    );
  }

  #syncHandlePosition() {
    if (this.cursor) {
      this.cursor.style.left = `${this.position.x * 100}%`;
      this.cursor.style.top = `${this.position.y * 100}%`;
    }
  }

  #handleMouseDown(e) {
    this.isDragging = true;

    this.#updatePosition(e);

    this.plane.style.cursor = "grabbing";

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updatePosition(e);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      this.plane.style.cursor = "";
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
    this.#updatePosition(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updatePosition(e.touches[0]);
    };

    const handleTouchEnd = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      this.#emitChangeEvent();
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }
  static get observedAttributes() {
    return ["value", "precision", "transform", "text"];
  }
  get value() {
    return [this.position.x, this.position.y];
  }
  set value(value) {
    let v = value.toString().split(",").map(Number);
    this.position = { x: v[0], y: v[1] };
    this.#syncHandlePosition();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.value = newValue;
    }
    if (name === "precision") {
      this.precision = parseInt(newValue);
    }
    if (name === "transform") {
      this.transform = Number(newValue);
    }
    if (name === "text" && newValue !== oldValue) {
      this.text = newValue.toLowerCase() === "true";
      this.#render();
    }
  }
}

customElements.define("fig-input-joystick", FigInputJoystick);

/**
 * A custom angle chooser input element.
 * @attr {number} value - The current angle of the handle in degrees.
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {boolean} text - Whether to display a text input for the angle value.
 * @attr {number} adjacent - The adjacent value of the angle.
 * @attr {number} opposite - The opposite value of the angle.
 */
class FigInputAngle extends HTMLElement {
  // Declare private fields first
  #adjacent;
  #opposite;

  constructor() {
    super();

    this.angle = 0; // Angle in degrees
    this.#adjacent = 1;
    this.#opposite = 0;
    this.isDragging = false;
    this.isShiftHeld = false;
    this.handle = null;
    this.angleInput = null;
    this.plane = null;
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      this.precision = this.getAttribute("precision") || 1;
      this.precision = parseInt(this.precision);
      this.text = this.getAttribute("text") === "true";

      this.#render();

      this.#setupListeners();

      this.#syncHandlePosition();
      if (this.text && this.angleInput) {
        this.angleInput.setAttribute(
          "value",
          this.angle.toFixed(this.precision)
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

  #getInnerHTML() {
    return `
        <div class="fig-input-angle-plane" tabindex="0">
          <div class="fig-input-angle-handle"></div>
        </div>
        ${
          this.text
            ? `<fig-input-text 
                type="number"
                name="angle"
                step="0.1"
                value="${this.angle}"
                min="0"
                max="360">
                <span slot="append">°</span>
              </fig-input-text>`
            : ""
        }
    `;
  }

  #setupListeners() {
    this.handle = this.querySelector(".fig-input-angle-handle");
    this.plane = this.querySelector(".fig-input-angle-plane");
    this.angleInput = this.querySelector("fig-input-text[name='angle']");
    this.plane.addEventListener("mousedown", this.#handleMouseDown.bind(this));
    this.plane.addEventListener(
      "touchstart",
      this.#handleTouchStart.bind(this)
    );
    window.addEventListener("keydown", this.#handleKeyDown.bind(this));
    window.addEventListener("keyup", this.#handleKeyUp.bind(this));
    if (this.text && this.angleInput) {
      this.angleInput = this.querySelector("fig-input-text");
      this.angleInput.addEventListener(
        "input",
        this.#handleAngleInput.bind(this)
      );
    }
  }

  #cleanupListeners() {
    this.plane.removeEventListener("mousedown", this.#handleMouseDown);
    this.plane.removeEventListener("touchstart", this.#handleTouchStart);
    window.removeEventListener("keydown", this.#handleKeyDown);
    window.removeEventListener("keyup", this.#handleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#handleAngleInput);
    }
  }

  #handleAngleInput(e) {
    e.stopPropagation();
    this.angle = Number(e.target.value);
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #calculateAdjacentAndOpposite() {
    const radians = (this.angle * Math.PI) / 180;
    this.#adjacent = Math.cos(radians);
    this.#opposite = Math.sin(radians);
  }

  #snapToIncrement(angle) {
    if (!this.isShiftHeld) return angle;
    const increment = 45;
    return Math.round(angle / increment) * increment;
  }

  #updateAngle(e) {
    const rect = this.plane.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    let angle = ((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 360) % 360;

    angle = this.#snapToIncrement(angle);
    this.angle = angle;

    this.#calculateAdjacentAndOpposite();

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
      })
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      })
    );
  }

  #syncHandlePosition() {
    if (this.handle) {
      const radians = (this.angle * Math.PI) / 180;
      const radius = this.plane.offsetWidth / 2 - this.handle.offsetWidth / 2;
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      this.handle.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  #handleMouseDown(e) {
    this.isDragging = true;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
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
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const handleTouchEnd = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      this.#emitChangeEvent();
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }

  static get observedAttributes() {
    return ["value", "precision", "text"];
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
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.value = Number(newValue);
    }
    if (name === "precision") {
      this.precision = parseInt(newValue);
    }
    if (name === "text" && newValue !== oldValue) {
      this.text = newValue.toLowerCase() === "true";
      this.#render();
    }
  }
}
customElements.define("fig-input-angle", FigInputAngle);
