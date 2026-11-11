/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineCustomElement,
  figWarnInvariant,
} from "../../shared/invariants.js";

// FigLayer
const HTMLElement = globalThis.HTMLElement ?? class {};
const CustomEvent = class extends (globalThis.CustomEvent ?? class {}) {
  constructor(type, options = {}) {
    super(
      type,
      options.bubbles && options.composed === undefined
        ? { ...options, composed: true }
        : options,
    );
  }
};

class FigLayer extends HTMLElement {
  static get observedAttributes() {
    return ["open", "visible", "disabled"];
  }

  #chevron = null;
  #boundHandleChevronClick = null;
  #connectFrame = 0;

  connectedCallback() {
    this.#syncA11y();
    if (this.#connectFrame) cancelAnimationFrame(this.#connectFrame);
    this.#connectFrame = requestAnimationFrame(() => {
      this.#connectFrame = 0;
      if (!this.isConnected) return;
      this.#injectChevron();
      this.#syncA11y();
    });
  }

  disconnectedCallback() {
    if (this.#connectFrame) {
      cancelAnimationFrame(this.#connectFrame);
      this.#connectFrame = 0;
    }
    if (this.#chevron && this.#boundHandleChevronClick) {
      this.#chevron.removeEventListener("click", this.#boundHandleChevronClick);
      this.#chevron.removeEventListener("keydown", this.#handleChevronKeyDown);
    }
  }

  #injectChevron() {
    const row = this.querySelector(":scope > .fig-layer-row");
    if (!row) {
      figWarnInvariant(
        "fig-layer-row",
        "fig-layer requires a direct .fig-layer-row child.",
      );
      return;
    }

    this.#chevron = row.querySelector(".fig-layer-chevron");
    if (!this.#chevron) {
      this.#chevron = document.createElement("span");
      this.#chevron.className = "fig-layer-chevron";
      row.prepend(this.#chevron);
    }

    this.#boundHandleChevronClick ??= this.#handleChevronClick.bind(this);
    this.#chevron.removeEventListener("click", this.#boundHandleChevronClick);
    this.#chevron.removeEventListener("keydown", this.#handleChevronKeyDown);
    this.#chevron.addEventListener("click", this.#boundHandleChevronClick);
    this.#chevron.addEventListener("keydown", this.#handleChevronKeyDown);
    this.#syncA11y();
  }

  #handleChevronClick(e) {
    if (this.disabled) return;
    e.stopPropagation();
    this.open = !this.open;
  }

  #handleChevronKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    this.#handleChevronClick(e);
  };

  #syncA11y() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "treeitem");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", this.disabled ? "-1" : "0");
    }
    this.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.setAttribute("aria-hidden", this.visible ? "false" : "true");
    this.setAttribute("aria-disabled", this.disabled ? "true" : "false");

    if (!this.#chevron) return;
    this.#chevron.setAttribute("role", "button");
    this.#chevron.setAttribute("tabindex", this.disabled ? "-1" : "0");
    this.#chevron.setAttribute(
      "aria-label",
      this.open ? "Collapse layer" : "Expand layer",
    );
    this.#chevron.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.#chevron.setAttribute("aria-disabled", this.disabled ? "true" : "false");
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
  }

  get visible() {
    const attr = this.getAttribute("visible");
    return attr !== "false";
  }

  set visible(value) {
    if (value) {
      this.setAttribute("visible", "true");
    } else {
      this.setAttribute("visible", "false");
    }
  }

  get disabled() {
    const attr = this.getAttribute("disabled");
    return attr !== null && attr !== "false";
  }

  set disabled(value) {
    if (value) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "open") {
      this.#syncA11y();
      const wasOpen = oldValue !== null && oldValue !== "false";
      const isOpen = newValue !== null && newValue !== "false";
      if (wasOpen !== isOpen) {
        this.dispatchEvent(
          new CustomEvent("openchange", {
            detail: { open: isOpen },
            bubbles: true,
          }),
        );
      }
    }

    if (name === "visible") {
      this.#syncA11y();
      const wasVisible = oldValue !== "false";
      const isVisible = newValue !== "false";
      if (wasVisible !== isVisible) {
        this.dispatchEvent(
          new CustomEvent("visibilitychange", {
            detail: { visible: isVisible },
            bubbles: true,
          }),
        );
      }
    }

    if (name === "disabled") {
      this.#syncA11y();
    }
  }
}

figDefineCustomElement("fig-layer", FigLayer);

export { FigLayer };
