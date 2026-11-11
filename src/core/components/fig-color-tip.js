/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figBooleanAttribute,
  figColorEventAliases,
  figCreateElement,
  figDefineElement,
  figGetSharedCanvas,
  hasFigFillPicker,
} from "../runtime/index.js";

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
  #swatch = null;
  #swatchSelectedObserver = null;
  #boundHandleInput = this.#handlePickerInput.bind(this);
  #boundHandleChange = this.#handlePickerChange.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "selected",
      "disabled",
      "alpha",
      "control",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
    ];
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
    if (this.#fillPicker) {
      this.#fillPicker.removeEventListener("input", this.#boundHandleInput);
      this.#fillPicker.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.#swatch) {
      this.#swatch.removeEventListener("input", this.#boundHandleInput);
      this.#swatch.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.#swatchSelectedObserver) {
      this.#swatchSelectedObserver.disconnect();
      this.#swatchSelectedObserver = null;
    }
  }

  #observeSwatchSelected() {
    if (this.#swatchSelectedObserver) {
      this.#swatchSelectedObserver.disconnect();
      this.#swatchSelectedObserver = null;
    }
    if (!this.#swatch) return;
    this.#swatchSelectedObserver = new MutationObserver(() => {
      const swatchSelected =
        this.#swatch?.hasAttribute("selected") &&
        this.#swatch.getAttribute("selected") !== "false";
      if (swatchSelected) {
        if (!this.hasAttribute("selected")) this.setAttribute("selected", "");
      } else if (this.hasAttribute("selected")) {
        this.removeAttribute("selected");
      }
    });
    this.#swatchSelectedObserver.observe(this.#swatch, {
      attributes: true,
      attributeFilter: ["selected"],
    });
  }

  get #alphaEnabled() {
    const v = this.getAttribute("alpha");
    return v === null || v !== "false";
  }

  #render() {
    this.#teardownListeners();
    const mode = this.#controlMode;
    if (mode === "add" || mode === "remove") {
      const iconName = mode === "add" ? "add" : "minus";
      const label = this.getAttribute("aria-label") || (mode === "add" ? "Add color stop" : "Remove color stop");
      this.replaceChildren(
        figCreateElement(
          "fig-button",
          {
            icon: true,
            variant: "ghost",
            "aria-label": label,
          },
          createFigIcon(iconName),
        ),
      );
      this.#fillPicker = null;
      this.#swatch = null;
      this.addEventListener("click", this.#handleControlClick);
      this.#syncA11y();
      return;
    }
    this.removeEventListener("click", this.#handleControlClick);

    const rawValue = (this.getAttribute("value") || "").trim();
    const color = this.#normalizeColor(rawValue);
    const alpha = this.#extractAlpha(rawValue);
    const pickerValue =
      alpha < 1
        ? JSON.stringify({
            type: "solid",
            color,
            opacity: Math.round(alpha * 100),
          })
        : JSON.stringify({ type: "solid", color });
    const swatch = figCreateElement("fig-swatch", {
      background: color,
      alpha: alpha < 1 ? alpha : null,
    });
    let picker = null;
    if (hasFigFillPicker()) {
      picker = figCreateElement(
        "fig-fill-picker",
        {
          mode: "solid",
          alpha: this.#alphaEnabled ? null : "false",
          value: pickerValue,
        },
        swatch,
      );
      this.replaceChildren(picker);
    } else {
      this.replaceChildren(swatch);
    }

    this.#fillPicker = picker;
    this.#swatch = swatch;
    this.#fillPicker?.addEventListener("input", this.#boundHandleInput);
    this.#fillPicker?.addEventListener("change", this.#boundHandleChange);
    if (!this.#fillPicker) {
      this.#swatch?.addEventListener("input", this.#boundHandleInput);
      this.#swatch?.addEventListener("change", this.#boundHandleChange);
    }
    this.#observeSwatchSelected();
    this.#syncA11y();
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

  #extractAlpha(colorValue) {
    if (!colorValue) return 1;
    const v = String(colorValue).trim();
    const hex = v.replace(/^#/, "");
    if (/^[0-9a-f]{4}$/i.test(hex)) {
      const a = hex[3];
      return parseInt(`${a}${a}`, 16) / 255;
    }
    if (/^[0-9a-f]{8}$/i.test(hex)) {
      return parseInt(hex.slice(6, 8), 16) / 255;
    }
    const rgbaMatch = v.match(
      /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/i,
    );
    if (rgbaMatch) return parseFloat(rgbaMatch[1]);
    return 1;
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
    if (/^[0-9a-f]{3,4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(value)) {
      return this.#normalizeHex(value);
    }

    try {
      const { ctx } = figGetSharedCanvas(1, 1);
      if (!ctx) return value;
      ctx.fillStyle = "#000000";
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
    const rawAttr = this.getAttribute("value");
    const color = this.#normalizeColor(rawAttr);
    const alpha = this.#extractAlpha(rawAttr);
    if (rawAttr !== color && alpha >= 1) {
      this.setAttribute("value", color);
      return;
    }

    if (this.#fillPicker) {
      this.#syncA11y();
      const pickerVal =
        alpha < 1
          ? { type: "solid", color, opacity: Math.round(alpha * 100) }
          : { type: "solid", color };
      this.#fillPicker.setAttribute("value", JSON.stringify(pickerVal));
      if (this.#alphaEnabled) {
        this.#fillPicker.removeAttribute("alpha");
      } else {
        this.#fillPicker.setAttribute("alpha", "false");
      }
      if (figBooleanAttribute(this, "disabled")) {
        this.#fillPicker.setAttribute("disabled", "");
      } else {
        this.#fillPicker.removeAttribute("disabled");
      }
    }

    if (this.#swatch) {
      this.#syncA11y();
      this.#swatch.setAttribute("background", color);
      if (alpha < 1) {
        this.#swatch.setAttribute("alpha", String(alpha));
      } else {
        this.#swatch.removeAttribute("alpha");
      }
      if (figBooleanAttribute(this, "disabled")) {
        this.#swatch.setAttribute("disabled", "");
      } else {
        this.#swatch.removeAttribute("disabled");
      }
    }
  }

  #syncA11y() {
    const mode = this.#controlMode;
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.setAttribute("aria-pressed", selected ? "true" : "false");
    if (mode === "add" || mode === "remove") {
      const button = this.querySelector("fig-button");
      const label = this.getAttribute("aria-label") || (mode === "add" ? "Add color stop" : "Remove color stop");
      button?.setAttribute("aria-label", label);
      if (disabled) button?.setAttribute("disabled", "");
      else button?.removeAttribute("disabled");
      return;
    }

    const target = this.#fillPicker || this.#swatch;
    if (!target) return;
    const label = this.getAttribute("aria-label") || "Color stop";
    const labelledBy = this.getAttribute("aria-labelledby");
    const describedBy = this.getAttribute("aria-describedby");
    if (labelledBy) {
      target.setAttribute("aria-labelledby", labelledBy);
      target.removeAttribute("aria-label");
    } else {
      target.setAttribute("aria-label", label);
      target.removeAttribute("aria-labelledby");
    }
    if (describedBy) target.setAttribute("aria-describedby", describedBy);
    else target.removeAttribute("aria-describedby");
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
    if (this.#alphaEnabled) {
      if (detail?.opacity !== undefined) {
        eventDetail.opacity = detail.opacity;
      } else if (detail?.alpha !== undefined) {
        eventDetail.opacity = Math.round(detail.alpha * 100);
      }
    }
    Object.assign(
      eventDetail,
      figColorEventAliases(
        eventDetail.color,
        this.#alphaEnabled ? detail?.alpha : 1,
        eventDetail.opacity,
      ),
    );

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
    this.#updateColorFromPicker(event.detail || { color: event.target?.value }, "input");
  }

  #handlePickerChange(event) {
    event.stopPropagation();
    this.#updateColorFromPicker(event.detail || { color: event.target?.value }, "change");
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
      case "aria-label":
      case "aria-labelledby":
      case "aria-describedby":
        this.#syncFromAttributes();
        this.#syncA11y();
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
    return figBooleanAttribute(this, "selected");
  }
  set selected(value) {
    this.toggleAttribute("selected", Boolean(value));
  }

  get disabled() {
    return figBooleanAttribute(this, "disabled");
  }
  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }
}
figDefineElement("fig-color-tip", FigColorTip);

export { FigColorTip };
