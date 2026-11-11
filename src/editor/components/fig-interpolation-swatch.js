/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
import {
  HTMLElement,
  CustomEvent,
  figEditorDefineElement,
  figEditorGetOverlayRoot,
  figEditorEscapeAttribute,
  figEditorBooleanAttribute,
  figEditorUniqueId,
  figEditorCssUrl,
  figEditorLooksLikeVideoUrl,
  figEditorCreateIcon,
  figEditorAppendChildren,
  figEditorSetAttributes,
  figEditorCreateElement,
  FIG_EDITOR_SVG_NAMESPACE,
  figEditorCreateSvgElement,
  figEditorCreateOverflowButtons,
  figEditorSyncOverflowState,
  figEditorScrollOverflowPage,
  figEditorScrollElementToCenter,
} from "../runtime/helpers.js";
import {
  figHexToRGB as figEditorHexToRgb,
  figOklabToOklch as figEditorOklabToOklch,
  figRGBToHsl as figEditorRgbToHsl,
  figRGBToOklab as figEditorRgbToOklab,
} from "../../../fig-color.js";
/**
 * Compact swatch previewing gradient color-space interpolation.
 * Polar: CSS conic-gradient masked (SVG data-URL, round linecaps) to an arc.
 * Non-polar: CSS linear-gradient masked to a horizontal round-capped stroke.
 * Accepts the same `value` shape as fig-input-gradient / fig-fill-picker.
 *
 * @element fig-interpolation-swatch
 * @attr {string} value - JSON `{ type: "gradient", gradient: { … } }` (or a bare gradient object)
 * @attr {string} size - `small` (default, 24px) or `large` (32px)
 */
class FigInterpolationSwatch extends HTMLElement {
  static #HUE_SPACES = new Set(["oklch", "hsl"]);
  static #CX = 10;
  static #CY = 10;
  static #R = 8;
  static #STROKE = 3;
  // Polar endpoints ≈ 10 o'clock → 2 o'clock (SVG deg: 0 = east, CW).
  // CSS conic `from` is 0 = north; convert with +90.
  static #START_DEG = 210;
  static #DEFAULT_GRADIENT = {
    type: "linear",
    angle: 135,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    stops: [
      { color: "#FF0000", position: 0, opacity: 100 },
      { color: "#4F9EFF", position: 100, opacity: 100 },
    ],
  };

  #rendered = false;
  #svgEl = null;
  #fillEl = null;
  #gradient = { ...FigInterpolationSwatch.#DEFAULT_GRADIENT };

  static get observedAttributes() {
    return ["value"];
  }

  get value() {
    return {
      type: "gradient",
      gradient: { ...this.#gradient },
    };
  }

  set value(val) {
    if (val == null || val === "") {
      this.removeAttribute("value");
      return;
    }
    if (typeof val === "string") {
      this.setAttribute("value", val);
      return;
    }
    this.setAttribute("value", JSON.stringify(val));
  }

  connectedCallback() {
    this.#ensureA11y();
    this.#parseValue();
    this.#render();
    this.#updatePreview();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name !== "value") return;
    this.#parseValue();
    if (this.#rendered) this.#updatePreview();
  }

  #ensureA11y() {
    const named =
      this.hasAttribute("aria-label") || this.hasAttribute("aria-labelledby");
    if (!named && !this.hasAttribute("aria-hidden")) {
      this.setAttribute("aria-hidden", "true");
    }
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) {
      this.#gradient = {
        ...FigInterpolationSwatch.#DEFAULT_GRADIENT,
        stops: FigInterpolationSwatch.#DEFAULT_GRADIENT.stops.map((s) => ({
          ...s,
        })),
      };
      return;
    }
    try {
      const parsed = JSON.parse(valueAttr);
      const gradient = parsed?.type === "gradient" && parsed.gradient
        ? parsed.gradient
        : parsed?.gradient
          ? parsed.gradient
          : parsed;
      if (!gradient || typeof gradient !== "object") return;
      this.#gradient = this.#normalizeGradient({
        ...FigInterpolationSwatch.#DEFAULT_GRADIENT,
        ...gradient,
      });
    } catch {
      // Keep current/default gradient on invalid JSON.
    }
  }

  #normalizeGradient(gradient) {
    const next = { ...(gradient ?? {}) };
    const interpolationSpace = String(
      next.interpolationSpace ?? "srgb",
    ).toLowerCase();
    const hueInterpolation = String(
      next.hueInterpolation ?? "shorter",
    ).toLowerCase();
    const stops = Array.isArray(next.stops)
      ? next.stops.map((stop) => ({
          color: String(stop?.color || "#D9D9D9").replace(
            /^(#(?:[0-9a-f]{6})).*/i,
            "$1",
          ),
          position: stop?.position ?? 0,
          opacity: stop?.opacity ?? 100,
        }))
      : FigInterpolationSwatch.#DEFAULT_GRADIENT.stops.map((s) => ({ ...s }));
    if (stops.length < 2) {
      return {
        ...FigInterpolationSwatch.#DEFAULT_GRADIENT,
        stops: FigInterpolationSwatch.#DEFAULT_GRADIENT.stops.map((s) => ({
          ...s,
        })),
      };
    }
    return {
      type: ["linear", "radial", "angular"].includes(next.type)
        ? next.type
        : "linear",
      angle: Number.isFinite(Number(next.angle)) ? Number(next.angle) : 135,
      interpolationSpace,
      hueInterpolation,
      stops,
    };
  }

  #isPolar() {
    return FigInterpolationSwatch.#HUE_SPACES.has(
      this.#gradient.interpolationSpace || "srgb",
    );
  }

  #hueForColor(color) {
    const { r, g, b } = figEditorHexToRgb(color);
    if (this.#gradient.interpolationSpace === "hsl") {
      return figEditorRgbToHsl(r, g, b).h;
    }
    const lab = figEditorRgbToOklab(r, g, b);
    const hue = figEditorOklabToOklch(lab.l, lab.a, lab.b).h;
    return ((hue % 360) + 360) % 360;
  }

  #polarArcGeometry() {
    const stops = this.#sortedStops();
    const startHue = this.#hueForColor(stops[0]?.color || "#FF0000");
    const endHue = this.#hueForColor(
      stops[stops.length - 1]?.color || "#4F9EFF",
    );
    const startDeg = FigInterpolationSwatch.#START_DEG - startHue;
    const endDeg = FigInterpolationSwatch.#START_DEG - endHue;
    const clockwiseSweep = ((endDeg - startDeg) % 360 + 360) % 360;
    const counterclockwiseSweep =
      clockwiseSweep === 0 ? 0 : clockwiseSweep - 360;
    const method = this.#gradient.hueInterpolation || "shorter";

    let sweepDeg;
    if (method === "increasing") {
      sweepDeg = counterclockwiseSweep;
    } else if (method === "decreasing") {
      sweepDeg = clockwiseSweep;
    } else if (method === "longer") {
      sweepDeg =
        clockwiseSweep < 180 ? counterclockwiseSweep : clockwiseSweep;
    } else {
      sweepDeg =
        clockwiseSweep <= 180 ? clockwiseSweep : counterclockwiseSweep;
    }

    // A round cap extends beyond the path endpoint. Inset the centerline so
    // the visible cap edges, rather than their centers, land on the hues.
    const direction = Math.sign(sweepDeg);
    const capAngle =
      (Math.asin(FigInterpolationSwatch.#STROKE / 2 / FigInterpolationSwatch.#R) *
        180) /
      Math.PI;
    const inset = Math.min(
      capAngle,
      Math.max(0, (Math.abs(sweepDeg) - 0.01) / 2),
    );
    return {
      startDeg: startDeg + direction * inset,
      sweepDeg: sweepDeg - direction * inset * 2,
    };
  }

  #pointOnCircle(deg) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: FigInterpolationSwatch.#CX + FigInterpolationSwatch.#R * Math.cos(rad),
      y: FigInterpolationSwatch.#CY + FigInterpolationSwatch.#R * Math.sin(rad),
    };
  }

  #arcMaskPath(startDeg, sweepDeg) {
    const endDeg = startDeg + sweepDeg;
    const start = this.#pointOnCircle(startDeg);
    const end = this.#pointOnCircle(endDeg);
    const largeArc = Math.abs(sweepDeg) > 180 ? 1 : 0;
    const sweepFlag = sweepDeg >= 0 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${FigInterpolationSwatch.#R} ${FigInterpolationSwatch.#R} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
  }

  #lineMaskPath() {
    const start = this.#pointOnCircle(180);
    const end = this.#pointOnCircle(0);
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  #maskImageForPath(d) {
    const stroke = FigInterpolationSwatch.#STROKE;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">` +
      `<path d="${d}" fill="none" stroke="white" stroke-width="${stroke}" ` +
      `stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  #sortedStops() {
    return [...this.#gradient.stops].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
  }

  #cssInterpolationClause() {
    const space = this.#gradient.interpolationSpace || "srgb";
    if (space === "srgb") return "";
    if (FigInterpolationSwatch.#HUE_SPACES.has(space)) {
      return ` in ${space} ${this.#gradient.hueInterpolation || "shorter"} hue`;
    }
    return ` in ${space}`;
  }

  #previewBackground() {
    const stops = this.#sortedStops();
    const clause = this.#cssInterpolationClause();
    if (this.#isPolar()) {
      // Fixed hue wheel. The mask maps gradient endpoint hues onto this wheel.
      const cssFrom = (FigInterpolationSwatch.#START_DEG + 90) % 360;
      const space = this.#gradient.interpolationSpace;
      const wheelColor = (hue) =>
        space === "oklch"
          ? `oklch(65% 0.25 ${hue})`
          : `hsl(${hue} 100% 50%)`;
      const wheelStops = [0, 300, 240, 180, 120, 60, 0]
        .map(wheelColor)
        .join(", ");
      return `conic-gradient(from ${cssFrom}deg in ${space} decreasing hue, ${wheelStops})`;
    }
    const stopList = stops
      .map((s) => `${s.color} ${s.position ?? 0}%`)
      .join(", ");
    return `linear-gradient(90deg${clause}, ${stopList})`;
  }

  #render() {
    if (this.#rendered) return;
    const stroke = FigInterpolationSwatch.#STROKE;
    const svg = figEditorCreateSvgElement(
      "svg",
      {
        className: "fig-interpolation-swatch-svg",
        width: "20",
        height: "20",
        viewBox: "0 0 20 20",
        fill: "none",
        "aria-hidden": "true",
      },
      figEditorCreateSvgElement("circle", {
        className: "fig-interpolation-swatch-rim",
        cx: "10",
        cy: "10",
        r: "8",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": stroke,
      }),
    );
    const fill = figEditorCreateElement("div", {
      className: "fig-interpolation-swatch-fill",
      "aria-hidden": "true",
    });
    this.replaceChildren(svg, fill);
    this.#svgEl = svg;
    this.#fillEl = fill;
    this.#rendered = true;
  }

  #updatePreview() {
    if (!this.#fillEl) return;

    const polar = this.#isPolar();
    if (this.#svgEl) this.#svgEl.style.display = polar ? "" : "none";

    const d = polar
      ? (() => {
          const { startDeg, sweepDeg } = this.#polarArcGeometry();
          return this.#arcMaskPath(startDeg, sweepDeg);
        })()
      : this.#lineMaskPath();
    const mask = this.#maskImageForPath(d);
    this.#fillEl.style.setProperty("-webkit-mask-image", mask);
    this.#fillEl.style.maskImage = mask;
    this.#fillEl.style.background = this.#previewBackground();
  }
}
figEditorDefineElement("fig-interpolation-swatch", FigInterpolationSwatch);

export { FigInterpolationSwatch };
