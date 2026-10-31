/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";

function defineElement(name, constructor) {
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
  static observedAttributes = ["x", "y", "z", "units", "open"];

  #button = null;
  #editor = null;
  #popup = null;
  #syncingFromPopup = false;
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

  get units() {
    return this.getAttribute("units") || "deg";
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
          detail: { open: this.open },
        }),
      );
    }
  }

  focus(options) {
    this.#button?.focus(options);
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
      axisLabel.textContent = axis.toUpperCase();
      const valueText = document.createElement("span");
      axisValue.append(axisLabel, " ", valueText);
      value.append(axisValue);
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
    this.#syncTriggerState();
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
    popup.anchor = this;

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
    this.#syncEditor();
    return popup;
  }

  #syncEditor() {
    if (!this.#editor) return;
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
      return;
    }
    const popup = this.#ensurePopup();
    if (!popup) return;
    this.#syncEditor();
    popup.anchor = this;
    popup.open = true;
  }

  #syncTriggerState() {
    this.#button?.setAttribute("aria-expanded", String(this.open));
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
    this.#popup = null;
    this.#editor = null;
  }

  #axisValue(axis) {
    return this.#numericValue(this.getAttribute(axis));
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
