/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
/**
 * FigUI3 opacity slider.
 */

import { FigInputSlider, figInputSliderSchema } from "./fig-input-slider.js";
import { deepFreeze, stringAttribute } from "../runtime/input-slider-schema.js";
import { figLabDefineElement } from "../runtime/dom.js";

export const figInputSliderOpacitySchema = deepFreeze({
  ...figInputSliderSchema,
  color: stringAttribute("Color"),
});

export class FigInputSliderOpacity extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderOpacitySchema;
  }

  getFillRanges() {
    return [{ start: 0, end: 1 }];
  }

  syncSliderStyles(state) {
    super.syncSliderStyles(state);
    this.style.setProperty(
      "--fig-input-slider-color",
      this.getAttribute("color") ||
        "var(--fig-input-slider-opacity-color, #0d99ff)",
    );
  }
}
figLabDefineElement("fig-input-slider-opacity", FigInputSliderOpacity);
