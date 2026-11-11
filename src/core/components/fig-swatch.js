/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figCreateElement,
  figDefineElement,
  figGetSharedCanvas,
} from "../runtime/index.js";

/* Swatch */
/**
 * A color/gradient/image swatch element.
 * @attr {string} background - Any CSS background value: color (#FF0000, rgba(...)), gradient (linear-gradient(...)), or image (url(...))
 * @attr {string} size - Size of the chip: "small" (default) or "large"
 * @attr {boolean} selected - Whether the chip shows a selection ring
 * @attr {boolean} disabled - Whether the chip is disabled
 * @attr {number} alpha - Opacity value (0-1) to display the color with transparency
 */
class FigSwatch extends HTMLElement {
  #type = "color"; // 'color', 'gradient', 'image'
  #boundHandleInput = null;
  #internalUpdate = false; // Flag to prevent re-render during internal input

  constructor() {
    super();
    this.#boundHandleInput = this.#handleInput.bind(this);
  }

  static get observedAttributes() {
    return [
      "background",
      "size",
      "selected",
      "disabled",
      "alpha",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
    ];
  }

  connectedCallback() {
    this.#render();
    this.#updateAlpha();
    this.#syncA11y();
  }

  #updateAlpha() {
    const alpha = this.getAttribute("alpha");
    if (alpha !== null) {
      this.style.setProperty("--alpha", alpha);
    } else {
      this.style.removeProperty("--alpha");
    }
  }

  #detectType(bg) {
    if (!bg) return "color";
    const lower = bg.toLowerCase();
    if (lower.includes("gradient")) return "gradient";
    if (lower.includes("url(")) return "image";
    return "color";
  }

  #toHex(color) {
    if (!color) return "#D9D9D9";
    if (color.startsWith("#")) return color.slice(0, 7);
    try {
      const { ctx } = figGetSharedCanvas(1, 1);
      if (!ctx) return color;
      ctx.fillStyle = color;
      return ctx.fillStyle;
    } catch {
      return "#D9D9D9";
    }
  }

  #resolveBackground(bg) {
    if (!bg || !bg.includes("var(")) return bg;
    const prev = this.style.background;
    this.style.background = bg;
    const cs = getComputedStyle(this);
    const bgImage = cs.backgroundImage;
    const bgColor = cs.backgroundColor;
    this.style.background = prev;
    if (bgImage && bgImage !== "none") return bgImage;
    return bgColor || bg;
  }

  #render() {
    const rawAttr = this.getAttribute("background");
    const emptyMedia = this.hasAttribute("background") && !rawAttr?.trim();
    if (emptyMedia) {
      if (this.#type !== "image" || this.input) {
        this.#type = "image";
        this.setAttribute("data-type", "image");
        if (this.input) {
          this.input.removeEventListener("input", this.#boundHandleInput);
        }
        this.replaceChildren(document.createElement("div"));
        this.input = null;
        this.#syncA11y();
      }
      this.style.setProperty("--swatch-background", "none");
      return;
    }

    const rawBg = rawAttr || "#D9D9D9";
    const isVar = rawBg.includes("var(");
    const bg = isVar ? this.#resolveBackground(rawBg) : rawBg;
    const newType = this.#detectType(bg);

    // Only rebuild DOM if type changes
    if (newType !== this.#type || !this.input) {
      this.#type = newType;
      this.setAttribute("data-type", this.#type);

      // Clean up old input listener if exists
      if (this.input) {
        this.input.removeEventListener("input", this.#boundHandleInput);
      }

      if (this.#type === "color") {
        const hex = this.#toHex(bg);
        const input = figCreateElement("input", {
          type: "color",
          value: hex,
        });
        this.replaceChildren(document.createElement("div"), input);
        this.input = input;
        if (!isVar) {
          this.input.addEventListener("input", this.#boundHandleInput);
        }
        this.#syncA11y();
      } else {
        this.replaceChildren(document.createElement("div"));
        this.input = null;
        this.#syncA11y();
      }
    } else if (this.#type === "color" && this.input) {
      const hex = this.#toHex(bg);
      if (this.input.value !== hex) {
        this.input.value = hex;
      }
    }

    const isImage =
      /^(linear-gradient|radial-gradient|conic-gradient|repeating-|url)\s*\(/i.test(
        rawBg,
      );
    this.style.setProperty(
      "--swatch-background",
      isImage ? rawBg : `linear-gradient(${rawBg}, ${rawBg})`,
    );
  }

  #syncA11y() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    if (this.input) {
      this.input.disabled = disabled;
      const labelledBy = this.getAttribute("aria-labelledby");
      const label = this.getAttribute("aria-label") || "Color swatch";
      const describedBy = this.getAttribute("aria-describedby");
      if (labelledBy) {
        this.input.setAttribute("aria-labelledby", labelledBy);
        this.input.removeAttribute("aria-label");
      } else {
        this.input.setAttribute("aria-label", label);
        this.input.removeAttribute("aria-labelledby");
      }
      if (describedBy) this.input.setAttribute("aria-describedby", describedBy);
      else this.input.removeAttribute("aria-describedby");
      this.removeAttribute("role");
      this.removeAttribute("aria-hidden");
      return;
    }
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-hidden", "true");
    } else {
      this.setAttribute("role", "img");
      this.removeAttribute("aria-hidden");
    }
  }

  #handleInput(e) {
    // Update background attribute without triggering full re-render
    this.#internalUpdate = true;
    this.setAttribute("background", e.target.value);
    this.#internalUpdate = false;
    // The native input/change events bubble naturally
  }

  get background() {
    return this.getAttribute("background");
  }

  set background(value) {
    this.setAttribute("background", value);
  }

  focus() {
    if (this.input?.isConnected) {
      this.input.focus();
      return;
    }
    HTMLElement.prototype.focus.call(this);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "background") {
      if (this.#internalUpdate) {
        const isImg =
          /^(linear-gradient|radial-gradient|conic-gradient|repeating-|url)\s*\(/i.test(
            newValue,
          );
        this.style.setProperty(
          "--swatch-background",
          isImg ? newValue : `linear-gradient(${newValue}, ${newValue})`,
        );
        return;
      }
      this.#render();
    } else if (name === "alpha") {
      this.#updateAlpha();
    } else if (
      name === "disabled" ||
      name === "aria-label" ||
      name === "aria-labelledby" ||
      name === "aria-describedby"
    ) {
      this.#syncA11y();
    }
  }

  get alpha() {
    return this.getAttribute("alpha");
  }

  set alpha(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("alpha");
    } else {
      this.setAttribute("alpha", value);
    }
  }
}
figDefineElement("fig-swatch", FigSwatch);

export { FigSwatch };
