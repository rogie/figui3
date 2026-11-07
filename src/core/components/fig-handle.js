/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figColorEventAliases,
  figDefineElement,
  figGetSharedCanvas,
  figHexToRGB,
  hasFigFillPicker,
} from "../runtime/index.js";

/* Handle */
/**
 * A draggable handle positioned within a drag surface.
 * @attr {number} precision - Decimal places for position values and pixel dragging (default 2).
 */
class FigHandle extends HTMLElement {
  static observedAttributes = [
    "color",
    "selected",
    "disabled",
    "drag",
    "drag-surface",
    "drag-axes",
    "drag-snapping",
    "value",
    "precision",
    "type",
    "tip",
    "hit-area",
    "hit-area-mode",
    "aria-label",
    "aria-labelledby",
  ];

  #isDragging = false;
  #didDrag = false;
  #boundPointerDown = null;
  #activeDragCleanup = null;
  #applyingValue = false;
  #colorTip = null;
  #directColorPicker = null;
  #nativeColorInput = null;
  #hitAreaEl = null;

  get #tipMode() {
    const mode = (this.getAttribute("tip") || "").trim().toLowerCase();
    return mode === "color" || mode === "add" || mode === "remove"
      ? mode
      : null;
  }

  get #canOpenColorPicker() {
    return !this.hasAttribute("data-no-color-picker");
  }

  get #dragEnabled() {
    const v = this.getAttribute("drag");
    return v !== null && v !== "false";
  }

  get #axes() {
    const v = (this.getAttribute("drag-axes") || "x,y").toLowerCase();
    return { x: v.includes("x"), y: v.includes("y") };
  }

  get #dragSnappingMode() {
    const raw = this.getAttribute("drag-snapping");
    if (raw === null) return "false";
    const normalized = raw.trim().toLowerCase();
    if (normalized === "modifier") return "modifier";
    if (normalized === "" || normalized === "true") return "true";
    return "false";
  }

  #shouldSnap(shiftKey) {
    const mode = this.#dragSnappingMode;
    if (mode === "true") return true;
    if (mode === "modifier") return !!shiftKey;
    return false;
  }

  #snapGuide(value) {
    if (value < 0.1) return 0;
    if (value > 0.9) return 1;
    if (value > 0.4 && value < 0.6) return 0.5;
    return value;
  }

  #snapDiagonal(x, y) {
    const diff = Math.abs(x - y);
    if (diff < 0.1) {
      const avg = (x + y) / 2;
      return { x: avg, y: avg };
    }
    if (Math.abs(1 - x - y) < 0.1) return { x, y: 1 - x };
    return { x, y };
  }

  #getContainer() {
    const attr = this.getAttribute("drag-surface");
    if (!attr || attr === "parent") return this.parentElement;
    return this.closest(attr);
  }

  get value() {
    const container = this.#getContainer();
    if (!container) return "0% 0%";
    const { px, py } = this.#positionDetail(container.getBoundingClientRect());
    return `${(px * 100).toFixed(this.precision)}% ${(py * 100).toFixed(this.precision)}%`;
  }

  set value(v) {
    this.setAttribute("value", v ?? "0% 0%");
  }

  get precision() {
    const parsed = Number(this.getAttribute("precision") ?? 2);
    if (!Number.isFinite(parsed)) return 2;
    return Math.max(0, Math.min(10, Math.trunc(parsed)));
  }

  set precision(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("precision");
    } else {
      const parsed = Number(value);
      const precision = Number.isFinite(parsed)
        ? Math.max(0, Math.min(10, Math.trunc(parsed)))
        : 2;
      this.setAttribute("precision", String(precision));
    }
  }

  #roundCoordinate(value) {
    const factor = 10 ** this.precision;
    const rounded = Math.round(value * factor) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  #parseValue(str) {
    const normalized = str == null ? "" : String(str).trim();
    if (!normalized) return { xPct: 0, yPct: 0 };

    const parts = normalized.split(/[\s,]+/).filter(Boolean);

    const parseToken = (token) => {
      if (!token) return 0;
      const hasPx = token.includes("px");
      const hasPct = token.includes("%");
      const numeric = parseFloat(token.replace(/[%px]/g, ""));
      if (!Number.isFinite(numeric)) return 0;
      if (hasPx) return { px: numeric };
      if (hasPct || Math.abs(numeric) > 1)
        return Math.max(0, Math.min(100, numeric));
      return Math.max(0, Math.min(100, numeric * 100));
    };

    const xToken = parseToken(parts[0]);
    const yToken = parseToken(parts[1] ?? parts[0]);
    return { xToken, yToken };
  }

  #applyValue(str) {
    const container = this.#getContainer();
    if (!container) return;

    const { xToken, yToken } = this.#parseValue(str);
    const rect = container.getBoundingClientRect();

    const resolvePx = (token, containerDim) => {
      if (token && typeof token === "object" && "px" in token) {
        return Math.max(0, Math.min(containerDim, token.px));
      }
      return null;
    };

    const resolveResponsive = (token) => {
      const pct = typeof token === "number" ? token : 0;
      return `${this.#roundCoordinate(pct)}%`;
    };

    const axes = this.#axes;
    this.#syncPositionTranslate(axes);
    if (axes.x) {
      const xPx = resolvePx(xToken, rect.width);
      this.style.left =
        xPx === null
          ? resolveResponsive(xToken)
          : `${this.#roundCoordinate(xPx)}px`;
    }
    if (axes.y) {
      const yPx = resolvePx(yToken, rect.height);
      this.style.top =
        yPx === null
          ? resolveResponsive(yToken)
          : `${this.#roundCoordinate(yPx)}px`;
    }
  }

  #syncPositionTranslate(axes = this.#axes) {
    this.style.setProperty(
      "--fig-handle-position-translate",
      `${axes.x ? "-50%" : "0"} ${axes.y ? "-50%" : "0"}`,
    );
  }

  #syncValueAttribute() {
    this.#applyingValue = true;
    this.setAttribute("value", this.value);
    this.#applyingValue = false;
  }

  get #hitAreaMode() {
    return this.getAttribute("hit-area-mode") || "handle";
  }

  #parseHitArea() {
    const raw = this.getAttribute("hit-area");
    if (!raw) return null;
    const tokens = raw.trim().split(/\s+/);
    let vPad = 0,
      hPad = 0,
      circle = false;
    const nums = [];
    for (const t of tokens) {
      if (t === "circle") {
        circle = true;
        continue;
      }
      const n = parseFloat(t);
      if (Number.isFinite(n)) nums.push(n);
    }
    if (nums.length >= 2) {
      vPad = nums[0];
      hPad = nums[1];
    } else if (nums.length === 1) {
      vPad = nums[0];
      hPad = nums[0];
    } else return null;
    return { vPad, hPad, circle };
  }

  #syncHitArea() {
    const parsed = this.#parseHitArea();
    if (!parsed) {
      if (this.#hitAreaEl) {
        this.#hitAreaEl.remove();
        this.#hitAreaEl = null;
      }
      this.style.removeProperty("--fig-handle-hit-area-size");
      return;
    }
    if (!this.#hitAreaEl) {
      const el = document.createElement("div");
      el.classList.add("fig-handle-hit-area");
      el.addEventListener("pointerdown", (e) => this.#onHitAreaPointerDown(e));
      this.prepend(el);
      this.#hitAreaEl = el;
    }
    this.style.setProperty(
      "--fig-handle-hit-area-size",
      String(parsed.hPad * 2),
    );
    if (parsed.circle) {
      this.#hitAreaEl.style.borderRadius = "50%";
    } else {
      this.#hitAreaEl.style.borderRadius = "inherit";
    }
  }

  #onHitAreaPointerDown(e) {
    if (figBooleanAttribute(this, "disabled")) return;
    if (e.target !== this.#hitAreaEl) return;
    if (this.#hitAreaMode === "delegate") {
      e.preventDefault();
      e.stopPropagation();
      this.dispatchEvent(
        new CustomEvent("hitareadown", {
          bubbles: true,
          detail: { originalEvent: e },
        }),
      );
    } else {
      this.#onPointerDown(e);
    }
  }

  connectedCallback() {
    this.#syncA11y();
    this.#syncDrag();
    this.#syncHitArea();
    this.addEventListener("click", this.#handleSelect);
    this.addEventListener("blur", this.#handleBlur);
    document.addEventListener("pointerdown", this.#handleDeselect);
    document.addEventListener("keydown", this.#handleKeyDown);
    const initial = this.getAttribute("value");
    if (initial) this.#applyValue(initial);
    if (this.#tipMode) this.#showColorTip();
  }

  disconnectedCallback() {
    this.#teardownDrag();
    this.#hideColorTip();
    this.#removeDirectColorPicker();
    this.#removeNativeColorInput();
    if (this.#hitAreaEl) {
      this.#hitAreaEl.remove();
      this.#hitAreaEl = null;
    }
    this.removeEventListener("click", this.#handleSelect);
    this.removeEventListener("blur", this.#handleBlur);
    document.removeEventListener("pointerdown", this.#handleDeselect);
    document.removeEventListener("keydown", this.#handleKeyDown);
  }

  select() {
    if (figBooleanAttribute(this, "disabled")) return;
    this.setAttribute("selected", "");
  }

  deselect() {
    this.removeAttribute("selected");
  }

  #handleSelect = (e) => {
    if (this.#didDrag) {
      this.#didDrag = false;
      return;
    }
    this.select();
    if (
      this.getAttribute("type") === "color" &&
      this.#canOpenColorPicker &&
      !this.#tipMode
    ) {
      this.#openDirectColorPicker();
    }
  };

  #handleDeselect = (e) => {
    if (this.contains(e.target)) return;
    if ((this.#colorTip || this.#directColorPicker) && e.target.closest?.("dialog, [popover]")) return;
    this.deselect();
  };

  #handleBlur = () => {
    this.removeAttribute("data-fig-pointer-focus");
  };

  #handleKeyDown = (e) => {
    this.removeAttribute("data-fig-pointer-focus");
    if (e.defaultPrevented) return;
    if (
      e.target === this &&
      this.#dragEnabled &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
    ) {
      if (this.#moveByKeyboard(e)) {
        e.preventDefault();
        if (!figBooleanAttribute(this, "selected")) this.select();
      }
      return;
    }
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target === this && !figBooleanAttribute(this, "selected")) {
      e.preventDefault();
      if (
        this.getAttribute("type") === "color" &&
        this.#canOpenColorPicker &&
        !this.#tipMode
      ) {
        this.#openDirectColorPicker();
      } else {
        this.select();
      }
      return;
    }
    if (!figBooleanAttribute(this, "selected")) return;
    if (this.getAttribute("type") !== "color") return;
    if (!this.#canOpenColorPicker) return;
    e.preventDefault();
    if (!this.#tipMode) {
      this.#openDirectColorPicker();
    }
  };

  #moveByKeyboard(event) {
    if (figBooleanAttribute(this, "disabled")) return false;
    const container = this.#getContainer();
    if (!container) return false;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;

    const axes = this.#axes;
    const current = this.#positionDetail(rect);
    const pctStep = event.shiftKey ? 0.1 : 0.01;
    let px = current.px;
    let py = current.py;

    switch (event.key) {
      case "ArrowLeft":
        if (!axes.x) return false;
        px -= pctStep;
        break;
      case "ArrowRight":
        if (!axes.x) return false;
        px += pctStep;
        break;
      case "ArrowUp":
        if (!axes.y) return false;
        py -= pctStep;
        break;
      case "ArrowDown":
        if (!axes.y) return false;
        py += pctStep;
        break;
      case "Home":
        if (axes.x) px = 0;
        if (axes.y) py = 0;
        break;
      case "End":
        if (axes.x) px = 1;
        if (axes.y) py = 1;
        break;
      default:
        return false;
    }

    px = Math.max(0, Math.min(1, px));
    py = Math.max(0, Math.min(1, py));
    this.#syncPositionTranslate(axes);
    if (axes.x) {
      this.style.left = `${this.#roundCoordinate(px * rect.width)}px`;
    }
    if (axes.y) {
      this.style.top = `${this.#roundCoordinate(py * rect.height)}px`;
    }
    this.#syncValueAttribute();
    const detail = {
      ...this.#positionDetail(rect),
      shiftKey: event.shiftKey,
      keyboard: true,
    };
    this.dispatchEvent(new CustomEvent("input", { bubbles: true, detail }));
    this.dispatchEvent(new CustomEvent("change", { bubbles: true, detail }));
    return true;
  }

  attributeChangedCallback(name, _old, value) {
    if (name === "color") {
      if (!value || value === "false" || value === "true") {
        this.style.removeProperty("--fill");
      } else {
        this.style.setProperty("--fill", value);
      }
      if (this.#colorTip && this.#tipMode === "color" && value) {
        this.#colorTip.setAttribute("value", value);
      }
      this.#syncDirectColorPickerValue();
    }
    if (name === "drag") this.#syncDrag();
    if (name === "hit-area") this.#syncHitArea();
    if (name === "selected") this.#syncColorTipSelected();
    if (
      name === "selected" ||
      name === "disabled" ||
      name === "type" ||
      name === "tip" ||
      name === "aria-label" ||
      name === "aria-labelledby"
    ) {
      this.#syncA11y();
    }
    if (name === "value" && !this.#applyingValue && !this.#isDragging) {
      this.#applyValue(value);
    }
    if (
      name === "precision" &&
      this.isConnected &&
      !this.#isDragging &&
      this.hasAttribute("value")
    ) {
      this.#applyValue(this.getAttribute("value"));
      this.#syncValueAttribute();
    }
    if (name === "tip") {
      this.#hideColorTip();
      if (this.#tipMode) {
        this.#removeDirectColorPicker();
        this.#showColorTip();
      }
    }
  }

  #syncDrag() {
    if (this.#dragEnabled && !this.#boundPointerDown) {
      this.#boundPointerDown = (e) => this.#onPointerDown(e);
      this.addEventListener("pointerdown", this.#boundPointerDown);
    } else if (!this.#dragEnabled && this.#boundPointerDown) {
      this.#teardownDrag();
    }
  }

  #syncA11y() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    if (!this.hasAttribute("role")) this.setAttribute("role", "button");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", disabled ? "-1" : "0");
    else if (disabled) this.setAttribute("tabindex", "-1");
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.setAttribute("aria-pressed", selected ? "true" : "false");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      const mode = this.#tipMode || this.getAttribute("type") || "handle";
      this.setAttribute(
        "aria-label",
        mode === "color" ? "Color handle" : mode === "add" ? "Add handle" : mode === "remove" ? "Remove handle" : "Handle",
      );
    }
  }

  #teardownDrag() {
    this.#activeDragCleanup?.();
    this.#activeDragCleanup = null;
    if (this.#boundPointerDown) {
      this.removeEventListener("pointerdown", this.#boundPointerDown);
      this.#boundPointerDown = null;
    }
    this.#isDragging = false;
    this.#didDrag = false;
  }

  #onPointerDown(e) {
    if (!this.#dragEnabled || figBooleanAttribute(this, "disabled")) return;
    e.preventDefault();
    this.setAttribute("data-fig-pointer-focus", "");
    this.focus();
    this.select();
    const container = this.#getContainer();
    if (!container) return;

    this.#activeDragCleanup?.();
    this.#isDragging = true;
    const axes = this.#axes;
    let lastRect = null;

    const handleRect = this.getBoundingClientRect();
    const handleCenterX = handleRect.left + handleRect.width / 2;
    const handleCenterY = handleRect.top + handleRect.height / 2;
    const offsetX = e.clientX - handleCenterX;
    const offsetY = e.clientY - handleCenterY;

    const startX = e.clientX;
    const startY = e.clientY;
    const DRAG_THRESHOLD = 3;

    const clampAndApply = (clientX, clientY, shiftKey = false) => {
      const rect = container.getBoundingClientRect();
      lastRect = rect;
      const currentPosition = this.#positionDetail(rect);
      const rawCenterX = clientX - offsetX - rect.left;
      const rawCenterY = clientY - offsetY - rect.top;

      const clampedCenterX = Math.max(0, Math.min(rect.width, rawCenterX));
      const clampedCenterY = Math.max(0, Math.min(rect.height, rawCenterY));

      let centerX =
        rect.width > 0
          ? (axes.x ? clampedCenterX / rect.width : currentPosition.px)
          : 0.5;
      let centerY =
        rect.height > 0
          ? (axes.y ? clampedCenterY / rect.height : currentPosition.py)
          : 0.5;

      if (this.#shouldSnap(shiftKey)) {
        if (axes.x) centerX = this.#snapGuide(centerX);
        if (axes.y) centerY = this.#snapGuide(centerY);
        if (axes.x && axes.y) {
          const diagonal = this.#snapDiagonal(centerX, centerY);
          centerX = diagonal.x;
          centerY = diagonal.y;
        }
      }

      this.#syncPositionTranslate(axes);
      if (axes.x) {
        this.style.left = `${this.#roundCoordinate(
          Math.max(0, Math.min(rect.width, centerX * rect.width)),
        )}px`;
      }
      if (axes.y) {
        this.style.top = `${this.#roundCoordinate(
          Math.max(0, Math.min(rect.height, centerY * rect.height)),
        )}px`;
      }
    };

    const onMove = (e) => {
      if (!this.#isDragging) return;
      if (!this.#didDrag) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        this.#closeColorPickerForDrag();
        this.classList.add("dragging");
        this.style.cursor = "grabbing";
        if (!figBooleanAttribute(this, "selected")) this.select();
      }
      this.#didDrag = true;
      clampAndApply(e.clientX, e.clientY, e.shiftKey);
      this.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: {
            ...this.#positionDetail(lastRect),
            shiftKey: e.shiftKey,
          },
        }),
      );
    };

    const onUp = (e) => {
      cleanup();
      if (this.#didDrag) {
        clampAndApply(e.clientX, e.clientY, e.shiftKey);
        this.#syncValueAttribute();
        this.#applyValue(this.getAttribute("value"));
        this.dispatchEvent(
          new CustomEvent("change", {
            bubbles: true,
            detail: this.#positionDetail(lastRect),
          }),
        );
        const swallowClick = (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
        };
        this.addEventListener("click", swallowClick, {
          capture: true,
          once: true,
        });
      } else {
        this.#syncValueAttribute();
      }
      this.#didDrag = false;
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.#isDragging = false;
      this.style.cursor = "";
      this.classList.remove("dragging");
      if (this.#activeDragCleanup === cleanup) {
        this.#activeDragCleanup = null;
      }
    };
    this.#activeDragCleanup = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  showColorTip() {
    if (!this.#tipMode) return;
    if (this.#colorTip) {
      this.#colorTip.style.display = "";
      return;
    }
    this.#showColorTip();
  }

  hideColorTip() {
    if (!this.#colorTip) return;
    this.#colorTip.style.display = "none";
  }

  #normalizeColorForPicker(rawValue = this.getAttribute("color")) {
    const fallback = { color: "#D9D9D9", opacity: 100 };
    const value = String(rawValue || "").trim();
    if (!value) return fallback;

    const normalizeHex = (hex) => {
      const raw = hex.replace("#", "").trim();
      if (raw.length === 3 || raw.length === 4) {
        const [r, g, b, a] = raw;
        return {
          color: `#${r}${r}${g}${g}${b}${b}`.toUpperCase(),
          opacity: a ? Math.round((parseInt(`${a}${a}`, 16) / 255) * 100) : 100,
        };
      }
      if (raw.length === 6 || raw.length === 8) {
        return {
          color: `#${raw.slice(0, 6)}`.toUpperCase(),
          opacity:
            raw.length === 8
              ? Math.round((parseInt(raw.slice(6, 8), 16) / 255) * 100)
              : 100,
        };
      }
      return fallback;
    };

    const rgbToHex = (r, g, b) => {
      const toHex = (v) =>
        Math.max(0, Math.min(255, Math.round(Number(v))))
          .toString(16)
          .padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };

    if (value.startsWith("#")) return normalizeHex(value);

    try {
      const { ctx } = figGetSharedCanvas(1, 1);
      ctx.fillStyle = "#000000";
      ctx.fillStyle = value;
      const resolved = ctx.fillStyle;
      if (resolved.startsWith("#")) return normalizeHex(resolved);
      const rgb = resolved.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/i,
      );
      if (rgb) {
        return {
          color: rgbToHex(rgb[1], rgb[2], rgb[3]),
          opacity: rgb[4] !== undefined ? Math.round(parseFloat(rgb[4]) * 100) : 100,
        };
      }
    } catch {
      // Fall through to fallback.
    }

    return fallback;
  }

  #directColorPickerValue() {
    const { color, opacity } = this.#normalizeColorForPicker();
    return JSON.stringify(
      opacity < 100 ? { type: "solid", color, opacity } : { type: "solid", color },
    );
  }

  #syncDirectColorPickerValue() {
    if (!this.#directColorPicker) return;
    this.#directColorPicker.setAttribute("value", this.#directColorPickerValue());
  }

  #ensureDirectColorPicker() {
    if (!hasFigFillPicker()) return null;
    if (this.#directColorPicker) return this.#directColorPicker;

    const picker = document.createElement("fig-fill-picker");
    picker.setAttribute("mode", "solid");
    picker.setAttribute("alpha", "true");
    picker.setAttribute("dialog-offset", "8 8");
    picker.setAttribute("value", this.#directColorPickerValue());
    picker.anchorElement = this;

    const trigger = document.createElement("span");
    trigger.hidden = true;
    picker.appendChild(trigger);

    picker.addEventListener("input", this.#handleDirectColorPickerInput);
    picker.addEventListener("change", this.#handleDirectColorPickerChange);
    picker.addEventListener("close", this.#handleDirectColorPickerClose);
    this.appendChild(picker);
    this.#directColorPicker = picker;
    return picker;
  }

  #openDirectColorPicker() {
    if (figBooleanAttribute(this, "disabled")) return;
    const picker = this.#ensureDirectColorPicker();
    if (!picker) {
      this.#openNativeColorPicker();
      return;
    }
    this.setAttribute("selected", "");
    this.#syncDirectColorPickerValue();
    picker.open();
  }

  #removeDirectColorPicker() {
    if (!this.#directColorPicker) return;
    this.#directColorPicker.removeEventListener("input", this.#handleDirectColorPickerInput);
    this.#directColorPicker.removeEventListener("change", this.#handleDirectColorPickerChange);
    this.#directColorPicker.removeEventListener("close", this.#handleDirectColorPickerClose);
    this.#directColorPicker.close();
    this.#directColorPicker.remove();
    this.#directColorPicker = null;
    this.removeAttribute("selected");
  }

  #ensureNativeColorInput() {
    if (this.#nativeColorInput) return this.#nativeColorInput;
    const input = document.createElement("input");
    input.type = "color";
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    input.style.position = "fixed";
    input.style.inlineSize = "1px";
    input.style.blockSize = "1px";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.addEventListener("input", this.#handleNativeColorInput);
    input.addEventListener("change", this.#handleNativeColorChange);
    this.appendChild(input);
    this.#nativeColorInput = input;
    return input;
  }

  #openNativeColorPicker() {
    const input = this.#ensureNativeColorInput();
    const { color } = this.#normalizeColorForPicker();
    input.value = color;
    this.setAttribute("selected", "");
    input.click();
  }

  #removeNativeColorInput() {
    if (!this.#nativeColorInput) return;
    this.#nativeColorInput.removeEventListener("input", this.#handleNativeColorInput);
    this.#nativeColorInput.removeEventListener("change", this.#handleNativeColorChange);
    this.#nativeColorInput.remove();
    this.#nativeColorInput = null;
  }

  #closeColorPickerForDrag() {
    if (this.getAttribute("type") !== "color") return;
    this.#directColorPicker?.close();
  }

  #showColorTip() {
    const mode = this.#tipMode;
    if (!mode) return;
    if (this.#colorTip) return;
    const tip = document.createElement("fig-color-tip");
    if (mode === "add" || mode === "remove") {
      tip.setAttribute("control", mode);
    } else {
      tip.setAttribute("value", this.getAttribute("color") || "#D9D9D9");
      tip.setAttribute("alpha", "true");
    }
    tip.addEventListener("input", this.#handleColorTipInput);
    tip.addEventListener("change", this.#handleColorTipChange);
    tip.addEventListener("add", this.#handleColorTipControl);
    tip.addEventListener("remove", this.#handleColorTipControl);
    this.appendChild(tip);
    this.#colorTip = tip;
    this.#syncColorTipSelected();
  }

  #hideColorTip() {
    if (!this.#colorTip) return;
    this.#colorTip.removeEventListener("input", this.#handleColorTipInput);
    this.#colorTip.removeEventListener("change", this.#handleColorTipChange);
    this.#colorTip.removeEventListener("add", this.#handleColorTipControl);
    this.#colorTip.removeEventListener("remove", this.#handleColorTipControl);
    this.#colorTip.remove();
    this.#colorTip = null;
  }

  #syncColorTipSelected() {
    if (!this.#colorTip || this.#tipMode !== "color") return;
    const selected =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.#colorTip.toggleAttribute("selected", selected);
  }

  #colorWithOpacity(hex, opacity) {
    if (opacity === undefined || opacity >= 100) return hex;
    const { r, g, b } = figHexToRGB(hex);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  }

  #detailFromPicker(detail) {
    if (!detail?.color) return null;
    const opacity =
      detail.opacity !== undefined
        ? detail.opacity
        : detail.alpha !== undefined
          ? Math.round(detail.alpha * 100)
          : undefined;
    return {
      color: detail.color,
      opacity,
      ...figColorEventAliases(detail.color, detail.alpha, opacity),
    };
  }

  #handleDirectColorPickerInput = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromPicker(e.detail);
    if (!detail) return;
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail,
      }),
    );
  };

  #handleDirectColorPickerChange = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromPicker(e.detail);
    if (!detail) return;
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail,
      }),
    );
  };

  #detailFromNativeColor(value) {
    const { opacity } = this.#normalizeColorForPicker();
    const detail = opacity < 100 ? { color: value, opacity } : { color: value };
    return {
      ...detail,
      ...figColorEventAliases(value, undefined, opacity),
    };
  }

  #handleNativeColorInput = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromNativeColor(e.target.value);
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail,
      }),
    );
  };

  #handleNativeColorChange = (e) => {
    e.stopPropagation();
    const detail = this.#detailFromNativeColor(e.target.value);
    this.setAttribute("color", this.#colorWithOpacity(detail.color, detail.opacity));
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail,
      }),
    );
    if (this.isConnected) this.focus();
  };

  #handleDirectColorPickerClose = () => {
    if (!this.isConnected) return;
    this.setAttribute("selected", "");
    this.focus();
  };

  #handleColorTipInput = (e) => {
    e.stopPropagation();
    if (e.detail?.color) {
      const detail = {
        color: e.detail.color,
        opacity: e.detail.opacity,
        ...figColorEventAliases(
          e.detail.color,
          e.detail.alpha,
          e.detail.opacity,
        ),
      };
      this.setAttribute(
        "color",
        this.#colorWithOpacity(detail.color, detail.opacity),
      );
      this.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail,
        }),
      );
    }
  };

  #handleColorTipChange = (e) => {
    e.stopPropagation();
    if (e.detail?.color) {
      const detail = {
        color: e.detail.color,
        opacity: e.detail.opacity,
        ...figColorEventAliases(
          e.detail.color,
          e.detail.alpha,
          e.detail.opacity,
        ),
      };
      this.setAttribute(
        "color",
        this.#colorWithOpacity(detail.color, detail.opacity),
      );
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail,
        }),
      );
    }
  };

  #handleColorTipControl = (e) => {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(e.type, { bubbles: true, composed: true }),
    );
  };

  #positionDetail(containerRect) {
    const rect = containerRect || this.#getContainer()?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, px: 0, py: 0 };
    const handleRect = this.getBoundingClientRect();
    const hw = this.offsetWidth / 2;
    const hh = this.offsetHeight / 2;
    const x = handleRect.left - rect.left;
    const y = handleRect.top - rect.top;
    const centerX = x + hw;
    const centerY = y + hh;
    const px = rect.width > 0 ? centerX / rect.width : 0;
    const py = rect.height > 0 ? centerY / rect.height : 0;
    return {
      x: this.#roundCoordinate(x),
      y: this.#roundCoordinate(y),
      px,
      py,
    };
  }
}
figDefineElement("fig-handle", FigHandle);

export { FigHandle };
