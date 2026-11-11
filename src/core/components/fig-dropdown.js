/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/**
 * A custom dropdown/select element.
 * @attr {string} type - The dropdown type: "select" (default) or "dropdown"
 * @attr {string} value - The currently selected value
 * @attr {string} variant - Visual style. Use `ghost` for a borderless control.
 * @attr {string} size - Control size. Use `large` for a 32px-tall control.
 */
class FigDropdown extends HTMLElement {
  #label = "Menu";
  #selectedValue = null; // Stores last selected value for dropdown type
  #boundHandleSelectInput;
  #boundHandleSelectChange;
  #boundHandleSelectKeydown;
  #boundHandleSelectPointerDown;
  #boundHandleSelectBlur;
  #openButton = null;
  #openButtonWasSelected = false;
  #openSelectWasSelected = false;
  #openStateActive = false;
  #openStateFrame = 0;

  get label() {
    return this.#label;
  }
  set label(value) {
    this.#label = value;
  }
  #boundSlotChange;
  constructor() {
    super();
    this.select = document.createElement("select");
    this.optionsSlot = document.createElement("slot");
    this.attachShadow({ mode: "open" });
    this.#boundHandleSelectInput = this.#handleSelectInput.bind(this);
    this.#boundHandleSelectChange = this.#handleSelectChange.bind(this);
    this.#boundHandleSelectKeydown = this.#handleSelectKeydown.bind(this);
    this.#boundHandleSelectPointerDown =
      this.#handleSelectPointerDown.bind(this);
    this.#boundHandleSelectBlur = this.#clearOpenState.bind(this);
    this.#boundSlotChange = this.slotChange.bind(this);
  }

  #addEventListeners() {
    this.select.addEventListener("input", this.#boundHandleSelectInput);
    this.select.addEventListener("change", this.#boundHandleSelectChange);
    this.select.addEventListener("keydown", this.#boundHandleSelectKeydown);
    this.select.addEventListener(
      "pointerdown",
      this.#boundHandleSelectPointerDown,
    );
    this.select.addEventListener("blur", this.#boundHandleSelectBlur);
  }

  #markOpenState() {
    const button = this.closest('fig-button[type="select"]');
    if (this.#openStateActive && this.#openButton !== button) {
      this.#clearOpenState();
    }
    if (!this.#openStateActive) {
      this.#openSelectWasSelected =
        this.select.hasAttribute("selected") &&
        this.select.getAttribute("selected") !== "false";
      this.#openStateActive = true;
    }
    this.select.setAttribute("selected", "");
    if (!button) return;
    if (this.#openButton !== button) {
      this.#openButton = button;
      this.#openButtonWasSelected =
        button.hasAttribute("selected") &&
        button.getAttribute("selected") !== "false";
    }
    button.setAttribute("selected", "");
  }

  #clearOpenState() {
    if (this.#openStateFrame) {
      cancelAnimationFrame(this.#openStateFrame);
      this.#openStateFrame = 0;
    }
    if (this.#openButton && !this.#openButtonWasSelected) {
      this.#openButton.removeAttribute("selected");
    }
    if (this.#openStateActive && !this.#openSelectWasSelected) {
      this.select.removeAttribute("selected");
    }
    this.#openButton = null;
    this.#openButtonWasSelected = false;
    this.#openSelectWasSelected = false;
    this.#openStateActive = false;
  }

  #watchOpenState() {
    if (this.#openStateFrame) cancelAnimationFrame(this.#openStateFrame);
    let attempts = 0;
    let sawOpen = false;
    const check = () => {
      this.#openStateFrame = 0;
      if (!this.isConnected) {
        this.#clearOpenState();
        return;
      }
      let open = false;
      try {
        open = this.select.matches(":open");
      } catch {
        return;
      }
      if (open) sawOpen = true;
      if (sawOpen && !open) {
        this.#clearOpenState();
        return;
      }
      attempts += 1;
      if (sawOpen || attempts < 4) {
        this.#openStateFrame = requestAnimationFrame(check);
      } else {
        this.#clearOpenState();
      }
    };
    this.#openStateFrame = requestAnimationFrame(check);
  }

  #handleSelectPointerDown(e) {
    if (e.button !== 0 || this.select.disabled) return;
    this.#markOpenState();
    this.#watchOpenState();
  }

  #hasPersistentControl(optionEl) {
    if (!optionEl || !(optionEl instanceof Element)) return false;
    return !!optionEl.querySelector(
      'fig-checkbox, fig-switch, input[type="checkbox"]',
    );
  }

  #keepPickerOpen() {
    // Keep menu open for interactive controls inside option content.
    if (typeof this.select.showPicker === "function") {
      requestAnimationFrame(() => {
        try {
          this.select.showPicker();
        } catch {
          // Ignore if browser blocks reopening picker
        }
      });
    }
  }

  connectedCallback() {
    this.type = this.getAttribute("type") || "select";

    this.#label = this.getAttribute("label") || this.#label;
    this.select.setAttribute("aria-label", this.#label);
    this.#syncDisabled();

    if (!this.select.isConnected) {
      this.appendChild(this.select);
    }
    if (!this.optionsSlot.isConnected) {
      this.shadowRoot.appendChild(this.optionsSlot);
    }

    this.optionsSlot.removeEventListener("slotchange", this.#boundSlotChange);
    this.optionsSlot.addEventListener("slotchange", this.#boundSlotChange);

    this.select.removeEventListener("input", this.#boundHandleSelectInput);
    this.select.removeEventListener("change", this.#boundHandleSelectChange);
    this.select.removeEventListener("keydown", this.#boundHandleSelectKeydown);
    this.#addEventListeners();
  }

  slotChange() {
    const hasDeclaredValue = this.hasAttribute("value");
    const hadNativeSelection =
      this.select.options.length > 0 && this.select.selectedIndex >= 0;
    const selectedValue = hasDeclaredValue
      ? this.getAttribute("value")
      : this.type === "dropdown"
        ? this.#selectedValue
        : hadNativeSelection
          ? this.select.value
          : null;
    while (this.select.firstChild) {
      this.select.firstChild.remove();
    }

    if (this.type === "dropdown") {
      const hiddenOption = document.createElement("option");
      hiddenOption.setAttribute("hidden", "true");
      hiddenOption.setAttribute("selected", "true");
      hiddenOption.selected = true;
      this.select.appendChild(hiddenOption);
    }
    this.optionsSlot.assignedNodes().forEach((option) => {
      if (option.nodeName === "OPTION" || option.nodeName === "OPTGROUP") {
        this.select.appendChild(option.cloneNode(true));
      }
    });
    if (selectedValue !== null) {
      this.#syncSelectedValue(selectedValue);
    }
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
  }

  #handleSelectInput(e) {
    e.stopPropagation();
    const selectedOption = e.target.selectedOptions?.[0];
    if (this.#hasPersistentControl(selectedOption)) {
      if (this.type === "dropdown") {
        this.select.selectedIndex = -1;
      }
      this.#keepPickerOpen();
      return;
    }

    const selectedValue = e.target.value;
    // Store the selected value for dropdown type (before select gets reset)
    if (this.type === "dropdown") {
      this.#selectedValue = selectedValue;
    }
    this.setAttribute("value", selectedValue);
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: selectedValue,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleSelectChange(e) {
    e.stopPropagation();
    const selectedOption = e.target.selectedOptions?.[0];
    if (this.#hasPersistentControl(selectedOption)) {
      if (this.type === "dropdown") {
        this.select.selectedIndex = -1;
      }
      this.#keepPickerOpen();
      return;
    }
    this.#clearOpenState();

    // Get the value before resetting (use stored value for dropdown type)
    const selectedValue =
      this.type === "dropdown" ? this.#selectedValue : this.select.value;
    // Reset to hidden option for dropdown type
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: selectedValue,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleSelectKeydown(e) {
    if (e.key !== "Enter" || e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (this.select.disabled || this.select.multiple) return;
    this.#markOpenState();
    this.#watchOpenState();
    if (this.closest('fig-button[type="select"]')) return;
    if (typeof this.select.showPicker !== "function") return;
    e.preventDefault();
    try {
      this.select.showPicker();
    } catch {
      // showPicker can be unavailable during non-user-initiated key events.
      this.#clearOpenState();
    }
  }

  focus() {
    this.select.focus();
  }
  blur() {
    this.select.blur();
  }
  get value() {
    // For dropdown type, return the stored value since the select is reset after selection
    if (this.type === "dropdown") {
      return this.#selectedValue;
    }
    return this.select?.value;
  }
  set value(value) {
    // Store value for dropdown type
    if (this.type === "dropdown") {
      this.#selectedValue = value;
    }
    this.setAttribute("value", value);
  }
  static get observedAttributes() {
    return ["value", "type", "label", "disabled", "variant", "size"];
  }
  #syncDisabled() {
    const disabled =
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    this.select.disabled = disabled;
  }
  #syncSelectedValue(value) {
    // For dropdown type, don't sync the visual selection - it should always show the hidden placeholder
    if (this.type === "dropdown") {
      return;
    }
    if (this.select) this.select.value = value ?? "";
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.#syncSelectedValue(newValue);
    }
    if (name === "type") {
      this.type = newValue || "select";
      if (this.isConnected) this.slotChange();
    }
    if (name === "label") {
      this.#label = newValue || "Menu";
      this.select.setAttribute("aria-label", this.#label);
    }
    if (name === "disabled") {
      this.#syncDisabled();
    }
  }

  disconnectedCallback() {
    this.optionsSlot.removeEventListener("slotchange", this.#boundSlotChange);
    this.select.removeEventListener("input", this.#boundHandleSelectInput);
    this.select.removeEventListener("change", this.#boundHandleSelectChange);
    this.select.removeEventListener("keydown", this.#boundHandleSelectKeydown);
    this.select.removeEventListener(
      "pointerdown",
      this.#boundHandleSelectPointerDown,
    );
    this.select.removeEventListener("blur", this.#boundHandleSelectBlur);
    this.#clearOpenState();
  }
}

figDefineElement("fig-dropdown", FigDropdown);

export { FigDropdown };
