/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figCreateElement,
  figDefineElement,
} from "../runtime/index.js";

/* Split Input */
/**
 * A split input with text and dropdown controls.
 * @attr {string} type - Main input type: "text" (default) or "number"
 * @attr {string} options - Comma-separated list of dropdown options
 * @attr {string} placeholder - Placeholder text for the input
 * @attr {string} value - The current input value
 * @attr {boolean} disabled - Disables the input and dropdown button
 * @attr {boolean} full - Expands the split input to the available width
 */
class FigSplitInput extends HTMLElement {
  static observedAttributes = [
    "type",
    "options",
    "placeholder",
    "value",
    "disabled",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
  ];

  #usesCustomSelector = false;
  #input = null;
  #selector = null;
  #button = null;
  #customSelector = null;
  #internalUpdate = false;
  #a11yAttributes = [
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-invalid",
    "aria-required",
  ];

  #boundHandleSelectorInput = this.#handleSelectorInput.bind(this);
  #boundHandleSelectorChange = this.#handleSelectorChange.bind(this);
  #boundHandleMainInput = this.#handleMainInput.bind(this);
  #boundHandleMainChange = this.#handleMainChange.bind(this);

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val ?? "");
  }

  #inputTagName() {
    return this.getAttribute("type") === "number"
      ? "fig-input-number"
      : "fig-input-text";
  }

  #createInput() {
    return figCreateElement(this.#inputTagName(), {
      placeholder: this.getAttribute("placeholder") || "",
      value: this.value,
    });
  }

  #canReuseMarkup() {
    const input = this.querySelector(
      ":scope > .input-combo > :is(fig-input-text, fig-input-number)",
    );
    return input?.localName === this.#inputTagName();
  }

  #refreshMarkup() {
    this.#input = this.querySelector(
      ":scope > .input-combo > :is(fig-input-text, fig-input-number)",
    );
    this.#button = this.querySelector("fig-button");
    this.#selector = this.querySelector("fig-select, fig-dropdown");
    if (
      this.#selector?.localName === "fig-select" &&
      customElements.get("fig-select")
    ) {
      this.#selector.menuAnchor = this;
    }
    if (this.#input) {
      this.#input.setAttribute("value", this.value);
      this.#input.setAttribute(
        "placeholder",
        this.getAttribute("placeholder") || "",
      );
    }
    this.#syncSelectorSelection();
    this.#queueSelectorSelection();
    this.#syncA11yAttributes();
  }

  connectedCallback() {
    this.#customSelector =
      Array.from(this.children).find(
        (child) =>
          child.tagName === "FIG-SELECT" || child.tagName === "FIG-DROPDOWN",
      ) || null;
    this.#usesCustomSelector = this.#customSelector !== null;
    if (this.#customSelector) {
      this.#customSelector.remove();
    }

    if (this.#canReuseMarkup()) {
      this.#refreshMarkup();
      if (!this.#customSelector) {
        this.#usesCustomSelector =
          !!this.#selector &&
          !this.#selector.hasAttribute("data-fig-split-generated");
        this.#customSelector = this.#usesCustomSelector ? this.#selector : null;
      }
      this.#setupListeners();
    } else {
      this.#render();
      this.#setupListeners();
    }

    this.#applyDisabled(figBooleanAttribute(this, "disabled"));
  }

  disconnectedCallback() {
    this.#teardownListeners();
  }

  #render() {
    const options = this.#getOptions();
    const dropdownLabel = this.#dropdownLabel();

    const input = this.#createInput();
    let selector = this.#customSelector;
    if (!selector && customElements.get("fig-select")) {
      selector = figCreateElement("fig-select", {
        icon: true,
        variant: "input",
        options: options.join(","),
        label: dropdownLabel,
        "aria-label": dropdownLabel,
        "data-fig-split-generated": true,
      });
    }
    if (!selector) {
      selector = figCreateElement(
        "fig-dropdown",
        {
          type: "dropdown",
          label: dropdownLabel,
          "data-fig-split-generated": true,
        },
        options.map((option) =>
          figCreateElement("option", {}, option.trim()),
        ),
      );
    }

    let action = selector;
    let button = null;
    if (selector.localName === "fig-dropdown") {
      if (!selector.hasAttribute("type")) {
        selector.setAttribute("type", "dropdown");
      }
      button = figCreateElement(
        "fig-button",
        {
          type: "select",
          variant: "input",
          icon: true,
        },
        figCreateElement("fig-icon", {
          name: "chevron",
          size: "small",
          slot: "append",
        }),
      );
      button.append(selector);
      action = button;
    }
    if (!selector.hasAttribute("label")) {
      selector.setAttribute("label", dropdownLabel);
    }

    this.replaceChildren(
      figCreateElement("div", { className: "input-combo" }, [input, action]),
    );

    this.#input = input;
    this.#button = button;
    this.#selector = selector;
    if (
      selector.localName === "fig-select" &&
      customElements.get("fig-select")
    ) {
      selector.menuAnchor = this;
    }
    this.#syncSelectorSelection();
    this.#queueSelectorSelection();
    this.#syncA11yAttributes();
  }

  #setupListeners() {
    this.#teardownListeners();
    this.#selector?.addEventListener("input", this.#boundHandleSelectorInput);
    this.#selector?.addEventListener("change", this.#boundHandleSelectorChange);
    this.#input?.addEventListener("input", this.#boundHandleMainInput);
    this.#input?.addEventListener("change", this.#boundHandleMainChange);
  }

  #teardownListeners() {
    this.#selector?.removeEventListener("input", this.#boundHandleSelectorInput);
    this.#selector?.removeEventListener("change", this.#boundHandleSelectorChange);
    this.#input?.removeEventListener("input", this.#boundHandleMainInput);
    this.#input?.removeEventListener("change", this.#boundHandleMainChange);
  }

  #handleSelectorInput(e) {
    e.stopPropagation();
    this.#syncSelectorValue(e);
    this.#emitInput();
  }

  #handleSelectorChange(e) {
    e.stopPropagation();
    this.#syncSelectorValue(e);
    this.#emitChange();
  }

  #syncSelectorValue(e) {
    const val = e.target.closest("fig-select, fig-dropdown")?.value ?? "";
    this.#internalUpdate = true;
    this.setAttribute("value", val);
    this.#internalUpdate = false;
    if (this.#input) this.#input.setAttribute("value", val);
  }

  #handleMainInput(e) {
    e.stopPropagation();
    const val = e.target.value ?? "";
    this.#internalUpdate = true;
    this.setAttribute("value", val);
    this.#internalUpdate = false;
    this.#syncSelectorSelection(val);
    this.#emitInput();
  }

  #handleMainChange(e) {
    e.stopPropagation();
    const val = e.target.value ?? "";
    this.#internalUpdate = true;
    this.setAttribute("value", val);
    this.#internalUpdate = false;
    this.#syncSelectorSelection(val);
    this.#emitChange();
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value },
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
        detail: { value: this.value },
      }),
    );
  }

  #getOptions() {
    return (this.getAttribute("options") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  #selectorOptionValue(option) {
    if (typeof option?.value === "string") return option.value;
    const attribute = option?.getAttribute?.("value");
    if (attribute !== null && attribute !== undefined) return attribute;
    return (option?.textContent || "").trim();
  }

  #selectorOptionElements() {
    if (!this.#selector) return [];
    const selector =
      this.#selector.localName === "fig-select"
        ? "fig-select-option"
        : "option";
    return Array.from(this.#selector.querySelectorAll(selector));
  }

  #matchingSelectorValue(value) {
    const candidate = String(value ?? "");
    const optionElements = this.#selectorOptionElements();
    const values = optionElements.length
      ? optionElements.map((option) => this.#selectorOptionValue(option))
      : this.#getOptions();
    return values.find((optionValue) => optionValue === candidate) ?? null;
  }

  #syncSelectorSelection(value = this.value) {
    if (!this.#selector) return;
    const match = this.#matchingSelectorValue(value);

    if (this.#selector.localName === "fig-select") {
      if (match !== null) {
        this.#selector.setAttribute("value", match);
      } else {
        for (const option of this.#selectorOptionElements()) {
          option.removeAttribute("selected");
          option.setAttribute("aria-selected", "false");
        }
        this.#selector.removeAttribute("value");
      }
      return;
    }

    if (match !== null) this.#selector.setAttribute("value", match);
    else this.#selector.removeAttribute("value");

    const select = this.#selector.select;
    if (!select) return;
    if (match === null) {
      select.selectedIndex = -1;
    } else {
      select.value = match;
      if (select.value !== match) select.selectedIndex = -1;
    }
  }

  #queueSelectorSelection() {
    const value = this.value;
    requestAnimationFrame(() => {
      if (!this.isConnected || this.value !== value) return;
      this.#syncSelectorSelection(value);
    });
  }

  #controlName() {
    return (
      this.getAttribute("aria-label") ||
      this.getAttribute("placeholder") ||
      "Split input"
    ).trim();
  }

  #dropdownLabel() {
    return `${this.#controlName()} options`;
  }

  #syncA11yAttributes() {
    if (this.#input) {
      this.#a11yAttributes.forEach((name) => {
        const value = this.getAttribute(name);
        if (value === null) this.#input.removeAttribute(name);
        else this.#input.setAttribute(name, value);
      });
    }
    if (this.#selector) {
      const label = this.#dropdownLabel();
      if (!this.#usesCustomSelector) {
        this.#selector.setAttribute("label", label);
        if (this.#selector.localName === "fig-select") {
          this.#selector.setAttribute("aria-label", label);
        }
      } else if (
        !this.#selector.hasAttribute("aria-label") &&
        !this.#selector.hasAttribute("label")
      ) {
        this.#selector.setAttribute("label", label);
      }
    }
  }

  #applyDisabled(disabled) {
    if (this.#input) {
      if (disabled) this.#input.setAttribute("disabled", "");
      else this.#input.removeAttribute("disabled");
    }
    if (this.#button) {
      if (disabled) this.#button.setAttribute("disabled", "");
      else this.#button.removeAttribute("disabled");
    }
    if (this.#selector) {
      if (disabled) this.#selector.setAttribute("disabled", "");
      else this.#selector.removeAttribute("disabled");
    }
  }

  focus() {
    this.#input?.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case "type": {
        if (!this.#input || this.#input.localName === this.#inputTagName()) break;
        const restoreFocus = this.#input.matches(":focus-within");
        this.#teardownListeners();
        const input = this.#createInput();
        this.#input.replaceWith(input);
        this.#input = input;
        this.#syncA11yAttributes();
        this.#applyDisabled(figBooleanAttribute(this, "disabled"));
        this.#setupListeners();
        if (restoreFocus) this.focus();
        break;
      }
      case "options":
        if (this.#selector && !this.#usesCustomSelector) {
          if (this.#selector.localName === "fig-select") {
            this.#selector.setAttribute("options", newValue || "");
          } else {
            const options = this.#getOptions();
            this.#selector.replaceChildren(
              ...options.map((value) => {
                const option = document.createElement("option");
                option.textContent = value;
                return option;
              }),
            );
          }
        }
        this.#syncSelectorSelection();
        this.#queueSelectorSelection();
        break;
      case "placeholder":
        if (this.#input) this.#input.setAttribute("placeholder", newValue || "");
        this.#syncA11yAttributes();
        break;
      case "value":
        if (!this.#internalUpdate && this.#input) {
          this.#input.setAttribute("value", newValue || "");
        }
        if (!this.#internalUpdate) {
          this.#syncSelectorSelection(newValue || "");
          this.#queueSelectorSelection();
        }
        break;
      case "disabled":
        this.#applyDisabled(newValue !== null && newValue !== "false");
        break;
      case "aria-label":
      case "aria-labelledby":
      case "aria-describedby":
      case "aria-invalid":
      case "aria-required":
        this.#syncA11yAttributes();
        break;
    }
  }
}
figDefineElement("fig-split-input", FigSplitInput);

export { FigSplitInput };
