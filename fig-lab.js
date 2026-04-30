/**
 * FigUI3 Lab — Experimental components
 *
 * These components are unstable and may change or be removed without notice.
 * Import alongside fig.js for opt-in access:
 *
 *   <script src="fig.js"></script>
 *   <script src="fig-lab.js"></script>
 */

/* Field + Slider wrapper */
class FigFieldSlider extends HTMLElement {
  #field = null;
  #label = null;
  #slider = null;
  #observer = null;
  #managedSliderAttrs = new Set();
  #steppersSyncFrame = 0;
  #boundHandleSliderInput = null;
  #boundHandleSliderChange = null;
  #ignoredSliderAttrs = new Set(["variant", "color", "text", "full"]);

  static get observedAttributes() {
    return ["label", "direction"];
  }

  connectedCallback() {
    if (!this.#field) {
      this.#initialize();
    }

    this.#syncField();
    this.#syncSliderAttributes();
    this.#bindSliderEvents();

    if (!this.#observer) {
      this.#observer = new MutationObserver((mutations) => {
        let syncField = false;
        let syncSlider = false;

        for (const mutation of mutations) {
          if (mutation.type === "attributes") {
            if (
              mutation.attributeName &&
              this.#ignoredSliderAttrs.has(mutation.attributeName)
            ) {
              continue;
            }
            if (
              mutation.attributeName === "label" ||
              mutation.attributeName === "direction"
            ) {
              syncField = true;
            } else {
              syncSlider = true;
            }
          }
        }

        if (syncField) this.#syncField();
        if (syncSlider) this.#syncSliderAttributes();
      });
    }

    this.#observer.observe(this, { attributes: true });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    if (this.#steppersSyncFrame) {
      cancelAnimationFrame(this.#steppersSyncFrame);
      this.#steppersSyncFrame = 0;
    }
    this.#unbindSliderEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#field) return;
    if (name === "label" || name === "direction") {
      this.#syncField();
    }
  }

  #initialize() {
    const initialChildren = Array.from(this.childNodes).filter((node) => {
      return (
        node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())
      );
    });

    const field = document.createElement("fig-field");
    const label = document.createElement("label");
    const slider = document.createElement("fig-slider");
    slider.setAttribute("text", "true");
    for (const attrName of this.#getForwardedSliderAttrNames()) {
      const value = this.getAttribute(attrName);
      slider.setAttribute(attrName, value ?? "");
    }

    field.append(label, slider);

    this.#field = field;
    this.#label = label;
    this.#slider = slider;

    this.replaceChildren(field);

    for (const node of initialChildren) {
      this.#slider.appendChild(node);
    }
  }

  #syncField() {
    if (!this.#field || !this.#label) return;
    const hasLabelAttr = this.hasAttribute("label");
    const rawLabel = this.getAttribute("label");
    const isBlankLabel = hasLabelAttr && (rawLabel ?? "").trim() === "";

    if (isBlankLabel) {
      if (this.#label.parentElement === this.#field) {
        this.#label.remove();
      }
    } else {
      this.#label.textContent = hasLabelAttr ? (rawLabel ?? "") : "Label";
      if (this.#label.parentElement !== this.#field) {
        this.#field.prepend(this.#label);
      }
    }

    this.#field.setAttribute(
      "direction",
      this.getAttribute("direction") || "horizontal",
    );
  }

  #syncSliderAttributes() {
    if (!this.#slider) return;
    const hostAttrs = this.#getForwardedSliderAttrNames();

    const nextManaged = new Set(hostAttrs.filter((name) => name !== "text"));

    for (const attrName of this.#managedSliderAttrs) {
      if (!nextManaged.has(attrName)) {
        this.#slider.removeAttribute(attrName);
      }
    }

    for (const attrName of hostAttrs) {
      if (attrName === "text") continue;
      const value = this.getAttribute(attrName);
      this.#slider.setAttribute(attrName, value ?? "");
    }

    this.#slider.removeAttribute("variant");
    this.#slider.removeAttribute("color");
    this.#slider.removeAttribute("transform");
    this.#slider.removeAttribute("full");
    this.#slider.setAttribute("text", "true");

    const sliderType = (this.getAttribute("type") || "range").toLowerCase();
    if (sliderType === "delta" || sliderType === "stepper") {
      this.#slider.setAttribute(
        "default",
        this.getAttribute("default") ?? "50",
      );
    } else if (!this.hasAttribute("default")) {
      this.#slider.removeAttribute("default");
    }
    if (sliderType === "stepper") {
      this.#slider.setAttribute("step", this.getAttribute("step") ?? "10");
    } else if (!this.hasAttribute("step")) {
      this.#slider.removeAttribute("step");
    }
    if (sliderType === "opacity") {
      this.#slider.style.setProperty(
        "--color",
        "var(--figma-color-bg-tertiary)",
      );
    } else {
      this.#slider.style.removeProperty("--color");
    }

    this.#managedSliderAttrs = nextManaged;
    this.#queueSteppersSync();
  }

  #getForwardedSliderAttrNames() {
    const reserved = new Set([
      "label",
      "direction",
      "oninput",
      "onchange",
      "steppers",
    ]);
    return this.getAttributeNames().filter(
      (name) => !reserved.has(name) && !this.#ignoredSliderAttrs.has(name),
    );
  }

  #queueSteppersSync() {
    if (this.#steppersSyncFrame) {
      cancelAnimationFrame(this.#steppersSyncFrame);
    }
    this.#steppersSyncFrame = requestAnimationFrame(() => {
      this.#steppersSyncFrame = 0;
      this.#syncSteppersToNumberInput();
    });
  }

  #syncSteppersToNumberInput() {
    if (!this.#slider) return;
    const numberInput = this.#slider.querySelector("fig-input-number");
    if (!numberInput) return;

    const hasSteppers =
      this.hasAttribute("steppers") &&
      this.getAttribute("steppers") !== "false";
    if (!hasSteppers) {
      numberInput.removeAttribute("steppers");
      return;
    }

    const steppersValue = this.getAttribute("steppers");
    numberInput.setAttribute("steppers", steppersValue ?? "");
  }

  #bindSliderEvents() {
    if (!this.#slider) return;
    if (!this.#boundHandleSliderInput) {
      this.#boundHandleSliderInput = this.#forwardSliderEvent.bind(
        this,
        "input",
      );
    }
    if (!this.#boundHandleSliderChange) {
      this.#boundHandleSliderChange = this.#forwardSliderEvent.bind(
        this,
        "change",
      );
    }
    this.#slider.addEventListener("input", this.#boundHandleSliderInput);
    this.#slider.addEventListener("change", this.#boundHandleSliderChange);
  }

  #unbindSliderEvents() {
    if (!this.#slider) return;
    if (this.#boundHandleSliderInput) {
      this.#slider.removeEventListener("input", this.#boundHandleSliderInput);
    }
    if (this.#boundHandleSliderChange) {
      this.#slider.removeEventListener("change", this.#boundHandleSliderChange);
    }
  }

  #forwardSliderEvent(type, event) {
    event.stopPropagation();
    const detail =
      event instanceof CustomEvent && event.detail !== undefined
        ? event.detail
        : this.#slider?.value;
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }
}
customElements.define("fig-field-slider", FigFieldSlider);

/* Canvas Control */
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
  #prevBodyCursor = "";

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
    return `${Math.round(this.#x)}%, ${Math.round(this.#y)}%`;
  }

  get #secondTipText() {
    const name = this.getAttribute("name");
    if (name) {
      const parts = name.split(",");
      if (parts.length > 1) return parts[1].trim();
    }
    return `${Math.round(this.#x2)}%, ${Math.round(this.#y2)}%`;
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
    if (this.#radiusIsPercent) return `Radius ${Math.round(this.#radius)}%`;
    return `Radius ${Math.round(this.#radius)}`;
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
  }

  disconnectedCallback() {
    this.#teardownRadiusDrag();
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
      this.#parseValue();
      this.#render();
    }
    if (name === "color" && this.#pointHandle) {
      if (newVal) this.#pointHandle.setAttribute("color", newVal);
      else this.#pointHandle.removeAttribute("color");
    }
    if (name === "disabled") {
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
      if (typeof v.x === "number") this.#x = v.x;
      if (typeof v.y === "number") this.#y = v.y;
      if (v.radius !== undefined) {
        const rs = String(v.radius);
        if (rs.endsWith("%")) {
          this.#radiusIsPercent = true;
          this.#radius = parseFloat(rs);
        } else {
          this.#radiusIsPercent = false;
          this.#radius = parseFloat(rs);
        }
        if (!Number.isFinite(this.#radius)) this.#radius = 0;
      }
      if (typeof v.angle === "number") this.#angle = v.angle;
      if (typeof v.x2 === "number") this.#x2 = v.x2;
      if (typeof v.y2 === "number") this.#y2 = v.y2;
    } catch {
      /* ignore */
    }
  }

  get value() {
    const v = { x: this.#x, y: this.#y };
    if (this.#type === "color") {
      const color =
        this.getAttribute("color") || this.#pointHandle?.getAttribute("color");
      if (color) v.color = color;
    }
    if (this.#hasRadius) {
      v.radius = this.#radiusIsPercent ? `${this.#radius}%` : this.#radius;
    }
    if (this.#hasAngle) v.angle = this.#angle;
    if (this.#hasSecondPoint) {
      v.x2 = this.#x2;
      v.y2 = this.#y2;
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
    this.innerHTML = "";
    this.#pointHandle = null;
    this.#secondHandle = null;
    this.#angleHandle = null;
    this.#radiusSvg = null;
    this.#angleSvg = null;
    this.#pointTooltip = null;
    this.#secondTooltip = null;
    this.#radiusTooltip = null;
    this.#angleTooltip = null;

    const disabled = this.hasAttribute("disabled");
    const type = this.#type;
    const tooltips = this.#tooltipsEnabled;

    const handleSurface = this.#handleDragSurface;

    const handle = document.createElement("fig-handle");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("value", `${this.#x}% ${this.#y}%`);
    if (disabled) handle.setAttribute("disabled", "");
    if (type === "color") {
      handle.setAttribute("type", "color");
      const color = this.getAttribute("color");
      if (color) handle.setAttribute("color", color);
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
      tip.setAttribute("theme", "brand");
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

    this.#setupEventListeners();
    requestAnimationFrame(() => this.#syncPositions());
  }

  #createRadiusSvg() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.classList.add("fig-canvas-control-radius");
    svg.setAttribute("overflow", "visible");
    const hitCircle = document.createElementNS(ns, "circle");
    hitCircle.classList.add("fig-canvas-control-radius-hit");
    svg.appendChild(hitCircle);
    const circle = document.createElementNS(ns, "circle");
    svg.appendChild(circle);
    this.#radiusSvg = svg;

    if (this.#tooltipsEnabled) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "brand");
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
    const line = document.createElementNS(ns, "line");
    line.classList.add("fig-canvas-control-angle-line");
    svg.appendChild(line);
    this.#angleSvg = svg;
    this.appendChild(svg);
  }

  #createAngleHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("size", "small");
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    if (disabled) handle.setAttribute("disabled", "");
    this.#angleHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "brand");
      tip.setAttribute("pointer", "false");
      tip.setAttribute("text", `${Math.round(this.#angle)}°`);
      tip.appendChild(handle);
      this.appendChild(tip);
      this.#angleTooltip = tip;
    } else {
      this.appendChild(handle);
    }
  }

  #createSecondHandle(disabled, tooltips, handleSurface) {
    const handle = document.createElement("fig-handle");
    handle.setAttribute("drag", "true");
    handle.setAttribute("drag-surface", handleSurface);
    handle.setAttribute("drag-axes", "x,y");
    handle.setAttribute("drag-snapping", this.#snappingMode);
    handle.setAttribute("hit-area", "12 circle");
    handle.setAttribute("hit-area-mode", "delegate");
    handle.setAttribute("value", `${this.#x2}% ${this.#y2}%`);
    if (disabled) handle.setAttribute("disabled", "");
    this.#secondHandle = handle;

    if (tooltips) {
      const tip = document.createElement("fig-tooltip");
      tip.setAttribute("action", "manual");
      tip.setAttribute("theme", "brand");
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

  #syncAngleCursor() {
    if (!this.#angleHandle || !this.#hasAngle) return;
    const hitArea = this.#angleHandle.querySelector(".fig-handle-hit-area");
    if (!hitArea) return;
    hitArea.style.cursor = this.#rotateCursorSvg(this.#angle);
  }

  #pointPointLineDeg() {
    return (Math.atan2(this.#y2 - this.#y, this.#x2 - this.#x) * 180) / Math.PI;
  }

  #syncPointPointCursors() {
    if (!this.#hasSecondPoint) return;
    const deg = this.#pointPointLineDeg();
    const setHitCursor = (handle, rotateDeg) => {
      if (!handle) return;
      const hitArea = handle.querySelector(".fig-handle-hit-area");
      if (hitArea) hitArea.style.cursor = this.#rotateCursorSvg(rotateDeg);
    };
    setHitCursor(this.#pointHandle, deg + 180);
    setHitCursor(this.#secondHandle, deg);
  }

  #positionHandle(handle, xPct, yPct, rect) {
    const hw = handle.offsetWidth / 2;
    const hh = handle.offsetHeight / 2;
    handle.style.left = `${(xPct / 100) * rect.width - hw}px`;
    handle.style.top = `${(yPct / 100) * rect.height - hh}px`;
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
      const line = svg.querySelector("line");
      if (line) {
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

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", { bubbles: true, detail: this.value }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, detail: this.value }),
    );
  }

  #syncValueAttribute() {
    this.setAttribute("value", JSON.stringify(this.value));
  }

  #setupEventListeners() {
    if (!this.#pointHandle) return;

    this.#pointHandle.addEventListener("input", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute("color", e.detail.color);
        this.#emitInput();
        return;
      }
      if (!this.#isDragging && this.#hasSecondPoint) {
        this.#prevBodyCursor = document.body.style.cursor;
      }
      this.#isDragging = true;
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = Math.round(Math.max(0, Math.min(100, px * 100)));
      this.#y = Math.round(Math.max(0, Math.min(100, py * 100)));
      if (this.#pointTooltip && this.#type !== "color") {
        this.#pointTooltip.setAttribute("text", this.#pointTipText);
        this.#pointTooltip.setAttribute("show", "true");
        this.#pointTooltip.showPopup?.();
      }
      this.#syncPositions();
      if (this.#hasSecondPoint) {
        document.body.style.cursor = this.#resizeCursorSvg(
          this.#pointPointLineDeg(),
        );
      }
      this.#emitInput();
    });

    this.#pointHandle.addEventListener("change", (e) => {
      e.stopPropagation();
      if (e.detail?.color) {
        this.setAttribute("color", e.detail.color);
        this.#emitChange();
        return;
      }
      const px = e.detail?.px ?? this.#x / 100;
      const py = e.detail?.py ?? this.#y / 100;
      this.#x = Math.round(Math.max(0, Math.min(100, px * 100)));
      this.#y = Math.round(Math.max(0, Math.min(100, py * 100)));
      if (this.#pointTooltip && this.#type !== "color")
        this.#pointTooltip.removeAttribute("show");
      if (this.#hasSecondPoint) {
        document.body.style.cursor = this.#prevBodyCursor ?? "";
      }
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
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        const container = this.#container;
        if (!container) return;
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
        this.#angle = angle;

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
          this.#radius = Math.max(0, (dist / rect.width) * 100);
        } else {
          this.#radius = Math.max(0, dist);
        }

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute(
            "text",
            `Angle ${Math.round(this.#angle)}°`,
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
        this.#isAngleDragging = true;
        this.classList.add("fig-canvas-control-ring-active");
        const container = this.#container;
        if (!container) return;

        if (this.#angleTooltip) {
          this.#angleTooltip.setAttribute("show", "true");
          this.#angleTooltip.showPopup?.();
        }

        const prevBodyCursor = document.body.style.cursor;
        let lastCursorDeg = Math.round(this.#angle);
        document.body.style.cursor = this.#rotateCursorSvg(lastCursorDeg);

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
          this.#angle = angle;
          if (this.#angleTooltip)
            this.#angleTooltip.setAttribute(
              "text",
              `Angle ${Math.round(angle)}°`,
            );
          this.#syncPositions();
          const curDeg = Math.round(angle);
          if (curDeg !== lastCursorDeg) {
            lastCursorDeg = curDeg;
            document.body.style.cursor = this.#rotateCursorSvg(curDeg);
          }
          this.#emitInput();
        };

        const onUp = () => {
          this.#isAngleDragging = false;
          this.classList.remove("fig-canvas-control-ring-active");
          document.body.style.cursor = prevBodyCursor;
          if (this.#angleTooltip) this.#angleTooltip.removeAttribute("show");
          this.#syncValueAttribute();
          this.#emitChange();
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }

    if (this.#secondHandle) {
      this.#secondHandle.addEventListener("input", (e) => {
        e.stopPropagation();
        if (!this.#isSecondDragging) {
          this.#prevBodyCursor = document.body.style.cursor;
        }
        this.#isSecondDragging = true;
        const px = e.detail?.px ?? this.#x2 / 100;
        const py = e.detail?.py ?? this.#y2 / 100;
        this.#x2 = Math.round(Math.max(0, Math.min(100, px * 100)));
        this.#y2 = Math.round(Math.max(0, Math.min(100, py * 100)));
        if (this.#secondTooltip) {
          this.#secondTooltip.setAttribute("text", this.#secondTipText);
          this.#secondTooltip.setAttribute("show", "true");
          this.#secondTooltip.showPopup?.();
        }
        this.#syncPositions();
        document.body.style.cursor = this.#resizeCursorSvg(
          this.#pointPointLineDeg(),
        );
        this.#emitInput();
      });

      this.#secondHandle.addEventListener("change", (e) => {
        e.stopPropagation();
        document.body.style.cursor = this.#prevBodyCursor ?? "";
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
      this.#isDragging = true;
      const container = this.#container;
      if (!container) return;
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
        tooltip.setAttribute("show", "true");
        tooltip.showPopup?.();
      }

      const prevBodyCursor = document.body.style.cursor;
      const initDeg = this.#pointPointLineDeg();
      let lastCursorDeg = Math.round(isFirst ? initDeg + 180 : initDeg);
      document.body.style.cursor = this.#rotateCursorSvg(lastCursorDeg);

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
          this.#x = newPctX;
          this.#y = newPctY;
        } else {
          this.#x2 = newPctX;
          this.#y2 = newPctY;
        }
        this.#syncPositions();
        const curDeg = Math.round(
          isFirst ? this.#pointPointLineDeg() + 180 : this.#pointPointLineDeg(),
        );
        if (curDeg !== lastCursorDeg) {
          lastCursorDeg = curDeg;
          document.body.style.cursor = this.#rotateCursorSvg(curDeg);
        }
        this.#emitInput();
      };

      const onUp = () => {
        this.#isDragging = false;
        document.body.style.cursor = prevBodyCursor;
        if (tooltip) tooltip.removeAttribute("show");
        this.#syncValueAttribute();
        this.#emitChange();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
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
      circle.style.cursor = this.#resizeCursorSvg(deg);
    });
    const onDown = (e) => {
      if (this.hasAttribute("disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      this.#isRadiusDragging = true;
      this.classList.add("fig-canvas-control-ring-active");
      const container = this.#container;
      if (!container) return;

      if (this.#radiusTooltip) {
        this.#radiusTooltip.setAttribute("show", "true");
        this.#radiusTooltip.showPopup?.();
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
          this.#radius = Math.max(0, (dist / rect.width) * 100);
        } else {
          this.#radius = Math.max(0, dist);
        }
        if (this.#radiusTooltip)
          this.#radiusTooltip.setAttribute("text", this.#formatRadius());
        this.#syncPositions();
        this.#emitInput();
      };

      const onUp = () => {
        this.#isRadiusDragging = false;
        this.classList.remove("fig-canvas-control-ring-active");
        circle.style.pointerEvents = "";
        document.body.style.cursor = prevBodyCursor;
        if (this.#radiusTooltip) this.#radiusTooltip.removeAttribute("show");
        this.#syncValueAttribute();
        this.#emitChange();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
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
}
customElements.define("fig-canvas-control", FigCanvasControl);

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
  }

  connectedCallback() {
    requestAnimationFrame(() => {
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
    this.#cleanupListeners();
  }

  #render() {
    this.innerHTML = this.#getInnerHTML();
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

  #getInnerHTML() {
    const step = this.#getStepForUnit();
    const minAttr = this.min !== null ? `min="${this.min}"` : "";
    const maxAttr = this.max !== null ? `max="${this.max}"` : "";
    return `
        ${
          this.dial
            ? `<div class="fig-input-angle-plane" tabindex="0">
          <div class="fig-input-angle-handle"></div>
        </div>`
            : ""
        }
        ${
          this.text
            ? `<fig-input-number
                name="angle"
                step="${step}"
                value="${this.angle}"
                ${minAttr}
                ${maxAttr}
                units="${this.units}">
                ${this.showRotations ? `<span slot="append" class="fig-input-angle-rotations"></span>` : ""}
              </fig-input-number>`
            : ""
        }
    `;
  }

  #getRotationCount() {
    const degrees = Math.abs(this.#toDegrees(this.angle));
    return Math.floor(degrees / 360);
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
    window.addEventListener("keydown", this.#boundHandleKeyDown);
    window.addEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.addEventListener("input", this.#boundHandleAngleInput);
    }
    this.addEventListener("change", this.#boundHandleRawChange, true);
  }

  #cleanupListeners() {
    this.plane?.removeEventListener("mousedown", this.#boundHandleMouseDown);
    this.plane?.removeEventListener("touchstart", this.#boundHandleTouchStart);
    window.removeEventListener("keydown", this.#boundHandleKeyDown);
    window.removeEventListener("keyup", this.#boundHandleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#boundHandleAngleInput);
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
    this.angle = Number(e.target.value);
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
    this.#updateRotationDisplay();
    this.#emitInputEvent();
    this.#emitChangeEvent();
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
      this.angle = this.#fromDegrees(normalizedAngle);
    } else {
      if (this.#prevRawAngle === null) {
        this.#prevRawAngle = normalizedAngle;
        const currentDeg = this.#toDegrees(this.angle);
        const currentMod = ((currentDeg % 360) + 360) % 360;
        let delta = normalizedAngle - currentMod;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle += this.#fromDegrees(delta);
      } else {
        let delta = normalizedAngle - this.#prevRawAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        this.angle += this.#fromDegrees(delta);
        this.#prevRawAngle = normalizedAngle;
      }
    }

    this.#calculateAdjacentAndOpposite();

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();

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
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      this.#emitChangeEvent();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  #handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
    this.#prevRawAngle = null;
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const handleTouchEnd = () => {
      this.isDragging = false;
      this.#prevRawAngle = null;
      this.plane.classList.remove("dragging");
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      this.#emitChangeEvent();
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
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
    this.angle = value;
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
    if (this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }
    this.#updateRotationDisplay();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (this.isDragging) break;
        this.value = Number(newValue);
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
        if (this.isConnected) {
          this.#render();
          this.#setupListeners();
          this.#syncHandlePosition();
        }
        break;
      case "max":
        this.max = newValue !== null ? Number(newValue) : null;
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
customElements.define("fig-input-angle", FigInputAngle);

