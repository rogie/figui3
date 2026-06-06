// FigLayer
class FigLayer extends HTMLElement {
  static get observedAttributes() {
    return ["open", "visible", "disabled"];
  }

  #chevron = null;
  #boundHandleChevronClick = null;

  connectedCallback() {
    this.#syncA11y();
    requestAnimationFrame(() => {
      this.#injectChevron();
      this.#syncA11y();
    });
  }

  disconnectedCallback() {
    if (this.#chevron && this.#boundHandleChevronClick) {
      this.#chevron.removeEventListener("click", this.#boundHandleChevronClick);
      this.#chevron.removeEventListener("keydown", this.#handleChevronKeyDown);
    }
  }

  #injectChevron() {
    const row = this.querySelector(":scope > .fig-layer-row");
    if (!row) return;

    if (row.querySelector(".fig-layer-chevron")) return;

    this.#chevron = document.createElement("span");
    this.#chevron.className = "fig-layer-chevron";
    row.prepend(this.#chevron);

    this.#boundHandleChevronClick = this.#handleChevronClick.bind(this);
    this.#chevron.addEventListener("click", this.#boundHandleChevronClick);
    this.#chevron.addEventListener("keydown", this.#handleChevronKeyDown);
    this.#syncA11y();
  }

  #handleChevronClick(e) {
    if (this.disabled) return;
    e.stopPropagation();
    this.open = !this.open;
  }

  #handleChevronKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    this.#handleChevronClick(e);
  };

  #syncA11y() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "treeitem");
    if (!this.hasAttribute("tabindex")) {
      this.setAttribute("tabindex", this.disabled ? "-1" : "0");
    }
    this.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.setAttribute("aria-hidden", this.visible ? "false" : "true");
    this.setAttribute("aria-disabled", this.disabled ? "true" : "false");

    if (!this.#chevron) return;
    this.#chevron.setAttribute("role", "button");
    this.#chevron.setAttribute("tabindex", this.disabled ? "-1" : "0");
    this.#chevron.setAttribute(
      "aria-label",
      this.open ? "Collapse layer" : "Expand layer",
    );
    this.#chevron.setAttribute("aria-expanded", this.open ? "true" : "false");
    this.#chevron.setAttribute("aria-disabled", this.disabled ? "true" : "false");
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    const oldValue = this.open;
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
    if (oldValue !== value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: value },
          bubbles: true,
        }),
      );
    }
  }

  get visible() {
    const attr = this.getAttribute("visible");
    return attr !== "false";
  }

  set visible(value) {
    const oldValue = this.visible;
    if (value) {
      this.setAttribute("visible", "true");
    } else {
      this.setAttribute("visible", "false");
    }
    if (oldValue !== value) {
      this.dispatchEvent(
        new CustomEvent("visibilitychange", {
          detail: { visible: value },
          bubbles: true,
        }),
      );
    }
  }

  get disabled() {
    const attr = this.getAttribute("disabled");
    return attr !== null && attr !== "false";
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "open") {
      this.#syncA11y();
      const isOpen = newValue !== null && newValue !== "false";
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: isOpen },
          bubbles: true,
        }),
      );
    }

    if (name === "visible") {
      this.#syncA11y();
      const isVisible = newValue !== "false";
      this.dispatchEvent(
        new CustomEvent("visibilitychange", {
          detail: { visible: isVisible },
          bubbles: true,
        }),
      );
    }

    if (name === "disabled") {
      this.#syncA11y();
    }
  }
}

if (!customElements.get("fig-layer")) {
  customElements.define("fig-layer", FigLayer);
}
