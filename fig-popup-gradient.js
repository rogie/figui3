/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";
import "./fig-gradient-editor.js";

const GRADIENT_ATTRIBUTES = [
  "value",
  "color-space",
  "disabled",
  "overflow",
  "show-rows",
];

customElements.whenDefined("fig-popup").then(() => {
  if (customElements.get("fig-popup-gradient")) return;

  const FigPopup = customElements.get("fig-popup");

  /**
   * A reusable popup containing a full gradient editor.
   *
   * @element fig-popup-gradient
   * @attr {string} value - JSON gradient config or full gradient fill value
   * @attr {string} color-space - `srgb` or `display-p3`
   * @attr {boolean} disabled - Disables gradient editing
   * @attr {"fade"|"visible"} overflow - Stop-list overflow mode
   * @attr {number} show-rows - Visible stop rows before overflow
   * @fires input - During gradient edits
   * @fires change - On committed gradient edits
   */
  class FigPopupGradient extends FigPopup {
    #editor = null;
    #syncingValueAttribute = false;

    static get observedAttributes() {
      return [
        ...new Set([
          ...(super.observedAttributes || []),
          ...GRADIENT_ATTRIBUTES,
        ]),
      ];
    }

    get value() {
      return this.#editor?.value ?? {};
    }

    set value(value) {
      this.setAttribute(
        "value",
        typeof value === "string" ? value : JSON.stringify(value ?? {}),
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
        GRADIENT_ATTRIBUTES.includes(name) &&
        !this.#syncingValueAttribute
      ) {
        this.#syncEditorAttribute(name);
      }
    }

    #applyDefaults() {
      if (!this.hasAttribute("aria-label")) {
        this.setAttribute("aria-label", "Edit gradient");
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
      if (this.#editor?.isConnected) return;
      let content = this.querySelector(
        ":scope > fig-content.fig-gradient-editor-content",
      );
      let editor = content?.querySelector(":scope > fig-gradient-editor");
      if (!content) {
        content = document.createElement("fig-content");
        content.className = "fig-gradient-editor-content";
        this.append(content);
      }
      if (!editor) {
        editor = document.createElement("fig-gradient-editor");
        content.append(editor);
      }
      editor.pickerAnchor = this;
      editor.addEventListener("input", this.#handleEditorEvent);
      editor.addEventListener("change", this.#handleEditorEvent);
      this.#editor = editor;
    }

    #syncEditor() {
      for (const name of GRADIENT_ATTRIBUTES) {
        this.#syncEditorAttribute(name);
      }
      if (this.#editor) this.#editor.pickerAnchor = this;
    }

    #syncEditorAttribute(name) {
      if (!this.#editor) return;
      const value = this.getAttribute(name);
      if (value === null) this.#editor.removeAttribute(name);
      else this.#editor.setAttribute(name, value);
    }

    #handleEditorEvent = (event) => {
      event.stopPropagation();
      const detail = event.detail ?? {
        type: "gradient",
        gradient: this.#editor?.value,
        css: this.#editor?.cssValue,
      };
      this.#syncingValueAttribute = true;
      this.setAttribute("value", JSON.stringify(detail.gradient ?? {}));
      this.#syncingValueAttribute = false;
      this.dispatchEvent(
        new CustomEvent(event.type, {
          bubbles: true,
          composed: true,
          detail,
        }),
      );
    };
  }

  customElements.define("fig-popup-gradient", FigPopupGradient, {
    extends: "dialog",
  });
});
