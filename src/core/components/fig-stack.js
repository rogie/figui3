/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/**
 * A layout primitive for horizontal, vertical, and grid stacks.
 * @element fig-stack
 * @attr {string} direction - "horizontal" (default), "vertical", or "grid"
 * @attr {string} gap - Spacer token ("0"–"6", "2-5", "half" → var(--spacer-*)) or any CSS length
 * @attr {string} align - Cross-axis alignment: "start", "center", "end", "stretch", "baseline"
 * @attr {string} justify - Main-axis alignment: "start", "center", "end", "between", "around", "stretch"
 * @attr {boolean} wrap - Wrap items onto multiple lines (flex directions only)
 * @attr {boolean} full - Fill the parent's width
 * @attr {string} columns - Grid only: column count (e.g. "3") or a grid-template-columns value
 * @attr {string} min-width - Grid only: minimum auto-fill column width (default 5rem)
 */
class FigStack extends HTMLElement {
  static get observedAttributes() {
    return ["gap", "columns", "min-width"];
  }

  connectedCallback() {
    this.#syncStyles();
  }

  attributeChangedCallback() {
    this.#syncStyles();
  }

  #syncStyles() {
    const gap = this.getAttribute("gap")?.trim();
    this.#setProperty(
      "--fig-stack-gap",
      gap && /^(\d+(-5)?|half)$/.test(gap) ? `var(--spacer-${gap})` : gap,
    );

    const columns = this.getAttribute("columns")?.trim();
    this.#setProperty(
      "--fig-stack-columns",
      columns && /^\d+$/.test(columns)
        ? `repeat(${columns}, minmax(0, 1fr))`
        : columns,
    );

    this.#setProperty(
      "--fig-stack-min-width",
      this.getAttribute("min-width")?.trim(),
    );
  }

  #setProperty(name, value) {
    if (value) this.style.setProperty(name, value);
    else this.style.removeProperty(name);
  }
}
figDefineElement("fig-stack", FigStack);

export { FigStack };
