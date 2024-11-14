function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
function supportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}

/* Button */
class FigButton extends HTMLElement {
  #type;
  #selected;
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.render();
  }
  render() {
    this.#type = this.getAttribute("type") || "button";
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
            <button type="${this.#type}">
                <slot></slot>
            </button>
            `;

    this.#selected =
      this.hasAttribute("selected") &&
      this.getAttribute("selected") !== "false";
    this.addEventListener("click", this.handleClick.bind(this));

    this.button = this.querySelector("button");
  }
  get type() {
    return this.#type;
  }
  set type(value) {
    this.#type = value;
    this.button.type = value;
    this.setAttribute("type", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.#selected = value;
    this.setAttribute("selected", value);
  }

  handleClick(event) {
    if (this.#type === "toggle") {
      this.selected = !this.#selected;
    }
    if (this.#type === "submit") {
      this.button.click();
    }
  }
  static get observedAttributes() {
    return ["disabled"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.button) {
      this.button[name] = newValue;
      if (newValue === "false") {
        this.button.removeAttribute(name);
      }
    }
  }
}
window.customElements.define("fig-button", FigButton);

/* Dropdown */
class FigDropdown extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.select = document.createElement("select");
    this.optionsSlot = document.createElement("slot");

    this.appendChild(this.select);
    this.shadowRoot.appendChild(this.optionsSlot);

    // Move slotted options into the select element
    this.optionsSlot.addEventListener("slotchange", this.slotChange.bind(this));
  }
  slotChange() {
    while (this.select.firstChild) {
      this.select.firstChild.remove();
    }
    this.optionsSlot.assignedNodes().forEach((node) => {
      if (node.nodeName === "OPTION") {
        this.select.appendChild(node.cloneNode(true));
      }
    });
  }
}

customElements.define("fig-dropdown", FigDropdown);

/* Tooltip */
class FigTooltip extends HTMLElement {
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    this.delay = parseInt(this.getAttribute("delay")) || 500;
    this.isOpen = false;
  }
  connectedCallback() {
    this.setup();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.destroy();
  }

  setup() {}

  render() {
    this.destroy();
    this.popup = document.createElement("span");
    this.popup.setAttribute("class", "fig-tooltip");
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.pointerEvents = "none";
    this.popup.innerText = this.getAttribute("text");
    document.body.append(this.popup);
  }

  destroy() {
    if (this.popup) {
      this.popup.remove();
    }
    document.body.addEventListener("click", this.hidePopupOutsideClick);
  }

  setupEventListeners() {
    if (this.action === "hover") {
      this.addEventListener("mouseenter", this.showDelayedPopup.bind(this));
      this.addEventListener("mouseleave", this.hidePopup.bind(this));
    } else if (this.action === "click") {
      this.addEventListener("click", this.showDelayedPopup.bind(this));
      document.body.addEventListener(
        "click",
        this.hidePopupOutsideClick.bind(this)
      );
    }
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
    const rect = this.getBoundingClientRect();
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
}

customElements.define("fig-tooltip", FigTooltip);

/* Popover */
class FigPopover extends FigTooltip {
  static observedAttributes = ["action", "size"];

  constructor() {
    super();
    this.action = this.getAttribute("action") || "click";
    this.delay = parseInt(this.getAttribute("delay")) || 0;
  }
  render() {
    //this.destroy()
    //if (!this.popup) {
    this.popup = this.popup || this.querySelector("[popover]");
    this.popup.setAttribute("class", "fig-popover");
    this.popup.style.position = "fixed";
    this.popup.style.display = "block";
    this.popup.style.pointerEvents = "none";
    document.body.append(this.popup);
    //}
  }

  destroy() {}
}
customElements.define("fig-popover", FigPopover);

/* Dialog */
class FigDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.dialog = document.createElement("dialog");
    this.contentSlot = document.createElement("slot");
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.contentSlot.removeEventListener("slotchange", this.slotChange);
  }

  render() {
    this.appendChild(this.dialog);
    this.shadowRoot.appendChild(this.contentSlot);
    this.contentSlot.addEventListener("slotchange", this.slotChange.bind(this));
  }

  slotChange() {
    while (this.dialog.firstChild) {
      this.dialog.firstChild.remove();
    }
    this.contentSlot.assignedNodes().forEach((node) => {
      if (node !== this.dialog) {
        this.dialog.appendChild(node.cloneNode(true));
      }
    });
  }

  static get observedAttributes() {
    return ["open"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "open":
        if (this?.show) {
          this[newValue === "true" ? "show" : "close"]();
        }
        break;
    }
  }

  /* Public methods */
  show() {
    console.log("show dialog", this.dialog, this.dialog?.show);
    this.dialog.show();
  }
  close() {
    this.dialog.close();
  }
}
customElements.define("fig-dialog", FigDialog);

/*
class FigDialog extends FigTooltip {

    constructor() {
        super()
        this.action = this.getAttribute("action") || "click"
        this.delay = parseInt(this.getAttribute("delay")) || 0
        this.dialog = document.createElement("dialog")
        this.header = document.createElement("fig-header")
        this.header.innerHTML = `<span>${this.getAttribute("title") || "Title"}</span>`
        if (this.getAttribute("closebutton") !== "false") {
            this.closeButton = document.createElement("fig-button")
            this.closeButton.setAttribute("icon", "true")
            this.closeButton.setAttribute("variant", "ghost")
            this.closeButton.setAttribute("fig-dialog-close", "true")
            let closeIcon = document.createElement("fig-icon")
            closeIcon.setAttribute("class", "close")
            this.closeButton.append(closeIcon)
            this.header.append(this.closeButton)
        }
        this.dialog.append(this.header)
    }
    render() {
        this.popup = this.popup || this.dialog
        document.body.append(this.popup)
    }
    setup() {
        this.dialog.querySelectorAll("[fig-dialog-close]").forEach(e => e.addEventListener("click", this.hidePopup.bind(this)))
        this.dialog.append(this.querySelector("fig-content") || "")
    }
    hidePopup() {
        this.popup.close()
    }
    showPopup() {
        this.popup.style.zIndex = parseInt((new Date()).getTime() / 1000)
        if (this.getAttribute("modal") === "true") {
            this.popup.showModal()
        } else {
            this.popup.show()
        }
    }
    destroy() {

    }
}
customElements.define("fig-dialog", FigDialog);
*/

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
    this.#id = `tooltip-${uniqueId()}`;
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
class FigTab extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.setAttribute("label", this.innerText);
    this.addEventListener("click", this.handleClick.bind(this));
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }
  handleClick() {
    this.setAttribute("selected", "true");
  }
}
window.customElements.define("fig-tab", FigTab);

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
class FigSlider extends HTMLElement {
  #typeDefaults = {
    range: { min: 0, max: 100, step: 1 },
    hue: { min: 0, max: 255, step: 1 },
    delta: { min: -100, max: 100, step: 1 },
    stepper: { min: 0, max: 100, step: 25 },
    opacity: { min: 0, max: 1, step: 0.01, color: "#FF0000" },
  };
  constructor() {
    super();
  }
  connectedCallback() {
    this.value = this.getAttribute("value");
    this.default = this.getAttribute("default") || null;
    this.type = this.getAttribute("type") || "range";

    const defaults = this.#typeDefaults[this.type];
    this.min = this.getAttribute("min") || defaults.min;
    this.max = this.getAttribute("max") || defaults.max;
    this.step = this.getAttribute("step") || defaults.step;
    this.color = this.getAttribute("color") || defaults?.color;
    this.disabled = this.getAttribute("disabled") ? true : false;

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
                ${this.innerHTML}
            </div>`;
    if (this.getAttribute("text")) {
      html = `${slider}
                    <fig-input-text
                        placeholder="##"
                        type="number"
                        min="${this.min}"
                        max="${this.max}"
                        step="${this.step}"
                        value="${this.value}">
                    </fig-input-text>`;
    } else {
      html = slider;
    }

    this.innerHTML = html;

    //child nodes hack
    requestAnimationFrame(() => {
      this.input = this.querySelector("[type=range]");
      this.input.addEventListener("input", this.handleInput.bind(this));
      this.handleInput();

      if (this.default) {
        this.style.setProperty("--default", this.calculateNormal(this.default));
      }

      this.datalist = this.querySelector("datalist");
      this.textInput = this.querySelector("input[type=number]");
      if (this.datalist) {
        this.datalist.setAttribute(
          "id",
          this.datalist.getAttribute("id") || uniqueId()
        );
        this.input.setAttribute("list", this.datalist.getAttribute("id"));
      }
      if (this.textInput) {
        this.textInput.addEventListener(
          "input",
          this.handleTextInput.bind(this)
        );
      }
    });
  }
  static get observedAttributes() {
    return ["value", "step", "min", "max", "type", "disabled"];
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
        case "type":
          this.input.className = newValue;
          break;
        case "disabled":
          this.disabled = this.input.disabled =
            newValue === "true" ||
            (newValue === undefined && newValue !== null);
          if (this.textInput) {
            this.textInput.disabled = this.disabled;
          }
          break;
        default:
          this[name] = this.input[name] = newValue;
          if (this.textInput) {
            this.textInput.setAttribute(name, newValue);
          }
          this.handleInput();
          break;
      }
    }
  }
  handleTextInput() {
    if (this.textInput) {
      this.input.value = Number(this.textInput.value);
      this.handleInput();
    }
  }
  calculateNormal(value) {
    let min = Number(this.input.min);
    let max = Number(this.input.max);
    let val = Number(value);
    return (val - min) / (max - min);
  }

  handleInput() {
    let val = Number(this.input.value);
    console.log(val);
    this.value = val;
    let complete = this.calculateNormal(val);
    let defaultValue = this.calculateNormal(this.default);
    this.style.setProperty("--slider-complete", complete);
    this.style.setProperty("--default", defaultValue);
    this.style.setProperty("--unchanged", complete === defaultValue ? 1 : 0);
    if (this.textInput) {
      this.textInput.value = val;
    }
  }
}
window.customElements.define("fig-slider", FigSlider);

class FigInputText extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.multiline = this.hasAttribute("multiline") || false;
    this.value = this.getAttribute("value");
    this.type = this.getAttribute("type") || "text";
    this.placeholder = this.getAttribute("placeholder");

    let html = `<input 
      type="${this.type}" 
      placeholder="${this.placeholder}"
      value="${this.value}" />`;
    if (this.multiline) {
      html = `<textarea  
      placeholder="${this.placeholder}">${this.value}</textarea>`;
    }
    this.innerHTML = html;

    //child nodes hack
    requestAnimationFrame(() => {
      const append = this.querySelector("[slot=append]");
      const prepend = this.querySelector("[slot=prepend]");

      console.log(append, prepend);

      if (prepend) {
        prepend.addEventListener("click", this.focus.bind(this));
        this.prepend(prepend);
      }
      if (append) {
        append.addEventListener("click", this.focus.bind(this));
        this.append(append);
      }

      this.input = this.querySelector("input,textarea");

      if (this.getAttribute("min")) {
        this.input.setAttribute("min", this.getAttribute("min"));
      }
      if (this.getAttribute("max")) {
        this.input.setAttribute("max", this.getAttribute("max"));
      }
      if (this.getAttribute("step")) {
        this.input.setAttribute("step", this.getAttribute("step"));
      }
      this.input.addEventListener("input", this.handleInput.bind(this));
    });
  }
  focus() {
    this.input.focus();
  }
  handleInput() {
    this.value = this.input.value;
  }

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
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "label":
          this.disabled = this.input.disabled = newValue;
          break;
        default:
          this[name] = this.input[name] = newValue;
          this.input.setAttribute(name, newValue);
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
      this.img.setAttribute("alt", newValue);
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
      this.label = this.querySelector("label");
      this.input = Array.from(this.childNodes).find((node) =>
        node.nodeName.toLowerCase().startsWith("fig-")
      );
      if (this.input && this.label) {
        this.label.addEventListener("click", this.focus.bind(this));
        let inputId = this.input.getAttribute("id") || uniqueId();
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
  #rgba;
  #swatch;
  textInput;
  #alphaInput;
  constructor() {
    super();
  }
  connectedCallback() {
    this.#rgba = this.convertToRGBA(this.getAttribute("value"));
    const alpha = (this.#rgba.a * 100).toFixed(0);
    this.value = this.rgbAlphaToHex(
      {
        r: this.#rgba.r,
        g: this.#rgba.g,
        b: this.#rgba.b,
      },
      alpha
    );
    let html = ``;
    if (this.getAttribute("text")) {
      let label = `<fig-input-text placeholder="Text" value="${this.getAttribute(
        "value"
      )}"></fig-input-text>`;
      if (this.getAttribute("alpha")) {
        label += `<fig-tooltip text="Opacity">
                    <fig-input-text 
                        placeholder="##" 
                        type="number"
                        min="0"
                        max="100"
                        value="${alpha}">
                        <span slot="append">%</slot>
                    </fig-input-text>
                </fig-tooltip>`;
      }
      html = `<div class="input-combo">
                <input type="color" value="${this.value}" />
                ${label}
            </div>`;
    } else {
      html = `<input type="color" value="${this.value}" />`;
    }
    this.innerHTML = html;

    this.style.setProperty("--alpha", this.#rgba.a);

    this.#swatch = this.querySelector("[type=color]");
    this.textInput = this.querySelector("[type=text]");
    this.#alphaInput = this.querySelector("[type=number]");

    this.#swatch.disabled = this.hasAttribute("disabled");
    this.#swatch.addEventListener("input", this.handleInput.bind(this));

    if (this.textInput) {
      this.textInput.value = this.#swatch.value = this.rgbAlphaToHex(
        this.#rgba,
        1
      );
    }

    if (this.#alphaInput) {
      this.#alphaInput.addEventListener(
        "input",
        this.handleAlphaInput.bind(this)
      );
    }
  }
  handleAlphaInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    this.#rgba = this.convertToRGBA(this.#swatch.value);
    this.#rgba.a = Number(this.#alphaInput.value) / 100;
    this.value = this.rgbAlphaToHex(
      {
        r: this.#rgba.r,
        g: this.#rgba.g,
        b: this.#rgba.b,
      },
      this.#rgba.a
    );
    this.style.setProperty("--alpha", this.#rgba.a);
    const e = new CustomEvent("input", {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(e);
  }

  focus() {
    this.#swatch.focus();
  }

  handleInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();

    let alpha = this.#rgba.a;
    this.#rgba = this.convertToRGBA(this.#swatch.value);
    this.#rgba.a = alpha;
    if (this.textInput) {
      this.textInput.value = this.#swatch.value;
    }
    this.style.setProperty("--alpha", this.#rgba.a);
    this.value = this.rgbAlphaToHex(
      {
        r: this.#rgba.r,
        g: this.#rgba.g,
        b: this.#rgba.b,
      },
      alpha
    );
    this.alpha = alpha;
    if (this.#alphaInput) {
      this.#alphaInput.value = this.#rgba.a.toFixed(0);
    }
    const e = new CustomEvent("input", {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(e);
  }

  static get observedAttributes() {
    return ["value", "style"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    //this[name] = newValue;
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
      return `#${hexR}${hexG}${hexB}`;
    }

    // Otherwise, include alpha in 8-digit hex
    const alpha = Math.round(a * 255);
    const hexA = alpha.toString(16).padStart(2, "0");
    return `#${hexR}${hexG}${hexB}${hexA}`;
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
class FigCheckbox extends HTMLElement {
  constructor() {
    super();
    this.input = document.createElement("input");
    this.input.setAttribute("id", uniqueId());
    this.input.setAttribute("name", this.getAttribute("name") || "checkbox");
    this.input.setAttribute("type", "checkbox");
    this.labelElement = document.createElement("label");
    this.labelElement.setAttribute("for", this.input.id);
  }
  connectedCallback() {
    this.checked = this.input.checked = this.hasAttribute("checked")
      ? this.getAttribute("checked").toLowerCase() === "true"
      : false;
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
    return ["on", "disabled", "label", "checked"];
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
        this.checked = this.input.checked = this.hasAttribute("checked")
          ? true
          : false;
        break;
      case "name":
      case "value":
        this.input.setAttribute(name, newValue);
        break;
    }
  }

  handleInput(e) {
    this.input.indeterminate = false;
    this.input.removeAttribute("indeterminate");
    this.value = this.input.value;
  }
}
window.customElements.define("fig-checkbox", FigCheckbox);

/* Radio */
class FigRadio extends FigCheckbox {
  constructor() {
    super();
    this.input.setAttribute("type", "radio");
    this.input.setAttribute("name", this.getAttribute("name") || "radio");
  }
}
window.customElements.define("fig-radio", FigRadio);

/* Switch */
class FigSwitch extends FigCheckbox {
  render() {
    this.input.setAttribute("class", "switch");
    this.on = this.input.checked = this.hasAttribute("on")
      ? this.getAttribute("on").toLowerCase() === "true"
      : false;
  }
}
window.customElements.define("fig-switch", FigSwitch);
