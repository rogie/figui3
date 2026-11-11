/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
/**
 * FigUI3 hue slider.
 */

import { FigInputSlider, figInputSliderSchema } from "./fig-input-slider.js";
import {
  booleanAttribute,
  deepFreeze,
  enumAttribute,
  stringAttribute,
} from "../runtime/input-slider-schema.js";
import { figLabDefineElement } from "../runtime/dom.js";

const FIG_INPUT_SLIDER_HUE_COLOR_SPACES = [
  "srgb",
  "srgb-linear",
  "display-p3",
  "oklab",
  "oklch",
  "hsl",
];
const FIG_INPUT_SLIDER_HUE_POLAR_COLOR_SPACES = new Set(["oklch", "hsl"]);

export const figInputSliderHueSchema = deepFreeze({
  ...figInputSliderSchema,
  ghost: booleanAttribute("Ghost", "string", false),
  color: stringAttribute("Color"),
  "color-space": enumAttribute(
    "Color space",
    FIG_INPUT_SLIDER_HUE_COLOR_SPACES,
  ),
});

let figInputSliderHueColorContext = null;

function cssColorToRgb(value) {
  if (
    typeof document === "undefined" ||
    !value ||
    (typeof CSS !== "undefined" && !CSS.supports("color", value))
  ) {
    return null;
  }
  figInputSliderHueColorContext ??= document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  const context = figInputSliderHueColorContext;
  if (!context) return null;
  context.canvas.width = 1;
  context.canvas.height = 1;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

function rgbToHsv({ r, g, b }) {
  const channels = [r, g, b].map((channel) => channel / 255);
  const max = Math.max(...channels);
  const min = Math.min(...channels);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === channels[0]) {
      hue = 60 * (((channels[1] - channels[2]) / delta) % 6);
    } else if (max === channels[1]) {
      hue = 60 * ((channels[2] - channels[0]) / delta + 2);
    } else {
      hue = 60 * ((channels[0] - channels[1]) / delta + 4);
    }
  }
  return {
    hue: (hue + 360) % 360,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

function hsvToRgb(hue, saturation, value) {
  const chroma = value * saturation;
  const segment = (((hue % 360) + 360) % 360) / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r1, g1, b1] =
    segment < 1
      ? [chroma, secondary, 0]
      : segment < 2
        ? [secondary, chroma, 0]
        : segment < 3
          ? [0, chroma, secondary]
          : segment < 4
            ? [0, secondary, chroma]
            : segment < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  const match = value - chroma;
  return [r1, g1, b1].map((channel) =>
    Math.round((channel + match) * 255),
  );
}

function hsvForCssColor(value) {
  const rgb = cssColorToRgb(value);
  return rgb ? rgbToHsv(rgb) : null;
}

function normalizeHueColorSpace(value) {
  const normalized = String(value || "srgb").toLowerCase();
  return FIG_INPUT_SLIDER_HUE_COLOR_SPACES.includes(normalized)
    ? normalized
    : "srgb";
}

function hueGradientInterpolationClause(colorSpace) {
  if (colorSpace === "srgb") return "";
  if (FIG_INPUT_SLIDER_HUE_POLAR_COLOR_SPACES.has(colorSpace)) {
    return ` in ${colorSpace} shorter hue`;
  }
  return ` in ${colorSpace}`;
}

function hueGradientForHsv(
  { saturation, value: brightness },
  colorSpace = "srgb",
) {
  const stops = [0, 60, 120, 180, 240, 300, 360].map((hue) => {
    const [r, g, b] = hsvToRgb(hue, saturation, brightness);
    return `rgb(${r}, ${g}, ${b})`;
  });
  const interpolation = hueGradientInterpolationClause(
    normalizeHueColorSpace(colorSpace),
  );
  return `linear-gradient(to right${interpolation}, ${stops.join(", ")})`;
}

export class FigInputSliderHue extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderHueSchema;
  }

  syncSliderStyles(state) {
    super.syncSliderStyles(state);
    const authoredHsv = hsvForCssColor(this.getAttribute("color"));
    const hsv = authoredHsv ?? { hue: 0, saturation: 1, value: 1 };
    const colorSpace = normalizeHueColorSpace(
      this.getAttribute("color-space"),
    );
    const gradient = hueGradientForHsv(hsv, colorSpace);
    if (
      typeof CSS === "undefined" ||
      typeof CSS.supports !== "function" ||
      CSS.supports("background-image", gradient)
    ) {
      this.style.setProperty("--fig-input-slider-hue-gradient", gradient);
    } else {
      this.style.removeProperty("--fig-input-slider-hue-gradient");
    }
    if (authoredHsv) {
      const hue = state.values[0] ?? hsv.hue;
      const [r, g, b] = hsvToRgb(hue, hsv.saturation, hsv.value);
      this.style.setProperty(
        "--fig-input-slider-color",
        `rgb(${r}, ${g}, ${b})`,
      );
    } else {
      this.style.removeProperty("--fig-input-slider-color");
    }
  }

  getFallbackValue(bounds) {
    return (
      hsvForCssColor(this.getAttribute("color"))?.hue ??
      super.getFallbackValue(bounds)
    );
  }

  getSliderDefaults() {
    return { ...super.getSliderDefaults(), max: 360 };
  }

  getGhostDefault() {
    return false;
  }

  getFillRanges() {
    return [];
  }
}
figLabDefineElement("fig-input-slider-hue", FigInputSliderHue);
