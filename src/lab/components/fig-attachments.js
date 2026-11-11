/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/

import { HTMLElement, figLabDefineElement } from "../runtime/dom.js";

/* Wrapping presentation container for one or more attachments. */
class FigAttachments extends HTMLElement {
  #observer = null;

  connectedCallback() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "list");
      this.setAttribute("data-generated-role", "");
    }
    this.#syncItems();
    if (!this.#observer) {
      this.#observer = new MutationObserver(() => this.#syncItems());
      this.#observer.observe(this, { childList: true });
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #syncItems() {
    for (const attachment of this.querySelectorAll(":scope > fig-attachment")) {
      if (!attachment.hasAttribute("role")) {
        attachment.setAttribute("role", "listitem");
        attachment.setAttribute("data-generated-role", "");
      }
    }
  }
}
figLabDefineElement("fig-attachments", FigAttachments);
