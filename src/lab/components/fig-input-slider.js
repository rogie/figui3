/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
/**
 * Standalone FigUI3 slider primitive.
 */

import {
  booleanAttribute,
  deepFreeze,
  nameAttribute,
  numberAttribute,
  stringAttribute,
} from "../runtime/input-slider-schema.js";

const HTMLElement = globalThis.HTMLElement ?? class {};



function booleanAttributeValue(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

function dispatchSliderEvent(host, type, value = host.value, detail = null) {
  const eventDetail = {
    control: host.localName,
    value,
  };
  const name = host.getAttribute("name");
  if (name !== null && name !== "") eventDetail.name = name;
  if (detail && typeof detail === "object") Object.assign(eventDetail, detail);
  host.dispatchEvent(
    new CustomEvent(type, {
      detail: eventDetail,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

function valuesEqual(value, defaultValue) {
  if (typeof value === "boolean" || typeof defaultValue === "boolean") {
    return Boolean(value) === Boolean(defaultValue);
  }
  return String(value ?? "") === String(defaultValue ?? "");
}

function jsonValuesEqual(value, defaultValue) {
  const normalize = (input) => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input && typeof input === "object") {
      return Object.keys(input)
        .sort()
        .reduce((result, key) => {
          result[key] = normalize(input[key]);
          return result;
        }, {});
    }
    return input;
  };

  try {
    const parsedValue = typeof value === "string" ? JSON.parse(value) : value;
    const parsedDefault =
      typeof defaultValue === "string"
        ? JSON.parse(defaultValue)
        : defaultValue;
    return (
      JSON.stringify(normalize(parsedValue)) ===
      JSON.stringify(normalize(parsedDefault))
    );
  } catch {
    return valuesEqual(value, defaultValue);
  }
}

function defineElement(name, constructor) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) customElements.define(name, constructor);
}

export const figInputSliderSchema = deepFreeze({
  name: nameAttribute,
  value: stringAttribute("Value"),
  default: stringAttribute("Default"),
  "occlusion-targets": stringAttribute("Occlusion targets"),
  min: numberAttribute("Min", { min: -1000, max: 1000, step: 1 }),
  max: numberAttribute("Max", { min: -1000, max: 1000, step: 1 }),
  step: numberAttribute("Step", { min: 0.001, max: 100, step: 0.001 }),
  precision: numberAttribute("Precision", { min: 0, max: 8, step: 1 }),
  ghost: booleanAttribute("Ghost", "string", false),
  disabled: booleanAttribute("Disabled"),
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const finite = (value, fallback) => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const decimalsFor = (value) => {
  const source = String(value);
  if (source.includes("e-")) {
    return Math.max(0, Number(source.split("e-")[1]) || 0);
  }
  return source.split(".")[1]?.length || 0;
};

const freezeState = (state) => {
  for (const key of [
    "values",
    "percentages",
    "defaultValues",
    "defaultPercentages",
    "ticks",
    "fillRanges",
    "handlePositions",
  ]) {
    Object.freeze(state[key]);
  }
  return Object.freeze(state);
};

const FIG_INPUT_SLIDER_MANAGED_OCCLUSION_TARGETS = Symbol.for(
  "figui.fig-input-slider.managed-occlusion-targets",
);

/**
 * A standalone, extensible slider with FigUI3-owned visual primitives.
 *
 * Subclasses may override the schema, state, geometry, and drawing hooks.
 */
export class FigInputSlider extends HTMLElement {
  #initialized = false;
  #initialValue = null;
  #state = null;
  #tray = null;
  #track = null;
  #fillsLayer = null;
  #fills = [];
  #ghostHandle = null;
  #handlesLayer = null;
  #handles = [];
  #ticks = null;
  #syncingAttribute = false;
  #managedAriaValueText = null;
  #activeHandleIndex = 0;
  #pointerId = null;
  #pointerChanged = false;
  #pointerInteraction = null;
  #pendingNumberPointer = null;
  #numberInput = null;
  #childrenObserver = null;
  #occlusionTargets = [];
  #managedOcclusionTargets = new Map();
  #resolvedOcclusionTargets = [];
  #occlusionResizeObserver = null;
  #occlusionFadeThresholdKey = "";
  #occlusionFadeThresholdPixels = 0;
  #boundKeyDown = this.#handleKeyDown.bind(this);
  #boundPointerDown = this.#handlePointerDown.bind(this);
  #boundPointerMove = this.#handlePointerMove.bind(this);
  #boundPointerEnd = this.#handlePointerEnd.bind(this);
  #boundPointerHover = this.#handlePointerHover.bind(this);
  #boundPointerLeave = this.#hideGhostHandle.bind(this);
  #boundDoubleClick = this.#handleDoubleClick.bind(this);
  #boundNumberPointerDown = this.#handleNumberPointerDown.bind(this);
  #boundPendingNumberPointerMove =
    this.#handlePendingNumberPointerMove.bind(this);
  #boundPendingNumberPointerEnd =
    this.#handlePendingNumberPointerEnd.bind(this);
  #boundNumberInput = this.#handleNumberInput.bind(this);
  #boundNumberChange = this.#handleNumberChange.bind(this);

  static get attributeSchema() {
    return figInputSliderSchema;
  }

  static get observedAttributes() {
    return Object.keys(this.attributeSchema);
  }

  connectedCallback() {
    this.classList.add("fig-input-slider");
    if (!this.#initialized) this.#initialize();
    this.#observeChildren();
    this.#observeOcclusion();
    this.#bindEvents();
    this.#render();
  }

  disconnectedCallback() {
    this.#unbindEvents();
    this.#childrenObserver?.disconnect();
    this.#occlusionResizeObserver?.disconnect();
    this.#clearPendingNumberPointer();
    this.#numberInput?.removeEventListener("input", this.#boundNumberInput);
    this.#numberInput?.removeEventListener("change", this.#boundNumberChange);
    this.#numberInput = null;
    this.#pointerId = null;
    this.#pointerInteraction = null;
  }

  attributeChangedCallback(_name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized || this.#syncingAttribute) {
      return;
    }
    this.#render();
  }

  #initialize() {
    const defaults = this.getSliderDefaults();
    const bounds = this.#boundsFor(defaults);
    this.#initialValue =
      this.getAttribute("value") ??
      this.getAttribute("default") ??
      String(this.getFallbackValue(bounds));

    const fillsLayer = document.createElement("div");
    fillsLayer.className = "fig-input-slider-fills";
    fillsLayer.setAttribute("aria-hidden", "true");

    const handlesLayer = document.createElement("div");
    handlesLayer.className = "fig-input-slider-handles";
    handlesLayer.setAttribute("aria-hidden", "true");

    this.#fillsLayer = fillsLayer;
    this.#handlesLayer = handlesLayer;
    this.#initialized = true;
  }

  #bindEvents() {
    this.removeEventListener("keydown", this.#boundKeyDown);
    this.#tray?.removeEventListener("pointerdown", this.#boundPointerDown);
    this.#tray?.removeEventListener("pointermove", this.#boundPointerHover);
    this.#tray?.removeEventListener("pointerleave", this.#boundPointerLeave);
    this.#tray?.removeEventListener("dblclick", this.#boundDoubleClick);
    this.removeEventListener("pointerdown", this.#boundNumberPointerDown);
    this.addEventListener("keydown", this.#boundKeyDown);
    this.#tray?.addEventListener("pointerdown", this.#boundPointerDown);
    this.#tray?.addEventListener("pointermove", this.#boundPointerHover);
    this.#tray?.addEventListener("pointerleave", this.#boundPointerLeave);
    this.#tray?.addEventListener("dblclick", this.#boundDoubleClick);
    this.addEventListener("pointerdown", this.#boundNumberPointerDown);
  }

  #unbindEvents() {
    this.removeEventListener("keydown", this.#boundKeyDown);
    this.#tray?.removeEventListener("pointerdown", this.#boundPointerDown);
    this.#tray?.removeEventListener("pointermove", this.#boundPointerHover);
    this.#tray?.removeEventListener("pointerleave", this.#boundPointerLeave);
    this.#tray?.removeEventListener("dblclick", this.#boundDoubleClick);
    this.removeEventListener("pointerdown", this.#boundNumberPointerDown);
    this.#clearPendingNumberPointer();
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerEnd);
    window.removeEventListener("pointercancel", this.#boundPointerEnd);
    this.#hideGhostHandle();
  }

  #boundsFor(defaults = this.getSliderDefaults()) {
    const unbounded = Boolean(this.allowsUnboundedBounds());
    const hasMin = this.hasAttribute("min");
    const hasMax = this.hasAttribute("max");
    const min = hasMin
      ? finite(this.getAttribute("min"), defaults.min)
      : unbounded
        ? Number.NEGATIVE_INFINITY
        : defaults.min;
    const requestedMax = hasMax
      ? finite(this.getAttribute("max"), defaults.max)
      : unbounded
        ? Number.POSITIVE_INFINITY
        : defaults.max;
    return {
      min,
      max:
        requestedMax > min
          ? requestedMax
          : Number.isFinite(min)
            ? min + 1
            : Number.POSITIVE_INFINITY,
      hasMin: Number.isFinite(min),
      hasMax: Number.isFinite(requestedMax),
    };
  }

  #stepFor(defaults = this.getSliderDefaults()) {
    const raw = this.getAttribute("step");
    if (raw?.trim().toLowerCase() === "any") return 0;
    const step = finite(raw, defaults.step);
    return step > 0 ? step : defaults.step;
  }

  #precisionFor(step) {
    const explicit = Number.parseInt(this.getAttribute("precision") || "", 10);
    if (Number.isFinite(explicit)) return clamp(explicit, 0, 8);
    return clamp(decimalsFor(step), 0, 8);
  }

  #parseValues(rawValue, fallback, min, max, step) {
    const normalizationStep = this.snapsParsedValuesToStep() ? step : 0;
    let parsed = rawValue;
    if (typeof rawValue === "string") {
      const text = rawValue.trim();
      if (text.startsWith("[")) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = fallback;
        }
      }
    }
    const source =
      Array.isArray(parsed) && this.supportsMultipleValues()
        ? parsed
        : [Array.isArray(parsed) ? parsed[0] : parsed];
    const values = source
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .map((value) =>
        this.#normalizeNumber(value, min, max, normalizationStep),
      );
    if (values.length) return values;
    const fallbackSource =
      Array.isArray(fallback) && this.supportsMultipleValues()
        ? fallback
        : [Array.isArray(fallback) ? fallback[0] : fallback];
    const normalizedFallback = fallbackSource
      .map((value) => Number(value))
      .filter(Number.isFinite)
      .map((value) =>
        this.#normalizeNumber(value, min, max, normalizationStep),
      );
    return normalizedFallback.length
      ? normalizedFallback
      : [Number.isFinite(min) ? min : 0];
  }

  #normalizeNumber(value, min, max, step) {
    const clamped = clamp(value, min, max);
    if (!step) return clamped;
    const origin = Number.isFinite(min) ? min : 0;
    const snapped = origin + Math.round((clamped - origin) / step) * step;
    return Number(clamp(snapped, min, max).toFixed(12));
  }

  #snapInteractionValue(value, state, handleIndex) {
    const threshold = Math.max(
      0,
      finite(this.getSnapThreshold(state, handleIndex), 0),
    );
    if (!threshold) return value;
    let snappedValue = value;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const point of this.getSnapValues(state, handleIndex) || []) {
      const candidate = finite(point, value);
      const distance = Math.abs(candidate - value);
      if (distance <= threshold && distance < closestDistance) {
        snappedValue = clamp(candidate, state.min, state.max);
        closestDistance = distance;
      }
    }
    return snappedValue;
  }

  #resolveState() {
    const defaults = this.getSliderDefaults();
    const { min, max, hasMin, hasMax } = this.#boundsFor(defaults);
    const bounds = Object.freeze({ min, max, hasMin, hasMax });
    const step = this.#stepFor(defaults);
    const precision = this.#precisionFor(step);
    const rawValue = this.getAttribute("value") ?? this.#initialValue;
    const fallbackValue = this.getFallbackValue(bounds);
    const rawDefault = this.getAttribute("default") ?? fallbackValue;
    const values = this.#parseValues(
      rawValue,
      rawDefault,
      min,
      max,
      step,
    );
    const defaultValues = this.#parseValues(
      rawDefault,
      fallbackValue,
      min,
      max,
      step,
    );
    const range = max - min;
    const progressFor = (value) =>
      Number.isFinite(range) && range > 0 ? (value - min) / range : 0.5;
    const percentages = values.map(progressFor);
    const defaultPercentages = defaultValues.map(progressFor);
    for (const collection of [
      values,
      percentages,
      defaultValues,
      defaultPercentages,
    ]) {
      Object.freeze(collection);
    }
    const baseState = Object.freeze({
      min,
      max,
      hasMin,
      hasMax,
      step,
      precision,
      disabled: booleanAttributeValue(this, "disabled"),
      ghost: this.hasAttribute("ghost")
        ? booleanAttributeValue(this, "ghost")
        : Boolean(this.getGhostDefault()),
      values,
      percentages,
      defaultValues,
      defaultPercentages,
      ticks: Object.freeze([]),
      fillRanges: Object.freeze([]),
      handlePositions: Object.freeze([]),
      valueIsArray:
        this.supportsMultipleValues() &&
        (String(rawValue ?? "").trim().startsWith("[") ||
          Array.isArray(rawValue)),
    });
    const tickValues = Array.from(this.getTicks(baseState) || [], (tick) => ({
      value: finite(tick.value, min),
      progress: clamp(finite(tick.progress, 0), 0, 1),
      active: Boolean(tick.active),
    }));
    if (this.hasAttribute("default")) {
      defaultValues.forEach((value, index) => {
        if (
          tickValues.some(
            (tick) =>
              Math.abs(tick.value - value) <=
              Number.EPSILON * Math.max(1, Math.abs(value)) * 16,
          )
        ) {
          return;
        }
        tickValues.push({
          value,
          progress: defaultPercentages[index] ?? defaultPercentages[0] ?? 0,
          active: false,
        });
      });
      tickValues.sort((left, right) => left.progress - right.progress);
    }
    const ticks = tickValues.map((tick, index) =>
      Object.freeze({ index, ...tick }),
    );
    Object.freeze(ticks);
    const stateWithTicks = Object.freeze({ ...baseState, ticks });
    const handlePositions = values.map((value, index) => {
      const position =
        this.getHandlePosition(value, stateWithTicks, index) || {};
      return Object.freeze({
        x: clamp(finite(position.x, percentages[index]), 0, 1),
        y: clamp(finite(position.y, 0.5), 0, 1),
      });
    });
    Object.freeze(handlePositions);
    const stateWithGeometry = Object.freeze({
      ...stateWithTicks,
      handlePositions,
    });
    const fillRanges = Array.from(
      this.getFillRanges(stateWithGeometry) || [],
      (rangeValue) =>
        Object.freeze({
          start: clamp(finite(rangeValue.start, 0), 0, 1),
          end: clamp(finite(rangeValue.end, 0), 0, 1),
        }),
    );
    return freezeState({ ...stateWithGeometry, fillRanges });
  }

  #render() {
    if (!this.#initialized) return;
    this.#syncNumberInputReference();
    const state = this.#resolveState();
    this.#state = state;
    this.#activeHandleIndex = clamp(
      Math.floor(finite(this.#activeHandleIndex, 0)),
      0,
      state.values.length - 1,
    );

    this.#tray = this.#drawSingle(
      "drawTray",
      state,
      this.#tray,
      "fig-input-slider-tray",
    );
    this.#track = this.#drawSingle(
      "drawTrack",
      state,
      this.#track,
      "fig-input-slider-track",
    );
    this.#fills = this.#drawMany(
      "drawFills",
      state,
      this.#fills,
      "fig-input-slider-fill",
      true,
    );
    this.#ticks = this.#drawSingle(
      "drawTicks",
      state,
      this.#ticks,
      "fig-input-slider-ticks",
    );
    this.#ghostHandle = this.#drawSingle(
      "drawGhostHandle",
      state,
      this.#ghostHandle,
      "fig-input-slider-ghost-handle",
    );
    this.#handles = this.#drawMany(
      "drawHandles",
      state,
      this.#handles,
      "fig-input-slider-handle",
    );

    this.#mountFills();
    this.#mountHandles();
    this.#mountStructure();
    this.#syncNumberInput(state);
    this.syncSliderStyles(state);
    this.#syncOcclusionTargets();
    this.#syncHandleOcclusion();
    if (!state.ghost || state.disabled || this.#pointerId !== null) {
      this.#hideGhostHandle();
    }
    this.#syncAccessibility(state);
    this.#bindEvents();
  }

  #drawSingle(methodName, state, current, expectedClass) {
    const result = this[methodName](state, current);
    if (!(result instanceof Element)) {
      throw new TypeError(
        `[fig-input-slider] ${methodName}() must return an Element.`,
      );
    }
    if (current && result !== current) {
      throw new TypeError(
        `[fig-input-slider] ${methodName}() must preserve its Element between updates.`,
      );
    }
    result.classList.add(expectedClass);
    return result;
  }

  #drawMany(methodName, state, current, expectedClass, allowEmpty = false) {
    const result = Array.from(this[methodName](state, current) || []);
    if (
      (!allowEmpty && !result.length) ||
      result.some((node) => !(node instanceof Element))
    ) {
      throw new TypeError(
        `[fig-input-slider] ${methodName}() must return ${allowEmpty ? "" : "one or more "}Elements.`,
      );
    }
    for (
      let index = 0;
      index < Math.min(current.length, result.length);
      index++
    ) {
      if (current[index] !== result[index]) {
        throw new TypeError(
          `[fig-input-slider] ${methodName}() must preserve existing Elements between updates.`,
        );
      }
    }
    result.forEach((element) => element.classList.add(expectedClass));
    return result;
  }

  #syncAccessibility(state) {
    this.#activeHandleIndex = clamp(
      this.#activeHandleIndex,
      0,
      state.values.length - 1,
    );
    const value = state.values[this.#activeHandleIndex];
    const role = this.getAccessibilityRole(state);
    const orientation = this.getAccessibilityOrientation(state, role);
    this.setAttribute("role", role);
    if (orientation) this.setAttribute("aria-orientation", orientation);
    else this.removeAttribute("aria-orientation");
    if (state.hasMin) this.setAttribute("aria-valuemin", String(state.min));
    else this.removeAttribute("aria-valuemin");
    if (state.hasMax) this.setAttribute("aria-valuemax", String(state.max));
    else this.removeAttribute("aria-valuemax");
    this.setAttribute("aria-valuenow", String(value));
    const ariaValueText = this.getAttribute("aria-valuetext");
    if (!ariaValueText || ariaValueText === this.#managedAriaValueText) {
      const nextAriaValueText = this.formatAriaValueText(value, state);
      this.setAttribute("aria-valuetext", nextAriaValueText);
      this.#managedAriaValueText = nextAriaValueText;
    } else {
      this.#managedAriaValueText = null;
    }
    if (this.hasAttribute("aria-labelledby")) {
      this.removeAttribute("aria-label");
    } else {
      this.setAttribute(
        "aria-label",
        this.getAttribute("name")?.trim() || "Slider",
      );
    }
    if (state.disabled) {
      this.setAttribute("aria-disabled", "true");
      this.tabIndex = -1;
    } else {
      this.removeAttribute("aria-disabled");
      if (this.tabIndex < 0) this.tabIndex = 0;
    }
  }

  #mountHandles() {
    if (!this.#handlesLayer) return;
    this.#reconcileChildren(this.#handlesLayer, this.#handles);
  }

  #mountFills() {
    if (!this.#fillsLayer) return;
    this.#reconcileChildren(this.#fillsLayer, this.#fills);
  }

  #mountStructure() {
    const children = [
      this.#track,
      this.#fillsLayer,
      this.#ticks,
      this.#ghostHandle,
      this.#handlesLayer,
    ].filter(Boolean);
    this.#reconcileChildren(this.#tray, children);
    this.#reconcileChildren(
      this,
      [this.#tray, this.#numberInput].filter(Boolean),
    );
  }

  #reconcileChildren(parent, desired) {
    desired.forEach((child, index) => {
      if (parent.children[index] !== child) {
        parent.insertBefore(child, parent.children[index] || null);
      }
    });
    for (const child of [...parent.children]) {
      if (!desired.includes(child)) child.remove();
    }
  }

  #observeChildren() {
    this.#childrenObserver ??= new MutationObserver(() => {
      if (!this.isConnected) return;
      const previous = this.#numberInput;
      this.#syncNumberInputReference();
      if (previous !== this.#numberInput) this.#render();
    });
    this.#childrenObserver.disconnect();
    this.#childrenObserver.observe(this, { childList: true });
  }

  #syncNumberInputReference() {
    const numberInput = [...this.children].find(
      (child) => child.localName === "fig-input-number",
    );
    if (numberInput === this.#numberInput) return;
    this.#numberInput?.removeEventListener("input", this.#boundNumberInput);
    this.#numberInput?.removeEventListener("change", this.#boundNumberChange);
    this.#numberInput = numberInput || null;
    this.#numberInput?.addEventListener("input", this.#boundNumberInput);
    this.#numberInput?.addEventListener("change", this.#boundNumberChange);
  }

  #observeOcclusion() {
    this.#occlusionResizeObserver ??= new ResizeObserver(() =>
      this.#syncHandleOcclusion(),
    );
    this.#occlusionResizeObserver.disconnect();
    this.#occlusionResizeObserver.observe(this);
    if (this.parentElement) {
      this.#occlusionResizeObserver.observe(this.parentElement);
    }
    for (const target of this.#resolvedOcclusionTargets) {
      this.#occlusionResizeObserver.observe(target);
    }
  }

  #resolveAttributeOcclusionTargets() {
    const selectors = this.getAttribute("occlusion-targets")?.trim();
    const scope = this.parentElement;
    if (!selectors || !scope) return [];
    try {
      const targets = [...scope.querySelectorAll(selectors)];
      if (scope.matches(selectors)) targets.unshift(scope);
      return targets;
    } catch {
      return [];
    }
  }

  #syncOcclusionTargets() {
    const targets = new Set([
      this.#numberInput,
      ...this.#resolveAttributeOcclusionTargets(),
      ...this.#occlusionTargets,
      ...[...this.#managedOcclusionTargets.values()].flat(),
    ]);
    const resolved = [...targets].filter(
      (target) =>
        target instanceof Element && target !== this && target.isConnected,
    );
    const changed =
      resolved.length !== this.#resolvedOcclusionTargets.length ||
      resolved.some(
        (target, index) => target !== this.#resolvedOcclusionTargets[index],
      );
    if (!changed) return;
    this.#resolvedOcclusionTargets = resolved;
    if (this.isConnected) this.#observeOcclusion();
  }

  #syncHandleOcclusion() {
    const targets = this.#resolvedOcclusionTargets
      .map((target) => ({
        target,
        rect: target.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0);
    const threshold = this.#getOcclusionFadeThreshold();
    const surfaceRect = this.#tray?.getBoundingClientRect();
    const isRtl = getComputedStyle(this).direction === "rtl";
    for (const handle of this.#handles) {
      let overlaps = false;
      const handleRect = handle.getBoundingClientRect();
      const minimumDistance =
        surfaceRect == null
          ? Number.POSITIVE_INFINITY
          : isRtl
            ? surfaceRect.right - handleRect.right
            : handleRect.left - surfaceRect.left;
      let fadeProgress =
        minimumDistance <= 0
          ? 1
          : threshold > 0
            ? clamp(1 - minimumDistance / threshold, 0, 1)
            : 0;
      for (const { rect: targetRect } of targets) {
        const verticallyAligned =
          handleRect.top < targetRect.bottom &&
          handleRect.bottom > targetRect.top;
        const targetOverlaps =
          handleRect.left < targetRect.right &&
          handleRect.right > targetRect.left &&
          verticallyAligned;
        if (verticallyAligned) {
          const distance = targetOverlaps
            ? 0
            : Math.max(
                targetRect.left - handleRect.right,
                handleRect.left - targetRect.right,
                0,
              );
          const targetProgress =
            distance === 0
              ? 1
              : threshold > 0
                ? clamp(1 - distance / threshold, 0, 1)
                : 0;
          fadeProgress = Math.max(fadeProgress, targetProgress);
        }
        overlaps ||= targetOverlaps;
      }
      handle.toggleAttribute("data-overlaps-occlusion-target", overlaps);
      handle.style.setProperty(
        "--_fig-input-slider-handle-occlusion-progress",
        String(fadeProgress),
      );
    }
  }

  #getOcclusionFadeThreshold() {
    const styles = getComputedStyle(this);
    const source = styles
      .getPropertyValue(
        "--fig-input-slider-handle-occlusion-target-overlap-fade-threshold",
      )
      .trim();
    const key = [
      source,
      styles.getPropertyValue("--spacer-2").trim(),
      styles.fontSize,
      this.clientWidth,
    ].join("|");
    if (key === this.#occlusionFadeThresholdKey) {
      return this.#occlusionFadeThresholdPixels;
    }

    const probe = document.createElement("span");
    probe.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      box-sizing: border-box;
      inline-size: var(--fig-input-slider-handle-occlusion-target-overlap-fade-threshold);
      block-size: 0;
      padding: 0;
      border: 0;
    `;
    this.append(probe);
    const pixels = probe.getBoundingClientRect().width;
    probe.remove();

    this.#occlusionFadeThresholdKey = key;
    this.#occlusionFadeThresholdPixels = Number.isFinite(pixels)
      ? Math.max(0, pixels)
      : 0;
    return this.#occlusionFadeThresholdPixels;
  }

  #syncNumberInput(state = this.#state) {
    this.toggleAttribute(
      "data-multiple-values",
      Boolean(state?.valueIsArray),
    );
    if (!this.#numberInput || !state || state.valueIsArray) return;
    const value = String(state.values[0]);
    if (this.#numberInput.getAttribute("value") !== value) {
      this.#numberInput.setAttribute("value", value);
    }
  }

  #handleNumberInput(event) {
    if (event.target !== this.#numberInput) return;
    event.stopPropagation();
    if (!this.#state || this.#state.disabled) {
      this.#syncNumberInput();
      return;
    }
    const changed = this.#setHandleValue(
      this.#numberInput.value,
      0,
      "input",
    );
    if (!changed) this.#syncNumberInput();
  }

  #handleNumberChange(event) {
    if (event.target !== this.#numberInput) return;
    event.stopPropagation();
    if (!this.#state || this.#state.disabled) {
      this.#syncNumberInput();
      return;
    }
    this.#setHandleValue(this.#numberInput.value, 0, "input");
    this.#syncNumberInput();
    this.commitInteractionChange(0);
  }

  formatAriaValueText(value, state = this.#state) {
    if (!state) return String(value);
    const formatted = Number(value).toFixed(state.precision);
    return state.precision ? formatted : String(Math.round(value));
  }

  #serializeValues(values, valueIsArray = this.#state?.valueIsArray) {
    return valueIsArray ? JSON.stringify(values) : String(values[0]);
  }

  #reflectValues(values, valueIsArray = this.#state?.valueIsArray) {
    const serialized = this.#serializeValues(values, valueIsArray);
    if (this.getAttribute("value") === serialized) return;
    this.#syncingAttribute = true;
    try {
      this.setAttribute("value", serialized);
    } finally {
      this.#syncingAttribute = false;
    }
  }

  #setHandleValue(
    value,
    handleIndex,
    eventType,
    step = this.#state?.step,
    snap = false,
  ) {
    if (!this.#state || this.#state.disabled) return;
    const index = clamp(handleIndex, 0, this.#state.values.length - 1);
    let normalized = this.#normalizeNumber(
      finite(value, this.#state.values[index]),
      this.#state.min,
      this.#state.max,
      step,
    );
    if (snap) {
      normalized = this.#snapInteractionValue(
        normalized,
        this.#state,
        index,
      );
    }
    if (normalized === this.#state.values[index]) return false;
    const values = [...this.#state.values];
    values[index] = normalized;
    this.#activeHandleIndex = index;
    this.#reflectValues(values);
    this.#render();
    dispatchSliderEvent(this, eventType, this.value, { handleIndex: index });
    return true;
  }

  getSliderState() {
    return this.#state || this.#resolveState();
  }

  setInteractionValue(
    value,
    {
      handleIndex = this.#activeHandleIndex,
      eventType = "input",
      step = this.#state?.step,
      snap = false,
    } = {},
  ) {
    return this.#setHandleValue(value, handleIndex, eventType, step, snap);
  }

  commitInteractionChange(handleIndex = this.#activeHandleIndex) {
    dispatchSliderEvent(this, "change", this.value, { handleIndex });
  }

  #handleKeyDown(event) {
    if (
      event.target !== this ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !this.#state ||
      this.#state.disabled
    ) {
      return;
    }

    const state = this.#state;
    if (this.handleSliderKeyDown(event, state)) return;
    const stepMultiplier = event.shiftKey ? 10 : 1;
    const normalizationStep = state.step ? state.step * stepMultiplier : 0;
    const arrowStep =
      (state.step || (state.max - state.min) / 100) * stepMultiplier;
    const pageStep =
      Math.max(
        state.step || (state.max - state.min) / 100,
        (state.max - state.min) / 10,
      ) * stepMultiplier;
    const handleIndex = clamp(
      this.#activeHandleIndex,
      0,
      state.values.length - 1,
    );
    let nextValue = state.values[handleIndex];
    let effectiveNormalizationStep = normalizationStep;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        nextValue += arrowStep;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        nextValue -= arrowStep;
        break;
      case "PageUp":
        nextValue += pageStep;
        break;
      case "PageDown":
        nextValue -= pageStep;
        break;
      case "Home":
        nextValue = state.min;
        effectiveNormalizationStep = 0;
        break;
      case "End":
        nextValue = state.max;
        effectiveNormalizationStep = 0;
        break;
      default:
        return;
    }

    event.preventDefault();
    if (
      this.#setHandleValue(
        nextValue,
        handleIndex,
        "input",
        effectiveNormalizationStep,
      )
    ) {
      dispatchSliderEvent(this, "change", this.value, { handleIndex });
    }
  }

  #pointFromEvent(event) {
    const rect = this.#tray?.getBoundingClientRect();
    if (!rect?.width || !rect.height) {
      return { x: 0, y: 0.5, rawX: 0, rawY: 0.5 };
    }
    const rtl = getComputedStyle(this).direction === "rtl";
    const rawX = (event.clientX - rect.left) / rect.width;
    return {
      x: clamp(rtl ? 1 - rawX : rawX, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      rawX: rtl ? 1 - rawX : rawX,
      rawY: (event.clientY - rect.top) / rect.height,
    };
  }

  #hideGhostHandle() {
    this.#ghostHandle?.removeAttribute("data-visible");
  }

  #handlePointerHover(event) {
    const state = this.#state;
    if (
      !state?.ghost ||
      state.disabled ||
      this.#pointerId !== null ||
      !this.#ghostHandle
    ) {
      this.#hideGhostHandle();
      return;
    }

    const overHandle = this.#handles.some((handle) => {
      const rect = handle.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    });
    if (overHandle) {
      this.#hideGhostHandle();
      return;
    }

    const point = this.#pointFromEvent(event);
    const handleIndex = clamp(
      Math.floor(finite(this.getHandleIndexFromPoint(point, state), 0)),
      0,
      state.values.length - 1,
    );
    const step = state.step && event.shiftKey ? state.step * 10 : state.step;
    let value = this.#normalizeNumber(
      finite(
        this.valueFromPoint(point, state, handleIndex),
        state.values[handleIndex],
      ),
      state.min,
      state.max,
      step,
    );
    value = this.#snapInteractionValue(value, state, handleIndex);
    const progress = (value - state.min) / (state.max - state.min);
    const previewValues = [...state.values];
    const previewPercentages = [...state.percentages];
    previewValues[handleIndex] = value;
    previewPercentages[handleIndex] = progress;
    Object.freeze(previewValues);
    Object.freeze(previewPercentages);
    const previewState = Object.freeze({
      ...state,
      values: previewValues,
      percentages: previewPercentages,
    });
    const position =
      this.getHandlePosition(value, previewState, handleIndex) || {};
    const x = clamp(finite(position.x, progress), 0, 1);
    const y = clamp(finite(position.y, 0.5), 0, 1);

    this.#ghostHandle.style.setProperty(
      "--fig-input-slider-handle-index",
      String(handleIndex),
    );
    this.#ghostHandle.style.setProperty(
      "--fig-input-slider-handle-progress",
      String(progress),
    );
    this.#ghostHandle.style.setProperty(
      "--fig-input-slider-handle-default-progress",
      String(
        state.defaultPercentages[handleIndex] ??
          state.defaultPercentages[0] ??
          0,
      ),
    );
    this.#ghostHandle.style.setProperty(
      "--fig-input-slider-handle-x",
      String(x),
    );
    this.#ghostHandle.style.setProperty(
      "--fig-input-slider-handle-y",
      String(y),
    );
    this.#ghostHandle.dataset.index = String(handleIndex);
    this.#ghostHandle.toggleAttribute(
      "data-inset-toward-end",
      this.getHandleInsetDirection(value, previewState, handleIndex) === "end",
    );
    this.#ghostHandle.toggleAttribute("data-visible", true);
  }

  #handlePointerDown(event) {
    if (
      event.button !== 0 ||
      !this.#state ||
      this.#state.disabled ||
      this.#pointerId !== null
    ) {
      return;
    }
    this.#startPointerInteraction(event);
  }

  #startPointerInteraction(event) {
    event.preventDefault();
    this.#hideGhostHandle();
    this.focus({ preventScroll: true });
    const point = this.#pointFromEvent(event);
    this.#activeHandleIndex = clamp(
      Math.floor(
        finite(this.getHandleIndexFromPoint(point, this.#state), 0),
      ),
      0,
      this.#state.values.length - 1,
    );
    this.#pointerInteraction = this.createPointerInteraction(
      event,
      this.#state,
      this.#activeHandleIndex,
      point,
    );
    this.#pointerId = event.pointerId;
    this.#pointerChanged = false;
    this.#tray?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", this.#boundPointerMove);
    window.addEventListener("pointerup", this.#boundPointerEnd, { once: true });
    window.addEventListener("pointercancel", this.#boundPointerEnd, {
      once: true,
    });
    this.toggleAttribute("data-dragging", true);
    this.#updateFromPointer(event);
  }

  #handleNumberPointerDown(event) {
    if (
      event.button !== 0 ||
      !this.#numberInput?.contains(event.target) ||
      !this.#state ||
      this.#state.disabled ||
      this.#pointerId !== null ||
      this.#pendingNumberPointer
    ) {
      return;
    }
    this.#pendingNumberPointer = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    window.addEventListener(
      "pointermove",
      this.#boundPendingNumberPointerMove,
    );
    window.addEventListener("pointerup", this.#boundPendingNumberPointerEnd);
    window.addEventListener(
      "pointercancel",
      this.#boundPendingNumberPointerEnd,
    );
  }

  #handlePendingNumberPointerMove(event) {
    const pending = this.#pendingNumberPointer;
    if (!pending || event.pointerId !== pending.pointerId) return;
    if (event.buttons === 0) {
      this.#clearPendingNumberPointer();
      return;
    }
    if (
      Math.hypot(
        event.clientX - pending.clientX,
        event.clientY - pending.clientY,
      ) < 3
    ) {
      return;
    }
    this.#clearPendingNumberPointer();
    this.#startPointerInteraction(event);
  }

  #handlePendingNumberPointerEnd(event) {
    if (
      this.#pendingNumberPointer &&
      event.pointerId !== this.#pendingNumberPointer.pointerId
    ) {
      return;
    }
    this.#clearPendingNumberPointer();
  }

  #clearPendingNumberPointer() {
    this.#pendingNumberPointer = null;
    window.removeEventListener(
      "pointermove",
      this.#boundPendingNumberPointerMove,
    );
    window.removeEventListener(
      "pointerup",
      this.#boundPendingNumberPointerEnd,
    );
    window.removeEventListener(
      "pointercancel",
      this.#boundPendingNumberPointerEnd,
    );
  }

  #handlePointerMove(event) {
    if (event.pointerId !== this.#pointerId) return;
    if (event.buttons === 0) {
      this.#handlePointerEnd(event);
      return;
    }
    this.#updateFromPointer(event);
  }

  #handlePointerEnd(event) {
    if (
      this.#pointerId !== null &&
      event?.pointerId !== undefined &&
      event.pointerId !== this.#pointerId
    ) {
      return;
    }
    const changed = this.#pointerChanged;
    const interaction = this.#pointerInteraction;
    this.#tray?.releasePointerCapture?.(this.#pointerId);
    this.#pointerId = null;
    this.#pointerChanged = false;
    this.#pointerInteraction = null;
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerEnd);
    window.removeEventListener("pointercancel", this.#boundPointerEnd);
    this.removeAttribute("data-dragging");
    this.finishPointerInteraction(event, interaction, changed);
    if (changed) {
      dispatchSliderEvent(this, "change", this.value, {
        handleIndex: this.#activeHandleIndex,
      });
    }
  }

  #updateFromPointer(event) {
    if (!this.#state) return;
    const handleIndex = this.#activeHandleIndex;
    const changed =
      this.updatePointerInteraction(
        event,
        this.#state,
        handleIndex,
        this.#pointerInteraction,
      ) === true;
    this.#pointerChanged = changed || this.#pointerChanged;
    this.#syncHandleOcclusion();
  }

  #handleDoubleClick(event) {
    event.preventDefault();
    this.resetToDefault();
  }

  getSliderDefaults() {
    return { min: 0, max: 100, step: 1 };
  }

  allowsUnboundedBounds() {
    return false;
  }

  supportsMultipleValues() {
    return true;
  }

  snapsParsedValuesToStep() {
    return true;
  }

  getAccessibilityRole(_state) {
    return "slider";
  }

  getAccessibilityOrientation(
    _state,
    role = this.getAccessibilityRole(_state),
  ) {
    return role === "slider" ? "horizontal" : null;
  }

  handleSliderKeyDown(_event, _state) {
    return false;
  }

  createPointerInteraction(event, state, handleIndex, point) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
      handleIndex,
      point,
      startValue: state.values[handleIndex],
    };
  }

  updatePointerInteraction(event, state, handleIndex, _interaction) {
    const point = this.#pointFromEvent(event);
    const value = this.valueFromPoint(point, state, handleIndex);
    const step = state.step && event.shiftKey ? state.step * 10 : state.step;
    return this.setInteractionValue(value, {
      handleIndex,
      eventType: "input",
      step,
      snap: true,
    });
  }

  finishPointerInteraction(_event, _interaction, _changed) {}

  getFallbackValue(bounds) {
    return bounds.min;
  }

  getGhostDefault() {
    return false;
  }

  getTicks(_state) {
    return [];
  }

  getFillRanges(state) {
    if (!state.percentages.length) return [];
    if (state.percentages.length === 1) {
      return [{ start: 0, end: state.percentages[0] }];
    }
    return [
      {
        start: Math.min(...state.percentages),
        end: Math.max(...state.percentages),
      },
    ];
  }

  syncSliderStyles(state) {
    this.style.setProperty(
      "--fig-input-slider-progress",
      String(state.percentages[this.#activeHandleIndex] ?? 0),
    );
    this.style.setProperty(
      "--fig-input-slider-default-progress",
      String(state.defaultPercentages[this.#activeHandleIndex] ?? 0),
    );
    this.toggleAttribute("data-disabled", state.disabled);
  }

  getHandleIndexFromPoint(point, state) {
    if (state.handlePositions.length < 2) return 0;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    state.handlePositions.forEach((position, index) => {
      const distance = Math.hypot(position.x - point.x, position.y - point.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    return closestIndex;
  }

  getHandlePosition(value, state, _index = 0) {
    return {
      x: (value - state.min) / (state.max - state.min),
      y: 0.5,
    };
  }

  getHandleInsetDirection(_value, _state, _index = 0) {
    return "start";
  }

  getSnapValues(state, _index = 0) {
    return this.hasAttribute("default") ? [...state.defaultValues] : [];
  }

  getSnapThreshold(state, _index = 0) {
    return this.hasAttribute("default")
      ? (state.max - state.min) * 0.02
      : 0;
  }

  valueFromPoint(point, state, _index = 0) {
    return state.min + clamp(point.x, 0, 1) * (state.max - state.min);
  }

  drawTray(_state, current) {
    return current || document.createElement("div");
  }

  drawTrack(_state, current) {
    const track = current || document.createElement("div");
    track.setAttribute("aria-hidden", "true");
    return track;
  }

  drawFills(state, current = []) {
    return state.fillRanges.map((rangeValue, index) => {
      const fill = current[index] || document.createElement("div");
      const start = Math.min(rangeValue.start, rangeValue.end);
      const end = Math.max(rangeValue.start, rangeValue.end);
      fill.style.setProperty("--fig-input-slider-fill-index", String(index));
      fill.style.setProperty("--fig-input-slider-fill-start", String(start));
      fill.style.setProperty("--fig-input-slider-fill-end", String(end));
      fill.setAttribute("aria-hidden", "true");
      return fill;
    });
  }

  drawGhostHandle(_state, current) {
    const handle = current || document.createElement("div");
    handle.setAttribute("aria-hidden", "true");
    return handle;
  }

  drawHandles(state, current = []) {
    return state.values.map((value, index) => {
      const handle = current[index] || document.createElement("div");
      const position = state.handlePositions[index] || { x: 0, y: 0.5 };
      handle.style.setProperty(
        "--fig-input-slider-handle-index",
        String(index),
      );
      handle.style.setProperty(
        "--fig-input-slider-handle-progress",
        String(state.percentages[index]),
      );
      handle.style.setProperty(
        "--fig-input-slider-handle-default-progress",
        String(
          state.defaultPercentages[index] ??
            state.defaultPercentages[0] ??
            0,
        ),
      );
      handle.style.setProperty(
        "--fig-input-slider-handle-x",
        String(position.x),
      );
      handle.style.setProperty(
        "--fig-input-slider-handle-y",
        String(position.y),
      );
      handle.dataset.index = String(index);
      handle.toggleAttribute(
        "data-inset-toward-end",
        this.getHandleInsetDirection(value, state, index) === "end",
      );
      handle.toggleAttribute(
        "data-active",
        index === this.#activeHandleIndex,
      );
      handle.setAttribute("aria-hidden", "true");
      return handle;
    });
  }

  drawTicks(state, current) {
    const ticks = current || document.createElement("div");
    const children = state.ticks.map((tick, index) => {
      const existing = ticks.children[index];
      const element = existing?.classList.contains("fig-input-slider-tick")
        ? existing
        : document.createElement("span");
      element.className = "fig-input-slider-tick";
      element.style.setProperty(
        "--fig-input-slider-tick-index",
        String(tick.index),
      );
      element.style.setProperty(
        "--fig-input-slider-tick-progress",
        String(tick.progress),
      );
      element.style.setProperty(
        "--fig-input-slider-tick-active",
        tick.active ? "1" : "0",
      );
      element.toggleAttribute("data-active", tick.active);
      return element;
    });
    this.#reconcileChildren(ticks, children);
    ticks.setAttribute("aria-hidden", "true");
    return ticks;
  }

  focus(options) {
    if (this.#state?.disabled) return;
    HTMLElement.prototype.focus.call(this, options);
  }

  requestRender() {
    this.#render();
  }

  get occlusionTargets() {
    return [...this.#occlusionTargets];
  }

  set occlusionTargets(targets) {
    if (targets === null || targets === undefined) {
      this.#occlusionTargets = [];
    } else {
      if (!Array.isArray(targets)) {
        throw new TypeError(
          "[fig-input-slider] occlusionTargets must be an array of Elements.",
        );
      }
      this.#occlusionTargets = targets.filter(
        (target) => target instanceof Element,
      );
    }
    this.#syncOcclusionTargets();
    this.#syncHandleOcclusion();
  }

  [FIG_INPUT_SLIDER_MANAGED_OCCLUSION_TARGETS](owner, targets) {
    if (!owner) return;
    const normalized = Array.isArray(targets)
      ? targets.filter((target) => target instanceof Element)
      : [];
    if (normalized.length) {
      this.#managedOcclusionTargets.set(owner, normalized);
    } else {
      this.#managedOcclusionTargets.delete(owner);
    }
    this.#syncOcclusionTargets();
    this.#syncHandleOcclusion();
  }

  get name() {
    return this.getAttribute("name") ?? "";
  }

  set name(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("name");
    } else {
      this.setAttribute("name", String(value));
    }
  }

  get value() {
    const state = this.#state || this.#resolveState();
    return state.valueIsArray ? [...state.values] : state.values[0];
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("value");
      return;
    }
    this.setAttribute(
      "value",
      Array.isArray(nextValue) ? JSON.stringify(nextValue) : String(nextValue),
    );
  }

  get default() {
    const state = this.#state || this.#resolveState();
    const rawDefault = this.getAttribute("default") ?? this.getFallbackValue({
      min: state.min,
      max: state.max,
      hasMin: state.hasMin,
      hasMax: state.hasMax,
    });
    const isArray =
      Array.isArray(rawDefault) ||
      String(rawDefault ?? "").trim().startsWith("[");
    return isArray ? [...state.defaultValues] : state.defaultValues[0];
  }

  set default(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("default");
    } else {
      this.setAttribute(
        "default",
        Array.isArray(nextValue)
          ? JSON.stringify(nextValue)
          : String(nextValue),
      );
    }
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(nextValue) {
    this.default = nextValue;
  }

  get isDefault() {
    return jsonValuesEqual(this.value, this.default);
  }

  resetToDefault() {
    if (booleanAttributeValue(this, "disabled") || this.isDefault) return;
    const next = this.default;
    this.value = next;
    this.#render();
    for (const type of ["input", "change"]) {
      dispatchSliderEvent(this, type, this.value, {
        handleIndex: this.#activeHandleIndex,
      });
    }
  }
}

defineElement("fig-input-slider", FigInputSlider);
