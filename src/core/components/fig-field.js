/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLDialogElement,
  HTMLElement,
  createFigIcon,
  figDefineElement,
  figUniqueId,
} from "../runtime/index.js";
import { FigTooltip } from "./fig-tooltip.js";

/* Form Field */
class FigField extends HTMLElement {
  #toggleable = false;
  #chevron = null;
  #boundToggle = null;
  #boundFocus = null;
  #boundLabelEnter = null;
  #boundLabelLeave = null;
  #childrenObserver = null;
  #inputObserver = null;

  constructor() {
    super();
    this.#boundToggle = this.#toggle.bind(this);
    this.#boundFocus = this.focus.bind(this);
    this.#boundLabelEnter = this.#onLabelEnter.bind(this);
    this.#boundLabelLeave = this.#onLabelLeave.bind(this);
  }

  static get observedAttributes() {
    return ["label"];
  }

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#setup();
      this.#observeChildren();
    });
  }

  #observeChildren() {
    if (this.#childrenObserver || typeof MutationObserver === "undefined") return;
    this.#childrenObserver = new MutationObserver(() => {
      this.#setup();
    });
    this.#childrenObserver.observe(this, { childList: true });
  }

  #setup() {
    const previousLabel = this.label;
    const previousChevron = this.#chevron;
    previousLabel?.removeEventListener("click", this.#boundToggle);
    previousLabel?.removeEventListener("click", this.#boundFocus);
    previousLabel?.removeEventListener("pointerenter", this.#boundLabelEnter);
    previousLabel?.removeEventListener("pointerleave", this.#boundLabelLeave);
    previousChevron?.removeEventListener("click", this.#boundToggle);

    this.label = this.querySelector(":scope>label");
    this.input = Array.from(this.childNodes).find((node) =>
      node.nodeType === Node.ELEMENT_NODE &&
      node.nodeName.toLowerCase().startsWith("fig-") &&
      !(
        node instanceof Element &&
        (node.classList.contains("fig-field-chevron") ||
          ["leading", "trailing"].includes(node.getAttribute("slot")))
      ),
    );
    this.#observeInputAttributes();

    // Popup/menu hosts also expose `open`, but that is overlay state — not a
    // fig-field disclosure. Only treat true expand/collapse children as toggleable.
    const inputTag = this.input?.localName ?? "";
    const paletteEditMode = this.input?.getAttribute?.("edit");
    const nonInlinePalette =
      inputTag === "fig-input-palette" &&
      (paletteEditMode === "false" || paletteEditMode === "picker");
    const popupOpenHost =
      inputTag === "fig-select" ||
      inputTag === "fig-menu" ||
      inputTag === "fig-dropdown" ||
      inputTag === "fig-tooltip" ||
      inputTag === "fig-fill-picker" ||
      inputTag === "fig-input-rotate" ||
      nonInlinePalette ||
      (this.input instanceof HTMLDialogElement);
    this.#toggleable = !!(
      this.input &&
      "open" in this.input &&
      typeof this.input.open !== "function" &&
      !popupOpenHost
    );

    if (this.#toggleable && this.label) {
      if (!this.#chevron || !this.#chevron.isConnected) {
        this.#chevron = createFigIcon("chevron", {
          size: "small",
          slot: "leading",
          className: "fig-field-chevron",
        });
        this.insertBefore(this.#chevron, this.label);
      }

      this.#chevron.addEventListener("click", this.#boundToggle);
      this.label.addEventListener("click", this.#boundToggle);
    } else {
      if (this.#chevron) {
        this.#chevron.removeEventListener("click", this.#boundToggle);
        this.#chevron.remove();
        this.#chevron = null;
      }
      if (this.input && this.label) {
        const nativeInputs = this.input.querySelectorAll(
          "input, select, textarea",
        );
        // A label with a `for` target already focuses and activates its control.
        // Only use the composite fallback when there is no single native target.
        if (nativeInputs.length !== 1) {
          this.label.addEventListener("click", this.#boundFocus);
        }
      }
    }

    if (this.input && this.label && !this.#toggleable) {
      this.#syncLabelAssociation();
    }

    if (this.label) {
      this.label.removeEventListener("pointerenter", this.#boundLabelEnter);
      this.label.addEventListener("pointerenter", this.#boundLabelEnter);
      this.label.removeEventListener("pointerleave", this.#boundLabelLeave);
      this.label.addEventListener("pointerleave", this.#boundLabelLeave);
    }
  }

  #observeInputAttributes() {
    this.#inputObserver?.disconnect();
    this.#inputObserver = null;
    if (
      this.input?.localName !== "fig-input-palette" ||
      typeof MutationObserver === "undefined"
    ) {
      return;
    }
    this.#inputObserver = new MutationObserver(() => this.#setup());
    this.#inputObserver.observe(this.input, {
      attributes: true,
      attributeFilter: ["edit"],
    });
  }

  disconnectedCallback() {
    this.#childrenObserver?.disconnect();
    this.#childrenObserver = null;
    this.#inputObserver?.disconnect();
    this.#inputObserver = null;
    if (this.label) FigTooltip.hide(this.label);
    if (this.label && this.#boundToggle) {
      this.label.removeEventListener("click", this.#boundToggle);
    }
    if (this.label && this.#boundFocus) {
      this.label.removeEventListener("click", this.#boundFocus);
    }
    if (this.label && this.#boundLabelEnter) {
      this.label.removeEventListener("pointerenter", this.#boundLabelEnter);
    }
    if (this.label && this.#boundLabelLeave) {
      this.label.removeEventListener("pointerleave", this.#boundLabelLeave);
    }
    if (this.#chevron && this.#boundToggle) {
      this.#chevron.removeEventListener("click", this.#boundToggle);
    }
  }

  #toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.input && typeof this.input.open !== "undefined") {
      this.input.open = !this.input.open;
    }
  }

  #onLabelEnter() {
    if (!this.label || this.label.scrollWidth <= this.label.clientWidth) return;
    FigTooltip.show(this.label, this.label.textContent.trim());
  }

  #onLabelLeave() {
    if (this.label) FigTooltip.hide(this.label);
  }

  #syncLabelAssociation() {
    if (!this.input || !this.label) return;
    const labelId = this.label.getAttribute("id") || figUniqueId();
    this.label.setAttribute("id", labelId);
    const nativeInputs = this.input.querySelectorAll("input, select, textarea");
    if (nativeInputs.length === 1) {
      const nativeInput = nativeInputs[0];
      const inputId = nativeInput.getAttribute("id") || figUniqueId();
      nativeInput.setAttribute("id", inputId);
      this.label.setAttribute("for", inputId);
      if (this.input.getAttribute("aria-labelledby") === labelId) {
        this.input.removeAttribute("aria-labelledby");
      }
      if (!nativeInput.hasAttribute("aria-labelledby")) {
        nativeInput.setAttribute("aria-labelledby", labelId);
      }
      return;
    }
    this.label.removeAttribute("for");
    if (!this.input.hasAttribute("aria-label") && !this.input.hasAttribute("aria-labelledby")) {
      this.input.setAttribute("aria-labelledby", labelId);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (this.label) {
          this.label.textContent = newValue;
          this.#syncLabelAssociation();
        }
        break;
    }
  }

  focus() {
    if (!this.input) return;
    if (this.input.contains(document.activeElement)) return;
    const nativeInputs = this.input.querySelectorAll("input, select, textarea");
    if (nativeInputs.length === 1) {
      nativeInputs[0].focus();
    } else {
      this.input.focus();
      if (nativeInputs.length === 0) {
        this.input.click();
      }
    }
  }
}
figDefineElement("fig-field", FigField);

export { FigField };
