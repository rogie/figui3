/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBindFormReset,
  figDefineElement,
  figUniqueId,
} from "../runtime/index.js";

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
  #boundHandleChange;
  #boundHandleHostClick;
  #labelIsGenerated = false;
  #reflectingChecked = false;
  #reflectingValue = false;
  #nativeResetChecked = false;
  #nativeResetValue = "";
  #hasNativeResetChecked = false;
  #hasNativeResetValue = false;
  #unbindFormReset = null;

  constructor() {
    super();
    this.input = document.createElement("input");
    this.name = this.getAttribute("name") || "";
    this.input.value = this.getAttribute("value") || "";
    this.input.setAttribute("id", figUniqueId());
    if (this.name) this.input.setAttribute("name", this.name);
    this.input.setAttribute("type", "checkbox");
    this.#boundHandleInput = this.handleInput.bind(this);
    this.#boundHandleChange = this.handleChange.bind(this);
    this.#boundHandleHostClick = (event) => {
      if (event.target !== this || this.input.disabled) return;
      this.input.click();
    };
  }
  connectedCallback() {
    // Reuse cloned internals when this element is duplicated via option.cloneNode(true).
    const existingInput = this.querySelector(":scope > input");
    if (existingInput) {
      this.input = existingInput;
    } else if (!this.input.parentNode) {
      this.append(this.input);
    }

    this.input.removeEventListener("input", this.#boundHandleInput);
    this.input.addEventListener("input", this.#boundHandleInput);
    this.input.removeEventListener("change", this.#boundHandleChange);
    this.input.addEventListener("change", this.#boundHandleChange);
    this.removeEventListener("click", this.#boundHandleHostClick);
    this.addEventListener("click", this.#boundHandleHostClick);
    this.#syncInputState();
    if (!this.#hasNativeResetChecked) {
      this.#nativeResetChecked = this.#isAttrOn("checked");
      this.#hasNativeResetChecked = true;
    }
    if (!this.#hasNativeResetValue) {
      this.#nativeResetValue = this.getAttribute("value") || "";
      this.#hasNativeResetValue = true;
    }
    this.#syncNativeResetBaseline();
    this.#unbindFormReset?.();
    this.#unbindFormReset = figBindFormReset(this, () =>
      this.#syncAfterFormReset(),
    );

    const existingLabel = this.querySelector(":scope > label");
    if (existingLabel) {
      this.#labelElement = existingLabel;
      this.#labelIsGenerated = false;
      this.#labelElement.setAttribute("for", this.input.id);
    }

    // Only create label if label attribute is present
    if (this.hasAttribute("label")) {
      this.#createLabel();
      this.#labelElement.innerText = this.getAttribute("label");
    }

    if (!this.hasAttribute("label")) {
      const text = Array.from(this.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || "")
        .join(" ")
        .trim();
      if (
        text &&
        !this.input.hasAttribute("aria-label") &&
        !this.input.hasAttribute("aria-labelledby")
      ) {
        this.input.setAttribute("aria-label", text);
      }
    }

    this.render();
  }
  static get observedAttributes() {
    return [
      "disabled",
      "label",
      "checked",
      "default-checked",
      "name",
      "value",
      "indeterminate",
    ];
  }

  #createLabel() {
    if (!this.#labelElement) {
      this.#labelElement = document.createElement("label");
      this.#labelIsGenerated = true;
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
    const name = this.getAttribute("name") || this.name;
    if (name) this.input.setAttribute("name", name);
    else this.input.removeAttribute("name");
    if (indeterminate) {
      this.input.setAttribute("indeterminate", "true");
    } else {
      this.input.removeAttribute("indeterminate");
    }
    this.#syncAriaChecked();
  }

  #syncNativeResetBaseline() {
    this.input.defaultChecked = this.#nativeResetChecked;
    this.input.defaultValue = this.#nativeResetValue;
  }

  #reflectChecked(checked) {
    this.#reflectingChecked = true;
    this.toggleAttribute("checked", checked);
    this.#reflectingChecked = false;
  }

  #syncAfterFormReset() {
    const checked = this.input.checked;
    this.#reflectChecked(checked);
    this.removeAttribute("indeterminate");
    this.input.indeterminate = false;
    this.input.removeAttribute("indeterminate");
    this.#syncAriaChecked();
  }

  focus(options) {
    this.input.focus(options);
  }

  activate() {
    this.input.click();
  }

  get value() {
    return this.input.value;
  }

  set value(val) {
    this.input.value = val;
    this.#reflectingValue = true;
    this.setAttribute("value", val);
    this.#reflectingValue = false;
  }

  get checked() {
    return this.input.checked;
  }

  set checked(val) {
    this.input.checked = val;
    this.#reflectChecked(Boolean(val));
  }

  get default() {
    return this.#isAttrOn("default-checked");
  }

  set default(value) {
    this.toggleAttribute("default-checked", Boolean(value));
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    return !this.input.indeterminate && this.checked === this.default;
  }

  resetToDefault() {
    if (this.#isAttrOn("disabled") || this.isDefault) return;
    this.removeAttribute("indeterminate");
    this.input.indeterminate = false;
    this.checked = this.default;
    this.#syncInputState();
    const detail = { checked: this.checked, value: this.value };
    for (const type of ["input", "change"]) {
      this.dispatchEvent(
        new CustomEvent(type, {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
    }
  }

  disconnectedCallback() {
    this.#unbindFormReset?.();
    this.#unbindFormReset = null;
    this.input.removeEventListener("input", this.#boundHandleInput);
    this.input.removeEventListener("change", this.#boundHandleChange);
    this.removeEventListener("click", this.#boundHandleHostClick);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (newValue) {
          this.#createLabel();
          this.#labelElement.innerText = newValue;
        } else if (this.#labelElement && this.#labelIsGenerated) {
          this.#labelElement.remove();
          this.#labelElement = null;
          this.#labelIsGenerated = false;
        }
        break;
      case "checked":
        if (!this.#reflectingChecked) {
          this.#nativeResetChecked = this.#isAttrOn("checked");
          this.#hasNativeResetChecked = true;
          this.#syncNativeResetBaseline();
        }
        if (this.#isAttrOn("checked") && this.hasAttribute("indeterminate")) {
          this.removeAttribute("indeterminate");
        }
        this.#syncInputState();
        break;
      case "indeterminate":
        this.#syncInputState();
        break;
      case "default-checked":
        break;
      case "disabled":
        this.#syncInputState();
        break;
      case "name":
        if (newValue) this.input.setAttribute("name", newValue);
        else this.input.removeAttribute("name");
        break;
      case "value":
        this.input.value = newValue || "";
        if (!this.#reflectingValue) {
          this.#nativeResetValue = newValue || "";
          this.#hasNativeResetValue = true;
          this.#syncNativeResetBaseline();
        }
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
    this.#reflectChecked(this.input.checked);
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        composed: true,
        detail: { checked: this.input.checked, value: this.input.value },
      }),
    );
  }

  handleChange(e) {
    e.stopPropagation();
    this.#syncAriaChecked();
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { checked: this.input.checked, value: this.input.value },
      }),
    );
  }
}
figDefineElement("fig-checkbox", FigCheckbox);

export { FigCheckbox };
