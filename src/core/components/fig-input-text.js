/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figBindFormReset,
  figDefineElement,
  figValuesEqual,
} from "../runtime/index.js";
import { figNormalizeTextOnlyInputSlots } from "../runtime/input-slots.js";

/**
 * A custom text input element.
 * @attr {string} type - Input type: "text" (default) or "number"
 * @attr {string} value - The current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} size - Input size: default or "large"
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
  #value = "";
  #reflectingValue = false;
  #nativeResetValue = "";
  #hasNativeResetBaseline = false;
  #unbindFormReset = null;
  #boundMouseMove;
  #boundMouseUp;
  #boundWindowBlur;
  #boundMouseDown;
  #boundInputChange;
  #boundNativeInput;
  #boundFocusControl;
  #boundAdornmentClick;
  #mutationObserver = null;
  #syncRaf = 0;
  #previousUserSelect = "";
  #previousBodyCursor = "";
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
    this.#boundNativeInput = (e) => {
      e.stopPropagation();
      let value = e.target.value;
      if (this.type === "number") {
        value = Number(value) / (this.transform || 1);
      }
      this.value = value;
      this.#syncSearchClearVisibility();
      this.dispatchEvent(
        new CustomEvent("input", { detail: this.value, bubbles: true }),
      );
    };
    this.#boundFocusControl = () => {
      if (!this.disabled) this.focus();
    };
    this.#boundAdornmentClick = this.#handleAdornmentClick.bind(this);
  }

  connectedCallback() {
    if (!this.#hasNativeResetBaseline) {
      this.#nativeResetValue = this.getAttribute("value") ?? "";
      this.#hasNativeResetBaseline = true;
    }
    this.multiline =
      this.hasAttribute("multiline") && this.getAttribute("multiline") !== "false";
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
    this.disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.input.disabled = this.disabled;
    this.#syncInputA11yAttributes();
    this.#syncSearchPrefix();
    this.#syncSearchClear();
    this.#syncSearchClearVisibility();
    this.#syncPasswordToggle();
    this.#syncGeneratedAdornmentDisabled();
    figNormalizeTextOnlyInputSlots(this);
    this.#startObserver();

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
    this.removeEventListener("click", this.#boundAdornmentClick);
    this.addEventListener("click", this.#boundAdornmentClick);
    this.input.removeEventListener("change", this.#boundInputChange);
    this.input.addEventListener("change", this.#boundInputChange);
    this.input.removeEventListener("input", this.#boundNativeInput);
    this.input.addEventListener("input", this.#boundNativeInput);
    this.#syncNativeResetBaseline();
    this.#unbindFormReset?.();
    this.#unbindFormReset = figBindFormReset(this, () =>
      this.#syncAfterFormReset(),
    );
  }

  disconnectedCallback() {
    this.#unbindFormReset?.();
    this.#unbindFormReset = null;
    if (this.input) {
      this.input.removeEventListener("change", this.#boundInputChange);
      this.input.removeEventListener("input", this.#boundNativeInput);
    }
    this.removeEventListener("click", this.#boundAdornmentClick);
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    if (this.#syncRaf) {
      cancelAnimationFrame(this.#syncRaf);
      this.#syncRaf = 0;
    }
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
      existing.remove();
    }

    let control;
    if (wantsTextarea) {
      control = document.createElement("textarea");
      control.value = this.value;
    } else {
      control = document.createElement("input");
      control.type = this.type;
      control.value =
        this.type === "number" ? this.#transformNumber(this.value) : this.value;
    }
    control.setAttribute("data-generated", "input-control");
    if (this.name) control.name = this.name;
    control.placeholder = this.placeholder;
    this.insertBefore(control, this.querySelector('[slot="append"]'));

    return control;
  }
  #handleAdornmentClick(event) {
    const adornment = event.target?.closest?.("[slot]");
    if (!adornment || adornment.parentElement !== this) return;
    if (this.disabled) return;
    this.focus();
  }
  #startObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver(() => this.#scheduleLightDomSync());
    this.#mutationObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  #scheduleLightDomSync() {
    if (this.#syncRaf) return;
    this.#syncRaf = requestAnimationFrame(() => {
      this.#syncRaf = 0;
      if (!this.isConnected) return;
      this.#syncLightDom();
    });
  }
  #syncLightDom() {
    if (!this.input || !this.contains(this.input)) {
      this.input = this.#ensureInputControl();
      this.input.readOnly = this.readonly;
      this.input.addEventListener("change", this.#boundInputChange);
      this.input.addEventListener("input", this.#boundNativeInput);
    }
    this.#syncInputA11yAttributes();
    this.#syncSearchPrefix();
    this.#syncSearchClear();
    this.#syncSearchClearVisibility();
    this.#syncPasswordToggle();
    this.#syncGeneratedAdornmentDisabled();
    figNormalizeTextOnlyInputSlots(this);
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
    const prepend = this.querySelector('[slot="prepend"]:not([data-generated])');
    if (prepend) {
      generated?.remove();
      return;
    }
    if (generated) {
      const icon = generated.querySelector("fig-icon");
      if (icon && icon.getAttribute("name") !== "search") {
        icon.setAttribute("name", "search");
      }
      icon?.removeAttribute("color");
      return;
    }

    const icon = createFigIcon("search");
    icon.setAttribute("slot", "prepend");
    icon.setAttribute("data-generated", "search-prefix");
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
    const append = this.querySelector('[slot="append"]:not([data-generated])');
    if (append) {
      generated?.remove();
      return;
    }
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
      if (this.disabled) return;
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
    const append = this.querySelector('[slot="append"]:not([data-generated])');
    if (append) {
      generated?.remove();
      return;
    }
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
      if (this.disabled) return;
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
  #syncGeneratedAdornmentDisabled() {
    this.querySelectorAll(
      '[data-generated="search-clear"] fig-button, [data-generated="password-toggle"] fig-button',
    ).forEach((button) => {
      if (this.disabled) button.setAttribute("disabled", "");
      else button.removeAttribute("disabled");
    });
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
  }
  #handleMouseDown(e) {
    if (this.type !== "number") return;
    if (e.altKey || e.target.closest("[slot]")) {
      this.#isInteracting = true;
      this.#previousUserSelect = this.style.userSelect;
      this.#previousBodyCursor = document.body.style.cursor;
      this.input.style.cursor =
        this.style.cursor =
        document.body.style.cursor =
          "ew-resize";
      this.style.userSelect = "none";
      window.addEventListener("pointermove", this.#boundMouseMove);
      window.addEventListener("pointerup", this.#boundMouseUp);
      window.addEventListener("pointercancel", this.#boundMouseUp);
      window.addEventListener("blur", this.#boundWindowBlur);
    }
  }
  #handleMouseUp(e) {
    if (this.type !== "number") return;
    const wasInteracting = this.#isInteracting;
    this.#isInteracting = false;
    this.input.style.cursor = "";
    this.style.cursor = "";
    document.body.style.cursor = this.#previousBodyCursor;
    this.style.userSelect = this.#previousUserSelect;
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("pointercancel", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
    if (wasInteracting) {
      this.dispatchEvent(
        new CustomEvent("change", { detail: this.value, bubbles: true }),
      );
    }
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

  get value() {
    return this.#value;
  }

  set value(val) {
    const value = val ?? "";
    this.#value = value;
    const reflected = String(value);
    if (this.getAttribute("value") !== reflected) {
      this.#reflectingValue = true;
      this.setAttribute("value", reflected);
      this.#reflectingValue = false;
    }
    this.#syncRenderedValue(value);
  }

  #resolveDefaultValue() {
    const raw = this.getAttribute("default");
    if (this.type !== "number") return raw ?? "";
    const parsed = raw === null || raw.trim() === "" ? 0 : Number(raw);
    return this.#sanitizeInput(Number.isFinite(parsed) ? parsed : 0, false);
  }

  get default() {
    return this.#resolveDefaultValue();
  }

  set default(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("default");
    } else {
      this.setAttribute("default", String(value));
    }
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    return figValuesEqual(this.value, this.default);
  }

  resetToDefault() {
    if (this.disabled || this.readonly || this.isDefault) return;
    this.value = this.default;
    for (const type of ["input", "change"]) {
      this.dispatchEvent(
        new CustomEvent(type, { detail: this.value, bubbles: true }),
      );
    }
  }

  #syncRenderedValue(value) {
    if (!this.input || this.#isInteracting) return;
    const rendered =
      this.type === "number" ? String(this.#transformNumber(value)) : String(value ?? "");
    if (this.input.value !== rendered) this.input.value = rendered;
    this.#syncSearchClearVisibility();
  }

  #renderNativeValue(value) {
    if (this.type === "number") {
      return value === "" ? "" : String(this.#transformNumber(value));
    }
    return String(value ?? "");
  }

  #syncNativeResetBaseline() {
    if (!this.input) return;
    this.input.defaultValue = this.#renderNativeValue(this.#nativeResetValue);
  }

  #syncAfterFormReset() {
    if (!this.input) return;
    let value = this.input.value;
    if (this.type === "number" && value !== "") {
      value = Number(value) / (this.transform || 1);
      value = this.#sanitizeInput(value, false);
    }
    this.value = value;
    this.#syncRenderedValue(value);
  }

  static get observedAttributes() {
    return [
      "value",
      "default",
      "placeholder",
      "label",
      "disabled",
      "readonly",
      "type",
      "multiline",
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
          this.#syncGeneratedAdornmentDisabled();
          break;
        case "readonly":
          this.readonly = newValue !== null && newValue !== "false";
          this.input.readOnly = this.readonly;
          break;
        case "transform":
          if (this.type === "number") {
            this.transform = Number(newValue) || 1;
            this.input.value = this.#transformNumber(this.value);
            this.#syncNativeResetBaseline();
          }
          break;
        case "value":
          if (this.#isInteracting) break;
          let value = newValue;
          if (this.type === "number") {
            value = this.#sanitizeInput(value, false);
          }
          this.#value = value ?? "";
          if (!this.#reflectingValue) {
            this.#nativeResetValue = this.#value;
            this.#hasNativeResetBaseline = true;
            this.#syncNativeResetBaseline();
            this.#syncRenderedValue(this.#value);
          }
          break;
        case "min":
        case "max":
        case "step":
          if (newValue === null || newValue === "") {
            this[name] = undefined;
            this.input.removeAttribute(name);
          } else {
            this[name] = this.input[name] = Number(newValue);
            this.input.setAttribute(name, newValue);
          }
          break;
        case "name":
          this[name] = this.input[name] = newValue || "";
          if (newValue) this.input.setAttribute("name", newValue);
          else this.input.removeAttribute("name");
          break;
        case "placeholder":
          this.placeholder = newValue ?? "";
          this.input.placeholder = this.placeholder;
          break;
        case "type":
          this.type = newValue || "text";
          this.input.type = this.type;
          this.removeEventListener("pointerdown", this.#boundMouseDown);
          if (this.type === "number") {
            this.step = this.hasAttribute("step")
              ? Number(this.getAttribute("step"))
              : undefined;
            this.min = this.hasAttribute("min")
              ? Number(this.getAttribute("min"))
              : undefined;
            this.max = this.hasAttribute("max")
              ? Number(this.getAttribute("max"))
              : undefined;
            this.transform = Number(this.getAttribute("transform") || 1);
            this.addEventListener("pointerdown", this.#boundMouseDown);
          }
          this.#syncSearchPrefix();
          this.#syncSearchClear();
          this.#syncSearchClearVisibility();
          this.#syncPasswordToggle();
          this.#syncGeneratedAdornmentDisabled();
          this.#syncNativeResetBaseline();
          break;
        case "multiline": {
          const next = newValue !== null && newValue !== "false";
          if (next !== this.multiline) {
            this.multiline = next;
            const oldInput = this.input;
            oldInput.removeEventListener("change", this.#boundInputChange);
            oldInput.removeEventListener("input", this.#boundNativeInput);
            oldInput.remove();
            this.input = this.#ensureInputControl();
            this.input.readOnly = this.readonly;
            this.input.disabled = Boolean(this.disabled);
            this.input.addEventListener("change", this.#boundInputChange);
            this.input.addEventListener("input", this.#boundNativeInput);
            this.#syncInputA11yAttributes();
            this.#syncNativeResetBaseline();
          }
          break;
        }
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
figDefineElement("fig-input-text", FigInputText);

export { FigInputText };
