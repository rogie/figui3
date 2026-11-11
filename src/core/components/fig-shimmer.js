/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

// FigShimmer
class FigShimmer extends HTMLElement {
  get durationPropertyName() {
    return this.localName === "fig-skeleton"
      ? "--fig-skeleton-duration"
      : "--fig-shimmer-duration";
  }

  connectedCallback() {
    const duration = this.getAttribute("duration");
    if (duration) {
      this.style.setProperty(this.durationPropertyName, duration);
    }
    this.#syncA11y();
  }

  static get observedAttributes() {
    return ["duration", "playing", "aria-label", "aria-labelledby"];
  }

  get playing() {
    return this.getAttribute("playing") !== "false";
  }

  set playing(value) {
    if (value) {
      this.removeAttribute("playing"); // Default is playing
    } else {
      this.setAttribute("playing", "false");
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "duration") {
      this.style.setProperty(this.durationPropertyName, newValue || "1.5s");
    }
    if (name === "playing" || name === "aria-label" || name === "aria-labelledby") {
      this.#syncA11y();
    }
  }

  #syncA11y() {
    const playing = this.playing;
    this.setAttribute("aria-busy", playing ? "true" : "false");
    if (this.hasAttribute("aria-label") || this.hasAttribute("aria-labelledby")) {
      if (!this.hasAttribute("role")) this.setAttribute("role", "status");
      this.removeAttribute("aria-hidden");
    } else {
      this.removeAttribute("role");
      this.setAttribute("aria-hidden", "true");
    }
  }
}
figDefineElement("fig-shimmer", FigShimmer);

export { FigShimmer };
