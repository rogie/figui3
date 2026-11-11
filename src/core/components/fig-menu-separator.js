/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigSeparator } from "./fig-separator.js";

class FigMenuSeparator extends FigSeparator {}
figDefineElement("fig-menu-separator", FigMenuSeparator);

export { FigMenuSeparator };
