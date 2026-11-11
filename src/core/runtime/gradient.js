/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figHexToRGB,
  figHslToRGB,
  figInterpolateHue,
  figLinearToSRGB,
  figOklabToOklch,
  figOklabToRGB,
  figOklchToOklab,
  figRGBToHsl as figRgbToHsl,
  figRGBToLinear,
  figRGBToOklab,
} from "./fig-color.js";

const GRADIENT_INTERPOLATION_SPACES = [
  "srgb",
  "srgb-linear",
  "display-p3",
  "oklab",
  "oklch",
  "hsl",
];
const GRADIENT_HUE_INTERPOLATIONS = [
  "shorter",
  "longer",
  "increasing",
  "decreasing",
];
const GRADIENT_HUE_SPACES = new Set(["oklch", "hsl"]);

const GRADIENT_PICKER_SPACES = ["srgb", "srgb-linear", "oklab", "oklch"];

function normalizeGradientConfig(gradient) {
  const next = { ...(gradient ?? {}) };
  let interpolationSpace = String(
    next.interpolationSpace ?? "srgb",
  ).toLowerCase();
  if (!GRADIENT_INTERPOLATION_SPACES.includes(interpolationSpace)) {
    interpolationSpace = "srgb";
  }
  next.interpolationSpace = interpolationSpace;

  const hueInterpolation = String(
    next.hueInterpolation ?? "shorter",
  ).toLowerCase();
  next.hueInterpolation = GRADIENT_HUE_INTERPOLATIONS.includes(hueInterpolation)
    ? hueInterpolation
    : "shorter";
  return next;
}

function gradientToValueShape(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  const output = {
    ...normalized,
    interpolationSpace: normalized.interpolationSpace,
  };
  if (GRADIENT_HUE_SPACES.has(normalized.interpolationSpace)) {
    output.hueInterpolation = normalized.hueInterpolation;
  } else {
    delete output.hueInterpolation;
  }
  return output;
}

function gradientInterpolationClause(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  if (normalized.interpolationSpace === "srgb") {
    return "";
  }
  if (GRADIENT_HUE_SPACES.has(normalized.interpolationSpace)) {
    return `in ${normalized.interpolationSpace} ${normalized.hueInterpolation} hue`;
  }
  return `in ${normalized.interpolationSpace}`;
}

function figCssUrl(url) {
  if (!url) return "";
  return `url("${String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function figLooksLikeVideoUrl(raw) {
  const text = String(raw ?? "").trim();
  if (!text || text.startsWith("{") || text.startsWith("#")) return false;
  if (text.startsWith("data:video/")) return true;
  try {
    const path = new URL(text, "https://fig.local").pathname;
    return /\.(mp4|webm|mov|m4v|ogv)$/i.test(path);
  } catch {
    return /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(text);
  }
}

function figSampleGradientAt(
  stops,
  position,
  interpolationSpace,
  hueInterpolation,
) {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const pos = position * 100;
  if (sorted.length === 0) return "#888888";
  if (pos <= sorted[0].position) return sorted[0].color;
  if (pos >= sorted[sorted.length - 1].position)
    return sorted[sorted.length - 1].color;

  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].position < pos) i++;
  const s1 = sorted[i];
  const s2 = sorted[i + 1];
  const range = s2.position - s1.position;
  const t = range > 0 ? (pos - s1.position) / range : 0;

  const c1 = figHexToRGB(s1.color);
  const c2 = figHexToRGB(s2.color);

  let r, g, b;
  const space = interpolationSpace || "oklab";

  if (space === "srgb-linear") {
    const lr1 = figRGBToLinear(c1.r),
      lg1 = figRGBToLinear(c1.g),
      lb1 = figRGBToLinear(c1.b);
    const lr2 = figRGBToLinear(c2.r),
      lg2 = figRGBToLinear(c2.g),
      lb2 = figRGBToLinear(c2.b);
    r = figLinearToSRGB(lr1 + (lr2 - lr1) * t);
    g = figLinearToSRGB(lg1 + (lg2 - lg1) * t);
    b = figLinearToSRGB(lb1 + (lb2 - lb1) * t);
  } else if (space === "oklch") {
    const lab1 = figRGBToOklab(c1.r, c1.g, c1.b);
    const lab2 = figRGBToOklab(c2.r, c2.g, c2.b);
    const lch1 = figOklabToOklch(lab1.l, lab1.a, lab1.b);
    const lch2 = figOklabToOklch(lab2.l, lab2.a, lab2.b);
    const L = lch1.l + (lch2.l - lch1.l) * t;
    const C = lch1.c + (lch2.c - lch1.c) * t;
    const H = figInterpolateHue(
      lch1.h,
      lch2.h,
      t,
      hueInterpolation || "shorter",
    );
    const lab = figOklchToOklab(L, C, H);
    const rgb = figOklabToRGB(lab.l, lab.a, lab.b);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
  } else if (space === "hsl") {
    const hsl1 = figRgbToHsl(c1.r, c1.g, c1.b);
    const hsl2 = figRgbToHsl(c2.r, c2.g, c2.b);
    const H = figInterpolateHue(
      hsl1.h,
      hsl2.h,
      t,
      hueInterpolation || "shorter",
    );
    const S = hsl1.s + (hsl2.s - hsl1.s) * t;
    const L = hsl1.l + (hsl2.l - hsl1.l) * t;
    const rgb = figHslToRGB(H, S, L);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
  } else if (space === "srgb") {
    r = Math.round(c1.r + (c2.r - c1.r) * t);
    g = Math.round(c1.g + (c2.g - c1.g) * t);
    b = Math.round(c1.b + (c2.b - c1.b) * t);
  } else {
    const lab1 = figRGBToOklab(c1.r, c1.g, c1.b);
    const lab2 = figRGBToOklab(c2.r, c2.g, c2.b);
    const L = lab1.l + (lab2.l - lab1.l) * t;
    const a = lab1.a + (lab2.a - lab1.a) * t;
    const bv = lab1.b + (lab2.b - lab1.b) * t;
    const rgb = figOklabToRGB(L, a, bv);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
  }

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

export {
  GRADIENT_HUE_INTERPOLATIONS,
  GRADIENT_HUE_SPACES,
  GRADIENT_INTERPOLATION_SPACES,
  GRADIENT_PICKER_SPACES,
  figCssUrl,
  figLooksLikeVideoUrl,
  figSampleGradientAt,
  gradientInterpolationClause,
  gradientToValueShape,
  normalizeGradientConfig,
};
