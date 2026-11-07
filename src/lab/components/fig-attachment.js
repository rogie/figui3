/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

import {
  CustomEvent,
  HTMLElement,
  figLabBooleanAttribute,
  figLabDefineElement,
} from "../runtime/dom.js";

/**
 * A removable image attachment for compact prompt surfaces.
 *
 * @attr {string} src - Image preview URL.
 * @attr {string} name - Attachment name used for the tooltip and image alt text.
 * @attr {string} value - Optional application-owned attachment identifier.
 * @attr {boolean|string} removable - "false" hides the remove button.
 * @attr {boolean|string} disabled - Disables removal.
 * @fires remove - Cancelable request for the owning application to remove the attachment.
 */
class FigAttachment extends HTMLElement {
  #tooltip = null;
  #image = null;
  #fallback = null;
  #removeTooltip = null;
  #removeButton = null;
  #mediaImage = null;
  #boundHandleRemove = this.#handleRemove.bind(this);
  #boundHandleImageLoad = this.#handleImageLoad.bind(this);
  #boundHandleImageError = this.#handleImageError.bind(this);

  static get observedAttributes() {
    return ["src", "name", "value", "removable", "disabled"];
  }

  connectedCallback() {
    if (!this.#image) this.#initialize();
    this.#removeButton.removeEventListener("click", this.#boundHandleRemove);
    this.#removeButton.addEventListener("click", this.#boundHandleRemove);
    this.#bindMediaImage();
    this.#sync();
  }

  disconnectedCallback() {
    this.#removeButton?.removeEventListener("click", this.#boundHandleRemove);
    this.#unbindMediaImage();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#image) return;
    this.#sync();
  }

  #initialize() {
    this.#tooltip = document.createElement("fig-tooltip");
    this.#tooltip.className = "fig-attachment-tooltip";

    this.#image = document.createElement("fig-image");
    this.#image.setAttribute("aspect-ratio", "1/1");
    this.#image.setAttribute("fit", "cover");
    this.#image.setAttribute("full", "");

    this.#fallback = document.createElement("span");
    this.#fallback.className = "fig-attachment-fallback";
    this.#fallback.setAttribute("aria-hidden", "true");

    this.#removeTooltip = document.createElement("fig-tooltip");
    this.#removeTooltip.className = "fig-attachment-remove-tooltip";
    this.#removeTooltip.setAttribute("text", "Remove attachment");

    this.#removeButton = document.createElement("fig-button");
    this.#removeButton.className = "fig-attachment-remove";
    this.#removeButton.setAttribute("variant", "overlay");
    this.#removeButton.setAttribute("size", "small");
    this.#removeButton.setAttribute("icon", "");
    const closeIcon = document.createElement("fig-icon");
    closeIcon.setAttribute("name", "close");
    closeIcon.setAttribute("size", "small");
    this.#removeButton.append(closeIcon);
    this.#removeTooltip.append(this.#removeButton);

    this.#image.append(this.#fallback);
    this.#tooltip.append(this.#image);
    this.replaceChildren(this.#tooltip, this.#removeTooltip);

    this.#removeButton.addEventListener("click", this.#boundHandleRemove);
    this.#bindMediaImage();
  }

  #bindMediaImage() {
    const mediaImage = this.#image?.mediaEl;
    if (!mediaImage || mediaImage === this.#mediaImage) return;
    this.#unbindMediaImage();
    this.#mediaImage = mediaImage;
    this.#mediaImage.addEventListener("load", this.#boundHandleImageLoad);
    this.#mediaImage.addEventListener("error", this.#boundHandleImageError);
  }

  #unbindMediaImage() {
    if (!this.#mediaImage) return;
    this.#mediaImage.removeEventListener("load", this.#boundHandleImageLoad);
    this.#mediaImage.removeEventListener("error", this.#boundHandleImageError);
    this.#mediaImage = null;
  }

  #sync() {
    const src = this.getAttribute("src") || "";
    const name = this.getAttribute("name") || "Attachment";
    const removable =
      !this.hasAttribute("removable") || figLabBooleanAttribute(this, "removable");
    const disabled = figLabBooleanAttribute(this, "disabled");

    this.#tooltip.setAttribute("text", name);
    this.#image.setAttribute("alt", name);
    if (src) {
      this.#image.setAttribute("src", src);
    } else {
      this.#image.removeAttribute("src");
    }
    this.#bindMediaImage();

    this.#fallback.textContent = this.#fallbackLabel(name);
    this.#removeButton.hidden = !removable;
    this.#removeButton.toggleAttribute("disabled", disabled);
    this.#removeButton.setAttribute("aria-label", `Remove ${name}`);
    this.toggleAttribute("data-fallback", !src);
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
    } else {
      this.removeAttribute("aria-disabled");
    }
  }

  #fallbackLabel(name) {
    const baseName = name.split(/[\\/]/).pop() || "";
    const dotIndex = baseName.lastIndexOf(".");
    const extension =
      dotIndex > 0 && dotIndex < baseName.length - 1
        ? baseName.slice(dotIndex + 1).toUpperCase()
        : "FILE";
    return extension.slice(0, 4);
  }

  #handleImageLoad() {
    if (this.getAttribute("src")) this.removeAttribute("data-fallback");
  }

  #handleImageError() {
    this.setAttribute("data-fallback", "");
  }

  #handleRemove(event) {
    event.stopPropagation();
    if (
      figLabBooleanAttribute(this, "disabled") ||
      (this.hasAttribute("removable") &&
        !figLabBooleanAttribute(this, "removable"))
    ) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("remove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: {
          value: this.getAttribute("value"),
          name: this.getAttribute("name") || "",
          src: this.getAttribute("src") || "",
          attachment: this,
        },
      }),
    );
  }
}
figLabDefineElement("fig-attachment", FigAttachment);
