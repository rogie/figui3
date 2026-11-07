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
  figDefineElement,
  figSyncCssVar,
  figValuesEqual,
} from "../runtime/index.js";

/**
 * A 3D rotation control with an interactive cube preview.
 * @attr {string} value - CSS transform string, e.g. "rotateX(20deg) rotateY(-35deg) rotateZ(0deg)".
 * @attr {number} precision - Decimal places for angle output (default 1).
 */
class Fig3DRotate extends HTMLElement {
  #rx = 0;
  #ry = 0;
  #rz = 0;
  #precision = 1;
  #isDragging = false;
  #isShiftHeld = false;
  #cube = null;
  #container = null;
  #boundKeyDown = null;
  #boundKeyUp = null;
  #boundContainerPointerDown = (e) => this.#startDrag(e);
  #eventAbort = null;
  #fields = [];
  #fieldInputs = {};
  #fieldInputHandlers = {};

  static get observedAttributes() {
    return [
      "value",
      "default-x",
      "default-y",
      "default-z",
      "precision",
      "aspect-ratio",
      "fields",
      "perspective",
      "perspective-origin",
      "transform-origin",
      "selected",
      "drag",
    ];
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "1");
    figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
    figSyncCssVar(this, "--perspective", this.getAttribute("perspective"));
    figSyncCssVar(
      this,
      "--perspective-origin",
      this.getAttribute("perspective-origin"),
    );
    this.#syncTransformOrigin(this.getAttribute("transform-origin"));
    this.#parseFields(this.getAttribute("fields"));
    const val = this.getAttribute("value");
    if (val) this.#parseValue(val);
    if (this.querySelector(".fig-3d-rotate-container")) {
      this.#reuseRenderedMarkup();
    } else {
      this.#render();
    }
    this.#syncSelected(this.getAttribute("selected"));
    this.#syncDragState();
  }

  disconnectedCallback() {
    this.#isDragging = false;
    this.#teardownEvents();
  }

  #reuseRenderedMarkup() {
    this.#container = this.querySelector(".fig-3d-rotate-container");
    this.#cube = this.querySelector(".fig-3d-rotate-cube");
    this.#wireFieldInputs();
    this.#updateCube();
    this.#setupEvents();
  }

  #teardownEvents() {
    this.#eventAbort?.abort();
    this.#eventAbort = null;
    if (this.#boundKeyDown) {
      window.removeEventListener("keydown", this.#boundKeyDown);
      window.removeEventListener("keyup", this.#boundKeyUp);
      this.#boundKeyDown = null;
      this.#boundKeyUp = null;
    }
  }

  #syncTransformOrigin(value) {
    if (!value || !value.trim()) {
      this.style.removeProperty("--transform-origin");
      return;
    }
    const parts = value.trim().split(/\s+/);
    if (parts.length === 2) {
      this.style.setProperty(
        "--transform-origin",
        `${parts[0]} ${parts[1]} -50cqi`,
      );
    } else {
      this.style.setProperty("--transform-origin", value.trim());
    }
  }

  #syncDragState() {
    if (!this.#container) return;
    this.#container.style.cursor = this.#dragEnabled ? "" : "default";
  }

  #syncSelected(value) {
    if (!this.#cube) return;
    const faces = this.#cube.querySelectorAll(".fig-3d-rotate-face");
    const name = value ? value.trim().toLowerCase() : "";
    for (const face of faces) {
      face.classList.toggle(
        "selected",
        name !== "" && face.classList.contains(name),
      );
    }
  }

  #parseFields(str) {
    if (!str || !str.trim()) {
      this.#fields = [];
      return;
    }
    const valid = ["rotateX", "rotateY", "rotateZ"];
    this.#fields = str
      .split(",")
      .map((s) => s.trim())
      .filter((s) => valid.includes(s));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      return;
    }
    if (name === "perspective") {
      figSyncCssVar(this, "--perspective", newValue);
      return;
    }
    if (name === "perspective-origin") {
      figSyncCssVar(this, "--perspective-origin", newValue);
      return;
    }
    if (name === "transform-origin") {
      this.#syncTransformOrigin(newValue);
      return;
    }
    if (name === "selected") {
      this.#syncSelected(newValue);
      return;
    }
    if (name === "drag") {
      this.#syncDragState();
      return;
    }
    if (name === "fields") {
      this.#parseFields(newValue);
      if (this.#cube) this.#render();
      return;
    }
    if (name === "default-x" || name === "default-y" || name === "default-z") {
      this.#syncFieldDefaults();
      return;
    }
    if (!this.#cube) return;
    if (name === "value" && newValue) {
      if (this.#isDragging) return;
      this.#parseValue(newValue);
      this.#updateCube();
      this.#syncFieldInputs();
    }
    if (name === "precision") {
      this.#precision = parseInt(newValue || "1");
    }
  }

  get value() {
    const p = this.#precision;
    return `rotateX(${this.#rx.toFixed(p)}deg) rotateY(${this.#ry.toFixed(p)}deg) rotateZ(${this.#rz.toFixed(p)}deg)`;
  }

  set value(v) {
    this.setAttribute("value", v);
  }

  get default() {
    return {
      x: this.#defaultAxisValue("x"),
      y: this.#defaultAxisValue("y"),
      z: this.#defaultAxisValue("z"),
    };
  }

  set default(value) {
    const next = value && typeof value === "object" ? value : {};
    for (const axis of ["x", "y", "z"]) {
      const axisValue = next[axis];
      if (axisValue === null || axisValue === undefined || axisValue === "") {
        this.removeAttribute(`default-${axis}`);
      } else {
        this.setAttribute(`default-${axis}`, String(axisValue));
      }
    }
  }

  get defaultValue() {
    return { ...this.default };
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    const axisInputs = [
      this.#fieldInputs.rotateX,
      this.#fieldInputs.rotateY,
      this.#fieldInputs.rotateZ,
    ];
    if (axisInputs.every(Boolean)) {
      return axisInputs.every((input) => input.isDefault);
    }
    const defaults = this.default;
    return (
      figValuesEqual(this.#rx, defaults.x) &&
      figValuesEqual(this.#ry, defaults.y) &&
      figValuesEqual(this.#rz, defaults.z)
    );
  }

  resetToDefault() {
    if (figBooleanAttribute(this, "disabled") || this.isDefault) return;
    const defaults = this.default;
    this.#rx = defaults.x;
    this.#ry = defaults.y;
    this.#rz = defaults.z;
    this.setAttribute("value", this.value);
    this.#updateCube();
    this.#syncFieldInputs();
    this.#emit("input");
    this.#emit("change");
  }

  get rotateX() {
    return this.#rx;
  }
  get rotateY() {
    return this.#ry;
  }
  get rotateZ() {
    return this.#rz;
  }

  #parseValue(str) {
    const rxMatch = str.match(/rotateX\(\s*(-?[\d.]+)\s*deg\s*\)/);
    const ryMatch = str.match(/rotateY\(\s*(-?[\d.]+)\s*deg\s*\)/);
    const rzMatch = str.match(/rotateZ\(\s*(-?[\d.]+)\s*deg\s*\)/);
    if (rxMatch) this.#rx = parseFloat(rxMatch[1]);
    if (ryMatch) this.#ry = parseFloat(ryMatch[1]);
    if (rzMatch) this.#rz = parseFloat(rzMatch[1]);
  }

  #render() {
    const axisLabels = { rotateX: "X", rotateY: "Y", rotateZ: "Z" };
    const axisValues = {
      rotateX: this.#rx,
      rotateY: this.#ry,
      rotateZ: this.#rz,
    };
    const cube = figCreateElement(
      "div",
      { className: "fig-3d-rotate-cube" },
      ["front", "back", "right", "left", "top", "bottom"].map((face) =>
        figCreateElement("div", {
          className: `fig-3d-rotate-face ${face}`,
        }),
      ),
    );
    const container = figCreateElement(
      "div",
      {
        className: "fig-3d-rotate-container",
        tabindex: "0",
      },
      figCreateElement(
        "div",
        { className: "fig-3d-rotate-scene" },
        cube,
      ),
    );
    const fields = this.#fields.map((axis) =>
      figCreateElement(
        "fig-input-number",
        {
          name: axis,
          step: "1",
          precision: "1",
          value: axisValues[axis],
          default: this.#defaultAxisValue(axis.at(-1).toLowerCase()),
          units: "°",
        },
        figCreateElement("span", { slot: "prepend" }, axisLabels[axis]),
      ),
    );

    this.replaceChildren(container, ...fields);
    this.#container = container;
    this.#cube = cube;
    this.#wireFieldInputs();
    this.#updateCube();
    this.#setupEvents();
  }

  #wireFieldInputs() {
    this.#fieldInputs = {};
    for (const axis of this.#fields) {
      const input = this.querySelector(`fig-input-number[name="${axis}"]`);
      if (!input) continue;
      this.#fieldInputs[axis] = input;
      if (!this.#fieldInputHandlers[axis]) {
        this.#fieldInputHandlers[axis] = (e) => {
          e.stopPropagation();
          const val = parseFloat(e.target.value);
          if (isNaN(val)) return;
          if (axis === "rotateX") this.#rx = val;
          else if (axis === "rotateY") this.#ry = val;
          else if (axis === "rotateZ") this.#rz = val;
          this.#updateCube();
          this.#emit(e.type);
        };
      }
      const handler = this.#fieldInputHandlers[axis];
      input.removeEventListener("input", handler);
      input.removeEventListener("change", handler);
      input.addEventListener("input", handler);
      input.addEventListener("change", handler);
    }
    this.#syncFieldDefaults();
  }

  #syncFieldInputs() {
    const axisValues = {
      rotateX: this.#rx,
      rotateY: this.#ry,
      rotateZ: this.#rz,
    };
    for (const axis of this.#fields) {
      const input = this.#fieldInputs[axis];
      if (input)
        input.setAttribute("value", axisValues[axis].toFixed(this.#precision));
    }
  }

  #defaultAxisValue(axis) {
    const value = Number(this.getAttribute(`default-${axis}`));
    return Number.isFinite(value) ? value : 0;
  }

  #syncFieldDefaults() {
    for (const [field, axis] of [
      ["rotateX", "x"],
      ["rotateY", "y"],
      ["rotateZ", "z"],
    ]) {
      const input = this.#fieldInputs[field];
      if (input) input.default = this.#defaultAxisValue(axis);
    }
  }

  #updateCube() {
    if (!this.#cube) return;
    this.#cube.style.transform = `rotateX(${this.#rx}deg) rotateY(${this.#ry}deg) rotateZ(${this.#rz}deg)`;
  }

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          value: this.value,
          rotateX: this.#rx,
          rotateY: this.#ry,
          rotateZ: this.#rz,
        },
      }),
    );
  }

  #snapToIncrement(angle) {
    if (!this.#isShiftHeld) return angle;
    return Math.round(angle / 15) * 15;
  }

  #setupEvents() {
    this.#teardownEvents();
    if (!this.#container) return;
    this.#eventAbort = new AbortController();
    this.#container.addEventListener("pointerdown", this.#boundContainerPointerDown, {
      signal: this.#eventAbort.signal,
    });
    this.#boundKeyDown = (e) => {
      if (e.key === "Shift") this.#isShiftHeld = true;
    };
    this.#boundKeyUp = (e) => {
      if (e.key === "Shift") this.#isShiftHeld = false;
    };
    window.addEventListener("keydown", this.#boundKeyDown);
    window.addEventListener("keyup", this.#boundKeyUp);
  }

  get #dragEnabled() {
    const attr = this.getAttribute("drag");
    return attr === null || attr.toLowerCase() !== "false";
  }

  #startDrag(e) {
    if (!this.#dragEnabled) return;
    e.preventDefault();
    this.#isDragging = true;
    this.#container.classList.add("dragging");
    this.#container.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startRx = this.#rx;
    const startRy = this.#ry;

    const onMove = (e) => {
      if (!this.#isDragging) return;
      if (e.buttons === 0) {
        onEnd();
        return;
      }
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.#ry = this.#snapToIncrement(startRy + dx * 0.5);
      this.#rx = this.#snapToIncrement(startRx - dy * 0.5);
      this.#updateCube();
      this.#syncFieldInputs();
      this.setAttribute("value", this.value);
      this.#emit("input");
    };

    const onEnd = () => {
      if (!this.#isDragging) return;
      this.setAttribute("value", this.value);
      this.#isDragging = false;
      this.#container.classList.remove("dragging");
      this.#container.removeEventListener("pointermove", onMove);
      this.#container.removeEventListener("pointerup", onEnd);
      this.#container.removeEventListener("pointercancel", onEnd);
      this.#container.removeEventListener("lostpointercapture", onEnd);
      this.#emit("change");
    };

    this.#container.addEventListener("pointermove", onMove);
    this.#container.addEventListener("pointerup", onEnd);
    this.#container.addEventListener("pointercancel", onEnd);
    this.#container.addEventListener("lostpointercapture", onEnd);
  }
}
figDefineElement("fig-3d-rotate", Fig3DRotate);

export { Fig3DRotate };
