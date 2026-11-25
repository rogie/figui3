/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import "./fig-button.js";
import "./fig-icon.js";
import "./fig-tooltip.js";
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figBooleanAttribute,
  figCreateElement,
  figDefineElement,
} from "../runtime/index.js";

/**
 * An inline label with optional leading and trailing content.
 * @attr {string} label - The chip text
 * @attr {string} size - "medium" (default, 24px) or "small" (20px)
 * @attr {string} variant - "default", "secondary", or "variable"
 * @attr {boolean} removable - Show a remove button
 * @attr {boolean} selected - Show selected outline and text
 * @fires change - User toggled selection; detail contains the new selected state
 * @fires remove - Cancelable event dispatched before removing the chip
 */
class FigChip extends HTMLElement {
  static observedAttributes = ["label", "removable", "selected"];

  #label;
  #selection;
  #removeButton;
  #removeTooltip;

  connectedCallback() {
    if (!this.#label) {
      this.#label = figCreateElement("label", { part: "label" });
      this.#selection = figCreateElement("span", {
        part: "selection",
        role: "button",
        tabindex: "0",
      }, this.#label);
      this.#selection.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (event.key === "Enter" && !event.repeat) this.#toggleSelection();
      });
      this.#selection.addEventListener("keyup", (event) => {
        if (event.key !== " ") return;
        event.preventDefault();
        this.#toggleSelection();
      });
      this.addEventListener("click", (event) => {
        for (const node of event.composedPath()) {
          if (node === this) break;
          if (node !== this.#selection && node.matches?.(
            'button, a[href], input, select, textarea, fig-button, fig-chip, [role="button"]',
          )) return;
        }
        if (!event.defaultPrevented) this.#toggleSelection();
      });
      this.attachShadow({ mode: "open" }).append(
        figCreateElement("slot", { name: "leading" }),
        this.#selection,
        figCreateElement("slot", { name: "trailing" }),
        figCreateElement("slot", { name: "remove-button" }),
      );
    }
    this.#sync();
  }

  attributeChangedCallback(name) {
    if (!this.isConnected || !this.#label) return;
    if (name === "selected") this.#syncSelection();
    else this.#sync();
  }

  get label() {
    return this.getAttribute("label") ?? "";
  }
  set label(value) {
    this.setAttribute("label", value);
  }

  focus(options) {
    this.#selection?.focus(options);
  }

  get size() {
    return this.getAttribute("size") === "small" ? "small" : "medium";
  }
  set size(value) {
    this.setAttribute("size", value);
  }

  get removable() {
    return figBooleanAttribute(this, "removable");
  }
  set removable(value) {
    if (value && value !== "false") this.setAttribute("removable", "");
    else this.removeAttribute("removable");
  }

  get selected() {
    return figBooleanAttribute(this, "selected");
  }
  set selected(value) {
    if (value && value !== "false") this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }

  #toggleSelection() {
    this.selected = !this.selected;
    this.dispatchEvent(new CustomEvent("change", {
      detail: { selected: this.selected },
      bubbles: true,
      composed: true,
    }));
  }

  #syncSelection() {
    this.#selection.setAttribute("aria-pressed", String(this.selected));
  }

  #sync() {
    this.#label.textContent = this.label;
    this.#selection.setAttribute("aria-label", this.label || "Chip");
    this.#syncSelection();
    if (!this.removable) {
      this.#removeTooltip?.remove();
      return;
    }

    if (!this.#removeButton) {
      this.#removeButton = figCreateElement("fig-button", {
        variant: "ghost",
        icon: true,
      }, createFigIcon("close", { size: "small" }));
      this.#removeTooltip = figCreateElement("fig-tooltip", {
        slot: "remove-button",
        text: "Remove",
      }, this.#removeButton);
      this.#removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const shouldRemove = this.dispatchEvent(new CustomEvent("remove", {
          bubbles: true,
          composed: true,
          cancelable: true,
        }));
        if (shouldRemove) this.remove();
      });
    }

    this.#removeButton.setAttribute("aria-label", this.label ? `Remove ${this.label}` : "Remove chip");
    if (this.#removeTooltip.parentNode !== this) this.append(this.#removeTooltip);
  }
}

figDefineElement("fig-chip", FigChip);

export { FigChip };
