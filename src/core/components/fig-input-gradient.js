/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figCloneValue,
  figCreateElement,
  figDefineElement,
  figGetOverlayRoot,
  figHexToRGB,
  figUniqueId,
  figValuesEqual,
} from "../runtime/index.js";
import {
  GRADIENT_HUE_INTERPOLATIONS,
  GRADIENT_HUE_SPACES,
  GRADIENT_INTERPOLATION_SPACES,
  GRADIENT_PICKER_SPACES,
  figCssUrl,
  figLooksLikeVideoUrl,
  figSampleGradientAt,
  gradientInterpolationClause,
  gradientToValueShape,
  normalizeGradientConfig,
} from "../runtime/gradient.js";

/* Input Gradient */
/**
 * A gradient-only fill input with inline and reusable popup editing modes.
 * @attr {string} value - JSON string with gradient fill data
 * @attr {string} size - Passed through to the internal fig-swatch (e.g. "large")
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {string} edit - `"true"` for inline stops, `"false"` for preview, or `"picker"` for fig-popup-gradient
 * @fires input - When the gradient value changes
 * @fires change - When the gradient value is committed
 */
class FigInputGradient extends HTMLElement {
  static SHIFT_SNAP = 5;
  #swatch;
  #track;
  #handleDragging = false;
  #arrowTooltipTimer = null;
  #colorObserver = null;
  #repositionRAF = null;
  #pickerDefinitionPromise = null;
  #pickerPopup = null;
  #pickerPopupAnchor = null;
  #pickerPopupAnchorResizeObserver = null;
  #syncingValueAttribute = false;
  anchorElement = null;
  #boundPickerClosed = () => {
    if (!this.#pickerPopup) return;
    if (
      this.#pickerPopup.hasAttribute("open") ||
      this.#pickerPopup.matches?.(":open") ||
      this.#pickerPopup.matches?.(":popover-open")
    ) {
      return;
    }
    this.classList.remove("has-popup-open");
    this.#pickerPopupAnchorResizeObserver?.disconnect();
  };
  #gradient = {
    type: "linear",
    angle: 90,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "default", "disabled", "edit", "mode", "size"];
  }

  get #editMode() {
    const attr = this.getAttribute("edit");
    if (attr === "false") return "false";
    if (attr === "picker") return "picker";
    return "true";
  }

  get #isEditable() {
    return this.#editMode === "true";
  }

  get #stopHandleMode() {
    return this.getAttribute("mode") === "tip" ? "tip" : "handle";
  }

  #firstStopHandle() {
    if (!this.#track) return null;
    return this.#track.querySelector(
      "fig-handle:not(.fig-input-gradient-ghost):not([disabled])",
    );
  }

  #activeStopHandle() {
    if (!this.#track) return null;
    const selected = this.#track.querySelector(
      "fig-handle[selected]:not(.fig-input-gradient-ghost)",
    );
    if (selected) return selected;
    const active = document.activeElement;
    if (!(active instanceof Element) || !this.#track.contains(active)) {
      return null;
    }
    return active.closest("fig-handle:not(.fig-input-gradient-ghost)");
  }

  #activateStopHandle(handle) {
    if (!handle || !this.#track) return;
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((other) => {
        if (other !== handle) other.deselect();
      });
    handle.select();
    handle.focus();
  }

  #syncFocusTarget() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    if (disabled) {
      this.setAttribute("tabindex", "-1");
      return;
    }
    this.setAttribute("tabindex", this.#isEditable ? "-1" : "0");
  }

  #normalizeGradient(gradient) {
    const normalized = normalizeGradientConfig(gradient);
    const stops = Array.isArray(normalized.stops)
      ? normalized.stops
          .map((stop) => ({
            position: Number.isFinite(Number(stop?.position))
              ? Math.max(0, Math.min(100, Number(stop.position)))
              : 0,
            color: String(stop?.color || "#D9D9D9").toUpperCase(),
            opacity: Number.isFinite(Number(stop?.opacity))
              ? Math.max(0, Math.min(100, Number(stop.opacity)))
              : 100,
          }))
          .sort((left, right) => left.position - right.position)
      : [];
    return {
      ...normalized,
      type: ["linear", "radial", "angular"].includes(
        String(normalized.type).toLowerCase(),
      )
        ? String(normalized.type).toLowerCase()
        : "linear",
      angle: Number.isFinite(Number(normalized.angle))
        ? Number(normalized.angle)
        : 90,
      centerX: Number.isFinite(Number(normalized.centerX))
        ? Number(normalized.centerX)
        : 50,
      centerY: Number.isFinite(Number(normalized.centerY))
        ? Number(normalized.centerY)
        : 50,
      stops,
    };
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
    this.#renderPickerWhenAvailable();
    this.removeEventListener("click", this.#onPickerClick);
    this.addEventListener("click", this.#onPickerClick);
    this.removeEventListener("keydown", this.#onPickerKeyDown);
    this.addEventListener("keydown", this.#onPickerKeyDown);
    if (this.#isEditable) document.addEventListener("keydown", this.#onKeyDown);
  }

  #renderPickerWhenAvailable() {
    if (
      this.#editMode !== "picker" ||
      customElements.get("fig-popup-gradient")
    ) {
      return;
    }
    this.#pickerDefinitionPromise ??= customElements
      .whenDefined("fig-popup-gradient")
      .then(() => {
        if (!this.isConnected || this.#editMode !== "picker") return;
        this.#render();
      });
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this.#onKeyDown);
    this.removeEventListener("click", this.#onPickerClick);
    this.removeEventListener("keydown", this.#onPickerKeyDown);
    this.#destroyPickerPopup();
    if (this.#colorObserver) {
      this.#colorObserver.disconnect();
      this.#colorObserver = null;
    }
    if (this.#repositionRAF !== null) {
      cancelAnimationFrame(this.#repositionRAF);
      this.#repositionRAF = null;
    }
    clearTimeout(this.#arrowTooltipTimer);
    this.removeEventListener("pointerenter", this.#onTrackEnter);
    this.removeEventListener("pointermove", this.#onTrackMove);
    this.removeEventListener("pointerleave", this.#onTrackLeave);
    this.removeEventListener("click", this.#onTrackClick);
    this.removeEventListener("dblclick", this.#onTrackDblClick);
  }

  #onKeyDown = (e) => {
    const active = document.activeElement;
    const activeIsInside = active instanceof Node && this.contains(active);
    const selectedHandle = this.#track?.querySelector(
      "fig-handle[selected]:not(.fig-input-gradient-ghost)",
    );
    const focusLostToBody =
      !active ||
      active === document.body ||
      active === document.documentElement;
    if (!activeIsInside && !(selectedHandle && focusLostToBody)) return;
    const isTyping =
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable);
    if (!this.#track) return;

    if (e.key === "Tab" && !isTyping) {
      const selected = this.#activeStopHandle();
      if (!selected) return;
      e.preventDefault();
      const handles = [
        ...this.#track.querySelectorAll(
          "fig-handle:not(.fig-input-gradient-ghost)",
        ),
      ];
      const curIdx = handles.indexOf(selected);
      const next = e.shiftKey
        ? (curIdx - 1 + handles.length) % handles.length
        : (curIdx + 1) % handles.length;
      selected.deselect();
      this.#activateStopHandle(handles[next]);
      return;
    }

    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping) {
      const selected = this.#activeStopHandle();
      if (!selected) return;
      const idx = parseInt(selected.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      e.preventDefault();
      const delta =
        (e.key === "ArrowRight" ? 1 : -1) *
        (e.shiftKey ? FigInputGradient.SHIFT_SNAP : 1);
      const stop = this.#gradient.stops[idx];
      stop.position = Math.max(0, Math.min(100, stop.position + delta));
      selected.setAttribute("value", `${stop.position}% 50%`);
      const tip = selected.closest("fig-tooltip");
      if (tip) {
        tip.text = `${Math.round(stop.position)}%`;
        tip.setAttribute("show", "true");
        tip.showPopup();
        selected.hideColorTip();
        clearTimeout(this.#arrowTooltipTimer);
        this.#arrowTooltipTimer = setTimeout(() => {
          tip.removeAttribute("show");
          selected.showColorTip();
        }, 600);
      }
      this.#syncSwatch();
      this.#emitInput();
      this.#emitChange();
      return;
    }

    if (e.key !== "Delete" && e.key !== "Backspace") return;
    if (isTyping) return;
    if (this.#gradient.stops.length <= 2) return;
    const selected = this.#activeStopHandle();
    if (!selected) return;
    const idx = parseInt(selected.dataset.stopIndex, 10);
    if (isNaN(idx) || !this.#gradient.stops[idx]) return;
    e.preventDefault();
    this.#gradient.stops.splice(idx, 1);
    this.#syncHandles();
    this.#syncSwatch();
    this.#emitInput();
    this.#emitChange();
    const nextIdx = Math.min(idx, this.#gradient.stops.length - 1);
    const next = this.#track.querySelectorAll(
      "fig-handle:not(.fig-input-gradient-ghost)",
    )[nextIdx];
    this.#activateStopHandle(next);
  };

  #onPickerKeyDown = (e) => {
    if (this.#editMode !== "picker") return;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (figBooleanAttribute(this, "disabled")) return;
    e.preventDefault();
    this.#openPickerPopup();
  };

  #onPickerClick = () => {
    if (
      this.#editMode !== "picker" ||
      figBooleanAttribute(this, "disabled")
    ) {
      return;
    }
    this.#openPickerPopup();
  };

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;
    const parsedGradient = this.#gradientFromRaw(valueAttr);
    if (parsedGradient) this.#gradient = parsedGradient;
  }

  #gradientFromRaw(raw) {
    const fallback = {
      type: "linear",
      angle: 90,
      interpolationSpace: "srgb",
      hueInterpolation: "shorter",
      stops: [
        { position: 0, color: "#D9D9D9", opacity: 100 },
        { position: 100, color: "#737373", opacity: 100 },
      ],
    };
    if (!raw) return this.#normalizeGradient(fallback);
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed?.type === "gradient" && parsed.gradient) {
        return this.#normalizeGradient({
          ...fallback,
          ...parsed.gradient,
        });
      }
      if (parsed?.gradient) {
        return this.#normalizeGradient({
          ...fallback,
          ...parsed.gradient,
        });
      }
      if (parsed && typeof parsed === "object") {
        return this.#normalizeGradient({ ...fallback, ...parsed });
      }
    } catch (e) {
      // Use the built-in fallback for invalid defaults.
    }
    return this.#normalizeGradient(fallback);
  }

  #buildGradientCSS() {
    const gradient = this.#normalizeGradient(this.#gradient);
    const sorted = [...gradient.stops].sort(
      (a, b) => a.position - b.position,
    );
    const stops = sorted
      .map((s) => {
        const alpha = (s.opacity ?? 100) / 100;
        if (alpha >= 1) return `${s.color} ${s.position}%`;
        const { r, g, b } = figHexToRGB(s.color);
        return `rgba(${r}, ${g}, ${b}, ${alpha}) ${s.position}%`;
      })
      .join(", ");
    const interp = gradientInterpolationClause(gradient);
    const interpolation = interp ? ` ${interp}` : "";
    if (this.#editMode === "picker") {
      switch (gradient.type) {
        case "radial":
          return `radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%${interpolation}, ${stops})`;
        case "angular":
          return `conic-gradient(from ${gradient.angle}deg${interpolation}, ${stops})`;
        default:
          return `linear-gradient(${gradient.angle}deg${interpolation}, ${stops})`;
      }
    }
    // Inline editor swatch previews L→R so stop handles share that axis.
    return `linear-gradient(to right${interpolation}, ${stops})`;
  }

  #stopColorCSS(stop) {
    const alpha = (stop.opacity ?? 100) / 100;
    if (alpha >= 1) return stop.color;
    const { r, g, b } = figHexToRGB(stop.color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  #syncSwatchSize() {
    if (!this.#swatch) return;
    const size = this.getAttribute("size");
    if (size) this.#swatch.setAttribute("size", size);
    else this.#swatch.removeAttribute("size");
  }

  #createStopHandles() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    return this.#gradient.stops
      .map(
        (stop, i) =>
          figCreateElement(
            "fig-tooltip",
            {
              action: "manual",
              text: `${Math.round(stop.position)}%`,
            },
            figCreateElement("fig-handle", {
              drag: true,
              "drag-axes": "x",
              "drag-surface": ".fig-input-gradient-track",
              type: "color",
              tip: this.#stopHandleMode === "tip" ? "color" : null,
              color: this.#stopColorCSS(stop),
              value: `${stop.position}% 50%`,
              "hit-area": "4",
              "data-stop-index": i,
              disabled,
            }),
          ),
      );
  }

  #ghostHandle = null;
  #addedOnPointerDown = false;

  #render() {
    this.#colorObserver?.disconnect();
    this.#colorObserver = null;
    const disabled = figBooleanAttribute(this, "disabled");
    const mode = this.#editMode;
    const size = this.getAttribute("size");
    const swatch = figCreateElement("fig-swatch", {
      background: this.#buildGradientCSS(),
      size: size || null,
      disabled,
    });

    if (mode === "picker") {
      this.setAttribute("aria-haspopup", "dialog");
      this.replaceChildren(swatch);
      this.#swatch = swatch;
      this.#track = null;
      this.#syncFocusTarget();
      return;
    }

    this.removeAttribute("aria-haspopup");
    const editable = mode === "true" || mode === "picker";
    const track = editable
      ? figCreateElement(
          "div",
          { className: "fig-input-gradient-track" },
          this.#createStopHandles(),
        )
      : null;
    this.replaceChildren(...(track ? [swatch, track] : [swatch]));
    this.#swatch = swatch;
    this.#track = track;

    if (editable) {
      this.#setupGhostHandle();
      this.#setupEventListeners();
    }
    this.#syncFocusTarget();
  }

  #ensurePickerPopup() {
    if (this.#pickerPopup?.isConnected) return this.#pickerPopup;
    if (!customElements.get("fig-popup-gradient")) return null;

    const popup = document.createElement("dialog", {
      is: "fig-popup-gradient",
    });
    popup.setAttribute("is", "fig-popup-gradient");
    popup.id = figUniqueId();

    const handlePopupEvent = (event) => {
      event.stopPropagation();
      if (!event.detail?.gradient) return;
      this.#gradient = this.#normalizeGradient({
        ...this.#gradient,
        ...event.detail.gradient,
      });
      this.#syncingValueAttribute = true;
      this.setAttribute("value", JSON.stringify(this.value));
      this.#syncingValueAttribute = false;
      if (typeof event.detail.css === "string" && event.detail.css) {
        this.#swatch?.setAttribute("background", event.detail.css);
        this.#syncSwatchSize();
      } else {
        this.#syncSwatch();
      }
      this.dispatchEvent(
        new CustomEvent(event.type, {
          bubbles: true,
          composed: true,
          detail: this.value,
        }),
      );
    };
    popup.addEventListener("input", handlePopupEvent);
    popup.addEventListener("change", handlePopupEvent);
    popup.addEventListener("close", this.#boundPickerClosed);
    popup.addEventListener("toggle", this.#boundPickerClosed);

    (figGetOverlayRoot() ?? document.body).append(popup);
    this.#pickerPopup = popup;
    this.setAttribute("aria-controls", popup.id);
    this.#syncPickerPopup();
    return popup;
  }

  #syncPickerPopup() {
    if (!this.#pickerPopup) return;
    this.#pickerPopup.setAttribute("value", JSON.stringify(this.#gradient));
    this.#pickerPopup.toggleAttribute(
      "disabled",
      figBooleanAttribute(this, "disabled"),
    );
    this.#syncPickerPopupAnchor();
  }

  #resolvePickerPopupAnchor() {
    if (this.anchorElement instanceof Element) return this.anchorElement;
    const parent = this.parentElement;
    return parent?.matches('fig-property[activation="row"]') ? parent : this;
  }

  #syncPickerPopupAnchor() {
    if (!this.#pickerPopup) return;
    const anchor = this.#resolvePickerPopupAnchor();
    const rowAnchor =
      this.anchorElement == null &&
      anchor !== this &&
      anchor.matches?.('fig-property[activation="row"]');
    this.#pickerPopupAnchor = anchor;
    this.#pickerPopup.anchor = anchor;
    this.#pickerPopup.setAttribute("offset", rowAnchor ? "0 0" : "0 8");
    this.#pickerPopupAnchorResizeObserver ??= new ResizeObserver(() =>
      this.#syncPickerPopupWidth(),
    );
    this.#pickerPopupAnchorResizeObserver.disconnect();
    if (rowAnchor) {
      this.#pickerPopupAnchorResizeObserver.observe(anchor);
    }
    this.#syncPickerPopupWidth();
  }

  #syncPickerPopupWidth() {
    if (!this.#pickerPopup) return;
    const rowAnchor =
      this.anchorElement == null &&
      this.#pickerPopupAnchor !== this &&
      this.#pickerPopupAnchor?.matches?.(
        'fig-property[activation="row"]',
      );
    if (!rowAnchor) {
      this.#pickerPopup.style.removeProperty("width");
      return;
    }
    const width = this.#pickerPopupAnchor?.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) {
      this.#pickerPopup.style.width = `${width}px`;
    }
  }

  #openPickerPopup() {
    const popup = this.#ensurePickerPopup();
    if (!popup) {
      this.#renderPickerWhenAvailable();
      return;
    }
    this.#syncPickerPopup();
    popup.open = true;
    this.classList.add("has-popup-open");
  }

  #destroyPickerPopup() {
    if (!this.#pickerPopup) return;
    this.#pickerPopup.removeEventListener("close", this.#boundPickerClosed);
    this.#pickerPopup.removeEventListener("toggle", this.#boundPickerClosed);
    this.#pickerPopup.open = false;
    this.#pickerPopup.remove();
    this.#pickerPopupAnchorResizeObserver?.disconnect();
    this.#pickerPopupAnchor = null;
    this.#pickerPopup = null;
    this.removeAttribute("aria-controls");
    this.classList.remove("has-popup-open");
  }

  #sampleGradientColor(position) {
    return figSampleGradientAt(
      this.#gradient.stops,
      position,
      this.#gradient.interpolationSpace,
      this.#gradient.hueInterpolation,
    );
  }

  #setupGhostHandle() {
    if (
      !this.#track ||
      (this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false")
    )
      return;

    const ghost = document.createElement("fig-handle");
    ghost.classList.add("fig-input-gradient-ghost");
    ghost.setAttribute("type", "color");
    if (this.#stopHandleMode === "tip") ghost.setAttribute("tip", "add");
    ghost.style.position = "absolute";
    ghost.style.top = "50%";
    ghost.style.transform = "translate(-50%, -50%)";
    ghost.style.pointerEvents = "none";
    ghost.style.opacity = "0";
    ghost.style.transition = "opacity 0.15s";

    this.#track.appendChild(ghost);
    this.#ghostHandle = ghost;

    this.addEventListener("pointerenter", this.#onTrackEnter);
    this.addEventListener("pointermove", this.#onTrackMove);
    this.addEventListener("pointerleave", this.#onTrackLeave);
    this.addEventListener("click", this.#onTrackClick);
    this.addEventListener("dblclick", this.#onTrackDblClick);
  }

  #showGhost() {
    if (!this.#ghostHandle) return;
    this.#ghostHandle.style.opacity = "1";
  }

  #hideGhost() {
    if (!this.#ghostHandle) return;
    this.#ghostHandle.style.opacity = "0";
  }

  #onTrackEnter = () => {
    if (this.#handleDragging) return;
    this.#showGhost();
  };

  #onTrackLeave = () => {
    this.#hideGhost();
  };

  #onTrackMove = (e) => {
    if (this.#handleDragging) {
      this.#hideGhost();
      return;
    }
    if (!this.#ghostHandle || !this.#track) return;
    if (e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) {
      this.#hideGhost();
      return;
    }
    const trackRect = this.#track.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(1, (e.clientX - trackRect.left) / trackRect.width),
    );
    this.#ghostHandle.style.left = `${pct * 100}%`;
    const color = this.#sampleGradientColor(pct);
    this.#ghostHandle.setAttribute("color", color);
    this.#showGhost();
  };

  #distributeStops() {
    const count = this.#gradient.stops.length;
    if (count < 2) return;
    for (let i = 0; i < count; i++) {
      this.#gradient.stops[i].position = Math.round((i / (count - 1)) * 100);
    }
    this.#syncHandles();
    this.#syncSwatch();
    this.#emitInput();
    this.#emitChange();
  }

  #onTrackDblClick = (e) => {
    if (!this.#track) return;
    if (!e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) return;
    this.#distributeStops();
    this.#track.querySelectorAll("fig-handle[selected]").forEach((h) => {
      h.removeAttribute("selected");
    });
  };

  #onTrackClick = (e) => {
    if (!this.#track) return;
    if (this.#handleDragging) return;
    if (this.#addedOnPointerDown) {
      this.#addedOnPointerDown = false;
      return;
    }
    if (e.target.closest("fig-handle:not(.fig-input-gradient-ghost)")) {
      if (e.shiftKey) {
        const clickedHandle = e.target.closest("fig-handle");
        const stopIdx = parseInt(clickedHandle?.dataset.stopIndex, 10);
        this.#distributeStops();
        if (!isNaN(stopIdx)) {
          this.#track
            .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
            .forEach((h) => {
              if (parseInt(h.dataset.stopIndex, 10) === stopIdx) h.select();
              else h.deselect();
            });
        }
        e.stopPropagation();
      }
      return;
    }
    const trackRect = this.#track.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(1, (e.clientX - trackRect.left) / trackRect.width),
    );
    const position = Math.round(pct * 100);
    const color = this.#sampleGradientColor(pct);
    this.#gradient.stops.push({ position, color, opacity: 100 });
    this.#gradient.stops.sort((a, b) => a.position - b.position);
    const newIndex = this.#gradient.stops.findIndex(
      (s) => s.position === position && s.color === color,
    );
    this.#syncHandles();
    this.#syncSwatch();
    this.#emitInput();
    this.#emitChange();

    requestAnimationFrame(() => {
      const handles = this.#track.querySelectorAll(
        "fig-handle:not(.fig-input-gradient-ghost)",
      );
      const newHandle = handles[newIndex];
      if (newHandle) this.#activateStopHandle(newHandle);
    });
  };

  #repositionHandles() {
    this.#repositionRAF = null;
    if (!this.isConnected) return;
    if (!this.#track) return;
    const stops = this.#gradient.stops;
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((h, i) => {
        if (i >= stops.length) return;
        h.removeAttribute("value");
        h.setAttribute("value", `${stops[i].position}% 50%`);
      });
  }

  refreshLayout() {
    this.#repositionHandles();
  }

  #scheduleRepositionHandles() {
    if (this.#repositionRAF !== null) return;
    this.#repositionRAF = requestAnimationFrame(() => this.#repositionHandles());
  }

  #syncHandles() {
    if (!this.#track) return;
    const handles = this.#track.querySelectorAll(
      "fig-handle:not(.fig-input-gradient-ghost)",
    );
    const stops = this.#gradient.stops;

    if (handles.length !== stops.length) {
      const ghost = this.#ghostHandle;
      this.#track.replaceChildren(...this.#createStopHandles());
      if (ghost) this.#track.appendChild(ghost);
      this.#syncHandleMode();
      this.#reobserveHandleColors();
      this.#scheduleRepositionHandles();
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const h = handles[i];
      const stop = stops[i];
      h.dataset.stopIndex = i;
      h.setAttribute("value", `${stop.position}% 50%`);
      h.setAttribute("color", this.#stopColorCSS(stop));
      if (this.#stopHandleMode === "tip") {
        h.setAttribute("tip", "color");
      } else {
        h.removeAttribute("tip");
      }
      const tip = h.closest("fig-tooltip");
      if (tip) tip.setAttribute("text", `${Math.round(stop.position)}%`);
    }
    this.#syncHandleMode();
  }

  #syncHandleMode() {
    if (!this.#track) return;
    const useTip = this.#stopHandleMode === "tip";
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((handle) => {
        if (useTip) handle.setAttribute("tip", "color");
        else handle.removeAttribute("tip");
      });
    if (this.#ghostHandle) {
      if (useTip) this.#ghostHandle.setAttribute("tip", "add");
      else this.#ghostHandle.removeAttribute("tip");
    }
  }

  #reobserveHandleColors() {
    if (!this.#colorObserver || !this.#track) return;
    this.#colorObserver.disconnect();
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((h) => {
        this.#colorObserver.observe(h, {
          attributes: true,
          attributeFilter: ["color"],
        });
      });
  }

  #syncStopIndices() {
    if (!this.#track) return;
    const handles = this.#track.querySelectorAll(
      "fig-handle:not(.fig-input-gradient-ghost)",
    );
    const stops = this.#gradient.stops;
    const used = new Set();
    handles.forEach((h) => {
      const pos = Math.round(parseFloat(h.getAttribute("value")) || 0);
      const color = (h.getAttribute("color") || "").toUpperCase();
      let best = -1;
      for (let i = 0; i < stops.length; i++) {
        if (used.has(i)) continue;
        if (
          stops[i].position === pos &&
          stops[i].color.toUpperCase() === color
        ) {
          best = i;
          break;
        }
      }
      if (best === -1) {
        let minDist = Infinity;
        for (let i = 0; i < stops.length; i++) {
          if (used.has(i)) continue;
          const d = Math.abs(stops[i].position - pos);
          if (d < minDist) {
            minDist = d;
            best = i;
          }
        }
      }
      if (best !== -1) {
        used.add(best);
        h.dataset.stopIndex = best;
      }
    });
  }

  #syncSwatch() {
    if (!this.#swatch) return;
    this.#swatch.setAttribute("background", this.#buildGradientCSS());
    this.#syncSwatchSize();
  }

  #setupEventListeners() {
    if (!this.#track) return;

    this.#track.addEventListener("pointerdown", (e) => {
      if (figBooleanAttribute(this, "disabled")) return;
      const handle = e.target.closest(
        "fig-handle:not(.fig-input-gradient-ghost)",
      );
      if (handle) {
        this.#activateStopHandle(handle);
        return;
      }
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const trackRect = this.#track.getBoundingClientRect();
      const pct = Math.max(
        0,
        Math.min(1, (e.clientX - trackRect.left) / trackRect.width),
      );
      const position = Math.round(pct * 100);
      const color = this.#sampleGradientColor(pct);
      this.#gradient.stops.push({ position, color, opacity: 100 });
      this.#gradient.stops.sort((a, b) => a.position - b.position);
      const newIndex = this.#gradient.stops.findIndex(
        (s) => s.position === position && s.color === color,
      );
      this.#addedOnPointerDown = true;
      this.#syncHandles();
      this.#syncSwatch();
      this.#emitInput();
      this.#hideGhost();

      const handles = this.#track.querySelectorAll(
        "fig-handle:not(.fig-input-gradient-ghost)",
      );
      const newHandle = handles[newIndex];
      if (newHandle) {
        this.#activateStopHandle(newHandle);
        newHandle.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            clientX: e.clientX,
            clientY: e.clientY,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            button: e.button,
            buttons: e.buttons,
          }),
        );
      }
    });

    this.#track.addEventListener("input", (e) => {
      const handle = e.target.closest("fig-handle");
      if (!handle) return;
      e.stopPropagation();
      if (e.detail?.color) {
        const idx = parseInt(handle.dataset.stopIndex, 10);
        if (!isNaN(idx) && this.#gradient.stops[idx]) {
          this.#gradient.stops[idx].color = e.detail.color;
          if (e.detail.opacity !== undefined) {
            this.#gradient.stops[idx].opacity = e.detail.opacity;
          } else if (e.detail.alpha !== undefined) {
            this.#gradient.stops[idx].opacity = Math.round(
              e.detail.alpha * 100,
            );
          }
          handle.setAttribute(
            "color",
            this.#stopColorCSS(this.#gradient.stops[idx]),
          );
          this.#syncSwatch();
          this.#emitInput();
        }
        return;
      }
      if (!this.#handleDragging) handle.style.zIndex = "5";
      this.#handleDragging = true;
      const idx = parseInt(handle.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      const px = e.detail?.px ?? 0;
      const rawPosition = Math.round(px * 100);
      let position = rawPosition;
      const trackW = this.#track.getBoundingClientRect().width;
      if (e.detail?.shiftKey) {
        position =
          Math.round(position / FigInputGradient.SHIFT_SNAP) *
          FigInputGradient.SHIFT_SNAP;
      } else {
        const snapPct = trackW > 0 ? (5 / trackW) * 100 : 0;
        for (let i = 0; i < this.#gradient.stops.length; i++) {
          if (i === idx) continue;
          if (
            Math.abs(this.#gradient.stops[i].position - position) <= snapPct
          ) {
            position = this.#gradient.stops[i].position;
            break;
          }
        }
      }
      this.#gradient.stops[idx].position = position;
      if (position !== rawPosition) {
        handle.style.left = `${(position / 100) * trackW}px`;
      }
      const tooltip = handle.closest("fig-tooltip");
      if (tooltip && this.#stopHandleMode !== "tip") {
        tooltip.text = `${Math.round(position)}%`;
        if (!tooltip.hasAttribute("show")) {
          tooltip.setAttribute("show", "true");
          handle.hideColorTip();
        }
      }
      this.#syncSwatch();
      this.#emitInput();
    });

    this.#track.addEventListener("change", (e) => {
      const handle = e.target.closest("fig-handle");
      if (!handle) return;
      e.stopPropagation();
      if (e.detail?.color) {
        const idx = parseInt(handle.dataset.stopIndex, 10);
        if (!isNaN(idx) && this.#gradient.stops[idx]) {
          this.#gradient.stops[idx].color = e.detail.color;
          if (e.detail.opacity !== undefined) {
            this.#gradient.stops[idx].opacity = e.detail.opacity;
          }
          handle.setAttribute(
            "color",
            this.#stopColorCSS(this.#gradient.stops[idx]),
          );
          this.#syncSwatch();
          this.#emitChange();
        }
        return;
      }
      handle.style.zIndex = "";
      const tooltip = handle.closest("fig-tooltip");
      if (tooltip) tooltip.removeAttribute("show");
      handle.showColorTip();
      const idx = parseInt(handle.dataset.stopIndex, 10);
      if (isNaN(idx) || !this.#gradient.stops[idx]) return;
      const px = e.detail?.px ?? 0;
      let position = Math.round(px * 100);
      const trackW = this.#track.getBoundingClientRect().width;
      const snapPct = trackW > 0 ? (5 / trackW) * 100 : 0;
      for (let i = 0; i < this.#gradient.stops.length; i++) {
        if (i === idx) continue;
        if (Math.abs(this.#gradient.stops[i].position - position) <= snapPct) {
          position = this.#gradient.stops[i].position;
          break;
        }
      }
      this.#gradient.stops[idx].position = position;
      handle.style.left = `${(position / 100) * trackW}px`;
      this.#gradient.stops.sort((a, b) => a.position - b.position);
      this.#syncStopIndices();
      this.#syncSwatch();
      this.#emitChange();
      requestAnimationFrame(() => {
        this.#handleDragging = false;
      });
    });

    this.#colorObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName !== "color") continue;
        const handle = m.target;
        if (handle.classList.contains("fig-input-gradient-ghost")) continue;
        const idx = parseInt(handle.dataset.stopIndex, 10);
        if (isNaN(idx) || !this.#gradient.stops[idx]) continue;
        const newColor = handle.getAttribute("color");
        if (!newColor || !newColor.startsWith("#")) continue;
        if (newColor !== this.#gradient.stops[idx].color) {
          this.#gradient.stops[idx].color = newColor;
          this.#syncSwatch();
          this.#emitInput();
        }
      }
    });
    this.#track
      .querySelectorAll("fig-handle:not(.fig-input-gradient-ghost)")
      .forEach((h) => {
        this.#colorObserver.observe(h, {
          attributes: true,
          attributeFilter: ["color"],
        });
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

  get value() {
    return {
      type: "gradient",
      gradient: gradientToValueShape(this.#normalizeGradient(this.#gradient)),
    };
  }

  set value(val) {
    const serialized = typeof val === "string" ? val : JSON.stringify(val);
    if (this.getAttribute("value") === serialized) {
      this.#parseValue();
      this.#syncSwatch();
      this.#syncHandles();
      return;
    }
    this.setAttribute("value", serialized);
  }

  get default() {
    return {
      type: "gradient",
      gradient: gradientToValueShape(
        this.#gradientFromRaw(this.getAttribute("default")),
      ),
    };
  }

  set default(val) {
    if (val === null || val === undefined || val === "") {
      this.removeAttribute("default");
    } else {
      this.setAttribute(
        "default",
        typeof val === "string" ? val : JSON.stringify(val),
      );
    }
  }

  get defaultValue() {
    return figCloneValue(this.default);
  }

  set defaultValue(val) {
    this.default = val;
  }

  get isDefault() {
    return figValuesEqual(this.value, this.default);
  }

  resetToDefault() {
    if (figBooleanAttribute(this, "disabled") || this.isDefault) return;
    this.value = this.default;
    this.#emitInput();
    this.#emitChange();
  }

  focus(options) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    if (this.#isEditable) {
      const firstHandle = this.#firstStopHandle();
      if (firstHandle) {
        firstHandle.focus(options);
        return;
      }
    }
    HTMLElement.prototype.focus.call(this, options);
  }

  activate(options) {
    if (figBooleanAttribute(this, "disabled")) return;
    this.focus(options);
    if (this.#editMode === "picker") this.click();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.#syncingValueAttribute) return;
    switch (name) {
      case "value":
        this.#parseValue();
        this.#syncSwatch();
        this.#syncHandles();
        this.#syncPickerPopup();
        break;
      case "disabled":
        this.#syncDisabled();
        this.#syncPickerPopup();
        break;
      case "edit":
        if (this.#editMode !== "picker") this.#destroyPickerPopup();
        this.#render();
        this.#renderPickerWhenAvailable();
        if (this.#isEditable) {
          document.addEventListener("keydown", this.#onKeyDown);
        } else {
          document.removeEventListener("keydown", this.#onKeyDown);
        }
        break;
      case "mode":
        this.#syncHandleMode();
        break;
      case "size":
        this.#syncSwatchSize();
        break;
    }
  }

  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.#syncFocusTarget();
    if (this.#swatch) {
      if (disabled) this.#swatch.setAttribute("disabled", "");
      else this.#swatch.removeAttribute("disabled");
    }
    if (this.#track) {
      for (const handle of this.#track.querySelectorAll("fig-handle")) {
        if (disabled) handle.setAttribute("disabled", "");
        else handle.removeAttribute("disabled");
      }
    }
  }
}
figDefineElement("fig-input-gradient", FigInputGradient);

export { FigInputGradient };
