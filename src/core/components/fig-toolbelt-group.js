/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/* Toolbelt */
/**
 * A semantic item group for use within FigToolbelt.
 */
class FigToolbeltGroup extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
  }
}
figDefineElement("fig-toolbelt-group", FigToolbeltGroup);

export { FigToolbeltGroup };
