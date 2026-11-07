/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figDefineElement,
  figUniqueId,
} from "../runtime/index.js";

// FigGroup
class FigGroup extends HTMLElement {
  static observedAttributes = [
    "name",
    "collapsible",
    "open",
    "compact",
    "chevron",
  ];

  #header = null;
  #chevron = null;
  #toggle = null;
  #compactHeader = null;
  #compactHeaderValue = null;

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    this.#removeToggleListeners();
  }

  #removeToggleListeners() {
    this.#chevron?.removeEventListener("click", this.#handleToggle);
    this.#toggle?.removeEventListener("click", this.#handleToggle);
    this.#toggle?.removeEventListener("keydown", this.#handleToggleKeyDown);
    if (this.#header) {
      this.#header.removeEventListener("click", this.#handleToggle);
      this.#header.removeEventListener("keydown", this.#handleToggleKeyDown);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (!this.isConnected) return;
    if (name === "open") {
      this.#syncExpanded();
      return;
    }
    this.#render();
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    const was = this.open;
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
    this.#syncExpanded();
    if (was !== !!value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: !!value },
          bubbles: true,
        }),
      );
    }
  }

  #syncExpanded() {
    if (this.hasAttribute("collapsible")) {
      this.#toggle?.setAttribute("aria-expanded", String(this.open));
    } else {
      this.#toggle?.removeAttribute("aria-expanded");
    }
  }

  #restoreHeaderCompact() {
    if (!this.#compactHeader) return;
    if (this.#compactHeaderValue === null) {
      this.#compactHeader.removeAttribute("compact");
    } else {
      this.#compactHeader.setAttribute("compact", this.#compactHeaderValue);
    }
    this.#compactHeader = null;
    this.#compactHeaderValue = null;
  }

  #syncHeaderCompact() {
    const compact =
      this.hasAttribute("compact") && this.getAttribute("compact") !== "false";
    if (!compact) {
      this.#restoreHeaderCompact();
      return;
    }
    if (this.#compactHeader !== this.#header) {
      this.#restoreHeaderCompact();
      this.#compactHeader = this.#header;
      this.#compactHeaderValue = this.#header?.getAttribute("compact") ?? null;
    }
    this.#header?.setAttribute("compact", "");
  }

  #handleToggle = (e) => {
    e.stopPropagation();
    this.open = !this.open;
  };

  #handleToggleKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    this.open = !this.open;
  };

  #render() {
    this.#removeToggleListeners();
    const isCollapsible = this.hasAttribute("collapsible");
    const nameAttr = this.getAttribute("name");
    const label = nameAttr || (isCollapsible ? "Group" : null);

    // Check if user supplied their own fig-header
    const userHeader = this.querySelector(
      ":scope > fig-header:not([data-generated])",
    );

    if (!label && !isCollapsible && !userHeader) {
      if (this.#header && this.#header.dataset.generated) {
        this.#restoreHeaderCompact();
        this.#header.remove();
        this.#header = null;
        this.#chevron = null;
        this.#toggle = null;
      }
      return;
    }

    if (userHeader) {
      this.querySelectorAll(":scope > fig-header[data-generated]").forEach(
        (header) => header.remove(),
      );
      this.#header = userHeader;
    } else if (!this.#header || !this.#header.dataset.generated) {
      this.#header = document.createElement("fig-header");
      this.#header.setAttribute("borderless", "");
      this.#header.dataset.generated = "true";
      this.prepend(this.#header);
    }
    this.#syncHeaderCompact();

    // Ensure h3 exists inside header
    let h3 = this.#header.querySelector("h3");
    if (!h3) {
      h3 = document.createElement("h3");
      this.#header.prepend(h3);
    }
    this.#toggle = h3;
    if (!h3.id) h3.id = figUniqueId();
    if (this.#header.dataset.generated) {
      h3.textContent = label;
    }
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-labelledby", h3.id);
    }

    if (isCollapsible) {
      let chevron = this.#header.querySelector(".fig-group-chevron");
      if (!chevron) {
        chevron = createFigIcon("chevron", {
          size: "small",
          className: "fig-group-chevron",
        });
      }
      const chevronAtEnd = this.getAttribute("chevron") === "end";
      chevron.setAttribute("size", chevronAtEnd ? "medium" : "small");
      if (chevronAtEnd) {
        if (h3.nextSibling !== chevron) {
          this.#header.insertBefore(chevron, h3.nextSibling);
        }
      } else if (h3.previousSibling !== chevron) {
        this.#header.insertBefore(chevron, h3);
      }
      this.#chevron = chevron;
      this.#header.removeAttribute("role");
      this.#header.removeAttribute("tabindex");
      this.#header.removeAttribute("aria-expanded");
      h3.setAttribute("role", "button");
      h3.setAttribute("tabindex", "0");
      h3.setAttribute("aria-expanded", String(this.open));
      h3.addEventListener("click", this.#handleToggle);
      h3.addEventListener("keydown", this.#handleToggleKeyDown);
      chevron.addEventListener("click", this.#handleToggle);

      if (!this.hasAttribute("open")) {
        this.setAttribute("open", "false");
        h3.setAttribute("aria-expanded", "false");
      }
    } else {
      h3.removeAttribute("role");
      h3.removeAttribute("tabindex");
      h3.removeAttribute("aria-expanded");
      this.#header.removeAttribute("role");
      this.#header.removeAttribute("tabindex");
      this.#header.removeAttribute("aria-expanded");
      if (this.#chevron) {
        this.#chevron.remove();
        this.#chevron = null;
      }
      this.removeAttribute("open");
    }
  }
}
figDefineElement("fig-group", FigGroup);

export { FigGroup };
