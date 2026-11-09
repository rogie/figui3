/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
import {
  HTMLElement,
  CustomEvent,
  figEditorDefineElement,
  figEditorGetOverlayRoot,
  figEditorEscapeAttribute,
  figEditorBooleanAttribute,
  figEditorUniqueId,
  figEditorCssUrl,
  figEditorLooksLikeVideoUrl,
  figEditorCreateIcon,
  figEditorAppendChildren,
  figEditorSetAttributes,
  figEditorCreateElement,
  FIG_EDITOR_SVG_NAMESPACE,
  figEditorCreateSvgElement,
  figEditorCreateOverflowButtons,
  figEditorSyncOverflowState,
  figEditorScrollOverflowPage,
  figEditorScrollElementToCenter,
} from "../runtime/helpers.js";
/**
 * Paired X/Y number inputs for editing a point.
 *
 * @element fig-input-point
 * @attr {number} x - Horizontal coordinate
 * @attr {number} y - Vertical coordinate
 * @attr {string} units - Unit string forwarded to both coordinate inputs
 * @fires input - Emitted while either coordinate is edited with `{ x, y }`
 * @fires change - Emitted when either coordinate is committed with `{ x, y }`
 */
class FigInputPoint extends HTMLElement {
  #button = null;
  #editor = null;
  #popup = null;
  #popupDefinitionPromise = null;
  #popupAnchor = null;
  #popupAnchorResizeObserver = null;
  #syncingFromPopup = false;
  #values = {};
  #boundOpen = () => {
    this.open = true;
  };
  #boundPopupLifecycle = (event) => {
    if (event.target !== this.#popup) return;
    const state = event.detail?.state;
    const expanded = state === "opening" || state === "open";
    this.#button?.setAttribute("aria-expanded", String(expanded));
    if (!expanded && this.open) this.open = false;
    if (state === "closed") {
      this.#popupAnchorResizeObserver?.disconnect();
    }
  };
  #boundPopupEvent = (event) => {
    event.stopPropagation();
    const detail = event.detail ?? {};
    this.#syncingFromPopup = true;
    this.setAttribute("x", String(this.#numericValue(detail.x)));
    this.setAttribute("y", String(this.#numericValue(detail.y)));
    this.#syncingFromPopup = false;
    this.dispatchEvent(
      new CustomEvent(event.type, {
        bubbles: true,
        composed: true,
        detail: this.value,
      }),
    );
  };

  static get observedAttributes() {
    return [
      "x",
      "y",
      "default-x",
      "default-y",
      "units",
      "open",
      "disabled",
    ];
  }

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
    if (name === "disabled") {
      if (this.#isDisabled && this.open) this.open = false;
      this.#syncTriggerState();
    }
    this.#sync();
    if (!this.#syncingFromPopup) this.#syncEditor();
  }

  get value() {
    return {
      x: this.#axisValue("x"),
      y: this.#axisValue("y"),
    };
  }

  get default() {
    return {
      x: this.#defaultAxisValue("x"),
      y: this.#defaultAxisValue("y"),
    };
  }

  set default(value) {
    const next = value && typeof value === "object" ? value : {};
    for (const axis of ["x", "y"]) {
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
    const value = this.value;
    const defaults = this.default;
    return value.x === defaults.x && value.y === defaults.y;
  }

  resetToDefault() {
    if (figEditorBooleanAttribute(this, "disabled") || this.isDefault) return;
    const defaults = this.default;
    for (const axis of ["x", "y"]) {
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

  focus(options) {
    this.#button?.focus(options);
  }

  activate(options) {
    if (this.#isDisabled) return;
    this.focus(options);
    this.#button?.click();
  }

  get units() {
    return this.getAttribute("units") || "";
  }

  set units(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("units");
    } else {
      this.setAttribute("units", String(value));
    }
  }

  get open() {
    return figEditorBooleanAttribute(this, "open");
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

  #render() {
    if (this.#button?.isConnected) return;

    const value = document.createElement("span");
    value.className = "fig-input-point-value";

    ["x", "y"].forEach((axis, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "fig-input-point-separator";
        separator.textContent = " · ";
        value.append(separator);
      }
      const axisValue = document.createElement("span");
      axisValue.setAttribute("data-axis", axis);
      const axisLabel = document.createElement("span");
      axisLabel.className = "fig-input-point-axis";
      axisLabel.textContent = `${axis.toUpperCase()} `;
      const valueText = document.createElement("span");
      axisValue.append(axisLabel, valueText);
      value.append(axisValue);
      this.#values[axis] = valueText;
    });

    const button = document.createElement("fig-button");
    button.setAttribute("variant", "property");
    button.setAttribute("full", "");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", this.#boundOpen);
    button.append(value);

    this.replaceChildren(button);
    this.#button = button;
    this.#syncTriggerState();
  }

  #sync() {
    const units = this.units;
    for (const axis of ["x", "y"]) {
      const value = this.#values[axis];
      if (!value) continue;
      value.textContent = `${this.#formatAxisValue(axis)}${units}`;
    }
  }

  #axisValue(axis) {
    return this.#numericValue(this.getAttribute(axis));
  }

  #defaultAxisValue(axis) {
    return this.#numericValue(this.getAttribute(`default-${axis}`));
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

  #ensurePopup() {
    if (this.#popup?.isConnected) return this.#popup;
    if (!customElements.get("fig-popup")) {
      this.#popupDefinitionPromise ??= customElements
        .whenDefined("fig-popup")
        .then(() => {
          this.#popupDefinitionPromise = null;
          this.#syncOpenState();
        });
      return null;
    }

    const popup = document.createElement("dialog", { is: "fig-popup" });
    popup.setAttribute("is", "fig-popup");
    popup.className = "fig-input-point-popup";
    popup.id = `fig-input-point-${figEditorUniqueId()}`;
    popup.setAttribute("aria-label", "Edit point");
    popup.setAttribute("position", "bottom left");
    popup.setAttribute("offset", "0 8");
    popup.setAttribute("viewport-margin", "8");
    popup.setAttribute("popover", "manual");

    const content = document.createElement("fig-content");
    content.className = "fig-input-point-popup-content";
    const editor = document.createElement("fig-origin-grid");
    editor.setAttribute("fields", "");
    editor.setAttribute("aspect-ratio", "4/3");
    editor.setAttribute("precision", "1");
    editor.addEventListener("input", this.#boundPopupEvent);
    editor.addEventListener("change", this.#boundPopupEvent);
    content.append(editor);
    popup.append(content);
    popup.addEventListener(
      "fig-popup-lifecycle",
      this.#boundPopupLifecycle,
    );

    (figEditorGetOverlayRoot() ?? document.body)?.append(popup);
    this.#popup = popup;
    this.#editor = editor;
    this.#button?.setAttribute("aria-controls", popup.id);
    this.#syncPopupAnchor();
    this.#syncEditor();
    return popup;
  }

  #syncEditor() {
    if (!this.#editor) return;
    this.#editor.setAttribute(
      "value",
      `${this.#axisValue("x")}% ${this.#axisValue("y")}%`,
    );
    this.#editor.setAttribute("fields", "");
    this.#editor.setAttribute("aspect-ratio", "4/3");
    this.#editor.setAttribute("precision", "1");
    this.#editor.setAttribute("drag", this.#isDisabled ? "false" : "true");
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

  #syncOpenState() {
    if (!this.isConnected) return;
    if (!this.open) {
      if (this.#popup) this.#popup.open = false;
      this.#popupAnchorResizeObserver?.disconnect();
      return;
    }
    if (this.#isDisabled) {
      this.open = false;
      return;
    }
    const popup = this.#ensurePopup();
    if (!popup) return;
    this.#syncEditor();
    this.#syncPopupAnchor();
    popup.open = true;
  }

  #syncTriggerState() {
    const state = this.#popup?.lifecycleState;
    const expanded = state === "opening" || state === "open";
    this.#button?.setAttribute("aria-expanded", String(expanded));
    this.#button?.toggleAttribute("disabled", this.#isDisabled);
  }

  #destroyPopup() {
    if (!this.#popup) return;
    this.#popup.removeEventListener(
      "fig-popup-lifecycle",
      this.#boundPopupLifecycle,
    );
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

  get #isDisabled() {
    return figEditorBooleanAttribute(this, "disabled");
  }
}
figEditorDefineElement("fig-input-point", FigInputPoint);

export { FigInputPoint };
