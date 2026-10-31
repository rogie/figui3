/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";

let figPropertyId = 0;

function defineElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor);
}

function createIcon(name) {
  const icon = document.createElement("fig-icon");
  icon.setAttribute("name", name);
  icon.setAttribute("size", "small");
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

class FigProperty extends HTMLElement {
  static observedAttributes = [
    "label",
    "leading",
    "trailing",
    "show-leading",
    "show-trailing",
  ];

  #observer = null;
  #labelElement = null;
  #associatedInput = null;
  #labelFocusTarget = null;
  #syncQueued = false;

  connectedCallback() {
    this.#sync();
    this.#observer = new MutationObserver(() => this.#queueSync());
    this.#observer.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ["slot"],
    });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#clearLabelAssociation();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#queueSync();
  }

  get input() {
    return this.querySelector(':scope > [slot="input"]');
  }

  #queueSync() {
    if (this.#syncQueued) return;
    this.#syncQueued = true;
    queueMicrotask(() => {
      this.#syncQueued = false;
      if (this.isConnected) this.#sync();
    });
  }

  #authoredSlot(name) {
    return this.querySelector(
      `:scope > [slot="${name}"]:not([data-fig-property-generated])`,
    );
  }

  #generatedSlot(name) {
    return this.querySelector(
      `:scope > [slot="${name}"][data-fig-property-generated]`,
    );
  }

  #sync() {
    this.#syncLabel();
    this.#syncLeading();
    this.#syncTrailing();
  }

  #syncLabel() {
    const labelText = this.getAttribute("label");
    const authoredLabel =
      this.querySelector(
        ':scope > [slot="label"]:not([data-fig-property-generated])',
      ) ||
      this.querySelector(
        ":scope > label:not([data-fig-property-generated])",
      );
    let generatedLabel = this.querySelector(
      ":scope > label[data-fig-property-generated]",
    );

    if (labelText === null || authoredLabel) {
      generatedLabel?.remove();
      generatedLabel = null;
    } else {
      if (!generatedLabel) {
        generatedLabel = document.createElement("label");
        generatedLabel.setAttribute("slot", "label");
        generatedLabel.setAttribute("data-fig-property-generated", "");
        this.insertBefore(generatedLabel, this.input);
      }
      generatedLabel.textContent = labelText;
    }

    const label = authoredLabel || generatedLabel;
    this.#associateLabel(label, this.input);
  }

  #associateLabel(label, input) {
    this.#clearLabelAssociation();
    if (!(label instanceof HTMLElement) || !(input instanceof HTMLElement)) {
      return;
    }

    if (!label.id) {
      figPropertyId += 1;
      label.id = `fig-property-label-${figPropertyId}`;
      label.setAttribute("data-fig-property-generated-id", "");
    }

    if (
      !input.hasAttribute("aria-label") &&
      !input.hasAttribute("aria-labelledby")
    ) {
      input.setAttribute("aria-labelledby", label.id);
      input.setAttribute("data-fig-property-labelledby", "");
    }

    label.addEventListener("click", this.#focusInput);
    label.addEventListener("pointerenter", this.#showLabelTooltip);
    label.addEventListener("pointerleave", this.#hideLabelTooltip);
    this.#labelElement = label;
    this.#associatedInput = input;
  }

  #clearLabelAssociation() {
    this.#clearLabelFocusTarget();
    const label = this.#labelElement;
    label?.removeEventListener("click", this.#focusInput);
    label?.removeEventListener("pointerenter", this.#showLabelTooltip);
    label?.removeEventListener("pointerleave", this.#hideLabelTooltip);
    const Tooltip = customElements.get("fig-tooltip");
    if (label && typeof Tooltip?.hide === "function") Tooltip.hide(label);
    if (this.#associatedInput?.hasAttribute("data-fig-property-labelledby")) {
      this.#associatedInput.removeAttribute("aria-labelledby");
      this.#associatedInput.removeAttribute("data-fig-property-labelledby");
    }
    this.#labelElement = null;
    this.#associatedInput = null;
  }

  #showLabelTooltip = (event) => {
    const label = event.currentTarget;
    if (
      !(label instanceof HTMLElement) ||
      label.scrollWidth <= label.clientWidth
    ) {
      return;
    }
    const Tooltip = customElements.get("fig-tooltip");
    if (typeof Tooltip?.show === "function") {
      Tooltip.show(label, label.textContent.trim());
    }
  };

  #hideLabelTooltip = (event) => {
    const label = event.currentTarget;
    const Tooltip = customElements.get("fig-tooltip");
    if (label instanceof HTMLElement && typeof Tooltip?.hide === "function") {
      Tooltip.hide(label);
    }
  };

  #focusInput = () => {
    const input = this.input;
    if (!(input instanceof HTMLElement)) return;
    input.focus();
    if (
      document.activeElement !== input &&
      !input.contains(document.activeElement) &&
      !input.matches(":focus-within")
    ) {
      input.querySelector("input, select, textarea, button")?.focus();
    }
    const focused = input.matches(":focus")
      ? input
      : input.querySelector(":focus");
    if (focused instanceof HTMLElement) {
      this.#clearLabelFocusTarget();
      this.#labelFocusTarget = focused;
      focused.setAttribute("data-fig-property-focus", "");
      focused.addEventListener("blur", this.#clearLabelFocusTarget, {
        once: true,
      });
    }
  };

  #clearLabelFocusTarget = () => {
    this.#labelFocusTarget?.removeEventListener(
      "blur",
      this.#clearLabelFocusTarget,
    );
    this.#labelFocusTarget?.removeAttribute("data-fig-property-focus");
    this.#labelFocusTarget = null;
  };

  #syncLeading() {
    const authored = this.#authoredSlot("leading");
    const generated = this.#generatedSlot("leading");
    const value = (this.getAttribute("leading") || "").trim().toLowerCase();

    if (authored || !["drag", "chevron"].includes(value)) {
      generated?.remove();
      return;
    }

    const iconName = value === "drag" ? "drag-handle" : "chevron";
    if (generated?.getAttribute("name") === iconName) return;

    generated?.remove();
    const icon = createIcon(iconName);
    icon.setAttribute("slot", "leading");
    icon.setAttribute("data-fig-property-generated", "");
    this.prepend(icon);
  }

  #syncTrailing() {
    const authored = this.#authoredSlot("trailing");
    const generated = this.#generatedSlot("trailing");
    const value = (this.getAttribute("trailing") || "").trim().toLowerCase();

    if (authored || !["remove", "add", "bind"].includes(value)) {
      generated?.remove();
      return;
    }

    if (generated?.getAttribute("data-fig-property-action") === value) return;

    generated?.remove();
    const button = document.createElement("fig-button");
    button.setAttribute("slot", "trailing");
    button.setAttribute("variant", "ghost");
    button.setAttribute("size", "small");
    button.setAttribute("data-fig-property-generated", "");
    button.setAttribute("data-fig-property-action", value);
    button.setAttribute("aria-label", `${value[0].toUpperCase()}${value.slice(1)}`);

    if (value === "bind") {
      button.textContent = "Bind";
    } else {
      button.setAttribute("icon", "");
      button.append(createIcon(value === "add" ? "add" : "minus"));
    }

    button.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent(value, {
          bubbles: true,
          composed: true,
          detail: { input: this.input },
        }),
      );
    });
    this.append(button);
  }
}

defineElement("fig-property", FigProperty);

export { FigProperty };
