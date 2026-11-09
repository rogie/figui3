/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figBooleanAttribute,
  figCreateElement,
  figCreateSvgElement,
  figDefineElement,
  figValuesEqual,
} from "../runtime/index.js";

/**
 * A circular angle control with an instrument-style dial.
 * @attr {number} value - Angle in the selected unit.
 * @attr {number} default - Default/reset value in the selected unit.
 * @attr {number} precision - Decimal places for output (defaults: deg/grad 0, rad 2, turn 3).
 * @attr {boolean} dial - Show the dial surface (default true).
 * @attr {number} min - Optional minimum value in the selected unit.
 * @attr {number} max - Optional maximum value in the selected unit.
 * @attr {number} step - Keyboard/text step in the selected unit.
 * @attr {string} units - deg, °, rad, turn, or grad (default deg).
 * @attr {boolean} rotations - Show completed rotations beside the text input.
 * @attr {boolean} disabled - Disable interaction.
 */
class FigAngle extends HTMLElement {
  #angle = 0;
  #precision = 0;
  #units = "deg";
  #surface = null;
  #dial = null;
  #indicator = null;
  #indicatorHalo = null;
  #reference = null;
  #angleInput = null;
  #rotationSpan = null;
  #resetButton = null;
  #eventAbort = null;
  #activePointerId = null;
  #previousPointerAngle = null;
  #reflectingValue = false;
  #convertingUnits = false;
  #onPointerDown = (event) => this.#startPointerGesture(event);
  #onPointerMove = (event) => this.#movePointerGesture(event);
  #onPointerEnd = (event) => this.#endPointerGesture(event);
  #onKeyDown = (event) => this.#handleKeyDown(event);
  #onTextInput = (event) => this.#handleTextInput(event);
  #onRawTextChange = (event) => this.#normalizeRawTextUnit(event);
  #onResetClick = () => this.#resetToDefault();

  static #rotationGeometry(
    angle,
    centerX = 12,
    centerY = 12,
    radius = 7,
    arrowSize = 3,
    startAngle = 0,
  ) {
    const endValue = Number(angle);
    const startValue = Number(startAngle);
    const endDegrees = Number.isFinite(endValue) ? endValue : 0;
    const startDegrees = Number.isFinite(startValue) ? startValue : 0;
    const delta = endDegrees - startDegrees;
    const direction = delta < 0 ? "counterclockwise" : "clockwise";
    const absoluteSweep = Math.abs(delta);
    if (absoluteSweep < 0.001) {
      return { direction, arc: "", arrow: "" };
    }

    const point = (pointValue) =>
      `${Number(pointValue.x.toFixed(3))} ${Number(pointValue.y.toFixed(3))}`;
    const pointAt = (degrees) => {
      const radians = (degrees * Math.PI) / 180;
      return {
        x: centerX + Math.cos(radians) * radius,
        y: centerY + Math.sin(radians) * radius,
      };
    };
    const sweepSign = delta >= 0 ? 1 : -1;
    const sweepFlag = direction === "clockwise" ? 1 : 0;
    const arc = [`M ${point(pointAt(startDegrees))}`];
    let currentDegrees = startDegrees;
    const completeTurns = Math.floor(absoluteSweep / 360);
    for (let turn = 0; turn < completeTurns; turn++) {
      currentDegrees += sweepSign * 180;
      arc.push(
        `A ${radius} ${radius} 0 0 ${sweepFlag} ${point(pointAt(currentDegrees))}`,
      );
      currentDegrees += sweepSign * 180;
      arc.push(
        `A ${radius} ${radius} 0 0 ${sweepFlag} ${point(pointAt(currentDegrees))}`,
      );
    }
    const remainder = absoluteSweep - completeTurns * 360;
    if (remainder >= 0.001) {
      currentDegrees += sweepSign * remainder;
      arc.push(
        `A ${radius} ${radius} 0 ${remainder > 180 ? 1 : 0} ${sweepFlag} ${point(pointAt(currentDegrees))}`,
      );
    }

    const end = pointAt(endDegrees);
    const radians = (endDegrees * Math.PI) / 180;
    const tangent =
      delta >= 0
        ? { x: -Math.sin(radians), y: Math.cos(radians) }
        : { x: Math.sin(radians), y: -Math.cos(radians) };
    const normal = { x: -tangent.y, y: tangent.x };
    const wing = arrowSize / Math.SQRT2;
    const firstArm = {
      x: end.x - tangent.x * wing + normal.x * wing,
      y: end.y - tangent.y * wing + normal.y * wing,
    };
    const secondArm = {
      x: end.x - tangent.x * wing - normal.x * wing,
      y: end.y - tangent.y * wing - normal.y * wing,
    };
    return {
      direction,
      arc: arc.join(" "),
      arrow: `M ${point(firstArm)} L ${point(end)} L ${point(secondArm)}`,
    };
  }

  static #createRotationIcon(angle = 0, startAngle = 0) {
    const geometry = FigAngle.#rotationGeometry(
      angle,
      50,
      50,
      47,
      4,
      startAngle,
    );
    return figCreateSvgElement(
      "svg",
      {
        class: "fig-angle-reference",
        x: "3%",
        y: "3%",
        width: "94%",
        height: "94%",
        viewBox: "3 3 94 94",
        fill: "none",
        overflow: "visible",
        "aria-hidden": "true",
        "data-direction": geometry.direction,
      },
      figCreateSvgElement("path", {
        class: "fig-angle-reference-path",
        d: [geometry.arc, geometry.arrow].filter(Boolean).join(" "),
        hidden: !geometry.arc,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "var(--stroke-width)",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
    );
  }

  static rotationIcon(angle = 0, size = 48) {
    const iconSize = Number.isFinite(Number(size))
      ? Math.max(1, Number(size))
      : 48;
    const geometry = FigAngle.#rotationGeometry(angle);
    const paths = geometry.arc
      ? `<path d="${geometry.arc} ${geometry.arrow}" fill="none" stroke="currentColor" stroke-width="var(--stroke-width, 1)" stroke-linecap="round" stroke-linejoin="round"></path>`
      : "";
    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" data-direction="${geometry.direction}">${paths}</svg>`;
  }

  static get observedAttributes() {
    return [
      "value",
      "default",
      "precision",
      "dial",
      "min",
      "max",
      "step",
      "units",
      "rotations",
      "disabled",
      "aria-label",
      "name",
    ];
  }

  connectedCallback() {
    this.#readConfiguration();
    this.#render();
  }

  disconnectedCallback() {
    this.#cancelPointerGesture();
    this.#teardownEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (this.#convertingUnits) return;
    if (name === "value") {
      if (this.#reflectingValue) return;
      const next = Number(newValue);
      if (Number.isFinite(next)) {
        this.#setValue(next, { reflect: false });
      }
      return;
    }

    if (name === "units" && this.isConnected) {
      const degrees = this.#toDegrees(this.#angle);
      const previousUnit = this.#units;
      this.#units = this.#normalizeUnit(newValue);
      this.#convertUnitAttributes(previousUnit, this.#units);
      this.#precision = this.#configuredPrecision();
      this.#setValue(this.#fromDegrees(degrees));
      this.#render();
      return;
    }

    this.#readConfiguration();
    if (!this.isConnected) return;
    if (
      [
        "dial",
        "precision",
        "min",
        "max",
        "step",
        "units",
        "rotations",
        "disabled",
        "aria-label",
        "name",
      ].includes(name)
    ) {
      this.#render();
      return;
    }
    this.#setValue(this.#angle);
  }

  get value() {
    return this.#angle;
  }

  set value(value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    this.#setValue(next);
  }

  get default() {
    return this.#resolveDefaultValue();
  }

  set default(value) {
    this.defaultValue = value;
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("default");
      return;
    }
    const next = Number(value);
    if (Number.isFinite(next)) this.setAttribute("default", String(next));
  }

  get isDefault() {
    return figValuesEqual(this.value, this.default);
  }

  resetToDefault() {
    this.#resetToDefault();
  }

  get adjacent() {
    return Math.cos((this.#toDegrees(this.#angle) * Math.PI) / 180);
  }

  get opposite() {
    return Math.sin((this.#toDegrees(this.#angle) * Math.PI) / 180);
  }

  focus(options) {
    this.#dial?.focus(options);
  }

  #readConfiguration() {
    this.#units = this.#normalizeUnit(this.getAttribute("units"));
    this.#precision = this.#configuredPrecision();
    const valueAttr = this.getAttribute("value");
    const value =
      valueAttr === null || valueAttr.trim() === ""
        ? this.#resolveDefaultValue()
        : Number(valueAttr);
    if (Number.isFinite(value)) this.#angle = this.#clamp(value);
  }

  #configuredPrecision() {
    if (!this.hasAttribute("precision")) {
      if (this.#units === "turn") return 3;
      if (this.#units === "rad") return 2;
      return 0;
    }
    const precision = Number.parseInt(this.getAttribute("precision"), 10);
    return Number.isFinite(precision) ? Math.max(0, precision) : 0;
  }

  #normalizeUnit(unit) {
    const normalized = String(unit || "deg")
      .trim()
      .toLowerCase();
    if (normalized === "°") return "°";
    return ["deg", "rad", "turn", "grad"].includes(normalized)
      ? normalized
      : "deg";
  }

  #convertUnitAttributes(fromUnit, toUnit) {
    if (fromUnit === toUnit) return;
    this.#convertingUnits = true;
    for (const name of ["min", "max", "default", "step"]) {
      const raw = this.getAttribute(name);
      if (raw === null || raw.trim() === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      const converted = this.#fromDegreesForUnit(
        this.#toDegreesForUnit(value, fromUnit),
        toUnit,
      );
      this.setAttribute(name, String(converted));
    }
    this.#convertingUnits = false;
  }

  #readBoolean(name, defaultValue = false) {
    if (!this.hasAttribute(name)) return defaultValue;
    return this.getAttribute(name)?.toLowerCase() !== "false";
  }

  #isDisabled() {
    return figBooleanAttribute(this, "disabled");
  }

  #minimum() {
    const value = Number(this.getAttribute("min"));
    return this.hasAttribute("min") && Number.isFinite(value) ? value : null;
  }

  #maximum() {
    const value = Number(this.getAttribute("max"));
    return this.hasAttribute("max") && Number.isFinite(value) ? value : null;
  }

  #clamp(value) {
    let next = Number(value);
    if (!Number.isFinite(next)) return this.#angle;
    const min = this.#minimum();
    const max = this.#maximum();
    if (min !== null) next = Math.max(min, next);
    if (max !== null) next = Math.min(max, next);
    return next;
  }

  #resolveDefaultValue(rawDefault = this.getAttribute("default")) {
    const parsed =
      rawDefault === null || String(rawDefault).trim() === ""
        ? 0
        : Number(rawDefault);
    return this.#clamp(Number.isFinite(parsed) ? parsed : 0);
  }

  #toDegreesForUnit(value, unit) {
    switch (unit) {
      case "rad":
        return (value * 180) / Math.PI;
      case "turn":
        return value * 360;
      case "grad":
        return value * 0.9;
      default:
        return value;
    }
  }

  #fromDegreesForUnit(degrees, unit) {
    switch (unit) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      case "grad":
        return degrees / 0.9;
      default:
        return degrees;
    }
  }

  #toDegrees(value) {
    return this.#toDegreesForUnit(value, this.#units);
  }

  #fromDegrees(degrees) {
    return this.#fromDegreesForUnit(degrees, this.#units);
  }

  #unitSuffix() {
    return this.#units === "deg" ? "°" : this.#units;
  }

  #rotationParts() {
    const degrees = this.#toDegrees(this.#angle);
    const quotient = degrees / 360;
    const roundedQuotient = Math.round(quotient);
    const rotations =
      Math.abs(quotient - roundedQuotient) < 1e-10
        ? roundedQuotient
        : Math.trunc(quotient);
    const remainderDegrees = degrees - rotations * 360;
    return {
      rotations,
      remainder: this.#fromDegrees(
        Math.abs(remainderDegrees) < 1e-10 ? 0 : remainderDegrees,
      ),
    };
  }

  #displayValue() {
    return this.#readBoolean("rotations")
      ? this.#rotationParts().remainder
      : this.#angle;
  }

  #defaultStep() {
    switch (this.#units) {
      case "rad":
        return 0.01;
      case "turn":
        return 0.001;
      case "grad":
        return 0.1;
      default:
        return 1;
    }
  }

  #step() {
    const step = Number(this.getAttribute("step"));
    return this.hasAttribute("step") && Number.isFinite(step) && step > 0
      ? step
      : this.#defaultStep();
  }

  #name() {
    return this.getAttribute("aria-label") || this.getAttribute("name") || "Angle";
  }

  #render() {
    this.#cancelPointerGesture();
    this.#teardownEvents();
    const children = [];
    const rotations = this.#readBoolean("rotations")
      ? figCreateElement(
          "span",
          {
            slot: "append",
            className: "fig-angle-rotations",
          },
          figCreateElement("span", {
            className: "fig-angle-rotation-value",
          }),
        )
      : null;
    const showDial = this.#readBoolean("dial", true);
    const angleInput = figCreateElement(
      "fig-input-number",
      {
        className: "fig-angle-input",
        variant: showDial ? "ghost" : undefined,
        tabular: true,
        name: "angle",
        value: this.#displayValue(),
        min: this.#minimum(),
        max: this.#maximum(),
        step: this.#step(),
        precision: this.#precision,
        steppers: "false",
        units: this.#unitSuffix(),
        disabled: this.#isDisabled(),
        "aria-label": this.#name(),
      },
      rotations,
    );

    if (showDial) {
      const reset = figCreateElement(
        "fig-tooltip",
        { text: "Reset" },
        figCreateElement(
          "fig-button",
          {
            variant: "ghost",
            icon: "true",
            className: "fig-angle-reset",
            disabled: this.#isDisabled(),
            "aria-label": "Reset to default",
          },
          createFigIcon("reset", { size: "small" }),
        ),
      );
      const min = this.#minimum() ?? this.#fromDegrees(0);
      const max = this.#maximum() ?? this.#fromDegrees(360);
      const disabled = this.#isDisabled();
      const ticks = Array.from({ length: 24 }, (_, index) => {
        const angle = index * 15;
        const radians = (angle * Math.PI) / 180;
        const outer = 37;
        const inner = angle % 45 === 0 ? 31 : 35;
        return figCreateSvgElement("line", {
          class:
            angle % 45 === 0
              ? "fig-angle-tick fig-angle-tick-major"
              : "fig-angle-tick",
          x1: 50 + Math.cos(radians) * inner,
          y1: 50 + Math.sin(radians) * inner,
          x2: 50 + Math.cos(radians) * outer,
          y2: 50 + Math.sin(radians) * outer,
        });
      });
      const svg = figCreateSvgElement(
        "svg",
        {
          class: "fig-angle-svg",
          viewBox: "0 0 100 100",
          preserveAspectRatio: "xMidYMid meet",
          role: "slider",
          tabindex: disabled ? "-1" : "0",
          "aria-label": this.#name(),
          "aria-valuemin": min,
          "aria-valuemax": max,
          "aria-disabled": disabled ? "true" : "false",
        },
        [
          figCreateSvgElement("rect", {
            class: "fig-angle-hit-area",
            x: "0",
            y: "0",
            width: "100",
            height: "100",
            fill: "transparent",
          }),
          figCreateSvgElement("circle", {
            class: "fig-angle-boundary",
            cx: "50",
            cy: "50",
            r: "47",
          }),
          ...ticks,
          FigAngle.#createRotationIcon(
            this.#toDegrees(this.#angle),
            this.#toDegrees(this.#resolveDefaultValue()),
          ),
          figCreateSvgElement("line", {
            class: "fig-angle-indicator-halo",
            x1: "75",
            y1: "50",
            x2: "87",
            y2: "50",
          }),
          figCreateSvgElement("line", {
            class: "fig-angle-indicator",
            x1: "75",
            y1: "50",
            x2: "87",
            y2: "50",
          }),
        ],
      );
      children.push(
        figCreateElement(
          "div",
          {
            className: "fig-angle-surface",
          },
          [svg, angleInput, reset],
        ),
      );
    } else {
      children.push(angleInput);
    }

    this.replaceChildren(...children);
    this.#surface = this.querySelector(".fig-angle-surface");
    this.#dial = this.querySelector(".fig-angle-svg");
    this.#indicator = this.querySelector(".fig-angle-indicator");
    this.#indicatorHalo = this.querySelector(".fig-angle-indicator-halo");
    this.#reference = this.querySelector(".fig-angle-reference");
    this.#angleInput = this.querySelector(".fig-angle-input");
    this.#rotationSpan = this.querySelector(".fig-angle-rotations");
    this.#resetButton = this.querySelector(".fig-angle-reset");
    this.#setupEvents();
    this.#sync();
  }

  #setupEvents() {
    this.#eventAbort = new AbortController();
    const signal = this.#eventAbort.signal;
    this.#dial?.addEventListener("pointerdown", this.#onPointerDown, { signal });
    this.#dial?.addEventListener("pointermove", this.#onPointerMove, { signal });
    this.#dial?.addEventListener("pointerup", this.#onPointerEnd, { signal });
    this.#dial?.addEventListener("pointercancel", this.#onPointerEnd, { signal });
    this.#dial?.addEventListener("lostpointercapture", this.#onPointerEnd, {
      signal,
    });
    this.#dial?.addEventListener("keydown", this.#onKeyDown, { signal });
    this.#angleInput?.addEventListener("input", this.#onTextInput, { signal });
    this.#angleInput?.addEventListener("change", this.#onTextInput, { signal });
    this.#resetButton?.addEventListener("click", this.#onResetClick, { signal });
    this.addEventListener("change", this.#onRawTextChange, {
      capture: true,
      signal,
    });
  }

  #teardownEvents() {
    this.#eventAbort?.abort();
    this.#eventAbort = null;
  }

  #setValue(value, { reflect = true } = {}) {
    const next = this.#clamp(value);
    this.#angle = next;
    if (reflect) {
      const serialized = String(next);
      if (this.getAttribute("value") !== serialized) {
        this.#reflectingValue = true;
        this.setAttribute("value", serialized);
        this.#reflectingValue = false;
      }
    }
    this.#sync();
  }

  #sync() {
    const degrees = this.#toDegrees(this.#angle);
    const normalized = ((degrees % 360) + 360) % 360;
    const transform = `rotate(${normalized} 50 50)`;
    this.#indicator?.setAttribute("transform", transform);
    this.#indicatorHalo?.setAttribute("transform", transform);
    const defaultDegrees = this.#toDegrees(this.#resolveDefaultValue());
    const referenceGeometry = FigAngle.#rotationGeometry(
      degrees,
      50,
      50,
      47,
      4,
      defaultDegrees,
    );
    this.#reference?.setAttribute(
      "data-direction",
      referenceGeometry.direction,
    );
    const referencePath = this.#reference?.querySelector(
      ".fig-angle-reference-path",
    );
    referencePath?.setAttribute(
      "d",
      [referenceGeometry.arc, referenceGeometry.arrow]
        .filter(Boolean)
        .join(" "),
    );
    referencePath?.toggleAttribute("hidden", !referenceGeometry.arc);
    if (this.#dial) {
      const defaultMin = this.#fromDegrees(0);
      const defaultMax = this.#fromDegrees(360);
      this.#dial.setAttribute(
        "aria-valuemin",
        String(this.#minimum() ?? Math.min(defaultMin, this.#angle)),
      );
      this.#dial.setAttribute(
        "aria-valuemax",
        String(this.#maximum() ?? Math.max(defaultMax, this.#angle)),
      );
      this.#dial.setAttribute("aria-valuenow", String(this.#angle));
      this.#dial.setAttribute(
        "aria-valuetext",
        `${this.#angle.toFixed(this.#precision)}${this.#unitSuffix()}`,
      );
    }
    if (this.#angleInput) {
      const value = this.#displayValue().toFixed(this.#precision);
      if (this.#angleInput.getAttribute("value") !== value) {
        this.#angleInput.setAttribute("value", value);
      }
    }
    if (this.#rotationSpan) {
      const { rotations } = this.#rotationParts();
      const rotationValue = this.#rotationSpan.querySelector(
        ".fig-angle-rotation-value",
      );
      if (rotationValue) {
        rotationValue.textContent = rotations ? `×${rotations}` : "";
      }
      this.#rotationSpan.hidden = rotations === 0;
    }
    if (this.#resetButton) {
      this.#resetButton.hidden =
        this.#angle === this.#resolveDefaultValue();
    }
  }

  #resetToDefault() {
    if (this.#isDisabled() || this.isDefault) return;
    this.#setValue(this.#resolveDefaultValue());
    this.#emit("input");
    this.#emit("change");
  }

  #pointerDegrees(event) {
    const rect = this.#surface.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    if (Math.hypot(dx, dy) < Math.min(rect.width, rect.height) * 0.08) {
      return null;
    }
    let degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
    degrees = ((degrees % 360) + 360) % 360;
    if (event.shiftKey) degrees = Math.round(degrees / 15) * 15;
    return degrees;
  }

  #updateFromPointer(event) {
    const pointerDegrees = this.#pointerDegrees(event);
    if (pointerDegrees === null) return;
    const currentDegrees = this.#toDegrees(this.#angle);
    let delta;
    if (this.#previousPointerAngle === null) {
      const currentNormalized = ((currentDegrees % 360) + 360) % 360;
      delta = pointerDegrees - currentNormalized;
    } else {
      delta = pointerDegrees - this.#previousPointerAngle;
    }
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    this.#previousPointerAngle = pointerDegrees;
    this.#setValue(this.#fromDegrees(currentDegrees + delta));
    this.#emit("input");
  }

  #startPointerGesture(event) {
    if (this.#isDisabled() || event.button !== 0) return;
    event.preventDefault();
    this.#dial?.focus({ preventScroll: true });
    this.#activePointerId = event.pointerId;
    this.#previousPointerAngle = null;
    this.#surface.classList.add("dragging");
    try {
      this.#dial.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic events and older browsers may not own an active pointer.
    }
    this.#updateFromPointer(event);
  }

  #movePointerGesture(event) {
    if (event.pointerId !== this.#activePointerId) return;
    if (event.buttons === 0) {
      this.#endPointerGesture(event);
      return;
    }
    this.#updateFromPointer(event);
  }

  #endPointerGesture(event) {
    if (event.pointerId !== this.#activePointerId) return;
    const pointerId = this.#activePointerId;
    this.#activePointerId = null;
    this.#previousPointerAngle = null;
    this.#surface?.classList.remove("dragging");
    if (this.#dial?.hasPointerCapture?.(pointerId)) {
      this.#dial.releasePointerCapture(pointerId);
    }
    this.#emit("change");
  }

  #cancelPointerGesture() {
    this.#activePointerId = null;
    this.#previousPointerAngle = null;
    this.#surface?.classList.remove("dragging");
  }

  #handleKeyDown(event) {
    if (this.#isDisabled()) return;
    let next = this.#angle;
    const direction =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 1
          : 0;
    if (direction) {
      const increment = event.shiftKey ? this.#fromDegrees(15) : this.#step();
      next += direction * increment;
    } else if (event.key === "Home") {
      next = this.#minimum() ?? this.#fromDegrees(0);
    } else if (event.key === "End") {
      next = this.#maximum() ?? this.#fromDegrees(360);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#setValue(next);
    this.#emit("input");
    this.#emit("change");
  }

  #handleTextInput(event) {
    event.stopPropagation();
    if (this.#isDisabled()) return;
    const value = Number(event.currentTarget.value);
    if (!Number.isFinite(value)) return;
    if (this.#readBoolean("rotations")) {
      const { rotations } = this.#rotationParts();
      this.#setValue(
        this.#fromDegrees(rotations * 360 + this.#toDegrees(value)),
      );
    } else {
      this.#setValue(value);
    }
    this.#emit(event.type);
  }

  #normalizeRawTextUnit(event) {
    if (!event.target?.matches?.("input")) return;
    const match = String(event.target.value).match(
      /^(-?\d*\.?\d+)\s*(deg|°|rad|turn|grad)$/i,
    );
    if (!match) return;
    const value = Number(match[1]);
    const sourceUnit = this.#normalizeUnit(match[2]);
    let degrees = value;
    if (sourceUnit === "rad") degrees = (value * 180) / Math.PI;
    else if (sourceUnit === "turn") degrees = value * 360;
    else if (sourceUnit === "grad") degrees = value * 0.9;
    event.target.value = String(this.#fromDegrees(degrees));
  }

  #emit(type) {
    const outputValue = Number(this.value.toFixed(this.#precision));
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: {
          value: outputValue,
          angle: outputValue,
          units: this.#units,
        },
      }),
    );
  }
}
figDefineElement("fig-angle", FigAngle);

export { FigAngle };
