/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

class FigInputCombo extends HTMLElement {}
figDefineElement("fig-input-combo", FigInputCombo);

export { FigInputCombo };
