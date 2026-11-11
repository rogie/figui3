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
 * Visual divider between content groups.
 * @attr {string} label - Optional group label shown in secondary text under the line.
 * @attr {string} direction - Orientation: "vertical" for a tall rule; default is horizontal.
 * @attr {boolean} sticky - Stick to the top of the nearest scrollport while scrolling.
 */
class FigSeparator extends HTMLElement {
  #scrollRoot = null;
  #resizeObserver = null;
  #labelObserver = null;
  #boundSyncStuck = this.#syncStuck.bind(this);

  static get observedAttributes() {
    return ["label", "direction", "sticky"];
  }

  get label() {
    return this.getAttribute("label") ?? "";
  }

  set label(value) {
    if (value == null || value === "") this.removeAttribute("label");
    else this.setAttribute("label", String(value));
  }

  connectedCallback() {
    this.#sync();
    this.#bindLabelObserver();
    this.#bindStuck();
  }

  disconnectedCallback() {
    this.#labelObserver?.disconnect();
    this.#labelObserver = null;
    this.#unbindStuck();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.#sync();
    if (name === "sticky") this.#bindStuck();
  }

  #sync() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "separator");
    }
    const direction = this.getAttribute("direction");
    if (direction === "vertical") {
      this.setAttribute("aria-orientation", "vertical");
    } else if (!this.hasAttribute("aria-orientation")) {
      this.setAttribute("aria-orientation", "horizontal");
    }
    const label = this.label.trim();
    const childLabels = Array.from(this.children).filter(
      (child) => child.localName === "label",
    );
    const authoredLabel = childLabels.find(
      (child) => !child.hasAttribute("data-fig-separator-generated"),
    );
    const generatedLabels = childLabels.filter((child) =>
      child.hasAttribute("data-fig-separator-generated"),
    );

    if (authoredLabel) {
      generatedLabels.forEach((child) => child.remove());
    } else if (label) {
      const generatedLabel =
        generatedLabels[0] ?? document.createElement("label");
      generatedLabels.slice(1).forEach((child) => child.remove());
      generatedLabel.setAttribute("data-fig-separator-generated", "");
      if (generatedLabel.textContent !== label) {
        generatedLabel.textContent = label;
      }
      if (!generatedLabel.parentElement) this.appendChild(generatedLabel);
    } else {
      generatedLabels.forEach((child) => child.remove());
    }

    const accessibleLabel = authoredLabel?.textContent?.trim() || label;
    if (accessibleLabel) this.setAttribute("aria-label", accessibleLabel);
    else this.removeAttribute("aria-label");
  }

  #bindLabelObserver() {
    this.#labelObserver?.disconnect();
    this.#labelObserver = new MutationObserver(() => this.#sync());
    this.#labelObserver.observe(this, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  #isSticky() {
    return this.hasAttribute("sticky") && this.getAttribute("sticky") !== "false";
  }

  #bindStuck() {
    this.#unbindStuck();
    if (!this.isConnected || !this.#isSticky()) {
      this.removeAttribute("stuck");
      return;
    }
    const root = figNearestScrollRoot(this);
    this.#scrollRoot = root;
    root?.addEventListener("scroll", this.#boundSyncStuck, { passive: true });
    this.#resizeObserver = new ResizeObserver(this.#boundSyncStuck);
    this.#resizeObserver.observe(this);
    if (root instanceof Element) this.#resizeObserver.observe(root);
    requestAnimationFrame(this.#boundSyncStuck);
  }

  #unbindStuck() {
    this.#scrollRoot?.removeEventListener?.("scroll", this.#boundSyncStuck);
    this.#scrollRoot = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  #syncStuck() {
    if (!this.#isSticky() || !this.#scrollRoot) {
      this.removeAttribute("stuck");
      return;
    }
    const stickyTop = parseFloat(getComputedStyle(this).top) || 0;
    const root = this.#scrollRoot;
    const rootRect =
      root === document.scrollingElement || root === document.documentElement
        ? { top: 0 }
        : root.getBoundingClientRect();
    const paddingTop =
      root instanceof Element ? parseFloat(getComputedStyle(root).paddingTop) || 0 : 0;
    const line = rootRect.top + paddingTop + stickyTop;
    this.toggleAttribute("stuck", this.getBoundingClientRect().top <= line + 1);
  }
}
figDefineElement("fig-separator", FigSeparator);

function figNearestScrollRoot(el) {
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    const y = style.overflowY || style.overflow;
    if (y && y !== "visible" && y !== "clip") return node;
    node = node.parentElement;
  }
  return document.scrollingElement;
}

// Backwards-compatible alias. Custom element constructors cannot be registered
// under multiple tag names, so the legacy tag uses an otherwise empty subclass.

export { FigSeparator };
