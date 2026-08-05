export type GradientStop = {
  color: string;
  position: number;
  opacity?: number;
};

export type GradientType = "linear" | "radial" | "angular";

export type GradientConfig = {
  type: GradientType;
  angle?: number;
  centerX?: number;
  centerY?: number;
  stops: GradientStop[];
  interpolationSpace?: string;
  hueInterpolation?: string;
  [key: string]: unknown;
};

export type GradientValue = {
  type: "gradient";
  gradient: GradientConfig;
};

const DEFAULT_STOPS: GradientStop[] = [
  { position: 0, color: "#7AEA66", opacity: 100 },
  { position: 67, color: "#4700FF", opacity: 53 },
  { position: 100, color: "#FF00BF", opacity: 100 },
];

export const DEFAULT_GRADIENT_VALUE: GradientValue = {
  type: "gradient",
  gradient: {
    type: "linear",
    angle: 90,
    stops: DEFAULT_STOPS.map((s) => ({ ...s })),
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return { r: 217, g: 217, b: 217 };
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

function normalizeType(raw: unknown): GradientType {
  const type = String(raw ?? "linear").toLowerCase();
  if (type === "radial") return "radial";
  if (type === "angular" || type === "conic") return "angular";
  return "linear";
}

function normalizeStops(stops: unknown): GradientStop[] {
  if (!Array.isArray(stops) || stops.length < 2) {
    return DEFAULT_STOPS.map((s) => ({ ...s }));
  }
  return stops.map((stop: GradientStop) => ({
    color: String(stop?.color || "#D9D9D9"),
    position: Number.isFinite(stop?.position) ? Number(stop.position) : 0,
    opacity:
      stop?.opacity === undefined || stop?.opacity === null
        ? 100
        : Number(stop.opacity),
  }));
}

export function parseGradientInputValue(
  raw: string | undefined | null,
): GradientValue {
  const fallback: GradientValue = {
    type: "gradient",
    gradient: {
      ...DEFAULT_GRADIENT_VALUE.gradient,
      stops: DEFAULT_GRADIENT_VALUE.gradient.stops.map((s) => ({ ...s })),
    },
  };
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const gradient =
      parsed?.type === "gradient" && parsed.gradient
        ? parsed.gradient
        : parsed?.gradient
          ? parsed.gradient
          : parsed;
    if (!gradient || typeof gradient !== "object") return fallback;
    return {
      type: "gradient",
      gradient: {
        ...fallback.gradient,
        ...gradient,
        type: normalizeType(gradient.type),
        stops: normalizeStops(gradient.stops),
      },
    };
  } catch {
    return fallback;
  }
}

/** UI label value → JSON gradient.type */
export function uiTypeToGradientType(ui: string): GradientType {
  const v = ui.toLowerCase();
  if (v === "radial") return "radial";
  if (v === "conic" || v === "angular") return "angular";
  return "linear";
}

/** JSON gradient.type → UI label */
export function gradientTypeToUi(type: GradientType | string): string {
  const t = normalizeType(type);
  if (t === "radial") return "Radial";
  if (t === "angular") return "Conic";
  return "Linear";
}

export function withGradientType(
  valueAttr: string | undefined | null,
  nextType: GradientType | string,
): string {
  const current = parseGradientInputValue(valueAttr);
  const type = normalizeType(nextType);
  const gradient: GradientConfig = {
    ...current.gradient,
    type,
    stops: current.gradient.stops.map((s) => ({ ...s })),
  };

  if (type === "radial") {
    gradient.centerX =
      typeof gradient.centerX === "number" ? gradient.centerX : 50;
    gradient.centerY =
      typeof gradient.centerY === "number" ? gradient.centerY : 50;
  } else {
    gradient.angle = typeof gradient.angle === "number" ? gradient.angle : 90;
  }

  return JSON.stringify({ type: "gradient", gradient });
}

function interpolationClause(gradient: GradientConfig): string {
  const space = String(gradient.interpolationSpace ?? "srgb").toLowerCase();
  if (!space || space === "srgb") return "";
  if (space === "oklch" || space === "hsl") {
    const hue = String(gradient.hueInterpolation ?? "shorter").toLowerCase();
    const method = ["shorter", "longer", "increasing", "decreasing"].includes(hue)
      ? hue
      : "shorter";
    return ` in ${space} ${method} hue`;
  }
  return ` in ${space}`;
}

function stopCss(stop: GradientStop): string {
  const alpha = (stop.opacity ?? 100) / 100;
  if (alpha >= 1) return `${stop.color} ${stop.position}%`;
  const { r, g, b } = hexToRgb(stop.color);
  return `rgba(${r}, ${g}, ${b}, ${alpha}) ${stop.position}%`;
}

/** Build true CSS gradient (not edit-track L→R). */
export function gradientValueToCss(
  value: string | GradientValue | undefined | null,
): string {
  const parsed =
    typeof value === "string" || value == null
      ? parseGradientInputValue(value)
      : value;
  const gradient = parsed.gradient;
  const sorted = [...gradient.stops].sort((a, b) => a.position - b.position);
  const stops = sorted.map(stopCss).join(", ");
  const interp = interpolationClause(gradient);

  if (gradient.type === "radial") {
    const cx = typeof gradient.centerX === "number" ? gradient.centerX : 50;
    const cy = typeof gradient.centerY === "number" ? gradient.centerY : 50;
    return `radial-gradient(circle at ${cx}% ${cy}%${interp}, ${stops})`;
  }
  if (gradient.type === "angular") {
    const angle = typeof gradient.angle === "number" ? gradient.angle : 0;
    return `conic-gradient(from ${angle}deg${interp}, ${stops})`;
  }
  const angle = typeof gradient.angle === "number" ? gradient.angle : 90;
  return `linear-gradient(${angle}deg${interp}, ${stops})`;
}

/** Update preview swatch background in example markup HTML string. */
export function withGradientPreviewBackground(
  markup: string,
  cssBackground: string,
): string {
  if (!markup.includes("gradient-result-preview")) return markup;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${markup}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return markup;
  const preview = root.querySelector(".gradient-result-preview");
  if (!preview) return markup;
  preview.setAttribute("background", cssBackground);
  return root.innerHTML;
}
