/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figBooleanAttribute,
  figDefineElement,
} from "../runtime/index.js";

/**
 * <fig-card> — Media card with selection chrome and truncated labels.
 *
 * Composes a generated `fig-image` when `src` is set. Attribute-driven labels
 * render in a generated `fig-footer`; authored footers remain untouched.
 * Selection is attribute-only (`selected`); apps own toggle/group logic.
 *
 * @attr {string} src - Image URL forwarded to generated fig-image
 * @attr {string} alt - Alt text forwarded to generated fig-image
 * @attr {string} label - Card title text (preferred over `text`)
 * @attr {string} text - Alias for `label`
 * @attr {string} sublabel - Secondary one-line text under the label
 * @attr {boolean} selected - Selected chrome (CSS only)
 * @attr {boolean} disabled - Dim + non-interactive
 * @attr {boolean} full - Stretch to available width (CSS; default width is already 100%)
 * @attr {string} size - Set to `large` for spacer-2 card padding and spacer-1 label spacing
 * @attr {string} direction - `vertical` (default) or `horizontal` list layout
 * @attr {string} aspect-ratio - Forwarded to fig-image (default `1/1`)
 * @attr {string} fit - Forwarded to fig-image (default `contain`)
 * @attr {string} label-line-clamp - `1` (default) or `2`
 * @attr {string} label-overflow - `ellipsis` (default) or horizontal `fade`
 */
class FigCard extends HTMLElement {
  static get observedAttributes() {
    return [
      "src",
      "alt",
      "label",
      "text",
      "sublabel",
      "selected",
      "disabled",
      "full",
      "size",
      "direction",
      "aspect-ratio",
      "fit",
      "label-line-clamp",
      "label-overflow",
    ];
  }

  #footerEl = null;
  #imageEl = null;
  #labelEl = null;
  #sublabelEl = null;
  #usesAuthoredMedia = false;
  #mediaObserver = new MutationObserver((mutations) => {
    const authoredMediaChanged = mutations.some((mutation) =>
      [...mutation.addedNodes, ...mutation.removedNodes].some(
        (node) =>
          node instanceof Element &&
          (node.matches(
            "fig-image:not([data-generated]), fig-media:not([data-generated]), fig-preview:not([data-generated]), fig-footer:not([data-generated])",
          ) ||
            node.querySelector(
              "fig-image:not([data-generated]), fig-media:not([data-generated]), fig-preview:not([data-generated]), fig-footer:not([data-generated])",
            )),
      ),
    );
    if (!authoredMediaChanged || !this.isConnected) return;
    this.#ensureStructure();
    this.#sync();
  });

  connectedCallback() {
    this.#mediaObserver.observe(this, { childList: true, subtree: true });
    this.#ensureStructure();
    this.#sync();
  }

  disconnectedCallback() {
    this.#mediaObserver.disconnect();
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;
    this.#ensureStructure();
    this.#sync();
  }

  #labelText() {
    return this.getAttribute("label") ?? this.getAttribute("text") ?? "";
  }

  #sublabelText() {
    return this.getAttribute("sublabel") ?? "";
  }

  #lineClamp() {
    const raw = this.getAttribute("label-line-clamp");
    return raw === "2" ? "2" : "1";
  }

  #usesGeneratedMedia() {
    return Boolean(this.getAttribute("src"));
  }

  #findAuthoredMedia() {
    return this.querySelector(
      ":scope > fig-image:not([data-generated]), :scope > fig-media:not([data-generated]), :scope > fig-preview:not([data-generated])",
    );
  }

  #unwrapLegacyStructure() {
    this.querySelectorAll(":scope > .fig-card-link").forEach((wrapper) => {
      wrapper.querySelectorAll(":scope > .fig-card-media").forEach((mediaWrap) => {
        while (mediaWrap.firstChild) {
          wrapper.insertBefore(mediaWrap.firstChild, mediaWrap);
        }
        mediaWrap.remove();
      });
      while (wrapper.firstChild) {
        this.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    });
  }

  #ensureStructure() {
    this.#unwrapLegacyStructure();
    if (!this.#usesGeneratedMedia()) {
      this.#ensureManualStructure();
      return;
    }

    const authored = this.#findAuthoredMedia();
    this.#usesAuthoredMedia = Boolean(authored);

    if (authored) {
      this
        .querySelectorAll(":scope > [data-generated]:not(fig-footer)")
        .forEach((el) => el.remove());
      this.#imageEl = null;
    }

    if (!this.#usesAuthoredMedia) {
      this.#imageEl =
        this.querySelector(":scope > fig-image[data-generated]") ||
        null;
      if (!this.#imageEl) {
        this
          .querySelectorAll(
            ":scope > fig-image, :scope > fig-media, :scope > fig-preview",
          )
          .forEach((el) => {
            if (el.hasAttribute("data-generated")) el.remove();
          });
        this.#imageEl = document.createElement("fig-image");
        this.#imageEl.setAttribute("data-generated", "");
        this.#imageEl.setAttribute("full", "");
        this.#imageEl.setAttribute("size", "auto");
        this.prepend(this.#imageEl);
      }
    }

    const hasGeneratedLabels = Boolean(
      this.#labelText() || this.#sublabelText(),
    );
    if (!hasGeneratedLabels) {
      this.querySelector(":scope > fig-footer[data-generated]")?.remove();
      this.#footerEl = null;
      this.#labelEl = null;
      this.#sublabelEl = null;
      return;
    }

    if (!this.#footerEl || !this.#footerEl.isConnected) {
      this.#footerEl = this.querySelector(
        ":scope > fig-footer[data-generated]",
      );
      if (!this.#footerEl) {
        this.#footerEl = document.createElement("fig-footer");
        this.#footerEl.setAttribute("data-generated", "");
        this.appendChild(this.#footerEl);
      }
    }

    if (!this.#labelEl || !this.#labelEl.isConnected) {
      this.#labelEl = this.#footerEl.querySelector(
        ":scope > .fig-card-label[data-generated]",
      );
      if (!this.#labelEl) {
        this.#labelEl = document.createElement("label");
        this.#labelEl.className = "fig-card-label";
        this.#labelEl.setAttribute("data-generated", "");
        this.#footerEl.appendChild(this.#labelEl);
      }
    }

    if (!this.#sublabelEl || !this.#sublabelEl.isConnected) {
      this.#sublabelEl = this.#footerEl.querySelector(
        ":scope > .fig-card-sublabel[data-generated]",
      );
      if (!this.#sublabelEl) {
        this.#sublabelEl = document.createElement("label");
        this.#sublabelEl.className = "fig-card-sublabel";
        this.#sublabelEl.setAttribute("data-generated", "");
        this.#labelEl.after(this.#sublabelEl);
      }
    }
  }

  #ensureManualStructure() {
    this.#unwrapLegacyStructure();
    this.querySelectorAll(":scope > [data-generated]").forEach((element) =>
      element.remove(),
    );

    this.#imageEl = null;
    this.#usesAuthoredMedia = true;

    this.#footerEl = null;
    this.#labelEl = null;
    this.#sublabelEl = null;

    if (!this.#labelText() && !this.#sublabelText()) return;

    this.#footerEl = document.createElement("fig-footer");
    this.#footerEl.setAttribute("data-generated", "");
    this.#labelEl = document.createElement("label");
    this.#labelEl.className = "fig-card-label";
    this.#labelEl.setAttribute("data-generated", "");
    this.#footerEl.appendChild(this.#labelEl);

    const sublabel = this.#sublabelText();
    this.#sublabelEl = null;
    if (sublabel) {
      this.#sublabelEl = document.createElement("label");
      this.#sublabelEl.className = "fig-card-sublabel";
      this.#sublabelEl.setAttribute("data-generated", "");
      this.#footerEl.appendChild(this.#sublabelEl);
    }
    this.appendChild(this.#footerEl);
  }

  #syncLabelOverflow() {
    const fade = this.getAttribute("label-overflow") === "fade";
    this.querySelectorAll(
      ":scope > fig-footer > :is(.fig-card-label, .fig-card-sublabel)",
    ).forEach((element) => {
      element.classList.toggle("fig-overflow-fade", fade);
      element.classList.toggle("fig-overflow-fade-horizontal", fade);
    });
  }

  #sync() {
    if (!this.#usesGeneratedMedia()) {
      this.#syncManual();
      return;
    }

    const disabled = figBooleanAttribute(this, "disabled");
    const label = this.#labelText();
    const sublabel = this.#sublabelText();
    const clamp = this.#lineClamp();

    this.style.setProperty("--fig-card-label-line-clamp", clamp);

    this.setAttribute("role", "group");
    const ariaLabel = [label, sublabel].filter(Boolean).join(", ");
    if (ariaLabel) {
      this.setAttribute("aria-label", ariaLabel);
    } else {
      this.removeAttribute("aria-label");
    }

    if (disabled) {
      this.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
    }

    if (this.#imageEl && !this.#usesAuthoredMedia) {
      const src = this.getAttribute("src");
      const altAttr = this.getAttribute("alt");
      const aspect = this.getAttribute("aspect-ratio") || "1/1";
      const fit = this.getAttribute("fit") || "contain";
      const alt = altAttr != null ? altAttr : "";

      if (src) this.#imageEl.setAttribute("src", src);
      else this.#imageEl.removeAttribute("src");
      this.#imageEl.setAttribute("alt", alt);
      this.#imageEl.setAttribute("aspect-ratio", aspect);
      this.#imageEl.setAttribute("fit", fit);
      this.#imageEl.setAttribute("full", "");
      this.#imageEl.setAttribute("size", "auto");
    }

    if (this.#labelEl) {
      this.#labelEl.textContent = label;
      this.#labelEl.hidden = !label;
    }

    if (this.#sublabelEl) {
      this.#sublabelEl.textContent = sublabel;
      this.#sublabelEl.hidden = !sublabel;
    }

    if (this.#footerEl) {
      this.#footerEl.hidden = !label && !sublabel;
    }
    this.#syncLabelOverflow();
  }

  #syncManual() {
    const disabled = figBooleanAttribute(this, "disabled");
    const label = this.#labelText();
    const sublabel = this.#sublabelText();

    this.style.setProperty(
      "--fig-card-label-line-clamp",
      this.#lineClamp(),
    );
    this.setAttribute("role", "group");
    const ariaLabel = [label, sublabel].filter(Boolean).join(", ");
    if (ariaLabel) this.setAttribute("aria-label", ariaLabel);
    else this.removeAttribute("aria-label");
    if (disabled) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");

    if (this.#labelEl) {
      this.#labelEl.textContent = label;
      this.#labelEl.hidden = !label;
    }
    if (this.#sublabelEl) this.#sublabelEl.textContent = sublabel;
    this.#syncLabelOverflow();
  }
}
figDefineElement("fig-card", FigCard);

export { FigCard };
