/**
 * Standalone FigUI3 slider primitives.
 * Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE.
 */

import "./fig.js";

const stringAttribute = (label) => ({ label, type: "string" });
const numberAttribute = (label, constraints = {}) => ({
  label,
  type: "number",
  ...constraints,
});
const booleanAttribute = (
  label,
  boolMode = "presence",
  defaultChecked,
) => ({
  label,
  type: "boolean",
  boolMode,
  ...(defaultChecked === undefined ? {} : { defaultChecked }),
});
const nameAttribute = stringAttribute("Name");

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

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
    const rawDefault =
      this.getAttribute("default") ?? this.#initialValue ?? fallbackValue;
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
    const ticks = Array.from(this.getTicks(baseState) || [], (tick, index) =>
      Object.freeze({
        index,
        value: finite(tick.value, min),
        progress: clamp(finite(tick.progress, 0), 0, 1),
        active: Boolean(tick.active),
      }),
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
    const threshold = targets.length ? this.#getOcclusionFadeThreshold() : 0;
    for (const handle of this.#handles) {
      let overlaps = false;
      let fadeProgress = 0;
      const handleRect = handle.getBoundingClientRect();
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

  getSnapValues(_state, _index = 0) {
    return [];
  }

  getSnapThreshold(_state, _index = 0) {
    return 0;
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

  get defaultValue() {
    const state = this.#state || this.#resolveState();
    const rawDefault = this.getAttribute("default") ?? this.#initialValue;
    const isArray =
      Array.isArray(rawDefault) ||
      String(rawDefault ?? "").trim().startsWith("[");
    return isArray ? [...state.defaultValues] : state.defaultValues[0];
  }

  get isDefault() {
    return jsonValuesEqual(this.value, this.defaultValue);
  }

  resetToDefault() {
    const next = this.defaultValue;
    this.value = next;
    this.#render();
    for (const type of ["input", "change"]) {
      dispatchSliderEvent(this, type, this.value, {
        handleIndex: this.#activeHandleIndex,
      });
    }
  }
}

const FIG_INPUT_SLIDER_MAX_TICKS = 200;

export const figInputSliderHueSchema = deepFreeze({
  ...figInputSliderSchema,
  ghost: booleanAttribute("Ghost", "string", false),
  color: stringAttribute("Color"),
});

export const figInputSliderOpacitySchema = deepFreeze({
  ...figInputSliderSchema,
  color: stringAttribute("Color"),
});

export const figInputSliderDeltaSchema = figInputSliderSchema;
export const figInputSliderStepperSchema = figInputSliderSchema;
export const figInputSliderWheelSchema = figInputSliderSchema;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
let figInputSliderWheelFilterId = 0;
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

function hueGradientForHsv({ saturation, value: brightness }) {
  const stops = [0, 60, 120, 180, 240, 300, 360].map((hue) => {
    const [r, g, b] = hsvToRgb(hue, saturation, brightness);
    return `rgb(${r}, ${g}, ${b})`;
  });
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function cssNumber(element, name, fallback) {
  const value = Number.parseFloat(
    getComputedStyle(element).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : fallback;
}

function cubicBezierEasing(x1, y1, x2, y2) {
  const sample = (time, point1, point2) => {
    const inverse = 1 - time;
    return (
      3 * inverse * inverse * time * point1 +
      3 * inverse * time * time * point2 +
      time * time * time
    );
  };
  const slope = (time, point1, point2) =>
    3 * (1 - time) ** 2 * point1 +
    6 * (1 - time) * time * (point2 - point1) +
    3 * time ** 2 * (1 - point2);

  return (progress) => {
    let time = progress;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const difference = sample(time, x1, x2) - progress;
      const currentSlope = slope(time, x1, x2);
      if (Math.abs(difference) < 1e-6 || Math.abs(currentSlope) < 1e-6) break;
      time -= difference / currentSlope;
    }
    let lower = 0;
    let upper = 1;
    time = Math.min(1, Math.max(0, time));
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const difference = sample(time, x1, x2) - progress;
      if (Math.abs(difference) < 1e-6) break;
      if (difference > 0) upper = time;
      else lower = time;
      time = (lower + upper) / 2;
    }
    return sample(time, y1, y2);
  };
}

function cssEasing(element, name) {
  const value = getComputedStyle(element)
    .getPropertyValue(name)
    .trim()
    .toLowerCase();
  if (value === "linear") return (progress) => progress;
  const presets = {
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
  };
  const match = value.match(
    /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/,
  );
  const points = presets[value] || match?.slice(1).map(Number);
  if (
    !points ||
    points.some((point) => !Number.isFinite(point)) ||
    points[0] < 0 ||
    points[0] > 1 ||
    points[2] < 0 ||
    points[2] > 1
  ) {
    return cubicBezierEasing(0, 0, 0.58, 1);
  }
  return cubicBezierEasing(...points);
}

function firstNumericValue(value, fallback = 0) {
  if (Array.isArray(value)) return firstNumericValue(value[0], fallback);
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      return firstNumericValue(JSON.parse(value), fallback);
    } catch {
      return fallback;
    }
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wheelTickPath(x, y, height) {
  const top = y - height / 2;
  const bottom = y + height / 2;
  return `M${x} ${top} V${bottom}`;
}

export class FigInputSliderHue extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderHueSchema;
  }

  syncSliderStyles(state) {
    super.syncSliderStyles(state);
    const hsv = hsvForCssColor(this.getAttribute("color"));
    if (hsv) {
      const hue = state.values[0] ?? hsv.hue;
      const [r, g, b] = hsvToRgb(hue, hsv.saturation, hsv.value);
      this.style.setProperty(
        "--fig-input-slider-color",
        `rgb(${r}, ${g}, ${b})`,
      );
      this.style.setProperty(
        "--fig-input-slider-hue-gradient",
        hueGradientForHsv(hsv),
      );
    } else {
      this.style.removeProperty("--fig-input-slider-color");
      this.style.removeProperty("--fig-input-slider-hue-gradient");
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

export class FigInputSliderOpacity extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderOpacitySchema;
  }

  getFillRanges() {
    return [{ start: 0, end: 1 }];
  }

  syncSliderStyles(state) {
    super.syncSliderStyles(state);
    this.style.setProperty(
      "--fig-input-slider-color",
      this.getAttribute("color") ||
        "var(--fig-input-slider-opacity-color, #0d99ff)",
    );
  }
}

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

export class FigInputSliderStepper extends FigInputSlider {
  static get attributeSchema() {
    return figInputSliderStepperSchema;
  }

  getSliderDefaults() {
    return { ...super.getSliderDefaults(), step: 10 };
  }

  getTicks(state) {
    if (!state.step) return [];
    const exactCount = Math.max(
      1,
      Math.floor((state.max - state.min) / state.step),
    );
    const stride = Math.max(
      1,
      Math.ceil(exactCount / (FIG_INPUT_SLIDER_MAX_TICKS - 1)),
    );
    const ticks = [];
    for (let index = 0; index <= exactCount; index += stride) {
      const value = Math.min(state.max, state.min + index * state.step);
      ticks.push({
        value,
        progress: (value - state.min) / (state.max - state.min),
        active: value <= state.values[0],
      });
    }
    if (ticks.at(-1)?.value !== state.max) {
      ticks.push({
        value: state.max,
        progress: 1,
        active: state.max <= state.values[0],
      });
    }
    return ticks;
  }
}

export class FigInputSliderWheel extends FigInputSlider {
  #visualValue = null;
  #animationFrame = 0;
  #scrub = null;
  #resizeObserver = null;
  #fastTimer = 0;
  #handleNudgeTimer = 0;
  #suppressValueAnimation = false;
  #filterId =
    `fig-input-slider-wheel-blur-${++figInputSliderWheelFilterId}`;
  #boundWheel = (event) => this.#handleWheel(event);

  static get attributeSchema() {
    return figInputSliderWheelSchema;
  }

  connectedCallback() {
    super.connectedCallback();
    this.removeEventListener("wheel", this.#boundWheel);
    this.addEventListener("wheel", this.#boundWheel, { passive: false });
    this.#visualValue ??= firstNumericValue(this.value, 0);
    const tray = this.querySelector(".fig-input-slider-tray");
    if (globalThis.ResizeObserver && tray) {
      this.#resizeObserver ??= new ResizeObserver(() => this.requestRender());
      this.#resizeObserver.disconnect();
      this.#resizeObserver.observe(tray);
    }
    this.requestRender();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("wheel", this.#boundWheel);
    this.#resizeObserver?.disconnect();
    this.#cancelAnimation();
    if (this.#fastTimer) clearTimeout(this.#fastTimer);
    if (this.#handleNudgeTimer) clearTimeout(this.#handleNudgeTimer);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const animate =
      name === "value" &&
      oldValue !== null &&
      oldValue !== newValue &&
      this.isConnected &&
      !this.hasAttribute("data-dragging") &&
      !this.#suppressValueAnimation;
    const from = this.#visualValue ?? firstNumericValue(oldValue, 0);
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name !== "value") return;
    const target = firstNumericValue(this.value, from);
    if (animate) this.#animateVisualValue(from, target);
    else this.#visualValue = target;
  }

  allowsUnboundedBounds() {
    return true;
  }

  supportsMultipleValues() {
    return false;
  }

  snapsParsedValuesToStep() {
    return false;
  }

  getAccessibilityRole() {
    return "spinbutton";
  }

  getFallbackValue() {
    return 0;
  }

  getHandlePosition() {
    return { x: 0.5, y: 0.5 };
  }

  getFillRanges() {
    return [];
  }

  getGhostDefault() {
    return false;
  }

  handleSliderKeyDown(event, state) {
    const multiplier = event.shiftKey ? 10 : 1;
    const step = state.step || 1;
    let next = state.values[0];
    let nudgeHandle = false;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next += step * multiplier;
        nudgeHandle = true;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next -= step * multiplier;
        nudgeHandle = true;
        break;
      case "PageUp":
        next += step * 10 * multiplier;
        break;
      case "PageDown":
        next -= step * 10 * multiplier;
        break;
      case "Home":
        if (!state.hasMin) return true;
        next = state.min;
        break;
      case "End":
        if (!state.hasMax) return true;
        next = state.max;
        break;
      default:
        return false;
    }
    event.preventDefault();
    if (
      this.setInteractionValue(next, {
        handleIndex: 0,
        eventType: "input",
        step: 0,
      })
    ) {
      if (nudgeHandle) {
        this.#nudgeHandle(
          state.values[0],
          firstNumericValue(this.value, next),
          true,
        );
      }
      this.commitInteractionChange(0);
    }
    return true;
  }

  createPointerInteraction(event, state) {
    return this.beginScrub({
      clientX: event.clientX,
      pointerId: event.pointerId,
      startValue: state.values[0],
      internal: true,
    });
  }

  updatePointerInteraction(event) {
    return this.updateScrub(event);
  }

  finishPointerInteraction(_event, interaction) {
    if (interaction === this.#scrub) this.#finishScrub(false);
  }

  beginScrub({
    clientX = 0,
    pointerId = null,
    startValue = this.value,
    internal = false,
  } = {}) {
    const state = this.getSliderState();
    if (state.disabled) return null;
    this.focus({ preventScroll: true });
    this.#cancelAnimation();
    if (this.#handleNudgeTimer) clearTimeout(this.#handleNudgeTimer);
    this.#handleNudgeTimer = 0;
    const value = firstNumericValue(startValue, state.values[0] ?? 0);
    this.#visualValue = value;
    this.#scrub = {
      startX: Number(clientX) || 0,
      startValue: value,
      lastX: Number(clientX) || 0,
      lastTime: performance.now(),
      pointerId,
      internal,
      changed: false,
    };
    this.toggleAttribute("data-wheel-active", true);
    this.style.setProperty(
      "--fig-input-slider-wheel-handle-drag-offset",
      "0px",
    );
    return this.#scrub;
  }

  updateScrub(eventOrClientX, speed = 1) {
    if (!this.#scrub) return false;
    const event =
      typeof eventOrClientX === "object" && eventOrClientX
        ? eventOrClientX
        : null;
    const clientX = Number(event?.clientX ?? eventOrClientX);
    if (!Number.isFinite(clientX)) return false;
    const state = this.getSliderState();
    const tray = this.querySelector(".fig-input-slider-tray");
    const width = tray?.clientWidth || 1;
    const tickCount = Math.max(
      3,
      Math.round(
        cssNumber(this, "--fig-input-slider-wheel-tick-count", 33),
      ),
    );
    const fieldOfView = cssNumber(
      this,
      "--fig-input-slider-wheel-field-of-view",
      120,
    );
    const visibleSteps = tickCount * (fieldOfView / 360);
    const multiplier = event?.shiftKey ? 10 : 1;
    const delta =
      (clientX - this.#scrub.startX) *
      (((state.step || 1) * visibleSteps) / width) *
      Number(speed || 1) *
      multiplier;
    const nextValue = this.#scrub.startValue + delta;
    const interactionValue = state.step
      ? this.#scrub.startValue + Math.round(delta / state.step) * state.step
      : nextValue;
    this.#suppressValueAnimation = true;
    let changed;
    try {
      changed = this.setInteractionValue(interactionValue, {
        handleIndex: 0,
        eventType: "input",
        step: 0,
      });
    } finally {
      this.#suppressValueAnimation = false;
    }
    this.#scrub.changed = changed || this.#scrub.changed;
    this.#visualValue = Math.min(state.max, Math.max(state.min, nextValue));

    const dragMax = cssNumber(
      this,
      "--fig-input-slider-wheel-handle-drag-max",
      8,
    );
    const dragDelta = clientX - this.#scrub.startX;
    const offset = dragMax ? dragMax * Math.tanh(dragDelta / (dragMax * 3)) : 0;
    this.style.setProperty(
      "--fig-input-slider-wheel-handle-drag-offset",
      `${offset}px`,
    );

    const now = performance.now();
    const elapsed = Math.max(1, now - this.#scrub.lastTime);
    const velocity = Math.abs(clientX - this.#scrub.lastX) / elapsed;
    this.#scrub.lastX = clientX;
    this.#scrub.lastTime = now;
    if (
      velocity >
      cssNumber(
        this,
        "--fig-input-slider-wheel-fast-motion-threshold",
        1.5,
      )
    ) {
      this.toggleAttribute("data-wheel-fast", true);
      if (this.#fastTimer) clearTimeout(this.#fastTimer);
      this.#fastTimer = setTimeout(() => {
        this.removeAttribute("data-wheel-fast");
        this.#fastTimer = 0;
        this.requestRender();
      }, cssNumber(this, "--fig-input-slider-wheel-fast-motion-timeout", 80));
    }
    this.requestRender();
    return changed;
  }

  endScrub(commit = true) {
    return this.#finishScrub(commit);
  }

  spinTo(value, { animateHandle = true } = {}) {
    const state = this.getSliderState();
    const target = firstNumericValue(value, state.values[0] ?? 0);
    this.#nudgeHandle(state.values[0] ?? target, target, animateHandle);
    if (animateHandle) {
      this.#animateVisualValue(
        this.#visualValue ?? state.values[0] ?? target,
        target,
      );
    } else {
      this.#cancelAnimation();
      this.#visualValue = target;
    }
    this.#suppressValueAnimation = true;
    try {
      this.value = target;
    } finally {
      this.#suppressValueAnimation = false;
    }
    this.requestRender();
    return this.value;
  }

  drawTicks(state, current) {
    const svg =
      current?.namespaceURI === SVG_NAMESPACE
        ? current
        : document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("viewBox", "0 0 100 32");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    let defs = svg.querySelector(":scope > defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NAMESPACE, "defs");
      svg.append(defs);
    }
    let filter = defs.querySelector("filter");
    if (!filter) {
      filter = document.createElementNS(SVG_NAMESPACE, "filter");
      filter.setAttribute("x", "-30%");
      filter.setAttribute("width", "160%");
      const blur = document.createElementNS(
        SVG_NAMESPACE,
        "feGaussianBlur",
      );
      filter.append(blur);
      defs.append(filter);
    }
    filter.id = this.#filterId;
    filter
      .querySelector("feGaussianBlur")
      ?.setAttribute(
        "stdDeviation",
        `${cssNumber(this, "--fig-input-slider-wheel-fast-motion-blur", 1.5)} 0`,
      );

    let tickPaths = svg.querySelector(
      ":scope > .fig-input-slider-wheel-tick-path",
    );
    if (!tickPaths) {
      tickPaths = document.createElementNS(SVG_NAMESPACE, "g");
      tickPaths.setAttribute(
        "class",
        "fig-input-slider-wheel-tick-path",
      );
      svg.append(tickPaths);
    }
    const count = Math.max(
      3,
      Math.round(
        cssNumber(this, "--fig-input-slider-wheel-tick-count", 33),
      ),
    );
    const halfFov =
      cssNumber(this, "--fig-input-slider-wheel-field-of-view", 120) / 2;
    const perspective = cssNumber(
      this,
      "--fig-input-slider-wheel-perspective",
      0.55,
    );
    const radius =
      50 *
      cssNumber(this, "--fig-input-slider-wheel-radius-ratio", 0.84);
    const tickHeight = cssNumber(
      this,
      "--fig-input-slider-wheel-tick-height",
      12,
    );
    const tickHeightMin = cssNumber(
      this,
      "--fig-input-slider-wheel-tick-height-min",
      4,
    );
    const step = state.step || 1;
    const visualValue = this.#visualValue ?? state.values[0] ?? 0;
    const phase = visualValue / step;
    const degreesPerTick = 360 / count;
    const center = Math.floor(phase);
    const paths = [];
    for (
      let tickIndex = center - Math.ceil(count / 2);
      tickIndex <= center + Math.ceil(count / 2);
      tickIndex += 1
    ) {
      const angle = (tickIndex - phase) * degreesPerTick;
      if (Math.abs(angle) > halfFov) continue;
      const radians = (angle * Math.PI) / 180;
      const x =
        50 +
        (radius * Math.sin(radians)) /
          (1 - perspective * Math.cos(radians));
      const taper = Math.cos(
        (Math.min(1, Math.abs(angle) / halfFov) * Math.PI) / 2,
      );
      const height = tickHeightMin + (tickHeight - tickHeightMin) * taper;
      paths.push({
        d: wheelTickPath(x, 16, height),
        scale: taper,
      });
    }
    paths.forEach((tick, index) => {
      const path =
        tickPaths.children[index] ||
        document.createElementNS(SVG_NAMESPACE, "path");
      path.setAttribute("class", "fig-input-slider-wheel-tick");
      path.setAttribute("d", tick.d);
      path.style.setProperty(
        "--fig-input-slider-wheel-tick-scale",
        String(tick.scale),
      );
      if (path.parentElement !== tickPaths) tickPaths.append(path);
    });
    while (tickPaths.children.length > paths.length) {
      tickPaths.lastElementChild?.remove();
    }
    tickPaths.setAttribute("d", paths.map(({ d }) => d).join(" "));
    tickPaths.setAttribute(
      "filter",
      this.hasAttribute("data-wheel-fast")
        ? `url(#${this.#filterId})`
        : "none",
    );
    return svg;
  }

  #handleWheel(event) {
    const state = this.getSliderState();
    if (state.disabled) return;
    const delta = event.deltaY || event.deltaX;
    if (!delta) return;
    event.preventDefault();
    const direction = delta > 0 ? -1 : 1;
    const multiplier = event.shiftKey ? 10 : 1;
    if (
      this.setInteractionValue(
        state.values[0] + direction * (state.step || 1) * multiplier,
        { handleIndex: 0, eventType: "input", step: 0 },
      )
    ) {
      this.commitInteractionChange(0);
    }
  }

  #finishScrub(commit) {
    if (!this.#scrub) return false;
    const changed = this.#scrub.changed;
    const visualValue = this.#visualValue;
    this.#scrub = null;
    this.removeAttribute("data-wheel-active");
    this.style.setProperty(
      "--fig-input-slider-wheel-handle-drag-offset",
      "0px",
    );
    const value = firstNumericValue(this.value, visualValue ?? 0);
    if (visualValue !== null && visualValue !== value) {
      this.#animateVisualValue(visualValue, value);
    }
    if (commit && changed) this.commitInteractionChange(0);
    return changed;
  }

  #nudgeHandle(from, to, enabled) {
    if (this.#handleNudgeTimer) clearTimeout(this.#handleNudgeTimer);
    this.#handleNudgeTimer = 0;
    if (
      !enabled ||
      from === to ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      this.style.setProperty(
        "--fig-input-slider-wheel-handle-drag-offset",
        "0px",
      );
      return;
    }
    const offset =
      Math.sign(to - from) *
      cssNumber(this, "--fig-input-slider-wheel-handle-drag-max", 8);
    this.style.setProperty(
      "--fig-input-slider-wheel-handle-drag-offset",
      `${offset}px`,
    );
    this.#handleNudgeTimer = setTimeout(() => {
      this.style.setProperty(
        "--fig-input-slider-wheel-handle-drag-offset",
        "0px",
      );
      this.#handleNudgeTimer = 0;
    }, cssNumber(this, "--fig-input-slider-wheel-animation-duration", 160));
  }

  #cancelAnimation() {
    if (this.#animationFrame) cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
  }

  #animateVisualValue(from, to) {
    this.#cancelAnimation();
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from === to ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      this.#visualValue = to;
      this.requestRender();
      return;
    }
    const duration = Math.max(
      0,
      cssNumber(
        this,
        "--fig-input-slider-wheel-animation-duration",
        160,
      ),
    );
    if (!duration) {
      this.#visualValue = to;
      this.requestRender();
      return;
    }
    const start = performance.now();
    const ease = cssEasing(
      this,
      "--fig-input-slider-wheel-animation-easing",
    );
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = ease(progress);
      this.#visualValue = from + (to - from) * eased;
      this.requestRender();
      if (progress < 1) this.#animationFrame = requestAnimationFrame(frame);
      else this.#animationFrame = 0;
    };
    this.#visualValue = from;
    this.requestRender();
    this.#animationFrame = requestAnimationFrame(frame);
  }
}

defineElement("fig-input-slider", FigInputSlider);
defineElement("fig-input-slider-hue", FigInputSliderHue);
defineElement("fig-input-slider-opacity", FigInputSliderOpacity);
defineElement("fig-input-slider-delta", FigInputSliderDelta);
defineElement("fig-input-slider-stepper", FigInputSliderStepper);
defineElement("fig-input-slider-wheel", FigInputSliderWheel);
