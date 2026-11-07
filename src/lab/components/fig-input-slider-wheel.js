/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
/**
 * FigUI3 wheel slider.
 */

import { FigInputSlider, figInputSliderSchema } from "./fig-input-slider.js";
import { figLabDefineElement } from "../runtime/dom.js";

export const figInputSliderWheelSchema = figInputSliderSchema;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
let figInputSliderWheelFilterId = 0;

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
figLabDefineElement("fig-input-slider-wheel", FigInputSliderWheel);
