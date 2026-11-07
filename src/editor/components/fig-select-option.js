/*
PolyForm Shield License 1.0.0
https://polyformproject.org/licenses/shield/1.0.0
Required Notice: Copyright (c) 2026 Rogie King
Licensor Line of Business: FigUI3 editor and lab (Figma-style plugin UI kit)
*/
import {
  HTMLElement,
  CustomEvent,
  figEditorDefineElement,
  figEditorGetOverlayRoot,
  figEditorEscapeAttribute,
  figEditorBooleanAttribute,
  figEditorUniqueId,
  figEditorCssUrl,
  figEditorLooksLikeVideoUrl,
  figEditorCreateIcon,
  figEditorAppendChildren,
  figEditorSetAttributes,
  figEditorCreateElement,
  FIG_EDITOR_SVG_NAMESPACE,
  figEditorCreateSvgElement,
  figEditorCreateOverflowButtons,
  figEditorSyncOverflowState,
  figEditorScrollOverflowPage,
  figEditorScrollElementToCenter,
} from "../runtime/helpers.js";
import { figSelectOptionEnsureCheckmark } from "../runtime/select.js";

/**
 * A selectable option for fig-select.
 * Supports light-DOM slots: `slot="prepend"` (leading) and `slot="append"` (trailing).
 * Use the `label` attribute for the closed-trigger label when option content is rich.
 *
 * @attr {string} value - Option value
 * @attr {string} label - Optional display label for the select trigger
 * @attr {boolean} disabled - Whether the option is disabled
 * @attr {boolean} selected - Whether the option is selected
 */
class FigSelectOption extends HTMLElement {
  static get observedAttributes() {
    return ["value", "disabled", "selected", "label"];
  }

  get value() {
    const attr = this.getAttribute("value");
    if (attr !== null) return attr;
    return (this.textContent || "").trim();
  }

  set value(val) {
    if (val === null || val === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(val));
    }
  }

  get disabled() {
    return figEditorBooleanAttribute(this, "disabled");
  }

  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }

  get selected() {
    return figEditorBooleanAttribute(this, "selected");
  }

  set selected(val) {
    if (val) this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "option");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    figSelectOptionEnsureCheckmark(this);
    this.#syncDisabled();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "disabled") this.#syncDisabled();
  }

  #syncDisabled() {
    const disabled = this.disabled;
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
      if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    }
  }
}
figEditorDefineElement("fig-select-option", FigSelectOption);

export { FigSelectOption };
