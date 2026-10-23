/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";

const PALETTE_ATTRIBUTES = ["value", "min", "max", "fixed", "disabled"];

function normalizePaletteValue(value) {
  let entries = value;
  if (typeof entries === "string") {
    const raw = entries.trim();
    if (!raw) return [];
    try {
      entries = JSON.parse(raw);
    } catch {
      entries = raw.includes(",") ? raw.split(",") : [raw];
    }
  }
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (typeof entry === "string") {
      const color = entry.trim();
      return {
        color: color.slice(0, 7) || "#D9D9D9",
        alpha:
          color.length > 7
            ? Math.max(0, Math.min(1, parseInt(color.slice(7, 9), 16) / 255))
            : 1,
      };
    }
    if (entry && typeof entry === "object") {
      const alpha =
        entry.alpha !== undefined
          ? Number(entry.alpha)
          : entry.opacity !== undefined
            ? Number(entry.opacity) / 100
            : 1;
      return {
        color: String(entry.color || "#D9D9D9").slice(0, 7),
        alpha: Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1,
      };
    }
    return { color: "#D9D9D9", alpha: 1 };
  });
}

customElements.whenDefined("fig-popup").then(() => {
  if (customElements.get("fig-popup-palette")) return;

  const FigPopup = customElements.get("fig-popup");

  /**
   * A reusable popup editor for an ordered palette of solid colors.
   *
   * @element fig-popup-palette
   * @attr {string} value - JSON color array or comma-separated hex colors
   * @attr {number} min - Minimum number of colors
   * @attr {number} max - Maximum number of colors
   * @attr {boolean} fixed - Locks the palette length
   * @attr {boolean} disabled - Disables palette editing
   * @fires input - During editing with the normalized color array in detail
   * @fires change - On committed edits with the normalized color array in detail
   */
  class FigPopupPalette extends FigPopup {
    #editor = null;
    #syncingValueAttribute = false;

    static get observedAttributes() {
      return [
        ...new Set([
          ...(super.observedAttributes || []),
          ...PALETTE_ATTRIBUTES,
        ]),
      ];
    }

    get value() {
      return normalizePaletteValue(this.getAttribute("value"));
    }

    set value(value) {
      this.setAttribute(
        "value",
        typeof value === "string" ? value : JSON.stringify(value ?? []),
      );
    }

    connectedCallback() {
      this.#ensureStructure();
      this.#applyDefaults();
      super.connectedCallback();
      this.#syncEditor();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      super.attributeChangedCallback(name, oldValue, newValue);
      if (
        oldValue !== newValue &&
        PALETTE_ATTRIBUTES.includes(name) &&
        !this.#syncingValueAttribute
      ) {
        this.#syncEditorAttribute(name);
      }
    }

    #applyDefaults() {
      if (!this.hasAttribute("aria-label")) {
        this.setAttribute("aria-label", "Edit palette");
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
      this.classList.add("fig-palette-editor-popup");
    }

    #ensureStructure() {
      if (this.#editor?.isConnected) return;
      let content = this.querySelector(
        ":scope > fig-content.fig-palette-editor-content",
      );
      let editor = content?.querySelector(":scope > fig-palette-editor");
      if (!content) {
        content = document.createElement("fig-content");
        content.className = "fig-palette-editor-content";
        this.append(content);
      }
      if (!editor) {
        editor = document.createElement("fig-palette-editor");
        content.append(editor);
      }
      editor.addEventListener("input", this.#handleEditorEvent);
      editor.addEventListener("change", this.#handleEditorEvent);
      this.#editor = editor;
    }

    #syncEditor() {
      for (const name of PALETTE_ATTRIBUTES) {
        this.#syncEditorAttribute(name);
      }
    }

    #syncEditorAttribute(name) {
      if (!this.#editor) return;
      const value = this.getAttribute(name);
      if (value === null) this.#editor.removeAttribute(name);
      else this.#editor.setAttribute(name, value);
    }

    #handleEditorEvent = (event) => {
      event.stopPropagation();
      const value = normalizePaletteValue(event.detail);
      this.#syncingValueAttribute = true;
      this.setAttribute("value", JSON.stringify(value));
      this.#syncingValueAttribute = false;
      this.dispatchEvent(
        new CustomEvent(event.type, {
          bubbles: true,
          composed: true,
          detail: value,
        }),
      );
    };
  }

  customElements.define("fig-popup-palette", FigPopupPalette, {
    extends: "dialog",
  });
});
