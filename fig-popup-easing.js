/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";

const EASING_ATTRIBUTES = [
  "value",
  "mode",
  "precision",
  "edit",
  "presets",
  "text",
];

customElements.whenDefined("fig-popup").then(() => {
  if (customElements.get("fig-popup-easing")) return;

  const FigPopup = customElements.get("fig-popup");

  /**
   * A reusable popup editor for easing curves.
   *
   * @element fig-popup-easing
   * @attr {string} value - Cubic bezier or spring easing value
   * @attr {string} mode - Optional "bezier" or "spring" constraint
   * @fires input - During easing edits
   * @fires change - On committed easing edits
   */
  class FigPopupEasing extends FigPopup {
    #curve = null;
    #syncingValueAttribute = false;

    static get observedAttributes() {
      return [
        ...new Set([
          ...(super.observedAttributes || []),
          ...EASING_ATTRIBUTES,
        ]),
      ];
    }

    get value() {
      return this.#curve?.value ?? this.getAttribute("value") ?? "";
    }

    set value(value) {
      this.setAttribute(
        "value",
        value && typeof value === "object"
          ? JSON.stringify(value)
          : String(value ?? ""),
      );
    }

    connectedCallback() {
      this.#ensureStructure();
      this.#applyDefaults();
      super.connectedCallback();
      this.#syncCurve();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      super.attributeChangedCallback(name, oldValue, newValue);
      if (
        oldValue !== newValue &&
        EASING_ATTRIBUTES.includes(name) &&
        !this.#syncingValueAttribute
      ) {
        this.#syncCurveAttribute(name);
      }
    }

    #applyDefaults() {
      if (!this.hasAttribute("aria-label")) {
        this.setAttribute("aria-label", "Edit easing");
      }
      if (!this.hasAttribute("position")) {
        this.setAttribute("position", "bottom left");
      }
      if (!this.hasAttribute("offset")) this.setAttribute("offset", "0 8");
      if (!this.hasAttribute("viewport-margin")) {
        this.setAttribute("viewport-margin", "8");
      }
      if (!this.hasAttribute("popover")) {
        this.setAttribute("popover", "manual");
      }
    }

    #ensureStructure() {
      if (this.#curve?.isConnected) return;
      let content = this.querySelector(
        ":scope > fig-content.fig-easing-curve-content",
      );
      let curve = content?.querySelector(":scope > fig-easing-curve");
      if (!content) {
        content = document.createElement("fig-content");
        content.className = "fig-easing-curve-content";
        this.append(content);
      }
      if (!curve) {
        curve = document.createElement("fig-easing-curve");
        curve.setAttribute("aspect-ratio", "4/3");
        content.append(curve);
      }
      curve.setAttribute("aspect-ratio", "4/3");
      curve.addEventListener("input", this.#handleCurveEvent);
      curve.addEventListener("change", this.#handleCurveEvent);
      this.#curve = curve;
    }

    #syncCurve() {
      for (const name of EASING_ATTRIBUTES) {
        this.#syncCurveAttribute(name);
      }
    }

    #syncCurveAttribute(name) {
      if (!this.#curve) return;
      const value = this.getAttribute(name);
      if (value === null) this.#curve.removeAttribute(name);
      else this.#curve.setAttribute(name, value);
    }

    #handleCurveEvent = (event) => {
      event.stopPropagation();
      const value = this.#curve?.value ?? event.detail;
      this.#syncingValueAttribute = true;
      this.setAttribute("value", String(value ?? ""));
      this.#syncingValueAttribute = false;
      this.dispatchEvent(
        new CustomEvent(event.type, {
          bubbles: true,
          composed: true,
          detail: event.detail,
        }),
      );
    };
  }

  customElements.define("fig-popup-easing", FigPopupEasing, {
    extends: "dialog",
  });
});
