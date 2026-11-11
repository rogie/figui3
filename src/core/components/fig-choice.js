/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figBooleanAttribute,
  figDefineElement,
} from "../runtime/index.js";

/* Choice */
/**
 * A generic choice container for use within FigChooser.
 * @attr {string} value - Identifier for this choice
 * @attr {boolean} selected - Whether this choice is currently selected
 * @attr {boolean} disabled - Whether this choice is disabled
 */
class FigChoice extends HTMLElement {
  #childObserver = null;

  static get observedAttributes() {
    return ["selected", "disabled"];
  }

  connectedCallback() {
    this.setAttribute("role", "option");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "0");
    }
    this.#syncSelectedState();
    if (figBooleanAttribute(this, "disabled")) {
      this.setAttribute("aria-disabled", "true");
    }
  }

  disconnectedCallback() {
    this.#childObserver?.disconnect();
  }

  #syncSelectedState() {
    const selected = figBooleanAttribute(this, "selected");
    this.setAttribute("aria-selected", selected ? "true" : "false");
    for (const child of this.children) {
      child.toggleAttribute("selected", selected);
    }
    this.#childObserver?.disconnect();
    if (selected && this.isConnected) {
      this.#childObserver ??= new MutationObserver(() =>
        this.#syncSelectedState(),
      );
      this.#childObserver.observe(this, { childList: true });
    }
  }

  attributeChangedCallback(name) {
    if (name === "selected") {
      this.#syncSelectedState();
    }
    if (name === "disabled") {
      const isDisabled =
        this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false";
      if (isDisabled) {
        this.setAttribute("aria-disabled", "true");
        this.setAttribute("tabindex", "-1");
      } else {
        this.removeAttribute("aria-disabled");
        this.setAttribute("tabindex", "0");
      }
    }
  }
}
figDefineElement("fig-choice", FigChoice);

export { FigChoice };
