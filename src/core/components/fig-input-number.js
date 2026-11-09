/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBindFormReset,
  figCreateElement,
  figDefineElement,
  figValuesEqual,
} from "../runtime/index.js";
import { figNormalizeTextOnlyInputSlots } from "../runtime/input-slots.js";

/**
 * A custom numeric input element that uses type="text" with inputmode="decimal".
 * Supports units display and all standard number input attributes.
 * @attr {string} value - The current numeric value
 * @attr {string} placeholder - Placeholder text
 * @attr {string} size - Input size: default or "large"
 * @attr {string} variant - Visual style. Use `ghost` for a borderless control.
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {number} min - Minimum value
 * @attr {number} max - Maximum value
 * @attr {number} step - Step increment
 * @attr {number} transform - A multiplier for displayed number values
 * @attr {number} precision - Fixed decimal places when set
 * @attr {string} units - Unit string to append/prepend to displayed value (e.g., "%", "°", "$")
 * @attr {string} units-disallow - Comma-separated units to disallow (defaults to "px")
 * @attr {string} unit-position - Position of unit: "suffix" (default) or "prefix"
 * @attr {boolean} steppers - Whether to show spin buttons (defaults to true)
 * @attr {string} name - Form field name
 */
class FigInputNumber extends HTMLElement {
  #nativeResetValue = "";
  #hasNativeResetBaseline = false;
  #unbindFormReset = null;
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
  #boundAdornmentClick;
  #units;
  #rawUnits;
  #unitsDisallow;
  #unitPosition;
  #precision;
  #isInteracting = false;
  #stepperEl = null;
  #stepperPointerId = null;
  #stepperRepeatTimeout = 0;
  #stepperRepeatInterval = 0;
  #stepperDidChange = false;
  #boundStepperPointerEnd;
  #boundStepperWindowBlur;
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
  static #DEFAULT_UNITS_DISALLOW = "px";
  static #STEPPER_REPEAT_DELAY = 350;
  static #STEPPER_REPEAT_INTERVAL = 60;

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
      this.#stepperEl.append(
        figCreateElement("button", {
          className: "fig-stepper-up",
          tabindex: "-1",
          "aria-label": "Increase",
        }),
        figCreateElement("button", {
          className: "fig-stepper-down",
          tabindex: "-1",
          "aria-label": "Decrease",
        }),
      );
      this.#stepperEl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const btn = e.target.closest("button");
        if (!btn || this.disabled || btn.disabled) return;
        const dir = btn.classList.contains("fig-stepper-up") ? 1 : -1;
        this.#startStepperRepeat(e, dir);
        this.input.focus();
      });
      this.append(this.#stepperEl);
    } else if (!hasSteppers && this.#stepperEl) {
      this.#stopStepperRepeat();
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

  #startStepperRepeat(event, direction) {
    this.#stopStepperRepeat();
    this.#stepperPointerId = event.pointerId;
    this.#stepperDidChange = this.#stepValue(direction);
    window.addEventListener("pointerup", this.#boundStepperPointerEnd);
    window.addEventListener("pointercancel", this.#boundStepperPointerEnd);
    window.addEventListener("blur", this.#boundStepperWindowBlur);
    if (!this.#stepperDidChange) return;

    this.#stepperRepeatTimeout = window.setTimeout(() => {
      this.#stepperRepeatTimeout = 0;
      this.#stepperRepeatInterval = window.setInterval(() => {
        const changed = this.#stepValue(direction);
        this.#stepperDidChange ||= changed;
        if (!changed) this.#clearStepperRepeatTimers();
      }, FigInputNumber.#STEPPER_REPEAT_INTERVAL);
    }, FigInputNumber.#STEPPER_REPEAT_DELAY);
  }

  #clearStepperRepeatTimers() {
    if (this.#stepperRepeatTimeout) {
      clearTimeout(this.#stepperRepeatTimeout);
      this.#stepperRepeatTimeout = 0;
    }
    if (this.#stepperRepeatInterval) {
      clearInterval(this.#stepperRepeatInterval);
      this.#stepperRepeatInterval = 0;
    }
  }

  #stopStepperRepeat(commit = true) {
    this.#clearStepperRepeatTimers();
    window.removeEventListener("pointerup", this.#boundStepperPointerEnd);
    window.removeEventListener("pointercancel", this.#boundStepperPointerEnd);
    window.removeEventListener("blur", this.#boundStepperWindowBlur);
    this.#stepperPointerId = null;
    if (commit && this.#stepperDidChange) {
      this.dispatchEvent(
        new CustomEvent("change", { detail: this.value, bubbles: true }),
      );
    }
    this.#stepperDidChange = false;
  }

  #stepValue(direction) {
    if (this.disabled) return false;
    const step = this.step || 1;
    const previousValue = this.value;
    let numericValue = this.#getNumericValue(this.input.value);
    let value =
      (numericValue !== "" ? Number(numericValue) / (this.transform || 1) : 0) +
      step * direction;
    value = this.#sanitizeInput(value, false);
    if (value === previousValue) return false;
    this.value = value;
    this.input.value = this.#formatWithUnit(this.value);
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    return true;
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
    this.#boundStepperPointerEnd = (e) => {
      if (
        this.#stepperPointerId !== null &&
        e.pointerId !== this.#stepperPointerId
      ) {
        return;
      }
      this.#stopStepperRepeat();
    };
    this.#boundStepperWindowBlur = () => this.#stopStepperRepeat();
    this.#boundFocusControl = this.focus.bind(this);
    this.#boundAdornmentClick = this.#handleAdornmentClick.bind(this);
  }

  connectedCallback() {
    const valueAttr = this.getAttribute("value");
    this.value =
      valueAttr !== null && valueAttr !== "" ? Number(valueAttr) : "";
    if (!this.#hasNativeResetBaseline) {
      this.#nativeResetValue = this.value;
      this.#hasNativeResetBaseline = true;
    }
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
    this.#precision = this.#normalizePrecision(
      this.hasAttribute("precision") ? this.getAttribute("precision") : null,
    );

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

    const hasSteppers = this.getAttribute("steppers") !== "false";

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
    figNormalizeTextOnlyInputSlots(this);

    this.addEventListener("pointerdown", this.#boundMouseDown);
    this.removeEventListener("click", this.#boundAdornmentClick);
    this.addEventListener("click", this.#boundAdornmentClick);
    this.#startObserver();
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
      this.input.removeEventListener("input", this.#boundInput);
      this.input.removeEventListener("focus", this.#boundFocus);
      this.input.removeEventListener("blur", this.#boundBlur);
      this.input.removeEventListener("keydown", this.#boundKeyDown);
    }
    this.removeEventListener("click", this.#boundAdornmentClick);
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
    window.removeEventListener("blur", this.#boundWindowBlur);
    this.#stopStepperRepeat(false);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    if (this.#syncRaf) {
      cancelAnimationFrame(this.#syncRaf);
      this.#syncRaf = 0;
    }
  }

  #resolveDefaultValue() {
    const raw = this.getAttribute("default");
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
    if (this.disabled || this.isDefault) return;
    this.value = this.default;
    if (this.input) this.input.value = this.#formatWithUnit(this.value);
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
    for (const type of ["input", "change"]) {
      this.dispatchEvent(
        new CustomEvent(type, { detail: this.value, bubbles: true }),
      );
    }
  }

  focus() {
    this.input.focus();
  }

  #ensureInputControl() {
    const existing = this.querySelector("input");
    if (existing) return existing;

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.setAttribute("data-generated", "input-control");
    if (this.name) input.name = this.name;
    input.placeholder = this.placeholder;
    input.value = this.#formatWithUnit(this.value);
    this.insertBefore(input, this.querySelector('[slot="append"]'));

    return input;
  }

  #handleAdornmentClick(event) {
    const adornment = event.target?.closest?.("[slot]");
    if (!adornment || adornment.parentElement !== this) return;
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
      this.input.addEventListener("change", this.#boundInputChange);
      this.input.addEventListener("input", this.#boundInput);
      this.input.addEventListener("focus", this.#boundFocus);
      this.input.addEventListener("blur", this.#boundBlur);
      this.input.addEventListener("keydown", this.#boundKeyDown);
    }
    const hasSteppers = this.getAttribute("steppers") !== "false";
    if (this.#stepperEl && !this.contains(this.#stepperEl)) {
      this.#stepperEl = null;
    }
    this.#syncSteppers(hasSteppers);
    this.#syncNativeResetBaseline();
    this.#syncInputA11yAttributes();
    this.#syncSpinbuttonAria();
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

  #syncNativeResetBaseline() {
    if (!this.input) return;
    this.input.defaultValue = this.#formatWithUnit(this.#nativeResetValue);
  }

  #syncAfterFormReset() {
    if (!this.input) return;
    const numericValue = this.#getNumericValue(this.input.value);
    this.value =
      numericValue === ""
        ? ""
        : this.#sanitizeInput(
            Number(numericValue) / (this.transform || 1),
            false,
          );
    this.input.value = this.#formatWithUnit(this.value);
    this.#syncStepperState();
    this.#syncSpinbuttonAria();
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
  }

  #handleMouseDown(e) {
    if (this.disabled) return;
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
    let sanitized = Number(value);
    if (isNaN(sanitized)) return "";
    if (typeof this.min === "number") {
      sanitized = Math.max(this.min, sanitized);
    }
    if (typeof this.max === "number") {
      sanitized = Math.min(this.max, sanitized);
    }
    sanitized = this.#roundNumber(sanitized);
    return sanitized;
  }

  #formatNumber(num) {
    const precision = this.#precision ?? 2;
    const rounded = this.#roundNumber(num);
    if (this.#precision !== null) return rounded.toFixed(precision);
    return Number.isInteger(rounded)
      ? String(rounded)
      : String(parseFloat(rounded.toFixed(precision)));
  }

  #roundNumber(num) {
    const precision = this.#precision ?? 2;
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
  }

  #normalizePrecision(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 2;
    return Math.max(0, Math.min(100, Math.trunc(parsed)));
  }

  static get observedAttributes() {
    return [
      "value",
      "default",
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
          if (this.disabled) this.#stopStepperRepeat();
          this.#syncStepperState();
          break;
        case "units":
          this.#rawUnits = newValue || "";
          this.#setUnitsFromAttributes();
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncNativeResetBaseline();
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
          this.#syncNativeResetBaseline();
          this.#syncSpinbuttonAria();
          break;
        case "unit-position":
          this.#unitPosition = newValue || "suffix";
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncNativeResetBaseline();
          this.#syncSpinbuttonAria();
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncNativeResetBaseline();
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
          this.#nativeResetValue = value;
          this.#hasNativeResetBaseline = true;
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncNativeResetBaseline();
          this.#syncStepperState();
          this.#syncSpinbuttonAria();
          break;
        case "default":
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
          const hasSteppers = newValue !== "false";
          this.#syncSteppers(hasSteppers);
          break;
        }
        case "precision":
          this.#precision = this.#normalizePrecision(
            newValue,
          );
          this.input.value = this.#formatWithUnit(this.value);
          this.#syncNativeResetBaseline();
          this.#syncSpinbuttonAria();
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
figDefineElement("fig-input-number", FigInputNumber);

export { FigInputNumber };
