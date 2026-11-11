/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
/**
 * FigUI3 stepper slider.
 */

import { FigInputSlider, figInputSliderSchema } from "./fig-input-slider.js";
import { figLabDefineElement } from "../runtime/dom.js";

const FIG_INPUT_SLIDER_MAX_TICKS = 200;
export const figInputSliderStepperSchema = figInputSliderSchema;

export class FigInputSliderStepper extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderStepperSchema;
  }

  getSliderDefaults() {
    return { ...super.getSliderDefaults(), step: 10 };
  }

  getTicks(state) {
    if (!state.step) return [];
    const exactCount = Math.max(
      1,
      Math.floor((state.max - state.min) / state.step),
    );
    const stride = Math.max(
      1,
      Math.ceil(exactCount / (FIG_INPUT_SLIDER_MAX_TICKS - 1)),
    );
    const ticks = [];
    for (let index = 0; index <= exactCount; index += stride) {
      const value = Math.min(state.max, state.min + index * state.step);
      ticks.push({
        value,
        progress: (value - state.min) / (state.max - state.min),
        active: value <= state.values[0],
      });
    }
    if (ticks.at(-1)?.value !== state.max) {
      ticks.push({
        value: state.max,
        progress: 1,
        active: state.max <= state.values[0],
      });
    }
    return ticks;
  }
}
figLabDefineElement("fig-input-slider-stepper", FigInputSliderStepper);
