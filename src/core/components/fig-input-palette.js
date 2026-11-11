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
  figDefineElement,
  figGetOverlayRoot,
  figUniqueId,
  figValuesEqual,
} from "../runtime/index.js";

/* Input Palette */
/**
 * A palette of solid colors rendered as a segmented fig-swatch preview.
 * Manages an internal array of colors with optional add/remove support.
 * @attr {string} value - JSON array of hex strings or {color,alpha} objects, or comma-separated hex
 * @attr {boolean} disabled - Whether the palette is disabled
 * @attr {boolean} fixed - When set (or `fixed="true"`), palette length is locked — no add or remove
 * @attr {number} min - Minimum number of colors (default: 2)
 * @attr {number} max - Maximum number of colors (default: 8); add button hidden at max
 * @attr {string} edit - Editing mode: "true" (inline, default), "false" (preview), or "picker"
 * @fires input - During color editing (detail: full color array)
 * @fires change - On committed color edits or add (detail: full color array)
 */
class FigInputPalette extends HTMLElement {
  #colors = [];
  #expandedPickers = [];
  #renderRAF = null;
  #pickerDefinitionPromise = null;
  #pickerPopup = null;
  #pickerPopupAnchor = null;
  #pickerPopupAnchorResizeObserver = null;
  #syncingValueAttribute = false;
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #boundHandleHostFocus = () => this.focus();
  #boundPickerLifecycle = (event) => {
    if (event.target !== this.#pickerPopup) return;
    const state = event.detail?.state;
    const expanded = state === "opening" || state === "open";
    this.#syncTriggerState();
    if (!expanded && this.open) this.open = false;
    if (state === "closed") {
      this.#pickerPopupAnchorResizeObserver?.disconnect();
    }
  };
  static get observedAttributes() {
    return [
      "value",
      "default",
      "disabled",
      "min",
      "max",
      "open",
      "fixed",
      "edit",
    ];
  }

  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }

  set open(value) {
    const was = this.open;
    if (value && this.#editMode !== "false") {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
    const next = this.open;
    if (was !== next) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: next },
          bubbles: true,
        }),
      );
    }
  }

  get #isFixed() {
    return (
      this.hasAttribute("fixed") && this.getAttribute("fixed") !== "false"
    );
  }

  get #editMode() {
    const value = this.getAttribute("edit");
    if (value === "false") return "false";
    if (value === "picker") return "picker";
    return "true";
  }

  #pickerExpanded() {
    const state = this.#pickerPopup?.lifecycleState;
    return state === "opening" || state === "open";
  }

  get #min() {
    const v = parseInt(this.getAttribute("min"));
    return isNaN(v) ? 2 : v;
  }

  get #max() {
    const v = parseInt(this.getAttribute("max"));
    return isNaN(v) ? 8 : v;
  }

  connectedCallback() {
    this.setAttribute("tabindex", "-1");
    this.removeEventListener("focus", this.#boundHandleHostFocus);
    this.addEventListener("focus", this.#boundHandleHostFocus);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    if (this.#renderRAF) cancelAnimationFrame(this.#renderRAF);
    this.#renderRAF = requestAnimationFrame(() => {
      this.#renderRAF = null;
      if (!this.isConnected) return;
      this.#parseValue();
      this.#render();
      this.#renderPickerWhenAvailable();
    });
  }

  disconnectedCallback() {
    if (this.#renderRAF) {
      cancelAnimationFrame(this.#renderRAF);
      this.#renderRAF = null;
    }
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.removeEventListener("focus", this.#boundHandleHostFocus);
    this.#expandedPickers = [];
    this.#destroyPickerPopup();
  }

  #handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== this.querySelector(".palette-colors-inline")) return;
    if (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") return;
    if (this.#editMode === "false") return;
    event.preventDefault();
    event.stopPropagation();
    this.open = true;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#syncingValueAttribute) return;

    switch (name) {
      case "value":
        this.#parseValue();
        this.#syncPickers();
        this.#syncPickerEditor();
        break;
      case "disabled":
        this.#syncDisabled();
        break;
      case "min":
      case "max":
      case "fixed":
        this.#render();
        this.#syncPickerEditor();
        break;
      case "open":
        this.#syncTriggerState();
        this.#syncPickerOpenState();
        break;
      case "edit":
        if (this.#editMode === "false" && this.open) this.open = false;
        if (this.#editMode !== "picker") this.#destroyPickerPopup();
        this.#render();
        this.#renderPickerWhenAvailable();
        break;
    }
  }

  #parseValue() {
    this.#colors = this.#parseColors(this.getAttribute("value"));
  }

  #normalizePaletteEntry(entry) {
    const source =
      typeof entry === "string"
        ? { color: entry.slice(0, 7), alpha: entry.length > 7
            ? parseInt(entry.slice(7, 9), 16) / 255
            : 1 }
        : entry && typeof entry === "object"
          ? {
              color: entry.color || "#D9D9D9",
              alpha:
                entry.alpha !== undefined
                  ? Number(entry.alpha)
                  : entry.opacity !== undefined
                    ? Number(entry.opacity) / 100
                    : 1,
            }
          : { color: "#D9D9D9", alpha: 1 };
    const alpha = Number.isFinite(source.alpha)
      ? Math.max(0, Math.min(1, source.alpha))
      : 1;
    return {
      color: String(source.color || "#D9D9D9").slice(0, 7).toUpperCase(),
      alpha,
    };
  }

  #parseColors(raw) {
    if (!raw) return [];
    const trimmed = raw.trim();

    // Try JSON first
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => this.#normalizePaletteEntry(entry));
      }
    } catch (e) {
      // Not JSON — try comma-separated hex
    }

    // Comma-separated hex
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((s) => {
        return this.#normalizePaletteEntry(s.trim());
      });
    }

    // Single hex
    if (trimmed.startsWith("#")) {
      return [this.#normalizePaletteEntry(trimmed)];
    }

    return [];
  }

  get value() {
    return this.#colors.map((c) => this.#normalizePaletteEntry(c));
  }

  set value(val) {
    if (typeof val === "string") {
      this.setAttribute("value", val);
    } else {
      this.setAttribute("value", JSON.stringify(val));
    }
  }

  get default() {
    return this.#parseColors(this.getAttribute("default")).map((c) => ({
      ...c,
    }));
  }

  set default(val) {
    if (val === null || val === undefined || val === "") {
      this.removeAttribute("default");
    } else if (typeof val === "string") {
      this.setAttribute("default", val);
    } else {
      this.setAttribute("default", JSON.stringify(val));
    }
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(val) {
    this.default = val;
  }

  get isDefault() {
    return figValuesEqual(this.value, this.default);
  }

  resetToDefault() {
    if (
      (this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false") ||
      this.isDefault
    )
      return;
    this.value = this.default;
    this.#emitInput();
    this.#emitChange();
  }

  #render() {
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const editMode = this.#editMode;
    const interactive = editMode !== "false";

    this.replaceChildren();
    this.#expandedPickers = [];

    const inlineWrap = document.createElement("div");
    inlineWrap.className = "palette-colors-inline";
    if (interactive) {
      inlineWrap.setAttribute("role", "button");
      inlineWrap.setAttribute("tabindex", disabled ? "-1" : "+0");
      inlineWrap.setAttribute(
        "aria-expanded",
        String(editMode === "picker" ? this.#pickerExpanded() : this.open),
      );
      inlineWrap.setAttribute("aria-label", "Edit palette colors");
      if (editMode === "picker") inlineWrap.setAttribute("aria-haspopup", "dialog");
    } else {
      inlineWrap.setAttribute("role", "img");
      inlineWrap.setAttribute("aria-label", "Palette colors");
    }
    inlineWrap.addEventListener("blur", () => {
      inlineWrap.style.removeProperty("outline");
      inlineWrap.style.removeProperty("outline-offset");
    });
    const openPalette = () => {
      if (
        this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false"
      )
        return;
      this.open = true;
    };
    if (interactive) inlineWrap.addEventListener("click", openPalette);

    const wrap = document.createElement("fig-swatch");
    wrap.className = "palette-colors";
    wrap.setAttribute("background", this.#paletteGradient());
    inlineWrap.appendChild(wrap);
    this.appendChild(inlineWrap);
    this.#syncTriggerState();

    if (editMode === "true") {
      if (!this.#isFixed) this.#createAddButton(disabled, this);

      const expandedWrap = document.createElement("div");
      expandedWrap.className = "palette-colors-expanded";
      this.#colors.forEach((entry, i) => {
        expandedWrap.appendChild(this.#createPicker(entry, i, disabled));
        if (!this.#isFixed) {
          expandedWrap.appendChild(this.#createRemoveButton(i, disabled));
        }
      });
      this.appendChild(expandedWrap);
    }
  }

  #renderPickerWhenAvailable() {
    if (
      this.#editMode !== "picker" ||
      customElements.get("fig-popup-palette")
    ) {
      this.#syncPickerOpenState();
      return;
    }
    this.#pickerDefinitionPromise ??= customElements
      .whenDefined("fig-popup-palette")
      .then(() => {
        if (!this.isConnected || this.#editMode !== "picker") return;
        this.#syncPickerOpenState();
      });
  }

  #ensurePickerPopup() {
    if (this.#pickerPopup?.isConnected) return this.#pickerPopup;
    if (!customElements.get("fig-popup-palette")) return null;

    const popup = document.createElement("dialog", {
      is: "fig-popup-palette",
    });
    popup.setAttribute("is", "fig-popup-palette");
    popup.id = figUniqueId();

    const handlePopupEvent = (event) => {
      event.stopPropagation();
      if (!Array.isArray(event.detail)) return;
      this.#colors = event.detail.map((entry) => ({
        color: entry?.color || "#D9D9D9",
        alpha: Number.isFinite(Number(entry?.alpha))
          ? Math.max(0, Math.min(1, Number(entry.alpha)))
          : 1,
      }));
      this.#syncingValueAttribute = true;
      this.setAttribute("value", JSON.stringify(this.#colors));
      this.#syncingValueAttribute = false;
      this.#syncPickers();
      this.dispatchEvent(
        new CustomEvent(event.type, {
          bubbles: true,
          detail: this.value,
        }),
      );
    };
    popup.addEventListener("input", handlePopupEvent);
    popup.addEventListener("change", handlePopupEvent);
    popup.addEventListener(
      "fig-popup-lifecycle",
      this.#boundPickerLifecycle,
    );

    (figGetOverlayRoot() ?? document.body).append(popup);
    this.#pickerPopup = popup;
    this.#syncPickerPopupAnchor();
    this.querySelector(".palette-colors-inline")?.setAttribute(
      "aria-controls",
      popup.id,
    );
    this.#syncPickerEditor();
    return popup;
  }

  #resolvePickerPopupAnchor() {
    const parent = this.parentElement;
    return parent?.matches('fig-property[activation="row"]') ? parent : this;
  }

  #syncPickerPopupAnchor() {
    if (!this.#pickerPopup) return;
    const anchor = this.#resolvePickerPopupAnchor();
    this.#pickerPopupAnchor = anchor;
    this.#pickerPopup.anchor = anchor;
    this.#pickerPopup.setAttribute(
      "offset",
      anchor === this ? "0 8" : "0 0",
    );
    this.#pickerPopupAnchorResizeObserver ??= new ResizeObserver(() =>
      this.#syncPickerPopupWidth(),
    );
    this.#pickerPopupAnchorResizeObserver.disconnect();
    this.#pickerPopupAnchorResizeObserver.observe(anchor);
    this.#syncPickerPopupWidth();
  }

  #syncPickerPopupWidth() {
    if (!this.#pickerPopup) return;
    if (this.#pickerPopupAnchor === this) {
      this.#pickerPopup.style.removeProperty("width");
      return;
    }
    const width = this.#pickerPopupAnchor?.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) {
      this.#pickerPopup.style.width = `${width}px`;
    }
  }

  #syncPickerEditor() {
    const popup = this.#pickerPopup;
    if (!popup) return;
    popup.setAttribute("value", JSON.stringify(this.#colors));
    popup.setAttribute("min", String(this.#min));
    popup.setAttribute("max", String(this.#max));
    popup.toggleAttribute("fixed", this.#isFixed);
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    popup.toggleAttribute("disabled", disabled);
  }

  #syncPickerOpenState() {
    if (!this.isConnected || this.#editMode !== "picker") return;
    if (!customElements.get("fig-popup-palette")) {
      this.#renderPickerWhenAvailable();
      return;
    }
    if (!this.open) {
      if (this.#pickerPopup) this.#pickerPopup.open = false;
      this.#pickerPopupAnchorResizeObserver?.disconnect();
      return;
    }
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    if (disabled) {
      this.open = false;
      return;
    }
    const popup = this.#ensurePickerPopup();
    if (!popup) return;
    this.#syncPickerEditor();
    this.#syncPickerPopupAnchor();
    popup.open = true;
  }

  #destroyPickerPopup() {
    if (!this.#pickerPopup) return;
    this.#pickerPopup.removeEventListener(
      "fig-popup-lifecycle",
      this.#boundPickerLifecycle,
    );
    this.#pickerPopup.open = false;
    this.#pickerPopup.remove();
    this.querySelector(".palette-colors-inline")?.removeAttribute(
      "aria-controls",
    );
    this.#pickerPopupAnchorResizeObserver?.disconnect();
    this.#pickerPopupAnchor = null;
    this.#pickerPopup = null;
  }

  #paletteGradient() {
    if (!this.#colors.length) {
      return "linear-gradient(to right, transparent 0%, transparent 100%)";
    }
    const formatPercent = (value) =>
      `${Number(value.toFixed(4))}%`;
    const stops = this.#colors.flatMap((entry, index) => {
      const start = formatPercent((index / this.#colors.length) * 100);
      const end = formatPercent(((index + 1) / this.#colors.length) * 100);
      const alpha = Math.max(0, Math.min(1, Number(entry.alpha)));
      const color =
        alpha < 1
          ? `${entry.color}${Math.round(alpha * 255)
              .toString(16)
              .padStart(2, "0")
              .toUpperCase()}`
          : entry.color;
      return [`${color} ${start}`, `${color} ${end}`];
    });
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }

  #syncPaletteSwatch() {
    this.querySelector("fig-swatch.palette-colors")?.setAttribute(
      "background",
      this.#paletteGradient(),
    );
  }

  #createPicker(entry, index, disabled) {
    const hexAlpha =
      entry.alpha < 1
        ? entry.color +
          Math.round(entry.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : entry.color;
    const ic = document.createElement("fig-input-color");
    ic.setAttribute("value", hexAlpha);
    ic.setAttribute("text", "true");
    ic.setAttribute("alpha", "true");
    ic.setAttribute("full", "");
    if (disabled) ic.setAttribute("disabled", "");

    const updateFromPicker = (e) => {
      e.stopPropagation();
      const el = e.currentTarget;
      this.#colors[index] = {
        color: el.hexOpaque || this.#colors[index].color,
        alpha: el.rgba ? el.rgba.a : this.#colors[index].alpha,
      };
      this.#syncPaletteSwatch();
    };

    ic.addEventListener("input", (e) => {
      updateFromPicker(e);
      this.#emitInput();
    });

    ic.addEventListener("change", (e) => {
      updateFromPicker(e);
      this.#emitChange();
    });

    this.#expandedPickers.push(ic);
    return ic;
  }

  #createRemoveButton(index, disabled) {
    const btn = document.createElement("fig-button");
    btn.setAttribute("variant", "ghost");
    btn.setAttribute("icon", "true");
    btn.setAttribute("aria-label", "Remove color");
    btn.className = "palette-remove-btn";
    if (disabled || this.#colors.length <= this.#min) btn.setAttribute("disabled", "");
    btn.appendChild(createFigIcon("minus"));
    btn.addEventListener("click", () => {
      if (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") return;
      this.#removeColor(index);
    });
    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Remove color");
    tooltip.appendChild(btn);
    return tooltip;
  }

  #removeColor(index) {
    if (this.#isFixed) return;
    if (index < 0 || index >= this.#colors.length) return;
    if (this.#colors.length <= this.#min) return;
    this.#colors.splice(index, 1);
    this.#expandedPickers = [];
    this.#render();
    this.#emitChange();
  }

  #createAddButton(disabled, parent = this) {
    const atMax = this.#colors.length >= this.#max;
    const addBtn = document.createElement("fig-button");
    addBtn.setAttribute("variant", "ghost");
    addBtn.setAttribute("icon", "true");
    addBtn.setAttribute("aria-label", "Add color");
    addBtn.className = "palette-add-btn";
    if (disabled || atMax) addBtn.setAttribute("disabled", "");
    addBtn.appendChild(createFigIcon("add"));
    addBtn.addEventListener("click", () => {
      if (
        this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false"
      )
        return;
      if (this.#colors.length >= this.#max) return;
      this.open = true;
      this.#addColor({ color: "#D9D9D9", alpha: 1 });
    });
    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Add color");
    tooltip.appendChild(addBtn);
    parent.appendChild(tooltip);
  }

  #addColor(entry) {
    if (this.#isFixed) return;
    this.#colors.push(entry);
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const index = this.#colors.length - 1;
    this.#syncPaletteSwatch();

    const expandedIc = this.#createPicker(entry, index, disabled);
    const expandedWrap = this.querySelector(".palette-colors-expanded");
    if (expandedWrap) {
      expandedWrap.appendChild(expandedIc);
      expandedWrap.appendChild(this.#createRemoveButton(index, disabled));
    }

    if (this.#colors.length >= this.#max) {
      const addBtn = this.querySelector(".palette-add-btn");
      if (addBtn) addBtn.setAttribute("disabled", "");
    }
    this.#syncRemoveButtons(disabled);
    this.#emitChange();
  }

  #updateChit(index) {
    const entry = this.#colors[index];
    if (!entry) return;
    const hexAlpha =
      entry.alpha < 1
        ? entry.color +
          Math.round(entry.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : entry.color;
    const exp = this.#expandedPickers[index];
    if (exp) exp.setAttribute("value", hexAlpha);
    this.#syncPaletteSwatch();
  }

  #syncPickers() {
    if (
      this.#editMode === "true" &&
      this.#expandedPickers.length !== this.#colors.length
    ) {
      this.#render();
      return;
    }
    this.#colors.forEach((_, i) => {
      this.#updateChit(i);
    });
  }

  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    this.#expandedPickers.forEach((fp) => {
      if (disabled) fp.setAttribute("disabled", "");
      else fp.removeAttribute("disabled");
    });
    const addBtn = this.querySelector(".palette-add-btn");
    if (addBtn) {
      if (disabled || this.#colors.length >= this.#max) addBtn.setAttribute("disabled", "");
      else addBtn.removeAttribute("disabled");
    }
    this.#syncRemoveButtons(disabled);
    this.#syncTriggerState();
    this.#syncPickerEditor();
    if (disabled && this.#editMode === "picker" && this.open) {
      this.open = false;
    }
  }

  #syncTriggerState() {
    const trigger = this.querySelector(".palette-colors-inline");
    if (!trigger) return;
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    if (this.#editMode === "false") {
      trigger.removeAttribute("tabindex");
      trigger.removeAttribute("aria-disabled");
      trigger.removeAttribute("aria-expanded");
      trigger.removeAttribute("aria-haspopup");
      return;
    }
    trigger.setAttribute("tabindex", disabled ? "-1" : "+0");
    trigger.setAttribute("aria-disabled", String(disabled));
    trigger.setAttribute(
      "aria-expanded",
      String(
        this.#editMode === "picker" ? this.#pickerExpanded() : this.open,
      ),
    );
    if (this.#editMode === "picker") {
      trigger.setAttribute("aria-haspopup", "dialog");
    } else {
      trigger.removeAttribute("aria-haspopup");
    }
  }

  focus(options) {
    if (
      this.#editMode === "false" ||
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    const trigger = this.querySelector(".palette-colors-inline");
    if (!trigger) return;
    trigger.style.outline = "var(--figma-focus-outline)";
    trigger.style.outlineOffset = "var(--figma-focus-outline-offset)";
    trigger.focus(options);
  }

  activate(options) {
    if (
      this.#editMode === "false" ||
      figBooleanAttribute(this, "disabled")
    )
      return;
    this.focus(options);
    this.querySelector(".palette-colors-inline")?.click();
  }

  #syncRemoveButtons(disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false") {
    const shouldDisable = disabled || this.#colors.length <= this.#min;
    this.querySelectorAll(".palette-remove-btn").forEach((btn) => {
      if (shouldDisable) btn.setAttribute("disabled", "");
      else btn.removeAttribute("disabled");
    });
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }
}
figDefineElement("fig-input-palette", FigInputPalette);

export { FigInputPalette };
