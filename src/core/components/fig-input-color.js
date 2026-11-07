/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figColorEventAliases,
  figCreateElement,
  figDefineElement,
  hasFigFillPicker,
} from "../runtime/index.js";

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
    for (const { name, value } of this.attributes) {
      if (
        name.startsWith("picker-") &&
        name !== "picker-anchor" &&
        name !== "picker-experimental"
      ) {
        const forwardedName = name.slice(7);
        if (/^on/i.test(forwardedName)) continue;
        attrs[forwardedName] = value;
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
      : !!this.querySelector(":scope > fig-swatch");
  }

  #refreshUI() {
    this.#setValues(this.getAttribute("value"));
    this.#swatch = this.querySelector("fig-swatch");
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
      this.#swatch.disabled = figBooleanAttribute(this, "disabled");
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
    const showText = this.getAttribute("text") !== "false";
    const swatch = figCreateElement("fig-swatch", {
      background: this.hexOpaque,
      alpha: this.rgba.a,
      disabled,
    });

    if (showText) {
      const combo = figCreateElement(
        "div",
        { className: "input-combo" },
        [
          swatch,
          figCreateElement("fig-input-text", {
            type: "text",
            placeholder: "000000",
            value: this.hexOpaque.slice(1).toUpperCase(),
            disabled,
          }),
        ],
      );
      if (showAlpha) {
        combo.appendChild(
          figCreateElement(
            "fig-tooltip",
            { text: "Opacity" },
            figCreateElement("fig-input-number", {
              placeholder: "##",
              min: "0",
              max: "100",
              value: this.#alphaPercent,
              units: "%",
              disabled,
            }),
          ),
        );
      }
      this.replaceChildren(combo);
    } else {
      this.replaceChildren(swatch);
    }

    this.#swatch = swatch;
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
    if (figBooleanAttribute(this, "disabled")) {
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
    picker.appendChild(figCreateElement("span", { hidden: true }));
    picker.addEventListener("input", this.#boundFillPickerInput);
    picker.addEventListener("change", this.#boundChange);
    this.appendChild(picker);
    this.#fillPicker = picker;
    this.#syncFillPicker();
    return picker;
  }

  #openFillPicker() {
    if (
      figBooleanAttribute(this, "disabled") ||
      figBooleanAttribute(this, "swatch-disabled")
    )
      return false;
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
    if (
      figBooleanAttribute(this, "disabled") ||
      figBooleanAttribute(this, "swatch-disabled")
    )
      return;
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

  #normalizeColorValue(value) {
    const fallback = { r: 217, g: 217, b: 217, a: 1 };
    const rgba =
      typeof value === "string" && value.trim()
        ? this.convertToRGBA(value.trim())
        : fallback;
    const normalized =
      rgba &&
      Number.isFinite(rgba.r) &&
      Number.isFinite(rgba.g) &&
      Number.isFinite(rgba.b) &&
      Number.isFinite(rgba.a)
        ? rgba
        : fallback;
    return this.rgbAlphaToHex(normalized, normalized.a);
  }

  #setValues(hexValue) {
    let colorValue =
      typeof hexValue === "string" && hexValue.trim()
        ? hexValue.trim()
        : "#D9D9D9";
    let rgba = this.convertToRGBA(colorValue);
    if (
      !rgba ||
      !Number.isFinite(rgba.r) ||
      !Number.isFinite(rgba.g) ||
      !Number.isFinite(rgba.b) ||
      !Number.isFinite(rgba.a)
    ) {
      colorValue = "#D9D9D9";
      rgba = { r: 217, g: 217, b: 217, a: 1 };
    }
    this.rgba = rgba;
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
    let inputValue = event.target.value.replace(/#/g, "");
    this.#setValues("#" + inputValue);
    if (this.#textInput) {
      this.#textInput.setAttribute(
        "value",
        this.hexOpaque.slice(1).toUpperCase(),
      );
    }
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
        composed: true,
        cancelable: true,
        detail: this.#eventDetail(),
      }),
    );
  }
  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: this.#eventDetail(),
      }),
    );
  }

  #eventDetail() {
    return {
      value: this.value,
      hex: this.hex,
      rgba: this.rgba,
      ...figColorEventAliases(
        this.hexOpaque,
        this.rgba?.a,
        Math.round((this.rgba?.a ?? 1) * 100),
      ),
    };
  }

  static get observedAttributes() {
    return [
      "value",
      "default",
      "style",
      "mode",
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

  get default() {
    return this.#normalizeColorValue(this.getAttribute("default"));
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
    return this.#normalizeColorValue(this.value) === this.default;
  }

  resetToDefault() {
    if (this.#disabled || this.isDefault) return;
    this.setAttribute("value", this.default);
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Skip if value hasn't actually changed
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        this.#setValues(newValue);
        if (this.#textInput) {
          this.#textInput.setAttribute(
            "value",
            this.hexOpaque.slice(1).toUpperCase(),
          );
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
    if (typeof color !== "string") return null;
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
figDefineElement("fig-input-color", FigInputColor);

export { FigInputColor };
