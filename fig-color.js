/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */

const COLOR_SPACES = new Set(["srgb", "display-p3"]);
const EPSILON = 1e-7;

const RGB_TO_XYZ = {
  srgb: [
    [0.4123907992659595, 0.35758433938387796, 0.1804807884018343],
    [0.21263900587151036, 0.7151686787677559, 0.07219231536073371],
    [0.01933081871559185, 0.11919477979462599, 0.9505321522496607],
  ],
  "display-p3": [
    [0.4865709486482162, 0.26566769316909306, 0.1982172852343625],
    [0.2289745640697488, 0.6917385218365064, 0.079286914093745],
    [0, 0.04511338185890264, 1.043944368900976],
  ],
};

const XYZ_TO_RGB = {
  srgb: [
    [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
    [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
    [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
  ],
  "display-p3": [
    [2.493496911941425, -0.9313836179191239, -0.40271078445071684],
    [-0.8294889695615747, 1.7626640603183465, 0.023624685841943577],
    [0.03584583024378447, -0.07617238926804182, 0.9568845240076872],
  ],
};

function colorSpace(value) {
  return COLOR_SPACES.has(value) ? value : "srgb";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function multiplyMatrix(matrix, vector) {
  return matrix.map(
    (row) =>
      row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2],
  );
}

function encodedToLinear(value) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function linearToEncoded(value) {
  return value <= 0.0031308
    ? 12.92 * value
    : 1.055 * Math.max(value, 0) ** (1 / 2.4) - 0.055;
}

function rgbToLinearChannels(r, g, b) {
  return [encodedToLinear(r), encodedToLinear(g), encodedToLinear(b)];
}

function linearChannelsToRgb(channels, { clip = true } = {}) {
  const encoded = channels.map((channel) => linearToEncoded(channel) * 255);
  const values = clip
    ? encoded.map((channel) => clamp(channel, 0, 255))
    : encoded;
  return {
    r: Math.round(values[0]),
    g: Math.round(values[1]),
    b: Math.round(values[2]),
  };
}

function rgbToXyz(r, g, b, space) {
  return multiplyMatrix(
    RGB_TO_XYZ[colorSpace(space)],
    rgbToLinearChannels(r, g, b),
  );
}

function xyzToLinearRgb(xyz, space) {
  return multiplyMatrix(XYZ_TO_RGB[colorSpace(space)], xyz);
}

function linearSrgbToOklab(r, g, b) {
  const l = Math.cbrt(
    0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
  );
  const m = Math.cbrt(
    0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
  );
  const s = Math.cbrt(
    0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
  );
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearSrgb(l, a, b) {
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;
  const lValue = lRoot ** 3;
  const mValue = mRoot ** 3;
  const sValue = sRoot ** 3;
  return [
    +4.0767416621 * lValue - 3.3077115913 * mValue + 0.2309699292 * sValue,
    -1.2684380046 * lValue + 2.6097574011 * mValue - 0.3413193965 * sValue,
    -0.0041960863 * lValue - 0.7034186147 * mValue + 1.707614701 * sValue,
  ];
}

function oklabToLinearRgb(l, a, b, space) {
  const linearSrgb = oklabToLinearSrgb(l, a, b);
  if (colorSpace(space) === "srgb") return linearSrgb;
  const xyz = multiplyMatrix(RGB_TO_XYZ.srgb, linearSrgb);
  return xyzToLinearRgb(xyz, space);
}

function channelsInGamut(channels) {
  return channels.every(
    (channel) => channel >= -EPSILON && channel <= 1 + EPSILON,
  );
}

export function figNormalizeHue(hue) {
  const value = Number(hue);
  if (!Number.isFinite(value)) return 0;
  return ((value % 360) + 360) % 360;
}

export function figHexToRGB(hex) {
  let value = String(hex ?? "").trim().replace(/^#/, "");
  if (value.length === 3 || value.length === 4) {
    value = [...value].map((character) => character.repeat(2)).join("");
  }
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) {
    throw new TypeError(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
    a: value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1,
  };
}

export function figRGBToHex(r, g, b, alpha = 1) {
  const channels = [r, g, b].map((channel) =>
    Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0"),
  );
  const normalizedAlpha = clamp(alpha, 0, 1);
  if (normalizedAlpha < 1) {
    channels.push(
      Math.round(normalizedAlpha * 255).toString(16).padStart(2, "0"),
    );
  }
  return `#${channels.join("").toUpperCase()}`;
}

export function figRGBToLinear(channel) {
  return encodedToLinear(clamp(channel, 0, 255));
}

export function figLinearToSRGB(channel) {
  return Math.round(clamp(linearToEncoded(Number(channel)), 0, 1) * 255);
}

export function figConvertRGB(
  r,
  g,
  b,
  { from = "srgb", to = "srgb", clip = true } = {},
) {
  const source = colorSpace(from);
  const target = colorSpace(to);
  if (source === target) {
    const values = clip
      ? [r, g, b].map((channel) => clamp(channel, 0, 255))
      : [Number(r), Number(g), Number(b)];
    return { r: values[0], g: values[1], b: values[2] };
  }
  const xyz = rgbToXyz(r, g, b, source);
  return linearChannelsToRgb(xyzToLinearRgb(xyz, target), { clip });
}

export function figRGBToOklab(
  r,
  g,
  b,
  { colorSpace: space = "srgb" } = {},
) {
  let linear = rgbToLinearChannels(r, g, b);
  if (colorSpace(space) === "display-p3") {
    const xyz = multiplyMatrix(RGB_TO_XYZ["display-p3"], linear);
    linear = xyzToLinearRgb(xyz, "srgb");
  }
  return linearSrgbToOklab(...linear);
}

export function figOklabToRGB(
  l,
  a,
  b,
  { colorSpace: space = "srgb", clip = true } = {},
) {
  return linearChannelsToRgb(oklabToLinearRgb(l, a, b, space), { clip });
}

export function figOklabToOklch(l, a, b) {
  const c = Math.sqrt(a * a + b * b);
  return {
    l,
    c,
    h: c < EPSILON ? 0 : figNormalizeHue((Math.atan2(b, a) * 180) / Math.PI),
  };
}

export function figOklchToOklab(l, c, h) {
  const radians = (figNormalizeHue(h) * Math.PI) / 180;
  return {
    l: Number(l),
    a: Number(c) * Math.cos(radians),
    b: Number(c) * Math.sin(radians),
  };
}

export function figRGBToOklch(r, g, b, options) {
  const lab = figRGBToOklab(r, g, b, options);
  return figOklabToOklch(lab.l, lab.a, lab.b);
}

export function figOklchToRGB(l, c, h, options = {}) {
  const mapped =
    options.gamutMap === true
      ? figMapOklchToGamut(l, c, h, options)
      : { l, c, h };
  const lab = figOklchToOklab(mapped.l, mapped.c, mapped.h);
  return figOklabToRGB(lab.l, lab.a, lab.b, options);
}

export function figHexToOklch(hex) {
  const { r, g, b } = figHexToRGB(hex);
  return figRGBToOklch(r, g, b);
}

export function figOklchToHex(l, c, h, options = {}) {
  const { r, g, b } = figOklchToRGB(l, c, h, {
    ...options,
    gamutMap: options.gamutMap !== false,
  });
  return figRGBToHex(r, g, b);
}

export function figRGBToHsl(r, g, b) {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: figNormalizeHue(h), s: s * 100, l: l * 100 };
}

export function figHslToRGB(h, s, l) {
  const hue = figNormalizeHue(h);
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  let channels;
  if (section < 1) channels = [chroma, x, 0];
  else if (section < 2) channels = [x, chroma, 0];
  else if (section < 3) channels = [0, chroma, x];
  else if (section < 4) channels = [0, x, chroma];
  else if (section < 5) channels = [x, 0, chroma];
  else channels = [chroma, 0, x];
  const offset = lightness - chroma / 2;
  return {
    r: Math.round((channels[0] + offset) * 255),
    g: Math.round((channels[1] + offset) * 255),
    b: Math.round((channels[2] + offset) * 255),
  };
}

export function figRGBToHsv(r, g, b) {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  return {
    h: figNormalizeHue(h),
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

export function figHsvToRGB(h, s, v) {
  const hue = figNormalizeHue(h);
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(v, 0, 100) / 100;
  const chroma = value * saturation;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  let channels;
  if (section < 1) channels = [chroma, x, 0];
  else if (section < 2) channels = [x, chroma, 0];
  else if (section < 3) channels = [0, chroma, x];
  else if (section < 4) channels = [0, x, chroma];
  else if (section < 5) channels = [x, 0, chroma];
  else channels = [chroma, 0, x];
  const offset = value - chroma;
  return {
    r: Math.round((channels[0] + offset) * 255),
    g: Math.round((channels[1] + offset) * 255),
    b: Math.round((channels[2] + offset) * 255),
  };
}

export function figInterpolateHue(h1, h2, amount, mode = "shorter") {
  const start = figNormalizeHue(h1);
  const end = figNormalizeHue(h2);
  let difference = end - start;
  switch (mode) {
    case "longer":
      if (difference > 0 && difference < 180) difference -= 360;
      else if (difference < 0 && difference > -180) difference += 360;
      break;
    case "increasing":
      if (difference < 0) difference += 360;
      break;
    case "decreasing":
      if (difference > 0) difference -= 360;
      break;
    default:
      if (difference > 180) difference -= 360;
      else if (difference < -180) difference += 360;
      break;
  }
  return figNormalizeHue(start + difference * Number(amount));
}

export function figOklabDistance(first, second) {
  return Math.sqrt(
    (Number(first?.l) - Number(second?.l)) ** 2 +
      (Number(first?.a) - Number(second?.a)) ** 2 +
      (Number(first?.b) - Number(second?.b)) ** 2,
  );
}

export function figIsOklchInGamut(
  l,
  c,
  h,
  { colorSpace: space = "srgb" } = {},
) {
  const lab = figOklchToOklab(l, c, h);
  return channelsInGamut(oklabToLinearRgb(lab.l, lab.a, lab.b, space));
}

export function figMapOklchToGamut(
  l,
  c,
  h,
  { colorSpace: space = "srgb" } = {},
) {
  const lightness = clamp(l, 0, 1);
  const chroma = Math.max(0, Number(c) || 0);
  const hue = figNormalizeHue(h);
  if (figIsOklchInGamut(lightness, chroma, hue, { colorSpace: space })) {
    return { l: lightness, c: chroma, h: hue };
  }
  let low = 0;
  let high = chroma;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    if (figIsOklchInGamut(lightness, middle, hue, { colorSpace: space })) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return { l: lightness, c: low, h: hue };
}
