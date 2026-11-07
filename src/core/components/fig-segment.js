/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/* Segmented Control */
/**
 * A custom segment element for use within FigSegmentedControl.
 * @attr {string} value - The value associated with this segment
 * @attr {boolean} selected - Whether the segment is currently selected
 */
class FigSegment extends HTMLElement {
  #value;
  #selected;
  #boundHandleClick;
  constructor() {
    super();
    this.#boundHandleClick = this.handleClick.bind(this);
  }
  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "radio");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    this.#syncA11yState();
    this.addEventListener("click", this.#boundHandleClick);
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
  }
  handleClick() {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    const parentControl = this.closest("fig-segmented-control");
    if (
      parentControl &&
      parentControl.hasAttribute("disabled") &&
      parentControl.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    this.setAttribute("selected", "true");
  }
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
    this.setAttribute("value", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.#selected = value;
    this.setAttribute("selected", value);
  }
  static get observedAttributes() {
    return ["selected", "value", "disabled"];
  }
  #syncA11yState() {
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.setAttribute("aria-checked", selected ? "true" : "false");
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
      this.setAttribute("tabindex", selected ? "0" : "-1");
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        this.#value = newValue;
        break;
      case "selected":
        this.#selected = newValue;
        this.#syncA11yState();
        break;
      case "disabled":
        this.#syncA11yState();
        break;
    }
  }
}
figDefineElement("fig-segment", FigSegment);

export { FigSegment };
