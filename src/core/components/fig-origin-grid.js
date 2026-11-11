/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figCreateElement,
  figDefineElement,
  figSyncCssVar,
} from "../runtime/index.js";
import { figCreatePointerSession } from "../../shared/pointer-session.js";

/**
 * A transform-origin grid control with draggable handle.
 * @attr {string} value - CSS transform-origin pair, e.g. "50% 50%".
 * @attr {number} precision - Decimal places for percentage output (default 0).
 * @attr {boolean} drag - Enable handle dragging (default true).
 * @attr {boolean} fields - Show X/Y percentage fields when present/true (default false).
 */
class FigOriginGrid extends HTMLElement {
  #x = 50;
  #y = 50;
  #precision = 0;
  #grid = null;
  #cells = [];
  #handle = null;
  #xInput = null;
  #yInput = null;
  #isDragging = false;
  #isSyncingValueAttr = false;
  #activePointerId = null;
  #pointerSession = null;

  static SNAP_POINTS = [0, 16.6667, 33.3333, 50, 66.6667, 83.3333, 100];

  static get observedAttributes() {
    return ["value", "precision", "aspect-ratio", "drag", "fields"];
  }

  #reuseRenderedMarkup() {
    this.#grid = this.querySelector(".origin-grid");
    this.#cells = Array.from(this.querySelectorAll(".origin-grid-cell"));
    this.#handle = this.querySelector("fig-handle");
    this.#xInput = this.querySelector('fig-input-number[name="x"]');
    this.#yInput = this.querySelector('fig-input-number[name="y"]');
    this.#xInput?.setAttribute("steppers", "false");
    this.#yInput?.setAttribute("steppers", "false");
    this.#syncHandlePosition();
    this.#syncOverflowState();
    this.#syncValueInputs();
    this.#setupEvents();
  }

  connectedCallback() {
    this.#precision = parseInt(this.getAttribute("precision") || "0");
    figSyncCssVar(this, "--aspect-ratio", this.getAttribute("aspect-ratio"));
    this.#applyIncomingValue(this.getAttribute("value"));

    if (this.querySelector(".fig-origin-grid-surface")) {
      this.#reuseRenderedMarkup();
    } else {
      this.#render();
    }
    this.#syncDragState();
    this.#syncValueAttribute();
  }

  disconnectedCallback() {
    this.#detachHandleDragListeners();
    this.#teardownEvents();
  }

  get value() {
    const p = this.#precision;
    return `${this.#x.toFixed(p)}% ${this.#y.toFixed(p)}%`;
  }

  set value(v) {
    this.setAttribute("value", v);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "aspect-ratio") {
      figSyncCssVar(this, "--aspect-ratio", newValue);
      return;
    }
    if (name === "drag") {
      if (newValue !== null && newValue.toLowerCase() === "false") {
        this.#detachHandleDragListeners();
      }
      this.#syncDragState();
      return;
    }
    if (name === "fields") {
      this.#render();
      this.#syncDragState();
      this.#syncValueAttribute();
      return;
    }
    if (name === "precision") {
      this.#precision = parseInt(newValue || "0");
      this.#syncValueInputs();
      this.#syncValueAttribute();
      return;
    }
    if (name === "value") {
      if (this.#isSyncingValueAttr || this.#isDragging) return;
      this.#applyIncomingValue(newValue);
      this.#syncHandlePosition();
      this.#syncOverflowState();
      this.#syncValueInputs();
    }
  }

  get #dragEnabled() {
    const attr = this.getAttribute("drag");
    return attr === null || attr.toLowerCase() !== "false";
  }

  get #fieldsEnabled() {
    const attr = this.getAttribute("fields");
    if (attr === null) return false;
    return attr.toLowerCase() !== "false";
  }

  #syncDragState() {
    if (!this.#grid) return;
    this.#grid.classList.toggle("drag-disabled", !this.#dragEnabled);
  }

  #clampPercentage(value) {
    return Math.max(0, Math.min(100, value));
  }

  #parseAxisValue(raw, axis) {
    const token = (raw || "").trim().toLowerCase();
    if (!token) return axis === "x" ? this.#x : this.#y;

    const keywordMap =
      axis === "x"
        ? { left: 0, center: 50, right: 100 }
        : { top: 0, center: 50, bottom: 100 };
    if (token in keywordMap) return keywordMap[token];

    const numeric = Number.parseFloat(token.replace("%", ""));
    if (Number.isFinite(numeric)) return numeric;

    return axis === "x" ? this.#x : this.#y;
  }

  #parseValue(value) {
    const parts = value.trim().replace(/,/g, " ").split(/\s+/).filter(Boolean);
    if (parts.length < 1) return;

    if (parts.length === 1) {
      const same = this.#parseAxisValue(parts[0], "x");
      this.#x = same;
      this.#y = same;
      return;
    }

    this.#x = this.#parseAxisValue(parts[0], "x");
    this.#y = this.#parseAxisValue(parts[1], "y");
  }

  #applyIncomingValue(value) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      this.#x = 50;
      this.#y = 50;
      return;
    }
    this.#parseValue(normalized);
  }

  #render() {
    const cells = Array.from({ length: 9 }, (_, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return figCreateElement(
        "span",
        {
          className: "origin-grid-cell",
          "data-col": col,
          "data-row": row,
        },
        figCreateElement("span", { className: "origin-grid-dot" }),
      );
    });

    const xValue = this.#x.toFixed(this.#precision);
    const yValue = this.#y.toFixed(this.#precision);
    const handle = document.createElement("fig-handle");
    const grid = figCreateElement(
      "div",
      {
        className: "origin-grid",
        "aria-label": "Transform origin grid",
      },
      [
        figCreateElement(
          "div",
          { className: "origin-grid-cells" },
          cells,
        ),
        handle,
      ],
    );
    const surface = figCreateElement(
      "div",
      { className: "fig-origin-grid-surface" },
      grid,
    );
    const rendered = [surface];
    if (this.#fieldsEnabled) {
      const createValueInput = (name, value) =>
        figCreateElement(
          "fig-input-number",
          {
            name,
            value,
            step: "1",
            steppers: "false",
            units: "%",
          },
          figCreateElement("span", { slot: "prepend" }, name.toUpperCase()),
        );
      rendered.push(
        figCreateElement("div", { className: "origin-values" }, [
          createValueInput("x", xValue),
          createValueInput("y", yValue),
        ]),
      );
    }

    this.replaceChildren(...rendered);
    this.#grid = grid;
    this.#cells = cells;
    this.#handle = handle;
    this.#xInput = this.querySelector('fig-input-number[name="x"]');
    this.#yInput = this.querySelector('fig-input-number[name="y"]');
    this.#syncHandlePosition();
    this.#syncOverflowState();
    this.#syncValueInputs();
    this.#setupEvents();
  }

  #syncValueInputs() {
    const xValue = this.#x.toFixed(this.#precision);
    const yValue = this.#y.toFixed(this.#precision);
    if (this.#xInput) {
      this.#xInput.setAttribute("value", xValue);
    }
    if (this.#yInput) {
      this.#yInput.setAttribute("value", yValue);
    }
  }

  #syncValueAttribute() {
    const next = this.value;
    if (this.getAttribute("value") === next) return;
    this.#isSyncingValueAttr = true;
    this.setAttribute("value", next);
    this.#isSyncingValueAttr = false;
  }

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: {
          value: this.value,
          x: this.#x,
          y: this.#y,
        },
      }),
    );
  }

  #syncHandlePosition() {
    if (!this.#handle) return;
    // Constrain draggable visual bounds to the 3x3 dot centers.
    const toVisual = (value) =>
      16.6667 + (this.#clampPercentage(value) / 100) * 66.6667;
    this.#handle.style.left = `${toVisual(this.#x)}%`;
    this.#handle.style.top = `${toVisual(this.#y)}%`;
  }

  #syncOverflowState() {
    if (!this.#handle) return;
    const overflowX = this.#x < 0 || this.#x > 100;
    const overflowY = this.#y < 0 || this.#y > 100;
    const overflowLeft = this.#x < 0;
    const overflowRight = this.#x > 100;
    const overflowUp = this.#y < 0;
    const overflowDown = this.#y > 100;

    this.#handle.classList.toggle("beyond-bounds-x", overflowX);
    this.#handle.classList.toggle("beyond-bounds-y", overflowY);
    this.#handle.classList.toggle("overflow-left", overflowLeft);
    this.#handle.classList.toggle("overflow-right", overflowRight);
    this.#handle.classList.toggle("overflow-up", overflowUp);
    this.#handle.classList.toggle("overflow-down", overflowDown);
  }

  #gridCellFromClient(clientX, clientY) {
    if (!this.#grid) return null;
    const rect = this.#grid.getBoundingClientRect();
    const nx = (clientX - rect.left) / Math.max(rect.width, 1);
    const ny = (clientY - rect.top) / Math.max(rect.height, 1);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    const col = Math.max(0, Math.min(2, Math.floor(nx * 3)));
    const row = Math.max(0, Math.min(2, Math.floor(ny * 3)));
    return this.#cells.find(
      (cell) =>
        Number(cell.getAttribute("data-col")) === col &&
        Number(cell.getAttribute("data-row")) === row,
    );
  }

  #clearHoveredCells() {
    for (const cell of this.#cells) {
      cell.classList.remove("is-hovered");
    }
  }

  #setHoveredCell(cell) {
    this.#clearHoveredCells();
    if (cell) cell.classList.add("is-hovered");
  }

  #setFromPercent(x, y, eventType) {
    const nextX = Number(x);
    const nextY = Number(y);
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;
    if (nextX === this.#x && nextY === this.#y && eventType === "input") return;

    this.#x = nextX;
    this.#y = nextY;
    this.#syncHandlePosition();
    this.#syncOverflowState();
    this.#syncValueInputs();
    this.#syncValueAttribute();
    this.#emit(eventType);
  }

  #clientToPercent(clientX, clientY) {
    if (!this.#grid) return { x: this.#x, y: this.#y };
    const rect = this.#grid.getBoundingClientRect();
    const insetX = rect.width / 6;
    const insetY = rect.height / 6;
    const usableWidth = Math.max(1, rect.width - insetX * 2);
    const usableHeight = Math.max(1, rect.height - insetY * 2);
    const nx = (clientX - (rect.left + insetX)) / usableWidth;
    const ny = (clientY - (rect.top + insetY)) / usableHeight;
    return {
      x: nx * 100,
      y: ny * 100,
    };
  }

  #cellCenterFromClient(clientX, clientY) {
    if (!this.#grid) return { x: 50, y: 50 };
    const rect = this.#grid.getBoundingClientRect();
    const colRaw = ((clientX - rect.left) / Math.max(rect.width, 1)) * 3;
    const rowRaw = ((clientY - rect.top) / Math.max(rect.height, 1)) * 3;
    const col = Math.max(0, Math.min(2, Math.floor(colRaw)));
    const row = Math.max(0, Math.min(2, Math.floor(rowRaw)));
    return {
      x: col * 50,
      y: row * 50,
    };
  }

  #snapPercentage(value) {
    const threshold = 2.5;
    let closest = value;
    let closestDistance = Infinity;
    for (const point of FigOriginGrid.SNAP_POINTS) {
      const distance = Math.abs(value - point);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = point;
      }
    }
    return closestDistance <= threshold ? closest : value;
  }

  #maybeSnapPoint(point, shiftKey) {
    if (!shiftKey) return point;
    return {
      x: this.#snapPercentage(point.x),
      y: this.#snapPercentage(point.y),
    };
  }

  #moveHandleByKeyboard(event) {
    if (!this.#dragEnabled) return false;
    const step = event.shiftKey ? 10 : 1;
    let nextX = this.#x;
    let nextY = this.#y;

    switch (event.key) {
      case "ArrowLeft":
        nextX -= step;
        break;
      case "ArrowRight":
        nextX += step;
        break;
      case "ArrowUp":
        nextY -= step;
        break;
      case "ArrowDown":
        nextY += step;
        break;
      case "Home":
        nextX = 0;
        nextY = 0;
        break;
      case "End":
        nextX = 100;
        nextY = 100;
        break;
      default:
        return false;
    }

    this.#setFromPercent(
      this.#clampPercentage(nextX),
      this.#clampPercentage(nextY),
      "input",
    );
    this.#emit("change");
    return true;
  }

  #detachHandleDragListeners() {
    this.#pointerSession?.abort("disabled-or-disconnected");
    this.#pointerSession = null;
    this.#isDragging = false;
    this.#activePointerId = null;
    this.#grid?.classList.remove("is-dragging");
    this.#clearHoveredCells();
  }

  #startGridDrag(e) {
    if (!this.#grid || !this.#dragEnabled) return;
    e.preventDefault();
    this.#isDragging = true;
    this.#activePointerId = e.pointerId;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const dragThresholdPx = 3;
    const session = figCreatePointerSession({
      threshold: dragThresholdPx,
      listenerTarget: this.#grid,
      capture: true,
      onActivate: () => {
        this.#grid.classList.add("is-dragging");
        this.#clearHoveredCells();
      },
      onMove: ({ event: moveEvent }) => {
        const nextPoint = this.#maybeSnapPoint(
          this.#clientToPercent(moveEvent.clientX, moveEvent.clientY),
          moveEvent.shiftKey,
        );
        this.#setFromPercent(nextPoint.x, nextPoint.y, "input");
      },
      onCommit: ({ active }) => {
        if (!active) {
          // Click behavior: snap to the center of the clicked cell.
          const center = this.#cellCenterFromClient(startClientX, startClientY);
          this.#setFromPercent(center.x, center.y, "input");
        }
        this.#emit("change");
      },
      onFinish: () => {
        this.#isDragging = false;
        this.#activePointerId = null;
        this.#grid?.classList.remove("is-dragging");
        this.#clearHoveredCells();
        if (this.#pointerSession === session) this.#pointerSession = null;
      },
    });
    this.#pointerSession?.abort("replaced");
    this.#pointerSession = session;
    session.start(e, {
      target: this.#grid,
      captureTarget: this.#grid,
    });
  }

  #eventAbort = null;

  #teardownEvents() {
    this.#eventAbort?.abort();
    this.#eventAbort = null;
  }

  #setupEvents() {
    this.#teardownEvents();
    if (!this.#grid || !this.#handle) return;

    this.#eventAbort = new AbortController();
    const { signal } = this.#eventAbort;

    this.#grid.addEventListener(
      "pointerdown",
      (e) => {
        const hovered = this.#gridCellFromClient(e.clientX, e.clientY);
        this.#setHoveredCell(hovered);

        if (this.#dragEnabled) {
          this.#startGridDrag(e);
          return;
        }

        const center = this.#cellCenterFromClient(e.clientX, e.clientY);
        this.#setFromPercent(center.x, center.y, "input");
        this.#emit("change");
      },
      { signal },
    );

    this.#grid.addEventListener(
      "pointermove",
      (e) => {
        if (this.#isDragging) return;
        const hovered = this.#gridCellFromClient(e.clientX, e.clientY);
        this.#setHoveredCell(hovered);
      },
      { signal },
    );

    this.#grid.addEventListener(
      "pointerleave",
      () => {
        this.#clearHoveredCells();
      },
      { signal },
    );

    this.#handle.addEventListener(
      "keydown",
      (e) => {
        if (!this.#moveHandleByKeyboard(e)) return;
        e.preventDefault();
        e.stopPropagation();
      },
      { signal },
    );

    const bindValueInput = (inputEl, axis) => {
      if (!inputEl) return;
      const handle = (e) => {
        const next = Number.parseFloat(e.target.value);
        if (!Number.isFinite(next)) return;
        if (axis === "x") {
          this.#setFromPercent(next, this.#y, "input");
        } else {
          this.#setFromPercent(this.#x, next, "input");
        }
      };
      inputEl.addEventListener("input", handle, { signal });
      inputEl.addEventListener("change", handle, { signal });
      inputEl.addEventListener(
        "focusout",
        () => {
          this.#emit("change");
        },
        { signal },
      );
    };

    bindValueInput(this.#xInput, "x");
    bindValueInput(this.#yInput, "y");
  }
}
figDefineElement("fig-origin-grid", FigOriginGrid);

export { FigOriginGrid };
