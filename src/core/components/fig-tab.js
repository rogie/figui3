/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figBooleanAttribute,
  figDefineElement,
  figNextFrame,
  figUniqueId,
} from "../runtime/index.js";

/* Tabs */
/**
 * A custom tab element for use within FigTabs.
 * @attr {string} label - The text label of the tab
 * @attr {boolean} selected - Whether the tab is currently selected
 */
class FigTab extends HTMLElement {
  #selected;
  #boundHandleClick;
  constructor() {
    super();
    this.content = null;
    this.#selected = false;
    this.#boundHandleClick = this.handleClick.bind(this);
  }
  connectedCallback() {
    this.setAttribute("label", this.innerText);
    this.setAttribute("role", "tab");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    this.addEventListener("click", this.#boundHandleClick);

    figNextFrame(this, () => {
      if (typeof this.getAttribute("content") === "string") {
        this.content = document.querySelector(this.getAttribute("content"));
        if (this.content) {
          const tabId = this.getAttribute("id") || figUniqueId();
          const panelId = this.content.getAttribute("id") || figUniqueId();
          this.setAttribute("id", tabId);
          this.content.setAttribute("id", panelId);
          this.setAttribute("aria-controls", panelId);
          this.content.setAttribute("role", "tabpanel");
          this.content.setAttribute("aria-labelledby", tabId);
          if (this.#selected) {
            this.content.style.display = "block";
            this.setAttribute("aria-selected", "true");
          } else {
            this.content.style.display = "none";
            this.setAttribute("aria-selected", "false");
          }
        }
      }
    });
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.setAttribute("selected", value ? "true" : "false");
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
  }
  handleClick() {
    if (figBooleanAttribute(this, "disabled")) return;
    this.selected = true;
    if (this.content) {
      this.content.style.display = "block";
    }
  }

  static get observedAttributes() {
    return ["selected", "disabled"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "selected") {
      this.#selected = newValue !== null && newValue !== "false";
      this.setAttribute("aria-selected", this.#selected ? "true" : "false");
      this.setAttribute("tabindex", this.#selected ? "0" : "-1");
      if (this?.content) {
        this.content.style.display = this.#selected ? "block" : "none";
      }
    }
    if (name === "disabled") {
      const disabled = newValue !== null && newValue !== "false";
      if (disabled) {
        this.setAttribute("aria-disabled", "true");
        this.setAttribute("tabindex", "-1");
      } else {
        this.removeAttribute("aria-disabled");
        this.setAttribute("tabindex", this.#selected ? "0" : "-1");
      }
    }
  }
}
figDefineElement("fig-tab", FigTab);

export { FigTab };
