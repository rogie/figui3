import type * as React from "react";
import type {
  FigCustomEvent,
  FigSliderDetail,
  FigSliderElement,
} from "@rogieking/figui3";
import { figHexToRGB } from "@rogieking/figui3/fig-color.js";
import {
  FigInputSlider,
  figInputSliderSchema,
} from "@rogieking/figui3/fig-input-slider.js";
import { register } from "@rogieking/figui3/register.js";
import "@rogieking/figui3/react";

const slider = document.querySelector("fig-slider");
if (slider) {
  slider.value = "50";
  slider.min = 0;
  slider.max = 100;
}

const inputSlider = document.createElement("fig-input-slider");
inputSlider.setInteractionValue(42);
inputSlider.commitInteractionChange(0);
inputSlider.resetToDefault();

const SliderConstructor: typeof FigInputSlider = FigInputSlider;
const schemaLabel: string = figInputSliderSchema.value.label;
const red: number = figHexToRGB("#ff0000").r;
void SliderConstructor;
void schemaLabel;
void red;
void register({ editor: true, lab: true });

const sliderRef = null as React.Ref<FigSliderElement>;
const onSliderInput = (
  event: React.SyntheticEvent<
    FigSliderElement,
    CustomEvent<FigSliderDetail<string>>
  >,
) => {
  const detail = event.nativeEvent.detail;
  return detail.value;
};

const onReorder = (event: FigCustomEvent<"reorder">) => {
  return event.detail.from;
};
void onReorder;

const jsx = (
  <>
    <fig-slider
      ref={sliderRef}
      value="50"
      min={0}
      max={100}
      onInput={onSliderInput}
    />
    <fig-stack direction="vertical" />
    <fig-audio-waveform variant="ribbon" progress={0.5} />
    <fig-input-slider-hue value="180" />
    <fig-input-slider-wheel value="0" />
    <dialog is="fig-popup" position="bottom" />
    {/* @ts-expect-error fig-toast is a customized dialog, not an autonomous tag */}
    <fig-toast />
  </>
);
void jsx;
