/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
/**
 * FigUI3 delta slider.
 */

import { FigInputSlider, figInputSliderSchema } from "./fig-input-slider.js";
import { figLabDefineElement } from "../runtime/dom.js";

export const figInputSliderDeltaSchema = figInputSliderSchema;

export class FigInputSliderDelta extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderDeltaSchema;
  }

  getSliderDefaults() {
    return { ...super.getSliderDefaults(), min: -100, max: 100 };
  }

  getFallbackValue(bounds) {
    return bounds.min + (bounds.max - bounds.min) / 2;
  }

  getTicks(state) {
    const value = state.defaultValues[0];
    const progress = state.defaultPercentages[0];
    return [{ value, progress, active: false }];
  }

  getHandleInsetDirection(value, state, index = 0) {
    const defaultValue =
      state.defaultValues[index] ?? state.defaultValues[0] ?? state.min;
    return value < defaultValue ? "end" : "start";
  }

  getSnapValues(state, index = 0) {
    return [
      state.defaultValues[index] ?? state.defaultValues[0] ?? state.min,
    ];
  }

  getSnapThreshold(state) {
    return (state.max - state.min) * 0.02;
  }

  drawFills(state, current = []) {
    const fills = Array.from(super.drawFills(state, current));
    const value = state.values[0] ?? state.min;
    const defaultValue = state.defaultValues[0] ?? state.min;
    fills[0]?.toggleAttribute("data-before-default", value < defaultValue);
    fills[0]?.toggleAttribute("data-after-default", value > defaultValue);
    return fills;
  }

  getFillRanges(state) {
    const progress = state.percentages[0] ?? 0;
    const defaultProgress = state.defaultPercentages[0] ?? 0;
    return [
      {
        start: Math.min(progress, defaultProgress),
        end: Math.max(progress, defaultProgress),
      },
    ];
  }
}
figLabDefineElement("fig-input-slider-delta", FigInputSliderDelta);
