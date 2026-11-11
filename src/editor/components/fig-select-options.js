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
/** Light-DOM panel wrapper projected into fig-select's popup; owns overflow buttons. */
class FigSelectOptions extends HTMLElement {
  #navStart = null;
  #navEnd = null;
  #resizeObserver = null;
  #mutationObserver = null;
  #boundSyncOverflow = this.syncOverflow.bind(this);

  connectedCallback() {
    if (!this.hasAttribute("slot")) this.setAttribute("slot", "panel");
    this.#unwrapLegacyChooser();
    this.#ensureNavButtons();
    this.addEventListener("scroll", this.#boundSyncOverflow, { passive: true });
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => this.syncOverflow());
    this.#resizeObserver.observe(this);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver(() => {
      if (!this.isConnected) return;
      this.#ensureNavButtons();
      this.syncOverflow();
    });
    this.#mutationObserver.observe(this, { childList: true });
    requestAnimationFrame(() => this.syncOverflow());
  }

  disconnectedCallback() {
    this.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#removeNavButtons();
  }

  syncOverflow() {
    return figEditorSyncOverflowState(this, this, "y");
  }

  scrollToOption(option, behavior = "auto") {
    figEditorScrollElementToCenter(this, option, "y", behavior);
  }

  #unwrapLegacyChooser() {
    const chooser = this.querySelector(":scope > fig-chooser");
    if (!chooser) return;
    while (chooser.firstChild) {
      this.insertBefore(chooser.firstChild, chooser);
    }
    chooser.remove();
  }

  #ensureNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.contains(this.#navStart) &&
      this.contains(this.#navEnd)
    ) {
      this.#positionNavButtons();
      return;
    }
    this.#removeNavButtons();
    const buttons = figEditorCreateOverflowButtons({
      owner: "select",
      startLabel: "Scroll up",
      endLabel: "Scroll down",
      onStart: () => figEditorScrollOverflowPage(this, "y", -1),
      onEnd: () => figEditorScrollOverflowPage(this, "y", 1),
    });
    this.#navStart = buttons.start;
    this.#navEnd = buttons.end;
    this.#positionNavButtons();
  }

  #positionNavButtons() {
    if (this.firstElementChild !== this.#navStart) {
      this.prepend(this.#navStart);
    }
    if (this.lastElementChild !== this.#navEnd) {
      this.append(this.#navEnd);
    }
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.classList.remove("overflow-start", "overflow-end");
  }
}
figEditorDefineElement("fig-select-options", FigSelectOptions);

export { FigSelectOptions };
