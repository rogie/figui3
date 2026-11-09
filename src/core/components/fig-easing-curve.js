/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figCreateElement,
  figCreateSvgElement,
  figDefineElement,
  figGetOverlayRoot,
  figSyncCssVar,
  figUniqueId,
} from "../runtime/index.js";

/**
 * A bezier / spring easing curve editor with draggable control points.
 * @attr {string} value - Bezier/spring shorthand or a serialized easing object
 * @attr {string} mode - Optional editor constraint: "bezier" or "spring".
 * @attr {number} precision - Decimal places for output values (default 2)
 * @attr {boolean} edit - Show the editor and custom preset options (default true; set "false" for presets only)
 * @attr {boolean} presets - Show the preset selector (default true)
 * @attr {boolean} text - Show the manual value input (default true)
 * @property {object|null} spring - Structured spring configuration when in spring mode
 */
class FigEasingCurve extends HTMLElement {
  #cp1 = { x: 0.42, y: 0 };
  #cp2 = { x: 0.58, y: 1 };
  #spring = { stiffness: 200, damping: 15, mass: 1, initialVelocity: 0 };
  #mode = "bezier";
  #precision = 2;
  #isDragging = null;
  #dragAbortController = null;
  #svg = null;
  #curve = null;
  #line1 = null;
  #line2 = null;
  #handle1 = null;
  #handle2 = null;
  #select = null;
  #valueInput = null;
  #presetName = null;
  #targetLine = null;
  #springDuration = 0.8;
  #drawWidth = 200;
  #drawHeight = 200;
  #bounds = null;
  #boundaryTop = null;
  #boundaryBottom = null;
  #resizeObserver = null;
  #bezierHandleRadius = 5;
  #durationBarWidth = 10;
  #durationBarHeight = 10;
  #durationBarRadius = 3;
  #pickerDefinitionPromise = null;
  #pickerPopup = null;
  #pickerPopupAnchor = null;
  #pickerPopupAnchorResizeObserver = null;
  #boundPickerLifecycle = (event) => {
    if (event.target !== this.#pickerPopup) return;
    if (event.detail?.state === "closed") {
      this.#pickerPopupAnchorResizeObserver?.disconnect();
    }
  };

  static PRESETS = [
    { group: null, name: "Linear", type: "bezier", value: [0, 0, 1, 1] },
    {
      group: "Bezier",
      name: "Ease in",
      type: "bezier",
      value: [0.42, 0, 1, 1],
    },
    {
      group: "Bezier",
      name: "Ease out",
      type: "bezier",
      value: [0, 0, 0.58, 1],
    },
    {
      group: "Bezier",
      name: "Ease in and out",
      type: "bezier",
      value: [0.42, 0, 0.58, 1],
    },
    {
      group: "Bezier",
      name: "Ease in back",
      type: "bezier",
      value: [0.6, -0.28, 0.735, 0.045],
    },
    {
      group: "Bezier",
      name: "Ease out back",
      type: "bezier",
      value: [0.175, 0.885, 0.32, 1.275],
    },
    {
      group: "Bezier",
      name: "Ease in and out back",
      type: "bezier",
      value: [0.68, -0.55, 0.265, 1.55],
    },
    { group: "Bezier", name: "Custom bezier", type: "bezier", value: null },
    {
      group: "Spring",
      name: "Gentle",
      type: "spring",
      spring: { stiffness: 120, damping: 14, mass: 1 },
    },
    {
      group: "Spring",
      name: "Quick",
      type: "spring",
      spring: { stiffness: 380, damping: 20, mass: 1 },
    },
    {
      group: "Spring",
      name: "Bouncy",
      type: "spring",
      spring: { stiffness: 250, damping: 8, mass: 1 },
    },
    {
      group: "Spring",
      name: "Slow",
      type: "spring",
      spring: { stiffness: 60, damping: 11, mass: 1 },
    },
    { group: "Spring", name: "Custom spring", type: "spring", spring: null },
  ];

  static get observedAttributes() {
    return [
      "value",
      "default",
      "mode",
      "precision",
      "aspect-ratio",
      "edit",
      "presets",
      "text",
    ];
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "2");
    figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
    const constrainedMode = this.#constrainedMode();
    if (constrainedMode) this.#mode = constrainedMode;
    const val = this.getAttribute("value");
    if (val) this.#parseValue(val);
    this.#applyModeConstraint();
    this.#presetName = this.#matchPreset();
    this.#render();
    this.#setupResizeObserver();
  }

  disconnectedCallback() {
    this.#finishDrag(false);
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
      this.#resizeObserver = null;
    }
    this.#destroyPickerPopup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      if (this.#svg) {
        this.#syncViewportSize();
        this.#updatePaths();
      }
      return;
    }

    if (name === "edit" || name === "presets" || name === "text") {
      if (name === "edit" && newValue !== "false") {
        this.#destroyPickerPopup();
      }
      if (this.isConnected) this.#render();
      return;
    }

    if (name === "mode") {
      this.#applyModeConstraint();
      const value = this.getAttribute("value");
      if (value) this.#parseValue(value);
      this.#applyModeConstraint();
      this.#presetName = this.#matchPreset();
      if (this.isConnected) this.#render();
      this.#syncPickerPopup();
      return;
    }

    if (name === "value" && newValue) {
      const prevMode = this.#mode;
      this.#parseValue(newValue);
      this.#presetName = this.#matchPreset();
      if (prevMode !== this.#mode && this.#isEditEnabled()) {
        this.#render();
      } else {
        if (this.#svg) this.#updatePaths();
        this.#syncSelect();
        this.#syncValueInput();
      }
    }
    if (name === "precision") {
      this.#precision = parseInt(newValue || "2");
    }
    if (name === "value" || name === "mode" || name === "precision") {
      this.#syncPickerPopup();
    }
  }

  get value() {
    if (this.#mode === "spring") {
      const { stiffness, damping, mass, initialVelocity = 0 } = this.#spring;
      const velocity = initialVelocity ? `, ${initialVelocity}` : "";
      return `spring(${stiffness}, ${damping}, ${mass}${velocity})`;
    }
    const p = this.#precision;
    return `${this.#cp1.x.toFixed(p)}, ${this.#cp1.y.toFixed(p)}, ${this.#cp2.x.toFixed(p)}, ${this.#cp2.y.toFixed(p)}`;
  }

  get cssValue() {
    if (this.#mode === "spring") {
      const points = this.#simulateSpring();
      const samples = 20;
      const step = Math.max(1, Math.floor(points.length / samples));
      const vals = [];
      for (let i = 0; i < points.length; i += step) {
        vals.push(points[i].value.toFixed(3));
      }
      if (points.length > 0)
        vals.push(points[points.length - 1].value.toFixed(3));
      return `linear(${vals.join(", ")})`;
    }
    const p = this.#precision;
    return `cubic-bezier(${this.#cp1.x.toFixed(p)}, ${this.#cp1.y.toFixed(p)}, ${this.#cp2.x.toFixed(p)}, ${this.#cp2.y.toFixed(p)})`;
  }

  get preset() {
    return this.#presetName;
  }

  set value(v) {
    if (v && typeof v === "object") {
      const normalized = this.#normalizeStructuredValue(v);
      if (!normalized) {
        throw new TypeError("Invalid easing value or mode/type mismatch");
      }
      const serialized =
        normalized.type === "spring"
          ? { type: "spring", ...normalized.spring }
          : {
              type: "bezier",
              x1: normalized.bezier[0],
              y1: normalized.bezier[1],
              x2: normalized.bezier[2],
              y2: normalized.bezier[3],
            };
      this.setAttribute("value", JSON.stringify(serialized));
      return;
    }
    this.setAttribute("value", v);
  }

  #normalizedDefault() {
    const fallback =
      this.#constrainedMode() === "spring"
        ? {
            type: "spring",
            spring: {
              stiffness: 200,
              damping: 15,
              mass: 1,
              initialVelocity: 0,
            },
          }
        : { type: "bezier", bezier: [0.42, 0, 0.58, 1] };
    const raw = this.getAttribute("default");
    if (!raw?.trim()) return fallback;
    const text = raw.trim();
    if (text.startsWith("{")) {
      try {
        return this.#normalizeStructuredValue(JSON.parse(text)) || fallback;
      } catch {
        return fallback;
      }
    }
    const spring = this.#parseSpringString(text);
    if (spring && this.#constrainedMode() !== "bezier") {
      return { type: "spring", spring };
    }
    const bezier = text.split(",").map((part) => Number(part.trim()));
    if (
      bezier.length === 4 &&
      bezier.every(Number.isFinite) &&
      bezier[0] >= 0 &&
      bezier[0] <= 1 &&
      bezier[2] >= 0 &&
      bezier[2] <= 1 &&
      this.#constrainedMode() !== "spring"
    ) {
      return { type: "bezier", bezier };
    }
    return fallback;
  }

  get default() {
    const normalized = this.#normalizedDefault();
    if (normalized.type === "spring") {
      const { stiffness, damping, mass, initialVelocity = 0 } =
        normalized.spring;
      const velocity = initialVelocity ? `, ${initialVelocity}` : "";
      return `spring(${stiffness}, ${damping}, ${mass}${velocity})`;
    }
    return normalized.bezier
      .map((part) => Number(part).toFixed(this.#precision))
      .join(", ");
  }

  set default(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("default");
    } else if (typeof value === "object") {
      this.setAttribute("default", JSON.stringify(value));
    } else {
      this.setAttribute("default", String(value));
    }
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    return this.value === this.default;
  }

  resetToDefault() {
    if (figBooleanAttribute(this, "disabled") || this.isDefault) return;
    this.value = this.default;
    this.#emit("input");
    this.#emit("change");
  }

  get spring() {
    if (this.#mode !== "spring") return null;
    return { ...this.#spring, initialVelocity: this.#spring.initialVelocity ?? 0 };
  }

  set spring(value) {
    if (!value || typeof value !== "object") {
      throw new TypeError("spring must be an object");
    }
    this.value = { ...value, type: "spring" };
  }

  focus(options) {
    const target =
      this.#select ||
      this.#valueInput ||
      this.querySelector("fig-handle:not([disabled])");
    if (target) {
      target.focus(options);
      return;
    }
    HTMLElement.prototype.focus.call(this, options);
  }

  activate(options) {
    if (!this.#isEditEnabled()) {
      this.focus(options);
      this.#openPickerPopup();
      return;
    }
    const target =
      this.#select ||
      this.#valueInput ||
      this.querySelector("fig-handle:not([disabled])");
    if (!target) return;
    if (typeof target.activate === "function") {
      target.activate(options);
      return;
    }
    target.focus(options);
    target.click();
  }

  #constrainedMode() {
    const mode = this.getAttribute("mode")?.trim().toLowerCase();
    return mode === "bezier" || mode === "spring" ? mode : null;
  }

  #applyModeConstraint() {
    const mode = this.#constrainedMode();
    if (mode) this.#mode = mode;
  }

  #allowsPreset(preset) {
    const mode = this.#constrainedMode();
    return !mode || preset.type === mode;
  }

  #normalizeStructuredValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const constrainedMode = this.#constrainedMode();
    const declaredType =
      typeof value.type === "string" ? value.type.trim().toLowerCase() : null;
    if (declaredType && declaredType !== "bezier" && declaredType !== "spring") {
      return null;
    }
    if (declaredType && constrainedMode && declaredType !== constrainedMode) {
      return null;
    }
    const type = declaredType || constrainedMode;
    if (!type) return null;

    if (type === "spring") {
      const spring = {
        mass: Number(value.mass),
        stiffness: Number(value.stiffness),
        damping: Number(value.damping),
        initialVelocity:
          value.initialVelocity === undefined
            ? 0
            : Number(value.initialVelocity),
      };
      if (
        !Number.isFinite(spring.mass) ||
        spring.mass <= 0 ||
        !Number.isFinite(spring.stiffness) ||
        spring.stiffness <= 0 ||
        !Number.isFinite(spring.damping) ||
        spring.damping < 0 ||
        !Number.isFinite(spring.initialVelocity)
      ) {
        return null;
      }
      return { type, spring };
    }

    const bezier = [value.x1, value.y1, value.x2, value.y2].map(Number);
    if (
      bezier.some((part) => !Number.isFinite(part)) ||
      bezier[0] < 0 ||
      bezier[0] > 1 ||
      bezier[2] < 0 ||
      bezier[2] > 1
    ) {
      return null;
    }
    return { type, bezier };
  }

  #applyStructuredValue(value) {
    if (value.type === "spring") {
      this.#mode = "spring";
      this.#spring = { ...value.spring };
    } else {
      this.#mode = "bezier";
      [this.#cp1.x, this.#cp1.y, this.#cp2.x, this.#cp2.y] = value.bezier;
    }
  }

  #parseSpringString(str) {
    const match = str.match(/^spring\(\s*(.*?)\s*\)$/i);
    if (!match) return null;
    const parts = match[1].split(",").map((part) => Number(part.trim()));
    if (
      (parts.length !== 3 && parts.length !== 4) ||
      parts.some((part) => !Number.isFinite(part))
    ) {
      return null;
    }
    const spring = {
      stiffness: parts[0],
      damping: parts[1],
      mass: parts[2],
      initialVelocity: parts[3] ?? 0,
    };
    if (
      spring.stiffness <= 0 ||
      spring.damping < 0 ||
      spring.mass <= 0
    ) {
      return null;
    }
    return spring;
  }

  #parseValue(input) {
    if (input && typeof input === "object") {
      const normalized = this.#normalizeStructuredValue(input);
      if (!normalized) return false;
      this.#applyStructuredValue(normalized);
      return true;
    }
    if (typeof input !== "string") return false;
    const str = input.trim();
    if (str.startsWith("{")) {
      try {
        return this.#parseValue(JSON.parse(str));
      } catch {
        return false;
      }
    }

    const spring = this.#parseSpringString(str);
    if (spring && this.#constrainedMode() !== "bezier") {
      this.#mode = "spring";
      this.#spring = spring;
      return true;
    }
    const parts = str.split(",").map((s) => parseFloat(s.trim()));
    if (
      parts.length >= 4 &&
      parts.every((n) => !isNaN(n)) &&
      this.#constrainedMode() !== "spring"
    ) {
      this.#mode = "bezier";
      this.#cp1.x = parts[0];
      this.#cp1.y = parts[1];
      this.#cp2.x = parts[2];
      this.#cp2.y = parts[3];
      return true;
    }
    return false;
  }

  #matchPreset() {
    const ep = 0.001;
    if (this.#mode === "bezier") {
      for (const p of FigEasingCurve.PRESETS) {
        if (p.type !== "bezier" || !p.value) continue;
        if (
          Math.abs(this.#cp1.x - p.value[0]) < ep &&
          Math.abs(this.#cp1.y - p.value[1]) < ep &&
          Math.abs(this.#cp2.x - p.value[2]) < ep &&
          Math.abs(this.#cp2.y - p.value[3]) < ep
        )
          return p.name;
      }
      return "Custom bezier";
    }
    for (const p of FigEasingCurve.PRESETS) {
      if (p.type !== "spring" || !p.spring) continue;
      if (
        Math.abs(this.#spring.stiffness - p.spring.stiffness) < ep &&
        Math.abs(this.#spring.damping - p.spring.damping) < ep &&
        Math.abs(this.#spring.mass - p.spring.mass) < ep &&
        Math.abs(this.#spring.initialVelocity ?? 0) < ep
      )
        return p.name;
    }
    return "Custom spring";
  }

  // --- Spring simulation ---

  #simulateSpring() {
    const { stiffness, damping, mass, initialVelocity = 0 } = this.#spring;
    const dt = 0.004;
    const maxTime = 5;
    const points = [];
    let pos = 0,
      vel = initialVelocity;
    for (let t = 0; t <= maxTime; t += dt) {
      const force = -stiffness * (pos - 1) - damping * vel;
      vel += (force / mass) * dt;
      pos += vel * dt;
      points.push({ t, value: pos });
      if (t > 0.1 && Math.abs(pos - 1) < 0.0005 && Math.abs(vel) < 0.0005)
        break;
    }
    return points;
  }

  static #springIcon(spring, size = 24) {
    const { stiffness, damping, mass, initialVelocity = 0 } = spring;
    const dt = 0.004;
    const maxTime = 5;
    const pts = [];
    let pos = 0,
      vel = initialVelocity;
    for (let t = 0; t <= maxTime; t += dt) {
      const force = -stiffness * (pos - 1) - damping * vel;
      vel += (force / mass) * dt;
      pos += vel * dt;
      pts.push({ t, value: pos });
      if (t > 0.1 && Math.abs(pos - 1) < 0.001 && Math.abs(vel) < 0.001) break;
    }
    const totalTime = pts[pts.length - 1].t || 1;
    let maxVal = 1;
    for (const p of pts) if (p.value > maxVal) maxVal = p.value;
    let minVal = 0;
    for (const p of pts) if (p.value < minVal) minVal = p.value;
    const range = Math.max(maxVal - minVal, 1);
    const pad = 6;
    const s = size - pad * 2;
    const step = Math.max(1, Math.floor(pts.length / 30));
    let d = "";
    for (let i = 0; i < pts.length; i += step) {
      const x = pad + (pts[i].t / totalTime) * s;
      const y = pad + (1 - (pts[i].value - minVal) / range) * s;
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return FigEasingCurve.#createSvgIcon(
      d,
      size,
      FigEasingCurve.#createIconGrid(size),
    );
  }

  static #curveIconPath(cp1x, cp1y, cp2x, cp2y, size = 24) {
    const draw = 11;
    const pad = (size - draw) / 2;
    const samples = 48;
    const points = [];

    const cubic = (p0, p1, p2, p3, t) => {
      const mt = 1 - t;
      return (
        mt * mt * mt * p0 +
        3 * mt * mt * t * p1 +
        3 * mt * t * t * p2 +
        t * t * t * p3
      );
    };

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      points.push({
        x: cubic(0, cp1x, cp2x, 1, t),
        y: cubic(0, cp1y, cp2y, 1, t),
      });
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = Math.max(maxX - minX, 1e-6);
    const rangeY = Math.max(maxY - minY, 1e-6);
    const toX = (x) => pad + ((x - minX) / rangeX) * draw;
    const toY = (y) => pad + (1 - (y - minY) / rangeY) * draw;

    let d = "";
    for (let i = 0; i < points.length; i++) {
      const px = toX(points[i].x);
      const py = toY(points[i].y);
      d += `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    }
    return d;
  }

  static #iconGridPoints(size = 24) {
    const draw = 11;
    const start = (size - draw) / 2;
    const gap = draw / 3;
    return Array.from({ length: 16 }, (_, index) => ({
      x: start + (index % 4) * gap,
      y: start + Math.floor(index / 4) * gap,
    }));
  }

  static #createIconGrid(size = 24) {
    return FigEasingCurve.#iconGridPoints(size).map(({ x, y }) =>
      figCreateSvgElement("circle", {
        cx: x,
        cy: y,
        r: 0.5,
        fill: "var(--figma-color-icon-tertiary)",
      }),
    );
  }

  static #createSvgIcon(d, size = 24, decorations = []) {
    return figCreateSvgElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: `0 0 ${size} ${size}`,
        fill: "none",
      },
      [
        ...decorations,
        figCreateSvgElement("path", {
          d,
          stroke: "currentColor",
          "stroke-width": "1",
          "stroke-linecap": "round",
          fill: "none",
        }),
      ],
    );
  }

  static #createCurveIcon(cp1x, cp1y, cp2x, cp2y, size = 24) {
    return FigEasingCurve.#createSvgIcon(
      FigEasingCurve.#curveIconPath(cp1x, cp1y, cp2x, cp2y, size),
      size,
      FigEasingCurve.#createIconGrid(size),
    );
  }

  static curveIcon(cp1x, cp1y, cp2x, cp2y, size = 24) {
    const d = FigEasingCurve.#curveIconPath(
      cp1x,
      cp1y,
      cp2x,
      cp2y,
      size,
    );
    const grid = FigEasingCurve.#iconGridPoints(size)
      .map(
        ({ x, y }) =>
          `<circle cx="${x}" cy="${y}" r="0.5" fill="var(--figma-color-icon-tertiary)"></circle>`,
      )
      .join("");
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">${grid}<path d="${d}" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`;
  }

  // --- Rendering ---

  #isEditEnabled() {
    return this.getAttribute("edit") !== "false";
  }

  #isPresetsEnabled() {
    return this.getAttribute("presets") !== "false";
  }

  #isTextEnabled() {
    return this.getAttribute("text") !== "false";
  }

  #render() {
    this.#finishDrag(false);
    this.classList.toggle("spring-mode", this.#mode === "spring");
    this.classList.toggle("bezier-mode", this.#mode !== "spring");
    this.#syncMetricsFromCSS();
    this.replaceChildren(...this.#createContent());
    this.#cacheRefs();
    if (this.#svg) {
      this.#syncHandleSizes();
      this.#syncViewportSize();
      this.#updatePaths();
    }
    this.#syncValueInput();
    this.#setupEvents();
  }

  #canUseFigSelect() {
    return ["fig-select", "fig-select-options", "fig-select-option"].every(
      (tag) => {
        const Constructor = customElements.get(tag);
        return (
          typeof Constructor === "function" &&
          Constructor.prototype instanceof HTMLElement
        );
      },
    );
  }

  #createDropdown() {
    const dropdown = figCreateElement("fig-dropdown", {
      className: "fig-easing-curve-select",
      label: "Easing preset",
      value: this.#presetName,
      full: true,
    });
    let currentGroup = undefined;
    let parent = dropdown;
    for (const preset of FigEasingCurve.PRESETS) {
      if (!this.#allowsPreset(preset)) continue;
      if (
        !this.#isEditEnabled() &&
        !customElements.get("fig-popup-easing") &&
        !preset.value &&
        !preset.spring
      ) {
        continue;
      }
      if (preset.group !== currentGroup) {
        currentGroup = preset.group;
        parent = currentGroup
          ? figCreateElement("optgroup", { label: currentGroup })
          : dropdown;
        if (parent !== dropdown) dropdown.appendChild(parent);
      }
      parent.appendChild(
        figCreateElement("option", { value: preset.name }, preset.name),
      );
    }
    return dropdown;
  }

  #createSelect() {
    if (!this.#canUseFigSelect()) return this.#createDropdown();

    const options = document.createElement("fig-select-options");
    let currentGroup = undefined;
    for (const p of FigEasingCurve.PRESETS) {
      if (!this.#allowsPreset(p)) continue;
      if (
        !this.#isEditEnabled() &&
        !customElements.get("fig-popup-easing") &&
        !p.value &&
        !p.spring
      ) {
        continue;
      }
      if (p.group !== currentGroup) {
        if (p.group) {
          options.appendChild(
            figCreateElement("fig-separator", { label: p.group }),
          );
        }
        currentGroup = p.group;
      }
      let icon;
      if (p.type === "spring") {
        const sp = p.spring || this.#spring;
        icon = FigEasingCurve.#springIcon(sp);
      } else {
        const v = p.value || [
          this.#cp1.x,
          this.#cp1.y,
          this.#cp2.x,
          this.#cp2.y,
        ];
        icon = FigEasingCurve.#createCurveIcon(...v);
      }
      options.appendChild(
        figCreateElement(
          "fig-select-option",
          {
            value: p.name,
            label: p.name,
          },
          [
            figCreateElement("fig-icon", { slot: "prepend" }, icon),
            figCreateElement("span", {}, p.name),
          ],
        ),
      );
    }
    return figCreateElement(
      "fig-select",
      {
        className: "fig-easing-curve-select",
        label: "Easing preset",
        value: this.#presetName,
        full: true,
      },
      options,
    );
  }

  #createHandle(className, dataHandle, label) {
    const handle = figCreateElement("fig-handle", {
      size: "small",
      type: "minimal",
      "aria-label": label,
    });
    return figCreateSvgElement(
      "foreignObject",
      {
        className,
        "data-handle": dataHandle,
        width: "20",
        height: "20",
      },
      figCreateElement(
        "fig-tooltip",
        { text: this.#handleTooltipText(dataHandle) },
        handle,
      ),
    );
  }

  #formatHandleTooltipNumber(value) {
    if (!Number.isFinite(value)) return "0";
    return String(Number(value.toFixed(this.#precision)));
  }

  #handleTooltipText(handle) {
    if (this.#mode === "spring") {
      if (handle === "bounce") {
        return `Bounce ${this.#formatHandleTooltipNumber(this.#springBounce())}`;
      }
      return `Duration ${Math.round(this.#springDuration * 100)}%`;
    }

    const point = handle === "1" ? this.#cp1 : this.#cp2;
    const label = handle === "1" ? "Start" : "End";
    return `${label} ${this.#formatHandleTooltipNumber(point.x)}, ${this.#formatHandleTooltipNumber(point.y)}`;
  }

  #syncHandleTooltips() {
    for (const [container, handle] of [
      [this.#handle1, this.#mode === "spring" ? "bounce" : "1"],
      [this.#handle2, this.#mode === "spring" ? "duration" : "2"],
    ]) {
      const tooltip = container?.querySelector("fig-tooltip");
      if (tooltip) tooltip.text = this.#handleTooltipText(handle);
    }
  }

  #toggleHandleTooltip(container, show) {
    const tooltip = container?.querySelector("fig-tooltip");
    if (!tooltip) return;
    if (show) tooltip.setAttribute("show", "true");
    else tooltip.removeAttribute("show");
  }

  #createContent() {
    const size = 200;
    const select = this.#isPresetsEnabled() ? this.#createSelect() : null;
    if (!this.#isEditEnabled()) return select ? [select] : [];
    const valueInput = this.#isTextEnabled()
      ? this.#mode === "spring"
        ? figCreateElement("fig-input-number", {
            className: "fig-easing-curve-value-input",
            value: this.#springBounce().toFixed(2),
            min: "0",
            max: "1",
            step: "0.01",
            precision: "2",
            "aria-label": "Spring bounce",
            full: true,
          })
        : figCreateElement("fig-input-text", {
            className: "fig-easing-curve-value-input",
            value: this.value,
            full: true,
          })
      : null;
    const svgChildren = [
      figCreateSvgElement("rect", {
        className: "fig-easing-curve-bounds",
        x: "0",
        y: "0",
        width: size,
        height: size,
      }),
    ];

    if (this.#mode === "spring") {
      const targetY = 40;
      svgChildren.push(
        figCreateSvgElement("line", {
          className: "fig-easing-curve-target",
          x1: "0",
          y1: targetY,
          x2: size,
          y2: targetY,
        }),
        figCreateSvgElement("path", {
          className: "fig-easing-curve-path",
        }),
        this.#createHandle(
          "fig-easing-curve-handle",
          "bounce",
          "Spring bounce handle",
        ),
        this.#createHandle(
          "fig-easing-curve-handle fig-easing-curve-duration-bar",
          "duration",
          "Spring duration handle",
        ),
      );
    } else {
      svgChildren.push(
        figCreateSvgElement("line", {
          className: "fig-easing-curve-boundary",
          "data-boundary": "top",
          x1: "0",
          y1: "0",
          x2: size,
          y2: "0",
        }),
        figCreateSvgElement("line", {
          className: "fig-easing-curve-boundary",
          "data-boundary": "bottom",
          x1: "0",
          y1: size,
          x2: size,
          y2: size,
        }),
        figCreateSvgElement("path", {
          className: "fig-easing-curve-path",
        }),
        figCreateSvgElement("line", {
          className: "fig-easing-curve-arm",
          "data-arm": "1",
        }),
        figCreateSvgElement("line", {
          className: "fig-easing-curve-arm",
          "data-arm": "2",
        }),
        this.#createHandle(
          "fig-easing-curve-handle",
          "1",
          "First easing control point",
        ),
        this.#createHandle(
          "fig-easing-curve-handle",
          "2",
          "Second easing control point",
        ),
      );
    }

    const svg = figCreateSvgElement(
      "svg",
      {
        viewBox: `0 0 ${size} ${size}`,
        className: "fig-easing-curve-svg",
      },
      svgChildren,
    );
    return [
      ...(select ? [select] : []),
      figCreateElement(
        "div",
        { className: "fig-easing-curve-svg-container" },
        svg,
      ),
      ...(valueInput ? [valueInput] : []),
    ];
  }

  #readCssNumber(name, fallback) {
    const raw = getComputedStyle(this).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  #syncMetricsFromCSS() {
    this.#durationBarRadius = this.#readCssNumber(
      "--easing-duration-bar-radius",
      this.#durationBarRadius,
    );
  }

  #cacheRefs() {
    this.#svg = this.querySelector(".fig-easing-curve-svg");
    this.#curve = this.querySelector(".fig-easing-curve-path");
    this.#line1 = this.querySelector('[data-arm="1"]');
    this.#line2 = this.querySelector('[data-arm="2"]');
    this.#handle1 =
      this.querySelector('[data-handle="1"]') ||
      this.querySelector('[data-handle="bounce"]');
    this.#handle2 =
      this.querySelector('[data-handle="2"]') ||
      this.querySelector('[data-handle="duration"]');
    this.#select = this.querySelector(".fig-easing-curve-select");
    this.#valueInput = this.querySelector(".fig-easing-curve-value-input");
    this.#targetLine = this.querySelector(".fig-easing-curve-target");
    this.#bounds = this.querySelector(".fig-easing-curve-bounds");
    this.#boundaryTop = this.querySelector('[data-boundary="top"]');
    this.#boundaryBottom = this.querySelector('[data-boundary="bottom"]');
  }

  #syncHandleSizes() {
    const h1El = this.#handle1?.querySelector("fig-handle");
    const h2El = this.#handle2?.querySelector("fig-handle");
    if (h1El) {
      const w = h1El.offsetWidth || this.#bezierHandleRadius * 2;
      const h = h1El.offsetHeight || this.#bezierHandleRadius * 2;
      this.#bezierHandleRadius = Math.max(w, h) / 2;
      this.#handle1.setAttribute("width", w);
      this.#handle1.setAttribute("height", h);
    }
    if (h2El) {
      const w = h2El.offsetWidth || this.#durationBarWidth;
      const h = h2El.offsetHeight || this.#durationBarHeight;
      if (this.#mode === "spring") {
        this.#durationBarWidth = w;
        this.#durationBarHeight = h;
      }
      this.#handle2.setAttribute("width", w);
      this.#handle2.setAttribute("height", h);
    }
  }

  #setupResizeObserver() {
    if (this.#resizeObserver || !window.ResizeObserver) return;
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#syncViewportSize()) {
        this.#updatePaths();
      }
    });
    this.#resizeObserver.observe(this);
  }

  #syncViewportSize() {
    if (!this.#svg) return false;
    const rect = this.#svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 200));
    const height = Math.max(1, Math.round(rect.height || 200));
    const changed = width !== this.#drawWidth || height !== this.#drawHeight;
    this.#drawWidth = width;
    this.#drawHeight = height;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    return changed;
  }

  // --- Coordinate helpers ---

  #bezierDomain() {
    const minVal = Math.min(0, this.#cp1.y, this.#cp2.y);
    const maxVal = Math.max(1, this.#cp1.y, this.#cp2.y);
    const range = maxVal - minVal || 1;
    const pad = 0;
    return {
      minVal,
      maxVal,
      range,
      pad,
      draw: Math.max(1, this.#drawHeight - pad * 2),
    };
  }

  #toSVG(nx, ny) {
    const { maxVal, range, pad, draw } = this.#bezierDomain();
    return {
      x: nx * this.#drawWidth,
      y: pad + ((maxVal - ny) / range) * draw,
    };
  }

  #fromSVG(sx, sy) {
    const { maxVal, range, pad, draw } = this.#bezierDomain();
    return {
      x: sx / this.#drawWidth,
      y: maxVal - ((sy - pad) / draw) * range,
    };
  }

  #springScale = { minVal: 0, maxVal: 1.2, totalTime: 1 };

  #springToSVG(nt, nv) {
    const pad = 20;
    const draw = this.#drawHeight - pad * 2;
    const { minVal, maxVal } = this.#springScale;
    const range = maxVal - minVal || 1;
    return {
      x: nt * this.#drawWidth,
      y: pad + (1 - (nv - minVal) / range) * draw,
    };
  }

  // --- Path updates ---

  #updatePaths() {
    this.#syncViewportSize();
    if (this.#mode === "spring") {
      this.#updateSpringPaths();
    } else {
      this.#updateBezierPaths();
    }
    this.#syncHandleTooltips();
  }

  #syncActiveBezierArm() {
    this.#line1?.classList.toggle(
      "is-active",
      this.#mode === "bezier" && this.#isDragging === 1,
    );
    this.#line2?.classList.toggle(
      "is-active",
      this.#mode === "bezier" && this.#isDragging === 2,
    );
  }

  #updateBezierPaths() {
    if (this.#bounds) {
      this.#bounds.setAttribute("x", "0");
      this.#bounds.setAttribute("y", "0");
      this.#bounds.setAttribute("width", this.#drawWidth);
      this.#bounds.setAttribute("height", this.#drawHeight);
    }
    const p0 = this.#toSVG(0, 0);
    const p1 = this.#toSVG(this.#cp1.x, this.#cp1.y);
    const p2 = this.#toSVG(this.#cp2.x, this.#cp2.y);
    const p3 = this.#toSVG(1, 1);
    for (const [boundary, y] of [
      [this.#boundaryTop, p3.y],
      [this.#boundaryBottom, p0.y],
    ]) {
      if (!boundary) continue;
      boundary.setAttribute("x1", "0");
      boundary.setAttribute("y1", y);
      boundary.setAttribute("x2", this.#drawWidth);
      boundary.setAttribute("y2", y);
    }

    this.#curve.setAttribute(
      "d",
      `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
    );
    this.#line1.setAttribute("x1", p0.x);
    this.#line1.setAttribute("y1", p0.y);
    this.#line1.setAttribute("x2", p1.x);
    this.#line1.setAttribute("y2", p1.y);
    this.#line2.setAttribute("x1", p3.x);
    this.#line2.setAttribute("y1", p3.y);
    this.#line2.setAttribute("x2", p2.x);
    this.#line2.setAttribute("y2", p2.y);
    const hr = this.#bezierHandleRadius;
    this.#handle1.setAttribute("x", p1.x - hr);
    this.#handle1.setAttribute("y", p1.y - hr);
    this.#handle2.setAttribute("x", p2.x - hr);
    this.#handle2.setAttribute("y", p2.y - hr);
    this.#syncBezierHandleTabOrder();
  }

  #syncBezierHandleTabOrder() {
    if (!this.#svg || !this.#handle1 || !this.#handle2) return;
    const handles =
      this.#cp1.y >= this.#cp2.y
        ? [this.#handle1, this.#handle2]
        : [this.#handle2, this.#handle1];
    for (const handle of handles) {
      this.#svg.append(handle);
    }
  }

  #updateSpringPaths() {
    if (this.#bounds) {
      this.#bounds.setAttribute("x", "0");
      this.#bounds.setAttribute("y", "0");
      this.#bounds.setAttribute("width", this.#drawWidth);
      this.#bounds.setAttribute("height", this.#drawHeight);
    }

    const points = this.#simulateSpring();
    if (!points.length) return;
    const totalTime = points[points.length - 1].t || 1;

    let minVal = 0,
      maxVal = 1;
    for (const p of points) {
      if (p.value < minVal) minVal = p.value;
      if (p.value > maxVal) maxVal = p.value;
    }
    const maxDistFromCenter = Math.max(
      Math.abs(minVal - 1),
      Math.abs(maxVal - 1),
      0.01,
    );
    const valPad = 0;
    this.#springScale = {
      minVal: 1 - maxDistFromCenter - valPad,
      maxVal: 1 + maxDistFromCenter + valPad,
      totalTime,
    };

    const durationNorm = Math.max(0.05, Math.min(1, this.#springDuration));
    let d = "";
    for (let i = 0; i < points.length; i++) {
      const nt = (points[i].t / totalTime) * durationNorm;
      const pt = this.#springToSVG(nt, points[i].value);
      d += (i === 0 ? "M" : "L") + pt.x.toFixed(1) + "," + pt.y.toFixed(1);
    }
    const flatStart = this.#springToSVG(durationNorm, 1);
    const flatEnd = this.#springToSVG(1, 1);
    d += `L${flatStart.x.toFixed(1)},${flatStart.y.toFixed(1)} L${flatEnd.x.toFixed(1)},${flatEnd.y.toFixed(1)}`;
    this.#curve.setAttribute("d", d);

    // Update target line position at value=1
    if (this.#targetLine) {
      const tl = this.#springToSVG(0, 1);
      const tr = this.#springToSVG(1, 1);
      this.#targetLine.setAttribute("x1", tl.x);
      this.#targetLine.setAttribute("y1", tl.y);
      this.#targetLine.setAttribute("x2", tr.x);
      this.#targetLine.setAttribute("y2", tr.y);
    }

    // Bounce handle: at first overshoot peak
    const peak = this.#findPeakOvershoot(points);
    const peakNorm = (peak.t / totalTime) * durationNorm;
    const peakPt = this.#springToSVG(peakNorm, peak.value);
    const hr = this.#bezierHandleRadius;
    this.#handle1.setAttribute("x", peakPt.x - hr);
    this.#handle1.setAttribute("y", peakPt.y - hr);

    // Duration handle: on the target line
    const targetPt = this.#springToSVG(durationNorm, 1);
    this.#handle2.setAttribute("x", targetPt.x - this.#durationBarWidth / 2);
    this.#handle2.setAttribute("y", targetPt.y - this.#durationBarHeight / 2);
  }

  #findPeakOvershoot(points) {
    let peak = { t: 0, value: 1 };
    let passedTarget = false;
    for (let i = 1; i < points.length - 1; i++) {
      const previous = points[i - 1];
      const current = points[i];
      const next = points[i + 1];
      if (current.value >= 0.99) passedTarget = true;
      if (passedTarget && current.value > peak.value) {
        peak = { t: current.t, value: current.value };
      }
      if (
        passedTarget &&
        current.value > 1 &&
        current.value >= previous.value &&
        current.value >= next.value
      ) {
        return { t: current.t, value: current.value };
      }
    }
    return peak;
  }

  // --- Select ---

  #syncSelect() {
    if (!this.#select) return;
    this.#select.value = this.#presetName;
    this.#refreshCustomPresetIcons();
  }

  #syncValueInput() {
    if (!this.#valueInput) return;
    const value =
      this.#mode === "spring"
        ? this.#springBounce().toFixed(2)
        : this.value;
    this.#valueInput.setAttribute("value", value);
  }

  #springBounce() {
    const { stiffness, damping, mass } = this.#spring;
    const criticalDamping = 2 * Math.sqrt(stiffness * mass);
    if (!Number.isFinite(criticalDamping) || criticalDamping <= 0) return 0;
    return Math.max(0, Math.min(1, 1 - damping / criticalDamping));
  }

  #setSpringBounce(value) {
    const bounce = Math.max(0, Math.min(1, Number(value)));
    const criticalDamping = 2 * Math.sqrt(
      this.#spring.stiffness * this.#spring.mass,
    );
    this.#spring.damping = Number(
      (criticalDamping * (1 - bounce)).toFixed(4),
    );
  }

  #applySpringBounce(value, eventType) {
    const bounce = Number(value);
    if (!Number.isFinite(bounce)) {
      if (eventType === "change") this.#syncValueInput();
      return;
    }

    this.#setSpringBounce(bounce);
    this.#presetName = this.#matchPreset();
    this.#updatePaths();
    this.#syncSelect();
    if (eventType === "change") this.#syncValueInput();
    this.#emit(eventType);
  }

  #parseManualBezierValue(value) {
    const parts = value.split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }
    if (parts[0] < 0 || parts[0] > 1 || parts[2] < 0 || parts[2] > 1) {
      return null;
    }
    return parts;
  }

  #parseManualSpringValue(value) {
    return this.#parseSpringString(value);
  }

  #applyManualValue(value, eventType) {
    const constrainedMode = this.#constrainedMode();
    const spring =
      constrainedMode === "bezier" ? null : this.#parseManualSpringValue(value);
    const bezier =
      constrainedMode === "spring" ? null : this.#parseManualBezierValue(value);
    if (!spring && !bezier) {
      if (eventType === "change") this.#syncValueInput();
      return;
    }

    const prevMode = this.#mode;
    if (spring) {
      this.#mode = "spring";
      this.#spring = spring;
    } else {
      this.#mode = "bezier";
      this.#cp1.x = bezier[0];
      this.#cp1.y = bezier[1];
      this.#cp2.x = bezier[2];
      this.#cp2.y = bezier[3];
    }

    this.#presetName = this.#matchPreset();
    if (prevMode !== this.#mode) {
      this.#render();
    } else {
      this.#updatePaths();
      this.#syncSelect();
      if (eventType === "change") this.#syncValueInput();
    }
    this.#emit(eventType);
  }

  #setOptionIconByValue(optionValue, icon) {
    if (!this.#select) return;
    for (const option of this.#select.querySelectorAll("fig-select-option")) {
      if (option.value === optionValue) {
        const prepend = option.querySelector(':scope > [slot="prepend"]');
        if (prepend) prepend.replaceChildren(icon.cloneNode(true));
      }
    }
  }

  #refreshCustomPresetIcons() {
    if (!this.#select) return;
    if (
      !this.#isEditEnabled() &&
      !customElements.get("fig-popup-easing")
    ) {
      return;
    }
    const bezierIcon = FigEasingCurve.#createCurveIcon(
      this.#cp1.x,
      this.#cp1.y,
      this.#cp2.x,
      this.#cp2.y,
    );
    const springIcon = FigEasingCurve.#springIcon(this.#spring);

    this.#setOptionIconByValue("Custom bezier", bezierIcon);
    this.#setOptionIconByValue("Custom spring", springIcon);
  }

  #syncAfterHandleInput(eventType) {
    this.#updatePaths();
    this.#presetName = this.#matchPreset();
    this.#syncSelect();
    this.#syncValueInput();
    this.#emit(eventType);
  }

  #handleBezierKeyboard(event, handle) {
    const step = event.shiftKey ? 0.1 : 0.01;
    const point = handle === 1 ? this.#cp1 : this.#cp2;

    switch (event.key) {
      case "ArrowLeft":
        point.x -= step;
        break;
      case "ArrowRight":
        point.x += step;
        break;
      case "ArrowUp":
        point.y += step;
        break;
      case "ArrowDown":
        point.y -= step;
        break;
      case "Home":
        point.x = 0;
        point.y = 0;
        break;
      case "End":
        point.x = 1;
        point.y = 1;
        break;
      default:
        return false;
    }

    point.x = Math.max(0, Math.min(1, Math.round(point.x * 100) / 100));
    point.y = Math.round(point.y * 100) / 100;
    this.#syncAfterHandleInput("input");
    this.#emit("change");
    return true;
  }

  #handleSpringKeyboard(event, handleType) {
    const unit = event.shiftKey ? 10 : 1;

    if (handleType === "bounce") {
      const step = unit / 100;
      switch (event.key) {
        case "ArrowUp":
          this.#setSpringBounce(this.#springBounce() + step);
          break;
        case "ArrowDown":
          this.#setSpringBounce(this.#springBounce() - step);
          break;
        case "Home":
          this.#setSpringBounce(0);
          break;
        case "End":
          this.#setSpringBounce(1);
          break;
        default:
          return false;
      }
    } else {
      const dx = unit * 2;
      switch (event.key) {
        case "ArrowLeft":
          this.#springDuration = Math.max(0.05, this.#springDuration - dx / 200);
          this.#spring.stiffness = Math.max(10, Math.round(this.#spring.stiffness + dx * 1.5));
          break;
        case "ArrowRight":
          this.#springDuration = Math.min(1, this.#springDuration + dx / 200);
          this.#spring.stiffness = Math.max(10, Math.round(this.#spring.stiffness - dx * 1.5));
          break;
        case "Home":
          this.#springDuration = 0.05;
          break;
        case "End":
          this.#springDuration = 1;
          break;
        default:
          return false;
      }
    }

    this.#syncAfterHandleInput("input");
    this.#emit("change");
    return true;
  }

  #setupHandleInteraction(handleContainer, handle) {
    const handleEl = handleContainer?.querySelector("fig-handle");
    if (!handleEl) return;

    handleEl.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (this.#mode === "bezier") {
          this.#startBezierDrag(event, Number(handle));
        } else {
          this.#startSpringDrag(event, handle);
        }
      },
      { capture: true },
    );

    handleEl.addEventListener(
      "keydown",
      (event) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
            event.key,
          )
        ) {
          return;
        }
        const handled =
          this.#mode === "bezier"
            ? this.#handleBezierKeyboard(event, Number(handle))
            : this.#handleSpringKeyboard(event, handle);
        if (!handled) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true },
    );
  }

  // --- Events ---

  #emit(type) {
    const spring = this.spring;
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          mode: this.#mode,
          value: this.value,
          cssValue: this.cssValue,
          preset: this.#presetName,
          ...(spring ? { spring } : {}),
        },
      }),
    );
  }

  #setupEvents() {
    if (this.#svg && this.#mode === "bezier") {
      this.#setupHandleInteraction(this.#handle1, "1");
      this.#setupHandleInteraction(this.#handle2, "2");
      this.#handle1.addEventListener("pointerdown", (e) =>
        this.#startBezierDrag(e, 1),
      );
      this.#handle2.addEventListener("pointerdown", (e) =>
        this.#startBezierDrag(e, 2),
      );

      const bezierSurface = this.querySelector(
        ".fig-easing-curve-svg-container",
      );
      if (bezierSurface) {
        bezierSurface.addEventListener("pointerdown", (e) => {
          if (e.target?.closest?.(".fig-easing-curve-handle, fig-handle"))
            return;
          this.#startBezierDrag(e, this.#bezierHandleForClientHalf(e));
        });
      }
    } else if (this.#svg) {
      this.#setupHandleInteraction(this.#handle1, "bounce");
      this.#setupHandleInteraction(this.#handle2, "duration");
      this.#handle1.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.#startSpringDrag(e, "bounce");
      });
      this.#handle2.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        this.#startSpringDrag(e, "duration");
      });

      const springSurface = this.querySelector(
        ".fig-easing-curve-svg-container",
      );
      if (springSurface) {
        springSurface.addEventListener("pointerdown", (e) => {
          if (e.target?.closest?.(".fig-easing-curve-handle, fig-handle"))
            return;
          this.#startSpringDrag(e, "duration");
        });
      }
    }

    if (this.#select) {
      if (!this.#isEditEnabled() && this.#select.tagName === "FIG-SELECT") {
        const openPicker = (event) => {
          if (!customElements.get("fig-popup-easing")) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          this.#openPickerPopup();
        };
        this.#select.addEventListener("click", openPicker, true);
        this.#select.addEventListener(
          "keydown",
          (event) => {
            if (event.key === "Enter" || event.key === " ") openPicker(event);
          },
          true,
        );
      }
      this.#select.addEventListener("input", (e) => {
        e.stopPropagation();
      });
      this.#select.addEventListener("optionhover", (e) => {
        e.stopPropagation();
      });
      this.#select.addEventListener("change", (e) => {
        e.stopPropagation();
        const name = e.detail;
        const preset = FigEasingCurve.PRESETS.find((p) => p.name === name);
        if (!preset) return;

        if (preset.type === "bezier") {
          if (preset.value) {
            this.#cp1.x = preset.value[0];
            this.#cp1.y = preset.value[1];
            this.#cp2.x = preset.value[2];
            this.#cp2.y = preset.value[3];
          }
          this.#presetName = name;
          if (this.#mode !== "bezier") {
            this.#mode = "bezier";
            this.#render();
          } else if (this.#svg) {
            this.#updatePaths();
            this.#syncValueInput();
          }
        } else if (preset.type === "spring") {
          if (preset.spring) {
            this.#spring = { ...preset.spring, initialVelocity: 0 };
          }
          this.#presetName = name;
          if (this.#mode !== "spring") {
            this.#mode = "spring";
            this.#render();
          } else if (this.#svg) {
            this.#updatePaths();
            this.#syncValueInput();
          }
        }
        this.#emit("input");
        this.#emit("change");
      });
    }

    if (this.#valueInput) {
      this.#valueInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const value = e.detail ?? e.target?.value;
        if (this.#mode === "spring") {
          this.#applySpringBounce(value, "input");
        } else if (typeof value === "string") {
          this.#applyManualValue(value, "input");
        }
      });
      this.#valueInput.addEventListener("change", (e) => {
        e.stopPropagation();
        const value = e.detail ?? e.target?.value;
        if (this.#mode === "spring") {
          this.#applySpringBounce(value, "change");
        } else if (typeof value === "string") {
          this.#applyManualValue(value, "change");
        }
      });
    }
  }

  #openPickerPopup() {
    if (!customElements.get("fig-popup-easing")) {
      this.#pickerDefinitionPromise ??= customElements
        .whenDefined("fig-popup-easing")
        .then(() => {
          if (!this.isConnected || this.#isEditEnabled()) return;
          this.#openPickerPopup();
        });
      return;
    }

    let popup = this.#pickerPopup;
    if (!popup?.isConnected) {
      popup = document.createElement("dialog", { is: "fig-popup-easing" });
      popup.setAttribute("is", "fig-popup-easing");
      popup.id = figUniqueId();
      const handlePopupEvent = (event) => {
        event.stopPropagation();
        this.value = popup.value;
        this.#emit(event.type);
      };
      popup.addEventListener("input", handlePopupEvent);
      popup.addEventListener("change", handlePopupEvent);
      popup.addEventListener(
        "fig-popup-lifecycle",
        this.#boundPickerLifecycle,
      );
      (figGetOverlayRoot() ?? document.body).append(popup);
      this.#pickerPopup = popup;
      this.#select?.setAttribute("aria-controls", popup.id);
    }

    this.#syncPickerPopup();
    popup.open = true;
  }

  #syncPickerPopup() {
    const popup = this.#pickerPopup;
    if (!popup) return;
    this.#syncPickerPopupAnchor();
    popup.setAttribute("value", this.value);
    for (const name of ["mode", "precision"]) {
      const value = this.getAttribute(name);
      if (value === null) popup.removeAttribute(name);
      else popup.setAttribute(name, value);
    }
  }

  #resolvePickerPopupAnchor() {
    const parent = this.parentElement;
    return parent?.matches('fig-property[activation="row"]')
      ? parent
      : this.#select;
  }

  #syncPickerPopupAnchor() {
    if (!this.#pickerPopup) return;
    const anchor = this.#resolvePickerPopupAnchor();
    const rowAnchor =
      anchor !== this.#select &&
      anchor?.matches?.('fig-property[activation="row"]');
    this.#pickerPopupAnchor = anchor;
    this.#pickerPopup.anchor = anchor;
    this.#pickerPopup.setAttribute("offset", rowAnchor ? "0 0" : "0 8");
    this.#pickerPopupAnchorResizeObserver ??= new ResizeObserver(() =>
      this.#syncPickerPopupWidth(),
    );
    this.#pickerPopupAnchorResizeObserver.disconnect();
    if (rowAnchor) {
      this.#pickerPopupAnchorResizeObserver.observe(anchor);
    }
    this.#syncPickerPopupWidth();
  }

  #syncPickerPopupWidth() {
    if (!this.#pickerPopup) return;
    const rowAnchor =
      this.#pickerPopupAnchor !== this.#select &&
      this.#pickerPopupAnchor?.matches?.(
        'fig-property[activation="row"]',
      );
    if (!rowAnchor) {
      this.#pickerPopup.style.removeProperty("width");
      return;
    }
    const width = this.#pickerPopupAnchor?.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) {
      this.#pickerPopup.style.width = `${width}px`;
    }
  }

  #destroyPickerPopup() {
    if (!this.#pickerPopup) return;
    this.#pickerPopup.removeEventListener(
      "fig-popup-lifecycle",
      this.#boundPickerLifecycle,
    );
    this.#pickerPopup.open = false;
    this.#pickerPopup.remove();
    this.#select?.removeAttribute("aria-controls");
    this.#pickerPopupAnchorResizeObserver?.disconnect();
    this.#pickerPopupAnchor = null;
    this.#pickerPopup = null;
  }

  #clientToSVG(e) {
    const ctm = this.#svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    return {
      x: inv.a * e.clientX + inv.c * e.clientY + inv.e,
      y: inv.b * e.clientX + inv.d * e.clientY + inv.f,
    };
  }

  #bezierHandleForClientHalf(e) {
    const svgPt = this.#clientToSVG(e);
    return svgPt.x <= this.#drawWidth / 2 ? 1 : 2;
  }

  #finishDrag(commit) {
    const wasDragging = this.#isDragging !== null;
    this.#isDragging = null;
    this.#dragAbortController?.abort();
    this.#dragAbortController = null;
    this.#syncActiveBezierArm();
    this.classList.remove("spring-bounce-dragging");
    this.#toggleHandleTooltip(this.#handle1, false);
    this.#toggleHandleTooltip(this.#handle2, false);
    if (commit && wasDragging) this.#emit("change");
  }

  #listenForDrag(onMove) {
    const controller = new AbortController();
    this.#dragAbortController = controller;
    const options = { signal: controller.signal };
    document.addEventListener("pointermove", onMove, options);
    document.addEventListener(
      "pointerup",
      () => this.#finishDrag(true),
      options,
    );
    document.addEventListener(
      "pointercancel",
      () => this.#finishDrag(false),
      options,
    );
    window.addEventListener("blur", () => this.#finishDrag(false), options);
  }

  #startBezierDrag(e, handle) {
    e.preventDefault();
    this.#finishDrag(false);
    this.#isDragging = handle;
    this.#syncActiveBezierArm();
    const activeHandle = handle === 1 ? this.#handle1 : this.#handle2;
    this.#toggleHandleTooltip(activeHandle, true);
    const svgRect = this.#svg.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const fromHandle = e.target?.closest?.(
      ".fig-easing-curve-handle, fig-handle",
    );
    const currentPoint = handle === 1 ? this.#cp1 : this.#cp2;
    const svgPoint = this.#clientToSVG(e);
    const startPoint = fromHandle
      ? { ...currentPoint }
      : this.#fromSVG(svgPoint.x, svgPoint.y);
    const { range, draw } = this.#bezierDomain();
    const unitsPerClientY =
      range /
      Math.max(1, (draw / this.#drawHeight) * Math.max(1, svgRect.height));

    const onMove = (e) => {
      if (!this.#isDragging) return;
      const norm = {
        x:
          startPoint.x +
          (e.clientX - startClientX) / Math.max(1, svgRect.width),
        y: e.shiftKey
          ? handle === 1
            ? 0
            : 1
          : startPoint.y - (e.clientY - startClientY) * unitsPerClientY,
      };

      norm.x = Math.round(norm.x * 100) / 100;
      norm.y = Math.round(norm.y * 100) / 100;
      norm.x = Math.max(0, Math.min(1, norm.x));

      if (this.#isDragging === 1) {
        this.#cp1.x = norm.x;
        this.#cp1.y = norm.y;
      } else {
        this.#cp2.x = norm.x;
        this.#cp2.y = norm.y;
      }
      this.#updatePaths();
      this.#presetName = this.#matchPreset();
      this.#syncSelect();
      this.#syncValueInput();
      this.#emit("input");
    };

    this.#listenForDrag(onMove);
  }

  #startSpringDrag(e, handleType) {
    e.preventDefault();
    this.#finishDrag(false);
    this.#isDragging = handleType;
    this.classList.toggle("spring-bounce-dragging", handleType === "bounce");
    const activeHandle =
      handleType === "bounce" ? this.#handle1 : this.#handle2;
    this.#toggleHandleTooltip(activeHandle, true);

    const startBounce = this.#springBounce();
    const startStiffness = this.#spring.stiffness;
    const startDuration = this.#springDuration;
    const startY = e.clientY;
    const startX = e.clientX;

    const onMove = (e) => {
      if (!this.#isDragging) return;

      if (handleType === "bounce") {
        const dy = e.clientY - startY;
        this.#setSpringBounce(startBounce - dy / 200);
      } else {
        const dx = e.clientX - startX;
        this.#springDuration = Math.max(
          0.05,
          Math.min(1, startDuration + dx / 200),
        );
        this.#spring.stiffness = Math.max(
          10,
          Math.round(startStiffness - dx * 1.5),
        );
      }

      this.#updatePaths();
      this.#presetName = this.#matchPreset();
      this.#syncSelect();
      this.#syncValueInput();
      this.#emit("input");
    };

    this.#listenForDrag(onMove);
  }
}
figDefineElement("fig-easing-curve", FigEasingCurve);

export { FigEasingCurve };
