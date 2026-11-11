export type FigColorSpace = "srgb" | "display-p3";
export interface FigRGB {
  r: number;
  g: number;
  b: number;
}
export interface FigRGBA extends FigRGB {
  a: number;
}
export interface FigHSL {
  h: number;
  s: number;
  l: number;
}
export interface FigHSV {
  h: number;
  s: number;
  v: number;
}
export interface FigOklab {
  l: number;
  a: number;
  b: number;
}
export interface FigOklch {
  l: number;
  c: number;
  h: number;
}
export interface FigColorOptions {
  colorSpace?: FigColorSpace;
  clip?: boolean;
  gamutMap?: boolean;
}

export function figNormalizeHue(hue: number): number;
export function figHexToRGB(hex: string): FigRGBA;
export function figRGBToHex(
  r: number,
  g: number,
  b: number,
  alpha?: number,
): string;
export function figRGBToLinear(channel: number): number;
export function figLinearToSRGB(channel: number): number;
export function figConvertRGB(
  r: number,
  g: number,
  b: number,
  options?: {
    from?: FigColorSpace;
    to?: FigColorSpace;
    clip?: boolean;
  },
): FigRGB;
export function figRGBToOklab(
  r: number,
  g: number,
  b: number,
  options?: FigColorOptions,
): FigOklab;
export function figOklabToRGB(
  l: number,
  a: number,
  b: number,
  options?: FigColorOptions,
): FigRGB;
export function figOklabToOklch(
  l: number,
  a: number,
  b: number,
): FigOklch;
export function figOklchToOklab(
  l: number,
  c: number,
  h: number,
): FigOklab;
export function figRGBToOklch(
  r: number,
  g: number,
  b: number,
  options?: FigColorOptions,
): FigOklch;
export function figOklchToRGB(
  l: number,
  c: number,
  h: number,
  options?: FigColorOptions,
): FigRGB;
export function figHexToOklch(hex: string): FigOklch;
export function figOklchToHex(
  l: number,
  c: number,
  h: number,
  options?: FigColorOptions,
): string;
export function figRGBToHsl(r: number, g: number, b: number): FigHSL;
export function figHslToRGB(h: number, s: number, l: number): FigRGB;
export function figRGBToHsv(r: number, g: number, b: number): FigHSV;
export function figHsvToRGB(h: number, s: number, v: number): FigRGB;
export function figInterpolateHue(
  first: number,
  second: number,
  amount: number,
  mode?: "shorter" | "longer" | "increasing" | "decreasing",
): number;
export function figOklabDistance(
  first: FigOklab,
  second: FigOklab,
): number;
export function figIsOklchInGamut(
  l: number,
  c: number,
  h: number,
  options?: FigColorOptions,
): boolean;
export function figMapOklchToGamut(
  l: number,
  c: number,
  h: number,
  options?: FigColorOptions,
): FigOklch;
