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
  #resetMenu = null;
  #resetMenuItem = null;
  #resetInputObserver = null;
  #observedResetInput = null;
  #pendingContextMenuCleanup = null;

  connectedCallback() {
    this.addEventListener("click", this.#activateFromRow);
    this.addEventListener("contextmenu", this.#openResetMenu);
    this.addEventListener("input", this.#handleInputStateChange);
    this.addEventListener("change", this.#handleInputStateChange);
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
    this.removeEventListener("contextmenu", this.#openResetMenu);
    this.removeEventListener("input", this.#handleInputStateChange);
    this.removeEventListener("change", this.#handleInputStateChange);
    this.#cancelPendingContextMenu();
    this.#observer?.disconnect();
    this.#observer = null;
    this.#resetInputObserver?.disconnect();
    this.#resetInputObserver = null;
    this.#observedResetInput = null;
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

  /** Reset the slotted input through its resetToDefault contract. */
  resetToDefault() {
    const input = this.input;
    if (
      !(input instanceof HTMLElement) ||
      this.#inputIsDisabled(input) ||
      typeof input.resetToDefault !== "function"
    ) {
      return;
    }
    const result = input.resetToDefault();
    queueMicrotask(() => this.#syncResetMenuState());
    return result;
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
    this.#syncResetInputObserver();
    this.#syncResetMenuState();
  }

  #inputIsDisabled(input) {
    return (
      input?.disabled === true ||
      (input?.hasAttribute?.("disabled") &&
        input.getAttribute("disabled") !== "false")
    );
  }

  #ensureResetMenu() {
    let menu = this.querySelector(
      ':scope > fig-menu[data-fig-property-reset-menu]',
    );
    if (!(menu instanceof HTMLElement)) {
      menu = document.createElement("fig-menu");
      menu.setAttribute("position", "bottom left");
      menu.setAttribute("data-fig-property-reset-menu", "");

      const item = document.createElement("fig-menu-item");
      item.setAttribute("value", "reset-to-default");
      item.textContent = "Reset to default";
      menu.append(item);
      this.append(menu);
    }

    if (this.#resetMenu !== menu) {
      this.#resetMenu?.removeEventListener(
        "change",
        this.#handleResetMenuChange,
      );
      this.#resetMenu = menu;
    }
    this.#resetMenu.removeEventListener(
      "change",
      this.#handleResetMenuChange,
    );
    this.#resetMenu.addEventListener("change", this.#handleResetMenuChange);
    this.#resetMenuItem = this.#resetMenu.querySelector(
      ':scope > fig-menu-item[value="reset-to-default"]',
    );
    this.#syncResetMenuState();
  }

  #syncResetMenuState() {
    const input = this.input;
    const disabled =
      !(input instanceof HTMLElement) ||
      typeof input.resetToDefault !== "function" ||
      this.#inputIsDisabled(input) ||
      input.isDefault === true;
    this.#resetMenuItem?.toggleAttribute("disabled", disabled);
    this.#resetMenuItem?.setAttribute("aria-disabled", String(disabled));
  }

  #syncResetInputObserver() {
    const input = this.input;
    if (this.#observedResetInput === input) return;
    this.#resetInputObserver?.disconnect();
    this.#observedResetInput =
      input instanceof HTMLElement ? input : null;
    if (!this.#observedResetInput) return;
    this.#resetInputObserver ??= new MutationObserver(() =>
      this.#syncResetMenuState(),
    );
    this.#resetInputObserver.observe(this.#observedResetInput, {
      attributes: true,
      subtree: true,
      attributeFilter: [
        "disabled",
        "default",
        "default-checked",
        "default-x",
        "default-y",
        "default-z",
        "value",
        "checked",
        "indeterminate",
        "url",
        "filename",
        "x",
        "y",
        "z",
      ],
    });
  }

  #handleInputStateChange = () => {
    this.#syncResetMenuState();
  };

  #handleResetMenuChange = (event) => {
    if (event.detail?.value !== "reset-to-default") return;
    event.stopPropagation();
    this.resetToDefault();
    this.#syncResetMenuState();
  };

  #openResetMenu = (event) => {
    if (
      event.defaultPrevented ||
      this.#resetMenu?.contains(event.target) ||
      event.composedPath().includes(this.#resetMenu)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#ensureResetMenu();
    this.#syncResetMenuState();

    let { clientX: x, clientY: y } = event;
    if (x === 0 && y === 0) {
      const rect = this.getBoundingClientRect();
      x = rect.left + Math.min(rect.width, 16);
      y = rect.bottom;
    }
    this.#showResetMenuAfterPointerRelease(x, y, event.buttons === 0);
  };

  #showResetMenuAfterPointerRelease(x, y, openImmediately) {
    this.#cancelPendingContextMenu();
    const menu = this.#resetMenu;
    if (!menu || typeof menu.showAt !== "function") return;

    let timer = 0;
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerup", open, true);
      window.removeEventListener("pointercancel", cancel, true);
      if (this.#pendingContextMenuCleanup === cleanup) {
        this.#pendingContextMenuCleanup = null;
      }
    };
    const open = () => {
      cleanup();
      requestAnimationFrame(() => {
        if (this.isConnected && menu.isConnected) menu.showAt(x, y);
      });
    };
    const cancel = () => cleanup();

    this.#pendingContextMenuCleanup = cleanup;
    if (openImmediately) {
      open();
      return;
    }
    window.addEventListener("pointerup", open, { once: true, capture: true });
    window.addEventListener("pointercancel", cancel, {
      once: true,
      capture: true,
    });
    timer = window.setTimeout(open, 180);
  }

  #cancelPendingContextMenu() {
    this.#pendingContextMenuCleanup?.();
    this.#pendingContextMenuCleanup = null;
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
