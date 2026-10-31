/* Copyright (c) 2026 Rogie King. PolyForm Shield 1.0.0. See LICENSE. */
import "./fig.js";

let figPropertyId = 0;
const FIG_INPUT_SLIDER_MANAGED_OCCLUSION_TARGETS = Symbol.for(
  "figui.fig-input-slider.managed-occlusion-targets",
);

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
    "activation",
  ];

  #observer = null;
  #labelElement = null;
  #associatedInput = null;
  #labelFocusTarget = null;
  #menuAnchoredSelect = null;
  #previousSelectMenuAnchor = null;
  #waitingForSelectDefinition = false;
  #managedOcclusionSlider = null;
  #waitingForSliderDefinition = false;
  #syncQueued = false;

  connectedCallback() {
    this.addEventListener("click", this.#activateFromRow);
    this.#sync();
    this.#observer = new MutationObserver(() => this.#queueSync());
    this.#observer.observe(this, {
      childList: true,
      attributes: true,
      attributeFilter: ["slot"],
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#activateFromRow);
    this.#observer?.disconnect();
    this.#observer = null;
    this.#restoreSelectMenuAnchor();
    this.#clearSliderOcclusionTarget();
    this.#clearLabelAssociation();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#queueSync();
  }

  get input() {
    return this.querySelector(':scope > [slot="input"]');
  }

  /** Focus the slotted input, including its first native focus target as a fallback. */
  focus(options) {
    const input = this.input;
    if (!(input instanceof HTMLElement)) return;
    input.focus(options);
    if (
      document.activeElement !== input &&
      !input.contains(document.activeElement) &&
      !input.matches(":focus-within")
    ) {
      input.querySelector("input, select, textarea, button")?.focus(options);
    }
  }

  /** Activate the slotted input, falling back to focus when it has no activate method. */
  activate(options) {
    this.#syncSelectMenuAnchor();
    const input = this.input;
    if (!(input instanceof HTMLElement)) return;
    if (typeof input.activate === "function") {
      return input.activate(options);
    }
    this.focus();
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
    this.#syncSelectMenuAnchor();
    this.#syncSliderOcclusionTarget();
  }

  #syncSliderOcclusionTarget() {
    const input = this.input;
    const slider =
      this.getAttribute("activation") === "row" &&
      input?.localName.startsWith("fig-input-slider")
        ? input
        : null;

    if (this.#managedOcclusionSlider && this.#managedOcclusionSlider !== slider) {
      this.#clearSliderOcclusionTarget();
    }
    if (!(slider instanceof HTMLElement)) return;

    const setManagedTargets =
      slider[FIG_INPUT_SLIDER_MANAGED_OCCLUSION_TARGETS];
    if (typeof setManagedTargets !== "function") {
      if (!this.#waitingForSliderDefinition) {
        this.#waitingForSliderDefinition = true;
        customElements.whenDefined(slider.localName).then(() => {
          this.#waitingForSliderDefinition = false;
          if (this.isConnected) this.#queueSync();
        });
      }
      return;
    }

    this.#managedOcclusionSlider = slider;
    setManagedTargets.call(
      slider,
      this,
      this.#labelElement ? [this.#labelElement] : [],
    );
  }

  #clearSliderOcclusionTarget() {
    const slider = this.#managedOcclusionSlider;
    const setManagedTargets =
      slider?.[FIG_INPUT_SLIDER_MANAGED_OCCLUSION_TARGETS];
    if (typeof setManagedTargets === "function") {
      setManagedTargets.call(slider, this, []);
    }
    this.#managedOcclusionSlider = null;
  }

  #syncSelectMenuAnchor() {
    const input = this.input;
    const select =
      this.getAttribute("activation") === "row" &&
      input?.matches("fig-select")
        ? input
        : null;

    if (this.#menuAnchoredSelect !== select) {
      this.#restoreSelectMenuAnchor();
    }
    if (!(select instanceof HTMLElement) || this.#menuAnchoredSelect === select) {
      return;
    }
    if (!("menuAnchor" in select)) {
      if (!this.#waitingForSelectDefinition) {
        this.#waitingForSelectDefinition = true;
        customElements.whenDefined("fig-select").then(() => {
          this.#waitingForSelectDefinition = false;
          if (this.isConnected) this.#queueSync();
        });
      }
      return;
    }
    if (select.menuAnchor === this) return;

    this.#previousSelectMenuAnchor = select.menuAnchor;
    this.#menuAnchoredSelect = select;
    select.menuAnchor = this;
  }

  #restoreSelectMenuAnchor() {
    const select = this.#menuAnchoredSelect;
    if (select?.menuAnchor === this) {
      select.menuAnchor = this.#previousSelectMenuAnchor;
    }
    this.#menuAnchoredSelect = null;
    this.#previousSelectMenuAnchor = null;
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
    if (this.getAttribute("activation") === "row") return;
    this.focus();
    const input = this.input;
    if (!(input instanceof HTMLElement)) return;
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

  #activateFromRow = (event) => {
    if (
      this.getAttribute("activation") !== "row" ||
      event.defaultPrevented
    ) {
      return;
    }

    const blockedSlots = new Set(["input", "leading", "trailing"]);
    const fromBlockedSlot = event.composedPath().some(
      (node) =>
        node instanceof Element &&
        node.parentElement === this &&
        blockedSlots.has(node.getAttribute("slot")),
    );
    if (fromBlockedSlot) return;

    event.preventDefault();
    event.stopPropagation();
    this.activate();
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
