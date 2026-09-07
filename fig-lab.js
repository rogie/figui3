/**
 * FigUI3 Lab — Experimental components
 * Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE.
 *
 * These components are unstable and may change or be removed without notice.
 * Import alongside fig.js for opt-in access:
 *
 *   <script src="fig.js"></script>
 *   <script src="fig-lab.js"></script>
 */

function figLabDefineElement(name, constructor) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function figLabBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

const FIG_LAB_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function figLabAppendChildren(parent, children) {
  const append = (child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(append);
      return;
    }
    parent.append(child instanceof Node ? child : String(child));
  };
  append(children);
  return parent;
}

function figLabSetAttributes(element, attributes = {}) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      if (element.namespaceURI === FIG_LAB_SVG_NAMESPACE) {
        element.setAttribute("class", String(value));
      } else {
        element.className = String(value);
      }
    } else if (value === true) {
      element.setAttribute(name, "");
    } else {
      element.setAttribute(name, String(value));
    }
  }
  return element;
}

function figLabCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  figLabSetAttributes(element, attributes);
  return figLabAppendChildren(element, children);
}

function figLabCreateSvgElement(tagName, attributes, children) {
  const element = document.createElementNS(FIG_LAB_SVG_NAMESPACE, tagName);
  figLabSetAttributes(element, attributes);
  return figLabAppendChildren(element, children);
}

function figLabColorEventAliases(color, alpha, opacity) {
  const numericAlpha = Number(alpha);
  const numericOpacity = Number(opacity);
  const normalizedAlpha = Number.isFinite(numericAlpha)
    ? Math.max(0, Math.min(1, numericAlpha))
    : Number.isFinite(numericOpacity)
      ? Math.max(0, Math.min(100, numericOpacity)) / 100
      : 1;
  const normalizedOpacity = Number.isFinite(numericOpacity)
    ? Math.max(0, Math.min(100, numericOpacity))
    : Math.round(normalizedAlpha * 100);
  return { color, alpha: normalizedAlpha, opacity: normalizedOpacity };
}

/* Presentation-only composition surface for AI prompt controls. */
class FigAiPrompt extends HTMLElement {}
figLabDefineElement("fig-ai-prompt", FigAiPrompt);

/* Presentation-only open container for attachments and status rows above a prompt. */
class FigAiContext extends HTMLElement {}
figLabDefineElement("fig-ai-context", FigAiContext);

/* Presentation-only message surface for AI conversations. */
class FigChatMessage extends HTMLElement {}
figLabDefineElement("fig-chat-message", FigChatMessage);

/**
 * A removable image attachment for compact prompt surfaces.
 *
 * @attr {string} src - Image preview URL.
 * @attr {string} name - Attachment name used for the tooltip and image alt text.
 * @attr {string} value - Optional application-owned attachment identifier.
 * @attr {boolean|string} removable - "false" hides the remove button.
 * @attr {boolean|string} disabled - Disables removal.
 * @fires remove - Cancelable request for the owning application to remove the attachment.
 */
class FigAttachment extends HTMLElement {
  #tooltip = null;
  #image = null;
  #fallback = null;
  #removeTooltip = null;
  #removeButton = null;
  #mediaImage = null;
  #boundHandleRemove = this.#handleRemove.bind(this);
  #boundHandleImageLoad = this.#handleImageLoad.bind(this);
  #boundHandleImageError = this.#handleImageError.bind(this);

  static get observedAttributes() {
    return ["src", "name", "value", "removable", "disabled"];
  }

  connectedCallback() {
    if (!this.#image) this.#initialize();
    this.#removeButton.removeEventListener("click", this.#boundHandleRemove);
    this.#removeButton.addEventListener("click", this.#boundHandleRemove);
    this.#bindMediaImage();
    this.#sync();
  }

  disconnectedCallback() {
    this.#removeButton?.removeEventListener("click", this.#boundHandleRemove);
    this.#unbindMediaImage();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#image) return;
    this.#sync();
  }

  #initialize() {
    this.#tooltip = document.createElement("fig-tooltip");
    this.#tooltip.className = "fig-attachment-tooltip";

    this.#image = document.createElement("fig-image");
    this.#image.setAttribute("aspect-ratio", "1/1");
    this.#image.setAttribute("fit", "cover");
    this.#image.setAttribute("full", "");

    this.#fallback = document.createElement("span");
    this.#fallback.className = "fig-attachment-fallback";
    this.#fallback.setAttribute("aria-hidden", "true");

    this.#removeTooltip = document.createElement("fig-tooltip");
    this.#removeTooltip.className = "fig-attachment-remove-tooltip";
    this.#removeTooltip.setAttribute("text", "Remove attachment");

    this.#removeButton = document.createElement("fig-button");
    this.#removeButton.className = "fig-attachment-remove";
    this.#removeButton.setAttribute("variant", "overlay");
    this.#removeButton.setAttribute("size", "small");
    this.#removeButton.setAttribute("icon", "");
    const closeIcon = document.createElement("fig-icon");
    closeIcon.setAttribute("name", "close");
    closeIcon.setAttribute("size", "small");
    this.#removeButton.append(closeIcon);
    this.#removeTooltip.append(this.#removeButton);

    this.#image.append(this.#fallback);
    this.#tooltip.append(this.#image);
    this.replaceChildren(this.#tooltip, this.#removeTooltip);

    this.#removeButton.addEventListener("click", this.#boundHandleRemove);
    this.#bindMediaImage();
  }

  #bindMediaImage() {
    const mediaImage = this.#image?.mediaEl;
    if (!mediaImage || mediaImage === this.#mediaImage) return;
    this.#unbindMediaImage();
    this.#mediaImage = mediaImage;
    this.#mediaImage.addEventListener("load", this.#boundHandleImageLoad);
    this.#mediaImage.addEventListener("error", this.#boundHandleImageError);
  }

  #unbindMediaImage() {
    if (!this.#mediaImage) return;
    this.#mediaImage.removeEventListener("load", this.#boundHandleImageLoad);
    this.#mediaImage.removeEventListener("error", this.#boundHandleImageError);
    this.#mediaImage = null;
  }

  #sync() {
    const src = this.getAttribute("src") || "";
    const name = this.getAttribute("name") || "Attachment";
    const removable =
      !this.hasAttribute("removable") || figLabBooleanAttribute(this, "removable");
    const disabled = figLabBooleanAttribute(this, "disabled");

    this.#tooltip.setAttribute("text", name);
    this.#image.setAttribute("alt", name);
    if (src) {
      this.#image.setAttribute("src", src);
    } else {
      this.#image.removeAttribute("src");
    }
    this.#bindMediaImage();

    this.#fallback.textContent = this.#fallbackLabel(name);
    this.#removeButton.hidden = !removable;
    this.#removeButton.toggleAttribute("disabled", disabled);
    this.#removeButton.setAttribute("aria-label", `Remove ${name}`);
    this.toggleAttribute("data-fallback", !src);
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
    }
  }

  #fallbackLabel(name) {
    const baseName = name.split(/[\\/]/).pop() || "";
    const dotIndex = baseName.lastIndexOf(".");
    const extension =
      dotIndex > 0 && dotIndex < baseName.length - 1
        ? baseName.slice(dotIndex + 1).toUpperCase()
        : "FILE";
    return extension.slice(0, 4);
  }

  #handleImageLoad() {
    if (this.getAttribute("src")) this.removeAttribute("data-fallback");
  }

  #handleImageError() {
    this.setAttribute("data-fallback", "");
  }

  #handleRemove(event) {
    event.stopPropagation();
    if (
      figLabBooleanAttribute(this, "disabled") ||
      (this.hasAttribute("removable") &&
        !figLabBooleanAttribute(this, "removable"))
    ) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("remove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          value: this.getAttribute("value"),
          name: this.getAttribute("name") || "",
          src: this.getAttribute("src") || "",
          attachment: this,
        },
      }),
    );
  }
}
figLabDefineElement("fig-attachment", FigAttachment);

/* Wrapping presentation container for one or more attachments. */
class FigAttachments extends HTMLElement {
  #observer = null;

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
      this.setAttribute("data-generated-role", "");
    }
    this.#syncItems();
    if (!this.#observer) {
      this.#observer = new MutationObserver(() => this.#syncItems());
      this.#observer.observe(this, { childList: true });
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #syncItems() {
    for (const attachment of this.querySelectorAll(":scope > fig-attachment")) {
      if (!attachment.hasAttribute("role")) {
        attachment.setAttribute("role", "listitem");
        attachment.setAttribute("data-generated-role", "");
      }
    }
  }
}
figLabDefineElement("fig-attachments", FigAttachments);
/**
 * Standalone interactive numeric wheel.
 *
 * @attr {number} value - Numeric value. Unbounded unless min/max are set.
 * @attr {number} min - Inclusive lower bound. Omitted = unbounded below.
 * @attr {number} max - Inclusive upper bound. Omitted = unbounded above.
 * @attr {number} step - Increment. Defaults to 1.
 * @attr {boolean|string} spin - Keeps ticks synchronized to value. Defaults to true.
 * @attr {boolean|string} disabled - Disables interaction and focus.
 * @fires input - Numeric composed event during interaction.
 * @fires change - Numeric composed event on commit.
 */
class FigInputWheel extends HTMLElement {
  static #TICK_COUNT = 33;
  static #HALF_FOV_DEG = 60;
  static #PERSPECTIVE_K = 0.55;
  static #FAST_MOTION_THRESHOLD_PX_PER_MS = 1.5;
  static #FAST_MOTION_TIMEOUT_MS = 80;
  static #DRAG_THRESHOLD_PX = 4;
  static #DRAGGING_BODY_CLASS = "fig-input-wheel-dragging";

  #surface = null;
  #track = null;
  #wheel = null;
  #svg = null;
  #tickPath = null;
  #tickMetrics = null;
  #tickMetricProbe = null;
  #wheelWidth = 0;
  #wheelHeight = 0;
  #layoutFrame = 0;
  #keyboardAnimationFrame = 0;
  #keyboardSettleTimer = 0;
  #resizeObserver = null;
  #isDragging = false;
  #dragPointerId = null;
  #dragStartX = 0;
  #dragStartValue = 0;
  #hasCrossedDragThreshold = false;
  #visualValue = null;
  #handleDragMaxPx = 0;
  #motionLastX = null;
  #motionLastTime = 0;
  #motionBlurTimer = 0;
  #boundPointerDown = this.#handlePointerDown.bind(this);
  #boundPointerMove = this.#handlePointerMove.bind(this);
  #boundPointerUp = this.#handlePointerUp.bind(this);
  #boundWheel = this.#handleWheel.bind(this);
  #boundKeyDown = this.#handleKeyDown.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "step",
      "min",
      "max",
      "spin",
    ];
  }

  connectedCallback() {
    if (!this.#surface) this.#initialize();
    this.#syncDisabled();
    this.#syncValueFromHost();
    this.#bindEvents();
    this.#resizeObserver?.disconnect();
    if (globalThis.ResizeObserver) {
      this.#resizeObserver = new ResizeObserver((entries) => {
        const rect = entries.at(-1)?.contentRect;
        if (rect) this.#setWheelSize(rect.width, rect.height);
      });
      this.#resizeObserver.observe(this);
    }
    this.#queueWheelLayout();
  }

  disconnectedCallback() {
    this.#resizeObserver?.disconnect();
    if (this.#layoutFrame) cancelAnimationFrame(this.#layoutFrame);
    this.#layoutFrame = 0;
    this.#stopKeyboardAnimation();
    this.#unbindEvents();
    this.#stopDrag();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "disabled") this.#syncDisabled();
    if (name === "value" && !this.#isDragging) {
      this.#syncValueFromHost();
    }
    if (name === "step") {
      this.#syncWheelAria();
      this.#queueWheelLayout();
    }
    if (name === "spin") this.#queueWheelLayout();
    if (name === "min" || name === "max") {
      this.#commitValue(this.#numericValue());
    }
  }

  #initialize() {
    this.#surface = this;
    this.#track = this;
    this.#wheel = this;
    this.setAttribute("role", "spinbutton");
    if (
      !this.hasAttribute("aria-label") &&
      !this.hasAttribute("aria-labelledby")
    ) {
      this.setAttribute("aria-label", "Value");
    }
    this.setAttribute("tabindex", "0");
    const svg = figLabCreateSvgElement("svg", {
      className: "fig-input-wheel-svg",
      "aria-hidden": "true",
    });
    const handle = figLabCreateElement("div", {
      className: "fig-input-wheel-handle",
    });
    this.#svg = svg;
    this.replaceChildren(svg, handle);

    const metricProbe = document.createElement("div");
    metricProbe.setAttribute("aria-hidden", "true");
    metricProbe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0";
    const maxEl = document.createElement("div");
    maxEl.style.height = "var(--fig-input-wheel-tick-height)";
    const minEl = document.createElement("div");
    minEl.style.height = "var(--fig-input-wheel-tick-height-min)";
    const maxWidthEl = document.createElement("div");
    maxWidthEl.style.width = "var(--fig-input-wheel-tick-width)";
    const minWidthEl = document.createElement("div");
    minWidthEl.style.width = "var(--fig-input-wheel-tick-width-min)";
    metricProbe.append(maxEl, minEl, maxWidthEl, minWidthEl);
    this.append(metricProbe);
    this.#tickMetricProbe = {
      maxEl,
      minEl,
      maxWidthEl,
      minWidthEl,
    };

    this.#ensureTickPath();
  }

  #ensureTickPath() {
    if (!this.#svg || this.#tickPath) return;
    this.#tickPath = figLabCreateSvgElement("path", {
      className: "fig-input-wheel-tick",
    });
    this.#svg.append(this.#tickPath);
  }

  #readTickMetrics() {
    if (this.#tickMetrics) return this.#tickMetrics;
    this.#tickMetrics = {
      maxH: this.#tickMetricProbe?.maxEl.getBoundingClientRect().height || 8,
      minH: this.#tickMetricProbe?.minEl.getBoundingClientRect().height || 4,
      maxW:
        this.#tickMetricProbe?.maxWidthEl.getBoundingClientRect().width || 2,
      minW:
        this.#tickMetricProbe?.minWidthEl.getBoundingClientRect().width || 1,
    };
    return this.#tickMetrics;
  }

  #step() {
    if (this.hasAttribute("step")) {
      const parsed = Number(this.getAttribute("step"));
      if (parsed > 0) return parsed;
    }
    return 1;
  }

  #numericValue() {
    const parsed = Number(this.getAttribute("value") ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  #parseBound(name) {
    if (!this.hasAttribute(name)) return null;
    const raw = this.getAttribute(name);
    if (raw === null || raw.trim() === "") return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  #boundMin() {
    return this.#parseBound("min");
  }

  #boundMax() {
    return this.#parseBound("max");
  }

  #writeBound(name, nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.removeAttribute(name);
      return;
    }
    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed)) {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, String(parsed));
  }

  #clamp(value) {
    let next = value;
    const min = this.#boundMin();
    const max = this.#boundMax();
    if (min !== null) next = Math.max(min, next);
    if (max !== null) next = Math.min(max, next);
    return next;
  }

  #snap(value) {
    const step = this.#step();
    if (step <= 0) return value;
    const base = this.#boundMin() ?? 0;
    const snapped = Math.round((value - base) / step) * step + base;
    return Number(snapped.toPrecision(15));
  }

  #commitValue(value, { snap = false, emit = null } = {}) {
    let next = snap ? this.#snap(value) : value;
    next = this.#clamp(next);
    const asString = String(next);
    if (this.getAttribute("value") !== asString) {
      this.setAttribute("value", asString);
    }
    this.#syncWheelAria(next);
    this.#queueWheelLayout();
    if (emit) {
      this.dispatchEvent(
        new CustomEvent(emit, {
          detail: next,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    }
  }

  #syncValueFromHost() {
    const value = this.#numericValue();
    const clamped = this.#clamp(value);
    if (
      clamped !== value ||
      this.getAttribute("value") !== String(clamped)
    ) {
      this.#commitValue(clamped);
      return;
    }
    this.#syncWheelAria(value);
    this.#queueWheelLayout();
  }

  #syncWheelAria(value = this.#numericValue()) {
    if (!this.#wheel) return;
    const min = this.#boundMin();
    const max = this.#boundMax();
    this.#wheel.setAttribute("aria-valuenow", String(value));
    this.#wheel.setAttribute("aria-valuetext", String(value));
    if (min === null) this.#wheel.removeAttribute("aria-valuemin");
    else this.#wheel.setAttribute("aria-valuemin", String(min));
    if (max === null) this.#wheel.removeAttribute("aria-valuemax");
    else this.#wheel.setAttribute("aria-valuemax", String(max));
  }

  #syncDisabled() {
    const disabled = figLabBooleanAttribute(this, "disabled");
    if (!this.#wheel) return;
    if (disabled) {
      if (this.#isDragging) this.#stopDrag();
      this.#stopKeyboardAnimation();
      this.setAttribute("aria-disabled", "true");
      this.#wheel.setAttribute("tabindex", "-1");
      this.#wheel.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
      this.#wheel.setAttribute("tabindex", "0");
      this.#wheel.removeAttribute("aria-disabled");
    }
  }

  #setWheelSize(width, height) {
    if (!this.#svg || width < 1 || height < 1) return;
    if (width === this.#wheelWidth && height === this.#wheelHeight) return;
    this.#wheelWidth = width;
    this.#wheelHeight = height;
    this.#tickMetrics = null;
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.#svg.setAttribute("width", String(width));
    this.#svg.setAttribute("height", String(height));
    this.#queueWheelLayout();
  }

  #queueWheelLayout() {
    if (this.#layoutFrame) return;
    this.#layoutFrame = requestAnimationFrame(() => {
      if (!this.isConnected) {
        this.#layoutFrame = 0;
        return;
      }
      if (this.#wheelWidth < 1 || this.#wheelHeight < 1) {
        const rect = this.#wheel?.getBoundingClientRect();
        if (rect) this.#setWheelSize(rect.width, rect.height);
      }
      this.#layoutWheel();
      this.#layoutFrame = 0;
    });
  }

  #layoutWheel() {
    if (!this.#tickPath) return;
    const width = this.#wheelWidth;
    const height = this.#wheelHeight;
    if (width < 1 || height < 1) return;

    const value =
      this.getAttribute("spin") === "false"
        ? (this.#boundMin() ?? 0)
        : (this.#visualValue ?? this.#numericValue());
    const tickStep = 360 / FigInputWheel.#TICK_COUNT;
    const step = this.#step();
    const base = this.#boundMin() ?? 0;
    const offsetDeg = ((value - base) / step) * tickStep;
    const k = FigInputWheel.#PERSPECTIVE_K;
    const cx = width / 2;
    const cy = height / 2;

    const { maxH, minH, maxW, minW } = this.#readTickMetrics();
    const fov = FigInputWheel.#HALF_FOV_DEG;
    const visibleHalf = Math.max(width / 2, 1);
    const radius = visibleHalf * 0.84;
    const commands = [];

    for (let index = 0; index < FigInputWheel.#TICK_COUNT; index += 1) {
      let theta = offsetDeg + index * tickStep;
      theta = ((((theta + 180) % 360) + 360) % 360) - 180;
      if (theta < -fov || theta >= fov) continue;
      const rad = (theta * Math.PI) / 180;
      const x = cx + (radius * Math.sin(rad)) / (1 - k * Math.cos(rad));
      const t = Math.min(1, Math.abs(x - cx) / Math.max(visibleHalf, 1));
      const taper = Math.cos(t * Math.PI * 0.5);
      const visualH = minH + (maxH - minH) * taper;
      const visualW = minW + (maxW - minW) * taper;
      const halfH = visualH / 2;
      const halfW = visualW / 2;
      const top = cy - halfH;
      const bottom = cy + halfH;
      const left = x - halfW;
      const right = x + halfW;
      commands.push(
        `M ${x} ${top}` +
          ` Q ${right} ${top} ${right} ${top + halfW}` +
          ` V ${bottom - halfW}` +
          ` Q ${right} ${bottom} ${x} ${bottom}` +
          ` Q ${left} ${bottom} ${left} ${bottom - halfW}` +
          ` V ${top + halfW}` +
          ` Q ${left} ${top} ${x} ${top} Z`,
      );
    }
    this.#tickPath.setAttribute("d", commands.join(" "));
  }

  #bindEvents() {
    this.#surface?.addEventListener("pointerdown", this.#boundPointerDown);
    this.#wheel?.addEventListener("wheel", this.#boundWheel, { passive: false });
    this.#wheel?.addEventListener("keydown", this.#boundKeyDown);
  }

  #unbindEvents() {
    this.#surface?.removeEventListener("pointerdown", this.#boundPointerDown);
    this.#wheel?.removeEventListener("wheel", this.#boundWheel);
    this.#wheel?.removeEventListener("keydown", this.#boundKeyDown);
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerUp);
    window.removeEventListener("pointercancel", this.#boundPointerUp);
  }

  #handlePointerDown(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (event.button !== 0) return;
    event.preventDefault();
    if (!this.beginScrub(event)) return;
    this.#surface?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", this.#boundPointerMove);
    window.addEventListener("pointerup", this.#boundPointerUp);
    window.addEventListener("pointercancel", this.#boundPointerUp);
  }

  beginScrub(start = {}) {
    if (figLabBooleanAttribute(this, "disabled")) return false;
    const clientX =
      typeof start === "number" ? start : Number(start?.clientX ?? start?.x);
    if (!Number.isFinite(clientX)) return false;
    this.#stopKeyboardAnimation();
    this.#isDragging = true;
    this.#dragPointerId =
      start && typeof start === "object" && start.pointerId !== undefined
        ? start.pointerId
        : null;
    this.#dragStartX = clientX;
    const requestedStart =
      start && typeof start === "object"
        ? Number(start.startValue)
        : Number.NaN;
    this.#dragStartValue = Number.isFinite(requestedStart)
      ? this.#clamp(requestedStart)
      : this.#numericValue();
    this.#hasCrossedDragThreshold = false;
    this.#startTickMotionTracking(clientX);
    this.#startHandlePull();
    this.setAttribute("data-fig-input-wheel-active", "");
    document.body.classList.remove(FigInputWheel.#DRAGGING_BODY_CLASS);
    this.focus();
    return true;
  }

  updateScrub(position, speed) {
    if (!this.#isDragging) return this.#numericValue();
    const clientX =
      typeof position === "number"
        ? position
        : Number(position?.clientX ?? position?.x);
    if (!Number.isFinite(clientX)) return this.#numericValue();
    const multiplier =
      speed ??
      (typeof position === "object" && position?.shiftKey ? 10 : 1);
    this.#updateDrag(clientX, multiplier);
    return this.#numericValue();
  }

  endScrub(commit = true) {
    if (!this.#isDragging) return this.#numericValue();
    if (commit && this.#numericValue() !== this.#dragStartValue) {
      this.#commitValue(this.#numericValue(), { snap: true, emit: "change" });
    }
    this.#stopDrag();
    return this.#numericValue();
  }

  #handlePointerMove(event) {
    if (!this.#isDragging) return;
    if (this.#dragPointerId !== null && event.pointerId !== this.#dragPointerId) {
      return;
    }
    this.updateScrub(event);
  }

  #updateDrag(clientX, speed = 1) {
    if (
      !this.#hasCrossedDragThreshold &&
      Math.abs(clientX - this.#dragStartX) >=
        FigInputWheel.#DRAG_THRESHOLD_PX
    ) {
      this.#hasCrossedDragThreshold = true;
      document.body.classList.add(FigInputWheel.#DRAGGING_BODY_CLASS);
    }
    const width = this.#wheel?.clientWidth || 1;
    const visibleSteps =
      FigInputWheel.#TICK_COUNT *
      ((FigInputWheel.#HALF_FOV_DEG * 2) / 360);
    const visibleUnits = this.#step() * visibleSteps;
    const delta =
      (clientX - this.#dragStartX) * (visibleUnits / width) * speed;
    const previousVisualValue = this.#visualValue ?? this.#dragStartValue;
    const rawValue = this.#clamp(this.#dragStartValue + delta);
    this.#updateTickMotionBlur(
      clientX,
      speed,
      rawValue !== previousVisualValue,
    );
    this.#visualValue = rawValue;
    this.#commitValue(rawValue, {
      snap: true,
      emit: "input",
    });
    this.#updateHandlePull(clientX);
  }

  #handlePointerUp(event) {
    if (!this.#isDragging) return;
    if (this.#dragPointerId !== null && event.pointerId !== this.#dragPointerId) {
      return;
    }
    this.endScrub();
  }

  #stopDrag() {
    this.#isDragging = false;
    this.#dragPointerId = null;
    this.#hasCrossedDragThreshold = false;
    this.#visualValue = null;
    this.removeAttribute("data-fig-input-wheel-active");
    document.body.classList.remove(FigInputWheel.#DRAGGING_BODY_CLASS);
    this.#stopTickMotionTracking();
    this.#resetHandlePull();
    window.removeEventListener("pointermove", this.#boundPointerMove);
    window.removeEventListener("pointerup", this.#boundPointerUp);
    window.removeEventListener("pointercancel", this.#boundPointerUp);
    this.#queueWheelLayout();
  }

  #startHandlePull() {
    this.#resetHandlePull();
    this.#handleDragMaxPx = this.#readCssLength(
      "--fig-input-wheel-handle-drag-max",
    );
  }

  #readCssLength(propertyName) {
    let raw = getComputedStyle(this)
      .getPropertyValue(propertyName)
      .trim();
    if (raw.includes("var(") || !raw.endsWith("px")) {
      const probe = document.createElement("div");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        width: `var(${propertyName})`,
      });
      this.appendChild(probe);
      raw = getComputedStyle(probe).width;
      probe.remove();
    }
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  #updateHandlePull(pointerX) {
    if (!this.#handleDragMaxPx) {
      this.#clearHandlePull();
      return;
    }
    const dragDelta = pointerX - this.#dragStartX;
    if (!dragDelta) {
      this.#clearHandlePull();
      return;
    }
    const offset =
      this.#handleDragMaxPx *
      Math.tanh(
        dragDelta / Math.max(1, this.#handleDragMaxPx * 3),
      );
    this.style.setProperty(
      "--fig-input-wheel-handle-drag-offset",
      `${offset}px`,
    );
  }

  #resetHandlePull() {
    this.#clearHandlePull();
    this.#handleDragMaxPx = 0;
  }

  #clearHandlePull() {
    this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
  }

  #startTickMotionTracking(clientX) {
    this.#stopTickMotionTracking();
    this.#motionLastX = clientX;
    this.#motionLastTime = performance.now();
  }

  #updateTickMotionBlur(clientX, speed, moved) {
    const now = performance.now();
    const elapsed = now - this.#motionLastTime;
    const distance =
      this.#motionLastX === null ? 0 : Math.abs(clientX - this.#motionLastX);
    this.#motionLastX = clientX;
    this.#motionLastTime = now;
    const velocity =
      elapsed > 0 ? (distance / elapsed) * Math.max(1, Math.abs(speed)) : 0;
    if (
      !moved ||
      velocity < FigInputWheel.#FAST_MOTION_THRESHOLD_PX_PER_MS
    ) {
      this.#clearTickMotionBlur();
      return;
    }
    this.toggleAttribute("data-fig-input-wheel-fast", true);
    clearTimeout(this.#motionBlurTimer);
    this.#motionBlurTimer = window.setTimeout(() => {
      this.#clearTickMotionBlur();
    }, FigInputWheel.#FAST_MOTION_TIMEOUT_MS);
  }

  #stopTickMotionTracking() {
    this.#motionLastX = null;
    this.#motionLastTime = 0;
    this.#clearTickMotionBlur();
  }

  #clearTickMotionBlur() {
    clearTimeout(this.#motionBlurTimer);
    this.#motionBlurTimer = 0;
    this.removeAttribute("data-fig-input-wheel-fast");
  }

  #handleWheel(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    event.preventDefault();
    const direction = event.deltaY === 0 ? Math.sign(event.deltaX) : Math.sign(event.deltaY);
    if (!direction) return;
    const multiplier = event.shiftKey ? 10 : 1;
    this.#commitValue(this.#numericValue() + this.#step() * multiplier * direction, {
      snap: true,
      emit: "input",
    });
    this.#commitValue(this.#numericValue(), { emit: "change" });
  }

  #handleKeyDown(event) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (
      event.target instanceof Element &&
      event.target.closest("fig-input-number")
    ) {
      return;
    }
    if (event.key === "Home") {
      const min = this.#boundMin();
      if (min === null) return;
      event.preventDefault();
      this.#commitValue(min, { snap: true, emit: "input" });
      this.#commitValue(this.#numericValue(), { emit: "change" });
      return;
    }
    if (event.key === "End") {
      const max = this.#boundMax();
      if (max === null) return;
      event.preventDefault();
      this.#commitValue(max, { snap: true, emit: "input" });
      this.#commitValue(this.#numericValue(), { emit: "change" });
      return;
    }
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : -1;
    const multiplier = event.shiftKey ? 10 : 1;
    const previousValue = this.#numericValue();
    this.#commitValue(previousValue + this.#step() * multiplier * direction, {
      snap: true,
      emit: "input",
    });
    this.#animateKeyboardMovement(
      previousValue,
      this.#numericValue(),
      direction,
      multiplier,
    );
    this.#commitValue(this.#numericValue(), { emit: "change" });
  }

  #animateKeyboardMovement(
    from,
    to,
    direction,
    multiplier,
    animateHandle = true,
  ) {
    if (
      from === to ||
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      this.#stopKeyboardAnimation();
      return;
    }

    if (this.#keyboardAnimationFrame) {
      cancelAnimationFrame(this.#keyboardAnimationFrame);
      this.#keyboardAnimationFrame = 0;
    }
    clearTimeout(this.#keyboardSettleTimer);
    this.#keyboardSettleTimer = 0;
    this.removeAttribute("data-fig-input-wheel-keyboard-settling");
    const visualFrom = this.#visualValue ?? from;
    const handleFrom =
      Number.parseFloat(
        this.style.getPropertyValue("--fig-input-wheel-handle-drag-offset"),
      ) || 0;
    const duration = multiplier > 1 ? 120 : 90;
    const startedAt = performance.now();
    const shouldAnimateHandle = animateHandle;
    this.setAttribute("data-fig-input-wheel-keyboard-moving", "");

    const frame = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      this.#visualValue = visualFrom + (to - visualFrom) * progress;
      if (shouldAnimateHandle) {
        const eased = Math.sin((progress * Math.PI) / 2);
        const offset = handleFrom + (direction * 4 - handleFrom) * eased;
        this.style.setProperty(
          "--fig-input-wheel-handle-drag-offset",
          `${offset}px`,
        );
      }
      this.#layoutWheel();

      if (progress < 1) {
        this.#keyboardAnimationFrame = requestAnimationFrame(frame);
        return;
      }

      this.#keyboardAnimationFrame = 0;
      this.#visualValue = null;
      this.removeAttribute("data-fig-input-wheel-keyboard-moving");
      this.setAttribute("data-fig-input-wheel-keyboard-settling", "");
      this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
      this.#keyboardSettleTimer = window.setTimeout(() => {
        this.removeAttribute("data-fig-input-wheel-keyboard-settling");
        this.#keyboardSettleTimer = 0;
      }, 140);
      this.#queueWheelLayout();
    };

    this.#keyboardAnimationFrame = requestAnimationFrame(frame);
  }

  #stopKeyboardAnimation() {
    if (this.#keyboardAnimationFrame) {
      cancelAnimationFrame(this.#keyboardAnimationFrame);
      this.#keyboardAnimationFrame = 0;
    }
    clearTimeout(this.#keyboardSettleTimer);
    this.#keyboardSettleTimer = 0;
    this.#visualValue = null;
    this.removeAttribute("data-fig-input-wheel-keyboard-moving");
    this.removeAttribute("data-fig-input-wheel-keyboard-settling");
    this.style.removeProperty("--fig-input-wheel-handle-drag-offset");
    if (this.isConnected) this.#queueWheelLayout();
  }

  get value() {
    return this.getAttribute("value") ?? "0";
  }

  set value(nextValue) {
    if (nextValue === null || nextValue === undefined || nextValue === "") {
      this.#commitValue(0);
      return;
    }
    const parsed = Number(nextValue);
    this.#commitValue(Number.isFinite(parsed) ? parsed : 0);
  }

  spinTo(nextValue, { animateHandle = false } = {}) {
    const previousValue = this.#numericValue();
    this.value = nextValue;
    const value = this.#numericValue();
    if (this.getAttribute("spin") === "false") {
      this.#stopKeyboardAnimation();
      return value;
    }
    const direction = Math.sign(value - previousValue);
    this.#animateKeyboardMovement(
      previousValue,
      value,
      direction,
      Math.abs(value - previousValue) > this.#step() ? 10 : 1,
      animateHandle,
    );
    return value;
  }

  get min() {
    return this.#boundMin();
  }

  set min(nextValue) {
    this.#writeBound("min", nextValue);
  }

  get max() {
    return this.#boundMax();
  }

  set max(nextValue) {
    this.#writeBound("max", nextValue);
  }

  get step() {
    return this.#step();
  }

  focus(options) {
    HTMLElement.prototype.focus.call(this, options);
  }
}
figLabDefineElement("fig-input-wheel", FigInputWheel);
/* Canvas Control */
/**
 * A composite spatial control built from one or more fig-handle elements.
 * @attr {number} precision - Decimal places for positions, radius, angle, and internal handle dragging (default 2).
 */
class FigCanvasControl extends HTMLElement {
  static observedAttributes = [
    "type",
    "value",
    "color",
    "name",
    "tooltips",
    "disabled",
    "drag-surface",
    "snapping",
    "precision",
  ];

  #x = 50;
  #y = 50;
  #x2 = 75;
  #y2 = 75;
  #radius = 0;
  #radiusIsPercent = false;
  #angle = 0;
  #pointHandle = null;
  #secondHandle = null;
  #angleHandle = null;
  #radiusSvg = null;
  #angleSvg = null;
  #pointTooltip = null;
  #secondTooltip = null;
  #radiusTooltip = null;
  #angleTooltip = null;
  #isDragging = false;
  #isSecondDragging = false;
  #isRadiusDragging = false;
  #isAngleDragging = false;
  #moveCursorPointerId = null;
  #moveCursorPrevBodyCursor = "";
  #moveCursorPrevBodyCursorPriority = "";
  #boundMoveCursorEnd = null;
  #rotateCursorPointerId = null;
  #rotateCursorHandle = null;
  #rotateCursorPrevBodyCursor = "";
  #rotateCursorPrevBodyCursorPriority = "";
  #boundRotateCursorEnd = null;
  #activeGestureController = null;
  #activeGestureFinish = null;

  get #type() {
    return this.getAttribute("type") || "point";
  }

  get #hasRadius() {
    return this.#type === "point-radius" || this.#type === "point-radius-angle";
  }

  get #hasAngle() {
    return this.#type === "point-radius-angle";
  }

  get #hasSecondPoint() {
    return this.#type === "point-point";
  }

  get #hasLine() {
    return this.#type === "point-radius-angle" || this.#type === "point-point";
  }

  get #tooltipsEnabled() {
    const v = this.getAttribute("tooltips");
    return v === null || v !== "false";
  }

  get #snappingMode() {
    const raw = this.getAttribute("snapping");
    if (raw === null) return "false";
    const n = raw.trim().toLowerCase();
    if (n === "modifier") return "modifier";
    if (n === "" || n === "true") return "true";
    return "false";
  }

  get #precision() {
    const parsed = Number(this.getAttribute("precision") ?? 2);
    if (!Number.isFinite(parsed)) return 2;
    return Math.max(0, Math.min(8, Math.trunc(parsed)));
  }

  #roundPosition(value) {
    const factor = 10 ** this.#precision;
    const rounded = Math.round(value * factor) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  #syncHandlePrecision() {
    const precision = this.getAttribute("precision");
    for (const handle of [
      this.#pointHandle,
      this.#angleHandle,
      this.#secondHandle,
    ]) {
      if (!handle) continue;
      if (precision === null) handle.removeAttribute("precision");
      else handle.setAttribute("precision", String(this.#precision));
    }
  }

  #shouldSnap(shiftKey) {
    const mode = this.#snappingMode;
    if (mode === "true") return true;
    if (mode === "modifier") return !!shiftKey;
    return false;
  }

  get #pointTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      return parts[0].trim();
    }
    return `${this.#roundPosition(this.#x)}%, ${this.#roundPosition(this.#y)}%`;
  }

  get #secondTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      if (parts.length > 1) return parts[1].trim();
    }
    return `${this.#roundPosition(this.#x2)}%, ${this.#roundPosition(this.#y2)}%`;
  }

  get #dragSurface() {
    return this.getAttribute("drag-surface") || "parent";
  }

  get #container() {
    const surface = this.#dragSurface;
    if (surface === "parent") return this.parentElement;
    return this.closest(surface);
  }

  get #handleDragSurface() {
    const surface = this.#dragSurface;
    if (surface === "parent") {
      const container = this.parentElement;
      if (container) {
        container.setAttribute("data-fig-canvas-control-surface", "");
        return "[data-fig-canvas-control-surface]";
      }
    }
    return surface;
  }

  #resolveRadius(containerWidth) {
    if (this.#radiusIsPercent) return (this.#radius / 100) * containerWidth;
    return this.#radius;
  }

  #formatRadius() {
    const radius = this.#roundPosition(this.#radius);
    if (this.#radiusIsPercent) return `Radius ${radius}%`;
    return `Radius ${radius}`;
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
  }

  disconnectedCallback() {
    this.#cancelActiveGesture();
    this.#teardownRadiusDrag();
    this.#deactivateMoveCursor();
    this.#deactivateRotateCursor();
    document.body.classList.remove("fig-lab-move-active");
    document.body.classList.remove("fig-lab-rotate-active");
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (
      name === "value" &&
      !this.#isDragging &&
      !this.#isSecondDragging &&
      !this.#isRadiusDragging &&
      !this.#isAngleDragging
    ) {
      this.#parseValue();
      if (this.#pointHandle) this.#syncPositions();
      else this.#render();
    }
    if (name === "type") {
      this.#cancelActiveGesture();
      this.#parseValue();
      this.#render();
    }
    if (name === "color" && this.#pointHandle) {
      if (newVal) this.#pointHandle.setAttribute("color", newVal);
      else this.#pointHandle.removeAttribute("color");
    }
    if (name === "disabled") {
      this.#cancelActiveGesture();
      this.#render();
    }
    if (name === "tooltips") {
      this.#render();
    }
    if (name === "snapping" && this.#pointHandle) {
      this.#pointHandle.setAttribute("drag-snapping", newVal || "false");
      if (this.#secondHandle)
        this.#secondHandle.setAttribute("drag-snapping", newVal || "false");
    }
    if (name === "precision") {
      if (!this.isConnected) return;
      this.#syncHandlePrecision();
      this.#x = this.#roundPosition(this.#x);
      this.#y = this.#roundPosition(this.#y);
      this.#x2 = this.#roundPosition(this.#x2);
      this.#y2 = this.#roundPosition(this.#y2);
      this.#radius = this.#roundPosition(this.#radius);
      this.#angle = this.#roundPosition(this.#angle);
      this.#syncPositions();
      this.#syncValueAttribute();
    }
    if (name === "name") {
      if (this.#pointTooltip)
        this.#pointTooltip.setAttribute("text", this.#pointTipText);
      if (this.#secondTooltip)
        this.#secondTooltip.setAttribute("text", this.#secondTipText);
    }
  }

  #parseValue() {
    const raw = this.getAttribute("value");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      if (typeof v.x === "number") this.#x = this.#roundPosition(v.x);
      if (typeof v.y === "number") this.#y = this.#roundPosition(v.y);
      if (v.radius !== undefined) {
        const rs = String(v.radius);
        if (rs.endsWith("%")) {
          this.#radiusIsPercent = true;
          this.#radius = this.#roundPosition(parseFloat(rs));
        } else {
          this.#radiusIsPercent = false;
          this.#radius = this.#roundPosition(parseFloat(rs));
        }
        if (!Number.isFinite(this.#radius)) this.#radius = 0;
      }
      if (typeof v.angle === "number")
        this.#angle = this.#roundPosition(v.angle);
      if (typeof v.x2 === "number") this.#x2 = this.#roundPosition(v.x2);
      if (typeof v.y2 === "number") this.#y2 = this.#roundPosition(v.y2);
      if (
        this.#type === "color" &&
        typeof v.color === "string" &&
        v.color.trim() &&
        this.getAttribute("color") !== v.color.trim()
      ) {
        this.setAttribute("color", v.color.trim());
      }
    } catch {
      /* ignore */
    }
  }

  get value() {
    const v = {
      x: this.#roundPosition(this.#x),
      y: this.#roundPosition(this.#y),
    };
    if (this.#type === "color") {
      const color =
        this.getAttribute("color") || this.#pointHandle?.getAttribute("color");
      if (color) v.color = color;
    }
    if (this.#hasRadius) {
      const radius = this.#roundPosition(this.#radius);
      v.radius = this.#radiusIsPercent ? `${radius}%` : radius;
    }
    if (this.#hasAngle) v.angle = this.#roundPosition(this.#angle);
    if (this.#hasSecondPoint) {
      v.x2 = this.#roundPosition(this.#x2);
      v.y2 = this.#roundPosition(this.#y2);
    }
    return v;
  }

  set value(val) {
    if (typeof val === "object") {
      this.setAttribute("value", JSON.stringify(val));
    } else if (typeof val === "string") {
      this.setAttribute("value", val);
    }
  }

  #render() {
    this.#cancelActiveGesture();
    this.replaceChildren();
    this.#pointHandle = null;
    this.#secondHandle = null;
    this.#angleHandle = null;
    this.#radiusSvg = null;
    this.#angleSvg = null;
    this.#pointTooltip = null;
    this.#secondTooltip = null;
    this.#radiusTooltip = null;
    this.#angleTooltip = null;

    const disabled = figLabBooleanAttribute(this, "disabled");
    const type = this.#type;
    const tooltips = this.#tooltipsEnabled;

    const handleSurface = this.#handleDragSurface;

    const handle = document.createElement("fig-handle");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("value", `${this.#x}% ${this.#y}%`);
    if (this.hasAttribute("precision")) {
      handle.setAttribute("precision", String(this.#precision));
    }
    if (disabled) handle.setAttribute("disabled", "");
    if (type === "color") {
      handle.setAttribute("type", "color");
      const color = this.getAttribute("color");
      if (color) handle.setAttribute("color", color);
    } else {
      handle.setAttribute("type", "canvas");
    }
    if (this.#hasSecondPoint) {
      handle.setAttribute("hit-area", "12 circle");
      handle.setAttribute("hit-area-mode", "delegate");
    }
    this.#pointHandle = handle;

    if (this.#hasRadius) {
      this.#createRadiusSvg();
    }

    if (this.#hasLine) {
      this.#createAngleSvg();
    }

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#pointTipText);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#pointTooltip = tip;
    } else {
      this.appendChild(handle);
    }

    if (this.#hasAngle) {
      this.#createAngleHandle(disabled, tooltips, handleSurface);
    }

    if (this.#hasSecondPoint) {
      this.#createSecondHandle(disabled, tooltips, handleSurface);
    }

    this.#setupHandleDragCursor(this.#pointHandle);
    this.#setupHandleDragCursor(this.#angleHandle);
    this.#setupHandleDragCursor(this.#secondHandle);
    this.#setupEventListeners();
    this.#wireHoverTooltips();
    requestAnimationFrame(() => this.#syncPositions());
  }

  #setupHandleDragCursor(handle) {
    if (!handle) return;
    handle.addEventListener(
      "pointerdown",
      (e) => {
        // Hit-area (outside ring) = rotate; handle body = move/resize.
        const onHitArea = e.target?.classList?.contains("fig-handle-hit-area");
        if (onHitArea && handle.querySelector(".fig-handle-hit-area")) {
          this.#activateRotateCursor(e, handle);
        } else {
          this.#activateMoveCursor(e);
        }
      },
      { capture: true },
    );
  }

  #activateMoveCursor(e) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (e?.button !== undefined && e.button !== 0) return;
    if (e?.isPrimary === false) return;

    if (this.#moveCursorPointerId === null) {
      this.#moveCursorPrevBodyCursor =
        document.body.style.getPropertyValue("cursor");
      this.#moveCursorPrevBodyCursorPriority =
        document.body.style.getPropertyPriority("cursor");
    }

    this.#moveCursorPointerId = e?.pointerId ?? -1;
    document.body.classList.add("fig-lab-move-active");
    document.body.style.setProperty(
      "cursor",
      "var(--fig-lab-cursor-move)",
      "important",
    );

    if (!this.#boundMoveCursorEnd) {
      this.#boundMoveCursorEnd = (event) => {
        if (
          event?.pointerId !== undefined &&
          this.#moveCursorPointerId !== null &&
          event.pointerId !== this.#moveCursorPointerId
        ) {
          return;
        }
        if (event?.type === "blur") {
          this.#deactivateMoveCursor();
        } else {
          requestAnimationFrame(() => this.#deactivateMoveCursor());
        }
      };
    }

    window.addEventListener("pointerup", this.#boundMoveCursorEnd);
    window.addEventListener("pointercancel", this.#boundMoveCursorEnd);
    window.addEventListener("blur", this.#boundMoveCursorEnd);
  }

  #deactivateMoveCursor() {
    if (this.#moveCursorPointerId === null) return;
    document.body.classList.remove("fig-lab-move-active");
    if (this.#moveCursorPrevBodyCursor) {
      document.body.style.setProperty(
        "cursor",
        this.#moveCursorPrevBodyCursor,
        this.#moveCursorPrevBodyCursorPriority,
      );
    } else {
      document.body.style.removeProperty("cursor");
    }
    this.#moveCursorPointerId = null;
    this.#moveCursorPrevBodyCursor = "";
    this.#moveCursorPrevBodyCursorPriority = "";
    if (this.#boundMoveCursorEnd) {
      window.removeEventListener("pointerup", this.#boundMoveCursorEnd);
      window.removeEventListener("pointercancel", this.#boundMoveCursorEnd);
      window.removeEventListener("blur", this.#boundMoveCursorEnd);
    }
  }

  #rotateDegForHandle(handle) {
    if (!handle) return 0;
    if (handle === this.#angleHandle) return this.#angle;
    if (!this.#hasSecondPoint) return 0;
    const lineDeg = this.#pointPointLineDeg();
    return handle === this.#pointHandle ? lineDeg + 180 : lineDeg;
  }

  #refreshBodyRotateCursor() {
    if (this.#rotateCursorPointerId === null) return;
    const cursor = this.#rotateCursorSvg(
      this.#rotateDegForHandle(this.#rotateCursorHandle),
    );
    document.body.style.setProperty("--fig-lab-cursor-rotate", cursor);
    document.body.style.setProperty("cursor", cursor, "important");
  }

  #activateRotateCursor(e, handle) {
    if (figLabBooleanAttribute(this, "disabled")) return;
    if (e?.button !== undefined && e.button !== 0) return;
    if (e?.isPrimary === false) return;

    if (this.#rotateCursorPointerId === null) {
      this.#rotateCursorPrevBodyCursor =
        document.body.style.getPropertyValue("cursor");
      this.#rotateCursorPrevBodyCursorPriority =
        document.body.style.getPropertyPriority("cursor");
    }

    this.#rotateCursorPointerId = e?.pointerId ?? -1;
    this.#rotateCursorHandle = handle;
    document.body.classList.add("fig-lab-rotate-active");
    this.#refreshBodyRotateCursor();

    if (!this.#boundRotateCursorEnd) {
      this.#boundRotateCursorEnd = (event) => {
        if (
          event?.pointerId !== undefined &&
          this.#rotateCursorPointerId !== null &&
          event.pointerId !== this.#rotateCursorPointerId
        ) {
          return;
        }
        if (event?.type === "blur") {
          this.#deactivateRotateCursor();
        } else {
          requestAnimationFrame(() => this.#deactivateRotateCursor());
        }
      };
    }

    window.addEventListener("pointerup", this.#boundRotateCursorEnd);
    window.addEventListener("pointercancel", this.#boundRotateCursorEnd);
    window.addEventListener("blur", this.#boundRotateCursorEnd);
  }

  #deactivateRotateCursor() {
    if (this.#rotateCursorPointerId === null) return;
    document.body.classList.remove("fig-lab-rotate-active");
    document.body.style.removeProperty("--fig-lab-cursor-rotate");
    if (this.#rotateCursorPrevBodyCursor) {
      document.body.style.setProperty(
        "cursor",
        this.#rotateCursorPrevBodyCursor,
        this.#rotateCursorPrevBodyCursorPriority,
      );
    } else {
      document.body.style.removeProperty("cursor");
    }
    this.#rotateCursorPointerId = null;
    this.#rotateCursorHandle = null;
    this.#rotateCursorPrevBodyCursor = "";
    this.#rotateCursorPrevBodyCursorPriority = "";
    if (this.#boundRotateCursorEnd) {
      window.removeEventListener("pointerup", this.#boundRotateCursorEnd);
      window.removeEventListener("pointercancel", this.#boundRotateCursorEnd);
      window.removeEventListener("blur", this.#boundRotateCursorEnd);
    }
  }

  #wireHoverTooltip(target, getTooltip, getText, isDraggingRef) {
    if (!target) return;
    const shouldSuppress = () => !!isDraggingRef?.();
    const hideTooltip = () => {
      const tip = getTooltip();
      if (!tip) return;
      tip.removeAttribute("show");
      tip.hidePopup?.();
    };
    const show = () => {
      if (shouldSuppress()) {
        hideTooltip();
        return;
      }
      const tip = getTooltip();
      if (!tip) return;
      if (getText) tip.setAttribute("text", getText());
      tip.setAttribute("show", "true");
      tip.showPopup?.();
    };
    const hide = () => {
      hideTooltip();
    };
    target.addEventListener("pointerenter", show);
    target.addEventListener("pointerleave", hide);
  }

  #hasActiveInteraction() {
    return (
      this.#isDragging ||
      this.#isSecondDragging ||
      this.#isRadiusDragging ||
      this.#isAngleDragging
    );
  }

  #wireHoverTooltips() {
    if (this.#pointHandle) {
      this.#wireHoverTooltip(
        this.#pointHandle,
        () => this.#pointTooltip,
        () => this.#pointTipText,
        () =>
          this.#hasActiveInteraction() ||
          !!this.#pointHandle?.querySelector("fig-color-tip"),
      );
    }
    if (this.#angleHandle) {
      this.#wireHoverTooltip(
        this.#angleHandle,
        () => this.#angleTooltip,
        () => `Angle ${this.#roundPosition(this.#angle)}°`,
        () => this.#hasActiveInteraction(),
      );
    }
    if (this.#secondHandle) {
      this.#wireHoverTooltip(
        this.#secondHandle,
        () => this.#secondTooltip,
        () => this.#secondTipText,
        () => this.#hasActiveInteraction(),
      );
    }
    if (this.#radiusSvg) {
      const hit = this.#radiusSvg.querySelector(
        ".fig-canvas-control-radius-hit",
      );
      this.#wireRadiusHoverTooltip(hit || this.#radiusSvg);
    }

    if (this.#type === "color" && this.#pointHandle && this.#pointTooltip) {
      const obs = new MutationObserver(() => {
        if (this.#pointHandle?.querySelector("fig-color-tip")) {
          this.#pointTooltip?.removeAttribute("show");
          this.#pointTooltip?.hidePopup?.();
        }
      });
      obs.observe(this.#pointHandle, { childList: true, subtree: true });
    }
  }

  #setRadiusTooltipAnchorAt(clientX, clientY) {
    const tip = this.#radiusTooltip;
    if (!tip?.popup) return;
    const y = clientY - 8;
    tip.popup.anchor = {
      getBoundingClientRect: () => ({
        left: clientX,
        top: y,
        right: clientX,
        bottom: y,
        width: 0,
        height: 0,
        x: clientX,
        y,
      }),
    };
    tip.popup.queueReposition?.();
  }

  #wireRadiusHoverTooltip(target) {
    if (!target) return;
    target.addEventListener("pointerenter", (e) => {
      const tip = this.#radiusTooltip;
      if (!tip) return;
      tip.setAttribute("text", this.#formatRadius());
      tip.setAttribute("show", "true");
      tip.showPopup?.();
      this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
    });
    target.addEventListener("pointermove", (e) => {
      if (this.#isRadiusDragging) return;
      this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
    });
    target.addEventListener("pointerleave", () => {
      if (this.#isRadiusDragging) return;
      const tip = this.#radiusTooltip;
      if (!tip) return;
      tip.removeAttribute("show");
    });
  }

  #createRadiusSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-radius");
    svg.setAttribute("overflow", "visible");
    const hitCircle = document.createElementNS(ns, "circle");
    hitCircle.classList.add("fig-canvas-control-radius-hit");
    svg.appendChild(hitCircle);
    const haloCircle = document.createElementNS(ns, "circle");
    haloCircle.classList.add("fig-canvas-control-radius-halo");
    svg.appendChild(haloCircle);
    const circle = document.createElementNS(ns, "circle");
    svg.appendChild(circle);
    this.#radiusSvg = svg;

    if (this.#tooltipsEnabled) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#formatRadius());
      tip.appendChild(svg);
      this.appendChild(tip);
      this.#radiusTooltip = tip;
    } else {
      this.appendChild(svg);
    }

    this.#setupRadiusDrag(hitCircle);
  }

  #createAngleSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-angle-svg");
    svg.setAttribute("overflow", "visible");
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";
    if (this.#hasSecondPoint) {
      const hitLine = document.createElementNS(ns, "line");
      hitLine.classList.add("fig-canvas-control-angle-line-hit");
      hitLine.setAttribute("stroke", "transparent");
      hitLine.setAttribute("stroke-width", "12");
      hitLine.setAttribute("stroke-linecap", "round");
      hitLine.style.pointerEvents = "stroke";
      svg.appendChild(hitLine);
      this.#setupLineDrag(hitLine);
    }
    const haloLine = document.createElementNS(ns, "line");
    haloLine.classList.add("fig-canvas-control-angle-line-halo");
    svg.appendChild(haloLine);
    const line = document.createElementNS(ns, "line");
    line.classList.add("fig-canvas-control-angle-line");
    svg.appendChild(line);
    this.#angleSvg = svg;
    this.appendChild(svg);
  }

  #setupLineDrag(hitLine) {
    hitLine.addEventListener("pointerdown", (e) => {
      if (figLabBooleanAttribute(this, "disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      const container = this.#container;
      if (!container) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const x0 = this.#x;
      const y0 = this.#y;
      const x20 = this.#x2;
      const y20 = this.#y2;
      this.#isDragging = true;
      this.#isSecondDragging = true;
      document.body.classList.add("fig-lab-move-active");
      hitLine.style.pointerEvents = "none";

      const onMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const dxPctRaw =
          rect.width > 0 ? ((ev.clientX - startX) / rect.width) * 100 : 0;
        const dyPctRaw =
          rect.height > 0 ? ((ev.clientY - startY) / rect.height) * 100 : 0;
        const minDx = -Math.min(x0, x20);
        const maxDx = 100 - Math.max(x0, x20);
        const minDy = -Math.min(y0, y20);
        const maxDy = 100 - Math.max(y0, y20);
        const dxPct = Math.max(minDx, Math.min(maxDx, dxPctRaw));
        const dyPct = Math.max(minDy, Math.min(maxDy, dyPctRaw));
        this.#x = this.#roundPosition(x0 + dxPct);
        this.#y = this.#roundPosition(y0 + dyPct);
        this.#x2 = this.#roundPosition(x20 + dxPct);
        this.#y2 = this.#roundPosition(y20 + dyPct);
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        document.body.classList.remove("fig-lab-move-active");
        hitLine.style.pointerEvents = "stroke";
        this.#isDragging = false;
        this.#isSecondDragging = false;
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    });
  }

  #createAngleHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("type", "canvas");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("size", "small");
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    if (this.hasAttribute("precision")) {
      handle.setAttribute("precision", String(this.#precision));
    }
    if (disabled) handle.setAttribute("disabled", "");
    this.#angleHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", `${this.#roundPosition(this.#angle)}°`);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#angleTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #createSecondHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("type", "canvas");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    handle.setAttribute("value", `${this.#x2}% ${this.#y2}%`);
    if (this.hasAttribute("precision")) {
      handle.setAttribute("precision", String(this.#precision));
    }
    if (disabled) handle.setAttribute("disabled", "");
    this.#secondHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "canvas");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", this.#secondTipText);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#secondTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #resizeCursorSvg(deg) {
    const r = Math.round(deg);
    return `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(${r} 16 16)'%3E%3Cg filter='url(%23f)'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M11.1212 16.9998L11.5607 17.4394C12.1465 18.0252 12.1464 18.975 11.5606 19.5607C10.9748 20.1465 10.0251 20.1465 9.4393 19.5606L6.4393 16.5604C5.85354 15.9746 5.85357 15.0249 6.43938 14.4391L9.43938 11.4393C10.0252 10.8535 10.9749 10.8536 11.5607 11.4394C12.1465 12.0252 12.1464 12.9749 11.5606 13.5607L11.1215 13.9998L20.8786 13.9999L20.4394 13.5607C19.8536 12.9749 19.8535 12.0252 20.4393 11.4394C21.0251 10.8536 21.9749 10.8536 22.5606 11.4394L25.5606 14.4393C25.842 14.7206 26 15.1021 26 15.4999C26 15.8978 25.842 16.2793 25.5607 16.5606L22.5607 19.5607C21.9749 20.1465 21.0251 20.1465 20.4393 19.5607C19.8536 18.9749 19.8535 18.0252 20.4393 17.4394L20.8788 16.9999L11.1212 16.9998Z' fill='white'/%3E%3C/g%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.8536 12.1465C11.0488 12.3417 11.0488 12.6583 10.8535 12.8536L8.70715 14.9998L23.2929 14.9999L21.1465 12.8536C20.9512 12.6583 20.9512 12.3417 21.1464 12.1465C21.3417 11.9512 21.6583 11.9512 21.8535 12.1465L24.8535 15.1464C24.9473 15.2402 25 15.3673 25 15.4999C25 15.6326 24.9473 15.7597 24.8536 15.8535L21.8536 18.8536C21.6583 19.0488 21.3417 19.0488 21.1465 18.8536C20.9512 18.6583 20.9512 18.3417 21.1464 18.1465L23.2929 15.9999L8.70705 15.9998L10.8536 18.1465C11.0488 18.3417 11.0488 18.6583 10.8535 18.8536C10.6583 19.0488 10.3417 19.0488 10.1464 18.8535L7.14643 15.8533C6.95118 15.658 6.95119 15.3415 7.14646 15.1462L10.1465 12.1464C10.3417 11.9512 10.6583 11.9512 10.8536 12.1465Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='f' x='3' y='9' width='26' height='15' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='a'/%3E%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='b'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3CfeBlend in2='a' result='c'/%3E%3CfeBlend in='SourceGraphic' in2='c'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E") 16 16, nwse-resize`;
  }

  #rotateCursorSvg(deg) {
    const r = Math.round(deg - 45);
    return `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg transform='rotate(${r} 16 16)'%3E%3Cg filter='url(%23f)'%3E%3Cpath d='M12.5607 22.4393L12.0216 21.9002C17.1558 21.2216 21.2216 17.1558 21.9002 12.0216L22.4393 12.5607C23.0251 13.1464 23.9749 13.1464 24.5607 12.5607C25.1464 11.9749 25.1464 11.0251 24.5607 10.4393L21.5607 7.43934C20.9749 6.85355 20.0251 6.85355 19.4393 7.43934L16.4393 10.4393C15.8536 11.0251 15.8536 11.9749 16.4393 12.5607C17.0251 13.1464 17.9749 13.1464 18.5607 12.5607L18.8056 12.3157C18.1013 15.5527 15.5527 18.1013 12.3157 18.8056L12.5607 18.5607C13.1464 17.9749 13.1464 17.0251 12.5607 16.4393C11.9749 15.8536 11.0251 15.8536 10.4393 16.4393L7.43934 19.4393C6.85356 20.0251 6.85356 20.9749 7.43934 21.5607L10.4393 24.5607C11.0251 25.1464 11.9749 25.1464 12.5607 24.5607C13.1464 23.9749 13.1464 23.0251 12.5607 22.4393Z' fill='white'/%3E%3C/g%3E%3Cpath d='M23.8536 11.8536C23.6583 12.0488 23.3417 12.0488 23.1464 11.8536L21 9.70711V10.5C21 16.299 16.299 21 10.5 21H9.70711L11.8536 23.1464C12.0488 23.3417 12.0488 23.6583 11.8536 23.8536C11.6583 24.0488 11.3417 24.0488 11.1464 23.8536L8.14645 20.8536C7.95119 20.6583 7.95119 20.3417 8.14645 20.1464L11.1464 17.1464C11.3417 16.9512 11.6583 16.9512 11.8536 17.1464C12.0488 17.3417 12.0488 17.6583 11.8536 17.8536L9.70711 20H10.5C15.7467 20 20 15.7467 20 10.5V9.70711L17.8536 11.8536C17.6583 12.0488 17.3417 12.0488 17.1464 11.8536C16.9512 11.6583 16.9512 11.3417 17.1464 11.1464L20.1464 8.14645C20.3417 7.95119 20.6583 7.95119 20.8536 8.14645L23.8536 11.1464C24.0488 11.3417 24.0488 11.6583 23.8536 11.8536Z' fill='black'/%3E%3C/g%3E%3Cdefs%3E%3Cfilter id='f' x='4' y='5' width='24' height='24' filterUnits='userSpaceOnUse' color-interpolation-filters='sRGB'%3E%3CfeFlood flood-opacity='0' result='a'/%3E%3CfeColorMatrix in='SourceAlpha' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0' result='b'/%3E%3CfeOffset dy='1'/%3E%3CfeGaussianBlur stdDeviation='1.5'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.35 0'/%3E%3CfeBlend in2='a' result='c'/%3E%3CfeBlend in='SourceGraphic' in2='c'/%3E%3C/filter%3E%3C/defs%3E%3C/svg%3E") 16 16, pointer`;
  }

  #setHitCursor(el, cursor) {
    if (!el) return;
    // !important — fig-canvas-control hover rules override plain inline cursor.
    el.style.setProperty("cursor", cursor, "important");
  }

  #applyRotateCursor(handle, deg) {
    if (!handle) return;
    // Rotate only on the outside hit-area ring — handle body uses normal point cursor.
    const hitArea = handle.querySelector(".fig-handle-hit-area");
    if (!hitArea) return;
    hitArea.setAttribute("data-cursor", "rotate");
    this.#setHitCursor(hitArea, this.#rotateCursorSvg(deg));
    if (this.#rotateCursorHandle === handle) {
      this.#refreshBodyRotateCursor();
    }
  }

  #syncAngleCursor() {
    if (!this.#angleHandle || !this.#hasAngle) return;
    this.#applyRotateCursor(this.#angleHandle, this.#angle);
  }

  #pointPointLineDeg() {
    return (Math.atan2(this.#y2 - this.#y, this.#x2 - this.#x) * 180) / Math.PI;
  }

  #syncPointPointCursors() {
    if (!this.#hasSecondPoint) return;
    const deg = this.#pointPointLineDeg();
    // Handle body: leave cursor to CSS (same as default point handle).
    this.#pointHandle?.style.removeProperty("cursor");
    this.#secondHandle?.style.removeProperty("cursor");
    this.#applyRotateCursor(this.#pointHandle, deg + 180);
    this.#applyRotateCursor(this.#secondHandle, deg);
  }

  #positionHandle(handle, xPct, yPct, rect) {
    handle.style.setProperty("--fig-handle-position-translate", "-50% -50%");
    handle.style.left = `${(xPct / 100) * rect.width}px`;
    handle.style.top = `${(yPct / 100) * rect.height}px`;
  }

  #syncPositions() {
    const container = this.#container;
    if (!container || !this.#pointHandle) return;
    const rect = container.getBoundingClientRect();

    this.#positionHandle(this.#pointHandle, this.#x, this.#y, rect);

    if (this.#radiusSvg) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const r = this.#resolveRadius(rect.width);
      const svg = this.#radiusSvg;
      const d = Math.max(r * 2, 1);
      svg.style.position = "absolute";
      svg.style.width = `${d}px`;
      svg.style.height = `${d}px`;
      svg.style.left = `${cx - r}px`;
      svg.style.top = `${cy - r}px`;
      svg.setAttribute("viewBox", `0 0 ${d} ${d}`);
      const circles = svg.querySelectorAll("circle");
      for (const c of circles) {
        c.setAttribute("cx", String(r));
        c.setAttribute("cy", String(r));
        c.setAttribute("r", String(Math.max(r - 1, 0)));
      }
    }

    if (this.#angleSvg && this.#hasLine) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      let lx2, ly2;
      if (this.#hasSecondPoint) {
        lx2 = (this.#x2 / 100) * rect.width;
        ly2 = (this.#y2 / 100) * rect.height;
      } else {
        const r = this.#resolveRadius(rect.width);
        const angleRad = (this.#angle * Math.PI) / 180;
        lx2 = cx + r * Math.cos(angleRad);
        ly2 = cy + r * Math.sin(angleRad);
      }

      const svg = this.#angleSvg;
      svg.style.width = `${rect.width}px`;
      svg.style.height = `${rect.height}px`;
      svg.style.left = "0";
      svg.style.top = "0";
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      const lines = svg.querySelectorAll(
        ".fig-canvas-control-angle-line, .fig-canvas-control-angle-line-halo, .fig-canvas-control-angle-line-hit",
      );
      for (const line of lines) {
        line.setAttribute("x1", String(cx));
        line.setAttribute("y1", String(cy));
        line.setAttribute("x2", String(lx2));
        line.setAttribute("y2", String(ly2));
      }
    }

    if (this.#angleHandle && this.#hasAngle) {
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const r = this.#resolveRadius(rect.width);
      const angleRad = (this.#angle * Math.PI) / 180;
      const ax = cx + r * Math.cos(angleRad);
      const ay = cy + r * Math.sin(angleRad);
      const pxPct = rect.width > 0 ? (ax / rect.width) * 100 : 0;
      const pyPct = rect.height > 0 ? (ay / rect.height) * 100 : 0;
      this.#positionHandle(this.#angleHandle, pxPct, pyPct, rect);
    }

    if (this.#secondHandle && this.#hasSecondPoint) {
      this.#positionHandle(this.#secondHandle, this.#x2, this.#y2, rect);
    }

    this.#syncAngleCursor();
    this.#syncPointPointCursors();
  }

  #emitInput(detail = this.value) {
    this.dispatchEvent(
      new CustomEvent("input", { bubbles: true, detail }),
    );
  }

  #emitChange(detail = this.value) {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, detail }),
    );
  }

  #colorEventDetail(detail) {
    return {
      ...this.value,
      ...figLabColorEventAliases(
        detail.color,
        detail.alpha,
        detail.opacity,
      ),
    };
  }

  #syncValueAttribute() {
    this.setAttribute("value", JSON.stringify(this.value));
  }

  #setupEventListeners() {
    if (!this.#pointHandle) return;

    this.#pointHandle.addEventListener("input", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute(
          "color",
          this.#pointHandle.getAttribute("color") || e.detail.color,
        );
        this.#emitInput(this.#colorEventDetail(e.detail));
        return;
      }
      this.#isDragging = true;
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = this.#roundPosition(
        Math.max(0, Math.min(100, px * 100)),
      );
      this.#y = this.#roundPosition(
        Math.max(0, Math.min(100, py * 100)),
      );
      if (this.#pointTooltip) {
        this.#pointTooltip.removeAttribute("show");
        this.#pointTooltip.hidePopup?.();
      }
      this.#syncPositions();
      this.#emitInput();
    });

    this.#pointHandle.addEventListener("change", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute(
          "color",
          this.#pointHandle.getAttribute("color") || e.detail.color,
        );
        this.#emitChange(this.#colorEventDetail(e.detail));
        return;
      }
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = this.#roundPosition(
        Math.max(0, Math.min(100, px * 100)),
      );
      this.#y = this.#roundPosition(
        Math.max(0, Math.min(100, py * 100)),
      );
      if (this.#pointTooltip) this.#pointTooltip.removeAttribute("show");
      this.#syncPositions();
      this.#syncValueAttribute();
      this.#emitChange();
      requestAnimationFrame(() => {
        this.#isDragging = false;
      });
    });

    if (this.#angleHandle) {
      this.#angleHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        const container = this.#container;
        if (!container) return;
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        const rect = container.getBoundingClientRect();
        const cx = (this.#x / 100) * rect.width;
        const cy = (this.#y / 100) * rect.height;
        const hx = e.detail?.x ?? 0;
        const hy = e.detail?.y ?? 0;
        const hw = this.#angleHandle.offsetWidth / 2;
        const hh = this.#angleHandle.offsetHeight / 2;
        const dx = hx + hw - cx;
        const dy = hy + hh - cy;
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (this.#shouldSnap(e.detail?.shiftKey)) {
          angle = Math.round(angle / 15) * 15;
        }
        this.#angle = this.#roundPosition(angle);

        let dist = Math.sqrt(dx * dx + dy * dy);
        if (this.#shouldSnap(e.detail?.shiftKey)) {
          const step = this.#radiusIsPercent ? 5 : 10;
          if (this.#radiusIsPercent) {
            let pct = (dist / rect.width) * 100;
            pct = Math.round(pct / step) * step;
            dist = (pct / 100) * rect.width;
          } else {
            dist = Math.round(dist / step) * step;
          }
        }
        if (this.#radiusIsPercent) {
          this.#radius = this.#roundPosition(
            Math.max(0, (dist / rect.width) * 100),
          );
        } else {
          this.#radius = this.#roundPosition(Math.max(0, dist));
        }

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute(
            "text",
            `Angle ${this.#roundPosition(this.#angle)}°`,
          );
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }
        this.#syncPositions();
        this.#emitInput();
      });

      this.#angleHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        this.classList.remove("fig-canvas-control-ring-active");
        if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
        this.#syncPositions();
        this.#syncValueAttribute();
        this.#emitChange();
        requestAnimationFrame(() => {
          this.#isAngleDragging = false;
        });
      });

      this.#angleHandle.addEventListener("hitareadown", (e) => {
        e.stopPropagation();
        const origEvent = e.detail?.originalEvent;
        if (!origEvent) return;
        origEvent.preventDefault();
        const container = this.#container;
        if (!container) return;
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        this.#angleHandle.setAttribute("selected", "");

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }

        const onMove = (ev) => {
          const rect = container.getBoundingClientRect();
          const cx = (this.#x / 100) * rect.width;
          const cy = (this.#y / 100) * rect.height;
          const dx = ev.clientX - rect.left - cx;
          const dy = ev.clientY - rect.top - cy;
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (this.#shouldSnap(ev.shiftKey)) {
            angle = Math.round(angle / 15) * 15;
          }
          this.#angle = this.#roundPosition(angle);
          if (this.#angleTooltip)
            this.#angleTooltip.setAttribute(
              "text",
              `Angle ${this.#roundPosition(angle)}°`,
            );
          this.#syncPositions();
          this.#emitInput();
        };

        const gesture = this.#beginActiveGesture((commit) => {
          this.#isAngleDragging = false;
          this.classList.remove("fig-canvas-control-ring-active");
          this.#angleHandle.removeAttribute("selected");
          if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
          if (commit) {
            this.#syncValueAttribute();
            this.#emitChange();
          }
        });

        window.addEventListener("pointermove", onMove, { signal: gesture.signal });
        window.addEventListener("pointerup", () => gesture.finish(true), {
          signal: gesture.signal,
        });
        window.addEventListener("pointercancel", () => gesture.finish(false), {
          signal: gesture.signal,
        });
      });
    }

    if (this.#secondHandle) {
      this.#secondHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        this.#isSecondDragging = true;
        const px = e.detail?.px ?? this.#x2 / 100;
        const py = e.detail?.py ?? this.#y2 / 100;
        this.#x2 = this.#roundPosition(
          Math.max(0, Math.min(100, px * 100)),
        );
        this.#y2 = this.#roundPosition(
          Math.max(0, Math.min(100, py * 100)),
        );
        if (this.#secondTooltip) {
          this.#secondTooltip.removeAttribute("show");
          this.#secondTooltip.hidePopup?.();
        }
        this.#syncPositions();
        this.#emitInput();
      });

      this.#secondHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        if (this.#secondTooltip) this.#secondTooltip.removeAttribute("show");
        this.#syncPositions();
        this.#syncValueAttribute();
        this.#emitChange();
        requestAnimationFrame(() => {
          this.#isSecondDragging = false;
        });
      });

      this.#setupPointPointHitArea(this.#pointHandle, true);
      this.#setupPointPointHitArea(this.#secondHandle, false);
    }
  }

  #setupPointPointHitArea(handle, isFirst) {
    if (!handle) return;
    handle.addEventListener("hitareadown", (e) => {
      e.stopPropagation();
      const origEvent = e.detail?.originalEvent;
      if (!origEvent) return;
      origEvent.preventDefault();
      const container = this.#container;
      if (!container) return;
      this.#isDragging = true;
      const rect = container.getBoundingClientRect();

      const pivotX = isFirst ? this.#x2 : this.#x;
      const pivotY = isFirst ? this.#y2 : this.#y;
      const movingX = isFirst ? this.#x : this.#x2;
      const movingY = isFirst ? this.#y : this.#y2;
      const pcx = (pivotX / 100) * rect.width;
      const pcy = (pivotY / 100) * rect.height;
      const mcx = (movingX / 100) * rect.width;
      const mcy = (movingY / 100) * rect.height;
      const fixedLen = Math.sqrt((mcx - pcx) ** 2 + (mcy - pcy) ** 2);

      const tooltip = isFirst ? this.#pointTooltip : this.#secondTooltip;
      if (tooltip) {
        tooltip.removeAttribute("show");
        tooltip.hidePopup?.();
      }

      const onMove = (ev) => {
        const r = container.getBoundingClientRect();
        const px = (pivotX / 100) * r.width;
        const py = (pivotY / 100) * r.height;
        const dx = ev.clientX - r.left - px;
        const dy = ev.clientY - r.top - py;
        let angle = Math.atan2(dy, dx);
        if (this.#shouldSnap(ev.shiftKey)) {
          const snapDeg = Math.round((angle * 180) / Math.PI / 15) * 15;
          angle = (snapDeg * Math.PI) / 180;
        }
        const nx = px + fixedLen * Math.cos(angle);
        const ny = py + fixedLen * Math.sin(angle);
        const newPctX = Math.max(0, Math.min(100, (nx / r.width) * 100));
        const newPctY = Math.max(0, Math.min(100, (ny / r.height) * 100));
        if (isFirst) {
          this.#x = this.#roundPosition(newPctX);
          this.#y = this.#roundPosition(newPctY);
        } else {
          this.#x2 = this.#roundPosition(newPctX);
          this.#y2 = this.#roundPosition(newPctY);
        }
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        this.#isDragging = false;
        if (tooltip) tooltip.removeAttribute("show");
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    });
  }

  #setupRadiusDrag(circle) {
    if (!circle) return;
    circle.addEventListener("pointermove", (e) => {
      if (this.#isRadiusDragging) return;
      const container = this.#container;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = (this.#x / 100) * rect.width;
      const cy = (this.#y / 100) * rect.height;
      const deg =
        (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) *
          180) /
        Math.PI;
      this.#setHitCursor(circle, this.#resizeCursorSvg(deg));
    });
    const onDown = (e) => {
      if (figLabBooleanAttribute(this, "disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      this.#isRadiusDragging = true;
      this.classList.add("fig-canvas-control-ring-active");
      const container = this.#container;
      if (!container) return;

      if (this.#radiusTooltip) {
        this.#radiusTooltip.setAttribute("show", "true");
        this.#radiusTooltip.showPopup?.();
        this.#setRadiusTooltipAnchorAt(e.clientX, e.clientY);
      }
      if (this.#angleTooltip) {
        this.#angleTooltip.removeAttribute("show");
        this.#angleTooltip.hidePopup?.();
      }
      const prevAnglePointerEvents = this.#angleHandle?.style.pointerEvents;
      const angleHitArea = this.#angleHandle?.querySelector(
        ".fig-handle-hit-area",
      );
      const prevAngleHitPointerEvents = angleHitArea?.style.pointerEvents;
      if (this.#angleHandle) {
        this.#angleHandle.style.pointerEvents = "none";
      }
      if (angleHitArea) {
        angleHitArea.style.pointerEvents = "none";
      }

      const prevBodyCursor = document.body.style.cursor;
      circle.style.pointerEvents = "none";
      const rect0 = container.getBoundingClientRect();
      const cx0 = (this.#x / 100) * rect0.width;
      const cy0 = (this.#y / 100) * rect0.height;
      const initDeg =
        (Math.atan2(e.clientY - rect0.top - cy0, e.clientX - rect0.left - cx0) *
          180) /
        Math.PI;
      let lastCursorDeg = Math.round(initDeg);
      document.body.style.cursor = this.#resizeCursorSvg(lastCursorDeg);

      const onMove = (ev) => {
        const rect = container.getBoundingClientRect();
        const cx = (this.#x / 100) * rect.width;
        const cy = (this.#y / 100) * rect.height;
        const dx = ev.clientX - rect.left - cx;
        const dy = ev.clientY - rect.top - cy;
        const curDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
        if (curDeg !== lastCursorDeg) {
          lastCursorDeg = curDeg;
          document.body.style.cursor = this.#resizeCursorSvg(curDeg);
        }
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (this.#shouldSnap(ev.shiftKey)) {
          const step = this.#radiusIsPercent ? 5 : 10;
          if (this.#radiusIsPercent) {
            let pct = (dist / rect.width) * 100;
            pct = Math.round(pct / step) * step;
            dist = (pct / 100) * rect.width;
          } else {
            dist = Math.round(dist / step) * step;
          }
        }
        if (this.#radiusIsPercent) {
          this.#radius = this.#roundPosition(
            Math.max(0, (dist / rect.width) * 100),
          );
        } else {
          this.#radius = this.#roundPosition(Math.max(0, dist));
        }
        if (this.#radiusTooltip) {
          this.#radiusTooltip.setAttribute("text", this.#formatRadius());
          this.#setRadiusTooltipAnchorAt(ev.clientX, ev.clientY);
        }
        this.#syncPositions();
        this.#emitInput();
      };

      const gesture = this.#beginActiveGesture((commit) => {
        this.#isRadiusDragging = false;
        this.classList.remove("fig-canvas-control-ring-active");
        circle.style.pointerEvents = "";
        if (this.#angleHandle) {
          this.#angleHandle.style.pointerEvents = prevAnglePointerEvents ?? "";
        }
        if (angleHitArea) {
          angleHitArea.style.pointerEvents = prevAngleHitPointerEvents ?? "";
        }
        document.body.style.cursor = prevBodyCursor;
        if (this.#radiusTooltip) this.#radiusTooltip.removeAttribute("show");
        if (commit) {
          this.#syncValueAttribute();
          this.#emitChange();
        }
      });

      window.addEventListener("pointermove", onMove, { signal: gesture.signal });
      window.addEventListener("pointerup", () => gesture.finish(true), {
        signal: gesture.signal,
      });
      window.addEventListener("pointercancel", () => gesture.finish(false), {
        signal: gesture.signal,
      });
    };
    circle.addEventListener("pointerdown", onDown);
    this._radiusDragCleanup = () =>
      circle.removeEventListener("pointerdown", onDown);
  }

  #teardownRadiusDrag() {
    if (this._radiusDragCleanup) {
      this._radiusDragCleanup();
      this._radiusDragCleanup = null;
    }
  }

  #beginActiveGesture(onFinish) {
    this.#cancelActiveGesture();
    const controller = new AbortController();
    let finished = false;
    const finish = (commit = false) => {
      if (finished) return;
      finished = true;
      controller.abort();
      if (this.#activeGestureController === controller) {
        this.#activeGestureController = null;
        this.#activeGestureFinish = null;
      }
      onFinish(commit);
    };
    this.#activeGestureController = controller;
    this.#activeGestureFinish = finish;
    return { signal: controller.signal, finish };
  }

  #cancelActiveGesture() {
    this.#activeGestureFinish?.(false);
    this.#activeGestureController?.abort();
    this.#activeGestureController = null;
    this.#activeGestureFinish = null;
  }
}
figLabDefineElement("fig-canvas-control", FigCanvasControl);
/* Angle Input */
/**
 * A custom angle chooser input element.
 * @attr {number} value - The current angle of the handle in degrees.
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {boolean} text - Whether to display a text input for the angle value.
 * @attr {boolean} dial - Whether to display the circular dial control. Defaults to true.
 * @attr {number} adjacent - The adjacent value of the angle.
 * @attr {number} opposite - The opposite value of the angle.
 * @attr {boolean} rotations - Whether to display a rotation count (×N) when rotations > 1. Defaults to false.
 */
class FigInputAngle extends HTMLElement {
  // Private fields
  #adjacent;
  #opposite;
  #prevRawAngle = null;
  #boundHandleRawChange;
  #boundHandleMouseDown;
  #boundHandleTouchStart;
  #boundHandleKeyDown;
  #boundHandleKeyUp;
  #boundHandleAngleInput;
  #boundHandleDialKeyDown;
  #gestureController = null;
  #gestureCleanup = null;

  constructor() {
    super();

    this.angle = 0;
    this.#adjacent = 1;
    this.#opposite = 0;
    this.isDragging = false;
    this.isShiftHeld = false;
    this.handle = null;
    this.angleInput = null;
    this.plane = null;
    this.units = "°";
    this.min = null;
    this.max = null;
    this.dial = true;
    this.showRotations = false;
    this.rotationSpan = null;

    this.#boundHandleRawChange = this.#handleRawChange.bind(this);
    this.#boundHandleMouseDown = this.#handleMouseDown.bind(this);
    this.#boundHandleTouchStart = this.#handleTouchStart.bind(this);
    this.#boundHandleKeyDown = this.#handleKeyDown.bind(this);
    this.#boundHandleKeyUp = this.#handleKeyUp.bind(this);
    this.#boundHandleAngleInput = this.#handleAngleInput.bind(this);
    this.#boundHandleDialKeyDown = this.#handleDialKeyDown.bind(this);
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      this.precision = this.getAttribute("precision") || 1;
      this.precision = parseInt(this.precision);
      this.text = this.getAttribute("text") === "true";

      let rawUnits = this.getAttribute("units") || "°";
      if (rawUnits === "deg") rawUnits = "°";
      this.units = rawUnits;

      this.min = this.hasAttribute("min")
        ? Number(this.getAttribute("min"))
        : null;
      this.max = this.hasAttribute("max")
        ? Number(this.getAttribute("max"))
        : null;
      this.dial = this.#readBooleanAttribute("dial", true);
      this.showRotations = this.#readRotationsEnabled();

      this.#render();
      this.#setupListeners();

      this.#syncHandlePosition();
      if (this.text && this.angleInput) {
        this.angleInput.setAttribute(
          "value",
          this.angle.toFixed(this.precision),
        );
      }
    });
  }

  disconnectedCallback() {
    this.#cancelGesture();
    this.#cleanupListeners();
  }

  #render() {
    this.#cancelGesture();
    this.#cleanupListeners();
    const step = this.#getStepForUnit();
    const disabled = this.#isDisabled();
    const name =
      this.getAttribute("aria-label") || this.getAttribute("name") || "Angle";
    const ariaMin = this.min ?? this.#fromDegrees(0);
    const ariaMax = this.max ?? this.#fromDegrees(360);
    const children = [];

    if (this.dial) {
      children.push(
        figLabCreateElement(
          "div",
          {
            className: "fig-input-angle-plane",
            role: "slider",
            tabindex: disabled ? "-1" : "0",
            "aria-label": name,
            "aria-valuemin": ariaMin,
            "aria-valuemax": ariaMax,
            "aria-valuenow": this.angle,
            "aria-valuetext": `${this.angle.toFixed(this.precision)}${this.units}`,
            "aria-disabled": disabled ? "true" : null,
          },
          figLabCreateElement("div", {
            className: "fig-input-angle-handle",
          }),
        ),
      );
    }

    if (this.text) {
      children.push(
        figLabCreateElement(
          "fig-input-number",
          {
            name: "angle",
            step,
            value: this.angle,
            min: this.min,
            max: this.max,
            units: this.units,
            "aria-label": name,
            disabled,
          },
          this.showRotations
            ? figLabCreateElement("span", {
                slot: "append",
                className: "fig-input-angle-rotations",
              })
            : null,
        ),
      );
    }

    this.replaceChildren(...children);
  }

  #readBooleanAttribute(name, defaultValue = false) {
    const value = this.getAttribute(name);
    if (value === null) return defaultValue;
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "true") return true;
    if (normalized === "false") return false;
    return true;
  }

  #readRotationsEnabled() {
    if (this.hasAttribute("rotations")) {
      return this.#readBooleanAttribute("rotations", false);
    }
    if (this.hasAttribute("show-rotations")) {
      return this.#readBooleanAttribute("show-rotations", false);
    }
    return false;
  }

  #getRotationCount() {
    const degrees = Math.abs(this.#toDegrees(this.angle));
    return Math.floor(degrees / 360);
  }

  #isDisabled() {
    return figLabBooleanAttribute(this, "disabled");
  }

  #clampValue(value) {
    let next = Number(value);
    if (!Number.isFinite(next)) return this.angle;
    if (this.min !== null && Number.isFinite(this.min)) {
      next = Math.max(this.min, next);
    }
    if (this.max !== null && Number.isFinite(this.max)) {
      next = Math.min(this.max, next);
    }
    return next;
  }

  #setValue(value, { reflect = true } = {}) {
    const next = this.#clampValue(value);
    this.angle = next;
    this.#calculateAdjacentAndOpposite();
    if (reflect) {
      const serialized = String(next);
      if (this.getAttribute("value") !== serialized) {
        this.setAttribute("value", serialized);
      }
    }
    this.#syncHandlePosition();
    if (this.angleInput) {
      this.angleInput.value = next.toFixed(this.precision);
    }
    this.#syncDialState();
    this.#updateRotationDisplay();
  }

  #syncDialState() {
    if (!this.plane) return;
    this.plane.setAttribute("aria-valuenow", String(this.angle));
    this.plane.setAttribute(
      "aria-valuetext",
      `${this.angle.toFixed(this.precision)}${this.units}`,
    );
  }

  #updateRotationDisplay() {
    if (!this.rotationSpan) return;
    const rotations = this.#getRotationCount();
    if (rotations > 1) {
      this.rotationSpan.textContent = `\u00d7${rotations}`;
      this.rotationSpan.style.display = "";
    } else {
      this.rotationSpan.textContent = "";
      this.rotationSpan.style.display = "none";
    }
  }

  #getStepForUnit() {
    switch (this.units) {
      case "rad":
        return 0.01;
      case "turn":
        return 0.001;
      default:
        return 0.1;
    }
  }

  #toDegrees(value) {
    switch (this.units) {
      case "rad":
        return (value * 180) / Math.PI;
      case "turn":
        return value * 360;
      default:
        return value;
    }
  }

  #fromDegrees(degrees) {
    switch (this.units) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  #convertAngle(value, fromUnit, toUnit) {
    let degrees;
    switch (fromUnit) {
      case "rad":
        degrees = (value * 180) / Math.PI;
        break;
      case "turn":
        degrees = value * 360;
        break;
      default:
        degrees = value;
    }
    switch (toUnit) {
      case "rad":
        return (degrees * Math.PI) / 180;
      case "turn":
        return degrees / 360;
      default:
        return degrees;
    }
  }

  #setupListeners() {
    this.handle = this.querySelector(".fig-input-angle-handle");
    this.plane = this.querySelector(".fig-input-angle-plane");
    this.angleInput = this.querySelector("fig-input-number[name='angle']");
    this.rotationSpan = this.querySelector(".fig-input-angle-rotations");
    this.#updateRotationDisplay();
    this.plane?.addEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.addEventListener("touchstart", this.#boundHandleTouchStart);
    this.plane?.addEventListener("keydown", this.#boundHandleDialKeyDown);
    window.addEventListener("keydown", this.#boundHandleKeyDown);
    window.addEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.addEventListener("input", this.#boundHandleAngleInput);
      this.angleInput.addEventListener("change", this.#boundHandleAngleInput);
    }
    this.addEventListener("change", this.#boundHandleRawChange, true);
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.removeEventListener("touchstart", this.#boundHandleTouchStart);
    this.plane?.removeEventListener("keydown", this.#boundHandleDialKeyDown);
    window.removeEventListener("keydown", this.#boundHandleKeyDown);
    window.removeEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#boundHandleAngleInput);
      this.angleInput.removeEventListener("change", this.#boundHandleAngleInput);
    }
    this.removeEventListener("change", this.#boundHandleRawChange, true);
  }

  #handleRawChange(e) {
    if (!e.target?.matches?.("input")) return;
    const raw = e.target.value;
    const match = raw.match(/^(-?\d*\.?\d+)\s*(turn|rad|deg|°)$/i);
    if (match) {
      const num = parseFloat(match[1]);
      let fromUnit = match[2].toLowerCase();
      if (fromUnit === "deg") fromUnit = "°";
      if (fromUnit !== this.units) {
        const converted = this.#convertAngle(num, fromUnit, this.units);
        e.target.value = String(converted);
      }
    }
  }

  #handleAngleInput(e) {
    e.stopPropagation();
    if (this.#isDisabled()) return;
    this.#setValue(Number(e.target.value));
    if (e.type === "change") this.#emitChangeEvent();
    else this.#emitInputEvent();
  }

  #calculateAdjacentAndOpposite() {
    const degrees = this.#toDegrees(this.angle);
    const radians = (degrees * Math.PI) / 180;
    this.#adjacent = Math.cos(radians);
    this.#opposite = Math.sin(radians);
  }

  #snapToIncrement(angle) {
    if (!this.isShiftHeld) return angle;
    const increment = 45;
    return Math.round(angle / increment) * increment;
  }

  #getRawAngle(e) {
    const rect = this.plane.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  }

  #updateAngle(e) {
    let rawAngle = this.#getRawAngle(e);
    let normalizedAngle = ((rawAngle % 360) + 360) % 360;
    normalizedAngle = this.#snapToIncrement(normalizedAngle);

    const isBounded = this.min !== null || this.max !== null;

    if (isBounded) {
      this.angle = this.#clampValue(this.#fromDegrees(normalizedAngle));
    } else {
      if (this.#prevRawAngle === null) {
        this.#prevRawAngle = normalizedAngle;
        const currentDeg = this.#toDegrees(this.angle);
        const currentMod = ((currentDeg % 360) + 360) % 360;
        let delta = normalizedAngle - currentMod;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle = this.#clampValue(this.angle + this.#fromDegrees(delta));
      } else {
        let delta = normalizedAngle - this.#prevRawAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle = this.#clampValue(this.angle + this.#fromDegrees(delta));
        this.#prevRawAngle = normalizedAngle;
      }
    }

    this.#calculateAdjacentAndOpposite();
    this.setAttribute("value", String(this.angle));

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();
    this.#syncDialState();

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, angle: this.angle },
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value, angle: this.angle },
      }),
    );
  }

  #syncHandlePosition() {
    if (this.handle) {
      const degrees = this.#toDegrees(this.angle);
      const radians = (degrees * Math.PI) / 180;
      const radius = this.plane.offsetWidth / 2 - this.handle.offsetWidth / 2;
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      this.handle.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  #handleMouseDown(e) {
    if (this.#isDisabled() || e.button !== 0) return;
    this.#cancelGesture();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      controller.abort();
      if (this.#gestureController === controller) {
        this.#gestureController = null;
        this.#gestureCleanup = null;
      }
      if (commit) this.#emitChangeEvent();
    };
    this.#gestureController = controller;
    this.#gestureCleanup = finish;

    window.addEventListener("mousemove", handleMouseMove, {
      signal: controller.signal,
    });
    window.addEventListener("mouseup", () => finish(true), {
      signal: controller.signal,
    });
    window.addEventListener("blur", () => finish(false), {
      signal: controller.signal,
    });
  }

  #handleTouchStart(e) {
    if (this.#isDisabled()) return;
    e.preventDefault();
    this.#cancelGesture();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const controller = new AbortController();
    const finish = (commit = false) => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      controller.abort();
      if (this.#gestureController === controller) {
        this.#gestureController = null;
        this.#gestureCleanup = null;
      }
      if (commit) this.#emitChangeEvent();
    };
    this.#gestureController = controller;
    this.#gestureCleanup = finish;

    window.addEventListener("touchmove", handleTouchMove, {
      signal: controller.signal,
    });
    window.addEventListener("touchend", () => finish(true), {
      signal: controller.signal,
    });
    window.addEventListener("touchcancel", () => finish(false), {
      signal: controller.signal,
    });
  }

  #cancelGesture() {
    this.#gestureCleanup?.(false);
    this.#gestureController?.abort();
    this.#gestureController = null;
    this.#gestureCleanup = null;
    this.isDragging = false;
    this.#prevRawAngle = null;
    this.plane?.classList.remove("dragging");
  }

  #handleDialKeyDown(e) {
    if (this.#isDisabled()) return;
    const step = this.#getStepForUnit() * (e.shiftKey ? 10 : 1);
    let next = this.angle;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next -= step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next += step;
    else if (e.key === "Home") next = this.min ?? this.#fromDegrees(0);
    else if (e.key === "End") next = this.max ?? this.#fromDegrees(360);
    else return;
    e.preventDefault();
    e.stopPropagation();
    this.#setValue(next);
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }

  focus() {
    this.plane?.focus();
  }

  static get observedAttributes() {
    return [
      "value",
      "precision",
      "text",
      "min",
      "max",
      "units",
      "dial",
      "rotations",
      "show-rotations",
      "disabled",
      "aria-label",
      "name",
    ];
  }

  get value() {
    return this.angle;
  }

  get adjacent() {
    return this.#adjacent;
  }

  get opposite() {
    return this.#opposite;
  }

  set value(value) {
    if (isNaN(value)) {
      console.error("Invalid value: must be a number.");
      return;
    }
    this.#setValue(Number(value));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (this.isDragging) break;
        if (newValue !== null) this.#setValue(Number(newValue), { reflect: false });
        break;
      case "precision":
        this.precision = parseInt(newValue);
        break;
      case "text":
        if (newValue !== oldValue) {
          this.text = newValue?.toLowerCase() === "true";
          if (this.isConnected) {
            this.#render();
            this.#setupListeners();
            this.#syncHandlePosition();
          }
        }
        break;
      case "dial":
        this.dial = this.#readBooleanAttribute("dial", true);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "units": {
        let units = newValue || "°";
        if (units === "deg") units = "°";
        this.units = units;
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      }
      case "min":
        this.min = newValue !== null ? Number(newValue) : null;
        this.#setValue(this.angle);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "max":
        this.max = newValue !== null ? Number(newValue) : null;
        this.#setValue(this.angle);
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "disabled":
        this.#cancelGesture();
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "aria-label":
      case "name":
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "rotations":
      case "show-rotations":
        this.showRotations = this.#readRotationsEnabled();
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
    }
  }
}
figLabDefineElement("fig-input-angle", FigInputAngle);

/* Reorder wrapper */
class FigReorder extends HTMLElement {
  static observedAttributes = ["axis", "handle", "disabled"];

  static #DRAG_THRESHOLD = 6;

  static #NESTED_DRAG_SELECTORS = [
    '[draggable]:not([draggable="false"])',
    'img:not([draggable="false"])',
    'a[href]:not([draggable="false"])',
    'input[type="range"]',
    "fig-handle",
    "fig-slider",
    "fig-input-number",
    "fig-input-gradient",
    "fig-easing-curve",
    "fig-input-angle",
    "fig-input-wheel",
    "fig-joystick",
    "fig-origin-grid",
    "fig-chooser",
    "fig-canvas-control",
  ];

  #childObserver = null;
  #bindings = new Map();
  #drag = null;
  #indicator = null;
  #liveRegion = null;

  connectedCallback() {
    this.style.display = "contents";
    if (!this.hasAttribute("role")) this.setAttribute("role", "list");
    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", "Reorderable list");
    }
    this.#ensureLiveRegion();
    this.#syncChildren();
    this.#childObserver = new MutationObserver(() => this.#syncChildren());
    this.#childObserver.observe(this, { childList: true });
  }

  disconnectedCallback() {
    this.#childObserver?.disconnect();
    this.#childObserver = null;
    this.#unbindAll();
    this.#cancelDrag();
    this.#removeIndicator();
    this.#liveRegion?.remove();
    this.#liveRegion = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      if (this.#disabled) this.#cancelDrag();
      this.#syncChildren();
    }
  }

  get #disabled() {
    return (
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false"
    );
  }

  get #axis() {
    const value = (this.getAttribute("axis") || "vertical").trim().toLowerCase();
    return value === "horizontal" ? "horizontal" : "vertical";
  }

  get #handleSelector() {
    return (this.getAttribute("handle") || "").trim();
  }

  #getElementChildren() {
    return [...this.children].filter(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        !node.hasAttribute("data-reorder-live"),
    );
  }

  #syncChildren() {
    const children = this.#getElementChildren();
    const childSet = new Set(children);

    for (const [child, binding] of this.#bindings) {
      if (!childSet.has(child)) {
        binding.target.removeEventListener(
          "pointerdown",
          binding.onPointerDown,
          true,
        );
        binding.target.removeEventListener("keydown", binding.onKeyDown);
        this.#restoreKeyboardAttrs(binding);
        this.#bindings.delete(child);
      }
    }

    this.#clearHandleMarks(children);
    this.#clearReorderItemMarks(children);

    if (this.#disabled || children.length < 2) {
      this.#unbindAll();
      return;
    }

    for (const child of children) {
      const target = this.#getDragTarget(child);
      const existing = this.#bindings.get(child);
      if (existing && existing.target === target) continue;
      if (existing) {
        existing.target.removeEventListener(
          "pointerdown",
          existing.onPointerDown,
          true,
        );
        this.#bindings.delete(child);
      }
      if (!target) continue;
      this.#bindChild(child, target);
    }

    this.#markHandles(children);
    this.#markReorderItems(children);
  }

  #clearReorderItemMarks(children) {
    for (const child of children) {
      child.removeAttribute("data-reorder-item");
      if (child.hasAttribute("data-reorder-generated-role")) {
        child.removeAttribute("role");
        child.removeAttribute("data-reorder-generated-role");
      }
    }
  }

  #markReorderItems(children) {
    for (const child of children) {
      child.setAttribute("data-reorder-item", "");
      if (!child.hasAttribute("role")) {
        child.setAttribute("role", "listitem");
        child.setAttribute("data-reorder-generated-role", "");
      }
    }
  }

  #clearHandleMarks(children) {
    for (const child of children) {
      child
        .querySelectorAll("[data-reorder-handle]")
        .forEach((node) => {
          node.removeAttribute("data-reorder-handle");
          node.removeAttribute("aria-roledescription");
        });
    }
  }

  #markHandles(children) {
    if (!this.#handleSelector) return;
    for (const child of children) {
      const handle = child.querySelector(this.#handleSelector);
      if (handle) {
        handle.setAttribute("data-reorder-handle", "");
        handle.setAttribute("aria-roledescription", "reorder handle");
      }
    }
  }

  #getDragTarget(child) {
    if (this.#handleSelector) {
      return child.querySelector(this.#handleSelector);
    }
    return child;
  }

  #bindChild(child, target) {
    const onPointerDown = (event) => {
      if (this.#disabled || this.#getElementChildren().length < 2) return;
      if (event.button !== 0) return;
      if (
        !this.#handleSelector &&
        this.#isNestedDragTarget(event.target, child)
      ) {
        return;
      }
      this.#startPendingDrag(event, child, target);
    };
    const originalTabIndex = target.getAttribute("tabindex");
    const originalAriaLabel = target.getAttribute("aria-label");
    const originalRole = target.getAttribute("role");
    const itemName =
      child.getAttribute("aria-label") ||
      child.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
      "item";
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", `Move ${itemName}`);
    if (target !== child && !target.hasAttribute("role")) {
      target.setAttribute("role", "button");
    }
    const onKeyDown = (event) => {
      if (this.#disabled) return;
      const horizontal = this.#axis === "horizontal";
      const previousKey = horizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = horizontal ? "ArrowRight" : "ArrowDown";
      if (
        event.key !== previousKey &&
        event.key !== nextKey &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const items = this.#getElementChildren();
      const oldIndex = items.indexOf(child);
      let newIndex = oldIndex;
      if (event.key === previousKey) newIndex = Math.max(0, oldIndex - 1);
      else if (event.key === nextKey) {
        newIndex = Math.min(items.length - 1, oldIndex + 1);
      } else if (event.key === "Home") newIndex = 0;
      else if (event.key === "End") newIndex = items.length - 1;
      if (newIndex === oldIndex) {
        this.#announce(`${itemName}, position ${oldIndex + 1} of ${items.length}`);
        return;
      }
      this.#moveItemToFinalIndex(child, newIndex);
      this.#syncChildren();
      this.#getDragTarget(child)?.focus();
      this.dispatchEvent(
        new CustomEvent("reorder", {
          bubbles: true,
          detail: { oldIndex, newIndex, item: child },
        }),
      );
      this.#announce(`${itemName}, position ${newIndex + 1} of ${items.length}`);
    };

    target.addEventListener("pointerdown", onPointerDown, true);
    target.addEventListener("keydown", onKeyDown);
    this.#bindings.set(child, {
      target,
      onPointerDown,
      onKeyDown,
      originalTabIndex,
      originalAriaLabel,
      originalRole,
    });
  }

  #restoreKeyboardAttrs(binding) {
    const { target, originalTabIndex, originalAriaLabel, originalRole } = binding;
    if (originalTabIndex === null) target.removeAttribute("tabindex");
    else target.setAttribute("tabindex", originalTabIndex);
    if (originalAriaLabel === null) target.removeAttribute("aria-label");
    else target.setAttribute("aria-label", originalAriaLabel);
    if (originalRole === null) target.removeAttribute("role");
    else target.setAttribute("role", originalRole);
  }

  #ensureLiveRegion() {
    if (this.#liveRegion?.isConnected) return;
    const region = document.createElement("span");
    region.setAttribute("data-reorder-live", "");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    Object.assign(region.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    this.#liveRegion = region;
    document.body.appendChild(region);
  }

  #announce(message) {
    if (!this.#liveRegion) return;
    this.#liveRegion.textContent = "";
    requestAnimationFrame(() => {
      if (this.#liveRegion) this.#liveRegion.textContent = message;
    });
  }

  #isNestedDragTarget(target, child) {
    let node = target;
    while (node && node !== child) {
      if (node instanceof Element) {
        for (const selector of FigReorder.#NESTED_DRAG_SELECTORS) {
          if (node.matches(selector)) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  static #DRAGGING_BODY_CLASS = "fig-reorder-dragging";

  static #setDocumentDragging(active) {
    document.body.classList.toggle(FigReorder.#DRAGGING_BODY_CLASS, active);
  }

  #startPendingDrag(event, item, target) {
    this.#cancelDrag();

    const state = {
      item,
      target,
      pointerId: event.pointerId,
      oldIndex: this.#getElementChildren().indexOf(item),
      targetIndex: this.#getElementChildren().indexOf(item),
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      onMove: null,
      onUp: null,
      onKeyDown: null,
    };

    state.onMove = (moveEvent) => {
      if (moveEvent.pointerId !== state.pointerId) return;

      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;

      if (!state.active) {
        if (dx * dx + dy * dy < FigReorder.#DRAG_THRESHOLD * FigReorder.#DRAG_THRESHOLD) {
          return;
        }
        state.active = true;
        event.preventDefault();
        event.stopPropagation();
        item.classList.add("dragging");
        FigReorder.#setDocumentDragging(true);
        try {
          target.setPointerCapture(state.pointerId);
        } catch {}
      }

      moveEvent.preventDefault();
      const pointer =
        this.#axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const index = this.#getInsertIndex(pointer);
      state.targetIndex = index;
      this.#updateIndicator(index, item);
    };

    state.onKeyDown = (keyEvent) => {
      if (keyEvent.key !== "Escape" || !state.active) return;
      keyEvent.preventDefault();
      this.#finishDrag(state, true);
    };

    state.onUp = (upEvent) => {
      if (upEvent.pointerId !== state.pointerId) return;
      this.#finishDrag(state, upEvent.type === "pointercancel");
    };

    this.#drag = state;
    window.addEventListener("pointermove", state.onMove);
    window.addEventListener("pointerup", state.onUp);
    window.addEventListener("pointercancel", state.onUp);
    window.addEventListener("keydown", state.onKeyDown);
  }

  #getInsertIndex(pointer) {
    const items = this.#getElementChildren();
    const horizontal = this.#axis === "horizontal";

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midpoint = horizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      if (pointer < midpoint) return i;
    }

    return items.length;
  }

  #shouldShowIndicator(item, index) {
    const items = this.#getElementChildren();
    const currentIndex = items.indexOf(item);
    if (currentIndex === -1) return false;

    const clamped = Math.max(0, Math.min(index, items.length));

    if (index === currentIndex) return false;

    // Hide only the redundant bottom line when the dragged item is already last.
    if (clamped >= items.length && currentIndex === items.length - 1) {
      return false;
    }

    return true;
  }

  #getReorderBounds(items) {
    if (!items.length) return null;

    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
    }

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  #ensureIndicator() {
    if (this.#indicator) return this.#indicator;

    const indicator = document.createElement("div");
    indicator.className = "fig-reorder-indicator";
    indicator.setAttribute("data-axis", this.#axis);
    document.body.appendChild(indicator);
    this.#indicator = indicator;
    return indicator;
  }

  #updateIndicator(index, item) {
    const items = this.#getElementChildren();
    if (!this.#shouldShowIndicator(item, index)) {
      this.#removeIndicator();
      return;
    }

    const bounds = this.#getReorderBounds(items);
    if (!bounds) {
      this.#removeIndicator();
      return;
    }

    const indicator = this.#ensureIndicator();
    indicator.setAttribute("data-axis", this.#axis);

    if (this.#axis === "horizontal") {
      let x;
      if (index <= 0) {
        x = items[0].getBoundingClientRect().left;
      } else if (index >= items.length) {
        x = items[items.length - 1].getBoundingClientRect().right;
      } else {
        x = items[index].getBoundingClientRect().left;
      }

      indicator.style.left = `${x - 1}px`;
      indicator.style.top = `${bounds.top}px`;
      indicator.style.width = "2px";
      indicator.style.height = `${bounds.height}px`;
      return;
    }

    let y;
    if (index <= 0) {
      y = items[0].getBoundingClientRect().top;
    } else if (index >= items.length) {
      y = items[items.length - 1].getBoundingClientRect().bottom;
    } else {
      y = items[index].getBoundingClientRect().top;
    }

    indicator.style.left = `${bounds.left}px`;
    indicator.style.top = `${y - 1}px`;
    indicator.style.width = `${bounds.width}px`;
    indicator.style.height = "2px";
  }

  #removeIndicator() {
    this.#indicator?.remove();
    this.#indicator = null;
  }

  #moveItemToIndex(item, index) {
    const items = this.#getElementChildren();
    const clamped = Math.max(0, Math.min(index, items.length));

    if (clamped >= items.length) {
      if (items[items.length - 1] !== item) this.appendChild(item);
      return;
    }

    const ref = items[clamped];
    if (ref !== item) this.insertBefore(item, ref);
  }

  #moveItemToFinalIndex(item, newIndex) {
    const items = this.#getElementChildren().filter((candidate) => candidate !== item);
    const ref = items[newIndex] ?? null;
    if (ref) this.insertBefore(item, ref);
    else this.appendChild(item);
  }

  #finishDrag(state, revert) {
    const { item, oldIndex, active, onMove, onUp, onKeyDown } = state;

    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKeyDown);

    if (active) {
      if (!revert) {
        this.#moveItemToIndex(item, state.targetIndex);
        const newIndex = this.#getElementChildren().indexOf(item);
        if (newIndex !== -1 && newIndex !== oldIndex) {
          this.dispatchEvent(
            new CustomEvent("reorder", {
              bubbles: true,
              detail: { oldIndex, newIndex, item },
            }),
          );
          const name =
            item.getAttribute("aria-label") ||
            item.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
            "item";
          this.#announce(
            `${name}, position ${newIndex + 1} of ${this.#getElementChildren().length}`,
          );
        }
      }
    }

    item.classList.remove("dragging");
    FigReorder.#setDocumentDragging(false);
    this.#removeIndicator();
    if (this.#drag === state) this.#drag = null;
  }

  #unbindAll() {
    for (const [, binding] of this.#bindings) {
      binding.target.removeEventListener(
        "pointerdown",
        binding.onPointerDown,
        true,
      );
      binding.target.removeEventListener("keydown", binding.onKeyDown);
      this.#restoreKeyboardAttrs(binding);
    }
    this.#bindings.clear();
  }

  #cancelDrag() {
    if (!this.#drag) return;
    this.#finishDrag(this.#drag, true);
  }
}

figLabDefineElement("fig-reorder", FigReorder);
