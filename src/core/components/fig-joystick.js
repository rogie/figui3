/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figCreateElement,
  figDefineElement,
  figNextFrame,
  figSyncCssVar,
} from "../runtime/index.js";

/**
 * A custom joystick input element.
 * @attr {string} value - The current position of the joystick (e.g., "50% 50%").
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {number} transform - A scaling factor for the output.
 * @attr {boolean} fields - Whether to display X and Y inputs.
 * @attr {string} aspect-ratio - Aspect ratio for the joystick plane container.
 * @attr {string} axis-labels - Comma- or space-delimited labels. 1 token: top. 2 tokens: x y. 4 tokens: left right top bottom.
 */
class FigInputJoystick extends HTMLElement {
  #boundPlanePointerDown = null;
  #boundHandlePointerDown = null;
  #boundHandleInput = null;
  #boundHandleChange = null;
  #boundXInput = null;
  #boundYInput = null;
  #boundXFocusOut = null;
  #boundYFocusOut = null;
  #isSyncingValueAttr = false;
  #defaultPosition = { x: 0.5, y: 0.5 };
  #initialized = false;

  constructor() {
    super();

    this.position = { x: 0.5, y: 0.5 };
    this.isDragging = false;
    this.plane = null;
    this.cursor = null;
    this.xInput = null;
    this.yInput = null;
    this.coordinates = "screen";
    this.#boundPlanePointerDown = (e) => this.#handlePlanePointerDown(e);
    this.#boundHandlePointerDown = () => {
      this.isDragging = true;
      this.plane?.classList.add("dragging");
    };
    this.#boundHandleInput = (e) => this.#handleHandleInput(e);
    this.#boundHandleChange = () => this.#handleHandleChange();
    this.#boundXInput = (e) => this.#handleXInput(e);
    this.#boundYInput = (e) => this.#handleYInput(e);
    this.#boundXFocusOut = () => this.#handleFieldFocusOut();
    this.#boundYFocusOut = () => this.#handleFieldFocusOut();
  }

  #reuseRenderedMarkup() {
    this.#setupListeners();
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#syncResetButton();
    this.#initialized = true;
  }

  connectedCallback() {
    figNextFrame(this, () => {
      this.precision = this.getAttribute("precision") || 3;
      this.precision = parseInt(this.precision);
      this.transform = this.getAttribute("transform") || 1;
      this.transform = Number(this.transform);
      this.coordinates = this.getAttribute("coordinates") || "screen";
      figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
      if (!this.hasAttribute("value")) {
        this.setAttribute("value", "50% 50%");
      }

      if (this.querySelector(".fig-input-joystick-plane")) {
        this.#reuseRenderedMarkup();
        return;
      }

      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
      this.#syncValueAttribute();
      this.#syncResetButton();
      this.#initialized = true;
    });
  }

  // Convert Y for display (CSS uses top-down, math uses bottom-up)
  #displayY(y) {
    return this.coordinates === "math" ? 1 - y : y;
  }

  disconnectedCallback() {
    this.#cleanupListeners();
  }

  get #fieldsEnabled() {
    const fields = this.getAttribute("fields");
    if (fields === null) return false;
    return fields.toLowerCase() !== "false";
  }

  #render() {
    const axisLabels = this.#getAxisLabels();
    const planeContainer = figCreateElement("div", {
      className: "fig-input-joystick-plane-container",
    });
    const createAxisLabel = (position, text) =>
      text
        ? figCreateElement(
            "label",
            {
              className: [
                "fig-joystick-axis-label",
                position,
                Array.from(text).length === 1 ? "single-character" : "",
              ]
                .filter(Boolean)
                .join(" "),
              "aria-hidden": "true",
            },
            text,
          )
        : null;
    planeContainer.append(
      ...[
        createAxisLabel("left", axisLabels.left),
        createAxisLabel("right", axisLabels.right),
        createAxisLabel("top", axisLabels.top),
        createAxisLabel("bottom", axisLabels.bottom),
      ].filter(Boolean),
    );

    const plane = figCreateElement(
      "div",
      { className: "fig-input-joystick-plane" },
      [
        figCreateElement("div", {
          className: "fig-input-joystick-guides",
        }),
        figCreateElement("fig-handle", {
          drag: true,
          "drag-surface": ".fig-input-joystick-plane",
          "drag-axes": "x,y",
          "drag-snapping": "modifier",
        }),
      ],
    );
    const reset = figCreateElement(
      "fig-tooltip",
      { text: "Reset" },
      figCreateElement(
        "fig-button",
        {
          variant: "ghost",
          icon: "true",
          className: "fig-joystick-reset",
          "aria-label": "Reset to default",
        },
        createFigIcon("reset", { size: "small" }),
      ),
    );
    planeContainer.append(plane, reset);

    const children = [planeContainer];
    if (this.#fieldsEnabled) {
      const createValueInput = (name, value) =>
        figCreateElement(
          "fig-input-number",
          {
            name,
            step: "1",
            value,
            min: "0",
            max: "100",
            steppers: "false",
            units: "%",
          },
          figCreateElement("span", { slot: "prepend" }, name.toUpperCase()),
        );
      children.push(
        figCreateElement("div", { className: "joystick-values" }, [
          createValueInput(
            "x",
            (this.position.x * 100).toFixed(this.precision),
          ),
          createValueInput(
            "y",
            (this.position.y * 100).toFixed(this.precision),
          ),
        ]),
      );
    }
    this.replaceChildren(...children);
  }

  #getAxisLabels() {
    const raw = (this.getAttribute("axis-labels") || "").trim();
    if (!raw) {
      return { left: "", right: "", top: "", bottom: "" };
    }
    const tokens = raw.split(/[\s,]+/).filter(Boolean);
    if (tokens.length === 1) {
      return {
        left: "",
        right: "",
        top: tokens[0],
        bottom: "",
      };
    }
    if (tokens.length === 2) {
      const [x, y] = tokens;
      return { left: x, right: "", top: "", bottom: y };
    }
    if (tokens.length === 4) {
      const [left, right, top, bottom] = tokens;
      return { left, right, top, bottom };
    }
    return { left: "", right: "", top: "", bottom: "" };
  }

  #setupListeners() {
    this.plane = this.querySelector(".fig-input-joystick-plane");
    this.cursor = this.querySelector("fig-handle");
    this.xInput = this.querySelector("fig-input-number[name='x']");
    this.yInput = this.querySelector("fig-input-number[name='y']");
    this.xInput?.setAttribute("steppers", "false");
    this.yInput?.setAttribute("steppers", "false");
    this.plane?.addEventListener("pointerdown", this.#boundPlanePointerDown);
    this.cursor?.addEventListener("pointerdown", this.#boundHandlePointerDown);
    this.cursor?.addEventListener("input", this.#boundHandleInput);
    this.cursor?.addEventListener("change", this.#boundHandleChange);
    const resetBtn = this.querySelector(".fig-joystick-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.#resetToDefault());
    }
    if (this.#fieldsEnabled && this.xInput && this.yInput) {
      this.xInput.addEventListener("input", this.#boundXInput);
      this.xInput.addEventListener("change", this.#boundXInput);
      this.xInput.addEventListener("focusout", this.#boundXFocusOut);
      this.yInput.addEventListener("input", this.#boundYInput);
      this.yInput.addEventListener("change", this.#boundYInput);
      this.yInput.addEventListener("focusout", this.#boundYFocusOut);
    }
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("pointerdown", this.#boundPlanePointerDown);
    this.cursor?.removeEventListener(
      "pointerdown",
      this.#boundHandlePointerDown,
    );
    this.cursor?.removeEventListener("input", this.#boundHandleInput);
    this.cursor?.removeEventListener("change", this.#boundHandleChange);
    this.plane?.classList.remove("dragging");
    this.isDragging = false;
    if (this.#fieldsEnabled && this.xInput && this.yInput) {
      this.xInput.removeEventListener("input", this.#boundXInput);
      this.xInput.removeEventListener("change", this.#boundXInput);
      this.xInput.removeEventListener("focusout", this.#boundXFocusOut);
      this.yInput.removeEventListener("input", this.#boundYInput);
      this.yInput.removeEventListener("change", this.#boundYInput);
      this.yInput.removeEventListener("focusout", this.#boundYFocusOut);
    }
  }

  #handleXInput(e) {
    const next = Number.parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;
    this.position.x = Math.max(0, Math.min(1, next / 100));
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#emitInputEvent();
  }

  #handleYInput(e) {
    const next = Number.parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;
    this.position.y = Math.max(0, Math.min(1, next / 100));
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#emitInputEvent();
  }

  #handleFieldFocusOut() {
    this.#syncValueAttribute();
    this.#emitChangeEvent();
  }

  #applyScreenPosition(screenX, screenY, { syncHandle = true } = {}) {
    const x = Math.max(0, Math.min(1, screenX));
    const yScreen = Math.max(0, Math.min(1, screenY));
    const y = this.coordinates === "math" ? 1 - yScreen : yScreen;
    this.position = { x, y };
    if (syncHandle) this.#syncHandlePosition();
    this.#syncFields();
    this.#syncValueAttribute();
  }

  #handlePlanePointerDown(e) {
    if (!this.plane || !this.cursor) return;
    if (e.target?.closest?.(".fig-joystick-reset, fig-tooltip, fig-handle"))
      return;
    const rect = this.plane.getBoundingClientRect();
    const screenX = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    const screenY =
      rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
    this.cursor.value = `${Math.round(screenX * 100)}% ${Math.round(screenY * 100)}%`;
    this.#applyScreenPosition(screenX, screenY, { syncHandle: false });
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleHandleInput(e) {
    const detail = e.detail ?? {};
    if (typeof detail.px !== "number" || typeof detail.py !== "number") return;
    this.#applyScreenPosition(detail.px, detail.py, { syncHandle: false });
    this.#emitInputEvent();
  }

  #handleHandleChange() {
    this.isDragging = false;
    this.plane?.classList.remove("dragging");
    this.#syncValueAttribute();
    this.#emitChangeEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, x: this.position.x, y: this.position.y },
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, x: this.position.x, y: this.position.y },
      }),
    );
  }

  #syncHandlePosition() {
    const displayY = this.#displayY(this.position.y);
    if (this.cursor) {
      this.cursor.value = `${this.position.x * 100}% ${displayY * 100}%`;
    }
    this.#syncFields();
  }

  // Sync the X/Y number fields to the current position (percentage 0-100).
  #syncFields() {
    if (this.#fieldsEnabled && this.xInput && this.yInput) {
      this.xInput.setAttribute("value", Math.round(this.position.x * 100));
      this.yInput.setAttribute("value", Math.round(this.position.y * 100));
    }
  }

  #syncValueAttribute() {
    const next = this.value;
    if (this.getAttribute("value") !== next) {
      this.#isSyncingValueAttr = true;
      this.setAttribute("value", next);
      this.#isSyncingValueAttr = false;
    }
    this.#syncResetButton();
  }

  #syncResetButton() {
    const d = this.#defaultPosition;
    const isDefault =
      Math.round(this.position.x * 100) === Math.round(d.x * 100) &&
      Math.round(this.position.y * 100) === Math.round(d.y * 100);
    this.toggleAttribute("default", isDefault);
    this.style.setProperty("--is-not-default", isDefault ? "0" : "1");
  }

  #resetToDefault() {
    this.position = { ...this.#defaultPosition };
    this.#syncHandlePosition();
    this.#syncValueAttribute();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  focus() {
    this.cursor?.focus();
  }
  static get observedAttributes() {
    return [
      "value",
      "precision",
      "transform",
      "fields",
      "coordinates",
      "aspect-ratio",
      "axis-labels",
    ];
  }
  get value() {
    return `${Math.round(this.position.x * 100)}% ${Math.round(this.position.y * 100)}%`;
  }
  set value(value) {
    const normalized = value == null ? "" : String(value).trim();
    if (!normalized) {
      this.position = { x: 0.5, y: 0.5 };
    } else {
      const parts = normalized.split(/[\s,]+/).filter(Boolean);
      const parseAxis = (token) => {
        if (!token) return 0.5;
        const isPercent = token.includes("%");
        const numeric = Number.parseFloat(token.replace(/%/g, "").trim());
        if (!Number.isFinite(numeric)) return 0.5;
        const decimal =
          isPercent || Math.abs(numeric) > 1 ? numeric / 100 : numeric;
        return Math.max(0, Math.min(1, decimal));
      };
      const x = parseAxis(parts[0]);
      const y = parseAxis(parts[1] ?? parts[0]);
      this.position = { x, y };
    }
    if (this.#initialized) {
      this.#syncHandlePosition();
      this.#syncResetButton();
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      return;
    }
    if (name === "value") {
      if (this.#isSyncingValueAttr || this.isDragging) return;
      this.value = newValue;
    }
    if (name === "precision") {
      this.precision = parseInt(newValue);
    }
    if (name === "transform") {
      this.transform = Number(newValue);
    }
    if (name === "fields" && newValue !== oldValue) {
      this.#cleanupListeners();
      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
    }
    if (name === "axis-labels" && newValue !== oldValue) {
      this.#cleanupListeners();
      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
    }
    if (name === "coordinates") {
      this.coordinates = newValue || "screen";
      this.#syncHandlePosition();
    }
  }
}

figDefineElement("fig-joystick", FigInputJoystick);

export { FigInputJoystick };
