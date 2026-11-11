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

/**
 * A selectable item for use within FigToolbelt.
 * @attr {string} value - The value associated with the item
 * @attr {boolean} selected - Whether the item is currently selected
 * @attr {boolean} disabled - Whether the item is unavailable
 */
class FigToolbeltItem extends HTMLElement {
  #childObserver = new MutationObserver(() => this.#syncPrimaryButton());

  static get observedAttributes() {
    return ["selected", "disabled"];
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "button");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    this.#childObserver.observe(this, { childList: true, subtree: true });
    this.#syncPrimaryButton();
    this.#syncA11yState();
  }

  get value() {
    const value = this.getAttribute("value");
    return value !== null ? value : this.textContent?.trim() || "";
  }

  set value(value) {
    this.setAttribute("value", value ?? "");
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

  attributeChangedCallback() {
    this.#syncA11yState();
  }

  #syncA11yState() {
    const selected = figBooleanAttribute(this, "selected");
    const disabled = figBooleanAttribute(this, "disabled");
    this.setAttribute("aria-pressed", selected ? "true" : "false");
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
    }
  }

  #syncPrimaryButton() {
    const primaryButton = this.querySelector("fig-button");
    this.querySelectorAll("fig-button[data-fig-toolbelt-item-primary]").forEach(
      (button) => {
        button.toggleAttribute(
          "data-fig-toolbelt-item-primary",
          button === primaryButton,
        );
      },
    );
    primaryButton?.setAttribute("data-fig-toolbelt-item-primary", "");
  }

  disconnectedCallback() {
    this.#childObserver.disconnect();
  }
}
figDefineElement("fig-toolbelt-item", FigToolbeltItem);

export { FigToolbeltItem };
