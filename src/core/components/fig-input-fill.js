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
  figHexToRGB,
} from "../runtime/index.js";
import {
  GRADIENT_HUE_INTERPOLATIONS,
  GRADIENT_HUE_SPACES,
  GRADIENT_INTERPOLATION_SPACES,
  GRADIENT_PICKER_SPACES,
  figCssUrl,
  figLooksLikeVideoUrl,
  figSampleGradientAt,
  gradientInterpolationClause,
  gradientToValueShape,
  normalizeGradientConfig,
} from "../runtime/gradient.js";

/* Input Fill */
/**
 * A fill input that supports solid colors, gradients, images, videos, and webcam.
 * @attr {string} value - JSON string with fill data
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {string} webcam-mode - Forwarded to fig-fill-picker: `live` (default) or `snapshot`
 * @attr {string} default-video - Forwarded sample clip URL for the Video tab
 * @fires input - When the fill value changes
 * @fires change - When the fill value is committed
 * @fires webcamstream - `{ stream, deviceId }` forwarded from the inner picker
 */
class FigInputFill extends HTMLElement {
  #fillType = "solid";
  #fillPicker;
  #opacityInput;
  #hexInput;

  // Fill data storage
  #solid = { color: "#D9D9D9", alpha: 1 };
  #gradient = {
    type: "linear",
    angle: 180,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    opacity: 1,
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };
  #image = { url: null, scaleMode: "fill", scale: 50, opacity: 1 };
  #video = {
    url: null,
    poster: null,
    scaleMode: "fill",
    scale: 50,
    opacity: 1,
    missing: true,
  };
  #webcam = {
    live: true,
    snapshot: null,
    deviceId: null,
    scaleMode: "fill",
    scale: 50,
    opacity: 1,
  };
  #custom = {};

  constructor() {
    super();
  }

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "mode",
      "alpha",
      "webcam-mode",
      "default-video",
      "aria-label",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
    ];
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    this.#parseValue();
    this.#render();
  }

  disconnectedCallback() {
    this.#fillPicker = null;
    this.#opacityInput = null;
    this.#hexInput = null;
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;

    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed.type) this.#fillType = parsed.type;

      switch (this.#fillType) {
        case "solid":
          if (parsed.color) this.#solid.color = parsed.color;
          if (parsed.alpha !== undefined) this.#solid.alpha = parsed.alpha;
          if (parsed.opacity !== undefined)
            this.#solid.alpha = parsed.opacity / 100;
          break;
        case "gradient":
          if (parsed.gradient) {
            this.#gradient = normalizeGradientConfig({
              ...this.#gradient,
              ...parsed.gradient,
            });
            this.#gradient.opacity = this.#normalizeFillOpacity(
              parsed.gradient.opacity ?? parsed.opacity ?? parsed.alpha,
              this.#gradient.opacity ?? 1,
            );
          } else if (parsed.opacity !== undefined || parsed.alpha !== undefined) {
            this.#gradient.opacity = this.#normalizeFillOpacity(
              parsed.opacity ?? parsed.alpha,
              this.#gradient.opacity ?? 1,
            );
          }
          break;
        case "image":
          if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
          break;
        case "video":
          if (parsed.video) {
            this.#video = { ...this.#video, ...parsed.video };
            this.#video.missing = !this.#video.url;
          }
          break;
        case "webcam":
          if (parsed.webcam && typeof parsed.webcam === "object") {
            const { stream: _ignored, snapshot, ...rest } = parsed.webcam;
            this.#webcam = { ...this.#webcam, ...rest };
            if (typeof snapshot === "string" && snapshot) {
              this.#webcam.snapshot = snapshot;
            }
          } else if (parsed.image?.url) {
            this.#webcam.snapshot = parsed.image.url;
            if (parsed.image.scaleMode)
              this.#webcam.scaleMode = parsed.image.scaleMode;
            if (parsed.image.scale != null)
              this.#webcam.scale = parsed.image.scale;
          }
          if (parsed.opacity !== undefined)
            this.#webcam.opacity = parsed.opacity;
          break;
        default: {
          const { type: _type, ...rest } = parsed;
          this.#custom = rest;
          break;
        }
      }
    } catch (e) {
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#solid.color = valueAttr.slice(0, 7);
        if (valueAttr.length > 7) {
          const alphaHex = valueAttr.slice(7, 9);
          this.#solid.alpha = parseInt(alphaHex, 16) / 255;
        }
        return;
      }
      if (figLooksLikeVideoUrl(valueAttr)) {
        this.#fillType = "video";
        this.#video.url = valueAttr.trim();
        this.#video.missing = false;
      }
    }
  }

  #buildFillPickerAttrs() {
    const attrs = {};
    // Backward-compat: direct attributes forwarded to fill picker
    const mode = this.getAttribute("mode");
    if (mode) attrs["mode"] = mode;
    const alpha = this.getAttribute("alpha");
    if (alpha) attrs["alpha"] = alpha;
    // picker-* overrides (except anchor, handled programmatically)
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
    const webcamMode = this.getAttribute("webcam-mode");
    if (webcamMode && !attrs["webcam-mode"]) attrs["webcam-mode"] = webcamMode;
    const defaultVideo = this.getAttribute("default-video");
    if (defaultVideo && !attrs["default-video"])
      attrs["default-video"] = defaultVideo;
    return attrs;
  }

  #fillPickerSwatchBackground() {
    switch (this.#fillType) {
      case "solid":
        return this.#solid.color;
      case "gradient": {
        const sorted = [...this.#gradient.stops].sort(
          (a, b) => a.position - b.position,
        );
        const stops = sorted
          .map((stop) => {
            const alpha = (stop.opacity ?? 100) / 100;
            if (alpha >= 1) return `${stop.color} ${stop.position}%`;
            const { r, g, b } = figHexToRGB(stop.color);
            return `rgba(${r}, ${g}, ${b}, ${alpha}) ${stop.position}%`;
          })
          .join(", ");
        const interpolation = gradientInterpolationClause(this.#gradient);
        const interpolationSuffix = interpolation ? ` ${interpolation}` : "";
        switch (this.#gradient.type) {
          case "radial":
            return `radial-gradient(circle${interpolationSuffix}, ${stops})`;
          case "angular":
            return `conic-gradient(from ${this.#gradient.angle}deg${interpolationSuffix}, ${stops})`;
          default:
            return `linear-gradient(${this.#gradient.angle}deg${interpolationSuffix}, ${stops})`;
        }
      }
      case "image":
        return this.#image.url ? figCssUrl(this.#image.url) : "#D9D9D9";
      case "video":
        return this.#video.poster ? figCssUrl(this.#video.poster) : "#D9D9D9";
      case "webcam": {
        const snapshot =
          this.#webcam.snapshot ||
          this.#fillPicker?.value?.webcam?.snapshot;
        return snapshot ? figCssUrl(snapshot) : "";
      }
      default:
        return this.#customSwatchBackground();
    }
  }

  #gradientCss() {
    return this.#fillPickerSwatchBackground();
  }

  #normalizeFillOpacity(value, fallback = 1) {
    if (value === undefined || value === null || value === "") return fallback;
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (n > 1) return Math.max(0, Math.min(1, n / 100));
    return Math.max(0, Math.min(1, n));
  }

  #fillPickerSwatchAlpha() {
    switch (this.#fillType) {
      case "solid":
        return this.#solid.alpha;
      case "gradient":
        return this.#gradient.opacity ?? 1;
      case "image":
        return this.#image.opacity ?? 1;
      case "video":
        return this.#video.opacity ?? 1;
      case "webcam":
        return this.#webcam.opacity ?? 1;
      default:
        return this.#normalizeFillOpacity(
          this.#custom.opacity ?? this.#custom.alpha,
          1,
        );
    }
  }

  #customModeSlot() {
    return this.querySelector(`[slot="mode-${this.#fillType}"]`);
  }

  #customTypeLabel() {
    const slotLabel = this.#customModeSlot()?.getAttribute("label");
    if (slotLabel) return slotLabel;
    if (!this.#fillType) return "Fill";
    return this.#fillType.charAt(0).toUpperCase() + this.#fillType.slice(1);
  }

  #customSwatchBackground() {
    return (
      this.#custom.swatchBackground ||
      this.#custom.background ||
      this.#custom.css ||
      this.#customModeSlot()?.getAttribute("swatch-background") ||
      ""
    );
  }

  #adoptModeSlots() {
    if (!this.#fillPicker) return;
    for (const slot of [...this.querySelectorAll(":scope > [slot^='mode-']")]) {
      this.#fillPicker.append(slot);
    }
  }

  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    for (const child of [
      this.#fillPicker,
      this.#opacityInput,
      this.#hexInput,
    ]) {
      if (!child) continue;
      if (disabled) child.setAttribute("disabled", "");
      else child.removeAttribute("disabled");
    }
  }

  #syncA11y() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    this.#syncDisabled();
    const name = this.getAttribute("aria-label") || "Fill";
    const describedBy = this.getAttribute("aria-describedby");
    const invalid = this.getAttribute("aria-invalid");
    const required = this.getAttribute("aria-required");
    const syncState = (el, label) => {
      if (!el) return;
      el.setAttribute("aria-label", label);
      if (describedBy) el.setAttribute("aria-describedby", describedBy);
      else el.removeAttribute("aria-describedby");
      if (invalid) el.setAttribute("aria-invalid", invalid);
      else el.removeAttribute("aria-invalid");
      if (required) el.setAttribute("aria-required", required);
      else el.removeAttribute("aria-required");
    };
    syncState(this.#fillPicker, `${name} picker`);
    syncState(this.#hexInput, `${name} hex color`);
    syncState(this.#opacityInput, `${name} opacity`);
  }

  #createOpacityControl(value, disabled) {
    if (this.getAttribute("alpha") === "false") return null;
    return figCreateElement(
      "fig-tooltip",
      { text: "Opacity" },
      figCreateElement("fig-input-number", {
        className: "fig-input-fill-opacity",
        placeholder: "##",
        min: "0",
        max: "100",
        value,
        units: "%",
        steppers: "false",
        disabled,
      }),
    );
  }

  #createControls(disabled) {
    let label = null;
    let opacity = 1;

    switch (this.#fillType) {
      case "solid":
        return [
          figCreateElement("fig-input-text", {
            type: "text",
            className: "fig-input-fill-hex",
            placeholder: "000000",
            value: this.#solid.color.slice(1).toUpperCase(),
            disabled,
          }),
          this.#createOpacityControl(
            Math.round(this.#solid.alpha * 100),
            disabled,
          ),
        ].filter(Boolean);
      case "gradient":
        label =
          this.#gradient.type.charAt(0).toUpperCase() +
          this.#gradient.type.slice(1);
        opacity = this.#gradient.opacity ?? 1;
        break;
      case "image":
        label = "Image";
        opacity = this.#image.opacity ?? 1;
        break;
      case "video":
        label = "Video";
        opacity = this.#video.opacity ?? 1;
        break;
      case "webcam":
        label = "Webcam";
        opacity = this.#webcam.opacity ?? 1;
        break;
      default:
        label = this.#customTypeLabel();
        opacity = this.#normalizeFillOpacity(
          this.#custom.opacity ?? this.#custom.alpha,
          1,
        );
        break;
    }

    return [
      figCreateElement(
        "label",
        { className: "fig-input-fill-label" },
        label,
      ),
      this.#createOpacityControl(Math.round(opacity * 100), disabled),
    ].filter(Boolean);
  }

  #render() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const fillPickerValue = JSON.stringify(this.value);
    const fpAttrs = this.#buildFillPickerAttrs();
    const swatch = figCreateElement("fig-swatch", {
      background: this.#fillPickerSwatchBackground(),
      alpha: this.#fillPickerSwatchAlpha(),
      disabled,
    });
    const modeSlots = [...this.querySelectorAll("[slot^='mode-']")];
    const picker = figCreateElement(
      "fig-fill-picker",
      {
        value: fillPickerValue,
        disabled,
        ...fpAttrs,
      },
      [swatch, ...modeSlots],
    );
    const combo = figCreateElement(
      "div",
      { className: "input-combo" },
      [picker, this.#createControls(disabled)],
    );
    this.replaceChildren(combo);

    this.#setupEventListeners();
    queueMicrotask(() => {
      this.#adoptModeSlots();
      this.#syncSwatch();
      this.#updateControls();
    });
  }

  #setupEventListeners() {
    this.#fillPicker = this.querySelector("fig-fill-picker");
    this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
    this.#hexInput = this.querySelector(".fig-input-fill-hex");
    const label = this.querySelector(".fig-input-fill-label");
    this.#syncA11y();

    // Label click triggers fill picker
    if (label && this.#fillPicker) {
      label.addEventListener("click", () => {
        const swatch = this.#fillPicker.querySelector("fig-swatch");
        if (swatch) {
          swatch.click();
        }
      });
    }

    if (this.#fillPicker) {
      const anchor = this.getAttribute("picker-anchor");
      if (!anchor || anchor === "self") {
        this.#fillPicker.anchorElement = this;
      } else {
        let el = null;
        try {
          el = document.querySelector(anchor);
        } catch {}
        if (el) this.#fillPicker.anchorElement = el;
      }

      this.#fillPicker.addEventListener("input", (e) => {
        e.stopPropagation();
        const detail = e.detail;
        if (!detail) return;

        const newType = detail.type;
        const typeChanged = newType !== this.#fillType;

        // Update internal state
        this.#fillType = newType;
        switch (newType) {
          case "solid":
            this.#solid.color = detail.color;
            this.#solid.alpha = detail.alpha;
            break;
          case "gradient":
            if (detail.gradient) {
              this.#gradient = normalizeGradientConfig({
                ...this.#gradient,
                ...detail.gradient,
              });
            }
            break;
          case "image":
            if (detail.image) this.#image = detail.image;
            break;
          case "video":
            if (detail.video) this.#video = { ...this.#video, ...detail.video };
            break;
          case "webcam":
            if (detail.webcam) {
              const { stream: _ignored, snapshot, ...rest } = detail.webcam;
              this.#webcam = { ...this.#webcam, ...rest };
              if (typeof snapshot === "string" && snapshot) {
                this.#webcam.snapshot = snapshot;
              }
            } else if (detail.image?.url) {
              this.#webcam.snapshot = detail.image.url;
            }
            if (!this.#webcam.snapshot) {
              const fromPicker = this.#fillPicker?.value?.webcam?.snapshot;
              if (fromPicker) this.#webcam.snapshot = fromPicker;
            }
            break;
          default: {
            const { type: _type, colorSpace: _colorSpace, ...rest } = detail;
            this.#custom = rest;
            break;
          }
        }
        // Update controls (don't re-render to keep dialog open)
        if (typeChanged) {
          this.#updateControlsForType();
        } else {
          this.#updateControls();
        }
        this.#syncSwatch();

        this.#emitInput();
      });

      this.#fillPicker.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });

      this.#fillPicker.addEventListener("loaded", (e) => {
        e.stopPropagation();
        this.dispatchEvent(
          new CustomEvent("loaded", {
            bubbles: true,
            detail: e.detail,
          }),
        );
      });

      this.#fillPicker.addEventListener("webcamstream", (e) => {
        this.dispatchEvent(
          new CustomEvent("webcamstream", {
            bubbles: true,
            composed: true,
            detail: e.detail,
          }),
        );
      });
    }

    // Hex input (solid only)
    if (this.#hexInput) {
      this.#hexInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const hex = "#" + e.target.value.replace("#", "");
        this.#solid.color = hex;
        this.#updateFillPicker();
        this.#emitInput();
      });
      this.#hexInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }

    // Opacity input (all fill types)
    if (this.#opacityInput) {
      this.#opacityInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const parsed = parseFloat(e.target.value);
        const opacity = isNaN(parsed) ? 100 : parsed;
        const alpha = opacity / 100;
        switch (this.#fillType) {
          case "solid":
            this.#solid.alpha = alpha;
            break;
          case "gradient":
            this.#gradient.opacity = alpha;
            break;
          case "image":
            this.#image.opacity = alpha;
            break;
          case "video":
            this.#video.opacity = alpha;
            break;
          case "webcam":
            this.#webcam.opacity = alpha;
            break;
          default:
            this.#custom.opacity = alpha;
            break;
        }
        this.#updateFillPicker();
        this.#syncSwatch();
        this.#emitInput();
      });
      this.#opacityInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }
  }

  #updateControls() {
    // Update UI controls without full re-render
    switch (this.#fillType) {
      case "solid":
        if (this.#hexInput) {
          this.#hexInput.setAttribute(
            "value",
            this.#solid.color.slice(1).toUpperCase(),
          );
        }
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round(this.#solid.alpha * 100),
          );
        }
        break;
      case "gradient": {
        const label = this.querySelector(".fig-input-fill-label");
        if (label) {
          const newLabel =
            this.#gradient.type.charAt(0).toUpperCase() +
            this.#gradient.type.slice(1);
          label.textContent = newLabel;
        }
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#gradient.opacity ?? 1) * 100),
          );
        }
        break;
      }
      case "image":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#image.opacity ?? 1) * 100),
          );
        }
        break;
      case "video":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#video.opacity ?? 1) * 100),
          );
        }
        break;
      case "webcam":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#webcam.opacity ?? 1) * 100),
          );
        }
        break;
      default: {
        const label = this.querySelector(".fig-input-fill-label");
        if (label) label.textContent = this.#customTypeLabel();
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round(
              this.#normalizeFillOpacity(
                this.#custom.opacity ?? this.#custom.alpha,
                1,
              ) * 100,
            ),
          );
        }
        break;
      }
    }
  }

  #updateControlsForType() {
    // Update only the controls (not the fill picker) when type changes
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const combo = this.querySelector(".input-combo");
    if (!combo) return;

    // Remove old controls (keep the fill picker)
    const oldLabel = combo.querySelector(".fig-input-fill-label");
    const oldHex = combo.querySelector(".fig-input-fill-hex");
    const oldOpacity = combo.querySelector(".fig-input-fill-opacity");
    const oldTooltips = combo.querySelectorAll("fig-tooltip");

    oldLabel?.remove();
    oldHex?.remove();
    oldTooltips.forEach((t) => t.remove());

    // Append new controls after the fill picker
    combo.append(...this.#createControls(disabled));

    // Re-setup event listeners for the new controls
    this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
    this.#hexInput = this.querySelector(".fig-input-fill-hex");
    const label = this.querySelector(".fig-input-fill-label");
    this.#syncA11y();

    // Label click triggers fill picker
    if (label && this.#fillPicker) {
      label.addEventListener("click", () => {
        const swatch = this.#fillPicker.querySelector("fig-swatch");
        if (swatch) {
          swatch.click();
        }
      });
    }

    // Hex input (solid only)
    if (this.#hexInput) {
      this.#hexInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const hex = "#" + e.target.value.replace("#", "");
        this.#solid.color = hex;
        this.#updateFillPicker();
        this.#emitInput();
      });
      this.#hexInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }

    // Opacity input
    if (this.#opacityInput) {
      this.#opacityInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const parsed = parseFloat(e.target.value);
        const opacity = isNaN(parsed) ? 100 : parsed;
        const alpha = opacity / 100;
        switch (this.#fillType) {
          case "solid":
            this.#solid.alpha = alpha;
            break;
          case "gradient":
            this.#gradient.opacity = alpha;
            break;
          case "image":
            this.#image.opacity = alpha;
            break;
          case "video":
            this.#video.opacity = alpha;
            break;
          case "webcam":
            this.#webcam.opacity = alpha;
            break;
          default:
            this.#custom.opacity = alpha;
            break;
        }
        this.#updateFillPicker();
        this.#updateSwatchAlpha(alpha);
        this.#emitInput();
      });
      this.#opacityInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.#emitChange();
      });
    }
  }

  #updateFillPicker() {
    if (this.#fillPicker) {
      this.#fillPicker.setAttribute("value", JSON.stringify(this.value));
    }
    this.#syncSwatch();
  }

  #syncSwatch() {
    const swatch = this.#fillPicker?.querySelector("fig-swatch");
    if (!swatch) return;
    const background = this.#fillPickerSwatchBackground();
    if (this.#fillType === "webcam" && !background) {
      const current = swatch.getAttribute("background") || "";
      if (current.startsWith("url(")) {
        swatch.setAttribute("alpha", this.#fillPickerSwatchAlpha());
        return;
      }
    }
    swatch.setAttribute("background", background);
    swatch.setAttribute("alpha", this.#fillPickerSwatchAlpha());
  }

  #updateSwatchAlpha(alpha) {
    const swatch = this.#fillPicker?.querySelector("fig-swatch");
    if (swatch) swatch.setAttribute("alpha", alpha);
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  get webcamStream() {
    return this.#fillPicker?.webcamStream ?? null;
  }

  releaseWebcam() {
    this.#fillPicker?.releaseWebcam?.();
  }

  #videoValue() {
    const url = this.#video.url ?? null;
    return {
      url,
      poster: this.#video.poster ?? null,
      scaleMode: this.#video.scaleMode || "fill",
      scale: this.#video.scale ?? 50,
      opacity: this.#video.opacity ?? 1,
      ...(url ? {} : { missing: true }),
    };
  }

  #webcamValue() {
    return {
      live: this.#webcam.live !== false,
      snapshot:
        this.#webcam.snapshot ??
        this.#fillPicker?.value?.webcam?.snapshot ??
        null,
      deviceId: this.#webcam.deviceId ?? null,
      scaleMode: this.#webcam.scaleMode || "fill",
      scale: this.#webcam.scale ?? 50,
      opacity: this.#webcam.opacity ?? 1,
    };
  }

  get value() {
    switch (this.#fillType) {
      case "solid":
        return {
          type: "solid",
          colorSpace: "srgb",
          color: this.#solid.color,
          alpha: this.#solid.alpha,
          opacity: Math.round(this.#solid.alpha * 100), // FigFillPicker expects opacity 0-100
        };
      case "gradient":
        return {
          type: "gradient",
          colorSpace: "srgb",
          gradient: gradientToValueShape(this.#gradient),
          css: this.#gradientCss(),
        };
      case "image":
        return {
          type: "image",
          colorSpace: "srgb",
          image: { ...this.#image },
        };
      case "video":
        return {
          type: "video",
          colorSpace: "srgb",
          video: this.#videoValue(),
        };
      case "webcam":
        return {
          type: "webcam",
          colorSpace: "srgb",
          webcam: this.#webcamValue(),
        };
      default:
        return { type: this.#fillType, ...this.#custom };
    }
  }

  set value(val) {
    if (typeof val === "string") {
      this.setAttribute("value", val);
    } else {
      this.setAttribute("value", JSON.stringify(val));
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        const prevType = this.#fillType;
        this.#parseValue();
        if (this.#fillPicker) {
          if (this.#fillType !== prevType) {
            this.#render();
          } else {
            this.#updateFillPicker();
            this.#updateControls();
          }
        }
        break;
      case "disabled":
        this.#syncDisabled();
        break;
      case "mode":
      case "webcam-mode":
      case "default-video":
        if (this.#fillPicker) {
          if (newValue) {
            this.#fillPicker.setAttribute(name, newValue);
          } else {
            this.#fillPicker.removeAttribute(name);
          }
        }
        break;
      case "alpha":
        if (this.isConnected) this.#render();
        break;
      case "aria-label":
      case "aria-describedby":
      case "aria-invalid":
      case "aria-required":
        this.#syncA11y();
        break;
    }
  }
}
figDefineElement("fig-input-fill", FigInputFill);

export { FigInputFill };
