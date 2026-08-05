/**
 * FigUI3 Lab — Experimental components
 *
 * These components are unstable and may change or be removed without notice.
 * Import alongside fig.js for opt-in access:
 *
 *   <script src="fig.js"></script>
 *   <script src="fig-lab.js"></script>
 */

function figLabDefineElement(name, constructor) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function figLabBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

/* Unique IDs for lab components such as propskit-group. */
let figLabUniqueIdCounter = 0;
function figLabUniqueId(prefix = "fig-lab") {
  figLabUniqueIdCounter += 1;
  return `${prefix}-${figLabUniqueIdCounter}`;
}

/* Field + Switch wrapper */
class PropskitSwitch extends HTMLElement {
  #field = null;
  #label = null;
  #switch = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedSwitchAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);

  static get observedAttributes() {
    return ["label", "direction"];
  }

  connectedCallback() {
    if (!this.#field) this.#initialize();
    this.#syncField();
    this.#syncSwitchAttributes();
    this.#bindSwitchEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncSwitch = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "direction"
          ) {
            syncField = true;
          } else {
            syncSwitch = true;
          }
        }

        if (syncField) this.#syncField();
        if (syncSwitch) this.#syncSwitchAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindSwitchEvents();
    this.removeEventListener("click", this.#boundHandleClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction") this.#syncField();
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const field = document.createElement("fig-field");
    const label = customLabel || document.createElement("label");
    const switchControl = document.createElement("fig-segmented-control");
    const offSegment = document.createElement("fig-segment");
    const onSegment = document.createElement("fig-segment");
    switchControl.setAttribute("sizing", "equal");
    offSegment.setAttribute("value", "off");
    offSegment.textContent = "Off";
    onSegment.setAttribute("value", "on");
    onSegment.textContent = "On";
    switchControl.append(offSegment, onSegment);

    field.append(label, switchControl);
    this.#field = field;
    this.#label = label;
    this.#switch = switchControl;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(field);

  }

  #syncField() {
    if (!this.#field || !this.#label) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      this.#label.remove();
    } else {
      if (!this.#hasCustomLabel) {
        this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      }
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
  }

  #getForwardedSwitchAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "size",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "checked",
      "value",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncSwitchAttributes() {
    if (!this.#switch) return;
    const switchAttrs = this.#getForwardedSwitchAttrNames();
    const nextManaged = new Set(switchAttrs);

    for (const attrName of this.#managedSwitchAttrs) {
      if (!nextManaged.has(attrName)) this.#switch.removeAttribute(attrName);
    }
    for (const attrName of switchAttrs) {
      this.#switch.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#switch.setAttribute(
      "value",
      figLabBooleanAttribute(this, "checked") ? "on" : "off",
    );
    this.#managedSwitchAttrs = nextManaged;
  }

  #bindSwitchEvents() {
    if (!this.#switch) return;
    this.#boundHandleInput ??= this.#forwardSwitchEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardSwitchEvent.bind(this, "change");
    this.#switch.addEventListener("input", this.#boundHandleInput);
    this.#switch.addEventListener("change", this.#boundHandleChange);
  }

  #unbindSwitchEvents() {
    if (!this.#switch) return;
    if (this.#boundHandleInput) {
      this.#switch.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#switch.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardSwitchEvent(type, event) {
    event.stopImmediatePropagation();
    const checked = this.#switch?.value === "on";
    this.toggleAttribute("checked", checked);
    const detail = {
      checked,
      value: this.getAttribute("value") ?? "",
    };
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  #handleClick(event) {
    if (event.target instanceof Element && event.target.closest("fig-segmented-control")) {
      return;
    }
    const value = this.#switch?.value === "on" ? "off" : "on";
    this.#switch?.querySelector(`fig-segment[value="${value}"]`)?.click();
  }

  get checked() {
    return this.#switch
      ? this.#switch.value === "on"
      : figLabBooleanAttribute(this, "checked");
  }

  set checked(nextChecked) {
    const checked = Boolean(nextChecked);
    this.toggleAttribute("checked", checked);
    if (this.#switch) this.#switch.value = checked ? "on" : "off";
  }

  get value() {
    return this.#switch?.value ?? this.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    this.setAttribute("value", nextValue ?? "");
  }

  focus(options) {
    const selected =
      this.#switch?.querySelector("fig-segment[selected]") ||
      this.#switch?.querySelector("fig-segment");
    selected?.focus(options);
  }
}
figLabDefineElement("propskit-switch", PropskitSwitch);

/* Field + Color wrapper */
class PropskitColor extends HTMLElement {
  #field = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #initialValue = null;

  static get observedAttributes() {
    return ["label", "direction", "aria-label"];
  }

  connectedCallback() {
    if (!this.#field) this.#initialize();
    this.#syncField();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    if (this.#initialValue === null) {
      this.#initialValue =
        this.getAttribute("default") ?? this.getAttribute("value") ?? "";
    }
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "direction" ||
            mutation.attributeName === "aria-label"
          ) {
            syncField = true;
          } else {
            syncInput = true;
          }
        }

        if (syncField) this.#syncField();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction" || name === "aria-label") {
      this.#syncField();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const field = document.createElement("fig-field");
    const label = customLabel || document.createElement("label");
    const input = document.createElement("fig-input-color");

    for (const node of initialChildren) {
      if (node !== customLabel) input.appendChild(node);
    }
    field.append(label, input);
    this.#field = field;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(field);
  }

  #syncField() {
    if (!this.#field || !this.#label || !this.#input) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      this.#label.remove();
    } else {
      if (!this.#hasCustomLabel) {
        this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      }
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
    this.#input.setAttribute(
      "aria-label",
      this.getAttribute("aria-label") ||
        this.#label.textContent?.trim() ||
        "Color",
    );
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "text",
      "default",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      const next = this.getAttribute(attrName) ?? "";
      // Soft sync only. Never force-clear value here — that fights live edits
      // (fig-input-color often keeps a stale value attribute while editing).
      if (
        attrName === "value" &&
        this.#input.getAttribute("value") === next
      ) {
        continue;
      }
      this.#input.setAttribute(attrName, next);
    }

    this.#input.setAttribute("text", "true");
    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #valueFromColorEvent(event) {
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : undefined;
    if (typeof detail === "string" && detail) return detail;
    if (detail && typeof detail === "object") {
      if (typeof detail.value === "string" && detail.value) return detail.value;
      if (typeof detail.hex === "string" && detail.hex) return detail.hex;
      if (typeof detail.color === "string" && detail.color) return detail.color;
    }
    // Prefer live JS value — fig-input-color often leaves the attribute stale.
    if (typeof this.#input?.value === "string" && this.#input.value) {
      return this.#input.value;
    }
    return this.#input?.getAttribute("value") ?? "";
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    const value = this.#valueFromColorEvent(event);
    this.setAttribute("value", value);
    if (this.#input && this.#input.getAttribute("value") !== value) {
      this.#input.setAttribute("value", value);
    }
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : value;
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  #handleClick(event) {
    if (event.target instanceof Element && event.target.closest("fig-input-color")) {
      return;
    }
    this.focus();
  }

  get value() {
    return this.getAttribute("value") ?? this.#input?.value ?? this.#input?.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      this.#input?.removeAttribute("value");
      return;
    }
    const next = String(nextValue);
    this.setAttribute("value", next);
    if (this.#input && this.#input.getAttribute("value") !== next) {
      this.#input.setAttribute("value", next);
    }
  }

  /** Force fig-input-color UI refresh even when the hex string is unchanged. */
  #forceInputValue(next) {
    if (!this.#input) return;
    if (this.#input.getAttribute("value") === next) {
      this.#input.removeAttribute("value");
    }
    this.#input.setAttribute("value", next);
  }

  #defaultValue() {
    return this.getAttribute("default") ?? this.#initialValue ?? "";
  }

  resetToDefault() {
    const next = String(this.#defaultValue());
    this.setAttribute("value", next);
    this.#forceInputValue(next);
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: next,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: next,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  focus(options) {
    this.#input?.querySelector("input:not([tabindex='-1'])")?.focus(options);
  }
}
figLabDefineElement("propskit-color", PropskitColor);

/* Field + Select wrapper */
class PropskitSelect extends HTMLElement {
  #field = null;
  #label = null;
  #select = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedSelectAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandlePointerDown = this.#handlePointerDown.bind(this);
  /** True when pointerdown saw the menu open — skip click-to-open after light-dismiss. */
  #closeGesture = false;

  static get observedAttributes() {
    return ["label", "direction", "aria-label", "options", "value"];
  }

  connectedCallback() {
    if (!this.#field) this.#initialize();
    this.#syncField();
    this.#syncSelectAttributes();
    this.#bindSelectEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);
    this.removeEventListener("pointerdown", this.#boundHandlePointerDown, true);
    this.addEventListener("pointerdown", this.#boundHandlePointerDown, true);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncSelect = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          const name = mutation.attributeName;
          if (
            name === "label" ||
            name === "direction" ||
            name === "aria-label"
          ) {
            syncField = true;
          } else {
            syncSelect = true;
          }
        }

        if (syncField) this.#syncField();
        if (syncSelect) this.#syncSelectAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindSelectEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("pointerdown", this.#boundHandlePointerDown, true);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction" || name === "aria-label") {
      this.#syncField();
      return;
    }
    if (name === "options" || name === "value") {
      this.#syncSelectAttributes();
    }
  }

  #initialize() {
    const customLabel = this.querySelector(":scope > label");
    const field = document.createElement("fig-field");
    const label = customLabel || document.createElement("label");
    const select = document.createElement("fig-select");
    // Match menu width to the full-surface control.
    select.setAttribute("full", "");
    field.append(label, select);
    this.#field = field;
    this.#label = label;
    this.#select = select;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(field);
  }

  #syncField() {
    if (!this.#field || !this.#label || !this.#select) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      this.#label.remove();
    } else {
      if (!this.#hasCustomLabel) {
        this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      }
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
    this.#select.setAttribute(
      "label",
      this.getAttribute("aria-label") ||
        this.#label.textContent?.trim() ||
        "Select",
    );
    // Always match menu width to the control surface.
    this.#select.setAttribute("full", "");
  }

  #getForwardedSelectAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "full",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncSelectAttributes() {
    if (!this.#select) return;
    const selectAttrs = this.#getForwardedSelectAttrNames().sort((a, b) => {
      // Build options before applying value so fig-select can resolve selection.
      if (a === "options") return -1;
      if (b === "options") return 1;
      if (a === "value") return 1;
      if (b === "value") return -1;
      return 0;
    });
    const nextManaged = new Set(selectAttrs);

    for (const attrName of this.#managedSelectAttrs) {
      if (!nextManaged.has(attrName)) this.#select.removeAttribute(attrName);
    }
    for (const attrName of selectAttrs) {
      this.#select.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#managedSelectAttrs = nextManaged;
  }

  #bindSelectEvents() {
    if (!this.#select) return;
    this.#boundHandleInput ??= this.#forwardSelectEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardSelectEvent.bind(this, "change");
    this.#select.addEventListener("input", this.#boundHandleInput);
    this.#select.addEventListener("change", this.#boundHandleChange);
  }

  #unbindSelectEvents() {
    if (!this.#select) return;
    if (this.#boundHandleInput) {
      this.#select.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#select.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardSelectEvent(type, event) {
    if (event.target !== this.#select) return;
    event.stopImmediatePropagation();
    const value = this.#select?.value ?? "";
    this.setAttribute("value", String(value));
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : value;
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  #isSelectMenuOpen() {
    if (!this.#select) return false;
    if (this.#select.open) return true;
    const popup = this.#select.shadowRoot?.querySelector(
      'dialog[is="fig-popup"]',
    );
    return Boolean(popup?.open || popup?.matches?.(":open"));
  }

  #handlePointerDown(event) {
    if (!(event.target instanceof Element)) return;
    // fig-select owns its trigger/option clicks.
    if (event.target.closest("fig-select")) {
      this.#closeGesture = false;
      return;
    }
    // Light-dismiss closes on pointerdown; remember so click doesn't reopen.
    this.#closeGesture = this.#isSelectMenuOpen();
  }

  #handleClick(event) {
    if (event.target instanceof Element && event.target.closest("fig-select")) {
      this.#closeGesture = false;
      return;
    }
    if (!this.#select || figLabBooleanAttribute(this.#select, "disabled")) {
      this.#closeGesture = false;
      return;
    }
    this.#select.focus();

    if (this.#closeGesture || this.#isSelectMenuOpen()) {
      this.#closeGesture = false;
      this.#select.open = false;
      return;
    }

    this.#select.open = true;
  }

  get value() {
    return this.#select?.value ?? this.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(nextValue));
    }
  }

  focus(options) {
    this.#select?.focus(options);
  }
}
figLabDefineElement("propskit-select", PropskitSelect);

/* Field + Text wrapper */
class PropskitText extends HTMLElement {
  #field = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);

  static get observedAttributes() {
    return ["label", "direction", "aria-label"];
  }

  connectedCallback() {
    if (!this.#field) this.#initialize();
    this.#syncField();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "direction" ||
            mutation.attributeName === "aria-label"
          ) {
            syncField = true;
          } else {
            syncInput = true;
          }
        }

        if (syncField) this.#syncField();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction" || name === "aria-label") {
      this.#syncField();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const field = document.createElement("fig-field");
    const label = customLabel || document.createElement("label");
    const input = document.createElement("fig-input-text");

    for (const node of initialChildren) {
      if (node !== customLabel) input.appendChild(node);
    }
    field.append(label, input);
    this.#field = field;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(field);
  }

  #syncField() {
    if (!this.#field || !this.#label || !this.#input) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      this.#label.remove();
    } else {
      if (!this.#hasCustomLabel) {
        this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      }
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
    this.#input.setAttribute(
      "aria-label",
      this.getAttribute("aria-label") ||
        this.#label.textContent?.trim() ||
        "Text",
    );
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
      "size",
      "aria-label",
      "multiline",
      "resizable",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    const value = this.#input?.value ?? "";
    this.setAttribute("value", String(value));
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : value;
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  #handleClick(event) {
    if (event.target instanceof Element && event.target.closest("fig-input-text")) {
      return;
    }
    this.focus();
  }

  get value() {
    return this.#input?.value ?? this.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined) {
      this.removeAttribute("value");
      if (this.#input) this.#input.value = "";
    } else {
      const next = String(nextValue);
      this.setAttribute("value", next);
      if (this.#input) this.#input.value = next;
    }
  }

  focus(options) {
    this.#input?.focus(options);
  }
}
figLabDefineElement("propskit-text", PropskitText);

/* Field + Number wrapper */
class PropskitNumber extends HTMLElement {
  #field = null;
  #label = null;
  #input = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedInputAttrs = new Set();
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundHandleClick = this.#handleClick.bind(this);

  static get observedAttributes() {
    return ["label", "direction"];
  }

  connectedCallback() {
    if (!this.#field) this.#initialize();
    this.#syncField();
    this.#syncInputAttributes();
    this.#bindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
    this.addEventListener("click", this.#boundHandleClick);

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncInput = false;

        for (const mutation of mutations) {
          if (mutation.type !== "attributes") continue;
          if (
            mutation.attributeName === "label" ||
            mutation.attributeName === "direction"
          ) {
            syncField = true;
          } else {
            syncInput = true;
          }
        }

        if (syncField) this.#syncField();
        if (syncInput) this.#syncInputAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#unbindInputEvents();
    this.removeEventListener("click", this.#boundHandleClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction") this.#syncField();
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter(
      (node) =>
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
    );
    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const field = document.createElement("fig-field");
    const label = customLabel || document.createElement("label");
    const input = document.createElement("fig-input-number");

    field.append(label, input);
    this.#field = field;
    this.#label = label;
    this.#input = input;
    this.#hasCustomLabel = Boolean(customLabel);
    this.replaceChildren(field);

    for (const node of initialChildren) {
      if (node !== customLabel) input.appendChild(node);
    }
  }

  #syncField() {
    if (!this.#field || !this.#label) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      this.#label.remove();
    } else {
      if (!this.#hasCustomLabel) {
        this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      }
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
  }

  #getForwardedInputAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "size",
      "oninput",
      "onchange",
      "class",
      "style",
      "id",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !name.startsWith("data-"),
    );
  }

  #syncInputAttributes() {
    if (!this.#input) return;
    const inputAttrs = this.#getForwardedInputAttrNames();
    const nextManaged = new Set(inputAttrs);

    for (const attrName of this.#managedInputAttrs) {
      if (!nextManaged.has(attrName)) this.#input.removeAttribute(attrName);
    }
    for (const attrName of inputAttrs) {
      this.#input.setAttribute(attrName, this.getAttribute(attrName) ?? "");
    }

    this.#managedInputAttrs = nextManaged;
  }

  #bindInputEvents() {
    if (!this.#input) return;
    this.#boundHandleInput ??= this.#forwardInputEvent.bind(this, "input");
    this.#boundHandleChange ??= this.#forwardInputEvent.bind(this, "change");
    this.#input.addEventListener("input", this.#boundHandleInput);
    this.#input.addEventListener("change", this.#boundHandleChange);
  }

  #unbindInputEvents() {
    if (!this.#input) return;
    if (this.#boundHandleInput) {
      this.#input.removeEventListener("input", this.#boundHandleInput);
    }
    if (this.#boundHandleChange) {
      this.#input.removeEventListener("change", this.#boundHandleChange);
    }
  }

  #forwardInputEvent(type, event) {
    event.stopImmediatePropagation();
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : this.#input?.value;
    if (this.#input?.value !== undefined) {
      this.setAttribute("value", String(this.#input.value));
    }
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  #handleClick(event) {
    if (event.target instanceof Element && event.target.closest("fig-input-number")) {
      return;
    }
    this.focus();
  }

  get value() {
    return this.#input?.value ?? this.getAttribute("value") ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      if (this.#input) this.#input.value = "";
    } else {
      const next = String(nextValue);
      this.setAttribute("value", next);
      if (this.#input) this.#input.value = next;
    }
  }

  focus(options) {
    this.#input?.focus(options);
  }
}
figLabDefineElement("propskit-number", PropskitNumber);

/* Collapsible property group — always collapsible (no collapsible attr). */
class PropskitGroup extends HTMLElement {
  static observedAttributes = ["name", "open", "show-reset"];

  static #CONTROL_SELECTOR = [
    "propskit-color",
    "propskit-number",
    "propskit-select",
    "propskit-slider",
    "propskit-switch",
    "propskit-text",
  ].join(",");

  #header = null;
  #disclosure = null;
  #chevron = null;
  #resetTooltip = null;
  #defaults = new WeakMap();
  #childObserver = null;
  #dirtyFrame = 0;
  #boundOnControlEvent = () => this.#queueDirtySync();

  connectedCallback() {
    this.#render();
    this.#bindDirtyListeners();
    requestAnimationFrame(() => {
      this.#ensureDefaults();
      this.#syncDirtyState();
    });
  }

  disconnectedCallback() {
    this.#unbindDirtyListeners();
    if (this.#dirtyFrame) {
      cancelAnimationFrame(this.#dirtyFrame);
      this.#dirtyFrame = 0;
    }
    this.#disclosure?.removeEventListener("click", this.#handleToggle);
    const resetBtn = this.#resetTooltip?.querySelector("fig-button");
    resetBtn?.removeEventListener("click", this.#handleReset);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "open") {
      this.#disclosure?.setAttribute("aria-expanded", String(this.open));
      return;
    }
    if (name === "show-reset") {
      this.#syncResetButton();
      this.#syncDirtyState();
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
    this.#disclosure?.setAttribute("aria-expanded", String(!!value));
    if (was !== !!value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: !!value },
          bubbles: true,
        }),
      );
    }
  }

  /** When true (default), show the reset control while the group is dirty. */
  get showReset() {
    const attr = this.getAttribute("show-reset");
    if (attr === null) return true;
    return attr !== "false";
  }

  set showReset(value) {
    if (value) this.setAttribute("show-reset", "true");
    else this.setAttribute("show-reset", "false");
  }

  get dirty() {
    return this.hasAttribute("data-dirty") && this.getAttribute("data-dirty") !== "false";
  }

  /** Restore all propskit controls in this group to their captured defaults. */
  resetProperties() {
    this.#resetControls();
  }

  #bindDirtyListeners() {
    this.removeEventListener("input", this.#boundOnControlEvent, true);
    this.removeEventListener("change", this.#boundOnControlEvent, true);
    this.addEventListener("input", this.#boundOnControlEvent, true);
    this.addEventListener("change", this.#boundOnControlEvent, true);

    if (!this.#childObserver) {
      this.#childObserver = new MutationObserver(() => {
        this.#ensureDefaults();
        this.#queueDirtySync();
      });
    }
    this.#childObserver.disconnect();
    this.#childObserver.observe(this, { childList: true, subtree: true });
  }

  #unbindDirtyListeners() {
    this.removeEventListener("input", this.#boundOnControlEvent, true);
    this.removeEventListener("change", this.#boundOnControlEvent, true);
    this.#childObserver?.disconnect();
  }

  #queueDirtySync() {
    if (this.#dirtyFrame) return;
    this.#dirtyFrame = requestAnimationFrame(() => {
      this.#dirtyFrame = 0;
      this.#ensureDefaults();
      this.#syncDirtyState();
    });
  }

  #isResetTarget(target) {
    return (
      target instanceof Element &&
      Boolean(
        target.closest(
          ".propskit-group-reset, .propskit-group-reset-tooltip",
        ),
      )
    );
  }

  #handleToggle = (e) => {
    if (this.#isResetTarget(e.target)) return;
    e.stopPropagation();
    this.open = !this.open;
  };

  #handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.#resetControls();
  };

  #controls() {
    return [
      ...this.querySelectorAll(PropskitGroup.#CONTROL_SELECTOR),
    ].filter((el) => el.closest("propskit-group") === this);
  }

  #snapshotControl(el) {
    if (el.localName === "propskit-switch") {
      return { kind: "checked", value: Boolean(el.checked) };
    }
    if ("value" in el) {
      return { kind: "value", value: el.value };
    }
    return { kind: "value", value: el.getAttribute("value") ?? "" };
  }

  #ensureDefaults() {
    for (const el of this.#controls()) {
      if (this.#defaults.has(el)) continue;
      if (el.hasAttribute("default")) {
        if (el.localName === "propskit-switch") {
          this.#defaults.set(el, {
            kind: "checked",
            value: figLabBooleanAttribute(el, "default"),
          });
          continue;
        }
        this.#defaults.set(el, {
          kind: "value",
          value: el.getAttribute("default") ?? "",
        });
        continue;
      }
      this.#defaults.set(el, this.#snapshotControl(el));
    }
  }

  #controlIsDirty(el) {
    const snap = this.#defaults.get(el);
    if (!snap) return false;
    const cur = this.#snapshotControl(el);
    if (snap.kind === "checked") {
      return Boolean(cur.value) !== Boolean(snap.value);
    }
    return String(cur.value ?? "") !== String(snap.value ?? "");
  }

  #computeDirty() {
    for (const el of this.#controls()) {
      if (this.#controlIsDirty(el)) return true;
    }
    return false;
  }

  #syncDirtyState() {
    const dirty = this.#computeDirty();
    if (dirty) this.setAttribute("data-dirty", "");
    else this.removeAttribute("data-dirty");
    this.#syncResetButton();
  }

  #restoreControl(el) {
    const snap = this.#defaults.get(el);
    if (!snap) return;

    if (snap.kind === "checked") {
      el.checked = snap.value;
      const detail = {
        checked: Boolean(snap.value),
        value: el.getAttribute("value") ?? "",
      };
      el.dispatchEvent(
        new CustomEvent("input", {
          detail,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      el.dispatchEvent(
        new CustomEvent("change", {
          detail,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
      return;
    }

    if (typeof el.resetToDefault === "function") {
      const prevDefault = el.getAttribute("default");
      el.setAttribute("default", String(snap.value ?? ""));
      el.resetToDefault();
      if (prevDefault === null) el.removeAttribute("default");
      else el.setAttribute("default", prevDefault);
      return;
    }

    el.value = snap.value;
    const detail =
      el.getAttribute?.("value") ??
      ("value" in el ? el.value : snap.value);
    el.dispatchEvent(
      new CustomEvent("input", {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
    el.dispatchEvent(
      new CustomEvent("change", {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  #resetControls() {
    this.#ensureDefaults();
    for (const el of this.#controls()) this.#restoreControl(el);
    this.#syncDirtyState();
    this.dispatchEvent(
      new CustomEvent("reset", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  #syncResetButton() {
    if (!this.showReset) {
      this.#resetTooltip?.setAttribute("hidden", "");
      return;
    }
    this.#ensureResetButton();
    this.#resetTooltip?.removeAttribute("hidden");
  }

  #ensureResetButton() {
    if (!this.#header || !this.showReset) return;
    let tip = this.#header.querySelector(":scope > .propskit-group-reset-tooltip");
    if (!tip) {
      tip = document.createElement("fig-tooltip");
      tip.className = "propskit-group-reset-tooltip";
      tip.setAttribute("text", "Reset properties");
      const btn = document.createElement("fig-button");
      btn.className = "propskit-group-reset";
      btn.setAttribute("variant", "ghost");
      btn.setAttribute("icon", "");
      btn.setAttribute("aria-label", "Reset properties");
      const icon = document.createElement("fig-icon");
      icon.setAttribute("name", "reset");
      btn.appendChild(icon);
      tip.appendChild(btn);
      this.#header.appendChild(tip);
      btn.addEventListener("click", this.#handleReset);
    } else {
      const btn = tip.querySelector("fig-button");
      btn?.removeEventListener("click", this.#handleReset);
      btn?.addEventListener("click", this.#handleReset);
    }
    this.#resetTooltip = tip;
  }

  #render() {
    const nameAttr = this.getAttribute("name");
    const label = nameAttr || "Group";
    const userHeader = this.querySelector(":scope > fig-header");

    if (userHeader) {
      this.#header = userHeader;
    } else if (
      !this.#header ||
      !this.#header.dataset.generated ||
      this.#header.parentElement !== this
    ) {
      this.#header = document.createElement("fig-header");
      this.#header.setAttribute("borderless", "");
      this.#header.dataset.generated = "true";
      this.prepend(this.#header);
    }

    let disclosure = this.#header.querySelector(
      ":scope > .propskit-group-disclosure",
    );
    if (!disclosure) {
      disclosure = document.createElement("fig-button");
      disclosure.className = "propskit-group-disclosure";
      disclosure.setAttribute("variant", "ghost");
      const existingHeading = this.#header.querySelector(":scope > h3");
      if (existingHeading) disclosure.appendChild(existingHeading);
      this.#header.prepend(disclosure);
    }
    this.#disclosure = disclosure;

    let h3 = disclosure.querySelector("h3");
    if (!h3) {
      h3 = document.createElement("h3");
      disclosure.appendChild(h3);
    }
    if (!h3.id) h3.id = figLabUniqueId("propskit-group");
    if (this.#header.dataset.generated) {
      // Preserve chevron while updating the title text node.
      const chevron = h3.querySelector(".propskit-group-chevron");
      h3.textContent = label;
      if (chevron) h3.prepend(chevron);
    }
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (
      !this.hasAttribute("aria-label") &&
      !this.hasAttribute("aria-labelledby")
    ) {
      this.setAttribute("aria-labelledby", h3.id);
    }

    if (!h3.querySelector(".propskit-group-chevron")) {
      const chevron = document.createElement("fig-icon");
      chevron.setAttribute("name", "chevron");
      chevron.setAttribute("size", "small");
      chevron.className = "propskit-group-chevron";
      h3.prepend(chevron);
    }
    this.#chevron = h3.querySelector(".propskit-group-chevron");
    this.#syncResetButton();
    this.#header.removeAttribute("role");
    this.#header.removeAttribute("tabindex");
    this.#header.removeAttribute("aria-expanded");
    this.#disclosure.setAttribute("aria-labelledby", h3.id);
    this.#disclosure.setAttribute("aria-expanded", String(this.open));
    this.#disclosure.removeEventListener("click", this.#handleToggle);
    this.#disclosure.addEventListener("click", this.#handleToggle);

    if (!this.hasAttribute("open")) {
      this.setAttribute("open", "false");
      this.#disclosure.setAttribute("aria-expanded", "false");
    }
  }
}
figLabDefineElement("propskit-group", PropskitGroup);

/* Field + Slider wrapper */
class PropskitSlider extends HTMLElement {
  #field = null;
  #label = null;
  #slider = null;
  #hasCustomLabel = false;
  #observer = null;
  #managedSliderAttrs = new Set();
  #steppersSyncFrame = 0;
  #focusSyncFrame = 0;
  #rangeInput = null;
  #contextMenu = null;
  #pendingClickTimer = 0;
  #pendingClickValue = null;
  #isElasticTracking = false;
  #elasticMaxPx = 0;
  #elasticRangeRect = null;
  #elasticHostWidth = 0;
  #elasticPointerId = null;
  #boundHandleSliderInput = null;
  #boundHandleSliderChange = null;
  #boundHandleElasticPointerDown = this.#handleElasticPointerDown.bind(this);
  #boundHandleElasticPointerMove = this.#handleElasticPointerMove.bind(this);
  #boundHandleElasticPointerEnd = this.#handleElasticPointerEnd.bind(this);
  #boundHandleRangeDoubleClick = this.#handleRangeDoubleClick.bind(this);
  #boundHandleContextMenu = this.#handleContextMenu.bind(this);
  #boundHandleContextMenuChange = this.#handleContextMenuChange.bind(this);
  #boundHandleClick = this.#handleClick.bind(this);
  #ignoredSliderAttrs = new Set([
    "variant",
    "color",
    "text",
    "full",
    "elastic",
    "size",
    "name",
    "class",
    "data-wave-index",
    "data-active",
    "data-elastic-dragging",
    "style",
  ]);

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
    this.#queueFocusDelegationSync();
    this.removeEventListener("pointerdown", this.#boundHandleElasticPointerDown, {
      capture: true,
    });
    this.addEventListener("pointerdown", this.#boundHandleElasticPointerDown, {
      capture: true,
      passive: true,
    });
    this.removeEventListener("contextmenu", this.#boundHandleContextMenu);
    this.addEventListener("contextmenu", this.#boundHandleContextMenu);
    this.removeEventListener("click", this.#boundHandleClick, true);
    this.addEventListener("click", this.#boundHandleClick, true);
    this.#contextMenu?.removeEventListener(
      "change",
      this.#boundHandleContextMenuChange,
    );
    this.#contextMenu?.addEventListener(
      "change",
      this.#boundHandleContextMenuChange,
    );

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
        if (syncSlider) {
          this.#syncSliderAttributes();
          this.#queueFocusDelegationSync();
        }
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
    if (this.#focusSyncFrame) {
      cancelAnimationFrame(this.#focusSyncFrame);
      this.#focusSyncFrame = 0;
    }
    this.#clearPendingClick();
    this.#stopElasticTracking();
    this.#resetElasticPull();
    this.#unbindRangeInput();
    this.#unbindSliderEvents();
    this.removeEventListener("pointerdown", this.#boundHandleElasticPointerDown, {
      capture: true,
    });
    this.removeEventListener("contextmenu", this.#boundHandleContextMenu);
    this.removeEventListener("click", this.#boundHandleClick, true);
    this.#contextMenu?.removeEventListener("change", this.#boundHandleContextMenuChange);
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

    const customLabel = initialChildren.find(
      (node) => node.nodeType === Node.ELEMENT_NODE && node.matches("label"),
    );
    const field = document.createElement("fig-field");
    const label = customLabel || document.createElement("label");
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
    this.#hasCustomLabel = Boolean(customLabel);

    this.replaceChildren(field);
    this.#setupContextMenu();

    for (const node of initialChildren) {
      if (node === customLabel) continue;
      this.#slider.appendChild(node);
    }
  }

  #setupContextMenu() {
    const menu = document.createElement("fig-menu");
    menu.setAttribute("position", "bottom left");
    menu.setAttribute("offset", "0 0");

    const resetItem = document.createElement("fig-menu-item");
    resetItem.setAttribute("value", "reset-default");
    resetItem.textContent = "Reset to default";
    menu.appendChild(resetItem);
    menu.addEventListener("change", this.#boundHandleContextMenuChange);

    this.#contextMenu = menu;
    this.appendChild(menu);
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
      if (!this.#hasCustomLabel) {
        this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      }
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
      const value = this.getAttribute(attrName) ?? "";
      if (this.#slider.getAttribute(attrName) !== value) {
        this.#slider.setAttribute(attrName, value);
      }
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
        "light-dark(#444444, #e6e6e6)",
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
      this.#syncFocusDelegation();
    });
  }

  #queueFocusDelegationSync() {
    if (this.#focusSyncFrame) {
      cancelAnimationFrame(this.#focusSyncFrame);
    }
    this.#focusSyncFrame = requestAnimationFrame(() => {
      this.#focusSyncFrame = 0;
      this.#syncFocusDelegation();
    });
  }

  #syncFocusDelegation() {
    const rangeInput = this.#slider?.querySelector('input[type="range"]');
    const numberInput = this.#slider?.querySelector("fig-input-number input");
    if (rangeInput !== this.#rangeInput) {
      this.#bindRangeInput(rangeInput);
    }
    if (rangeInput) {
      rangeInput.removeAttribute("tabindex");
      rangeInput.removeAttribute("aria-hidden");
      const label =
        this.getAttribute("aria-label") ||
        this.#label?.textContent?.trim() ||
        "Slider";
      if (
        !rangeInput.hasAttribute("aria-label") &&
        !rangeInput.hasAttribute("aria-labelledby")
      ) {
        rangeInput.setAttribute("aria-label", label);
      }
    }
    if (numberInput) {
      numberInput.setAttribute("tabindex", "-1");
      numberInput.setAttribute("aria-hidden", "true");
    }
  }

  #handleClick(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number, fig-menu")
    ) {
      return;
    }
    this.#queueRangeFocus();
  }

  #queueRangeFocus() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.isConnected && !figLabBooleanAttribute(this, "disabled")) {
          this.focus();
        }
      });
    });
  }

  #bindRangeInput(rangeInput) {
    this.#unbindRangeInput();
    this.#rangeInput = rangeInput;
    if (!this.#rangeInput) return;
    this.#rangeInput.addEventListener("dblclick", this.#boundHandleRangeDoubleClick, {
      capture: true,
    });
  }

  #unbindRangeInput() {
    if (!this.#rangeInput) return;
    this.#rangeInput.removeEventListener("dblclick", this.#boundHandleRangeDoubleClick, {
      capture: true,
    });
    this.#rangeInput = null;
  }

  #handleRangeDoubleClick(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.#resetToDefault();
  }

  #handleElasticPointerDown(event) {
    if (event.button !== 0 || figLabBooleanAttribute(this, "disabled")) return;
    if (!event.target?.closest?.("fig-input-number, fig-menu")) {
      this.#queueRangeFocus();
    }
    if (this.getAttribute("elastic") === "false") return;
    if (event.target?.closest?.("fig-input-number")) return;
    const rangeInput =
      this.#slider?.querySelector('input[type="range"]') ?? this.#rangeInput;
    if (!rangeInput) return;
    this.#stopElasticTracking();
    this.#resetElasticPull();
    this.#rangeInput = rangeInput;
    this.#isElasticTracking = true;
    this.#elasticPointerId = event.pointerId;
    this.#elasticMaxPx = this.#readElasticDistance();
    const rect = rangeInput.getBoundingClientRect();
    const hostRect = this.getBoundingClientRect();
    this.#elasticRangeRect = {
      left: rect.left,
      right: rect.right,
      width: rect.width,
    };
    this.#elasticHostWidth = hostRect.width;
    window.addEventListener("pointermove", this.#boundHandleElasticPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", this.#boundHandleElasticPointerEnd, {
      once: true,
    });
    window.addEventListener("pointercancel", this.#boundHandleElasticPointerEnd, {
      once: true,
    });
    window.addEventListener("blur", this.#boundHandleElasticPointerEnd, {
      once: true,
    });
  }

  #handleElasticPointerMove(event) {
    if (!this.#isElasticTracking) return;
    if (event.pointerId !== this.#elasticPointerId) return;
    if (event.buttons === 0) {
      this.#handleElasticPointerEnd(event);
      return;
    }
    this.#updateElasticPull(event.clientX);
  }

  #handleElasticPointerEnd(event) {
    if (
      event?.pointerId !== undefined &&
      this.#elasticPointerId !== null &&
      event.pointerId !== this.#elasticPointerId
    ) {
      return;
    }
    this.#stopElasticTracking();
    this.#resetElasticPull();
  }

  #stopElasticTracking() {
    window.removeEventListener("pointermove", this.#boundHandleElasticPointerMove);
    window.removeEventListener("pointerup", this.#boundHandleElasticPointerEnd);
    window.removeEventListener("pointercancel", this.#boundHandleElasticPointerEnd);
    window.removeEventListener("blur", this.#boundHandleElasticPointerEnd);
    this.#isElasticTracking = false;
    this.#elasticPointerId = null;
  }

  #handleContextMenu(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.#clearPendingClick();
    this.#showContextMenuAfterPointerRelease(event.clientX, event.clientY);
  }

  #showContextMenuAfterPointerRelease(x, y) {
    let opened = false;
    let fallbackTimer = 0;
    const openMenu = () => {
      if (opened) return;
      opened = true;
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("pointerup", openMenu, true);
      window.removeEventListener("pointercancel", openMenu, true);
      requestAnimationFrame(() => {
        this.#contextMenu?.showAt?.(x, y);
      });
    };
    window.addEventListener("pointerup", openMenu, { once: true, capture: true });
    window.addEventListener("pointercancel", openMenu, {
      once: true,
      capture: true,
    });
    fallbackTimer = window.setTimeout(openMenu, 180);
  }

  #handleContextMenuChange(event) {
    event.stopPropagation();
    if (event.detail?.value !== "reset-default") return;
    this.#resetToDefault();
  }

  #clearPendingClick() {
    if (this.#pendingClickTimer) {
      clearTimeout(this.#pendingClickTimer);
      this.#pendingClickTimer = 0;
    }
    this.#pendingClickValue = null;
  }

  #readElasticDistance() {
    let raw = getComputedStyle(this)
      .getPropertyValue("--propskit-slider-elastic-distance")
      .trim();
    if (raw.includes("var(") || !raw.endsWith("px")) {
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: "var(--propskit-slider-elastic-distance)",
      });
      this.appendChild(probe);
      raw = getComputedStyle(probe).width;
      probe.remove();
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #updateElasticPull(pointerX) {
    const rect = this.#elasticRangeRect;
    if (!rect || !this.#elasticMaxPx) {
      this.#resetElasticPull();
      return;
    }
    const overshoot =
      pointerX < rect.left
        ? pointerX - rect.left
        : pointerX > rect.right
          ? pointerX - rect.right
          : 0;
    if (!overshoot) {
      this.#clearElasticPull();
      return;
    }
    const offset = Math.max(
      -this.#elasticMaxPx,
      Math.min(this.#elasticMaxPx, overshoot * 0.5),
    );
    const stretch = Math.abs(offset);
    const scale = this.#elasticHostWidth
      ? (this.#elasticHostWidth + stretch) / this.#elasticHostWidth
      : 1;
    this.dataset.elasticDragging = "true";
    this.style.setProperty("--propskit-slider-elastic-size", `${stretch}px`);
    this.style.setProperty("--propskit-slider-elastic-scale", `${scale}`);
    this.style.setProperty(
      "--propskit-slider-elastic-origin",
      offset < 0 ? "right center" : "left center",
    );
  }

  #resetElasticPull() {
    this.#clearElasticPull();
    this.#elasticMaxPx = 0;
    this.#elasticRangeRect = null;
    this.#elasticHostWidth = 0;
    this.#elasticPointerId = null;
  }

  #clearElasticPull() {
    this.removeAttribute("data-elastic-dragging");
    this.style.removeProperty("--propskit-slider-elastic-size");
    this.style.removeProperty("--propskit-slider-elastic-scale");
  }

  #valueFromPointer(event) {
    const input = this.#rangeInput;
    if (!input) return this.#slider?.value ?? "";
    const rect = input.getBoundingClientRect();
    const percent = rect.width
      ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      : 0;
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const step = input.step === "any" ? 0 : Number(input.step || 1);
    const raw = min + (max - min) * percent;
    if (!step) return String(raw);
    const snapped = Math.round((raw - min) / step) * step + min;
    const decimals = Math.max(0, `${step}`.split(".")[1]?.length || 0);
    return String(Number(snapped.toFixed(decimals)));
  }

  #defaultValue() {
    return (
      this.getAttribute("default") ??
      this.#slider?.getAttribute("default") ??
      this.getAttribute("value") ??
      this.#slider?.getAttribute("value") ??
      this.#rangeInput?.min ??
      "0"
    );
  }

  #resetToDefault() {
    this.#clearPendingClick();
    this.#setSliderValue(this.#defaultValue(), "input");
    this.#setSliderValue(this.#defaultValue(), "change");
  }

  #setSliderValue(value, eventType) {
    if (!this.#slider || value === null || value === undefined) return;
    this.#slider.value = value;
    this.setAttribute("value", String(this.#slider.value));
    this.dispatchEvent(
      new CustomEvent(eventType, {
        detail: this.#slider.value,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
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
    event.stopImmediatePropagation();
    if (type === "change") {
      this.#resetElasticPull();
    }
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : this.#slider?.value;
    if (this.#slider?.value !== undefined) {
      this.setAttribute("value", String(this.#slider.value));
    }
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }

  focus(options) {
    this.#syncFocusDelegation();
    const range = this.#slider?.querySelector('input[type="range"]');
    range?.setAttribute("data-propskit-focus-called", "");
    range?.focus(options);
  }

  get value() {
    return this.getAttribute("value") ?? this.#slider?.value ?? "";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      if (this.#slider) this.#slider.value = "";
      return;
    }
    const next = String(nextValue);
    this.setAttribute("value", next);
    if (this.#slider) this.#slider.value = next;
  }

  resetToDefault() {
    this.#resetToDefault();
  }
}
figLabDefineElement("propskit-slider", PropskitSlider);

/* Canvas Control */
class FigCanvasControl extends HTMLElement {
  static observedAttributes = [
    "type",
    "value",
    "color",
    "name",
    "tooltips",
    "disabled",
    "drag-surface",
    "snapping",
  ];

  #x = 50;
  #y = 50;
  #x2 = 75;
  #y2 = 75;
  #radius = 0;
  #radiusIsPercent = false;
  #angle = 0;
  #pointHandle = null;
  #secondHandle = null;
  #angleHandle = null;
  #radiusSvg = null;
  #angleSvg = null;
  #pointTooltip = null;
  #secondTooltip = null;
  #radiusTooltip = null;
  #angleTooltip = null;
  #isDragging = false;
  #isSecondDragging = false;
  #isRadiusDragging = false;
  #isAngleDragging = false;
  #moveCursorPointerId = null;
  #moveCursorPrevBodyCursor = "";
  #moveCursorPrevBodyCursorPriority = "";
  #boundMoveCursorEnd = null;
  #rotateCursorPointerId = null;
  #rotateCursorHandle = null;
  #rotateCursorPrevBodyCursor = "";
  #rotateCursorPrevBodyCursorPriority = "";
  #boundRotateCursorEnd = null;
  #activeGestureController = null;
  #activeGestureFinish = null;

  get #type() {
    return this.getAttribute("type") || "point";
  }

  get #hasRadius() {
    return this.#type === "point-radius" || this.#type === "point-radius-angle";
  }

  get #hasAngle() {
    return this.#type === "point-radius-angle";
  }

  get #hasSecondPoint() {
    return this.#type === "point-point";
  }

  get #hasLine() {
    return this.#type === "point-radius-angle" || this.#type === "point-point";
  }

  get #tooltipsEnabled() {
    const v = this.getAttribute("tooltips");
    return v === null || v !== "false";
  }

  get #snappingMode() {
    const raw = this.getAttribute("snapping");
    if (raw === null) return "false";
    const n = raw.trim().toLowerCase();
    if (n === "modifier") return "modifier";
    if (n === "" || n === "true") return "true";
    return "false";
  }

  #shouldSnap(shiftKey) {
    const mode = this.#snappingMode;
    if (mode === "true") return true;
    if (mode === "modifier") return !!shiftKey;
    return false;
  }

  get #pointTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      return parts[0].trim();
    }
    return `${Math.round(this.#x)}%, ${Math.round(this.#y)}%`;
  }

  get #secondTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      if (parts.length > 1) return parts[1].trim();
    }
    return `${Math.round(this.#x2)}%, ${Math.round(this.#y2)}%`;
  }

  get #dragSurface() {
    return this.getAttribute("drag-surface") || "parent";
  }

  get #container() {
    const surface = this.#dragSurface;
    if (surface === "parent") return this.parentElement;
    return this.closest(surface);
  }

  get #handleDragSurface() {
    const surface = this.#dragSurface;
    if (surface === "parent") {
      const container = this.parentElement;
      if (container) {
        container.setAttribute("data-fig-canvas-control-surface", "");
        return "[data-fig-canvas-control-surface]";
      }
    }
    return surface;
  }

  #resolveRadius(containerWidth) {
    if (this.#radiusIsPercent) return (this.#radius / 100) * containerWidth;
    return this.#radius;
  }

  #formatRadius() {
    if (this.#radiusIsPercent) return `Radius ${Math.round(this.#radius)}%`;
    return `Radius ${Math.round(this.#radius)}`;
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
  }

  disconnectedCallback() {
    this.#cancelActiveGesture();
    this.#teardownRadiusDrag();
    this.#deactivateMoveCursor();
    this.#deactivateRotateCursor();
    document.body.classList.remove("fig-lab-move-active");
    document.body.classList.remove("fig-lab-rotate-active");
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (
      name === "value" &&
      !this.#isDragging &&
      !this.#isSecondDragging &&
      !this.#isRadiusDragging &&
      !this.#isAngleDragging
    ) {
      this.#parseValue();
      if (this.#pointHandle) this.#syncPositions();
      else this.#render();
    }
    if (name === "type") {
      this.#cancelActiveGesture();
      this.#parseValue();
      this.#render();
    }
    if (name === "color" && this.#pointHandle) {
      if (newVal) this.#pointHandle.setAttribute("color", newVal);
      else this.#pointHandle.removeAttribute("color");
    }
    if (name === "disabled") {
      this.#cancelActiveGesture();
      this.#render();
    }
    if (name === "tooltips") {
      this.#render();
    }
    if (name === "snapping" && this.#pointHandle) {
      this.#pointHandle.setAttribute("drag-snapping", newVal || "false");
      if (this.#secondHandle)
        this.#secondHandle.setAttribute("drag-snapping", newVal || "false");
    }
    if (name === "name") {
      if (this.#pointTooltip)
        this.#pointTooltip.setAttribute("text", this.#pointTipText);
      if (this.#secondTooltip)
        this.#secondTooltip.setAttribute("text", this.#secondTipText);
    }
  }

  #parseValue() {
    const raw = this.getAttribute("value");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      if (typeof v.x === "number") this.#x = v.x;
      if (typeof v.y === "number") this.#y = v.y;
      if (v.radius !== undefined) {
        const rs = String(v.radius);
        if (rs.endsWith("%")) {
          this.#radiusIsPercent = true;
          this.#radius = parseFloat(rs);
        } else {
          this.#radiusIsPercent = false;
          this.#radius = parseFloat(rs);
        }
        if (!Number.isFinite(this.#radius)) this.#radius = 0;
      }
      if (typeof v.angle === "number") this.#angle = v.angle;
      if (typeof v.x2 === "number") this.#x2 = v.x2;
      if (typeof v.y2 === "number") this.#y2 = v.y2;
    } catch {
      /* ignore */
    }
  }

  get value() {
    const v = { x: this.#x, y: this.#y };
    if (this.#type === "color") {
      const color =
        this.getAttribute("color") || this.#pointHandle?.getAttribute("color");
      if (color) v.color = color;
    }
    if (this.#hasRadius) {
      v.radius = this.#radiusIsPercent ? `${this.#radius}%` : this.#radius;
    }
    if (this.#hasAngle) v.angle = this.#angle;
    if (this.#hasSecondPoint) {
      v.x2 = this.#x2;
      v.y2 = this.#y2;
    }
    return v;
  }

  set value(val) {
    if (typeof val === "object") {
      this.setAttribute("value", JSON.stringify(val));
    } else if (typeof val === "string") {
      this.setAttribute("value", val);
    }
  }

  #render() {
    this.#cancelActiveGesture();
    this.innerHTML = "";
    this.#pointHandle = null;
    this.#secondHandle = null;
    this.#angleHandle = null;
    this.#radiusSvg = null;
    this.#angleSvg = null;
    this.#pointTooltip = null;
    this.#secondTooltip = null;
    this.#radiusTooltip = null;
    this.#angleTooltip = null;

    const disabled = figLabBooleanAttribute(this, "disabled");
    const type = this.#type;
    const tooltips = this.#tooltipsEnabled;

    const handleSurface = this.#handleDragSurface;

    const handle = document.createElement("fig-handle");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("value", `${this.#x}% ${this.#y}%`);
    if (disabled) handle.setAttribute("disabled", "");
    if (type === "color") {
      handle.setAttribute("type", "color");
      const color = this.getAttribute("color");
      if (color) handle.setAttribute("color", color);
    } else {
      handle.setAttribute("type", "canvas");
    }
    if (this.#hasSecondPoint) {
      handle.setAttribute("hit-area", "12 circle");
      handle.setAttribute("hit-area-mode", "delegate");
    }
    this.#pointHandle = handle;

    if (this.#hasRadius) {
      this.#createRadiusSvg();
    }

    if (this.#hasLine) {
      this.#createAngleSvg();
    }

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#pointTipText);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#pointTooltip = tip;
    } else {
      this.appendChild(handle);
    }

    if (this.#hasAngle) {
      this.#createAngleHandle(disabled, tooltips, handleSurface);
    }

    if (this.#hasSecondPoint) {
      this.#createSecondHandle(disabled, tooltips, handleSurface);
    }

    this.#setupHandleDragCursor(this.#pointHandle);
    this.#setupHandleDragCursor(this.#angleHandle);
    this.#setupHandleDragCursor(this.#secondHandle);
    this.#setupEventListeners();
    this.#wireHoverTooltips();
    requestAnimationFrame(() => this.#syncPositions());
  }

  #setupHandleDragCursor(handle) {
    if (!handle) return;
    handle.addEventListener(
      "pointerdown",
      (e) => {
        // Hit-area (outside ring) = rotate; handle body = move/resize.
        const onHitArea = e.target?.classList?.contains("fig-handle-hit-area");
        if (onHitArea && handle.querySelector(".fig-handle-hit-area")) {
          this.#activateRotateCursor(e, handle);
        } else {
          this.#activateMoveCursor(e);
        }
      },
      { capture: true },
    );
  }

  #activateMoveCursor(e) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (e?.button !== undefined && e.button !== 0) return;
    if (e?.isPrimary === false) return;

    if (this.#moveCursorPointerId === null) {
      this.#moveCursorPrevBodyCursor =
        document.body.style.getPropertyValue("cursor");
      this.#moveCursorPrevBodyCursorPriority =
        document.body.style.getPropertyPriority("cursor");
    }

    this.#moveCursorPointerId = e?.pointerId ?? -1;
    document.body.classList.add("fig-lab-move-active");
    document.body.style.setProperty(
      "cursor",
      "var(--fig-lab-cursor-move)",
      "important",
    );

    if (!this.#boundMoveCursorEnd) {
      this.#boundMoveCursorEnd = (event) => {
        if (
          event?.pointerId !== undefined &&
          this.#moveCursorPointerId !== null &&
          event.pointerId !== this.#moveCursorPointerId
        ) {
          return;
        }
        if (event?.type === "blur") {
          this.#deactivateMoveCursor();
        } else {
          requestAnimationFrame(() => this.#deactivateMoveCursor());
        }
      };
    }

    window.addEventListener("pointerup", this.#boundMoveCursorEnd);
    window.addEventListener("pointercancel", this.#boundMoveCursorEnd);
    window.addEventListener("blur", this.#boundMoveCursorEnd);
  }

  #deactivateMoveCursor() {
    if (this.#moveCursorPointerId === null) return;
    document.body.classList.remove("fig-lab-move-active");
    if (this.#moveCursorPrevBodyCursor) {
      document.body.style.setProperty(
        "cursor",
        this.#moveCursorPrevBodyCursor,
        this.#moveCursorPrevBodyCursorPriority,
      );
    } else {
      document.body.style.removeProperty("cursor");
    }
    this.#moveCursorPointerId = null;
    this.#moveCursorPrevBodyCursor = "";
    this.#moveCursorPrevBodyCursorPriority = "";
    if (this.#boundMoveCursorEnd) {
      window.removeEventListener("pointerup", this.#boundMoveCursorEnd);
      window.removeEventListener("pointercancel", this.#boundMoveCursorEnd);
      window.removeEventListener("blur", this.#boundMoveCursorEnd);
    }
  }

  #rotateDegForHandle(handle) {
    if (!handle) return 0;
    if (handle === this.#angleHandle) return this.#angle;
    if (!this.#hasSecondPoint) return 0;
    const lineDeg = this.#pointPointLineDeg();
    return handle === this.#pointHandle ? lineDeg + 180 : lineDeg;
  }

  #refreshBodyRotateCursor() {
    if (this.#rotateCursorPointerId === null) return;
    const cursor = this.#rotateCursorSvg(
      this.#rotateDegForHandle(this.#rotateCursorHandle),
    );
    document.body.style.setProperty("--fig-lab-cursor-rotate", cursor);
    document.body.style.setProperty("cursor", cursor, "important");
  }

  #activateRotateCursor(e, handle) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (e?.button !== undefined && e.button !== 0) return;
    if (e?.isPrimary === false) return;

    if (this.#rotateCursorPointerId === null) {
      this.#rotateCursorPrevBodyCursor =
        document.body.style.getPropertyValue("cursor");
      this.#rotateCursorPrevBodyCursorPriority =
        document.body.style.getPropertyPriority("cursor");
    }

    this.#rotateCursorPointerId = e?.pointerId ?? -1;
    this.#rotateCursorHandle = handle;
    document.body.classList.add("fig-lab-rotate-active");
    this.#refreshBodyRotateCursor();

    if (!this.#boundRotateCursorEnd) {
      this.#boundRotateCursorEnd = (event) => {
        if (
          event?.pointerId !== undefined &&
          this.#rotateCursorPointerId !== null &&
          event.pointerId !== this.#rotateCursorPointerId
        ) {
          return;
        }
        if (event?.type === "blur") {
          this.#deactivateRotateCursor();
        } else {
          requestAnimationFrame(() => this.#deactivateRotateCursor());
        }
      };
    }

    window.addEventListener("pointerup", this.#boundRotateCursorEnd);
    window.addEventListener("pointercancel", this.#boundRotateCursorEnd);
    window.addEventListener("blur", this.#boundRotateCursorEnd);
  }

  #deactivateRotateCursor() {
    if (this.#rotateCursorPointerId === null) return;
    document.body.classList.remove("fig-lab-rotate-active");
    document.body.style.removeProperty("--fig-lab-cursor-rotate");
    if (this.#rotateCursorPrevBodyCursor) {
      document.body.style.setProperty(
        "cursor",
        this.#rotateCursorPrevBodyCursor,
        this.#rotateCursorPrevBodyCursorPriority,
      );
    } else {
      document.body.style.removeProperty("cursor");
    }
    this.#rotateCursorPointerId = null;
    this.#rotateCursorHandle = null;
    this.#rotateCursorPrevBodyCursor = "";
    this.#rotateCursorPrevBodyCursorPriority = "";
    if (this.#boundRotateCursorEnd) {
      window.removeEventListener("pointerup", this.#boundRotateCursorEnd);
      window.removeEventListener("pointercancel", this.#boundRotateCursorEnd);
      window.removeEventListener("blur", this.#boundRotateCursorEnd);
    }
  }

  #wireHoverTooltip(target, getTooltip, getText, isDraggingRef) {
    if (!target) return;
    const shouldSuppress = () => !!isDraggingRef?.();
    const hideTooltip = () => {
      const tip = getTooltip();
      if (!tip) return;
      tip.removeAttribute("show");
      tip.hidePopup?.();
    };
    const show = () => {
      if (shouldSuppress()) {
        hideTooltip();
        return;
      }
      const tip = getTooltip();
      if (!tip) return;
      if (getText) tip.setAttribute("text", getText());
      tip.setAttribute("show", "true");
      tip.showPopup?.();
    };
    const hide = () => {
      hideTooltip();
    };
    target.addEventListener("pointerenter", show);
    target.addEventListener("pointerleave", hide);
  }

  #hasActiveInteraction() {
    return (
      this.#isDragging ||
      this.#isSecondDragging ||
      this.#isRadiusDragging ||
      this.#isAngleDragging
    );
  }

  #wireHoverTooltips() {
    if (this.#pointHandle) {
      this.#wireHoverTooltip(
        this.#pointHandle,
        () => this.#pointTooltip,
        () => this.#pointTipText,
        () =>
          this.#hasActiveInteraction() ||
          !!this.#pointHandle?.querySelector("fig-color-tip"),
      );
    }
    if (this.#angleHandle) {
      this.#wireHoverTooltip(
        this.#angleHandle,
        () => this.#angleTooltip,
        () => `Angle ${Math.round(this.#angle)}°`,
        () => this.#hasActiveInteraction(),
      );
    }
    if (this.#secondHandle) {
      this.#wireHoverTooltip(
        this.#secondHandle,
        () => this.#secondTooltip,
        () => this.#secondTipText,
        () => this.#hasActiveInteraction(),
      );
    }
    if (this.#radiusSvg) {
      const hit = this.#radiusSvg.querySelector(
        ".fig-canvas-control-radius-hit",
      );
      this.#wireRadiusHoverTooltip(hit || this.#radiusSvg);
    }

    if (this.#type === "color" && this.#pointHandle && this.#pointTooltip) {
      const obs = new MutationObserver(() => {
        if (this.#pointHandle?.querySelector("fig-color-tip")) {
          this.#pointTooltip?.removeAttribute("show");
          this.#pointTooltip?.hidePopup?.();
        }
      });
      obs.observe(this.#pointHandle, { childList: true, subtree: true });
    }
  }

  #setRadiusTooltipAnchorAt(clientX, clientY) {
    const tip = this.#radiusTooltip;
    if (!tip?.popup) return;
    const y = clientY - 8;
    tip.popup.anchor = {
      getBoundingClientRect: () => ({
        left: clientX,
        top: y,
        right: clientX,
        bottom: y,
        width: 0,
        height: 0,
        x: clientX,
        y,
      }),
    };
    tip.popup.queueReposition?.();
  }

  #wireRadiusHoverTooltip(target) {
    if (!target) return;
    target.addEventListener("pointerenter", (e) => {
      const tip = this.#radiusTooltip;
      if (!tip) return;
      tip.setAttribute("text", this.#formatRadius());
      tip.setAttribute("show", "true");
      tip.showPopup?.();
      this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
    });
    target.addEventListener("pointermove", (e) => {
      if (this.#isRadiusDragging) return;
      this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
    });
    target.addEventListener("pointerleave", () => {
      if (this.#isRadiusDragging) return;
      const tip = this.#radiusTooltip;
      if (!tip) return;
      tip.removeAttribute("show");
    });
  }

  #createRadiusSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-radius");
    svg.setAttribute("overflow", "visible");
    const hitCircle = document.createElementNS(ns, "circle");
    hitCircle.classList.add("fig-canvas-control-radius-hit");
    svg.appendChild(hitCircle);
    const haloCircle = document.createElementNS(ns, "circle");
    haloCircle.classList.add("fig-canvas-control-radius-halo");
    svg.appendChild(haloCircle);
    const circle = document.createElementNS(ns, "circle");
    svg.appendChild(circle);
    this.#radiusSvg = svg;

    if (this.#tooltipsEnabled) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#formatRadius());
      tip.appendChild(svg);
      this.appendChild(tip);
      this.#radiusTooltip = tip;
    } else {
      this.appendChild(svg);
    }

    this.#setupRadiusDrag(hitCircle);
  }

  #createAngleSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-angle-svg");
    svg.setAttribute("overflow", "visible");
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";
    if (this.#hasSecondPoint) {
      const hitLine = document.createElementNS(ns, "line");
      hitLine.classList.add("fig-canvas-control-angle-line-hit");
      hitLine.setAttribute("stroke", "transparent");
      hitLine.setAttribute("stroke-width", "12");
      hitLine.setAttribute("stroke-linecap", "round");
      hitLine.style.pointerEvents = "stroke";
      svg.appendChild(hitLine);
      this.#setupLineDrag(hitLine);
    }
    const haloLine = document.createElementNS(ns, "line");
    haloLine.classList.add("fig-canvas-control-angle-line-halo");
    svg.appendChild(haloLine);
    const line = document.createElementNS(ns, "line");
    line.classList.add("fig-canvas-control-angle-line");
    svg.appendChild(line);
    this.#angleSvg = svg;
    this.appendChild(svg);
  }

  #setupLineDrag(hitLine) {
    hitLine.addEventListener("pointerdown", (e) => {
      if (figLabBooleanAttribute(this, "disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      const container = this.#container;
      if (!container) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const x0 = this.#x;
      const y0 = this.#y;
      const x20 = this.#x2;
      const y20 = this.#y2;
      this.#isDragging = true;
      this.#isSecondDragging = true;
      document.body.classList.add("fig-lab-move-active");
      hitLine.style.pointerEvents = "none";

      const onMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const dxPctRaw =
          rect.width > 0 ? ((ev.clientX - startX) / rect.width) * 100 : 0;
        const dyPctRaw =
          rect.height > 0 ? ((ev.clientY - startY) / rect.height) * 100 : 0;
        const minDx = -Math.min(x0, x20);
        const maxDx = 100 - Math.max(x0, x20);
        const minDy = -Math.min(y0, y20);
        const maxDy = 100 - Math.max(y0, y20);
        const dxPct = Math.max(minDx, Math.min(maxDx, dxPctRaw));
        const dyPct = Math.max(minDy, Math.min(maxDy, dyPctRaw));
        this.#x = x0 + dxPct;
        this.#y = y0 + dyPct;
        this.#x2 = x20 + dxPct;
        this.#y2 = y20 + dyPct;
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        document.body.classList.remove("fig-lab-move-active");
        hitLine.style.pointerEvents = "stroke";
        this.#isDragging = false;
        this.#isSecondDragging = false;
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    });
  }

  #createAngleHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("type", "canvas");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("size", "small");
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    if (disabled) handle.setAttribute("disabled", "");
    this.#angleHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", `${Math.round(this.#angle)}°`);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#angleTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #createSecondHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("type", "canvas");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    handle.setAttribute("value", `${this.#x2}% ${this.#y2}%`);
    if (disabled) handle.setAttribute("disabled", "");
    this.#secondHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#secondTipText);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#secondTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #resizeCursorSvg(deg) {
    const r = Math.round(deg);
    return `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(${r} 16 16)'%3E%3Cg filter='url(%23f)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M11.1212 16.9998L11.5607 17.4394C12.1465 18.0252 12.1464 18.975 11.5606 19.5607C10.9748 20.1465 10.0251 20.1465 9.4393 19.5606L6.4393 16.5604C5.85354 15.9746 5.85357 15.0249 6.43938 14.4391L9.43938 11.4393C10.0252 10.8535 10.9749 10.8536 11.5607 11.4394C12.1465 12.0252 12.1464 12.9749 11.5606 13.5607L11.1215 13.9998L20.8786 13.9999L20.4394 13.5607C19.8536 12.9749 19.8535 12.0252 20.4393 11.4394C21.0251 10.8536 21.9749 10.8536 22.5606 11.4394L25.5606 14.4393C25.842 14.7206 26 15.1021 26 15.4999C26 15.8978 25.842 16.2793 25.5607 16.5606L22.5607 19.5607C21.9749 20.1465 21.0251 20.1465 20.4393 19.5607C19.8536 18.9749 19.8535 18.0252 20.4393 17.4394L20.8788 16.9999L11.1212 16.9998Z' fill='white'/%3E%3C/g%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.8536 12.1465C11.0488 12.3417 11.0488 12.6583 10.8535 12.8536L8.70715 14.9998L23.2929 14.9999L21.1465 12.8536C20.9512 12.6583 20.9512 12.3417 21.1464 12.1465C21.3417 11.9512 21.6583 11.9512 21.8535 12.1465L24.8535 15.1464C24.9473 15.2402 25 15.3673 25 15.4999C25 15.6326 24.9473 15.7597 24.8536 15.8535L21.8536 18.8536C21.6583 19.0488 21.3417 19.0488 21.1465 18.8536C20.9512 18.6583 20.9512 18.3417 21.1464 18.1465L23.2929 15.9999L8.70705 15.9998L10.8536 18.1465C11.0488 18.3417 11.0488 18.6583 10.8535 18.8536C10.6583 19.0488 10.3417 19.0488 10.1464 18.8535L7.14643 15.8533C6.95118 15.658 6.95119 15.3415 7.14646 15.1462L10.1465 12.1464C10.3417 11.9512 10.6583 11.9512 10.8536 12.1465Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='f' x='3' y='9' width='26' height='15' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='a'/%3E%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='b'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3CfeBlend in2='a' result='c'/%3E%3CfeBlend in='SourceGraphic' in2='c'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E") 16 16, nwse-resize`;
  }

  #rotateCursorSvg(deg) {
    const r = Math.round(deg - 45);
    return `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(${r} 16 16)'%3E%3Cg filter='url(%23f)'%3E%3Cpath d='M12.5607 22.4393L12.0216 21.9002C17.1558 21.2216 21.2216 17.1558 21.9002 12.0216L22.4393 12.5607C23.0251 13.1464 23.9749 13.1464 24.5607 12.5607C25.1464 11.9749 25.1464 11.0251 24.5607 10.4393L21.5607 7.43934C20.9749 6.85355 20.0251 6.85355 19.4393 7.43934L16.4393 10.4393C15.8536 11.0251 15.8536 11.9749 16.4393 12.5607C17.0251 13.1464 17.9749 13.1464 18.5607 12.5607L18.8056 12.3157C18.1013 15.5527 15.5527 18.1013 12.3157 18.8056L12.5607 18.5607C13.1464 17.9749 13.1464 17.0251 12.5607 16.4393C11.9749 15.8536 11.0251 15.8536 10.4393 16.4393L7.43934 19.4393C6.85356 20.0251 6.85356 20.9749 7.43934 21.5607L10.4393 24.5607C11.0251 25.1464 11.9749 25.1464 12.5607 24.5607C13.1464 23.9749 13.1464 23.0251 12.5607 22.4393Z' fill='white'/%3E%3C/g%3E%3Cpath d='M23.8536 11.8536C23.6583 12.0488 23.3417 12.0488 23.1464 11.8536L21 9.70711V10.5C21 16.299 16.299 21 10.5 21H9.70711L11.8536 23.1464C12.0488 23.3417 12.0488 23.6583 11.8536 23.8536C11.6583 24.0488 11.3417 24.0488 11.1464 23.8536L8.14645 20.8536C7.95119 20.6583 7.95119 20.3417 8.14645 20.1464L11.1464 17.1464C11.3417 16.9512 11.6583 16.9512 11.8536 17.1464C12.0488 17.3417 12.0488 17.6583 11.8536 17.8536L9.70711 20H10.5C15.7467 20 20 15.7467 20 10.5V9.70711L17.8536 11.8536C17.6583 12.0488 17.3417 12.0488 17.1464 11.8536C16.9512 11.6583 16.9512 11.3417 17.1464 11.1464L20.1464 8.14645C20.3417 7.95119 20.6583 7.95119 20.8536 8.14645L23.8536 11.1464C24.0488 11.3417 24.0488 11.6583 23.8536 11.8536Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='f' x='4' y='5' width='24' height='24' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='a'/%3E%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='b'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3CfeBlend in2='a' result='c'/%3E%3CfeBlend in='SourceGraphic' in2='c'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E") 16 16, pointer`;
  }

  #setHitCursor(el, cursor) {
    if (!el) return;
    // !important — fig-canvas-control hover rules override plain inline cursor.
    el.style.setProperty("cursor", cursor, "important");
  }

  #applyRotateCursor(handle, deg) {
    if (!handle) return;
    // Rotate only on the outside hit-area ring — handle body uses normal point cursor.
    const hitArea = handle.querySelector(".fig-handle-hit-area");
    if (!hitArea) return;
    hitArea.setAttribute("data-cursor", "rotate");
    this.#setHitCursor(hitArea, this.#rotateCursorSvg(deg));
    if (this.#rotateCursorHandle === handle) {
      this.#refreshBodyRotateCursor();
    }
  }

  #syncAngleCursor() {
    if (!this.#angleHandle || !this.#hasAngle) return;
    this.#applyRotateCursor(this.#angleHandle, this.#angle);
  }

  #pointPointLineDeg() {
    return (Math.atan2(this.#y2 - this.#y, this.#x2 - this.#x) * 180) / Math.PI;
  }

  #syncPointPointCursors() {
    if (!this.#hasSecondPoint) return;
    const deg = this.#pointPointLineDeg();
    // Handle body: leave cursor to CSS (same as default point handle).
    this.#pointHandle?.style.removeProperty("cursor");
    this.#secondHandle?.style.removeProperty("cursor");
    this.#applyRotateCursor(this.#pointHandle, deg + 180);
    this.#applyRotateCursor(this.#secondHandle, deg);
  }

  #positionHandle(handle, xPct, yPct, rect) {
    handle.style.setProperty("--fig-handle-position-translate", "-50% -50%");
    handle.style.left = `${(xPct / 100) * rect.width}px`;
    handle.style.top = `${(yPct / 100) * rect.height}px`;
  }

  #syncPositions() {
    const container = this.#container;
    if (!container || !this.#pointHandle) return;
    const rect = container.getBoundingClientRect();

    this.#positionHandle(this.#pointHandle, this.#x, this.#y, rect);

    if (this.#radiusSvg) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const r = this.#resolveRadius(rect.width);
      const svg = this.#radiusSvg;
      const d = Math.max(r * 2, 1);
      svg.style.position = "absolute";
      svg.style.width = `${d}px`;
      svg.style.height = `${d}px`;
      svg.style.left = `${cx - r}px`;
      svg.style.top = `${cy - r}px`;
      svg.setAttribute("viewBox", `0 0 ${d} ${d}`);
      const circles = svg.querySelectorAll("circle");
      for (const c of circles) {
        c.setAttribute("cx", String(r));
        c.setAttribute("cy", String(r));
        c.setAttribute("r", String(Math.max(r - 1, 0)));
      }
    }

    if (this.#angleSvg && this.#hasLine) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      let lx2, ly2;
      if (this.#hasSecondPoint) {
        lx2 = (this.#x2 / 100) * rect.width;
        ly2 = (this.#y2 / 100) * rect.height;
      } else {
        const r = this.#resolveRadius(rect.width);
        const angleRad = (this.#angle * Math.PI) / 180;
        lx2 = cx + r * Math.cos(angleRad);
        ly2 = cy + r * Math.sin(angleRad);
      }

      const svg = this.#angleSvg;
      svg.style.width = `${rect.width}px`;
      svg.style.height = `${rect.height}px`;
      svg.style.left = "0";
      svg.style.top = "0";
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      const lines = svg.querySelectorAll(
        ".fig-canvas-control-angle-line, .fig-canvas-control-angle-line-halo, .fig-canvas-control-angle-line-hit",
      );
      for (const line of lines) {
        line.setAttribute("x1", String(cx));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(lx2));
        line.setAttribute("y2", String(ly2));
      }
    }

    if (this.#angleHandle && this.#hasAngle) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const r = this.#resolveRadius(rect.width);
      const angleRad = (this.#angle * Math.PI) / 180;
      const ax = cx + r * Math.cos(angleRad);
      const ay = cy + r * Math.sin(angleRad);
      const pxPct = rect.width > 0 ? (ax / rect.width) * 100 : 0;
      const pyPct = rect.height > 0 ? (ay / rect.height) * 100 : 0;
      this.#positionHandle(this.#angleHandle, pxPct, pyPct, rect);
    }

    if (this.#secondHandle && this.#hasSecondPoint) {
      this.#positionHandle(this.#secondHandle, this.#x2, this.#y2, rect);
    }

    this.#syncAngleCursor();
    this.#syncPointPointCursors();
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", { bubbles: true, detail: this.value }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, detail: this.value }),
    );
  }

  #syncValueAttribute() {
    this.setAttribute("value", JSON.stringify(this.value));
  }

  #setupEventListeners() {
    if (!this.#pointHandle) return;

    this.#pointHandle.addEventListener("input", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute("color", e.detail.color);
        this.#emitInput();
        return;
      }
      this.#isDragging = true;
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = Math.round(Math.max(0, Math.min(100, px * 100)));
      this.#y = Math.round(Math.max(0, Math.min(100, py * 100)));
      if (this.#pointTooltip) {
        this.#pointTooltip.removeAttribute("show");
        this.#pointTooltip.hidePopup?.();
      }
      this.#syncPositions();
      this.#emitInput();
    });

    this.#pointHandle.addEventListener("change", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute("color", e.detail.color);
        this.#emitChange();
        return;
      }
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = Math.round(Math.max(0, Math.min(100, px * 100)));
      this.#y = Math.round(Math.max(0, Math.min(100, py * 100)));
      if (this.#pointTooltip) this.#pointTooltip.removeAttribute("show");
      this.#syncPositions();
      this.#syncValueAttribute();
      this.#emitChange();
      requestAnimationFrame(() => {
        this.#isDragging = false;
      });
    });

    if (this.#angleHandle) {
      this.#angleHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        const container = this.#container;
        if (!container) return;
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        const rect = container.getBoundingClientRect();
        const cx = (this.#x / 100) * rect.width;
        const cy = (this.#y / 100) * rect.height;
        const hx = e.detail?.x ?? 0;
        const hy = e.detail?.y ?? 0;
        const hw = this.#angleHandle.offsetWidth / 2;
        const hh = this.#angleHandle.offsetHeight / 2;
        const dx = hx + hw - cx;
        const dy = hy + hh - cy;
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (this.#shouldSnap(e.detail?.shiftKey)) {
          angle = Math.round(angle / 15) * 15;
        }
        this.#angle = angle;

        let dist = Math.sqrt(dx * dx + dy * dy);
        if (this.#shouldSnap(e.detail?.shiftKey)) {
          const step = this.#radiusIsPercent ? 5 : 10;
          if (this.#radiusIsPercent) {
            let pct = (dist / rect.width) * 100;
            pct = Math.round(pct / step) * step;
            dist = (pct / 100) * rect.width;
          } else {
            dist = Math.round(dist / step) * step;
          }
        }
        if (this.#radiusIsPercent) {
          this.#radius = Math.max(0, (dist / rect.width) * 100);
        } else {
          this.#radius = Math.max(0, dist);
        }

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute(
            "text",
            `Angle ${Math.round(this.#angle)}°`,
          );
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }
        this.#syncPositions();
        this.#emitInput();
      });

      this.#angleHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        this.classList.remove("fig-canvas-control-ring-active");
        if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
        this.#syncPositions();
        this.#syncValueAttribute();
        this.#emitChange();
        requestAnimationFrame(() => {
          this.#isAngleDragging = false;
        });
      });

      this.#angleHandle.addEventListener("hitareadown", (e) => {
        e.stopPropagation();
        const origEvent = e.detail?.originalEvent;
        if (!origEvent) return;
        origEvent.preventDefault();
        const container = this.#container;
        if (!container) return;
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        this.#angleHandle.setAttribute("selected", "");

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }

        const onMove = (ev) => {
          const rect = container.getBoundingClientRect();
          const cx = (this.#x / 100) * rect.width;
          const cy = (this.#y / 100) * rect.height;
          const dx = ev.clientX - rect.left - cx;
          const dy = ev.clientY - rect.top - cy;
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (this.#shouldSnap(ev.shiftKey)) {
            angle = Math.round(angle / 15) * 15;
          }
          this.#angle = angle;
          if (this.#angleTooltip)
            this.#angleTooltip.setAttribute(
              "text",
              `Angle ${Math.round(angle)}°`,
            );
          this.#syncPositions();
          this.#emitInput();
        };

        const gesture = this.#beginActiveGesture((commit) => {
          this.#isAngleDragging = false;
          this.classList.remove("fig-canvas-control-ring-active");
          this.#angleHandle.removeAttribute("selected");
          if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
          if (commit) {
            this.#syncValueAttribute();
            this.#emitChange();
          }
        });

        window.addEventListener("pointermove", onMove, { signal: gesture.signal });
        window.addEventListener("pointerup", () => gesture.finish(true), {
          signal: gesture.signal,
        });
        window.addEventListener("pointercancel", () => gesture.finish(false), {
          signal: gesture.signal,
        });
      });
    }

    if (this.#secondHandle) {
      this.#secondHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        this.#isSecondDragging = true;
        const px = e.detail?.px ?? this.#x2 / 100;
        const py = e.detail?.py ?? this.#y2 / 100;
        this.#x2 = Math.round(Math.max(0, Math.min(100, px * 100)));
        this.#y2 = Math.round(Math.max(0, Math.min(100, py * 100)));
        if (this.#secondTooltip) {
          this.#secondTooltip.removeAttribute("show");
          this.#secondTooltip.hidePopup?.();
        }
        this.#syncPositions();
        this.#emitInput();
      });

      this.#secondHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        if (this.#secondTooltip) this.#secondTooltip.removeAttribute("show");
        this.#syncPositions();
        this.#syncValueAttribute();
        this.#emitChange();
        requestAnimationFrame(() => {
          this.#isSecondDragging = false;
        });
      });

      this.#setupPointPointHitArea(this.#pointHandle, true);
      this.#setupPointPointHitArea(this.#secondHandle, false);
    }
  }

  #setupPointPointHitArea(handle, isFirst) {
    if (!handle) return;
    handle.addEventListener("hitareadown", (e) => {
      e.stopPropagation();
      const origEvent = e.detail?.originalEvent;
      if (!origEvent) return;
      origEvent.preventDefault();
      const container = this.#container;
      if (!container) return;
      this.#isDragging = true;
      const rect = container.getBoundingClientRect();

      const pivotX = isFirst ? this.#x2 : this.#x;
      const pivotY = isFirst ? this.#y2 : this.#y;
      const movingX = isFirst ? this.#x : this.#x2;
      const movingY = isFirst ? this.#y : this.#y2;
      const pcx = (pivotX / 100) * rect.width;
      const pcy = (pivotY / 100) * rect.height;
      const mcx = (movingX / 100) * rect.width;
      const mcy = (movingY / 100) * rect.height;
      const fixedLen = Math.sqrt((mcx - pcx) ** 2 + (mcy - pcy) ** 2);

      const tooltip = isFirst ? this.#pointTooltip : this.#secondTooltip;
      if (tooltip) {
        tooltip.removeAttribute("show");
        tooltip.hidePopup?.();
      }

      const onMove = (ev) => {
        const r = container.getBoundingClientRect();
        const px = (pivotX / 100) * r.width;
        const py = (pivotY / 100) * r.height;
        const dx = ev.clientX - r.left - px;
        const dy = ev.clientY - r.top - py;
        let angle = Math.atan2(dy, dx);
        if (this.#shouldSnap(ev.shiftKey)) {
          const snapDeg = Math.round((angle * 180) / Math.PI / 15) * 15;
          angle = (snapDeg * Math.PI) / 180;
        }
        const nx = px + fixedLen * Math.cos(angle);
        const ny = py + fixedLen * Math.sin(angle);
        const newPctX = Math.max(0, Math.min(100, (nx / r.width) * 100));
        const newPctY = Math.max(0, Math.min(100, (ny / r.height) * 100));
        if (isFirst) {
          this.#x = newPctX;
          this.#y = newPctY;
        } else {
          this.#x2 = newPctX;
          this.#y2 = newPctY;
        }
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        this.#isDragging = false;
        if (tooltip) tooltip.removeAttribute("show");
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    });
  }

  #setupRadiusDrag(circle) {
    if (!circle) return;
    circle.addEventListener("pointermove", (e) => {
      if (this.#isRadiusDragging) return;
      const container = this.#container;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const deg =
        (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) *
          180) /
        Math.PI;
      this.#setHitCursor(circle, this.#resizeCursorSvg(deg));
    });
    const onDown = (e) => {
      if (figLabBooleanAttribute(this, "disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      this.#isRadiusDragging = true;
      this.classList.add("fig-canvas-control-ring-active");
      const container = this.#container;
      if (!container) return;

      if (this.#radiusTooltip) {
        this.#radiusTooltip.setAttribute("show", "true");
        this.#radiusTooltip.showPopup?.();
        this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
      }
      if (this.#angleTooltip) {
        this.#angleTooltip.removeAttribute("show");
        this.#angleTooltip.hidePopup?.();
      }
      const prevAnglePointerEvents = this.#angleHandle?.style.pointerEvents;
      const angleHitArea = this.#angleHandle?.querySelector(
        ".fig-handle-hit-area",
      );
      const prevAngleHitPointerEvents = angleHitArea?.style.pointerEvents;
      if (this.#angleHandle) {
        this.#angleHandle.style.pointerEvents = "none";
      }
      if (angleHitArea) {
        angleHitArea.style.pointerEvents = "none";
      }

      const prevBodyCursor = document.body.style.cursor;
      circle.style.pointerEvents = "none";
      const rect0 = container.getBoundingClientRect();
      const cx0 = (this.#x / 100) * rect0.width;
      const cy0 = (this.#y / 100) * rect0.height;
      const initDeg =
        (Math.atan2(e.clientY - rect0.top - cy0, e.clientX - rect0.left - cx0) *
          180) /
        Math.PI;
      let lastCursorDeg = Math.round(initDeg);
      document.body.style.cursor = this.#resizeCursorSvg(lastCursorDeg);

      const onMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const cx = (this.#x / 100) * rect.width;
        const cy = (this.#y / 100) * rect.height;
        const dx = ev.clientX - rect.left - cx;
        const dy = ev.clientY - rect.top - cy;
        const curDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        if (curDeg !== lastCursorDeg) {
          lastCursorDeg = curDeg;
          document.body.style.cursor = this.#resizeCursorSvg(curDeg);
        }
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (this.#shouldSnap(ev.shiftKey)) {
          const step = this.#radiusIsPercent ? 5 : 10;
          if (this.#radiusIsPercent) {
            let pct = (dist / rect.width) * 100;
            pct = Math.round(pct / step) * step;
            dist = (pct / 100) * rect.width;
          } else {
            dist = Math.round(dist / step) * step;
          }
        }
        if (this.#radiusIsPercent) {
          this.#radius = Math.max(0, (dist / rect.width) * 100);
        } else {
          this.#radius = Math.max(0, dist);
        }
        if (this.#radiusTooltip) {
          this.#radiusTooltip.setAttribute("text", this.#formatRadius());
          this.#setRadiusTooltipAnchorAt(ev.clientX, ev.clientY);
        }
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        this.#isRadiusDragging = false;
        this.classList.remove("fig-canvas-control-ring-active");
        circle.style.pointerEvents = "";
        if (this.#angleHandle) {
          this.#angleHandle.style.pointerEvents = prevAnglePointerEvents ?? "";
        }
        if (angleHitArea) {
          angleHitArea.style.pointerEvents = prevAngleHitPointerEvents ?? "";
        }
        document.body.style.cursor = prevBodyCursor;
        if (this.#radiusTooltip) this.#radiusTooltip.removeAttribute("show");
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    };
    circle.addEventListener("pointerdown", onDown);
    this._radiusDragCleanup = () =>
      circle.removeEventListener("pointerdown", onDown);
  }

  #teardownRadiusDrag() {
    if (this._radiusDragCleanup) {
      this._radiusDragCleanup();
      this._radiusDragCleanup = null;
    }
  }

  #beginActiveGesture(onFinish) {
    this.#cancelActiveGesture();
    const controller = new AbortController();
    let finished = false;
    const finish = (commit = false) => {
      if (finished) return;
      finished = true;
      controller.abort();
      if (this.#activeGestureController === controller) {
        this.#activeGestureController = null;
        this.#activeGestureFinish = null;
      }
      onFinish(commit);
    };
    this.#activeGestureController = controller;
    this.#activeGestureFinish = finish;
    return { signal: controller.signal, finish };
  }

  #cancelActiveGesture() {
    this.#activeGestureFinish?.(false);
    this.#activeGestureController?.abort();
    this.#activeGestureController = null;
    this.#activeGestureFinish = null;
  }
}
figLabDefineElement("fig-canvas-control", FigCanvasControl);

/* Oscillator Input */
/**
 * A waveform oscillator input with live SVG preview and parameter controls.
 * @attr {string} value - JSON string: {"waves":[{"type":"sine","frequency":1,"amplitude":1,"phase":0,"offset":0}]}
 * @attr {number} precision - Decimal places for output values.
 * @attr {string} aspect-ratio - SVG editor aspect ratio.
 * @attr {boolean} edit - Whether to show the editor and number fields. Defaults to true.
 */
class PropskitOscillator extends HTMLElement {
  #waves = [PropskitOscillator.#defaultWave()];
  #activeWaveIndex = 0;
  #precision = 2;
  #drawWidth = 240;
  #drawHeight = 120;
  #valueRange = { min: -1, max: 1 };
  #isDragging = null;
  #svg = null;
  #path = null;
  #playhead = null;
  #playheadFrame = 0;
  #baseline = null;
  #bounds = null;
  #handleAmplitude = null;
  #handleFrequency = null;
  #fields = [];
  #typeControls = [];
  #waveRows = [];
  #waveGroups = [];
  #expandedWaveIndices = new Set();
  #resizeObserver = null;
  #activeFieldInput = null;
  #dragController = null;
  #dragCleanup = null;

  static TYPES = [
    { name: "Wave", value: "sine" },
    { name: "Square", value: "square" },
    { name: "Sawtooth", value: "sawtooth" },
    { name: "Triangle", value: "triangle" },
  ];

  static #defaultWave(type = "sine") {
    return {
      type,
      frequency: 1,
      amplitude: 1,
      phase: 0,
      offset: 0,
    };
  }

  static get observedAttributes() {
    return ["value", "precision", "aspect-ratio", "edit", "disabled"];
  }

  connectedCallback() {
    this.#precision = this.#readInteger("precision", 2);
    this.#parseValue(this.getAttribute("value"));
    this.#syncAspectRatio();
    this.#render();
    this.#setupResizeObserver();
  }

  disconnectedCallback() {
    this.#cancelDrag();
    this.#stopPlayhead();
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "value") {
      this.#parseValue(newValue);
      if (this.isConnected) this.#render();
      return;
    }

    if (name === "precision") {
      this.#precision = this.#readInteger("precision", 2);
      if (this.isConnected) this.#syncUI();
      return;
    }

    if (name === "aspect-ratio") {
      this.#syncAspectRatio();
      if (this.#svg) this.#updateWaveform();
      return;
    }

    if (name === "edit" || name === "disabled") {
      if (this.isConnected) this.#render();
    }
  }

  get value() {
    return JSON.stringify(this.data);
  }

  set value(value) {
    this.setAttribute(
      "value",
      typeof value === "object" && value !== null ? JSON.stringify(value) : value,
    );
  }

  get data() {
    return {
      waves: this.#waves.map((wave) => this.#roundWave(wave)),
    };
  }

  get preset() {
    const wave = this.#activeWave;
    return PropskitOscillator.TYPES.find((type) => type.value === wave.type)?.name;
  }

  #readInteger(name, fallback) {
    const value = Number.parseInt(this.getAttribute(name) || "", 10);
    return Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : fallback;
  }

  #readBooleanAttribute(name, defaultValue = false) {
    const value = this.getAttribute(name);
    if (value === null) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "true") return true;
    if (normalized === "false") return false;
    return true;
  }

  #isEditEnabled() {
    return this.getAttribute("edit") !== "false";
  }

  #isDisabled() {
    return this.#readBooleanAttribute("disabled", false);
  }

  #syncAspectRatio() {
    const aspectRatio = this.getAttribute("aspect-ratio") || "2 / 1";
    this.style.setProperty("--aspect-ratio", aspectRatio);
  }

  #parseValue(value) {
    if (!value) return false;

    let parsed = null;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = null;
      }
    } else if (typeof value === "object") {
      parsed = value;
    }

    if (!parsed) return false;

    const nextWaves = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.waves)
        ? parsed.waves
        : [parsed];

    this.#waves = nextWaves.map((wave) => this.#normalizeWave(wave));
    if (!this.#waves.length) {
      this.#waves = [PropskitOscillator.#defaultWave()];
    }
    this.#activeWaveIndex = Math.min(this.#activeWaveIndex, this.#waves.length - 1);
    return true;
  }

  #normalizeWave(state = {}) {
    return {
      type: this.#normalizeType(state.type),
      frequency: this.#clampNumber(state.frequency, 1, 0.1, 16),
      amplitude: this.#clampNumber(state.amplitude, 1, -4, 4),
      phase: this.#clampNumber(state.phase, 0, -360, 360),
      offset: this.#clampNumber(state.offset, 0, -4, 4),
    };
  }

  #roundWave(wave) {
    return {
      type: wave.type,
      frequency: this.#round(wave.frequency),
      amplitude: this.#round(wave.amplitude),
      phase: this.#round(wave.phase),
      offset: this.#round(wave.offset),
    };
  }

  get #activeWave() {
    if (!this.#waves[this.#activeWaveIndex]) {
      this.#activeWaveIndex = 0;
    }
    return this.#waves[this.#activeWaveIndex] || PropskitOscillator.#defaultWave();
  }

  #normalizeType(type) {
    const normalized = String(type || "").toLowerCase();
    return PropskitOscillator.TYPES.some((item) => item.value === normalized)
      ? normalized
      : "sine";
  }

  #clampNumber(value, fallback, min, max) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  #round(value) {
    const scale = 10 ** this.#precision;
    return Math.round(value * scale) / scale;
  }

  static #escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  static #labelForType(type) {
    return PropskitOscillator.TYPES.find((item) => item.value === type)?.name || "Wave";
  }

  static waveIcon(type, size = 24) {
    const samples = 32;
    const pad = 5;
    const draw = size - pad * 2;
    let d = "";
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const value = PropskitOscillator.#waveValue(type, t);
      const x = pad + t * draw;
      const y = pad + (1 - (value + 1) / 2) * draw;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><path d="${d}" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  static #waveValue(type, t, phase = 0) {
    const cycle = t + phase / 360;
    const wrapped = cycle - Math.floor(cycle);
    const angle = cycle * Math.PI * 2;

    switch (type) {
      case "square":
        return Math.sin(angle) >= 0 ? 1 : -1;
      case "sawtooth":
        return wrapped * 2 - 1;
      case "triangle":
        return 1 - Math.abs(wrapped * 4 - 2);
      default:
        return Math.sin(angle);
    }
  }

  #render() {
    this.#cancelDrag();
    this.#stopPlayhead();
    this.innerHTML = this.#getInnerHTML();
    this.#cacheRefs();
    this.#syncViewportSize();
    this.#updateWaveform();
    this.#setupEvents();
    this.#startPlayhead();
  }

  #getInnerHTML() {
    const interactive = this.#isEditEnabled() && !this.#isDisabled();
    const disabled = interactive ? "" : " disabled";

    return `<div class="propskit-oscillator-svg-container">
        <svg viewBox="0 0 ${this.#drawWidth} ${this.#drawHeight}" class="propskit-oscillator-svg">
          <rect class="propskit-oscillator-bounds" x="0" y="0" width="${this.#drawWidth}" height="${this.#drawHeight}"></rect>
          <line class="propskit-oscillator-baseline"></line>
          <path class="propskit-oscillator-path"></path>
          <circle class="propskit-oscillator-playhead"></circle>
          ${interactive ? `<foreignObject class="propskit-oscillator-handle propskit-oscillator-amplitude-handle" data-handle="amplitude" width="20" height="20"><div class="propskit-oscillator-handle-inner"><fig-tooltip text="Amplitude"><fig-handle size="small" aria-label="Oscillator amplitude handle"></fig-handle></fig-tooltip></div></foreignObject>
          <foreignObject class="propskit-oscillator-handle propskit-oscillator-frequency-handle" data-handle="frequency" width="20" height="20"><div class="propskit-oscillator-handle-inner"><fig-tooltip text="Frequency"><fig-handle size="small" aria-label="Oscillator frequency handle"></fig-handle></fig-tooltip></div></foreignObject>` : ""}
        </svg>
      </div>
      ${this.#isEditEnabled() ? this.#getWaveControlsHTML(disabled) : ""}`;
  }

  #getWaveControlsHTML(disabled) {
    return `<div class="propskit-oscillator-waves">
      ${this.#waves.map((wave, index) => this.#getWaveRowHTML(wave, index, disabled)).join("")}
    </div>`;
  }

  #getWaveRowHTML(wave, index, disabled) {
    const removeDisabled = disabled || this.#waves.length <= 1 ? " disabled" : "";
    const active = index === this.#activeWaveIndex ? " data-active" : "";
    const label = PropskitOscillator.#labelForType(wave.type);
    const open = this.#expandedWaveIndices.has(index) ? ' open="true"' : ' open="false"';
    return `<fig-group class="propskit-oscillator-wave" collapsible borderless compact="true"${open} data-wave-index="${index}">
      <fig-header borderless>
        <h3>${label}</h3>
        <fig-tooltip text="Remove form">
          <fig-button class="propskit-oscillator-remove-button" variant="ghost" icon data-wave-index="${index}" aria-label="Remove form"${removeDisabled}><fig-icon name="minus"></fig-icon></fig-button>
        </fig-tooltip>
        <fig-tooltip text="Add form">
          ${this.#getWaveTypeSelectHTML("propskit-oscillator-add-type propskit-oscillator-add-type-button", "sine", disabled, index)}
        </fig-tooltip>
      </fig-header>
      <div class="propskit-oscillator-fields" data-wave-index="${index}"${active}>
        ${this.#getNumberFieldHTML(index, "frequency", "Frequency", 0.1, 16, 0.1, "")}
        ${this.#getNumberFieldHTML(index, "amplitude", "Amplitude", -4, 4, 0.1, "")}
        ${this.#getNumberFieldHTML(index, "phase", "Phase", -360, 360, 1, "°")}
        ${this.#getNumberFieldHTML(index, "offset", "Offset", -4, 4, 0.1, "")}
      </div>
    </fig-group>`;
  }

  #getWaveTypeSelectHTML(className, value, disabled, index = null) {
    const options = PropskitOscillator.TYPES.map((type) => {
      const selected = type.value === value ? " selected" : "";
      return `<fig-select-option value="${type.value}" label="${type.name}"${selected}>
        <span slot="prepend">${PropskitOscillator.waveIcon(type.value, 24)}</span>
        <span>${type.name}</span>
      </fig-select-option>`;
    }).join("");
    const indexAttr =
      index === null ? "" : ` data-wave-index="${PropskitOscillator.#escapeAttribute(String(index))}"`;
    return `<fig-select class="${className}" value="${value}" label="Add form"${indexAttr}${disabled}><fig-select-options>${options}</fig-select-options></fig-select>`;
  }

  #getNumberFieldHTML(index, name, label, min, max, step, units) {
    const disabled = this.#isDisabled() ? " disabled" : "";
    const unitsAttr = units
      ? ` units="${PropskitOscillator.#escapeAttribute(units)}"`
      : "";
    const wave = this.#waves[index] || PropskitOscillator.#defaultWave();
    return `<propskit-slider class="propskit-oscillator-field" label="${label}" direction="horizontal" name="${name}" data-wave-index="${index}" value="${this.#round(wave[name])}" min="${min}" max="${max}" step="${step}" precision="${this.#precision}" elastic="false"${unitsAttr}${disabled}></propskit-slider>`;
  }

  #cacheRefs() {
    this.#svg = this.querySelector(".propskit-oscillator-svg");
    this.#path = this.querySelector(".propskit-oscillator-path");
    this.#playhead = this.querySelector(".propskit-oscillator-playhead");
    this.#baseline = this.querySelector(".propskit-oscillator-baseline");
    this.#bounds = this.querySelector(".propskit-oscillator-bounds");
    this.#handleAmplitude = this.querySelector('[data-handle="amplitude"]');
    this.#handleFrequency = this.querySelector('[data-handle="frequency"]');
    this.#typeControls = Array.from(
      this.querySelectorAll(".propskit-oscillator-wave-type"),
    );
    this.#fields = Array.from(this.querySelectorAll("propskit-slider[name]"));
    this.#waveGroups = Array.from(
      this.querySelectorAll("fig-group.propskit-oscillator-wave"),
    );
    this.#waveRows = Array.from(
      this.querySelectorAll(".propskit-oscillator-fields"),
    );
  }

  #reindexExpandedWaves(removedIndex) {
    const nextExpanded = new Set();
    for (const index of this.#expandedWaveIndices) {
      if (index < removedIndex) nextExpanded.add(index);
      else if (index > removedIndex) nextExpanded.add(index - 1);
    }
    this.#expandedWaveIndices = nextExpanded;
  }

  #reindexExpandedWavesAfterInsert(insertIndex) {
    const nextExpanded = new Set();
    for (const index of this.#expandedWaveIndices) {
      nextExpanded.add(index >= insertIndex ? index + 1 : index);
    }
    nextExpanded.add(insertIndex);
    this.#expandedWaveIndices = nextExpanded;
  }

  #setupResizeObserver() {
    if (this.#resizeObserver || !window.ResizeObserver) return;
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#syncViewportSize()) this.#updateWaveform();
    });
    this.#resizeObserver.observe(this);
  }

  #syncViewportSize() {
    if (!this.#svg) return false;
    const rect = this.#svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 240));
    const height = Math.max(1, Math.round(rect.height || 120));
    const changed = width !== this.#drawWidth || height !== this.#drawHeight;
    this.#drawWidth = width;
    this.#drawHeight = height;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    return changed;
  }

  #getValueRange() {
    let span = 1;
    const samples = 256;
    for (let i = 0; i <= samples; i++) {
      span = Math.max(span, Math.abs(this.#sampleAt(i / samples)));
    }
    return {
      min: -span,
      max: span,
    };
  }

  #toY(value) {
    const { min, max } = this.#valueRange;
    return this.#drawHeight - ((value - min) / (max - min)) * this.#drawHeight;
  }

  #fromY(y) {
    const { min, max } = this.#valueRange;
    return min + (1 - y / this.#drawHeight) * (max - min);
  }

  #sampleAt(t) {
    return this.#waves.reduce((sum, wave) => {
      const cycleT = t * wave.frequency;
      const value = PropskitOscillator.#waveValue(wave.type, cycleT, wave.phase);
      return sum + wave.offset + value * wave.amplitude;
    }, 0);
  }

  #updateWaveform() {
    if (!this.#svg || !this.#path) return;
    this.#syncViewportSize();
    this.#valueRange = this.#getValueRange();

    if (this.#bounds) {
      this.#bounds.setAttribute("width", this.#drawWidth);
      this.#bounds.setAttribute("height", this.#drawHeight);
    }

    const maxFrequency = Math.max(...this.#waves.map((wave) => wave.frequency));
    const hasSharpWave = this.#waves.some(
      (wave) => wave.type === "square" || wave.type === "sawtooth",
    );
    const samples = hasSharpWave
      ? Math.max(192, Math.ceil(maxFrequency * 64))
      : Math.max(96, Math.ceil(maxFrequency * 64));
    let d = "";
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = t * this.#drawWidth;
      const y = this.#toY(this.#sampleAt(t));
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    this.#path.setAttribute("d", d);

    const baselineY = this.#toY(0);
    this.#baseline?.setAttribute("x1", "0");
    this.#baseline?.setAttribute("y1", baselineY);
    this.#baseline?.setAttribute("x2", this.#drawWidth);
    this.#baseline?.setAttribute("y2", baselineY);

    this.#positionHandles();
  }

  #startPlayhead() {
    if (this.#playheadFrame || !this.#playhead) return;

    const tick = (time) => {
      if (!this.isConnected || !this.#playhead) {
        this.#playheadFrame = 0;
        return;
      }
      this.#updatePlayhead((time % 1000) / 1000);
      this.#playheadFrame = requestAnimationFrame(tick);
    };

    this.#playheadFrame = requestAnimationFrame(tick);
  }

  #stopPlayhead() {
    if (!this.#playheadFrame) return;
    cancelAnimationFrame(this.#playheadFrame);
    this.#playheadFrame = 0;
  }

  #updatePlayhead(t) {
    if (!this.#playhead) return;
    const x = t * this.#drawWidth;
    const y = this.#toY(this.#sampleAt(t));
    this.#playhead.setAttribute("cx", x.toFixed(1));
    this.#playhead.setAttribute("cy", y.toFixed(1));
  }

  #positionHandles() {
    const radius = 8;
    const wave = this.#activeWave;
    const amplitudeX = this.#getAmplitudeHandleX();
    const frequencyX = Math.max(
      radius,
      Math.min(this.#drawWidth - radius, this.#drawWidth / wave.frequency),
    );
    const amplitudeY = this.#toY(this.#sampleAt(amplitudeX / this.#drawWidth));
    const frequencyY = this.#toY(this.#sampleAt(frequencyX / this.#drawWidth));

    this.#setHandlePosition(this.#handleAmplitude, amplitudeX, amplitudeY, radius);
    this.#setHandlePosition(this.#handleFrequency, frequencyX, frequencyY, radius);
  }

  #getAmplitudeHandleX() {
    const wave = this.#activeWave;
    const phaseCycle = wave.phase / 360;
    const frequency = Math.max(0.1, wave.frequency);
    let targetCycle = 0.25;
    if (wave.type === "triangle") targetCycle = 0.5;
    if (wave.type === "sawtooth") targetCycle = 1;
    let t = (targetCycle - phaseCycle) / frequency;

    while (t < 0) t += 1 / frequency;
    while (t > 1) t -= 1 / frequency;

    if (t < 0 || t > 1 || !Number.isFinite(t)) {
      t = 0.25;
    }

    return Math.max(8, Math.min(this.#drawWidth - 8, t * this.#drawWidth));
  }

  #setHandlePosition(handle, x, y, radius) {
    if (!handle) return;
    handle.setAttribute("x", x - radius);
    handle.setAttribute("y", y - radius);
    handle.setAttribute("width", radius * 2);
    handle.setAttribute("height", radius * 2);
  }

  #setupEvents() {
    if (!this.#isEditEnabled() || this.#isDisabled()) return;
    for (const typeControl of this.#typeControls) {
      typeControl.addEventListener("change", (event) => {
        if (this.#isDisabled()) return;
        const index = this.#indexFromElement(typeControl);
        this.#setActiveWave(index);
        this.#waves[index].type = this.#normalizeType(
          event.detail ?? event.target?.value,
        );
        this.#syncUI();
        this.#emit("input");
        this.#emit("change");
      });
    }

    for (const field of this.#fields) {
      field.addEventListener("input", (event) => {
        event.stopPropagation();
        this.#activeFieldInput = field;
        try {
          this.#applyFieldValue(
            this.#indexFromElement(field),
            field.getAttribute("name"),
            event.detail ?? event.currentTarget?.value ?? event.target?.value,
            "input",
          );
        } finally {
          this.#activeFieldInput = null;
        }
      });
      field.addEventListener("change", (event) => {
        event.stopPropagation();
        this.#applyFieldValue(
          this.#indexFromElement(field),
          field.getAttribute("name"),
          event.detail ?? event.currentTarget?.value ?? event.target?.value,
          "change",
        );
      });
    }

    for (const group of this.#waveGroups) {
      group.addEventListener("pointerdown", () => {
        this.#setActiveWave(this.#indexFromElement(group));
      });
      group.addEventListener("focusin", () => {
        this.#setActiveWave(this.#indexFromElement(group));
      });
      group.addEventListener("openchange", (event) => {
        const index = this.#indexFromElement(group);
        if (event.detail?.open) {
          this.#expandedWaveIndices.add(index);
        } else {
          this.#expandedWaveIndices.delete(index);
        }
      });
    }

    for (const control of this.querySelectorAll(".propskit-oscillator-add-type")) {
      const stopHeaderToggle = (event) => {
        event.stopPropagation();
      };
      control.addEventListener("pointerdown", stopHeaderToggle);
      control.addEventListener("click", stopHeaderToggle);
      control.addEventListener("change", (event) => {
        if (event.target !== control) return;
        if (this.#isDisabled()) return;
        const insertAfter = this.#indexFromElement(control);
        const insertIndex = insertAfter + 1;
        const type = this.#normalizeType(event.detail ?? control.value);
        this.#waves.splice(insertIndex, 0, PropskitOscillator.#defaultWave(type));
        this.#reindexExpandedWavesAfterInsert(insertIndex);
        this.#activeWaveIndex = insertIndex;
        this.#render();
        this.#emit("input");
        this.#emit("change");
      });
    }

    for (const button of this.querySelectorAll(".propskit-oscillator-add-type-button")) {
      const stopHeaderToggle = (event) => {
        event.stopPropagation();
      };
      button.addEventListener("pointerdown", stopHeaderToggle);
      button.addEventListener("click", stopHeaderToggle);
      button.closest("fig-tooltip")?.addEventListener("pointerdown", stopHeaderToggle);
      button.closest("fig-tooltip")?.addEventListener("click", stopHeaderToggle);
    }

    for (const button of this.querySelectorAll(".propskit-oscillator-remove-button")) {
      button.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.#isDisabled() || this.#waves.length <= 1) return;
        const index = this.#indexFromElement(button);
        this.#waves.splice(index, 1);
        this.#reindexExpandedWaves(index);
        this.#activeWaveIndex = Math.min(this.#activeWaveIndex, this.#waves.length - 1);
        this.#render();
        this.#emit("input");
        this.#emit("change");
      });
    }

    for (const handle of [
      this.#handleAmplitude,
      this.#handleFrequency,
    ]) {
      this.#setupHandle(handle);
    }

    const surface = this.querySelector(".propskit-oscillator-svg-container");
    surface?.addEventListener("pointerdown", (event) => {
      if (this.#isDisabled()) return;
      if (event.target?.closest?.(".propskit-oscillator-handle, fig-handle")) {
        return;
      }
      this.#startDrag(event, "offset");
    });
  }

  #indexFromElement(element) {
    const index = Number.parseInt(element?.getAttribute("data-wave-index") || "", 10);
    return Number.isFinite(index) ? Math.min(this.#waves.length - 1, Math.max(0, index)) : 0;
  }

  #setupHandle(handleContainer) {
    const handle = handleContainer?.querySelector("fig-handle");
    const type = handleContainer?.getAttribute("data-handle");
    if (!handle || !type) return;

    handle.addEventListener(
      "pointerdown",
      (event) => {
        if (this.#isDisabled()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.#startDrag(event, type);
      },
      { capture: true },
    );

    handle.addEventListener(
      "keydown",
      (event) => {
        if (this.#isDisabled()) return;
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
            event.key,
          )
        ) {
          return;
        }
        if (!this.#handleKeyboard(event, type)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  #setActiveWave(index) {
    const nextIndex = Math.min(this.#waves.length - 1, Math.max(0, index));
    if (nextIndex === this.#activeWaveIndex) return;
    this.#activeWaveIndex = nextIndex;
    this.#syncActiveWave();
    this.#positionHandles();
  }

  #applyFieldValue(index, name, value, eventType) {
    if (this.#isDisabled()) return;
    this.#setActiveWave(index);
    const next = Number.parseFloat(value);
    if (!Number.isFinite(next)) {
      if (eventType === "change") this.#syncFields();
      return;
    }

    this.#waves[index] = this.#normalizeWave({
      ...this.#waves[index],
      [name]: next,
    });
    this.#syncUI({ skipFieldSync: eventType == "input" });
    this.#emit(eventType);
  }

  #handleKeyboard(event, type) {
    const step = event.shiftKey ? 0.5 : 0.1;
    const wave = this.#activeWave;
    switch (type) {
      case "amplitude":
        if (event.key === "ArrowUp") wave.amplitude += step;
        else if (event.key === "ArrowDown") wave.amplitude -= step;
        else if (event.key === "Home") wave.amplitude = -4;
        else if (event.key === "End") wave.amplitude = 4;
        else return false;
        break;
      case "offset":
        if (event.key === "ArrowUp") wave.offset += step;
        else if (event.key === "ArrowDown") wave.offset -= step;
        else if (event.key === "Home") wave.offset = -4;
        else if (event.key === "End") wave.offset = 4;
        else return false;
        break;
      case "frequency":
        if (event.key === "ArrowLeft") wave.frequency -= step;
        else if (event.key === "ArrowRight") wave.frequency += step;
        else if (event.key === "Home") wave.frequency = 0.1;
        else if (event.key === "End") wave.frequency = 16;
        else return false;
        break;
      default:
        return false;
    }

    this.#waves[this.#activeWaveIndex] = this.#normalizeWave(wave);
    this.#syncUI();
    this.#emit("input");
    this.#emit("change");
    return true;
  }

  #clientToSVG(event) {
    const ctm = this.#svg?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * event.clientX + inv.c * event.clientY + inv.e,
      y: inv.b * event.clientX + inv.d * event.clientY + inv.f,
    };
  }

  #startDrag(event, type) {
    this.#cancelDrag();
    this.#isDragging = type;
    this.#svg?.classList.add("dragging");
    const dragCursor =
      type === "frequency" ? "ew-resize" : type === "amplitude" ? "ns-resize" : "";
    const prevBodyCursor = document.body.style.cursor;
    if (dragCursor) {
      document.body.style.cursor = dragCursor;
    }

    const onMove = (moveEvent) => {
      if (!this.#isDragging) return;
      const point = this.#clientToSVG(moveEvent);
      const wave = this.#activeWave;

      if (type === "frequency") {
        const x = Math.max(1, Math.min(this.#drawWidth, point.x));
        wave.frequency = this.#drawWidth / x;
      } else if (type === "offset") {
        const t = this.#clampNumber(point.x / this.#drawWidth, 0, 0, 1);
        const activeValue = this.#activeWaveValueAt(wave, t);
        wave.offset =
          this.#fromY(point.y) -
          this.#sampleAtWithoutWave(this.#activeWaveIndex, t) -
          activeValue * wave.amplitude;
      } else if (type === "amplitude") {
        const t = this.#clampNumber(point.x / this.#drawWidth, 0, 0, 1);
        const activeValue = this.#activeWaveValueAt(wave, t);
        const nextAmplitude =
          this.#fromY(point.y) -
          this.#sampleAtWithoutWave(this.#activeWaveIndex, t) -
          wave.offset;
        wave.amplitude =
          Math.abs(activeValue) < 0.001 ? wave.amplitude : nextAmplitude / activeValue;
      }

      this.#waves[this.#activeWaveIndex] = this.#normalizeWave(wave);
      this.#syncUI();
      this.#emit("input");
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.#isDragging = null;
      this.#svg?.classList.remove("dragging");
      if (dragCursor) {
        document.body.style.cursor = prevBodyCursor;
      }
      controller.abort();
      if (this.#dragController === controller) {
        this.#dragController = null;
        this.#dragCleanup = null;
      }
      if (commit) this.#emit("change");
    };
    this.#dragController = controller;
    this.#dragCleanup = finish;

    document.addEventListener("pointermove", onMove, { signal: controller.signal });
    document.addEventListener("pointerup", () => finish(true), {
      signal: controller.signal,
    });
    document.addEventListener("pointercancel", () => finish(false), {
      signal: controller.signal,
    });
    window.addEventListener("blur", () => finish(false), {
      signal: controller.signal,
    });
  }

  #cancelDrag() {
    this.#dragCleanup?.(false);
    this.#dragController?.abort();
    this.#dragController = null;
    this.#dragCleanup = null;
    this.#isDragging = null;
    this.#svg?.classList.remove("dragging");
  }

  #sampleAtWithoutWave(excludedIndex, t) {
    return this.#waves.reduce((sum, wave, index) => {
      if (index === excludedIndex) return sum;
      const cycleT = t * wave.frequency;
      const value = PropskitOscillator.#waveValue(wave.type, cycleT, wave.phase);
      return sum + wave.offset + value * wave.amplitude;
    }, 0);
  }

  #activeWaveValueAt(wave, t) {
    return PropskitOscillator.#waveValue(
      wave.type,
      t * wave.frequency,
      wave.phase,
    );
  }

  #syncUI({ skipFieldSync = false } = {}) {
    this.#syncTypeControls();
    if (!skipFieldSync) this.#syncFields();
    this.#syncActiveWave();
    this.#updateWaveform();
  }

  #syncTypeControls() {
    for (const control of this.#typeControls) {
      const index = this.#indexFromElement(control);
      control.value = this.#waves[index]?.type || "sine";
    }
  }

  #syncFields() {
    for (const field of this.#fields) {
      if (field === this.#activeFieldInput) continue;
      const index = this.#indexFromElement(field);
      const name = field.getAttribute("name");
      const next = this.#round(this.#waves[index]?.[name] ?? 0);
      const slider = field.querySelector("fig-slider");
      if (slider) {
        slider.value = next;
      } else {
        field.setAttribute("value", String(next));
      }
    }
  }

  #syncActiveWave() {
    for (const row of this.#waveRows) {
      if (this.#indexFromElement(row) === this.#activeWaveIndex) {
        row.setAttribute("data-active", "");
      } else {
        row.removeAttribute("data-active");
      }
    }
  }

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          value: this.value,
          data: this.data,
          preset: PropskitOscillator.#labelForType(this.#activeWave.type),
        },
      }),
    );
  }
}
figLabDefineElement("propskit-oscillator", PropskitOscillator);

/* Angle Input */
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
  #boundHandleMouseDown;
  #boundHandleTouchStart;
  #boundHandleKeyDown;
  #boundHandleKeyUp;
  #boundHandleAngleInput;
  #boundHandleDialKeyDown;
  #gestureController = null;
  #gestureCleanup = null;

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
    this.#boundHandleMouseDown = this.#handleMouseDown.bind(this);
    this.#boundHandleTouchStart = this.#handleTouchStart.bind(this);
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    this.#boundHandleKeyUp = this.#handleKeyUp.bind(this);
    this.#boundHandleAngleInput = this.#handleAngleInput.bind(this);
    this.#boundHandleDialKeyDown = this.#handleDialKeyDown.bind(this);
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
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
    this.#cancelGesture();
    this.#cleanupListeners();
  }

  #render() {
    this.#cancelGesture();
    this.#cleanupListeners();
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
    if (this.hasAttribute("show-rotations")) {
      return this.#readBooleanAttribute("show-rotations", false);
    }
    return false;
  }

  #getInnerHTML() {
    const step = this.#getStepForUnit();
    const minAttr = this.min !== null ? `min="${this.min}"` : "";
    const maxAttr = this.max !== null ? `max="${this.max}"` : "";
    const disabled = this.#isDisabled();
    const name =
      this.getAttribute("aria-label") || this.getAttribute("name") || "Angle";
    const ariaMin = this.min ?? this.#fromDegrees(0);
    const ariaMax = this.max ?? this.#fromDegrees(360);
    return `
        ${
          this.dial
            ? `<div class="fig-input-angle-plane"
                role="slider"
                tabindex="${disabled ? -1 : 0}"
                aria-label="${FigInputAngle.#escapeAttribute(name)}"
                aria-valuemin="${ariaMin}"
                aria-valuemax="${ariaMax}"
                aria-valuenow="${this.angle}"
                aria-valuetext="${FigInputAngle.#escapeAttribute(`${this.angle.toFixed(this.precision)}${this.units}`)}"
                ${disabled ? 'aria-disabled="true"' : ""}>
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
                units="${this.units}"
                aria-label="${FigInputAngle.#escapeAttribute(name)}"
                ${disabled ? "disabled" : ""}>
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

  static #escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  #isDisabled() {
    return figLabBooleanAttribute(this, "disabled");
  }

  #clampValue(value) {
    let next = Number(value);
    if (!Number.isFinite(next)) return this.angle;
    if (this.min !== null && Number.isFinite(this.min)) {
      next = Math.max(this.min, next);
    }
    if (this.max !== null && Number.isFinite(this.max)) {
      next = Math.min(this.max, next);
    }
    return next;
  }

  #setValue(value, { reflect = true } = {}) {
    const next = this.#clampValue(value);
    this.angle = next;
    this.#calculateAdjacentAndOpposite();
    if (reflect) {
      const serialized = String(next);
      if (this.getAttribute("value") !== serialized) {
        this.setAttribute("value", serialized);
      }
    }
    this.#syncHandlePosition();
    if (this.angleInput) {
      this.angleInput.value = next.toFixed(this.precision);
    }
    this.#syncDialState();
    this.#updateRotationDisplay();
  }

  #syncDialState() {
    if (!this.plane) return;
    this.plane.setAttribute("aria-valuenow", String(this.angle));
    this.plane.setAttribute(
      "aria-valuetext",
      `${this.angle.toFixed(this.precision)}${this.units}`,
    );
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
    switch (toUnit) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  #setupListeners() {
    this.handle = this.querySelector(".fig-input-angle-handle");
    this.plane = this.querySelector(".fig-input-angle-plane");
    this.angleInput = this.querySelector("fig-input-number[name='angle']");
    this.rotationSpan = this.querySelector(".fig-input-angle-rotations");
    this.#updateRotationDisplay();
    this.plane?.addEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.addEventListener("touchstart", this.#boundHandleTouchStart);
    this.plane?.addEventListener("keydown", this.#boundHandleDialKeyDown);
    window.addEventListener("keydown", this.#boundHandleKeyDown);
    window.addEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.addEventListener("input", this.#boundHandleAngleInput);
      this.angleInput.addEventListener("change", this.#boundHandleAngleInput);
    }
    this.addEventListener("change", this.#boundHandleRawChange, true);
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.removeEventListener("touchstart", this.#boundHandleTouchStart);
    this.plane?.removeEventListener("keydown", this.#boundHandleDialKeyDown);
    window.removeEventListener("keydown", this.#boundHandleKeyDown);
    window.removeEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#boundHandleAngleInput);
      this.angleInput.removeEventListener("change", this.#boundHandleAngleInput);
    }
    this.removeEventListener("change", this.#boundHandleRawChange, true);
  }

  #handleRawChange(e) {
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
    if (this.#isDisabled()) return;
    this.#setValue(Number(e.target.value));
    if (e.type === "change") this.#emitChangeEvent();
    else this.#emitInputEvent();
  }

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
    let normalizedAngle = ((rawAngle % 360) + 360) % 360;
    normalizedAngle = this.#snapToIncrement(normalizedAngle);

    const isBounded = this.min !== null || this.max !== null;

    if (isBounded) {
      this.angle = this.#clampValue(this.#fromDegrees(normalizedAngle));
    } else {
      if (this.#prevRawAngle === null) {
        this.#prevRawAngle = normalizedAngle;
        const currentDeg = this.#toDegrees(this.angle);
        const currentMod = ((currentDeg % 360) + 360) % 360;
        let delta = normalizedAngle - currentMod;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle = this.#clampValue(this.angle + this.#fromDegrees(delta));
      } else {
        let delta = normalizedAngle - this.#prevRawAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle = this.#clampValue(this.angle + this.#fromDegrees(delta));
        this.#prevRawAngle = normalizedAngle;
      }
    }

    this.#calculateAdjacentAndOpposite();
    this.setAttribute("value", String(this.angle));

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();
    this.#syncDialState();

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, angle: this.angle },
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, angle: this.angle },
      }),
    );
  }

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

  #handleMouseDown(e) {
    if (this.#isDisabled() || e.button !== 0) return;
    this.#cancelGesture();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      controller.abort();
      if (this.#gestureController === controller) {
        this.#gestureController = null;
        this.#gestureCleanup = null;
      }
      if (commit) this.#emitChangeEvent();
    };
    this.#gestureController = controller;
    this.#gestureCleanup = finish;

    window.addEventListener("mousemove", handleMouseMove, {
      signal: controller.signal,
    });
    window.addEventListener("mouseup", () => finish(true), {
      signal: controller.signal,
    });
    window.addEventListener("blur", () => finish(false), {
      signal: controller.signal,
    });
  }

  #handleTouchStart(e) {
    if (this.#isDisabled()) return;
    e.preventDefault();
    this.#cancelGesture();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      controller.abort();
      if (this.#gestureController === controller) {
        this.#gestureController = null;
        this.#gestureCleanup = null;
      }
      if (commit) this.#emitChangeEvent();
    };
    this.#gestureController = controller;
    this.#gestureCleanup = finish;

    window.addEventListener("touchmove", handleTouchMove, {
      signal: controller.signal,
    });
    window.addEventListener("touchend", () => finish(true), {
      signal: controller.signal,
    });
    window.addEventListener("touchcancel", () => finish(false), {
      signal: controller.signal,
    });
  }

  #cancelGesture() {
    this.#gestureCleanup?.(false);
    this.#gestureController?.abort();
    this.#gestureController = null;
    this.#gestureCleanup = null;
    this.isDragging = false;
    this.#prevRawAngle = null;
    this.plane?.classList.remove("dragging");
  }

  #handleDialKeyDown(e) {
    if (this.#isDisabled()) return;
    const step = this.#getStepForUnit() * (e.shiftKey ? 10 : 1);
    let next = this.angle;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next -= step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next += step;
    else if (e.key === "Home") next = this.min ?? this.#fromDegrees(0);
    else if (e.key === "End") next = this.max ?? this.#fromDegrees(360);
    else return;
    e.preventDefault();
    e.stopPropagation();
    this.#setValue(next);
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }

  focus() {
    this.plane?.focus();
  }

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
      "disabled",
      "aria-label",
      "name",
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
    this.#setValue(Number(value));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (this.isDragging) break;
        if (newValue !== null) this.#setValue(Number(newValue), { reflect: false });
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
        this.#setValue(this.angle);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "max":
        this.max = newValue !== null ? Number(newValue) : null;
        this.#setValue(this.angle);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "disabled":
        this.#cancelGesture();
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "aria-label":
      case "name":
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
figLabDefineElement("fig-input-angle", FigInputAngle);

/* Reorder wrapper */
class FigReorder extends HTMLElement {
  static observedAttributes = ["axis", "handle", "disabled"];

  static #DRAG_THRESHOLD = 6;

  static #INTERACTIVE_SELECTORS = [
    "input",
    "button",
    "select",
    "textarea",
    "a[href]",
    "label",
    "summary",
    "fig-button",
    "fig-dropdown",
    "fig-slider",
    "fig-input-number",
    "fig-input-text",
    "propskit-color",
    "propskit-number",
    "propskit-select",
    "propskit-slider",
    "propskit-switch",
    "propskit-text",
    "fig-checkbox",
    "fig-switch",
    "fig-combo-input",
    "fig-segmented-control",
    "fig-input-color",
    "fig-input-fill",
    '[contenteditable="true"]',
  ];

  #childObserver = null;
  #bindings = new Map();
  #drag = null;
  #indicator = null;
  #liveRegion = null;

  connectedCallback() {
    this.style.display = "contents";
    if (!this.hasAttribute("role")) this.setAttribute("role", "list");
    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", "Reorderable list");
    }
    this.#ensureLiveRegion();
    this.#syncChildren();
    this.#childObserver = new MutationObserver(() => this.#syncChildren());
    this.#childObserver.observe(this, { childList: true });
  }

  disconnectedCallback() {
    this.#childObserver?.disconnect();
    this.#childObserver = null;
    this.#unbindAll();
    this.#cancelDrag();
    this.#removeIndicator();
    this.#liveRegion?.remove();
    this.#liveRegion = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      if (this.#disabled) this.#cancelDrag();
      this.#syncChildren();
    }
  }

  get #disabled() {
    return (
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false"
    );
  }

  get #axis() {
    const value = (this.getAttribute("axis") || "vertical").trim().toLowerCase();
    return value === "horizontal" ? "horizontal" : "vertical";
  }

  get #handleSelector() {
    return (this.getAttribute("handle") || "").trim();
  }

  #getElementChildren() {
    return [...this.children].filter(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        !node.hasAttribute("data-reorder-live"),
    );
  }

  #syncChildren() {
    const children = this.#getElementChildren();
    const childSet = new Set(children);

    for (const [child, binding] of this.#bindings) {
      if (!childSet.has(child)) {
        binding.target.removeEventListener(
          "pointerdown",
          binding.onPointerDown,
          true,
        );
        binding.target.removeEventListener("keydown", binding.onKeyDown);
        this.#restoreKeyboardAttrs(binding);
        this.#bindings.delete(child);
      }
    }

    this.#clearHandleMarks(children);
    this.#clearReorderItemMarks(children);

    if (this.#disabled || children.length < 2) {
      this.#unbindAll();
      return;
    }

    for (const child of children) {
      const target = this.#getDragTarget(child);
      const existing = this.#bindings.get(child);
      if (existing && existing.target === target) continue;
      if (existing) {
        existing.target.removeEventListener(
          "pointerdown",
          existing.onPointerDown,
          true,
        );
        this.#bindings.delete(child);
      }
      if (!target) continue;
      this.#bindChild(child, target);
    }

    this.#markHandles(children);
    this.#markReorderItems(children);
  }

  #clearReorderItemMarks(children) {
    for (const child of children) {
      child.removeAttribute("data-reorder-item");
      if (child.hasAttribute("data-reorder-generated-role")) {
        child.removeAttribute("role");
        child.removeAttribute("data-reorder-generated-role");
      }
    }
  }

  #markReorderItems(children) {
    for (const child of children) {
      child.setAttribute("data-reorder-item", "");
      if (!child.hasAttribute("role")) {
        child.setAttribute("role", "listitem");
        child.setAttribute("data-reorder-generated-role", "");
      }
    }
  }

  #clearHandleMarks(children) {
    for (const child of children) {
      child
        .querySelectorAll("[data-reorder-handle]")
        .forEach((node) => {
          node.removeAttribute("data-reorder-handle");
          node.removeAttribute("aria-roledescription");
        });
    }
  }

  #markHandles(children) {
    if (!this.#handleSelector) return;
    for (const child of children) {
      const handle = child.querySelector(this.#handleSelector);
      if (handle) {
        handle.setAttribute("data-reorder-handle", "");
        handle.setAttribute("aria-roledescription", "reorder handle");
      }
    }
  }

  #getDragTarget(child) {
    if (this.#handleSelector) {
      return child.querySelector(this.#handleSelector);
    }
    return child;
  }

  #bindChild(child, target) {
    const onPointerDown = (event) => {
      if (this.#disabled || this.#getElementChildren().length < 2) return;
      if (event.button !== 0) return;
      if (
        !this.#handleSelector &&
        this.#isInteractiveTarget(event.target, child)
      ) {
        return;
      }
      this.#startPendingDrag(event, child, target);
    };
    const originalTabIndex = target.getAttribute("tabindex");
    const originalAriaLabel = target.getAttribute("aria-label");
    const originalRole = target.getAttribute("role");
    const itemName =
      child.getAttribute("aria-label") ||
      child.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
      "item";
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", `Move ${itemName}`);
    if (target !== child && !target.hasAttribute("role")) {
      target.setAttribute("role", "button");
    }
    const onKeyDown = (event) => {
      if (this.#disabled) return;
      const horizontal = this.#axis === "horizontal";
      const previousKey = horizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = horizontal ? "ArrowRight" : "ArrowDown";
      if (
        event.key !== previousKey &&
        event.key !== nextKey &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const items = this.#getElementChildren();
      const oldIndex = items.indexOf(child);
      let newIndex = oldIndex;
      if (event.key === previousKey) newIndex = Math.max(0, oldIndex - 1);
      else if (event.key === nextKey) {
        newIndex = Math.min(items.length - 1, oldIndex + 1);
      } else if (event.key === "Home") newIndex = 0;
      else if (event.key === "End") newIndex = items.length - 1;
      if (newIndex === oldIndex) {
        this.#announce(`${itemName}, position ${oldIndex + 1} of ${items.length}`);
        return;
      }
      this.#moveItemToFinalIndex(child, newIndex);
      this.#syncChildren();
      this.#getDragTarget(child)?.focus();
      this.dispatchEvent(
        new CustomEvent("reorder", {
          bubbles: true,
          detail: { oldIndex, newIndex, item: child },
        }),
      );
      this.#announce(`${itemName}, position ${newIndex + 1} of ${items.length}`);
    };

    target.addEventListener("pointerdown", onPointerDown, true);
    target.addEventListener("keydown", onKeyDown);
    this.#bindings.set(child, {
      target,
      onPointerDown,
      onKeyDown,
      originalTabIndex,
      originalAriaLabel,
      originalRole,
    });
  }

  #restoreKeyboardAttrs(binding) {
    const { target, originalTabIndex, originalAriaLabel, originalRole } = binding;
    if (originalTabIndex === null) target.removeAttribute("tabindex");
    else target.setAttribute("tabindex", originalTabIndex);
    if (originalAriaLabel === null) target.removeAttribute("aria-label");
    else target.setAttribute("aria-label", originalAriaLabel);
    if (originalRole === null) target.removeAttribute("role");
    else target.setAttribute("role", originalRole);
  }

  #ensureLiveRegion() {
    if (this.#liveRegion?.isConnected) return;
    const region = document.createElement("span");
    region.setAttribute("data-reorder-live", "");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    Object.assign(region.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    this.#liveRegion = region;
    document.body.appendChild(region);
  }

  #announce(message) {
    if (!this.#liveRegion) return;
    this.#liveRegion.textContent = "";
    requestAnimationFrame(() => {
      if (this.#liveRegion) this.#liveRegion.textContent = message;
    });
  }

  #isInteractiveTarget(target, child) {
    let node = target;
    while (node && node !== child) {
      if (node instanceof Element) {
        for (const selector of FigReorder.#INTERACTIVE_SELECTORS) {
          if (node.matches(selector)) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  static #DRAGGING_BODY_CLASS = "fig-reorder-dragging";

  static #setDocumentDragging(active) {
    document.body.classList.toggle(FigReorder.#DRAGGING_BODY_CLASS, active);
  }

  #startPendingDrag(event, item, target) {
    this.#cancelDrag();
    FigReorder.#setDocumentDragging(true);

    const state = {
      item,
      target,
      pointerId: event.pointerId,
      oldIndex: this.#getElementChildren().indexOf(item),
      targetIndex: this.#getElementChildren().indexOf(item),
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      onMove: null,
      onUp: null,
      onKeyDown: null,
    };

    state.onMove = (moveEvent) => {
      if (moveEvent.pointerId !== state.pointerId) return;

      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;

      if (!state.active) {
        if (dx * dx + dy * dy < FigReorder.#DRAG_THRESHOLD * FigReorder.#DRAG_THRESHOLD) {
          return;
        }
        state.active = true;
        event.preventDefault();
        event.stopPropagation();
        item.classList.add("dragging");
        try {
          target.setPointerCapture(state.pointerId);
        } catch {}
      }

      moveEvent.preventDefault();
      const pointer =
        this.#axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const index = this.#getInsertIndex(pointer);
      state.targetIndex = index;
      this.#updateIndicator(index, item);
    };

    state.onKeyDown = (keyEvent) => {
      if (keyEvent.key !== "Escape" || !state.active) return;
      keyEvent.preventDefault();
      this.#finishDrag(state, true);
    };

    state.onUp = (upEvent) => {
      if (upEvent.pointerId !== state.pointerId) return;
      this.#finishDrag(state, upEvent.type === "pointercancel");
    };

    this.#drag = state;
    window.addEventListener("pointermove", state.onMove);
    window.addEventListener("pointerup", state.onUp);
    window.addEventListener("pointercancel", state.onUp);
    window.addEventListener("keydown", state.onKeyDown);
  }

  #getInsertIndex(pointer) {
    const items = this.#getElementChildren();
    const horizontal = this.#axis === "horizontal";

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midpoint = horizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      if (pointer < midpoint) return i;
    }

    return items.length;
  }

  #shouldShowIndicator(item, index) {
    const items = this.#getElementChildren();
    const currentIndex = items.indexOf(item);
    if (currentIndex === -1) return false;

    const clamped = Math.max(0, Math.min(index, items.length));

    if (index === currentIndex) return false;

    // Hide only the redundant bottom line when the dragged item is already last.
    if (clamped >= items.length && currentIndex === items.length - 1) {
      return false;
    }

    return true;
  }

  #getReorderBounds(items) {
    if (!items.length) return null;

    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
    }

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  #ensureIndicator() {
    if (this.#indicator) return this.#indicator;

    const indicator = document.createElement("div");
    indicator.className = "fig-reorder-indicator";
    indicator.setAttribute("data-axis", this.#axis);
    document.body.appendChild(indicator);
    this.#indicator = indicator;
    return indicator;
  }

  #updateIndicator(index, item) {
    const items = this.#getElementChildren();
    if (!this.#shouldShowIndicator(item, index)) {
      this.#removeIndicator();
      return;
    }

    const bounds = this.#getReorderBounds(items);
    if (!bounds) {
      this.#removeIndicator();
      return;
    }

    const indicator = this.#ensureIndicator();
    indicator.setAttribute("data-axis", this.#axis);

    if (this.#axis === "horizontal") {
      let x;
      if (index <= 0) {
        x = items[0].getBoundingClientRect().left;
      } else if (index >= items.length) {
        x = items[items.length - 1].getBoundingClientRect().right;
      } else {
        x = items[index].getBoundingClientRect().left;
      }

      indicator.style.left = `${x - 1}px`;
      indicator.style.top = `${bounds.top}px`;
      indicator.style.width = "2px";
      indicator.style.height = `${bounds.height}px`;
      return;
    }

    let y;
    if (index <= 0) {
      y = items[0].getBoundingClientRect().top;
    } else if (index >= items.length) {
      y = items[items.length - 1].getBoundingClientRect().bottom;
    } else {
      y = items[index].getBoundingClientRect().top;
    }

    indicator.style.left = `${bounds.left}px`;
    indicator.style.top = `${y - 1}px`;
    indicator.style.width = `${bounds.width}px`;
    indicator.style.height = "2px";
  }

  #removeIndicator() {
    this.#indicator?.remove();
    this.#indicator = null;
  }

  #moveItemToIndex(item, index) {
    const items = this.#getElementChildren();
    const clamped = Math.max(0, Math.min(index, items.length));

    if (clamped >= items.length) {
      if (items[items.length - 1] !== item) this.appendChild(item);
      return;
    }

    const ref = items[clamped];
    if (ref !== item) this.insertBefore(item, ref);
  }

  #moveItemToFinalIndex(item, newIndex) {
    const items = this.#getElementChildren().filter((candidate) => candidate !== item);
    const ref = items[newIndex] ?? null;
    if (ref) this.insertBefore(item, ref);
    else this.appendChild(item);
  }

  #finishDrag(state, revert) {
    const { item, oldIndex, active, onMove, onUp, onKeyDown } = state;

    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKeyDown);

    if (active) {
      if (!revert) {
        this.#moveItemToIndex(item, state.targetIndex);
        const newIndex = this.#getElementChildren().indexOf(item);
        if (newIndex !== -1 && newIndex !== oldIndex) {
          this.dispatchEvent(
            new CustomEvent("reorder", {
              bubbles: true,
              detail: { oldIndex, newIndex, item },
            }),
          );
          const name =
            item.getAttribute("aria-label") ||
            item.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
            "item";
          this.#announce(
            `${name}, position ${newIndex + 1} of ${this.#getElementChildren().length}`,
          );
        }
      }
    }

    item.classList.remove("dragging");
    FigReorder.#setDocumentDragging(false);
    this.#removeIndicator();
    if (this.#drag === state) this.#drag = null;
  }

  #unbindAll() {
    for (const [, binding] of this.#bindings) {
      binding.target.removeEventListener(
        "pointerdown",
        binding.onPointerDown,
        true,
      );
      binding.target.removeEventListener("keydown", binding.onKeyDown);
      this.#restoreKeyboardAttrs(binding);
    }
    this.#bindings.clear();
  }

  #cancelDrag() {
    if (!this.#drag) return;
    this.#finishDrag(this.#drag, true);
  }
}

figLabDefineElement("fig-reorder", FigReorder);

/*
 * fig-select currently lives in fig.js. Keep the lab consumers resilient to
 * reconnects and selected-option mutations until those core fixes can move
 * with the component.
 */
const figLabEnhancedSelects = new WeakSet();
const figLabDisconnectedSelects = new WeakSet();
const figLabReconnectFallbacks = new WeakSet();

function figLabSelectOptions(select) {
  return Array.from(select.querySelectorAll("fig-select-option"));
}

function figLabSyncSelectedOption(select, requestedOption, emit = true) {
  const options = figLabSelectOptions(select);
  if (!options.length) return;
  let option =
    requestedOption && options.includes(requestedOption)
      ? requestedOption
      : options.find((candidate) => figLabBooleanAttribute(candidate, "selected"));
  if (!option || figLabBooleanAttribute(option, "disabled")) {
    option =
      options.find((candidate) => !figLabBooleanAttribute(candidate, "disabled")) ||
      options[0];
  }
  if (!option) return;

  const value = option.value ?? option.getAttribute("value") ?? "";
  const previousValue = select.getAttribute("value") ?? "";
  select.setAttribute("value", String(value));
  for (const candidate of options) {
    const selected = candidate === option;
    candidate.toggleAttribute("selected", selected);
    candidate.setAttribute("aria-selected", String(selected));
  }
  if (emit && previousValue !== String(value)) {
    select.dispatchEvent(
      new CustomEvent("input", {
        detail: String(value),
        bubbles: true,
        composed: true,
      }),
    );
    select.dispatchEvent(
      new CustomEvent("change", {
        detail: String(value),
        bubbles: true,
        composed: true,
      }),
    );
  }
}

function figLabEnhanceSelect(select) {
  if (figLabEnhancedSelects.has(select)) return;
  const trigger = select.shadowRoot?.querySelector(".fig-select-trigger");
  if (!trigger) {
    requestAnimationFrame(() => {
      if (select.isConnected) figLabEnhanceSelect(select);
    });
    return;
  }
  figLabEnhancedSelects.add(select);

  const observer = new MutationObserver((mutations) => {
    let selectedOption = null;
    let selectedWasRemoved = false;
    for (const mutation of mutations) {
      if (
        mutation.type !== "attributes" ||
        mutation.attributeName !== "selected" ||
        mutation.target.tagName !== "FIG-SELECT-OPTION"
      ) {
        continue;
      }
      if (figLabBooleanAttribute(mutation.target, "selected")) {
        selectedOption = mutation.target;
      } else if (
        String(mutation.target.value ?? "") ===
        (select.getAttribute("value") ?? "")
      ) {
        selectedWasRemoved = true;
      }
    }
    if (selectedOption) {
      const optionValue = String(selectedOption.value ?? "");
      if ((select.getAttribute("value") ?? "") !== optionValue) {
        figLabSyncSelectedOption(select, selectedOption);
      }
    } else if (selectedWasRemoved) {
      figLabSyncSelectedOption(select, null);
    }
  });
  observer.observe(select, {
    attributes: true,
    subtree: true,
    attributeFilter: ["selected"],
  });
}

function figLabInstallSelectReconnectFallback(select) {
  if (figLabReconnectFallbacks.has(select)) return;
  const trigger = select.shadowRoot?.querySelector(".fig-select-trigger");
  if (!trigger) return;
  figLabReconnectFallbacks.add(select);

  trigger.addEventListener("click", () => {
    if (figLabBooleanAttribute(select, "disabled")) return;
    select.open = !select.open;
  });
  select.addEventListener("click", (event) => {
    const option = event
      .composedPath()
      .find((node) => node?.tagName === "FIG-SELECT-OPTION");
    if (
      !option ||
      !select.contains(option) ||
      figLabBooleanAttribute(option, "disabled")
    ) {
      return;
    }
    figLabSyncSelectedOption(select, option);
    select.open = false;
  });
}

function figLabMarkDisconnectedSelectTree(root) {
  if (root instanceof Element && root.matches("fig-select")) {
    figLabDisconnectedSelects.add(root);
  }
  root
    .querySelectorAll?.("fig-select")
    .forEach((select) => figLabDisconnectedSelects.add(select));
}

function figLabEnhanceSelectTree(root) {
  if (root instanceof Element && root.matches("fig-select")) {
    figLabEnhanceSelect(root);
  }
  root
    .querySelectorAll?.("fig-select")
    .forEach((select) => figLabEnhanceSelect(select));
}

figLabEnhanceSelectTree(document);
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.removedNodes) {
      if (node instanceof Element) figLabMarkDisconnectedSelectTree(node);
    }
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      figLabEnhanceSelectTree(node);
      const selects = node.matches("fig-select")
        ? [node]
        : [...node.querySelectorAll("fig-select")];
      for (const select of selects) {
        if (figLabDisconnectedSelects.has(select)) {
          figLabInstallSelectReconnectFallback(select);
        }
      }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });
