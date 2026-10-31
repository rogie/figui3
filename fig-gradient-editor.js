/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";
import "./fig-property.js";
import { figConvertRGB, figHexToRGB } from "./fig-color.js";

const DEFAULT_GRADIENT = {
  type: "linear",
  angle: 180,
  centerX: 50,
  centerY: 50,
  interpolationSpace: "srgb",
  stops: [
    { position: 0, color: "#D9D9D9", opacity: 100 },
    { position: 100, color: "#737373", opacity: 100 },
  ],
};

function createElement(tagName, attributes = {}, children = []) {
  const element = document.createElement(tagName);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") element.className = String(value);
    else if (value === true) element.setAttribute(name, "");
    else element.setAttribute(name, String(value));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : String(child));
  }
  return element;
}

function createIcon(name) {
  return createElement("fig-icon", { name });
}

function normalizeStop(stop, index) {
  return {
    position: Number.isFinite(Number(stop?.position))
      ? Math.max(0, Math.min(100, Number(stop.position)))
      : index * 100,
    color: normalizeHex(stop?.color),
    opacity: Number.isFinite(Number(stop?.opacity))
      ? Math.max(0, Math.min(100, Number(stop.opacity)))
      : 100,
  };
}

function normalizeHex(color) {
  const hex = String(color || "#888888")
    .replace(/^#/, "")
    .slice(0, 6);
  return /^[0-9A-Fa-f]{6}$/.test(hex)
    ? `#${hex.toUpperCase()}`
    : "#888888";
}

function stopsSemanticallyEqual(a, b) {
  return (
    Number(a?.position) === Number(b?.position) &&
    normalizeHex(a?.color) === normalizeHex(b?.color) &&
    Number(a?.opacity ?? 100) === Number(b?.opacity ?? 100)
  );
}

function stableSemanticValue(value) {
  if (Array.isArray(value)) return value.map(stableSemanticValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, stableSemanticValue(value[key])]),
  );
}

function gradientsSemanticallyEqual(a, b) {
  return (
    !!a &&
    !!b &&
    JSON.stringify(stableSemanticValue(a)) ===
      JSON.stringify(stableSemanticValue(b))
  );
}

function cloneStops(stops) {
  return stops.map((stop) => ({ ...stop }));
}

function matchUnchangedStops(previous, next) {
  const rows = previous.length;
  const columns = next.length;
  const lengths = Array.from({ length: rows + 1 }, () =>
    Array(columns + 1).fill(0),
  );
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      lengths[i][j] = stopsSemanticallyEqual(previous[i], next[j])
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const matches = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (stopsSemanticallyEqual(previous[i], next[j])) {
      matches.push([i, j]);
      i += 1;
      j += 1;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return matches;
}

export function normalizeGradientEditorValue(value) {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }
  if (parsed?.type === "gradient" && parsed.gradient) {
    parsed = parsed.gradient;
  }
  const source = parsed && typeof parsed === "object" ? parsed : {};
  const stops = Array.isArray(source.stops)
    ? source.stops.map(normalizeStop)
    : DEFAULT_GRADIENT.stops.map((stop) => ({ ...stop }));
  return {
    ...DEFAULT_GRADIENT,
    ...source,
    type: ["linear", "radial", "angular"].includes(source.type)
      ? source.type
      : "linear",
    angle: Number.isFinite(Number(source.angle))
      ? Number(source.angle)
      : DEFAULT_GRADIENT.angle,
    centerX: Number.isFinite(Number(source.centerX))
      ? Number(source.centerX)
      : DEFAULT_GRADIENT.centerX,
    centerY: Number.isFinite(Number(source.centerY))
      ? Number(source.centerY)
      : DEFAULT_GRADIENT.centerY,
    interpolationSpace: "srgb",
    stops:
      stops.length >= 2
        ? stops
        : DEFAULT_GRADIENT.stops.map((stop) => ({ ...stop })),
  };
}

function colorValue(hex, alpha, colorSpace) {
  const { r, g, b } = figHexToRGB(hex);
  if (colorSpace === "display-p3") {
    const p3 = figConvertRGB(r, g, b, {
      from: "srgb",
      to: "display-p3",
    });
    return `color(display-p3 ${+(p3.r / 255).toFixed(4)} ${+(p3.g / 255).toFixed(4)} ${+(p3.b / 255).toFixed(4)} / ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function figGradientCSS(value, { colorSpace = "srgb" } = {}) {
  const gradient = normalizeGradientEditorValue(value);
  const stops = gradient.stops
    .map(
      (stop) =>
        `${colorValue(
          stop.color,
          (stop.opacity ?? 100) / 100,
          colorSpace,
        )} ${stop.position}%`,
    )
    .join(", ");
  switch (gradient.type) {
    case "radial":
      return `radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%, ${stops})`;
    case "angular":
      return `conic-gradient(from ${gradient.angle}deg, ${stops})`;
    default:
      return `linear-gradient(${gradient.angle}deg, ${stops})`;
  }
}

/**
 * Reusable full gradient editor used by fig-fill-picker.
 *
 * @element fig-gradient-editor
 * @attr {string} value - JSON gradient config or full gradient fill value
 * @attr {string} color-space - `srgb` or `display-p3`
 * @attr {boolean} disabled - Disables all editing
 * @attr {"fade"|"visible"} overflow - Stop-list overflow mode (default: fade)
 * @attr {number} show-rows - Visible stop rows before overflow (default: 6.5)
 * @fires input - During edits with `{ type, gradient, css }`
 * @fires change - On committed edits with `{ type, gradient, css }`
 */
class FigGradientEditor extends HTMLElement {
  #gradient = normalizeGradientEditorValue();
  #syncingValue = false;
  #syncingBar = false;
  #pickerAnchor = null;
  #mounted = false;
  #gradientType = null;
  #gradientBar = null;
  #reorder = null;
  #flipButton = null;
  #rotateButton = null;
  #addButton = null;
  #stopRows = [];
  #renderedStops = [];
  #selectedStopRow = null;
  #pointerInteractionActive = false;
  #deferredExternalGradient = null;

  static get observedAttributes() {
    return ["value", "color-space", "disabled", "overflow", "show-rows"];
  }

  get value() {
    return structuredClone(this.#gradient);
  }

  set value(value) {
    this.setAttribute(
      "value",
      typeof value === "string" ? value : JSON.stringify(value ?? {}),
    );
  }

  get cssValue() {
    return figGradientCSS(this.#gradient, {
      colorSpace: this.getAttribute("color-space") || "srgb",
    });
  }

  get pickerAnchor() {
    return this.#pickerAnchor;
  }

  set pickerAnchor(value) {
    this.#pickerAnchor = value instanceof Element ? value : null;
    this.#syncNestedPickerAnchors();
  }

  connectedCallback() {
    const incoming = normalizeGradientEditorValue(this.getAttribute("value"));
    if (!gradientsSemanticallyEqual(this.#gradient, incoming)) {
      this.#gradient = incoming;
    }
    this.#mount();
    this.#sync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#syncingValue) return;
    if (name === "value") {
      const incoming = normalizeGradientEditorValue(newValue);
      if (gradientsSemanticallyEqual(this.#gradient, incoming)) {
        if (this.#pointerInteractionActive) {
          this.#deferredExternalGradient = null;
        }
        return;
      }
      if (this.#pointerInteractionActive) {
        this.#deferredExternalGradient = incoming;
        return;
      }
      this.#deferredExternalGradient = null;
      this.#gradient = incoming;
    }
    if (this.isConnected && this.#mounted) this.#sync();
  }

  disconnectedCallback() {
    this.#endPointerInteraction({ reconcile: false });
    if (this.#deferredExternalGradient) {
      this.#gradient = this.#deferredExternalGradient;
      this.#deferredExternalGradient = null;
      this.#reflectValue();
    }
  }

  refreshLayout() {
    this.#gradientBar?.refreshLayout?.();
  }

  #disabled() {
    return (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    );
  }

  #overflowMode() {
    return this.getAttribute("overflow") === "visible" ? "visible" : "fade";
  }

  #showRows() {
    const value = Number(this.getAttribute("show-rows"));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  #reflectValue() {
    this.#syncingValue = true;
    this.setAttribute("value", JSON.stringify(this.#gradient));
    this.#syncingValue = false;
  }

  #detail() {
    return {
      type: "gradient",
      gradient: this.value,
      css: this.cssValue,
    };
  }

  #emit(type) {
    this.#reflectValue();
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: this.#detail(),
      }),
    );
  }

  #mount() {
    if (this.#mounted) return;
    this.#gradientType = createElement(
      "fig-select",
      {
        className: "fig-fill-picker-gradient-type",
        label: "Gradient type",
        variant: "ghost",
      },
      createElement(
        "fig-select-options",
        {},
        [
          ["linear", "Linear"],
          ["radial", "Radial"],
          ["angular", "Angular"],
        ].map(([value, label]) =>
          createElement("fig-select-option", { value }, label),
        ),
      ),
    );
    const action = (label, className, icon) => {
      const button = createElement(
        "fig-button",
        {
          icon: true,
          variant: "ghost",
          className,
          "aria-label": label,
        },
        createIcon(icon),
      );
      return {
        button,
        tooltip: createElement(
          "fig-tooltip",
          { text: label },
          button,
        ),
      };
    };
    const flipAction = action(
      "Flip gradient",
      "fig-fill-picker-gradient-flip",
      "swap",
    );
    const rotateAction = action(
      "Rotate gradient",
      "fig-fill-picker-gradient-rotate",
      "rotate",
    );
    this.#flipButton = flipAction.button;
    this.#rotateButton = rotateAction.button;
    const header = createElement(
      "fig-header",
      {
        className: "fig-fill-picker-gradient-header",
        borderless: true,
        compact: true,
      },
      [
        this.#gradientType,
        createElement(
          "fig-stack",
          {
            className: "fig-fill-picker-gradient-actions",
            gap: "1",
          },
          [flipAction.tooltip, rotateAction.tooltip],
        ),
      ],
    );
    this.#gradientBar = createElement("fig-input-gradient", {
      className: "fig-fill-picker-gradient-bar-input",
      "aria-label": "Gradient stops",
      edit: "true",
      mode: "tip",
      size: "large",
    });
    const preview = createElement(
      "fig-preview",
      { className: "fig-fill-picker-gradient-preview" },
      this.#gradientBar,
    );
    this.#addButton = createElement(
      "fig-button",
      {
        icon: true,
        variant: "ghost",
        className: "fig-fill-picker-gradient-add",
        "aria-label": "Add gradient stop",
        title: "Add stop",
      },
      createIcon("add"),
    );
    this.#reorder = document.createElement("fig-reorder");
    const stops = createElement(
      "div",
      { className: "fig-fill-picker-gradient-stops" },
      [
        createElement(
          "fig-header",
          {
            className: "fig-fill-picker-gradient-stops-header",
            borderless: true,
          },
          [createElement("h3", {}, "Stops"), this.#addButton],
        ),
        createElement(
          "div",
          { className: "fig-fill-picker-gradient-stops-list" },
          this.#reorder,
        ),
      ],
    );

    this.replaceChildren(header, preview, stops);
    this.#gradientType.addEventListener("change", this.#handleTypeChange);
    this.#gradientType.addEventListener("optionhover", (event) =>
      event.stopPropagation(),
    );
    this.#rotateButton.addEventListener("click", this.#handleRotate);
    this.#flipButton.addEventListener("click", this.#handleFlip);
    this.#addButton.addEventListener("click", this.#handleAdd);
    this.#gradientBar.addEventListener("input", this.#handleBarEvent);
    this.#gradientBar.addEventListener("change", this.#handleBarEvent);
    this.#gradientBar.addEventListener(
      "pointerdown",
      this.#handleBarStopSelection,
    );
    this.#gradientBar.addEventListener(
      "focusin",
      this.#handleBarStopSelection,
    );
    this.#gradientBar.addEventListener("click", this.#handleBarStopSelection);
    this.#gradientBar.addEventListener(
      "keydown",
      this.#handleDeleteSelectedStop,
    );
    this.#reorder.addEventListener("reorder", this.#handleReorder);
    this.#reorder.addEventListener("keydown", this.#handleDeleteSelectedStop);
    this.addEventListener("pointerdown", this.#handlePointerDown, true);
    this.addEventListener(
      "lostpointercapture",
      this.#handlePointerEnd,
      true,
    );
    this.#mounted = true;
  }

  #formatStopColor(stop) {
    if ((stop.opacity ?? 100) >= 100) return stop.color;
    return `${stop.color}${Math.round(((stop.opacity ?? 100) / 100) * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }

  #readRow(row) {
    const positionInput = row.querySelector(".fig-fill-picker-stop-position");
    const colorInput = row.querySelector(".fig-fill-picker-stop-color");
    const current = this.#gradient.stops[Number(row.dataset.index)] ?? {};
    const position = Number(
      positionInput?.value ?? positionInput?.getAttribute("value") ?? 0,
    );
    const liveColor =
      colorInput?.hexOpaque ||
      (typeof colorInput?.value === "string" ? colorInput.value : "") ||
      colorInput?.getAttribute("value");
    return {
      position: Number.isFinite(position)
        ? Math.max(0, Math.min(100, position))
        : 0,
      color: normalizeHex(String(liveColor || current.color).slice(0, 7)),
      opacity:
        colorInput?.rgba?.a !== undefined
          ? Math.round(colorInput.rgba.a * 100)
          : current.opacity ?? 100,
    };
  }

  #readStopIntoGradient(row) {
    const index = this.#stopRows.indexOf(row);
    if (!Number.isInteger(index) || !this.#gradient.stops[index]) return;
    this.#gradient.stops[index] = {
      ...this.#gradient.stops[index],
      ...this.#readRow(row),
    };
  }

  #flushRows() {
    this.#stopRows.forEach((row) => this.#readStopIntoGradient(row));
  }

  #createStopRow() {
    const position = createElement("fig-input-number", {
      className: "fig-fill-picker-stop-position",
      "aria-label": "Gradient stop position",
      min: "0",
      max: "100",
      units: "%",
    });
    const color = createElement("fig-input-color", {
      className: "fig-fill-picker-stop-color",
      "aria-label": "Gradient stop color",
      text: "true",
      alpha: "true",
      picker: "figma",
      "picker-dialog-position": "right",
    });
    const row = createElement(
      "fig-property",
      {
        className: "fig-fill-picker-gradient-stop-row",
        leading: "drag",
        trailing: "remove",
        "show-leading": "hover",
        "show-trailing": true,
      },
      createElement(
        "fig-stack",
        {
          className: "fig-fill-picker-gradient-stop-inputs",
          slot: "input",
          direction: "horizontal",
          gap: "2",
          full: true,
        },
        [position, color],
      ),
    );
    position.addEventListener("input", (event) => {
      event.stopPropagation();
      this.#handleRowControl(row, "input");
    });
    position.addEventListener("change", (event) => {
      event.stopPropagation();
      this.#handleRowControl(row, "change");
    });
    for (const type of ["input", "change"]) {
      color.addEventListener(type, (event) => {
        event.stopPropagation();
        this.#handleRowControl(row, type);
      });
    }
    row.addEventListener("remove", (event) => {
      event.stopPropagation();
      this.#removeStopRow(row);
    });
    row.addEventListener("pointerdown", (event) => {
      if (event.button === 0) this.#selectStopRow(row);
    });
    row.addEventListener("click", (event) => {
      this.#selectStopRow(row);
      const fromEditableControl = event.composedPath().some(
        (target) =>
          target instanceof Element &&
          target.matches(
            'input, textarea, select, fig-input-number, fig-input-color, fig-input-text, [contenteditable]:not([contenteditable="false"])',
          ),
      );
      if (!fromEditableControl && row.isConnected) {
        HTMLElement.prototype.focus.call(row, { preventScroll: true });
      }
    });
    row.addEventListener("focusin", () => this.#selectStopRow(row));
    return row;
  }

  #selectStopRow(row) {
    if (!row || !this.#stopRows.includes(row)) return;
    this.#selectedStopRow = row;
    this.#stopRows.forEach((stopRow) => {
      stopRow.toggleAttribute("selected", stopRow === row);
    });
    this.#syncSelectedHandle();
    row.scrollIntoView({ block: "nearest" });
  }

  #syncSelectedHandle() {
    const selectedIndex = this.#stopRows.indexOf(this.#selectedStopRow);
    this.#gradientBar
      ?.querySelectorAll(
        ".fig-input-gradient-track fig-handle:not(.fig-input-gradient-ghost)",
      )
      .forEach((handle, index) => {
        if (index === selectedIndex) handle.select?.();
        else handle.deselect?.();
      });
  }

  #reconcileStopRows() {
    if (!this.#reorder) return;
    const desiredStops = this.#gradient.stops;
    const previousRows = this.#stopRows.filter((row) => row.isConnected);
    let nextRows;

    if (previousRows.length === desiredStops.length) {
      nextRows = [...previousRows];
    } else {
      nextRows = Array(desiredStops.length).fill(null);
      const matches = matchUnchangedStops(this.#renderedStops, desiredStops);
      const usedPrevious = new Set();
      for (const [previousIndex, nextIndex] of matches) {
        const row = previousRows[previousIndex];
        if (!row) continue;
        nextRows[nextIndex] = row;
        usedPrevious.add(previousIndex);
      }
      const reusable = previousRows.filter(
        (_, index) => !usedPrevious.has(index),
      );
      nextRows = nextRows.map((row) => row ?? reusable.shift() ?? this.#createStopRow());
      const retained = new Set(nextRows);
      previousRows.forEach((row) => {
        if (!retained.has(row)) row.remove();
      });
    }

    let cursor = this.#reorder.firstElementChild;
    for (const row of nextRows) {
      if (row === cursor) {
        cursor = cursor.nextElementSibling;
      } else {
        this.#reorder.insertBefore(row, cursor);
      }
    }
    this.#stopRows = nextRows;
    this.#stopRows.forEach((row, index) => {
      this.#syncStopRow(row, desiredStops[index], index);
    });
    if (!this.#stopRows.includes(this.#selectedStopRow)) {
      this.#selectedStopRow = this.#stopRows[0] ?? null;
    }
    this.#stopRows.forEach((row) => {
      row.toggleAttribute("selected", row === this.#selectedStopRow);
    });
    this.#syncSelectedHandle();
    this.#renderedStops = cloneStops(desiredStops);
    this.#syncNestedPickerAnchors();
  }

  #syncStopRow(row, stop, index) {
    const disabled = this.#disabled();
    row.dataset.index = String(index);
    const position = row.querySelector(".fig-fill-picker-stop-position");
    const color = row.querySelector(".fig-fill-picker-stop-color");
    this.#setControlValue(position, stop.position);
    this.#setControlValue(color, this.#formatStopColor(stop));
    position?.toggleAttribute("disabled", disabled);
    color?.toggleAttribute("disabled", disabled);
    const remove = row.querySelector(
      ':scope > [data-fig-property-action="remove"]',
    );
    if (remove) {
      remove.classList.add("fig-fill-picker-stop-remove");
      remove.setAttribute("aria-label", "Remove gradient stop");
      remove.toggleAttribute(
        "disabled",
        disabled || this.#gradient.stops.length <= 2,
      );
    }
  }

  #setControlValue(control, value) {
    if (!control) return;
    const nextValue = String(value);
    if (control.getAttribute("value") === nextValue) return;
    const active = control.contains(document.activeElement)
      ? document.activeElement
      : null;
    const selection =
      active &&
      "selectionStart" in active &&
      typeof active.selectionStart === "number"
        ? {
            start: active.selectionStart,
            end: active.selectionEnd,
            direction: active.selectionDirection,
          }
        : null;
    control.setAttribute("value", nextValue);
    if (selection && active === document.activeElement) {
      try {
        active.setSelectionRange(
          selection.start,
          selection.end,
          selection.direction,
        );
      } catch {
        // Selection APIs are not available for every input type.
      }
    }
  }

  #sync() {
    if (!this.#mounted) return;
    const disabled = this.#disabled();
    const fade = this.#overflowMode() === "fade";
    this.#reorder.classList.toggle("fig-overflow-fade", fade);
    const showRows = this.#showRows();
    if (showRows === null) {
      this.#reorder.style.removeProperty(
        "--fig-gradient-editor-overflow-show-rows",
      );
    } else {
      this.#reorder.style.setProperty(
        "--fig-gradient-editor-overflow-show-rows",
        String(showRows),
      );
    }
    this.#setControlValue(this.#gradientType, this.#gradient.type);
    this.#gradientType.toggleAttribute("disabled", disabled);
    this.#flipButton.toggleAttribute("disabled", disabled);
    this.#rotateButton.toggleAttribute("disabled", disabled);
    this.#addButton.toggleAttribute("disabled", disabled);
    this.#reorder.toggleAttribute("disabled", disabled);
    this.#gradientBar.toggleAttribute("disabled", disabled);
    const barValue = normalizeGradientEditorValue(this.#gradientBar.value);
    if (!gradientsSemanticallyEqual(barValue, this.#gradient)) {
      this.#syncingBar = true;
      this.#gradientBar.value = {
        type: "gradient",
        gradient: this.#gradient,
      };
      this.#syncingBar = false;
    }
    this.#reconcileStopRows();
  }

  #applyInternalGradient(value, eventType, { focusIndex = null } = {}) {
    const next = normalizeGradientEditorValue(value);
    const changed = !gradientsSemanticallyEqual(this.#gradient, next);
    if (changed) {
      this.#gradient = next;
      this.#sync();
    }
    if (eventType === "change" || changed) this.#emit(eventType);
    if (focusIndex !== null) this.#focusStopValue(focusIndex);
  }

  #focusStopValue(index) {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      const row = this.querySelector(
        `.fig-fill-picker-gradient-stop-row[data-index="${index}"]`,
      );
      const input = row?.querySelector(
        ".fig-fill-picker-stop-color fig-input-text input",
      );
      this.#selectStopRow(row);
      input?.focus();
      input?.select();
    });
  }

  #handleTypeChange = (event) => {
    event.stopPropagation();
    const value =
      typeof event.detail === "string" ? event.detail : event.target?.value;
    if (!["linear", "radial", "angular"].includes(value)) return;
    this.#applyInternalGradient({ ...this.#gradient, type: value }, "input");
  };

  #handleRotate = () => {
    this.#applyInternalGradient(
      {
        ...this.#gradient,
        angle: (Number(this.#gradient.angle) + 90) % 360,
      },
      "input",
    );
  };

  #handleFlip = () => {
    const stops = this.#gradient.stops
      .map((stop) => ({ ...stop, position: 100 - stop.position }))
      .sort((a, b) => a.position - b.position);
    this.#applyInternalGradient({ ...this.#gradient, stops }, "input");
  };

  #handleAdd = () => {
    const stops = cloneStops(this.#gradient.stops);
    const selectedIndex = Math.max(
      0,
      this.#stopRows.indexOf(this.#selectedStopRow),
    );
    const selectedPosition = Number(stops[selectedIndex]?.position) || 0;
    const nextPosition = Number(
      stops[selectedIndex + 1]?.position ?? selectedPosition,
    );
    const addedStop = {
      position: (selectedPosition + nextPosition) / 2,
      color: "#888888",
      opacity: 100,
    };
    const addedIndex = selectedIndex + 1;
    stops.splice(addedIndex, 0, addedStop);
    this.#applyInternalGradient(
      { ...this.#gradient, stops },
      "input",
      { focusIndex: addedIndex },
    );
  };

  #handleBarEvent = (event) => {
    event.stopPropagation();
    if (this.#syncingBar || !event.detail?.gradient) return;
    this.#applyInternalGradient(
      { ...this.#gradient, ...event.detail.gradient },
      event.type,
    );
  };

  #handleBarStopSelection = (event) => {
    const handle = event.target?.closest?.(
      "fig-handle:not(.fig-input-gradient-ghost)",
    );
    const index = Number(handle?.dataset.stopIndex);
    if (!Number.isInteger(index)) return;
    this.#selectStopRow(this.#stopRows[index]);
  };

  #handleDeleteSelectedStop = (event) => {
    if (
      event.defaultPrevented ||
      !["Delete", "Backspace"].includes(event.key) ||
      this.#disabled() ||
      this.#gradient.stops.length <= 2
    ) {
      return;
    }
    const handle = event.target?.closest?.(
      "fig-handle[selected]:not(.fig-input-gradient-ghost)",
    );
    const row = event.target?.closest?.(
      ".fig-fill-picker-gradient-stop-row[selected]",
    );
    const fromSelectedHandle =
      handle && this.#gradientBar.contains(handle);
    const fromEditableControl = event.composedPath().some(
      (target) =>
        target instanceof Element &&
        target.matches(
          'input, textarea, select, fig-input-number, fig-input-color, fig-input-text, [contenteditable]:not([contenteditable="false"])',
        ),
    );
    const fromSelectedRow =
      row === this.#selectedStopRow && !fromEditableControl;
    if (!fromSelectedHandle && !fromSelectedRow) return;
    event.preventDefault();
    this.#removeStopRow(this.#selectedStopRow);
    requestAnimationFrame(() => {
      const selectedIndex = this.#stopRows.indexOf(this.#selectedStopRow);
      this.#gradientBar
        ?.querySelectorAll(
          ".fig-input-gradient-track fig-handle:not(.fig-input-gradient-ghost)",
        )
        [selectedIndex]?.focus();
    });
  };

  #handleReorder = (event) => {
    event.stopPropagation();
    const { oldIndex, newIndex } = event.detail ?? {};
    if (
      !Number.isInteger(oldIndex) ||
      !Number.isInteger(newIndex) ||
      oldIndex === newIndex
    ) {
      return;
    }
    this.#flushRows();
    const stops = cloneStops(this.#gradient.stops);
    const positions = stops.map((stop) => stop.position);
    const [stop] = stops.splice(oldIndex, 1);
    stops.splice(newIndex, 0, stop);
    stops.forEach((reorderedStop, index) => {
      reorderedStop.position = positions[index];
    });
    const [row] = this.#stopRows.splice(oldIndex, 1);
    this.#stopRows.splice(newIndex, 0, row);
    this.#applyInternalGradient({ ...this.#gradient, stops }, "input");
  };

  #handleRowControl(row, eventType) {
    const index = this.#stopRows.indexOf(row);
    if (index < 0) return;
    const stops = cloneStops(this.#gradient.stops);
    stops[index] = { ...stops[index], ...this.#readRow(row) };
    this.#applyInternalGradient({ ...this.#gradient, stops }, eventType);
  }

  #removeStopRow(row) {
    if (this.#gradient.stops.length <= 2) return;
    const index = this.#stopRows.indexOf(row);
    if (index < 0) return;
    if (row.contains(document.activeElement)) this.#addButton.focus();
    if (row === this.#selectedStopRow) {
      this.#selectedStopRow =
        this.#stopRows[index + 1] ?? this.#stopRows[index - 1] ?? null;
    }
    const stops = cloneStops(this.#gradient.stops);
    stops.splice(index, 1);
    this.#applyInternalGradient({ ...this.#gradient, stops }, "input");
  }

  #handlePointerDown = (event) => {
    if (event.button !== 0 || this.#pointerInteractionActive) return;
    this.#pointerInteractionActive = true;
    window.addEventListener("pointerup", this.#handlePointerEnd, true);
    window.addEventListener("pointercancel", this.#handlePointerEnd, true);
    window.addEventListener("blur", this.#handlePointerEnd, true);
  };

  #handlePointerEnd = () => {
    window.removeEventListener("pointerup", this.#handlePointerEnd, true);
    window.removeEventListener("pointercancel", this.#handlePointerEnd, true);
    window.removeEventListener("blur", this.#handlePointerEnd, true);
    queueMicrotask(() =>
      this.#endPointerInteraction({ reconcile: true }),
    );
  };

  #endPointerInteraction({ reconcile }) {
    window.removeEventListener("pointerup", this.#handlePointerEnd, true);
    window.removeEventListener("pointercancel", this.#handlePointerEnd, true);
    window.removeEventListener("blur", this.#handlePointerEnd, true);
    const wasActive = this.#pointerInteractionActive;
    this.#pointerInteractionActive = false;
    if (!reconcile || !wasActive || !this.#deferredExternalGradient) return;
    const deferred = this.#deferredExternalGradient;
    this.#deferredExternalGradient = null;
    this.#gradient = deferred;
    this.#reflectValue();
    this.#sync();
  }

  #syncNestedPickerAnchors() {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      this.querySelectorAll(".fig-fill-picker-stop-color").forEach((input) => {
        const picker = input.querySelector("fig-fill-picker");
        if (picker) picker.anchorElement = this.#pickerAnchor;
      });
    });
  }
}

if (!customElements.get("fig-gradient-editor")) {
  customElements.define("fig-gradient-editor", FigGradientEditor);
}
