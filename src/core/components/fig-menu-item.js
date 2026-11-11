/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

// ─── Menu ────────────────────────────────────────────────────────────────────

class FigMenuItem extends HTMLElement {
  static get observedAttributes() {
    return ["value", "disabled"];
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val ?? "");
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "menuitem");
    }
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", "-1");
    }
    this.#syncDisabled();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
      if (!this.hasAttribute("tabindex")) {
        this.setAttribute("tabindex", "-1");
      }
    }
  }
}
figDefineElement("fig-menu-item", FigMenuItem);

export { FigMenuItem };
