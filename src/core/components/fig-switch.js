/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigCheckbox } from "./fig-checkbox.js";

/* Switch */
/**
 * A custom switch/toggle input element extending FigCheckbox.
 * @attr {boolean} checked - Whether the switch is on
 * @attr {boolean} disabled - Whether the switch is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The form field name
 * @attr {string} value - The value when on
 */
class FigSwitch extends FigCheckbox {
  render() {
    this.input.setAttribute("class", "switch");
    this.input.setAttribute("role", "switch");
  }
}
figDefineElement("fig-switch", FigSwitch);

export { FigSwitch };
