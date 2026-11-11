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
 * A styled visual preview layer for arbitrary content such as images, canvas,
 * video, SVG, or custom rendered surfaces.
 * @attr {string} fit - CSS object-fit value for direct media children
 * @attr {string} aspect-ratio - CSS aspect-ratio value
 */
class FigPreview extends HTMLElement {
  static get observedAttributes() {
    return ["fit", "aspect-ratio"];
  }

  connectedCallback() {
    this.#syncFit();
    this.#syncAspectRatio();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "fit") this.#syncFit();
    if (name === "aspect-ratio") this.#syncAspectRatio();
  }

  #syncFit() {
    const fit = this.getAttribute("fit");
    if (fit) {
      this.style.setProperty("--fig-preview-fit", fit);
    } else {
      this.style.removeProperty("--fig-preview-fit");
    }
  }

  #syncAspectRatio() {
    const aspectRatio = this.getAttribute("aspect-ratio");
    if (aspectRatio) {
      this.style.setProperty("--fig-preview-aspect-ratio", aspectRatio);
    } else {
      this.style.removeProperty("--fig-preview-aspect-ratio");
    }
  }
}
figDefineElement("fig-preview", FigPreview);

export { FigPreview };
