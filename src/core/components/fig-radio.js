/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigCheckbox } from "./fig-checkbox.js";

/* Radio */
/**
 * A custom radio input element extending FigCheckbox.
 * @attr {boolean} checked - Whether the radio is selected
 * @attr {boolean} disabled - Whether the radio is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The radio group name
 * @attr {string} value - The value when selected
 */
class FigRadio extends FigCheckbox {
  constructor() {
    super();
    this.input.setAttribute("type", "radio");
    const name = this.getAttribute("name");
    if (name) this.input.setAttribute("name", name);
    else this.input.removeAttribute("name");
  }
}
figDefineElement("fig-radio", FigRadio);

export { FigRadio };
