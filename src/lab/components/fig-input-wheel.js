/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

import {
  CustomEvent,
  HTMLElement,
  figLabBooleanAttribute,
  figLabCreateElement,
  figLabCreateSvgElement,
  figLabDefineElement,
} from "../runtime/dom.js";

/**
 * Standalone interactive numeric wheel.
 *
 * @attr {number} value - Numeric value. Unbounded unless min/max are set.
 * @attr {number} min - Inclusive lower bound. Omitted = unbounded below.
 * @attr {number} max - Inclusive upper bound. Omitted = unbounded above.
 * @attr {number} step - Increment. Defaults to 1.
 * @attr {boolean|string} spin - Keeps ticks synchronized to value. Defaults to true.
 * @attr {boolean|string} disabled - Disables interaction and focus.
 * @fires input - Numeric composed event during interaction.
 * @fires change - Numeric composed event on commit.
 */
class FigInputWheel extends HTMLElement {
  static #TICK_COUNT = 33;
  static #HALF_FOV_DEG = 60;
  static #PERSPECTIVE_K = 0.55;
  static #FAST_MOTION_THRESHOLD_PX_PER_MS = 1.5;
  static #FAST_MOTION_TIMEOUT_MS = 80;
  static #DRAG_THRESHOLD_PX = 4;
  static #DRAGGING_BODY_CLASS = "fig-input-wheel-dragging";

  #surface = null;
  #track = null;
  #wheel = null;
  #svg = null;
  #tickPath = null;
  #tickMetrics = null;
  #tickMetricProbe = null;
  #wheelWidth = 0;
  #wheelHeight = 0;
  #layoutFrame = 0;
  #keyboardAnimationFrame = 0;
  #keyboardSettleTimer = 0;
  #resizeObserver = null;
  #isDragging = false;
  #dragPointerId = null;
  #dragStartX = 0;
  #dragStartValue = 0;
  #hasCrossedDragThreshold = false;
  #visualValue = null;
  #handleDragMaxPx = 0;
  #motionLastX = null;
  #motionLastTime = 0;
  #motionBlurTimer = 0;
  #boundPointerDown = this.#handlePointerDown.bind(this);
  #boundPointerMove = this.#handlePointerMove.bind(this);
  #boundPointerUp = this.#handlePointerUp.bind(this);
  #boundWheel = this.#handleWheel.bind(this);
  #boundKeyDown = this.#handleKeyDown.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "step",
      "min",
      "max",
      "spin",
    ];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncDisabled();
    this.#syncValueFromHost();
    this.#bindEvents();
    this.#resizeObserver?.disconnect();
    if (globalThis.ResizeObserver) {
      this.#resizeObserver = new ResizeObserver((entries) => {
        const rect = entries.at(-1)?.contentRect;
        if (rect) this.#setWheelSize(rect.width, rect.height);
      });
      this.#resizeObserver.observe(this);
    }
    this.#queueWheelLayout();
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    if (this.#layoutFrame) cancelAnimationFrame(this.#layoutFrame);
    this.#layoutFrame = 0;
    this.#stopKeyboardAnimation();
    this.#unbindEvents();
    this.#stopDrag();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "disabled") this.#syncDisabled();
    if (name === "value" && !this.#isDragging) {
      this.#syncValueFromHost();
    }
    if (name === "step") {
      this.#syncWheelAria();
      this.#queueWheelLayout();
    }
    if (name === "spin") this.#queueWheelLayout();
    if (name === "min" || name === "max") {
      this.#commitValue(this.#numericValue());
    }
  }

  #initialize() {
    this.#surface = this;
    this.#track = this;
    this.#wheel = this;
    this.setAttribute("role", "spinbutton");
    if (
      !this.hasAttribute("aria-label") &&
      !this.hasAttribute("aria-labelledby")
    ) {
      this.setAttribute("aria-label", "Value");
    }
    this.setAttribute("tabindex", "0");
    const svg = figLabCreateSvgElement("svg", {
      className: "fig-input-wheel-svg",
      "aria-hidden": "true",
    });
    const handle = figLabCreateElement("div", {
      className: "fig-input-wheel-handle",
    });
    this.#svg = svg;
    this.replaceChildren(svg, handle);

    const metricProbe = document.createElement("div");
    metricProbe.setAttribute("aria-hidden", "true");
    metricProbe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0";
    const maxEl = document.createElement("div");
    maxEl.style.height = "var(--fig-input-wheel-tick-height)";
    const minEl = document.createElement("div");
    minEl.style.height = "var(--fig-input-wheel-tick-height-min)";
    const maxWidthEl = document.createElement("div");
    maxWidthEl.style.width = "var(--fig-input-wheel-tick-width)";
    const minWidthEl = document.createElement("div");
    minWidthEl.style.width = "var(--fig-input-wheel-tick-width-min)";
    metricProbe.append(maxEl, minEl, maxWidthEl, minWidthEl);
    this.append(metricProbe);
    this.#tickMetricProbe = {
      maxEl,
      minEl,
      maxWidthEl,
      minWidthEl,
    };

    this.#ensureTickPath();
  }

  #ensureTickPath() {
    if (!this.#svg || this.#tickPath) return;
    this.#tickPath = figLabCreateSvgElement("path", {
      className: "fig-input-wheel-tick",
    });
    this.#svg.append(this.#tickPath);
  }

  #readTickMetrics() {
    if (this.#tickMetrics) return this.#tickMetrics;
    this.#tickMetrics = {
      maxH: this.#tickMetricProbe?.maxEl.getBoundingClientRect().height || 8,
      minH: this.#tickMetricProbe?.minEl.getBoundingClientRect().height || 4,
      maxW:
        this.#tickMetricProbe?.maxWidthEl.getBoundingClientRect().width || 2,
      minW:
        this.#tickMetricProbe?.minWidthEl.getBoundingClientRect().width || 1,
    };
    return this.#tickMetrics;
  }

  #step() {
    if (this.hasAttribute("step")) {
      const parsed = Number(this.getAttribute("step"));
      if (parsed > 0) return parsed;
    }
    return 1;
  }

  #numericValue() {
    const parsed = Number(this.getAttribute("value") ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  #parseBound(name) {
    if (!this.hasAttribute(name)) return null;
    const raw = this.getAttribute(name);
    if (raw === null || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  #boundMin() {
    return this.#parseBound("min");
  }

  #boundMax() {
    return this.#parseBound("max");
  }

  #writeBound(name, nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute(name);
      return;
    }
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, String(parsed));
  }

  #clamp(value) {
    let next = value;
    const min = this.#boundMin();
    const max = this.#boundMax();
    if (min !== null) next = Math.max(min, next);
    if (max !== null) next = Math.min(max, next);
    return next;
  }

  #snap(value) {
    const step = this.#step();
    if (step <= 0) return value;
    const base = this.#boundMin() ?? 0;
    const snapped = Math.round((value - base) / step) * step + base;
    return Number(snapped.toPrecision(15));
  }

  #commitValue(value, { snap = false, emit = null } = {}) {
    let next = snap ? this.#snap(value) : value;
    next = this.#clamp(next);
    const asString = String(next);
    if (this.getAttribute("value") !== asString) {
      this.setAttribute("value", asString);
    }
    this.#syncWheelAria(next);
    this.#queueWheelLayout();
    if (emit) {
      this.dispatchEvent(
        new CustomEvent(emit, {
          detail: next,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    }
  }

  #syncValueFromHost() {
    const value = this.#numericValue();
    const clamped = this.#clamp(value);
    if (
      clamped !== value ||
      this.getAttribute("value") !== String(clamped)
    ) {
      this.#commitValue(clamped);
      return;
    }
    this.#syncWheelAria(value);
    this.#queueWheelLayout();
  }

  #syncWheelAria(value = this.#numericValue()) {
    if (!this.#wheel) return;
    const min = this.#boundMin();
    const max = this.#boundMax();
    this.#wheel.setAttribute("aria-valuenow", String(value));
    this.#wheel.setAttribute("aria-valuetext", String(value));
    if (min === null) this.#wheel.removeAttribute("aria-valuemin");
    else this.#wheel.setAttribute("aria-valuemin", String(min));
    if (max === null) this.#wheel.removeAttribute("aria-valuemax");
    else this.#wheel.setAttribute("aria-valuemax", String(max));
  }

  #syncDisabled() {
    const disabled = figLabBooleanAttribute(this, "disabled");
    if (!this.#wheel) return;
    if (disabled) {
      if (this.#isDragging) this.#stopDrag();
      this.#stopKeyboardAnimation();
      this.setAttribute("aria-disabled", "true");
      this.#wheel.setAttribute("tabindex", "-1");
      this.#wheel.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
      this.#wheel.setAttribute("tabindex", "0");
      this.#wheel.removeAttribute("aria-disabled");
    }
  }

  #setWheelSize(width, height) {
    if (!this.#svg || width < 1 || height < 1) return;
    if (width === this.#wheelWidth && height === this.#wheelHeight) return;
    this.#wheelWidth = width;
    this.#wheelHeight = height;
    this.#tickMetrics = null;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.#svg.setAttribute("width", String(width));
    this.#svg.setAttribute("height", String(height));
    this.#queueWheelLayout();
  }

  #queueWheelLayout() {
    if (this.#layoutFrame) return;
    this.#layoutFrame = requestAnimationFrame(() => {
      if (!this.isConnected) {
        this.#layoutFrame = 0;
        return;
      }
      if (this.#wheelWidth < 1 || this.#wheelHeight < 1) {
        const rect = this.#wheel?.getBoundingClientRect();
        if (rect) this.#setWheelSize(rect.width, rect.height);
      }
      this.#layoutWheel();
      this.#layoutFrame = 0;
    });
  }

  #layoutWheel() {
    if (!this.#tickPath) return;
    const width = this.#wheelWidth;
    const height = this.#wheelHeight;
    if (width < 1 || height < 1) return;

    const value =
      this.getAttribute("spin") === "false"
        ? (this.#boundMin() ?? 0)
        : (this.#visualValue ?? this.#numericValue());
    const tickStep = 360 / FigInputWheel.#TICK_COUNT;
    const step = this.#step();
    const base = this.#boundMin() ?? 0;
    const offsetDeg = ((value - base) / step) * tickStep;
    const k = FigInputWheel.#PERSPECTIVE_K;
    const cx = width / 2;
    const cy = height / 2;

    const { maxH, minH, maxW, minW } = this.#readTickMetrics();
    const fov = FigInputWheel.#HALF_FOV_DEG;
    const visibleHalf = Math.max(width / 2, 1);
    const radius = visibleHalf * 0.84;
    const commands = [];

    for (let index = 0; index < FigInputWheel.#TICK_COUNT; index += 1) {
      let theta = offsetDeg + index * tickStep;
      theta = ((((theta + 180) % 360) + 360) % 360) - 180;
      if (theta < -fov || theta >= fov) continue;
      const rad = (theta * Math.PI) / 180;
      const x = cx + (radius * Math.sin(rad)) / (1 - k * Math.cos(rad));
      const t = Math.min(1, Math.abs(x - cx) / Math.max(visibleHalf, 1));
      const taper = Math.cos(t * Math.PI * 0.5);
      const visualH = minH + (maxH - minH) * taper;
      const visualW = minW + (maxW - minW) * taper;
      const halfH = visualH / 2;
      const halfW = visualW / 2;
      const top = cy - halfH;
      const bottom = cy + halfH;
      const left = x - halfW;
      const right = x + halfW;
      commands.push(
        `M ${x} ${top}` +
          ` Q ${right} ${top} ${right} ${top + halfW}` +
          ` V ${bottom - halfW}` +
          ` Q ${right} ${bottom} ${x} ${bottom}` +
          ` Q ${left} ${bottom} ${left} ${bottom - halfW}` +
          ` V ${top + halfW}` +
          ` Q ${left} ${top} ${x} ${top} Z`,
      );
    }
    this.#tickPath.setAttribute("d", commands.join(" "));
  }

  #bindEvents() {
    this.#surface?.addEventListener("pointerdown", this.#boundPointerDown);
    this.#wheel?.addEventListener("wheel", this.#boundWheel, { passive: false });
    this.#wheel?.addEventListener("keydown", this.#boundKeyDown);
  }

  #unbindEvents() {
    this.#surface?.removeEventListener("pointerdown", this.#boundPointerDown);
    this.#wheel?.removeEventListener("wheel", this.#boundWheel);
    this.#wheel?.removeEventListener("keydown", this.#boundKeyDown);
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerUp);
    window.removeEventListener("pointercancel", this.#boundPointerUp);
  }

  #handlePointerDown(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.button !== 0) return;
    event.preventDefault();
    if (!this.beginScrub(event)) return;
    this.#surface?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", this.#boundPointerMove);
    window.addEventListener("pointerup", this.#boundPointerUp);
    window.addEventListener("pointercancel", this.#boundPointerUp);
  }

  beginScrub(start = {}) {
    if (figLabBooleanAttribute(this, "disabled")) return false;
    const clientX =
      typeof start === "number" ? start : Number(start?.clientX ?? start?.x);
    if (!Number.isFinite(clientX)) return false;
    this.#stopKeyboardAnimation();
    this.#isDragging = true;
    this.#dragPointerId =
      start && typeof start === "object" && start.pointerId !== undefined
        ? start.pointerId
        : null;
    this.#dragStartX = clientX;
    const requestedStart =
      start && typeof start === "object"
        ? Number(start.startValue)
        : Number.NaN;
    this.#dragStartValue = Number.isFinite(requestedStart)
      ? this.#clamp(requestedStart)
      : this.#numericValue();
    this.#hasCrossedDragThreshold = false;
    this.#startTickMotionTracking(clientX);
    this.#startHandlePull();
    this.setAttribute("data-fig-input-wheel-active", "");
    document.body.classList.remove(FigInputWheel.#DRAGGING_BODY_CLASS);
    this.focus();
    return true;
  }

  updateScrub(position, speed) {
    if (!this.#isDragging) return this.#numericValue();
    const clientX =
      typeof position === "number"
        ? position
        : Number(position?.clientX ?? position?.x);
    if (!Number.isFinite(clientX)) return this.#numericValue();
    const multiplier =
      speed ??
      (typeof position === "object" && position?.shiftKey ? 10 : 1);
    this.#updateDrag(clientX, multiplier);
    return this.#numericValue();
  }

  endScrub(commit = true) {
    if (!this.#isDragging) return this.#numericValue();
    if (commit && this.#numericValue() !== this.#dragStartValue) {
      this.#commitValue(this.#numericValue(), { snap: true, emit: "change" });
    }
    this.#stopDrag();
    return this.#numericValue();
  }

  #handlePointerMove(event) {
    if (!this.#isDragging) return;
    if (this.#dragPointerId !== null && event.pointerId !== this.#dragPointerId) {
      return;
    }
    this.updateScrub(event);
  }

  #updateDrag(clientX, speed = 1) {
    if (
      !this.#hasCrossedDragThreshold &&
      Math.abs(clientX - this.#dragStartX) >=
        FigInputWheel.#DRAG_THRESHOLD_PX
    ) {
      this.#hasCrossedDragThreshold = true;
      document.body.classList.add(FigInputWheel.#DRAGGING_BODY_CLASS);
    }
    const width = this.#wheel?.clientWidth || 1;
    const visibleSteps =
      FigInputWheel.#TICK_COUNT *
      ((FigInputWheel.#HALF_FOV_DEG * 2) / 360);
    const visibleUnits = this.#step() * visibleSteps;
    const delta =
      (clientX - this.#dragStartX) * (visibleUnits / width) * speed;
    const previousVisualValue = this.#visualValue ?? this.#dragStartValue;
    const rawValue = this.#clamp(this.#dragStartValue + delta);
    this.#updateTickMotionBlur(
      clientX,
      speed,
      rawValue !== previousVisualValue,
    );
    this.#visualValue = rawValue;
    this.#commitValue(rawValue, {
      snap: true,
      emit: "input",
    });
    this.#updateHandlePull(clientX);
  }

  #handlePointerUp(event) {
    if (!this.#isDragging) return;
    if (this.#dragPointerId !== null && event.pointerId !== this.#dragPointerId) {
      return;
    }
    this.endScrub();
  }

  #stopDrag() {
    this.#isDragging = false;
    this.#dragPointerId = null;
    this.#hasCrossedDragThreshold = false;
    this.#visualValue = null;
    this.removeAttribute("data-fig-input-wheel-active");
    document.body.classList.remove(FigInputWheel.#DRAGGING_BODY_CLASS);
    this.#stopTickMotionTracking();
    this.#resetHandlePull();
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerUp);
    window.removeEventListener("pointercancel", this.#boundPointerUp);
    this.#queueWheelLayout();
  }

  #startHandlePull() {
    this.#resetHandlePull();
    this.#handleDragMaxPx = this.#readCssLength(
      "--fig-input-wheel-handle-drag-max",
    );
  }

  #readCssLength(propertyName) {
    let raw = getComputedStyle(this)
      .getPropertyValue(propertyName)
      .trim();
    if (raw.includes("var(") || !raw.endsWith("px")) {
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: `var(${propertyName})`,
      });
      this.appendChild(probe);
      raw = getComputedStyle(probe).width;
      probe.remove();
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #updateHandlePull(pointerX) {
    if (!this.#handleDragMaxPx) {
      this.#clearHandlePull();
      return;
    }
    const dragDelta = pointerX - this.#dragStartX;
    if (!dragDelta) {
      this.#clearHandlePull();
      return;
    }
    const offset =
      this.#handleDragMaxPx *
      Math.tanh(
        dragDelta / Math.max(1, this.#handleDragMaxPx * 3),
      );
    this.style.setProperty(
      "--fig-input-wheel-handle-drag-offset",
      `${offset}px`,
    );
  }

  #resetHandlePull() {
    this.#clearHandlePull();
    this.#handleDragMaxPx = 0;
  }

  #clearHandlePull() {
    this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
  }

  #startTickMotionTracking(clientX) {
    this.#stopTickMotionTracking();
    this.#motionLastX = clientX;
    this.#motionLastTime = performance.now();
  }

  #updateTickMotionBlur(clientX, speed, moved) {
    const now = performance.now();
    const elapsed = now - this.#motionLastTime;
    const distance =
      this.#motionLastX === null ? 0 : Math.abs(clientX - this.#motionLastX);
    this.#motionLastX = clientX;
    this.#motionLastTime = now;
    const velocity =
      elapsed > 0 ? (distance / elapsed) * Math.max(1, Math.abs(speed)) : 0;
    if (
      !moved ||
      velocity < FigInputWheel.#FAST_MOTION_THRESHOLD_PX_PER_MS
    ) {
      this.#clearTickMotionBlur();
      return;
    }
    this.toggleAttribute("data-fig-input-wheel-fast", true);
    clearTimeout(this.#motionBlurTimer);
    this.#motionBlurTimer = window.setTimeout(() => {
      this.#clearTickMotionBlur();
    }, FigInputWheel.#FAST_MOTION_TIMEOUT_MS);
  }

  #stopTickMotionTracking() {
    this.#motionLastX = null;
    this.#motionLastTime = 0;
    this.#clearTickMotionBlur();
  }

  #clearTickMotionBlur() {
    clearTimeout(this.#motionBlurTimer);
    this.#motionBlurTimer = 0;
    this.removeAttribute("data-fig-input-wheel-fast");
  }

  #handleWheel(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    event.preventDefault();
    const direction = event.deltaY === 0 ? Math.sign(event.deltaX) : Math.sign(event.deltaY);
    if (!direction) return;
    const multiplier = event.shiftKey ? 10 : 1;
    this.#commitValue(this.#numericValue() + this.#step() * multiplier * direction, {
      snap: true,
      emit: "input",
    });
    this.#commitValue(this.#numericValue(), { emit: "change" });
  }

  #handleKeyDown(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number")
    ) {
      return;
    }
    if (event.key === "Home") {
      const min = this.#boundMin();
      if (min === null) return;
      event.preventDefault();
      this.#commitValue(min, { snap: true, emit: "input" });
      this.#commitValue(this.#numericValue(), { emit: "change" });
      return;
    }
    if (event.key === "End") {
      const max = this.#boundMax();
      if (max === null) return;
      event.preventDefault();
      this.#commitValue(max, { snap: true, emit: "input" });
      this.#commitValue(this.#numericValue(), { emit: "change" });
      return;
    }
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
    const multiplier = event.shiftKey ? 10 : 1;
    const previousValue = this.#numericValue();
    this.#commitValue(previousValue + this.#step() * multiplier * direction, {
      snap: true,
      emit: "input",
    });
    this.#animateKeyboardMovement(
      previousValue,
      this.#numericValue(),
      direction,
      multiplier,
    );
    this.#commitValue(this.#numericValue(), { emit: "change" });
  }

  #animateKeyboardMovement(
    from,
    to,
    direction,
    multiplier,
    animateHandle = true,
  ) {
    if (
      from === to ||
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      this.#stopKeyboardAnimation();
      return;
    }

    if (this.#keyboardAnimationFrame) {
      cancelAnimationFrame(this.#keyboardAnimationFrame);
      this.#keyboardAnimationFrame = 0;
    }
    clearTimeout(this.#keyboardSettleTimer);
    this.#keyboardSettleTimer = 0;
    this.removeAttribute("data-fig-input-wheel-keyboard-settling");
    const visualFrom = this.#visualValue ?? from;
    const handleFrom =
      Number.parseFloat(
        this.style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
      ) || 0;
    const duration = multiplier > 1 ? 120 : 90;
    const startedAt = performance.now();
    const shouldAnimateHandle = animateHandle;
    this.setAttribute("data-fig-input-wheel-keyboard-moving", "");

    const frame = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      this.#visualValue = visualFrom + (to - visualFrom) * progress;
      if (shouldAnimateHandle) {
        const eased = Math.sin((progress * Math.PI) / 2);
        const offset = handleFrom + (direction * 4 - handleFrom) * eased;
        this.style.setProperty(
          "--fig-input-wheel-handle-drag-offset",
          `${offset}px`,
        );
      }
      this.#layoutWheel();

      if (progress < 1) {
        this.#keyboardAnimationFrame = requestAnimationFrame(frame);
        return;
      }

      this.#keyboardAnimationFrame = 0;
      this.#visualValue = null;
      this.removeAttribute("data-fig-input-wheel-keyboard-moving");
      this.setAttribute("data-fig-input-wheel-keyboard-settling", "");
      this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
      this.#keyboardSettleTimer = window.setTimeout(() => {
        this.removeAttribute("data-fig-input-wheel-keyboard-settling");
        this.#keyboardSettleTimer = 0;
      }, 140);
      this.#queueWheelLayout();
    };

    this.#keyboardAnimationFrame = requestAnimationFrame(frame);
  }

  #stopKeyboardAnimation() {
    if (this.#keyboardAnimationFrame) {
      cancelAnimationFrame(this.#keyboardAnimationFrame);
      this.#keyboardAnimationFrame = 0;
    }
    clearTimeout(this.#keyboardSettleTimer);
    this.#keyboardSettleTimer = 0;
    this.#visualValue = null;
    this.removeAttribute("data-fig-input-wheel-keyboard-moving");
    this.removeAttribute("data-fig-input-wheel-keyboard-settling");
    this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
    if (this.isConnected) this.#queueWheelLayout();
  }

  get value() {
    return this.getAttribute("value") ?? "0";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.#commitValue(0);
      return;
    }
    const parsed = Number(nextValue);
    this.#commitValue(Number.isFinite(parsed) ? parsed : 0);
  }

  spinTo(nextValue, { animateHandle = false } = {}) {
    const previousValue = this.#numericValue();
    this.value = nextValue;
    const value = this.#numericValue();
    if (this.getAttribute("spin") === "false") {
      this.#stopKeyboardAnimation();
      return value;
    }
    const direction = Math.sign(value - previousValue);
    this.#animateKeyboardMovement(
      previousValue,
      value,
      direction,
      Math.abs(value - previousValue) > this.#step() ? 10 : 1,
      animateHandle,
    );
    return value;
  }

  get min() {
    return this.#boundMin();
  }

  set min(nextValue) {
    this.#writeBound("min", nextValue);
  }

  get max() {
    return this.#boundMax();
  }

  set max(nextValue) {
    this.#writeBound("max", nextValue);
  }

  get step() {
    return this.#step();
  }

  set step(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute("step");
    } else {
      this.setAttribute("step", String(nextValue));
    }
  }

  focus(options) {
    HTMLElement.prototype.focus.call(this, options);
  }
}
figLabDefineElement("fig-input-wheel", FigInputWheel);
