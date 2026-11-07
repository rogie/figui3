/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/**
 * fig-footer
 * @element fig-footer
 * @attr {boolean} borderless - Removes the top border
 * @attr {boolean} sticky - Pins the footer to the bottom of its scroll container
 */
class FigFooter extends HTMLElement {}
figDefineElement("fig-footer", FigFooter);

export { FigFooter };
