function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
function supportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}

if (window.customElements && !window.customElements.get("fig-button")) {
  /* Button */
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
}

if (window.customElements && !window.customElements.get("fig-dropdown")) {
  /* Dropdown */
  class FigDropdown extends HTMLElement {
    constructor() {
      super();
      this.select = document.createElement("select");
      this.optionsSlot = document.createElement("slot");
      this.attachShadow({ mode: "open" });
    }

    #addEventListeners() {
      this.select.addEventListener("input", this.#handleSelectInput.bind(this));
      this.select.addEventListener(
        "change",
        this.#handleSelectChange.bind(this)
      );
    }

    connectedCallback() {
      this.type = this.getAttribute("type") || "select";

      this.appendChild(this.select);
      this.shadowRoot.appendChild(this.optionsSlot);

      this.optionsSlot.addEventListener(
        "slotchange",
        this.slotChange.bind(this)
      );

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
}

/* Tooltip */
class FigTooltip extends HTMLElement {
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    let delay = parseInt(this.getAttribute("delay"));
    this.delay = !isNaN(delay) ? delay : 500;
    this.isOpen = false;
  }
  connectedCallback() {
    this.setup();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.destroy();
  }

  setup() {
    this.style.display = "contents";
  }

  render() {
    this.destroy();
    this.popup = document.createElement("span");
    this.popup.setAttribute("class", "fig-tooltip");
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.display = "inline-flex";
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
      this.addEventListener("pointerenter", this.showDelayedPopup.bind(this));
      this.addEventListener("pointerleave", this.hidePopup.bind(this));
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
  static get observedAttributes() {
    return ["action", "delay"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "action") {
      this.action = newValue;
    }
    if (name === "delay") {
      let delay = parseInt(newValue);
      this.delay = !isNaN(delay) ? delay : 500;
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
    this.modal =
      this.hasAttribute("modal") && this.getAttribute("modal") !== "false";
    this.appendChild(this.dialog);
    this.shadowRoot.appendChild(this.contentSlot);
    this.contentSlot.addEventListener("slotchange", this.slotChange.bind(this));

    requestAnimationFrame(() => {
      this.#addCloseListeners();
    });
  }

  #addCloseListeners() {
    this.dialog
      .querySelectorAll("fig-button[close-dialog]")
      .forEach((button) => {
        button.removeEventListener("click", this.close);
        button.addEventListener("click", this.close.bind(this));
      });
  }

  disconnectedCallback() {
    this.contentSlot.removeEventListener("slotchange", this.slotChange);
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
    this.#addCloseListeners();
  }

  static get observedAttributes() {
    return ["open", "modal"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "open":
        this.open = newValue === "true" && newValue !== "false";
        if (this?.show) {
          this[this.open ? "show" : "close"]();
        }
        break;
      case "modal":
        this.modal = newValue === "true" && newValue !== "false";
        break;
    }
  }

  /* Public methods */
  show() {
    if (this.modal) {
      this.dialog.showModal();
    } else {
      this.dialog.show();
    }
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
    opacity: { min: 0, max: 100, step: 0.1, color: "#FF0000" },
  };
  constructor() {
    super();
  }
  #regenerateInnerHTML() {
    this.value = Number(this.getAttribute("value") || 0);
    this.default = this.getAttribute("default") || null;
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
      this.input.removeEventListener("input", this.handleInput);
      this.input.addEventListener("input", this.handleInput.bind(this));

      if (this.default) {
        this.style.setProperty(
          "--default",
          this.#calculateNormal(this.default)
        );
      }

      this.datalist = this.querySelector("datalist");
      this.figInputText = this.querySelector("fig-input-text");
      if (this.datalist) {
        this.datalist.setAttribute(
          "id",
          this.datalist.getAttribute("id") || uniqueId()
        );
        this.input.setAttribute("list", this.datalist.getAttribute("id"));
      }
      if (this.figInputText) {
        this.figInputText.removeEventListener("input", this.handleTextInput);
        this.figInputText.addEventListener(
          "input",
          this.handleTextInput.bind(this)
        );
      }

      this.handleInput();
    });
  }

  connectedCallback() {
    this.initialInnerHTML = this.innerHTML;
    this.#regenerateInnerHTML();
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
          this.handleInput();
          break;
      }
    }
  }
  handleTextInput() {
    if (this.figInputText) {
      this.value = this.input.value = this.figInputText.value;
      this.#syncProperties();
    }
  }
  #calculateNormal(value) {
    let min = Number(this.input.min);
    let max = Number(this.input.max);
    let val = value;
    return (val - min) / (max - min);
  }
  #syncProperties() {
    let complete = this.#calculateNormal(this.value);
    let defaultValue = this.#calculateNormal(this.default);
    this.style.setProperty("--slider-complete", complete);
    this.style.setProperty("--default", defaultValue);
    this.style.setProperty("--unchanged", complete === defaultValue ? 1 : 0);
  }

  handleInput() {
    let val = this.input.value;
    this.value = val;
    this.#syncProperties();
    if (this.figInputText) {
      this.figInputText.setAttribute("value", val);
    }
  }
}
window.customElements.define("fig-slider", FigSlider);

class FigInputText extends HTMLElement {
  #boundMouseMove;
  #boundMouseUp;
  #boundMouseDown;

  constructor() {
    super();
    // Pre-bind the event handlers once
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = this.#handleMouseUp.bind(this);
    this.#boundMouseDown = this.#handleMouseDown.bind(this);
  }

  connectedCallback() {
    this.multiline = this.hasAttribute("multiline") || false;
    this.value = this.getAttribute("value") || "";
    this.type = this.getAttribute("type") || "text";
    this.placeholder = this.getAttribute("placeholder") || "";
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
      const append = this.querySelector("[slot=append]");
      const prepend = this.querySelector("[slot=prepend]");

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
      this.input.addEventListener("input", this.#handleInput.bind(this));
    });
  }
  focus() {
    this.input.focus();
  }
  #transformNumber(value) {
    return value === "" ? "" : Number(value) * (this.transform || 1);
  }
  #handleInput(e) {
    let value = e.target.value;
    if (this.type === "number") {
      value = this.#sanitizeInput(value);
      //value = Number(value);
      value = value / (this.transform || 1);
    }
    this.setAttribute("value", value);
  }
  #handleMouseMove(e) {
    if (e.altKey) {
      const step = (this.step || 1) * e.movementX;
      const value = this.#sanitizeInput(
        Number(this.value) + step,
        false
      ).toFixed(2);
      this.setAttribute("value", value);
    }
  }
  #handleMouseDown(e) {
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
    }
    return this.#formatNumber(sanitized);
  }
  #formatNumber(num, precision = 2) {
    // Check if the number has any decimal places after rounding
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(precision);
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
      "transform",
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
            this.min = this.#transformNumber(this.min);
            this.max = this.#transformNumber(this.max);
            this.step = this.#transformNumber(this.step);
            this.value = this.#transformNumber(this.value);
          }
          break;
        case "value":
          let value = newValue;
          if (this.type === "number") {
            let sanitized = this.#sanitizeInput(value);
            this.value = sanitized;
            this.input.value = this.#transformNumber(sanitized);
          } else {
            this.value = value;
            this.input.value = value;
          }
          this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
          break;
        case "min":
        case "max":
        case "step":
          this[name] = this.input[name] = Number(newValue);
          if (this.input) {
            this.input.setAttribute(name, newValue);
          }
          break;
        default:
          this[name] = this.input[name] = value;
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
      let label = `<fig-input-text type="text" placeholder="Text" value="${this.value}"></fig-input-text>`;
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
        r: this.rgba.r,
        g: this.rgba.g,
        b: this.rgba.b,
      },
      this.rgba.a
    );
    this.hexWithAlpha = this.value;
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
class FigCheckbox extends HTMLElement {
  constructor() {
    super();
    this.input = document.createElement("input");
    this.name = this.getAttribute("name") || "checkbox";
    this.value = this.getAttribute("value") || "";
    this.input.setAttribute("id", uniqueId());
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
class FigChit extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.type = this.getAttribute("type") || "color";
    this.src = this.getAttribute("src") || "";
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
      this.src = src;
      this.style.setProperty("--src", `url(${src})`);
    } else {
      this.style.removeProperty("--src");
    }
  }
  static get observedAttributes() {
    return ["src", "value", "disabled"];
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
class FigImage extends HTMLElement {
  constructor() {
    super();
  }
  #getInnerHTML() {
    return `<fig-chit type="image" size="large" ${
      this.src ? `src="${this.src}"` : ""
    } disabled="true"></fig-chit>${
      this.upload
        ? `<fig-button variant="primary" type="upload">
          ${this.label} 
          <input type="file" accept="image/*" />
        </fig-button>`
        : ""
    }`;
  }
  connectedCallback() {
    this.src = this.getAttribute("src") || "";
    this.upload = this.getAttribute("upload") === "true";
    this.label = this.getAttribute("label") || "Upload";
    this.size = this.getAttribute("size") || "small";
    this.innerHTML = this.#getInnerHTML();
    this.#updateRefs();
  }
  #updateRefs() {
    requestAnimationFrame(() => {
      this.chit = this.querySelector("fig-chit");
      if (this.upload) {
        this.uploadButton = this.querySelector("fig-button");
        this.fileInput = this.uploadButton?.querySelector("input");

        this.fileInput.addEventListener(
          "change",
          this.handleFileInput.bind(this)
        );
      }
    });
  }
  handleFileInput(e) {
    this.src = URL.createObjectURL(e.target.files[0]);
    this.setAttribute("src", this.src);
    this.chit.setAttribute("src", this.src);
  }
  static get observedAttributes() {
    return ["src", "upload"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "src") {
      this.src = newValue;
      if (this.chit) {
        this.chit.setAttribute("src", this.src);
      }
    }
    if (name === "upload") {
      this.upload = newValue.toLowerCase() === "true";
      this.innerHTML = this.#getInnerHTML();
      this.#updateRefs();
    }
    if (name === "size") {
      this.size = newValue;
    }
  }
}
window.customElements.define("fig-image", FigImage);
