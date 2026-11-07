/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figCreateElement,
  figDefineElement,
  figUniqueId,
  figValuesEqual,
} from "../runtime/index.js";

/* Slider */
/**
 * A custom slider input element.
 * @attr {string} type - The slider type: "range", "hue", "delta", "stepper", or "opacity"
 * @attr {number} value - The current value of the slider
 * @attr {number} min - The minimum value
 * @attr {number} max - The maximum value
 * @attr {number} step - The step increment
 * @attr {number} default - Explicit tick and native snap target
 * @attr {boolean} text - Whether to show a text input alongside the slider (default true)
 * @attr {string} placeholder - Placeholder for the number input when text is enabled
 * @attr {string} units - The units to display after the value
 * @attr {number} transform - A multiplier for the displayed value
 * @attr {boolean} disabled - Whether the slider is disabled
 * @attr {string} color - The color for the slider track (for opacity type)
 */
class FigSlider extends HTMLElement {
  #isInteracting = false;
  #pendingRegeneration = false;
  #isSyncingValueAttribute = false;
  #value = "";
  #hostChildObserver = null;
  #datalistObserver = null;
  #authoredDatalist = null;
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
    opacity: {
      min: 0,
      max: 100,
      step: 0.1,
      color: "var(--figma-color-icon)",
    },
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
  #lastSliderDeltaDirection = null;
  #lastSliderUnchanged = null;

  constructor() {
    super();
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
      if (this.#pendingRegeneration && this.isConnected) {
        this.#pendingRegeneration = false;
        this.#regenerateMarkup();
      }
    };
  }

  #readAttributesFromMarkup() {
    const rawValue = this.getAttribute("value");
    this.type = this.getAttribute("type") || "range";
    this.variant = this.getAttribute("variant") || "default";
    this.text = this.getAttribute("text") !== "false";
    this.units = this.getAttribute("units") || "";
    this.transform = Number(this.getAttribute("transform") || 1);
    this.disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.precision = this.hasAttribute("precision")
      ? Number(this.getAttribute("precision"))
      : null;
    this.placeholder =
      this.getAttribute("placeholder") !== null
        ? this.getAttribute("placeholder")
        : "##";

    const defaults = this.#typeDefaults[this.type] || this.#typeDefaults.range;
    const readNumber = (name, fallback) => {
      const raw = this.getAttribute(name);
      const parsed = raw === null || raw.trim() === "" ? fallback : Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    this.min = readNumber("min", defaults.min);
    this.max = readNumber("max", defaults.max);
    this.step = readNumber("step", defaults.step);
    if (!(this.step > 0)) this.step = defaults.step > 0 ? defaults.step : 1;
    this.color = this.getAttribute("color") || defaults?.color;
    this.value = this.#normalizeSliderValue(rawValue);
  }

  #canReuseRenderedMarkup() {
    if (this.#getAuthoredDatalist()) return false;
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
      this.figInputNumber.setAttribute("value", String(this.value));
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
    this.input.removeEventListener("pointercancel", this.#boundRangePointerUp);
    this.input.addEventListener("pointercancel", this.#boundRangePointerUp);

    this.style.setProperty("--default", this.#calculateNormal(this.default));

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

  #getAuthoredDatalist() {
    return this.querySelector(":scope > datalist:not([data-generated])");
  }

  #syncAuthoredDatalistObserver() {
    this.#datalistObserver?.disconnect();
    this.#authoredDatalist = this.#getAuthoredDatalist();
    if (!this.#authoredDatalist) return;
    if (!this.#authoredDatalist.id) {
      this.#authoredDatalist.id = figUniqueId();
    }
    this.#datalistObserver ??= new MutationObserver(() => {
      this.#syncAuthoredDatalistObserver();
      this.#regenerateWhenIdle();
    });
    this.#datalistObserver.observe(this.#authoredDatalist, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  #startAuthoredChildrenObserver() {
    this.#hostChildObserver?.disconnect();
    this.#hostChildObserver = new MutationObserver((records) => {
      const datalistChanged = records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node instanceof HTMLDataListElement &&
            !node.hasAttribute("data-generated"),
        ),
      );
      if (!datalistChanged) return;
      this.#syncAuthoredDatalistObserver();
      this.#regenerateWhenIdle();
    });
    this.#hostChildObserver.observe(this, { childList: true });
    this.#syncAuthoredDatalistObserver();
  }

  #regenerateMarkup() {
    this.#readAttributesFromMarkup();

    if (this.color) {
      this.style.setProperty("--color", this.color);
    }

    const input = figCreateElement("input", {
      type: "range",
      tabindex: this.text ? "-1" : null,
      disabled: this.disabled,
      min: this.min,
      max: this.max,
      step: this.step,
      className: this.type,
      value: this.value,
      "aria-valuemin": this.min,
      "aria-valuemax": this.max,
      "aria-valuenow": this.value,
    });
    const inputContainer = figCreateElement(
      "div",
      {
        className: "fig-slider-input-container",
        role: "group",
      },
      input,
    );
    inputContainer.setAttribute("data-generated", "slider-control");
    let numberInput = null;
    if (this.text) {
      numberInput = figCreateElement("fig-input-number", {
        placeholder: this.placeholder,
        min: this.min,
        max: this.max,
        transform: this.transform,
        step: this.step,
        value: this.value,
        units: this.units || null,
        precision: this.precision,
        disabled: this.disabled,
        "data-generated": "slider-number",
      });
    }

    this.inputContainer?.remove();
    if (
      this.figInputNumber?.parentElement === this &&
      this.figInputNumber.getAttribute("data-generated") === "slider-number"
    ) {
      this.figInputNumber.remove();
    }
    this.prepend(inputContainer);
    if (numberInput) this.append(numberInput);

    this.input = input;
    this.inputContainer = inputContainer;
    this.figInputNumber = numberInput;
    this.#bindControlListeners();

    const authoredDatalist = this.#getAuthoredDatalist();
    if (authoredDatalist) {
      if (!authoredDatalist.id) authoredDatalist.id = figUniqueId();
      this.datalist = authoredDatalist.cloneNode(true);
      this.datalist.removeAttribute("id");
      this.datalist.setAttribute("data-generated", "slider-authored");
      this.inputContainer.append(this.datalist);
      this.input.setAttribute("list", authoredDatalist.id);
    } else if (this.type === "stepper") {
      this.datalist = document.createElement("datalist");
      this.datalist.setAttribute("data-generated", "slider-stepper");
      this.datalist.setAttribute("id", figUniqueId());
      const steps = Math.min(
        1001,
        Math.max(0, Math.floor((this.max - this.min) / this.step) + 1),
      );
      for (let i = 0; i < steps; i++) {
        let option = document.createElement("option");
        option.setAttribute("value", this.min + i * this.step);
        this.datalist.append(option);
      }
      this.inputContainer.append(this.datalist);
      this.input.setAttribute("list", this.datalist.getAttribute("id"));
    } else if (this.type === "delta") {
      this.datalist = document.createElement("datalist");
      this.datalist.setAttribute("data-generated", "slider-delta");
      this.datalist.setAttribute("id", figUniqueId());
      let option = document.createElement("option");
      option.setAttribute("value", this.default);
      this.datalist.append(option);
      this.inputContainer.append(this.datalist);
      this.input.setAttribute("list", this.datalist.getAttribute("id"));
    } else if (this.#hasExplicitValidDefault()) {
      this.#createDefaultDatalist();
    }
    this.#syncDefaultDatalist();
    this.#syncValue();
  }

  connectedCallback() {
    this.#startAuthoredChildrenObserver();
    if (this.#canReuseRenderedMarkup()) {
      this.#updateRenderedMarkup();
      this.#bindControlListeners();
      this.#syncValue();
      return;
    }
    this.#regenerateMarkup();
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
      this.figInputNumber.setAttribute("value", normalized);
    }
    if (this.input) this.#syncProperties();
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
    return figValuesEqual(Number(this.value), this.default);
  }

  resetToDefault() {
    if (this.disabled || this.isDefault) return;
    this.value = this.default;
    this.#syncValue();
    for (const type of ["input", "change"]) {
      this.dispatchEvent(
        new CustomEvent(type, { detail: this.value, bubbles: true }),
      );
    }
  }

  disconnectedCallback() {
    this.#pendingRegeneration = false;
    if (this.input) {
      this.input.removeEventListener("input", this.#boundHandleInput);
      this.input.removeEventListener("change", this.#boundHandleChange);
      this.input.removeEventListener("keydown", this.#boundHandleKeyDown);
      this.input.removeEventListener("pointerdown", this.#boundRangePointerDown);
      this.input.removeEventListener("pointerup", this.#boundRangePointerUp);
      this.input.removeEventListener("pointercancel", this.#boundRangePointerUp);
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
    this.#hostChildObserver?.disconnect();
    this.#hostChildObserver = null;
    this.#datalistObserver?.disconnect();
    this.#datalistObserver = null;
    this.#authoredDatalist = null;
  }

  #handleTextInput() {
    if (this.figInputNumber) {
      const rawTextValue = this.figInputNumber.value;
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
  #isStepAligned(value) {
    const { min } = this.#getBounds();
    const step = this.#toFiniteNumber(this.step);
    if (!(step > 0)) return true;
    const steps = (value - min) / step;
    const nearest = Math.round(steps);
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(steps)) * 16;
    return Math.abs(steps - nearest) <= tolerance;
  }
  #supportsGeneratedDefaultDatalist() {
    return ["range", "hue", "opacity"].includes(this.type);
  }
  #hasExplicitValidDefault() {
    if (
      !this.hasAttribute("default") ||
      !this.#supportsGeneratedDefaultDatalist()
    ) {
      return false;
    }
    const { min, max } = this.#getBounds();
    const parsed = this.#toFiniteNumber(this.getAttribute("default"));
    return (
      parsed !== null &&
      parsed >= min &&
      parsed <= max &&
      this.#isStepAligned(parsed)
    );
  }
  #resolveDefaultValue(rawDefault = this.getAttribute("default")) {
    const { min, max } = this.#getBounds();
    const parsed = this.#toFiniteNumber(rawDefault);
    const isValid =
      parsed !== null &&
      parsed >= min &&
      parsed <= max &&
      (this.type !== "stepper" || this.#isStepAligned(parsed));
    if (isValid) return parsed;
    return Math.min(max, Math.max(min, 0));
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
    const deltaDirection = complete < defaultValue ? -1 : 1;
    const unchanged = complete === defaultValue ? 1 : 0;

    if (this.#lastSliderComplete !== complete) {
      this.style.setProperty("--slider-complete", complete);
      this.#lastSliderComplete = complete;
    }
    if (this.#lastSliderDefault !== defaultValue) {
      this.style.setProperty("--default", defaultValue);
      this.#lastSliderDefault = defaultValue;
    }
    if (this.#lastSliderDeltaDirection !== deltaDirection) {
      this.style.setProperty("--slider-delta-direction", deltaDirection);
      this.#lastSliderDeltaDirection = deltaDirection;
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
      this.figInputNumber.setAttribute("value", val);
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
    this.#syncValue();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
  }

  #handleChange() {
    this.#isInteracting = false;
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
      const normalized = this.#normalizeSliderValue(rawTextValue);
      this.value = normalized;
      this.input.value = String(normalized);
      this.#syncValue();
      this.dispatchEvent(
        new CustomEvent("change", { detail: this.value, bubbles: true }),
      );
    }
  }

  #syncRangeConstraint(name, rawValue) {
    if (!this.input) return;
    const defaults = this.#typeDefaults[this.type] || this.#typeDefaults.range;
    const parsed =
      rawValue === null || String(rawValue).trim() === ""
        ? defaults[name]
        : Number(rawValue);
    let next = Number.isFinite(parsed) ? parsed : defaults[name];
    if (name === "step" && !(next > 0)) {
      next = defaults.step > 0 ? defaults.step : 1;
    }
    if (this[name] === next && this.input[name] === String(next)) return;

    this[name] = next;
    this.input[name] = String(next);
    if (name === "min") {
      this.input.setAttribute("aria-valuemin", String(next));
    } else if (name === "max") {
      this.input.setAttribute("aria-valuemax", String(next));
    }
    if (this.figInputNumber) {
      this.figInputNumber.setAttribute(name, String(next));
    }
    this.value = this.#normalizeSliderValue(this.value);
    this.#syncProperties();
    this.#syncStepperDatalist();
    this.#syncDefaultDatalist();
  }

  #syncStepperDatalist() {
    if (this.type !== "stepper" || !this.datalist) return;
    const steps = Math.min(
      1001,
      Math.max(0, Math.floor((this.max - this.min) / this.step) + 1),
    );
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < steps; i++) {
      const option = document.createElement("option");
      option.setAttribute("value", this.min + i * this.step);
      fragment.append(option);
    }
    this.datalist.replaceChildren(fragment);
    this.input.setAttribute("list", this.datalist.id);
    this.#syncDefaultDatalist();
  }

  #syncDefaultDatalist() {
    const generatedDefault =
      this.datalist?.getAttribute("data-generated") === "slider-default";
    const shouldGenerateDefault = this.#hasExplicitValidDefault();
    if (generatedDefault && !shouldGenerateDefault) {
      this.datalist.remove();
      this.datalist = null;
      this.input?.removeAttribute("list");
    } else if (!this.datalist && shouldGenerateDefault) {
      this.#createDefaultDatalist();
    }
    if (!this.datalist) return;
    const defaultValue = String(this.default);
    if (generatedDefault) {
      const option =
        this.datalist.querySelector("option") ?? document.createElement("option");
      option.value = defaultValue;
      this.datalist.replaceChildren(option);
    }
    const options = [...this.datalist.querySelectorAll("option")];
    options.forEach((option) => option.removeAttribute("default"));
    let defaultOption = options.find((option) => option.value === defaultValue);
    if (
      !defaultOption &&
      this.type === "delta" &&
      this.datalist.getAttribute("data-generated") === "slider-delta"
    ) {
      defaultOption = document.createElement("option");
      defaultOption.value = defaultValue;
      this.datalist.replaceChildren(defaultOption);
    }
    defaultOption?.setAttribute("default", "true");
  }

  #createDefaultDatalist() {
    this.datalist = document.createElement("datalist");
    this.datalist.setAttribute("data-generated", "slider-default");
    this.datalist.setAttribute("id", figUniqueId());
    const option = document.createElement("option");
    option.value = String(this.default);
    this.datalist.append(option);
    this.inputContainer.append(this.datalist);
    this.input.setAttribute("list", this.datalist.id);
  }

  #regenerateWhenIdle() {
    if (this.#isInteracting) {
      this.#pendingRegeneration = true;
      return;
    }
    this.#pendingRegeneration = false;
    this.#regenerateMarkup();
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
    if (oldValue === newValue) return;
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
            this.figInputNumber.toggleAttribute("disabled", this.disabled);
          }
          break;
        case "value":
          if (this.#isInteracting) break;
          this.value = newValue;
          this.#syncValue();
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
          this.#syncProperties();
          this.#syncDefaultDatalist();
          break;
        case "min":
        case "max":
        case "step":
          this.#syncRangeConstraint(name, newValue);
          break;
        case "units":
          this.units = newValue || "";
          if (this.figInputNumber) {
            if (this.units) {
              this.figInputNumber.setAttribute("units", this.units);
            } else {
              this.figInputNumber.removeAttribute("units");
            }
          }
          break;
        case "type":
        case "variant":
          if (!this.#isInteracting) this[name] = newValue;
          this.#regenerateWhenIdle();
          break;
        case "text":
          if (!this.#isInteracting) this.text = newValue !== "false";
          this.#regenerateWhenIdle();
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
figDefineElement("fig-slider", FigSlider);

export { FigSlider };
