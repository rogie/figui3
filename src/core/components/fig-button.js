/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  createFigIcon,
  figCreateElement,
  figDefineElement,
} from "../runtime/index.js";

/**
 * A custom button element that supports different types and states.
 * @attr {string} variant - Visual style: "primary", "secondary", "destructive", "destructiveSecondary", "destructiveGhost", "destructiveLink", "ghost", "link", "input", or "overlay"
 * @attr {string} type - The button type: "button" (default), "toggle", "submit", or "link"
 * @attr {boolean} selected - Whether the button is in a selected state
 * @attr {boolean} disabled - Whether the button is disabled
 * @attr {string} align - Content alignment: "start", "center" (default), or "end"
 * @attr {string} href - URL for link type buttons
 * @attr {string} target - Target window for link type buttons (e.g., "_blank")
 */
class FigButton extends HTMLElement {
  type;
  #selected;
  #slottedDisabledStates = new WeakMap();
  #a11yAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-haspopup",
    "aria-expanded",
    "aria-controls",
    "title",
  ];
  #boundHandleControlKeydown = this.#handleControlKeydown.bind(this);
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleSlotChange = () => {
    this.#syncSlottedControlDisabled();
    this.#syncSelectChevron();
  };
  #boundHandleFocus = () => {
    if (this.button?.matches(":focus-visible")) {
      this.setAttribute("data-focus-visible", "");
    }
  };
  #boundHandleBlur = () => {
    this.removeAttribute("data-focus-visible");
  };
  constructor() {
    super();
    this.attachShadow({ mode: "open", delegatesFocus: true });
  }
  connectedCallback() {
    this.type = this.getAttribute("type") || "button";
    if (!this.button) {
      const isControlWrapper = this.type === "select" || this.type === "upload";
      const controlTag = isControlWrapper ? "span" : "button";
      // Custom button modes are implemented by the host. Keep the shadow
      // control inert so invalid native types (for example "toggle") cannot
      // normalize to "submit" inside a form.
      const style = document.createElement("style");
      style.textContent = `
        button, button:hover, button:active, .fig-button-control {
          padding: var(--fig-button-control-padding, 0 var(--spacer-2));
          appearance: none;
          display: flex;
          border: 0;
          flex: 1;
          text-align: var(--fig-button-text-alignment, center);
          align-items: stretch;
          justify-content: var(--fig-button-content-alignment, center);
          font: inherit;
          color: inherit;
          outline: 0;
          place-items: center;
          background: transparent;
          margin: var(--fig-button-control-margin, calc(var(--spacer-2)*-1));
          height: var(--spacer-4);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          min-width: 0;
        }
        :host([size="large"]) button,
        :host([size="large"]) .fig-button-control {
          height: var(--spacer-5);
        }
        :host([size="large"][icon]) button,
        :host([size="large"][icon]) .fig-button-control {
          padding: 0;
        }
        :host([type="select"]) .fig-button-control {
          gap: var(--spacer-1);
        }
      `;
      const prependSlot = document.createElement("slot");
      prependSlot.name = "prepend";
      const defaultSlot = document.createElement("slot");
      const appendSlot = document.createElement("slot");
      appendSlot.name = "append";
      const control = figCreateElement(
        controlTag,
        {
          className: "fig-button-control",
          type: isControlWrapper ? null : "button",
        },
        [prependSlot, defaultSlot, appendSlot],
      );
      this.shadowRoot.replaceChildren(style, control);

      this.button = control;
      this.button.addEventListener("click", this.#boundHandleClick);
      this.button.addEventListener("focus", this.#boundHandleFocus);
      this.button.addEventListener("blur", this.#boundHandleBlur);
    }

    this.shadowRoot.querySelectorAll("slot").forEach((slot) => {
      slot.removeEventListener("slotchange", this.#boundHandleSlotChange);
      slot.addEventListener("slotchange", this.#boundHandleSlotChange);
    });
    this.removeEventListener("keydown", this.#boundHandleControlKeydown);
    this.addEventListener("keydown", this.#boundHandleControlKeydown);

    this.#selected =
      this.hasAttribute("selected") &&
      this.getAttribute("selected") !== "false";

    this.#syncButtonAttributes();
    this.#syncSelectChevron();
  }

  get type() {
    return this.getAttribute("type") || "button";
  }
  set type(value) {
    this.setAttribute("type", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.setAttribute("selected", value);
  }

  #isDisabled() {
    return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
  }

  #handleClick() {
    if (this.#isDisabled()) return;
    if (this.type === "toggle") {
      if (this.selected) this.removeAttribute("selected");
      else this.setAttribute("selected", "");
    }
    if (this.type === "submit") {
      let form = this.closest("form");
      if (form) {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      }
    }
    if (this.type === "link") {
      const href = this.getAttribute("href");
      const target = this.getAttribute("target");
      if (href) {
        if (target) {
          window.open(href, target);
        } else {
          window.location.href = href;
        }
      }
    }
  }
  #getSlottedControl() {
    if (this.type === "select") {
      return this.querySelector("select, fig-dropdown");
    }
    if (this.type === "upload") {
      return this.querySelector('input[type="file"], input');
    }
    return null;
  }
  #getSlottedSelect() {
    const control = this.#getSlottedControl();
    if (control instanceof HTMLSelectElement) return control;
    if (control?.tagName === "FIG-DROPDOWN") {
      return control.select || control.querySelector?.("select") || null;
    }
    return null;
  }
  #handleControlKeydown(e) {
    if (this.type !== "select") return;
    if (e.key !== "Enter") return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const select = this.#getSlottedSelect();
    if (!select || select.disabled || select.multiple) return;
    if (typeof select.showPicker !== "function") return;
    e.preventDefault();
    try {
      select.showPicker();
    } catch {
      // showPicker can be blocked outside trusted user activation.
    }
  }
  #syncPressedState() {
    if (!this.button) return;
    if (this.type !== "toggle") {
      this.removeAttribute("aria-pressed");
      this.button.removeAttribute("aria-pressed");
      return;
    }
    const pressed = this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.setAttribute("aria-pressed", pressed ? "true" : "false");
    this.button.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  #syncSelectChevron() {
    const selector =
      ':scope > fig-icon[slot="append"][data-generated="select-chevron"]';
    const generatedIcons = Array.from(this.querySelectorAll(selector));
    const generated = generatedIcons[0];
    generatedIcons.slice(1).forEach((icon) => icon.remove());
    if (this.type !== "select") {
      generated?.remove();
      return;
    }
    const authoredAppend = this.querySelector(
      ':scope > [slot="append"]:not([data-generated])',
    );
    if (authoredAppend) {
      generated?.remove();
      return;
    }
    if (generated) return;
    const chevron = createFigIcon("chevron", { size: "small" });
    chevron.setAttribute("slot", "append");
    chevron.setAttribute("data-generated", "select-chevron");
    this.append(chevron);
  }
  #syncA11yAttributes() {
    if (!this.button) return;
    if (!(this.button instanceof HTMLButtonElement)) return;
    this.#a11yAttributes.forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.button.removeAttribute(name);
      } else {
        this.button.setAttribute(name, value);
      }
    });
  }
  #syncButtonAttributes() {
    if (!this.button) return;
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.disabled = disabled;
    if (this.button instanceof HTMLButtonElement) {
      this.button.disabled = disabled;
      this.button.type = "button";
      this.button.setAttribute("type", "button");
    }
    this.#syncSlottedControlDisabled();
    this.#syncA11yAttributes();
    this.#syncPressedState();
  }
  #syncSlottedControlDisabled() {
    const control = this.#getSlottedControl();
    if (!control) return;
    const disabled = this.#isDisabled();
    if (disabled) {
      if (!this.#slottedDisabledStates.has(control)) {
        this.#slottedDisabledStates.set(
          control,
          control.hasAttribute("disabled") &&
            control.getAttribute("disabled") !== "false",
        );
      }
      control.setAttribute("disabled", "");
    } else if (this.#slottedDisabledStates.has(control)) {
      const wasDisabled = this.#slottedDisabledStates.get(control);
      this.#slottedDisabledStates.delete(control);
      if (wasDisabled) control.setAttribute("disabled", "");
      else control.removeAttribute("disabled");
    }
  }
  static get observedAttributes() {
    return [
      "disabled",
      "selected",
      "type",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-haspopup",
      "aria-expanded",
      "aria-controls",
      "title",
    ];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case "type": {
        const isWrapper = (type) => type === "select" || type === "upload";
        if (isWrapper(oldValue || "button") !== isWrapper(newValue || "button")) {
          this.button = null;
          this.connectedCallback();
          break;
        }
        this.#syncButtonAttributes();
        this.#syncSelectChevron();
        break;
      }
      case "disabled":
        this.#syncButtonAttributes();
        break;
      case "selected":
        this.#selected = newValue !== null && newValue !== "false";
        this.#syncPressedState();
        break;
      default:
        this.#syncA11yAttributes();
        break;
    }
  }
  disconnectedCallback() {
    this.removeEventListener("keydown", this.#boundHandleControlKeydown);
    this.shadowRoot?.querySelectorAll("slot").forEach((slot) => {
      slot.removeEventListener("slotchange", this.#boundHandleSlotChange);
    });
  }
}
figDefineElement("fig-button", FigButton);

export { FigButton };
