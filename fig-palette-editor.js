/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";
import "./fig-property.js";
import {
  figHexToOklch,
  figMapOklchToGamut,
  figOklabDistance,
  figOklchToHex,
  figOklchToOklab,
} from "./fig-color.js";

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

function booleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

export function normalizePaletteEditorValue(value) {
  let entries = value;
  if (typeof entries === "string") {
    const raw = entries.trim();
    if (!raw) return [];
    try {
      entries = JSON.parse(raw);
    } catch {
      entries = raw.includes(",") ? raw.split(",") : [raw];
    }
  }
  if (!Array.isArray(entries)) return [];
  return entries.map((entry) => {
    if (typeof entry === "string") {
      const color = entry.trim();
      return {
        color: color.slice(0, 7) || "#D9D9D9",
        alpha:
          color.length > 7
            ? Math.max(0, Math.min(1, parseInt(color.slice(7, 9), 16) / 255))
            : 1,
      };
    }
    if (entry && typeof entry === "object") {
      const alpha =
        entry.alpha !== undefined
          ? Number(entry.alpha)
          : entry.opacity !== undefined
            ? Number(entry.opacity) / 100
            : 1;
      return {
        color: String(entry.color || "#D9D9D9").slice(0, 7),
        alpha: Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1,
      };
    }
    return { color: "#D9D9D9", alpha: 1 };
  });
}

function paletteEntryValue(entry) {
  const color = String(entry?.color || "#D9D9D9").slice(0, 7);
  const alpha = Math.max(0, Math.min(1, Number(entry?.alpha ?? 1)));
  if (alpha >= 1) return color;
  return `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function hueDistance(first, second) {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

function paletteColorData(entry) {
  let lch;
  try {
    lch = figHexToOklch(entry?.color || "#D9D9D9");
  } catch {
    lch = figHexToOklch("#D9D9D9");
  }
  return { lch, lab: figOklchToOklab(lch.l, lch.c, lch.h) };
}

function paletteCandidate(l, c, h) {
  const lch = figMapOklchToGamut(l, c, h);
  return {
    lch,
    lab: figOklchToOklab(lch.l, lch.c, lch.h),
  };
}

function minimumPaletteDistance(candidate, colors) {
  return Math.min(
    ...colors.map((color) => figOklabDistance(candidate.lab, color.lab)),
  );
}

function dominantPaletteHue(colors) {
  let x = 0;
  let y = 0;
  for (const { lch } of colors) {
    const weight = Math.max(lch.c, 0.001);
    const radians = (lch.h * Math.PI) / 180;
    x += Math.cos(radians) * weight;
    y += Math.sin(radians) * weight;
  }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function neutralPaletteCandidate(colors) {
  const lightnesses = colors
    .map(({ lch }) => lch.l)
    .filter((lightness) => lightness > 0.08 && lightness < 0.92)
    .sort((a, b) => a - b);
  const points = [0.08, ...lightnesses, 0.92];
  let widest = { start: points[0], end: points[1] };
  for (let index = 1; index < points.length - 1; index += 1) {
    const gap = points[index + 1] - points[index];
    if (gap > widest.end - widest.start) {
      widest = { start: points[index], end: points[index + 1] };
    }
  }
  return paletteCandidate(
    (widest.start + widest.end) / 2,
    median(colors.map(({ lch }) => lch.c)),
    dominantPaletteHue(colors),
  );
}

function sequentialPaletteCandidate(colors) {
  if (colors.length < 2) return null;
  const hue = dominantPaletteHue(colors);
  if (colors.some(({ lch }) => lch.c >= 0.025 && hueDistance(lch.h, hue) > 25)) {
    return null;
  }
  const deltas = colors.slice(1).map(
    ({ lch }, index) => lch.l - colors[index].lch.l,
  );
  const direction = Math.sign(colors.at(-1).lch.l - colors[0].lch.l);
  if (
    direction === 0 ||
    deltas.some((delta) => Math.abs(delta) > 0.01 && Math.sign(delta) !== direction)
  ) {
    return null;
  }
  const step = Math.max(
    0.06,
    Math.min(0.18, median(deltas.map((delta) => Math.abs(delta)))),
  );
  const first = colors[0].lch;
  const last = colors.at(-1).lch;
  let lightness = last.l + direction * step;
  let chroma = last.c;
  if (lightness < 0.08 || lightness > 0.92) {
    lightness = first.l - direction * step;
    chroma = first.c;
  }
  return paletteCandidate(
    Math.max(0.08, Math.min(0.92, lightness)),
    chroma,
    hue,
  );
}

function categoricalPaletteCandidate(colors) {
  const medianLightness = median(colors.map(({ lch }) => lch.l));
  const chromatic = colors.filter(({ lch }) => lch.c >= 0.025);
  const medianChroma = Math.max(
    0.06,
    Math.min(
      0.22,
      median((chromatic.length ? chromatic : colors).map(({ lch }) => lch.c)),
    ),
  );
  const lightnesses = [
    medianLightness,
    Math.max(0.2, medianLightness - 0.06),
    Math.min(0.88, medianLightness + 0.06),
  ];
  let best = null;
  for (const lightness of lightnesses) {
    for (let hue = 0; hue < 360; hue += 2) {
      const candidate = paletteCandidate(lightness, medianChroma, hue);
      const distance = minimumPaletteDistance(candidate, colors);
      const score =
        distance -
        Math.abs(candidate.lch.l - medianLightness) * 0.12 -
        Math.abs(candidate.lch.c - medianChroma) * 0.08;
      if (!best || score > best.score) best = { ...candidate, score };
    }
  }
  return best;
}

function generatePaletteEntry(entries) {
  if (!entries.length) return { color: "#D9D9D9", alpha: 1 };
  const colors = entries.map(paletteColorData);
  const alpha = median(entries.map((entry) => Number(entry.alpha ?? 1)));
  let candidate;
  if (colors.every(({ lch }) => lch.c < 0.025)) {
    candidate = neutralPaletteCandidate(colors);
  } else {
    candidate = sequentialPaletteCandidate(colors);
    if (
      !candidate ||
      minimumPaletteDistance(candidate, colors) < 0.035
    ) {
      candidate = categoricalPaletteCandidate(colors);
    }
  }
  return {
    color: figOklchToHex(
      candidate.lch.l,
      candidate.lch.c,
      candidate.lch.h,
    ),
    alpha,
  };
}

function paletteEntriesEqual(first, second) {
  const alphaByte = (value) =>
    Math.round(Math.max(0, Math.min(1, Number(value ?? 1))) * 255);
  return (
    first.length === second.length &&
    first.every(
      (entry, index) =>
        String(entry.color).toUpperCase() ===
          String(second[index]?.color).toUpperCase() &&
        alphaByte(entry.alpha) === alphaByte(second[index]?.alpha),
    )
  );
}

function clonePalette(entries) {
  return entries.map((entry) => ({ ...entry }));
}

function matchUnchangedPaletteEntries(previous, next) {
  const rows = previous.length;
  const columns = next.length;
  const lengths = Array.from({ length: rows + 1 }, () =>
    Array(columns + 1).fill(0),
  );
  const equal = (a, b) => paletteEntriesEqual([a], [b]);
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      lengths[i][j] = equal(previous[i], next[j])
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const matches = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (equal(previous[i], next[j])) {
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

/**
 * A reusable editor for an ordered palette of solid colors.
 * @attr {string} value - JSON array of hex strings or {color,alpha} objects, or comma-separated hex
 * @attr {number} min - Minimum number of colors (default: 2)
 * @attr {number} max - Maximum number of colors (unbounded when omitted)
 * @attr {boolean} fixed - Locks palette length while preserving color editing and reordering
 * @attr {boolean} disabled - Disables editing and reordering
 * @attr {"fade"|"visible"} overflow - Vertical overflow mode (default: fade)
 * @attr {number} show-rows - Visible rows before overflow (default: 6.5)
 * @fires input - During color editing or reordering (detail: normalized color array)
 * @fires change - On committed color edits, add, remove, or reorder
 */
class FigPaletteEditor extends HTMLElement {
  #colors = [];
  #syncingValueAttribute = false;
  #mounted = false;
  #reorder = null;
  #addField = null;
  #addButton = null;
  #rows = [];
  #renderedColors = [];
  #pointerInteractionActive = false;
  #deferredExternalColors = null;

  static get observedAttributes() {
    return [
      "value",
      "min",
      "max",
      "fixed",
      "disabled",
      "overflow",
      "show-rows",
    ];
  }

  get #min() {
    const value = Number.parseInt(this.getAttribute("min"), 10);
    return Number.isFinite(value) ? Math.max(0, value) : 2;
  }

  get #max() {
    const value = Number.parseInt(this.getAttribute("max"), 10);
    return Number.isFinite(value) ? Math.max(this.#min, value) : Infinity;
  }

  get #fixed() {
    return booleanAttribute(this, "fixed");
  }

  get #disabled() {
    return booleanAttribute(this, "disabled");
  }

  get #overflowMode() {
    return this.getAttribute("overflow") === "visible" ? "visible" : "fade";
  }

  get #showRows() {
    const value = Number(this.getAttribute("show-rows"));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  get value() {
    return this.#colors.map((entry) => ({ ...entry }));
  }

  set value(value) {
    this.setAttribute(
      "value",
      typeof value === "string" ? value : JSON.stringify(value ?? []),
    );
  }

  connectedCallback() {
    const incoming = normalizePaletteEditorValue(this.getAttribute("value"));
    if (!paletteEntriesEqual(this.#colors, incoming)) {
      this.#colors = incoming;
    }
    this.#mount();
    this.#sync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#syncingValueAttribute) return;
    if (name === "value") {
      const incoming = normalizePaletteEditorValue(newValue);
      if (paletteEntriesEqual(this.#colors, incoming)) {
        if (this.#pointerInteractionActive) {
          this.#deferredExternalColors = null;
        }
        return;
      }
      if (this.#pointerInteractionActive) {
        this.#deferredExternalColors = incoming;
        return;
      }
      this.#deferredExternalColors = null;
      this.#colors = incoming;
    }
    if (this.isConnected && this.#mounted) this.#sync();
  }

  disconnectedCallback() {
    this.#endPointerInteraction({ reconcile: false });
    if (this.#deferredExternalColors) {
      this.#colors = this.#deferredExternalColors;
      this.#deferredExternalColors = null;
      this.#reflectValue();
    }
  }

  #reflectValue() {
    this.#syncingValueAttribute = true;
    this.setAttribute("value", JSON.stringify(this.#colors));
    this.#syncingValueAttribute = false;
  }

  #emit(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #applyInternalColors(value, eventTypes, { focusIndex = null } = {}) {
    const next = normalizePaletteEditorValue(value);
    const changed = !paletteEntriesEqual(this.#colors, next);
    if (changed) {
      this.#colors = next;
      this.#sync();
    }
    this.#reflectValue();
    for (const type of Array.isArray(eventTypes) ? eventTypes : [eventTypes]) {
      if (type === "change" || changed) this.#emit(type);
    }
    if (focusIndex !== null) this.#focusColorValue(focusIndex);
  }

  #removeRow(row) {
    const currentIndex = this.#rows.indexOf(row);
    if (
      this.#disabled ||
      this.#fixed ||
      this.#colors.length <= this.#min ||
      !Number.isInteger(currentIndex) ||
      currentIndex < 0
    ) {
      return;
    }
    if (row.contains(document.activeElement)) this.#addButton.focus();
    const colors = clonePalette(this.#colors);
    colors.splice(currentIndex, 1);
    this.#applyInternalColors(colors, ["input", "change"]);
  }

  #createRow() {
    const colorInput = createElement("fig-input-color", {
      className: "fig-palette-editor-color",
      slot: "input",
      text: true,
      alpha: true,
      full: true,
    });
    const syncColor = (event, type) => {
      event.stopPropagation();
      const row = colorInput.closest(".fig-palette-editor-color-row");
      const currentIndex = this.#rows.indexOf(row);
      if (!Number.isInteger(currentIndex) || !this.#colors[currentIndex]) return;
      const colors = clonePalette(this.#colors);
      const currentAlpha = colors[currentIndex]?.alpha ?? 1;
      const inputAlpha = colorInput.rgba?.a ?? currentAlpha;
      const alpha =
        Math.round(inputAlpha * 255) === Math.round(currentAlpha * 255)
          ? currentAlpha
          : inputAlpha;
      colors[currentIndex] = {
        color:
          colorInput.hexOpaque ||
          colors[currentIndex]?.color ||
          "#D9D9D9",
        alpha,
      };
      this.#applyInternalColors(colors, type);
    };
    colorInput.addEventListener("input", (event) =>
      syncColor(event, "input"),
    );
    colorInput.addEventListener("change", (event) =>
      syncColor(event, "change"),
    );

    const row = createElement(
      "fig-property",
      {
        className: "fig-palette-editor-color-row",
        leading: "drag",
      },
      colorInput,
    );
    row.addEventListener("remove", (event) => {
      event.stopPropagation();
      this.#removeRow(row);
    });
    return row;
  }

  #handleReorder = (event) => {
    const oldIndex = Number(event.detail?.oldIndex);
    const newIndex = Number(event.detail?.newIndex);
    if (
      !Number.isInteger(oldIndex) ||
      !Number.isInteger(newIndex) ||
      oldIndex === newIndex ||
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= this.#colors.length ||
      newIndex >= this.#colors.length
    ) {
      return;
    }
    const colors = clonePalette(this.#colors);
    const [entry] = colors.splice(oldIndex, 1);
    colors.splice(newIndex, 0, entry);
    const [row] = this.#rows.splice(oldIndex, 1);
    this.#rows.splice(newIndex, 0, row);
    this.#applyInternalColors(colors, ["input", "change"]);
  };

  #focusColorValue(index) {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      const input = this.querySelector(
        `.fig-palette-editor-color-row[data-index="${index}"] .fig-palette-editor-color fig-input-text input`,
      );
      input?.focus();
      input?.select();
    });
  }

  #mount() {
    if (this.#mounted) return;
    this.#reorder = createElement("fig-reorder", {
      axis: "vertical",
      items: ".fig-palette-editor-color-row",
      "aria-label": "Palette colors",
    });
    this.#addButton = createElement(
      "fig-button",
      {
        className: "fig-palette-editor-add",
        variant: "secondary",
        full: true,
      },
      "Add color",
    );
    this.#addField = createElement("fig-field", {}, this.#addButton);
    this.replaceChildren(this.#reorder);
    this.#reorder.addEventListener("reorder", this.#handleReorder);
    this.#addButton.addEventListener("click", this.#handleAdd);
    this.addEventListener("pointerdown", this.#handlePointerDown, true);
    this.addEventListener(
      "lostpointercapture",
      this.#handlePointerEnd,
      true,
    );
    this.#mounted = true;
  }

  #handleAdd = () => {
    if (this.#disabled || this.#colors.length >= this.#max) return;
    const colors = clonePalette(this.#colors);
    const addedIndex = colors.length;
    colors.push(generatePaletteEntry(colors));
    this.#applyInternalColors(colors, ["input", "change"], {
      focusIndex: addedIndex,
    });
  };

  #reconcileRows() {
    const previousRows = this.#rows.filter((row) => row.isConnected);
    let nextRows;
    if (previousRows.length === this.#colors.length) {
      nextRows = [...previousRows];
    } else {
      nextRows = Array(this.#colors.length).fill(null);
      const matches = matchUnchangedPaletteEntries(
        this.#renderedColors,
        this.#colors,
      );
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
      nextRows = nextRows.map(
        (row) => row ?? reusable.shift() ?? this.#createRow(),
      );
      const retained = new Set(nextRows);
      previousRows.forEach((row) => {
        if (!retained.has(row)) row.remove();
      });
    }
    let cursor = this.#reorder.firstElementChild;
    for (const row of nextRows) {
      if (row === cursor) cursor = cursor.nextElementSibling;
      else this.#reorder.insertBefore(row, cursor);
    }
    this.#rows = nextRows;
    this.#rows.forEach((row, index) =>
      this.#syncRow(row, this.#colors[index], index),
    );
    this.#renderedColors = clonePalette(this.#colors);
    queueMicrotask(() => this.#syncRemoveActions());
  }

  #syncRow(row, entry, index) {
    row.dataset.index = String(index);
    if (this.#fixed) {
      const remove = row.querySelector(
        ':scope > [data-fig-property-action="remove"]',
      );
      if (remove?.contains(document.activeElement)) {
        row.querySelector(".fig-palette-editor-color")?.focus();
      }
      row.removeAttribute("trailing");
      row.removeAttribute("show-trailing");
    } else {
      row.setAttribute("trailing", "remove");
      row.setAttribute("show-trailing", "");
    }
    const color = row.querySelector(".fig-palette-editor-color");
    const value = paletteEntryValue(entry);
    this.#setColorValue(color, value);
    color?.setAttribute("aria-label", `Palette color ${index + 1}`);
    color?.toggleAttribute("disabled", this.#disabled);
  }

  #setColorValue(control, value) {
    if (!control || control.getAttribute("value") === value) return;
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
    control.setAttribute("value", value);
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

  #syncRemoveActions() {
    if (!this.isConnected) return;
    this.#rows.forEach((row, index) => {
      const remove = row.querySelector(
        ':scope > [data-fig-property-action="remove"]',
      );
      if (!remove) return;
      remove.classList.add("fig-palette-editor-remove");
      remove.setAttribute("aria-label", `Remove color ${index + 1}`);
      remove.toggleAttribute(
        "disabled",
        this.#disabled || this.#colors.length <= this.#min,
      );
    });
  }

  #sync() {
    if (!this.#mounted) return;
    const fade = this.#overflowMode === "fade";
    this.#reorder.classList.toggle("fig-overflow-fade", fade);
    const showRows = this.#showRows;
    if (showRows === null) {
      this.#reorder.style.removeProperty(
        "--fig-palette-editor-overflow-show-rows",
      );
    } else {
      this.#reorder.style.setProperty(
        "--fig-palette-editor-overflow-show-rows",
        String(showRows),
      );
    }
    this.#reorder.toggleAttribute("disabled", this.#disabled);
    this.#reconcileRows();
    this.#addButton.toggleAttribute(
      "disabled",
      this.#disabled || this.#colors.length >= this.#max,
    );
    if (this.#fixed) {
      if (this.#addField.contains(document.activeElement)) {
        this.#rows[0]
          ?.querySelector(".fig-palette-editor-color")
          ?.focus();
      }
      this.#addField.remove();
    } else if (!this.#addField.isConnected) {
      this.append(this.#addField);
    }
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
    if (!reconcile || !wasActive || !this.#deferredExternalColors) return;
    this.#colors = this.#deferredExternalColors;
    this.#deferredExternalColors = null;
    this.#reflectValue();
    this.#sync();
  }
}

if (!customElements.get("fig-palette-editor")) {
  customElements.define("fig-palette-editor", FigPaletteEditor);
}
