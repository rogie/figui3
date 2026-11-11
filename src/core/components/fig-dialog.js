/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLDialogElement,
  HTMLElement,
  createFigIcon,
  figDefineCustomizedBuiltIn,
  figGetHighestZIndex,
  figNextFrame,
  figUniqueId,
} from "../runtime/index.js";
import { figCreatePointerSession } from "../../shared/pointer-session.js";
import { FigTooltip } from "./fig-tooltip.js";

export function figEnsureAutoDialogHeader(host) {
  if (host.querySelector("fig-header[dialog-header]")) return;
  const header = document.createElement("fig-header");
  header.setAttribute("dialog-header", "");
  header.setAttribute("data-auto", "");
  const h3 = document.createElement("h3");
  h3.textContent = host.getAttribute("title") || "Dialog";
  const tooltip = document.createElement("fig-tooltip");
  tooltip.setAttribute("text", "Close");
  const btn = document.createElement("fig-button");
  btn.setAttribute("variant", "ghost");
  btn.setAttribute("icon", "");
  btn.setAttribute("aria-label", "Close dialog");
  btn.setAttribute("close-dialog", "");
  btn.appendChild(createFigIcon("close"));
  tooltip.appendChild(btn);
  header.appendChild(h3);
  header.appendChild(tooltip);
  host.prepend(header);
}

/* Dialog */
/**
 * A custom dialog element for modal and non-modal dialogs.
 * @attr {boolean} open - Whether the dialog is visible
 * @attr {boolean} modal - Whether the dialog should be modal
 * @attr {boolean} drag - Whether the dialog is draggable
 * @attr {string} handle - CSS selector for the drag handle element (e.g., "fig-header"). If not specified, the entire dialog is draggable when drag is enabled.
 * @attr {string} position - Position of the dialog (e.g., "bottom right", "top left", "center center")
 * @attr {string} title - Title text for the auto-generated header. If no fig-header[dialog-header] exists, one is prepended with this title and a close button.
 * @attr {boolean} resizable - Whether the dialog can be manually resized by the user (default: false)
 * @attr {string} closedby - Controls how the dialog can be dismissed: "any" (default, Escape + light dismiss), "closerequest" (Escape only), "none" (programmatic only)
 */
class FigDialog extends HTMLDialogElement {
  constructor() {
    super();
    this._figInit();
  }

  // Lazy initializer used by both the native constructor path and the
  // Safari `is="..."` polyfill (which prototype-swaps existing nodes
  // without invoking the constructor, so class fields are never set).
  _figInit() {
    if (this._figInitialized) return;
    this._figInitialized = true;
    this._isDragging = false;
    this._dragPending = false;
    this._dragStartPos = { x: 0, y: 0 };
    this._dragOffset = { x: 0, y: 0 };
    this._resizeObserver = null;
    this._mutationObserver = null;
    this._autoResizeRafId = 0;
    this._offset = 16;
    this._positionInitialized = false;
    this._dragThreshold = 3;
    this._dragSession = figCreatePointerSession({
      threshold: this._dragThreshold,
      listenerTarget: document,
      capture: true,
      onActivate: () => this._activateDrag(),
      onMove: ({ event }) => this._updateDrag(event),
      onFinish: ({ event }) => this._finishDrag(event),
    });
    this._boundPointerDown = this._handlePointerDown.bind(this);
    this._boundPointerMove = this._handlePointerMove.bind(this);
    this._boundPointerUp = this._handlePointerUp.bind(this);
    this._boundClose = this.close.bind(this);
    this._boundIframeMessage = this._handleIframeMessage.bind(this);
    this._boundContentMutation = this._scheduleAutoResize.bind(this);
    this._boundContentResize = this._scheduleAutoResize.bind(this);
    this._boundRestoreFocus = this._restoreFocus.bind(this);
    this._boundIframeMouseLeave = this._handleIframeMouseLeave.bind(this);
    this._iframeDismissMutationObserver = null;
    this._previousFocus = null;
  }

  get autoresize() {
    return (
      this.hasAttribute("autoresize") &&
      this.getAttribute("autoresize") !== "false"
    );
  }

  set autoresize(value) {
    if (value === false || value === "false" || value === null) {
      this.removeAttribute("autoresize");
    } else if (value === true || value === "") {
      this.setAttribute("autoresize", "");
    } else if (value === undefined) {
      this.removeAttribute("autoresize");
    } else {
      this.setAttribute("autoresize", String(value));
    }
  }

  connectedCallback() {
    this._figInit();
    this.modal =
      this.hasAttribute("modal") && this.getAttribute("modal") !== "false";

    // Set up drag functionality
    this.drag =
      this.hasAttribute("drag") && this.getAttribute("drag") !== "false";

    this._ensureHeader();

    // Markup `<dialog open>` (non-modal) never calls show() — still need a stack bump.
    if (this.open && !this.matches?.(":modal")) {
      this._assignStackingOrder();
    }

    figNextFrame(this, () => {
      this._addCloseListeners();
      this._setupDragListeners();
      this._applyPosition();
      this._syncAutoResize();
      this._setupIframeDismissListeners();
      this._syncA11y();
    });

    window.addEventListener("message", this._boundIframeMessage);
  }

  disconnectedCallback() {
    this._figInit();
    this._removeDragListeners();
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      button.removeEventListener("click", this._boundClose);
    });
    window.removeEventListener("message", this._boundIframeMessage);
    this._teardownAutoResize();
    this._teardownIframeDismissListeners();
    this.removeEventListener("close", this._boundRestoreFocus);
  }

  _captureFocusBeforeOpen() {
    const active = document.activeElement;
    this._previousFocus =
      active instanceof HTMLElement && active !== document.body && !this.contains(active)
        ? active
        : null;
  }

  _restoreFocus() {
    const target = this._previousFocus;
    this._previousFocus = null;
    if (!target?.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body && !this.contains(active)) return;
    requestAnimationFrame(() => target.focus?.());
  }

  _assignStackingOrder() {
    this.style.zIndex = String(figGetHighestZIndex() + 1);
  }

  _clearStackingOrder() {
    this.style.zIndex = "";
  }

  show() {
    this._captureFocusBeforeOpen();
    // Non-modal dialogs are position:fixed in normal paint order — bump above
    // other FigUI overlays (same helper as fig-popup).
    this._assignStackingOrder();
    this.addEventListener("close", this._boundRestoreFocus, { once: true });
    FigTooltip.dismissHoverTooltips();
    return super.show();
  }

  showModal() {
    this._captureFocusBeforeOpen();
    // Top layer owns stacking; clear any prior non-modal inline z-index.
    this._clearStackingOrder();
    this.addEventListener("close", this._boundRestoreFocus, { once: true });
    FigTooltip.dismissHoverTooltips();
    return super.showModal();
  }

  close(...args) {
    const result = super.close(...args);
    this._clearStackingOrder();
    return result;
  }

  _handleIframeMouseLeave(event) {
    const iframe = event?.currentTarget;
    if (!(iframe instanceof HTMLIFrameElement)) return;
    try {
      iframe.contentWindow?.postMessage({ type: "figui:dismiss-tooltips" }, "*");
    } catch {}
  }

  _syncIframeDismissListeners() {
    for (const iframe of this.querySelectorAll(":scope > iframe")) {
      if (!(iframe instanceof HTMLIFrameElement)) continue;
      if (iframe.dataset.figuiDismissBound === "true") continue;
      iframe.dataset.figuiDismissBound = "true";
      iframe.addEventListener("mouseleave", this._boundIframeMouseLeave);
    }
  }

  _setupIframeDismissListeners() {
    this._syncIframeDismissListeners();
    if (this._iframeDismissMutationObserver) return;
    this._iframeDismissMutationObserver = new MutationObserver(() => {
      this._syncIframeDismissListeners();
    });
    this._iframeDismissMutationObserver.observe(this, {
      childList: true,
      subtree: false,
    });
  }

  _teardownIframeDismissListeners() {
    this._iframeDismissMutationObserver?.disconnect();
    this._iframeDismissMutationObserver = null;
    for (const iframe of this.querySelectorAll(":scope > iframe")) {
      iframe.removeEventListener("mouseleave", this._boundIframeMouseLeave);
      delete iframe.dataset.figuiDismissBound;
    }
  }

  _handleIframeMessage(event) {
    if (!this.autoresize) return;
    const data = event?.data;
    if (!data || data.type !== "figui:iframe-resize") return;
    const source = event.source;
    if (!source) return;
    const iframe = Array.from(this.querySelectorAll("iframe")).find(
      (el) => el.contentWindow === source,
    );
    if (!iframe) return;
    this._resizeForIframe(iframe, data);
  }

  _syncAutoResize() {
    if (this.autoresize) {
      this._setupAutoResize();
      this._scheduleAutoResize();
    } else {
      this._teardownAutoResize();
    }
  }

  _setupAutoResize() {
    if (!this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(this._boundContentResize);
      for (const child of this.children) {
        try {
          this._resizeObserver.observe(child);
        } catch {}
      }
    }
    if (!this._mutationObserver) {
      this._mutationObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes?.forEach((node) => {
            if (node instanceof Element && node.parentElement === this) {
              try {
                this._resizeObserver?.observe(node);
              } catch {}
            }
          });
        }
        this._scheduleAutoResize();
      });
      this._mutationObserver.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }
  }

  _teardownAutoResize() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
    if (this._autoResizeRafId) {
      cancelAnimationFrame(this._autoResizeRafId);
      this._autoResizeRafId = 0;
    }
  }

  _scheduleAutoResize() {
    if (!this.autoresize) return;
    if (this._autoResizeRafId) return;
    this._autoResizeRafId = requestAnimationFrame(() => {
      this._autoResizeRafId = 0;
      this._applyAutoResize();
    });
  }

  _applyAutoResize() {
    if (!this.autoresize) return;
    // When an iframe child is present, defer to the iframe's postMessage
    // broadcast (the only reliable source of its content height).
    if (this.querySelector(":scope > iframe")) return;
    this._resizeToContent(null);
  }

  _computeChrome(skipChild) {
    const cs = window.getComputedStyle(this);
    const verticalBoxExtras =
      parseFloat(cs.paddingTop || "0") +
      parseFloat(cs.paddingBottom || "0") +
      parseFloat(cs.borderTopWidth || "0") +
      parseFloat(cs.borderBottomWidth || "0");

    let siblingsHeight = 0;
    const gap = parseFloat(cs.rowGap || cs.gap || "0") || 0;
    let visibleChildren = 0;
    for (const child of this.children) {
      const rect = child.getBoundingClientRect();
      if (rect.height === 0) continue;
      visibleChildren += 1;
      if (child === skipChild) continue;
      const childCS = window.getComputedStyle(child);
      const marginY =
        parseFloat(childCS.marginTop || "0") +
        parseFloat(childCS.marginBottom || "0");
      siblingsHeight += rect.height + marginY;
    }
    if (gap && visibleChildren > 1) {
      siblingsHeight += gap * (visibleChildren - 1);
    }
    return verticalBoxExtras + siblingsHeight;
  }

  _resizeForIframe(iframe, data) {
    if (typeof data.height !== "number" || !(data.height > 0)) return;
    const chrome = this._computeChrome(iframe);
    this.style.height = `${Math.ceil(data.height + chrome)}px`;
  }

  _resizeToContent() {
    // Let CSS handle the sizing via `height: max-content` (applied by the
    // [autoresize] rule). Just clear any previously applied inline height
    // (e.g. from drag/resize) so the CSS rule wins.
    if (this.style.height) this.style.height = "";
  }

  _ensureHeader() {
    figEnsureAutoDialogHeader(this);
  }

  _addCloseListeners() {
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      if (!button.hasAttribute("aria-label")) {
        button.setAttribute("aria-label", "Close dialog");
      }
      button.removeEventListener("click", this._boundClose);
      button.addEventListener("click", this._boundClose);
    });
  }

  _syncA11y() {
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      const heading = this.querySelector("fig-header[dialog-header] h1, fig-header[dialog-header] h2, fig-header[dialog-header] h3, fig-header[dialog-header] h4, fig-header[dialog-header] h5, fig-header[dialog-header] h6");
      if (heading) {
        const id = heading.getAttribute("id") || figUniqueId();
        heading.setAttribute("id", id);
        this.setAttribute("aria-labelledby", id);
      }
    }
  }

  _applyPosition() {
    const position = this.getAttribute("position") || "";

    // Apply common styles
    this.style.position = "fixed";
    this.style.transform = "none";

    // Reset position properties
    this.style.top = "auto";
    this.style.bottom = "auto";
    this.style.left = "auto";
    this.style.right = "auto";
    this.style.margin = "0";

    // Parse position attribute
    const hasTop = position.includes("top");
    const hasBottom = position.includes("bottom");
    const hasLeft = position.includes("left");
    const hasRight = position.includes("right");
    const hasVCenter = position.includes("center") && !hasTop && !hasBottom;
    const hasHCenter = position.includes("center") && !hasLeft && !hasRight;

    // Vertical positioning
    if (hasTop) {
      this.style.top = `${this._offset}px`;
    } else if (hasBottom) {
      this.style.bottom = `${this._offset}px`;
    } else if (hasVCenter) {
      this.style.top = "0";
      this.style.bottom = "0";
    }

    // Horizontal positioning
    if (hasLeft) {
      this.style.left = `${this._offset}px`;
    } else if (hasRight) {
      this.style.right = `${this._offset}px`;
    } else if (hasHCenter) {
      this.style.left = "0";
      this.style.right = "0";
    }

    // Apply margin auto for centering (works without knowing dimensions)
    if (hasVCenter && hasHCenter) {
      this.style.margin = "auto";
    } else if (hasVCenter) {
      this.style.marginTop = "auto";
      this.style.marginBottom = "auto";
    } else if (hasHCenter) {
      this.style.marginLeft = "auto";
      this.style.marginRight = "auto";
    }

    this._positionInitialized = true;
  }

  _setupDragListeners() {
    if (this.drag) {
      this.addEventListener("pointerdown", this._boundPointerDown);
      const handleSelector = this.getAttribute("handle");
      const handleEl = handleSelector
        ? this.querySelector(handleSelector)
        : this.querySelector("fig-header, header");
      if (handleEl) {
        handleEl.style.cursor = "grab";
      }
    }
  }

  _removeDragListeners() {
    this.removeEventListener("pointerdown", this._boundPointerDown);
    this._dragSession?.abort("disabled-or-disconnected");
  }

  _isInteractiveElement(element) {
    // Standard HTML interactive elements
    const interactiveSelectors = [
      "input",
      "button",
      "select",
      "textarea",
      "a",
      "label",
      "details",
      "summary",
      '[contenteditable="true"]',
      "[tabindex]",
    ];

    // Non-interactive fig-* container elements (should allow dragging)
    const nonInteractiveFigElements = [
      "FIG-HEADER",
      "FIG-DIALOG",
      "FIG-FIELD",
      "FIG-TOOLTIP",
      "FIG-CONTENT",
      "FIG-TABS",
      "FIG-TAB",
      "FIG-POPOVER",
      "FIG-SHIMMER",
      "FIG-LAYER",
      "FIG-FILL-PICKER",
    ];

    const isInteractive = (el) =>
      interactiveSelectors.some((selector) => el.matches?.(selector)) ||
      (el.tagName?.startsWith("FIG-") &&
        !nonInteractiveFigElements.includes(el.tagName));

    // Check if the element itself is interactive
    if (isInteractive(element)) {
      return true;
    }

    // Check if any parent element up to the dialog is interactive
    let parent = element.parentElement;
    while (parent && parent !== this) {
      if (isInteractive(parent)) {
        return true;
      }
      parent = parent.parentElement;
    }

    return false;
  }

  _handlePointerDown(e) {
    if (!this.drag) {
      return;
    }

    // Don't interfere with interactive elements (inputs, sliders, buttons, etc.)
    if (this._isInteractiveElement(e.target)) {
      return;
    }

    // If handle attribute is specified, only allow drag from within that element
    // Otherwise, allow dragging from anywhere on the dialog (except interactive elements)
    const handleSelector = this.getAttribute("handle");
    if (handleSelector && handleSelector.trim()) {
      const handleEl = this.querySelector(handleSelector);
      if (!handleEl || !handleEl.contains(e.target)) {
        return;
      }
    }
    // No handle specified = drag from anywhere (original behavior)

    // Don't prevent default yet - just set up pending drag
    // This allows clicks on non-interactive elements like <details> to work
    this._dragPending = true;
    this._dragStartPos.x = e.clientX;
    this._dragStartPos.y = e.clientY;

    // Get current position from computed style
    const rect = this.getBoundingClientRect();

    // Store offset from pointer to dialog top-left corner
    this._dragOffset.x = e.clientX - rect.left;
    this._dragOffset.y = e.clientY - rect.top;
    this._dragSession.start(e, {
      target: document,
      captureTarget: this,
    });
  }

  _activateDrag() {
    this._isDragging = true;
    this._dragPending = false;
    this.style.cursor = "grabbing";
    const rect = this.getBoundingClientRect();
    this.style.top = `${rect.top}px`;
    this.style.left = `${rect.left}px`;
    this.style.bottom = "auto";
    this.style.right = "auto";
    this.style.margin = "0";
  }

  _updateDrag(e) {
    this.style.left = `${e.clientX - this._dragOffset.x}px`;
    this.style.top = `${e.clientY - this._dragOffset.y}px`;
    e.preventDefault();
  }

  _finishDrag(e) {
    this.style.cursor = "";
    this._isDragging = false;
    this._dragPending = false;
    e?.preventDefault?.();
  }

  _handlePointerMove(e) {
    this._dragSession?.move(e);
  }

  _handlePointerUp(e) {
    if (e.type === "pointercancel") {
      this._dragSession?.cancel("pointercancel", e);
    } else {
      this._dragSession?.commit(e);
    }
  }

  static get observedAttributes() {
    return [
      "modal",
      "drag",
      "position",
      "handle",
      "title",
      "resizable",
      "closedby",
      "autoresize",
      "aria-label",
      "aria-labelledby",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._figInit();
    if (name === "autoresize" && this.isConnected) {
      this._syncAutoResize();
    }

    if (name === "drag") {
      this.drag = newValue !== null && newValue !== "false";

      if (this.drag) {
        this._setupDragListeners();
      } else {
        this._removeDragListeners();
        const header = this.querySelector("fig-header, header");
        if (header) {
          header.style.cursor = "";
        }
      }
    }

    if (name === "position" && this._positionInitialized) {
      this._applyPosition();
    }

    if (name === "modal") {
      const wasModal = this.modal;
      this.modal = newValue !== null && newValue !== "false";
      if (this.open && wasModal !== this.modal) {
        this.close();
        if (this.modal) this.showModal();
        else this.show();
      }
    }

    if (name === "closedby") {
      this.closedby = newValue || "any";
    }

    if (name === "title") {
      const autoHeader = this.querySelector("fig-header[data-auto] h3");
      if (autoHeader) {
        autoHeader.textContent = newValue || "Dialog";
      }
      this._syncA11y();
    }

    if (name === "aria-label" || name === "aria-labelledby") {
      this._syncA11y();
    }
  }
}
figDefineCustomizedBuiltIn("fig-dialog", FigDialog, { extends: "dialog" });

export { FigDialog };
