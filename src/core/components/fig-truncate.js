/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
  figNextFrame,
} from "../runtime/index.js";
import { FigTooltip } from "./fig-tooltip.js";

/* Text Truncation */
class FigTruncate extends HTMLElement {
  static observedAttributes = ["position", "tail", "tooltip"];

  #originalText = null;
  #boundEnter = null;
  #boundLeave = null;
  #observer = null;

  connectedCallback() {
    this.#originalText = this.textContent;
    this.#observer ??= new MutationObserver(() => {
      this.#originalText = this.textContent;
      this.#render();
    });
    this.#observe();
    figNextFrame(this, () => {
      this.#render();
      this.#teardownTooltip();
      this.#setupTooltip();
    });
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#teardownTooltip();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (this.#originalText === null) return;
    if (name === "tooltip") {
      this.#teardownTooltip();
      if (this.isConnected) this.#setupTooltip();
      return;
    }
    this.#render();
  }

  #observe() {
    this.#observer?.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  #render() {
    this.#observer?.disconnect();
    this.#renderContent();
    if (this.isConnected) this.#observe();
  }

  #renderContent() {
    const position = this.getAttribute("position") || "right";
    const text = this.#originalText || "";
    if (position === "middle") {
      const tail = this.getAttribute("tail");
      let splitIndex;
      if (tail) {
        const idx = text.lastIndexOf(tail);
        splitIndex = idx > 0 ? idx : Math.ceil(text.length / 2);
      } else {
        splitIndex = Math.ceil(text.length / 2);
      }
      this.replaceChildren();
      const startSpan = document.createElement("span");
      startSpan.className = "start";
      startSpan.textContent = text.slice(0, splitIndex);
      const endSpan = document.createElement("span");
      endSpan.className = "end";
      endSpan.textContent = text.slice(splitIndex);
      this.appendChild(startSpan);
      this.appendChild(endSpan);
    } else {
      this.textContent = text;
    }
  }

  #setupTooltip() {
    if (
      !this.hasAttribute("tooltip") ||
      this.getAttribute("tooltip") === "false"
    )
      return;
    this.#boundEnter = () => {
      if (!this.#isTruncated()) return;
      FigTooltip.show(this, this.#originalText);
    };
    this.#boundLeave = () => {
      FigTooltip.hide(this);
    };
    this.addEventListener("pointerenter", this.#boundEnter);
    this.addEventListener("pointerleave", this.#boundLeave);
  }

  #isTruncated() {
    const overflows = (el) => el.scrollWidth > el.clientWidth;
    if (overflows(this)) return true;
    return [...this.querySelectorAll(":scope > .start, :scope > .end")].some(
      overflows,
    );
  }

  #teardownTooltip() {
    if (this.#boundEnter)
      this.removeEventListener("pointerenter", this.#boundEnter);
    if (this.#boundLeave)
      this.removeEventListener("pointerleave", this.#boundLeave);
    this.#boundEnter = null;
    this.#boundLeave = null;
    FigTooltip.hide(this);
  }
}
figDefineElement("fig-truncate", FigTruncate);

export { FigTruncate };
