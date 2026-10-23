/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";
import "./fig-property.js";

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
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (colorSpace === "display-p3") {
    return `color(display-p3 ${+(r / 255).toFixed(4)} ${+(g / 255).toFixed(4)} ${+(b / 255).toFixed(4)} / ${alpha})`;
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
 * @fires input - During edits with `{ type, gradient, css }`
 * @fires change - On committed edits with `{ type, gradient, css }`
 */
class FigGradientEditor extends HTMLElement {
  #gradient = normalizeGradientEditorValue();
  #syncingValue = false;
  #syncingBar = false;
  #pickerAnchor = null;

  static get observedAttributes() {
    return ["value", "color-space", "disabled"];
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
    this.#gradient = normalizeGradientEditorValue(this.getAttribute("value"));
    this.#render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#syncingValue) return;
    if (name === "value") {
      this.#gradient = normalizeGradientEditorValue(newValue);
    }
    if (this.isConnected) this.#render();
  }

  refreshLayout() {
    this.querySelector(".fig-fill-picker-gradient-bar-input")?.refreshLayout?.();
  }

  #disabled() {
    return (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    );
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

  #render() {
    const disabled = this.#disabled();
    const gradientType = createElement(
      "fig-select",
      {
        className: "fig-fill-picker-gradient-type",
        label: "Gradient type",
        value: this.#gradient.type,
        variant: "ghost",
        disabled,
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
    const action = (label, className, icon) =>
      createElement(
        "fig-tooltip",
        { text: label },
        createElement(
          "fig-button",
          {
            icon: true,
            variant: "ghost",
            className,
            "aria-label": label,
            disabled,
          },
          createIcon(icon),
        ),
      );
    const header = createElement(
      "fig-header",
      {
        className: "fig-fill-picker-gradient-header",
        borderless: true,
        compact: true,
      },
      [
        gradientType,
        createElement(
          "fig-stack",
          {
            className: "fig-fill-picker-gradient-actions",
            gap: "1",
          },
          [
            action("Flip gradient", "fig-fill-picker-gradient-flip", "swap"),
            action(
              "Rotate gradient",
              "fig-fill-picker-gradient-rotate",
              "rotate",
            ),
          ],
        ),
      ],
    );
    const gradientBar = createElement("fig-input-gradient", {
      className: "fig-fill-picker-gradient-bar-input",
      "aria-label": "Gradient stops",
      edit: "true",
      mode: "tip",
      size: "large",
      disabled,
      value: JSON.stringify({
        type: "gradient",
        gradient: this.#gradient,
      }),
    });
    const preview = createElement(
      "fig-preview",
      { className: "fig-fill-picker-gradient-preview" },
      gradientBar,
    );
    const addButton = createElement(
      "fig-button",
      {
        icon: true,
        variant: "ghost",
        className: "fig-fill-picker-gradient-add",
        "aria-label": "Add gradient stop",
        title: "Add stop",
        disabled,
      },
      createIcon("add"),
    );
    const reorder = document.createElement("fig-reorder");
    reorder.toggleAttribute("disabled", disabled);
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
          [createElement("h3", {}, "Stops"), addButton],
        ),
        createElement(
          "div",
          { className: "fig-fill-picker-gradient-stops-list" },
          reorder,
        ),
      ],
    );

    this.replaceChildren(header, preview, stops);
    this.#renderStopRows(reorder);
    this.#setupEvents();
  }

  #setupEvents() {
    const select = this.querySelector(".fig-fill-picker-gradient-type");
    select?.addEventListener("change", (event) => {
      event.stopPropagation();
      const value =
        typeof event.detail === "string" ? event.detail : event.target?.value;
      if (!["linear", "radial", "angular"].includes(value)) return;
      this.#gradient.type = value;
      this.#syncPreview();
      this.#emit("input");
    });

    this.querySelector(".fig-fill-picker-gradient-rotate")?.addEventListener(
      "click",
      () => {
        this.#gradient.angle = (Number(this.#gradient.angle) + 90) % 360;
        this.#syncPreview();
        this.#emit("input");
      },
    );
    this.querySelector(".fig-fill-picker-gradient-flip")?.addEventListener(
      "click",
      () => {
        this.#gradient.stops.forEach((stop) => {
          stop.position = 100 - stop.position;
        });
        this.#gradient.stops.sort((a, b) => a.position - b.position);
        this.#render();
        this.#emit("input");
      },
    );
    this.querySelector(".fig-fill-picker-gradient-add")?.addEventListener(
      "click",
      () => {
        this.#gradient.stops.push({
          position: 50,
          color: "#888888",
          opacity: 100,
        });
        this.#gradient.stops.sort((a, b) => a.position - b.position);
        this.#render();
        this.#emit("input");
      },
    );

    const bar = this.querySelector(".fig-fill-picker-gradient-bar-input");
    const syncBar = (event) => {
      event.stopPropagation();
      if (this.#syncingBar || !event.detail?.gradient) return false;
      this.#gradient = normalizeGradientEditorValue({
        ...this.#gradient,
        ...event.detail.gradient,
      });
      this.#renderStopRows(
        this.querySelector(".fig-fill-picker-gradient-stops-list fig-reorder"),
      );
      return true;
    };
    bar?.addEventListener("input", (event) => {
      if (syncBar(event)) this.#emit("input");
    });
    bar?.addEventListener("change", (event) => {
      if (syncBar(event)) this.#emit("change");
    });

    this.querySelector("fig-reorder")?.addEventListener("reorder", (event) => {
      const { oldIndex, newIndex } = event.detail ?? {};
      if (
        !Number.isInteger(oldIndex) ||
        !Number.isInteger(newIndex) ||
        oldIndex === newIndex
      ) {
        return;
      }
      this.#flushRows();
      const [stop] = this.#gradient.stops.splice(oldIndex, 1);
      this.#gradient.stops.splice(newIndex, 0, stop);
      this.querySelectorAll(".fig-fill-picker-gradient-stop-row").forEach(
        (row, index) => {
          row.dataset.index = String(index);
        },
      );
      this.#syncPreview();
      this.#emit("input");
    });
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

  #syncRow(row) {
    const index = Number(row.dataset.index);
    if (!Number.isInteger(index) || !this.#gradient.stops[index]) return;
    this.#gradient.stops[index] = {
      ...this.#gradient.stops[index],
      ...this.#readRow(row),
    };
    const stop = this.#gradient.stops[index];
    row
      .querySelector(".fig-fill-picker-stop-position")
      ?.setAttribute("value", String(stop.position));
    row
      .querySelector(".fig-fill-picker-stop-color")
      ?.setAttribute("value", this.#formatStopColor(stop));
  }

  #flushRows() {
    this.querySelectorAll(".fig-fill-picker-gradient-stop-row").forEach((row) =>
      this.#syncRow(row),
    );
  }

  #renderStopRows(reorder) {
    if (!reorder) return;
    const disabled = this.#disabled();
    const rows = this.#gradient.stops.map((stop, index) => {
      const row = createElement(
        "fig-property",
        {
          className: "fig-fill-picker-gradient-stop-row",
          "data-index": index,
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
          [
            createElement("fig-input-number", {
              className: "fig-fill-picker-stop-position",
              "aria-label": "Gradient stop position",
              min: "0",
              max: "100",
              value: stop.position,
              units: "%",
              disabled,
            }),
            createElement("fig-input-color", {
              className: "fig-fill-picker-stop-color",
              "aria-label": "Gradient stop color",
              text: "true",
              alpha: "true",
              picker: "figma",
              "picker-dialog-position": "right",
              value: this.#formatStopColor(stop),
              disabled,
            }),
          ],
        ),
      );
      const position = row.querySelector(".fig-fill-picker-stop-position");
      position.addEventListener("input", () => {
        this.#syncRow(row);
        this.#syncPreview();
        this.#emit("input");
      });
      position.addEventListener("change", () => {
        this.#syncRow(row);
        this.#syncPreview();
        this.#emit("change");
      });
      const color = row.querySelector(".fig-fill-picker-stop-color");
      for (const type of ["input", "change"]) {
        color.addEventListener(type, (event) => {
          event.stopPropagation();
          this.#syncRow(row);
          this.#syncPreview();
          this.#emit(type);
        });
      }
      row.addEventListener("remove", (event) => {
        event.stopPropagation();
        if (this.#gradient.stops.length <= 2) return;
        this.#gradient.stops.splice(Number(row.dataset.index), 1);
        this.#render();
        this.#emit("input");
      });
      return row;
    });
    reorder.replaceChildren(...rows);
    reorder.querySelectorAll(".fig-fill-picker-gradient-stop-row").forEach(
      (row) => {
        const remove = row.querySelector(
          ':scope > [data-fig-property-action="remove"]',
        );
        if (!remove) return;
        remove.classList.add("fig-fill-picker-stop-remove");
        remove.setAttribute("aria-label", "Remove gradient stop");
        remove.toggleAttribute(
          "disabled",
          disabled || this.#gradient.stops.length <= 2,
        );
      },
    );
    this.#syncNestedPickerAnchors();
  }

  #syncPreview() {
    const bar = this.querySelector(".fig-fill-picker-gradient-bar-input");
    if (!bar) return;
    this.#syncingBar = true;
    bar.value = { type: "gradient", gradient: this.#gradient };
    this.#syncingBar = false;
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
