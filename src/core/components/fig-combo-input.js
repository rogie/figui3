/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figDefineElement,
} from "../runtime/index.js";
import { FigSplitInput } from "./fig-split-input.js";

/** @deprecated Use fig-split-input. */
class FigComboInput extends FigSplitInput {}
figDefineElement("fig-combo-input", FigComboInput);

export { FigComboInput };
