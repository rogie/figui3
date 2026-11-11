/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  createFigIcon,
  figDefineElement,
} from "../runtime/index.js";

/**
 * A custom button element that supports different types and states.
 * @attr {string} variant - Visual style: "primary", "secondary", "destructive", "destructiveSecondary", "destructiveGhost", "destructiveLink", "ghost", "link", "input", or "overlay"
 * @attr {string} type - The button type: "button" (default), "toggle", "submit", or "link"
 * @attr {boolean} selected - Whether the button is in a selected state
 * @attr {boolean} disabled - Whether the button is disabled
 * @attr {boolean} pill - Whether the button is fully rounded
 * @attr {boolean|string} icon - Icon-only styling; "compact" content-sizes the button
 * @attr {string} align - Content alignment: "start", "center" (default), or "end"
 * @attr {string} href - URL for link type buttons
 * @attr {string} target - Target window for link type buttons (e.g., "_blank")
 */
class FigButton extends HTMLElement {
  #selected = false;
  #activateOnSpace = false;
  #slottedDisabledStates = new WeakMap();
  #boundHandleKeydown = this.#handleKeydown.bind(this);
  #boundHandleKeyup = this.#handleKeyup.bind(this);
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleFocus = this.#handleFocus.bind(this);
  #boundHandleBlur = this.#handleBlur.bind(this);
  #boundHandleChildren = () => {
    this.#syncSlottedControlDisabled();
    this.#syncSelectChevron();
  };
  #childObserver = new MutationObserver(this.#boundHandleChildren);

  connectedCallback() {
    this.type = this.getAttribute("type") || "button";
    this.#selected =
      this.hasAttribute("selected") &&
      this.getAttribute("selected") !== "false";

    this.removeEventListener("keydown", this.#boundHandleKeydown);
    this.removeEventListener("keyup", this.#boundHandleKeyup);
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("focus", this.#boundHandleFocus);
    this.removeEventListener("blur", this.#boundHandleBlur);
    this.addEventListener("keydown", this.#boundHandleKeydown);
    this.addEventListener("keyup", this.#boundHandleKeyup);
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("focus", this.#boundHandleFocus);
    this.addEventListener("blur", this.#boundHandleBlur);
    this.#childObserver.observe(this, { childList: true });

    this.#syncHostState();
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
    if (value && value !== "false") this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }
  get disabled() {
    return this.#isDisabled();
  }
  set disabled(value) {
    if (value && value !== "false") this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }

  #isDisabled() {
    return this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
  }

  #isControlWrapper() {
    return this.type === "select" || this.type === "upload";
  }

  #handleClick(event) {
    if (this.#isDisabled()) {
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
    if (this.type === "toggle") {
      if (this.selected) this.removeAttribute("selected");
      else this.setAttribute("selected", "");
    }
    if (this.type === "submit") {
      const form = this.closest("form");
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
  #getSlottedSelectElement() {
    const control = this.#getSlottedControl();
    if (control instanceof HTMLSelectElement) return control;
    if (control?.tagName === "FIG-DROPDOWN") {
      return control.select || control.querySelector?.("select") || null;
    }
    return null;
  }
  #handleKeydown(event) {
    if (this.type === "select") {
      this.#openSelectPicker(event);
      return;
    }
    if (this.#isControlWrapper() || this.#isDisabled()) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "Enter") {
      event.preventDefault();
      this.click();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      this.#activateOnSpace = true;
    }
  }
  #handleKeyup(event) {
    if (event.key !== " ") return;
    const activate = this.#activateOnSpace;
    this.#activateOnSpace = false;
    if (!activate || this.#isControlWrapper() || this.#isDisabled()) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    this.click();
  }
  #openSelectPicker(event) {
    if (event.key !== "Enter") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const select = this.#getSlottedSelectElement();
    if (!select || select.disabled || select.multiple) return;
    if (typeof select.showPicker !== "function") return;
    event.preventDefault();
    try {
      select.showPicker();
    } catch {
      // showPicker can be blocked outside trusted user activation.
    }
  }
  #handleFocus() {
    if (this.matches(":focus-visible")) {
      this.setAttribute("data-focus-visible", "");
    }
  }
  #handleBlur() {
    this.#activateOnSpace = false;
    this.removeAttribute("data-focus-visible");
  }
  #syncPressedState() {
    if (this.type !== "toggle") {
      this.removeAttribute("aria-pressed");
      return;
    }
    const pressed =
      this.hasAttribute("selected") && this.getAttribute("selected") !== "false";
    this.setAttribute("aria-pressed", pressed ? "true" : "false");
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
  #syncHostState() {
    const disabled = this.#isDisabled();
    if (this.#isControlWrapper()) {
      if (this.getAttribute("role") === "button") this.removeAttribute("role");
      this.removeAttribute("tabindex");
    } else {
      this.setAttribute("role", "button");
      this.setAttribute("tabindex", disabled ? "-1" : "0");
    }
    if (disabled) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");
    this.#syncSlottedControlDisabled();
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
    return ["disabled", "selected", "type"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (!this.isConnected) return;
    switch (name) {
      case "type":
        this.#syncHostState();
        this.#syncSelectChevron();
        break;
      case "disabled":
        this.#syncHostState();
        break;
      case "selected":
        this.#selected = newValue !== null && newValue !== "false";
        this.#syncPressedState();
        break;
      default:
        break;
    }
  }
  disconnectedCallback() {
    this.#activateOnSpace = false;
    this.removeEventListener("keydown", this.#boundHandleKeydown);
    this.removeEventListener("keyup", this.#boundHandleKeyup);
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("focus", this.#boundHandleFocus);
    this.removeEventListener("blur", this.#boundHandleBlur);
    this.#childObserver.disconnect();
  }
}
figDefineElement("fig-button", FigButton);

export { FigButton };
