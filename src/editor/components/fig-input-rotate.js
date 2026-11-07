/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

const HTMLElement = globalThis.HTMLElement ?? class {};

function defineElement(name, constructor) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) customElements.define(name, constructor);
}

function getOverlayRoot() {
  if (!document.body) return null;
  const attribute = "data-figui-overlay-root";
  let root = document.body.querySelector(`:scope > [${attribute}]`);
  if (!root) {
    root = document.createElement("div");
    root.setAttribute(attribute, "");
    document.body.append(root);
  }
  return root;
}

class FigInputRotate extends HTMLElement {
  static observedAttributes = [
    "x",
    "y",
    "z",
    "default-x",
    "default-y",
    "default-z",
    "units",
    "variant",
    "open",
    "disabled",
  ];

  #button = null;
  #icon = null;
  #editor = null;
  #popup = null;
  #popupAnchor = null;
  #popupAnchorResizeObserver = null;
  #syncingFromPopup = false;
  #axisLabels = {};
  #values = {};
  #boundOpen = () => {
    this.open = true;
  };
  #boundPopupClosed = () => {
    if (!this.#popup) return;
    if (
      this.#popup.hasAttribute("open") ||
      this.#popup.matches?.(":open") ||
      this.#popup.matches?.(":popover-open")
    ) {
      return;
    }
    if (this.open) this.open = false;
  };
  #boundPopupEvent = (event) => {
    event.stopPropagation();
    const detail = event.detail ?? {};
    this.#syncingFromPopup = true;
    this.setAttribute("x", String(this.#numericValue(detail.rotateX)));
    this.setAttribute("y", String(this.#numericValue(detail.rotateY)));
    this.setAttribute("z", String(this.#numericValue(detail.rotateZ)));
    this.#syncingFromPopup = false;
    this.dispatchEvent(
      new CustomEvent(event.type, {
        bubbles: true,
        composed: true,
        detail: this.value,
      }),
    );
  };

  connectedCallback() {
    this.#render();
    this.#sync();
    this.#syncOpenState();
  }

  disconnectedCallback() {
    this.#destroyPopup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    if (name === "open") {
      this.#syncTriggerState();
      this.#syncOpenState();
      return;
    }
    if (name === "disabled") this.#syncTriggerState();
    if (name === "variant") this.#syncVariant();
    this.#sync();
    if (!this.#syncingFromPopup) this.#syncEditor();
  }

  get value() {
    return {
      x: this.#axisValue("x"),
      y: this.#axisValue("y"),
      z: this.#axisValue("z"),
    };
  }

  get default() {
    return {
      x: this.#defaultAxisValue("x"),
      y: this.#defaultAxisValue("y"),
      z: this.#defaultAxisValue("z"),
    };
  }

  set default(value) {
    const next = value && typeof value === "object" ? value : {};
    for (const axis of ["x", "y", "z"]) {
      const axisValue = next[axis];
      if (axisValue === null || axisValue === undefined || axisValue === "") {
        this.removeAttribute(`default-${axis}`);
      } else {
        this.setAttribute(`default-${axis}`, String(axisValue));
      }
    }
  }

  get defaultValue() {
    return { ...this.default };
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    if (this.#editor) return this.#editor.isDefault;
    const value = this.value;
    const defaults = this.default;
    return (
      value.x === defaults.x &&
      value.y === defaults.y &&
      value.z === defaults.z
    );
  }

  resetToDefault() {
    if (this.#isDisabled || this.isDefault) return;
    const defaults = this.default;
    for (const axis of ["x", "y", "z"]) {
      this.setAttribute(axis, String(defaults[axis]));
    }
    this.#sync();
    this.#syncEditor();
    for (const type of ["input", "change"]) {
      this.dispatchEvent(
        new CustomEvent(type, {
          bubbles: true,
          composed: true,
          detail: this.value,
        }),
      );
    }
  }

  get units() {
    return this.getAttribute("units") || "deg";
  }

  set units(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("units");
    } else {
      this.setAttribute("units", String(value));
    }
  }

  get variant() {
    return this.getAttribute("variant") === "simple" ? "simple" : "default";
  }

  set variant(value) {
    if (value === "simple") this.setAttribute("variant", "simple");
    else this.removeAttribute("variant");
  }

  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }

  set open(value) {
    const wasOpen = this.open;
    if (value) this.setAttribute("open", "");
    else this.removeAttribute("open");
    if (wasOpen !== this.open) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          bubbles: true,
          composed: true,
          detail: { open: this.open },
        }),
      );
    }
  }

  focus(options) {
    this.#button?.focus(options);
  }

  activate(options) {
    if (this.#isDisabled) return;
    this.focus(options);
    this.#button?.click();
  }

  #render() {
    if (this.#button?.isConnected) return;

    const icon = document.createElement("fig-icon");
    icon.setAttribute("name", "rotate3d");
    icon.setAttribute("slot", "prepend");
    icon.setAttribute("aria-hidden", "true");

    const value = document.createElement("span");
    value.className = "fig-input-rotate-value";

    ["x", "y", "z"].forEach((axis, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "fig-input-rotate-separator";
        separator.textContent = " · ";
        value.append(separator);
      }
      const axisValue = document.createElement("span");
      axisValue.setAttribute("data-axis", axis);
      const axisLabel = document.createElement("span");
      axisLabel.className = "fig-input-rotate-axis";
      axisLabel.textContent = `${axis.toUpperCase()} `;
      const valueText = document.createElement("span");
      axisValue.append(axisLabel, valueText);
      value.append(axisValue);
      this.#axisLabels[axis] = axisLabel;
      this.#values[axis] = valueText;
    });

    const button = document.createElement("fig-button");
    button.setAttribute("variant", "property");
    button.setAttribute("full", "");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", this.#boundOpen);
    button.append(icon, value);

    this.replaceChildren(button);
    this.#button = button;
    this.#icon = icon;
    this.#syncVariant();
    this.#syncTriggerState();
  }

  #syncVariant() {
    if (!this.#button) return;
    const simple = this.variant === "simple";
    const value = this.#button.querySelector(".fig-input-rotate-value");
    if (simple) {
      this.#icon?.remove();
    } else if (this.#icon && !this.#icon.isConnected && value) {
      this.#button.insertBefore(this.#icon, value);
    }
    for (const axis of ["x", "y", "z"]) {
      const axisLabel = this.#axisLabels[axis];
      const valueText = this.#values[axis];
      if (!axisLabel || !valueText) continue;
      if (simple) {
        axisLabel.remove();
      } else if (!axisLabel.isConnected) {
        valueText.parentElement?.insertBefore(axisLabel, valueText);
      }
    }
  }

  #sync() {
    const units = this.#displayUnits();
    for (const axis of ["x", "y", "z"]) {
      const value = this.#values[axis];
      if (!value) continue;
      value.textContent = `${this.#formatAxisValue(axis)}${units}`;
    }
  }

  #ensurePopup() {
    if (this.#popup?.isConnected) return this.#popup;
    if (!customElements.get("fig-popup")) return null;

    const popup = document.createElement("dialog", { is: "fig-popup" });
    popup.setAttribute("is", "fig-popup");
    popup.className = "fig-input-rotate-popup";
    popup.id = `fig-input-rotate-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2)}`;
    popup.setAttribute("aria-label", "Edit 3D rotation");
    popup.setAttribute("position", "bottom left");
    popup.setAttribute("offset", "0 8");
    popup.setAttribute("viewport-margin", "8");
    popup.setAttribute("popover", "manual");

    const content = document.createElement("fig-content");
    content.className = "fig-input-rotate-popup-content";
    const editor = document.createElement("fig-3d-rotate");
    editor.setAttribute("fields", "rotateX,rotateY,rotateZ");
    editor.setAttribute("aspect-ratio", "4/3");
    editor.addEventListener("input", this.#boundPopupEvent);
    editor.addEventListener("change", this.#boundPopupEvent);
    content.append(editor);
    popup.append(content);
    popup.addEventListener("close", this.#boundPopupClosed);
    popup.addEventListener("toggle", this.#boundPopupClosed);

    (getOverlayRoot() ?? document.body)?.append(popup);
    this.#popup = popup;
    this.#editor = editor;
    this.#button?.setAttribute("aria-controls", popup.id);
    this.#syncPopupAnchor();
    this.#syncEditor();
    return popup;
  }

  #resolvePopupAnchor() {
    const parent = this.parentElement;
    return parent?.matches('fig-property[activation="row"]') ? parent : this;
  }

  #syncPopupAnchor() {
    if (!this.#popup) return;
    const anchor = this.#resolvePopupAnchor();
    this.#popupAnchor = anchor;
    this.#popup.anchor = anchor;
    this.#popup.setAttribute("offset", anchor === this ? "0 8" : "0 0");
    this.#popupAnchorResizeObserver ??= new ResizeObserver(() =>
      this.#syncPopupWidth(),
    );
    this.#popupAnchorResizeObserver.disconnect();
    this.#popupAnchorResizeObserver.observe(anchor);
    this.#syncPopupWidth();
  }

  #syncPopupWidth() {
    if (!this.#popup) return;
    if (this.#popupAnchor === this) {
      this.#popup.style.removeProperty("width");
      return;
    }
    const width = this.#popupAnchor?.getBoundingClientRect().width;
    if (Number.isFinite(width) && width > 0) {
      this.#popup.style.width = `${width}px`;
    }
  }

  #syncEditor() {
    if (!this.#editor) return;
    for (const axis of ["x", "y", "z"]) {
      this.#editor.setAttribute(
        `default-${axis}`,
        String(this.#defaultAxisValue(axis)),
      );
    }
    this.#editor.setAttribute(
      "value",
      `rotateX(${this.#axisValue("x")}deg) rotateY(${this.#axisValue(
        "y",
      )}deg) rotateZ(${this.#axisValue("z")}deg)`,
    );
  }

  #syncOpenState() {
    if (!this.isConnected) return;
    if (!this.open) {
      if (this.#popup) this.#popup.open = false;
      this.#popupAnchorResizeObserver?.disconnect();
      return;
    }
    const popup = this.#ensurePopup();
    if (!popup) return;
    this.#syncEditor();
    this.#syncPopupAnchor();
    popup.open = true;
  }

  #syncTriggerState() {
    this.#button?.setAttribute("aria-expanded", String(this.open));
    this.#button?.toggleAttribute("disabled", this.#isDisabled);
  }

  #destroyPopup() {
    if (!this.#popup) return;
    this.#popup.removeEventListener("close", this.#boundPopupClosed);
    this.#popup.removeEventListener("toggle", this.#boundPopupClosed);
    this.#editor?.removeEventListener("input", this.#boundPopupEvent);
    this.#editor?.removeEventListener("change", this.#boundPopupEvent);
    this.#popup.open = false;
    this.#popup.remove();
    this.#button?.removeAttribute("aria-controls");
    this.#popupAnchorResizeObserver?.disconnect();
    this.#popupAnchor = null;
    this.#popup = null;
    this.#editor = null;
  }

  #axisValue(axis) {
    return this.#numericValue(this.getAttribute(axis));
  }

  #defaultAxisValue(axis) {
    return this.#numericValue(this.getAttribute(`default-${axis}`));
  }

  get #isDisabled() {
    return (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    );
  }

  #formatAxisValue(axis) {
    const rounded = Math.round(this.#axisValue(axis) * 10) / 10;
    return Number.isInteger(rounded)
      ? String(rounded)
      : String(parseFloat(rounded.toFixed(1)));
  }

  #numericValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  #displayUnits() {
    const units = this.units;
    return units === "deg" || units === "°" ? "°" : units;
  }
}

defineElement("fig-input-rotate", FigInputRotate);

export { FigInputRotate };
