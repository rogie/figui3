/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
  figGetOverlayRoot,
  figUniqueId,
} from "../runtime/index.js";

/* Tooltip */
/**
 * A custom tooltip element that displays on hover or click.
 * @attr {string} action - The trigger action: "hover" (default) or "click"
 * @attr {number} delay - Delay in milliseconds before showing tooltip (default: 500)
 * @attr {string} text - The tooltip text content
 * @attr {string} theme - Optional theme passed to the underlying popup (e.g. "brand").
 * @attr {string} pointer - "false" to hide the beak.
 * @attr {boolean} show - When set, force-show the tooltip (ignores hide).
 *
 * Call {@link FigTooltip.dismissHoverTooltips} when opening menus/dialogs so
 * hover tips do not stay visible over interactive overlays.
 */
class FigTooltip extends HTMLElement {
  static #lastShownAt = 0;
  static #lastHiddenAt = 0;
  static #warmupWindow = 1000;
  static #hoverOpen = null;
  static #documentExitListenersReady = false;
  static #programmaticAnchors = new Set();

  #boundHideOnChromeOpen;
  #boundHidePopupOutsideClick;
  #boundShowDelayedPopup;
  #boundHandlePointerLeave;
  #boundHandleFocus;
  #boundHandleBlur;
  #boundHandleTouchStart;
  #boundHandleTouchMove;
  #boundHandleTouchEnd;
  #boundHandleTouchCancel;
  #boundHandleDialogClose;
  #boundHandleEscape;
  #parentDialog = null;
  #triggerEl = null;
  #childObserver = null;
  #suppressFocusOpen = false;
  #touchTimeout;
  #isTouching = false;
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    let delay = parseInt(this.getAttribute("delay"));
    this.delay = !isNaN(delay) ? delay : 500;

    this.#boundHideOnChromeOpen = this.#hideOnChromeOpen.bind(this);
    this.#boundHidePopupOutsideClick = this.hidePopupOutsideClick.bind(this);
    this.#boundShowDelayedPopup = this.showDelayedPopup.bind(this);
    this.#boundHandlePointerLeave = this.#handlePointerLeave.bind(this);
    this.#boundHandleFocus = () => {
      if (!this.#suppressFocusOpen) this.showDelayedPopup();
    };
    this.#boundHandleBlur = () => {
      this.#suppressFocusOpen = false;
      this.hidePopup();
    };
    this.#boundHandleTouchStart = this.#handleTouchStart.bind(this);
    this.#boundHandleTouchMove = this.#handleTouchMove.bind(this);
    this.#boundHandleTouchEnd = this.#handleTouchEnd.bind(this);
    this.#boundHandleTouchCancel = this.#handleTouchCancel.bind(this);
    this.#boundHandleEscape = this.#handleEscape.bind(this);
    this.#boundHandleDialogClose = () => {
      clearTimeout(this.timeout);
      this.destroy();
      this.isOpen = false;
    };
  }
  connectedCallback() {
    FigTooltip.#ensureDocumentExitListeners();
    this.setup();
    this.#bindTriggerListeners();
    this.setupEventListeners();
    this.#parentDialog = this.closest("dialog");
    if (this.#parentDialog) {
      this.#parentDialog.addEventListener("close", this.#boundHandleDialogClose);
    }
  }

  disconnectedCallback() {
    clearTimeout(this.timeout);
    this.destroy();
    this.#unbindTriggerListeners();
    this.#teardownChildObserver();
    document.removeEventListener(
      "mousedown",
      this.#boundHideOnChromeOpen,
      true,
    );
    document.removeEventListener("keydown", this.#boundHandleEscape, true);
    if (this.#parentDialog) {
      this.#parentDialog.removeEventListener("close", this.#boundHandleDialogClose);
      this.#parentDialog = null;
    }

    if (this.action === "click") {
      document.body.removeEventListener(
        "click",
        this.#boundHidePopupOutsideClick,
      );
    }

    clearTimeout(this.#touchTimeout);
    if (FigTooltip.#hoverOpen === this) FigTooltip.#hoverOpen = null;
  }

  #getTrigger() {
    return this.firstElementChild;
  }

  #teardownChildObserver() {
    this.#childObserver?.disconnect();
    this.#childObserver = null;
  }

  #bindTriggerListeners() {
    this.#unbindTriggerListeners();
    if (this.action === "manual") return;

    const trigger = this.#getTrigger();
    if (!trigger) {
      if (!this.#childObserver && typeof MutationObserver !== "undefined") {
        this.#childObserver = new MutationObserver(() => {
          if (this.#getTrigger()) {
            this.#teardownChildObserver();
            this.#bindTriggerListeners();
          }
        });
        this.#childObserver.observe(this, { childList: true });
      }
      return;
    }

    this.#triggerEl = trigger;
    if (this.action === "hover") {
      if (!this.isTouchDevice()) {
        trigger.addEventListener("pointerenter", this.#boundShowDelayedPopup);
        trigger.addEventListener("pointerleave", this.#boundHandlePointerLeave);
      }
      trigger.addEventListener("touchstart", this.#boundHandleTouchStart, {
        passive: true,
      });
      trigger.addEventListener("touchmove", this.#boundHandleTouchMove, {
        passive: true,
      });
      trigger.addEventListener("touchend", this.#boundHandleTouchEnd, {
        passive: true,
      });
      trigger.addEventListener("touchcancel", this.#boundHandleTouchCancel, {
        passive: true,
      });
      trigger.addEventListener("focus", this.#boundHandleFocus);
      trigger.addEventListener("blur", this.#boundHandleBlur);
    } else if (this.action === "click") {
      trigger.addEventListener("click", this.#boundShowDelayedPopup);
      trigger.addEventListener("touchstart", this.#boundShowDelayedPopup, {
        passive: true,
      });
    }
  }

  #unbindTriggerListeners() {
    const trigger = this.#triggerEl;
    if (!trigger) return;
    if (this.action === "hover") {
      trigger.removeEventListener("pointerenter", this.#boundShowDelayedPopup);
      trigger.removeEventListener("pointerleave", this.#boundHandlePointerLeave);
      trigger.removeEventListener("touchstart", this.#boundHandleTouchStart);
      trigger.removeEventListener("touchmove", this.#boundHandleTouchMove);
      trigger.removeEventListener("touchend", this.#boundHandleTouchEnd);
      trigger.removeEventListener("touchcancel", this.#boundHandleTouchCancel);
      trigger.removeEventListener("focus", this.#boundHandleFocus);
      trigger.removeEventListener("blur", this.#boundHandleBlur);
    } else if (this.action === "click") {
      trigger.removeEventListener("click", this.#boundShowDelayedPopup);
      trigger.removeEventListener("touchstart", this.#boundShowDelayedPopup);
    }
    this.#triggerEl = null;
  }

  setup() {
    this.style.display = "contents";
  }

  render() {
    this.destroy();
    const supportsPopover =
      typeof HTMLElement !== "undefined" &&
      "popover" in HTMLElement.prototype;

    const content = document.createElement("span");
    // Customized built-in: `is` MUST be passed via createElement options;
    // setAttribute("is", ...) after the fact is a no-op per the HTML spec.
    this.popup = document.createElement("dialog", { is: "fig-popup" });
    // Also set the `is` attribute explicitly so CSS selectors like
    // `dialog[is="fig-popup"]` match. createElement's `is` option upgrades
    // the element but doesn't reflect to the attribute in all engines.
    this.popup.setAttribute("is", "fig-popup");
    this.popup.setAttribute("variant", "tooltip");
    this.popup.setAttribute("data-tooltip-managed", "");
    this.popup.setAttribute("role", "tooltip");
    this.popup.setAttribute("closedby", "closerequest");
    if (supportsPopover) this.popup.setAttribute("popover", "manual");

    const tooltipId = figUniqueId();
    this.popup.setAttribute("id", tooltipId);
    const theme = this.getAttribute("theme");
    if (theme) this.popup.setAttribute("theme", theme);
    const pointer = this.getAttribute("pointer");
    if (pointer !== null) this.popup.setAttribute("pointer", pointer);

    this.popup.append(content);
    content.innerText = this.getAttribute("text") ?? "";

    // Preserve any descriptions supplied by the consumer and append the
    // transient tooltip id for as long as this popup exists.
    if (this.firstElementChild) {
      const describedBy = new Set(
        (this.firstElementChild.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter(Boolean),
      );
      describedBy.add(tooltipId);
      this.firstElementChild.setAttribute(
        "aria-describedby",
        [...describedBy].join(" "),
      );
    }

    // Attach to DOM.
    // - With popover support, body is fine because top-layer promotion handles
    //   stacking above any open <dialog> (including modal).
    // - Without popover support, fall back to today's behavior: nearest open
    //   <dialog> ancestor if present, else document.body.
    if (supportsPopover) {
      (figGetOverlayRoot() ?? document.body).append(this.popup);
    } else {
      const parentDialog = this.closest("dialog");
      if (parentDialog && parentDialog.open) {
        parentDialog.append(this.popup);
      } else {
        (figGetOverlayRoot() ?? document.body).append(this.popup);
      }
    }

    // Bind the popup's anchor to this tooltip's trigger child so fig-popup
    // can position itself and update its beak via data-beak-side.
    this.popup.anchor = this.firstElementChild;
  }

  destroy() {
    if (this.popup) {
      this.#removeDescribedBy(this.popup.id);
      this.popup.hidePopup?.();
      this.popup.remove();
      this.popup = null;
    }
  }
  #removeDescribedBy(id) {
    const trigger = this.firstElementChild;
    if (!trigger || !id) return;
    const value = trigger.getAttribute("aria-describedby");
    if (!value) return;
    const next = value
      .split(/\s+/)
      .filter((token) => token && token !== id)
      .join(" ");
    if (next) trigger.setAttribute("aria-describedby", next);
    else trigger.removeAttribute("aria-describedby");
  }
  isTouchDevice() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  setupEventListeners() {
    if (this.action === "click") {
      document.body.addEventListener("click", this.#boundHidePopupOutsideClick);
    }

    document.addEventListener("mousedown", this.#boundHideOnChromeOpen, true);
    document.addEventListener("keydown", this.#boundHandleEscape, true);
  }

  get #showPersisted() {
    return this.hasAttribute("show") && this.getAttribute("show") !== "false";
  }

  #isWarmSession() {
    const now = Date.now();
    const windowMs = FigTooltip.#warmupWindow;
    if (this.action === "hover" && FigTooltip.#hoverOpen) return true;
    if (FigTooltip.#lastShownAt && now - FigTooltip.#lastShownAt < windowMs)
      return true;
    if (FigTooltip.#lastHiddenAt && now - FigTooltip.#lastHiddenAt < windowMs)
      return true;
    return false;
  }

  showDelayedPopup(event) {
    if (this.#showPersisted) return;
    clearTimeout(this.timeout);
    if (event?.type === "pointerenter") {
      const trigger = this.#triggerEl;
      const openSelect =
        trigger?.matches?.("fig-select[open]") ||
        trigger?.querySelector?.("fig-select[open]");
      if (openSelect) return;
    }
    if (this.#isWarmSession()) {
      this.render();
      this.showPopup();
      return;
    }
    this.timeout = setTimeout(() => {
      this.render();
      this.showPopup();
    }, this.delay);
  }

  showPopup() {
    if (this.#parentDialog && !this.#parentDialog.open) return;
    if (!this.firstElementChild) return;
    if (
      this.action === "hover" &&
      FigTooltip.#hoverOpen &&
      FigTooltip.#hoverOpen !== this
    ) {
      FigTooltip.#hoverOpen.hidePopup();
    }
    if (!this.popup) this.render();
    // Keep anchor in sync in case the trigger child was swapped between
    // creation and show.
    this.popup.anchor = this.firstElementChild;
    this.popup.open = true;

    this.isOpen = true;
    if (this.action === "hover") FigTooltip.#hoverOpen = this;
    FigTooltip.#lastShownAt = Date.now();
  }

  hidePopup() {
    if (this.#showPersisted) return;
    clearTimeout(this.timeout);
    clearTimeout(this.#touchTimeout);
    const wasShowing = this.isOpen;
    if (this.popup) {
      this.destroy();
    }

    this.isOpen = false;
    if (FigTooltip.#hoverOpen === this) FigTooltip.#hoverOpen = null;
    if (wasShowing) FigTooltip.#lastHiddenAt = Date.now();
  }

  hidePopupOutsideClick(event) {
    if (this.isOpen && !this.popup.contains(event.target)) {
      this.hidePopup();
    }
  }

  // Pointer event handlers
  #handlePointerLeave(event) {
    // Don't hide immediately if we're in a touch interaction
    if (!this.#isTouching) {
      this.hidePopup();
    }
  }

  // Touch event handlers for mobile support
  #handleTouchStart(event) {
    if (this.action === "hover") {
      this.#isTouching = true;
      // Clear any existing touch timeout
      clearTimeout(this.#touchTimeout);
      // Show popup on touch start for hover action
      this.showDelayedPopup();
    }
  }

  #handleTouchMove(event) {
    if (this.action === "hover" && this.#isTouching) {
      // If user is scrolling/moving, cancel the tooltip after a delay
      clearTimeout(this.#touchTimeout);
      this.#touchTimeout = setTimeout(() => {
        this.#isTouching = false;
        this.hidePopup();
      }, 150);
    }
  }

  #handleTouchEnd(event) {
    if (this.action === "hover" && this.#isTouching) {
      // Delay setting isTouching to false to prevent pointerleave from hiding immediately
      clearTimeout(this.#touchTimeout);
      this.#touchTimeout = setTimeout(() => {
        this.#isTouching = false;
        this.hidePopup();
      }, 300); // Increased delay for better mobile UX
    }
  }

  #handleTouchCancel(event) {
    if (this.action === "hover" && this.#isTouching) {
      this.#isTouching = false;
      clearTimeout(this.#touchTimeout);
      this.hidePopup();
    }
  }

  #handleEscape(event) {
    if ((!this.isOpen && !this.popup) || event.key !== "Escape") return;
    event.preventDefault();
    this.hidePopup();
    this.firstElementChild?.focus?.();
  }

  static get observedAttributes() {
    return ["action", "delay", "open", "pointer", "show", "text", "theme"];
  }
  get text() {
    return this.getAttribute("text") ?? "";
  }
  set text(value) {
    this.setAttribute("text", value);
  }
  #updateText(value) {
    if (!this.popup) return;
    const content = this.popup.firstElementChild ?? this.popup.firstChild;
    if (!content) return;
    content.innerText = value;
    // fig-popup observes content size changes and will reposition itself.
  }
  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }
  set open(value) {
    if (value === false || value === "false" || value === null) {
      this.removeAttribute("open");
    } else {
      this.setAttribute("open", "true");
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "action") {
      this.#unbindTriggerListeners();
      if (oldValue === "click") {
        document.body?.removeEventListener(
          "click",
          this.#boundHidePopupOutsideClick,
        );
      }
      this.action = newValue || "hover";
      if (this.isConnected) {
        this.#bindTriggerListeners();
        if (this.action === "click") {
          document.body?.addEventListener(
            "click",
            this.#boundHidePopupOutsideClick,
          );
        }
      }
    }
    if (name === "delay") {
      let delay = parseInt(newValue);
      this.delay = !isNaN(delay) ? delay : 500;
    }
    if (name === "open") {
      if (newValue !== null && newValue !== "false") {
        requestAnimationFrame(() => {
          this.showDelayedPopup();
        });
      } else {
        requestAnimationFrame(() => {
          this.hidePopup();
        });
      }
    }
    if (name === "show") {
      const on = newValue !== null && newValue !== "false";
      if (on) {
        this.showPopup();
      } else {
        this.hidePopup();
      }
    }
    if (name === "text") {
      this.#updateText(newValue ?? "");
    }
    if (name === "pointer") {
      if (this.popup) {
        if (newValue !== null) this.popup.setAttribute("pointer", newValue);
        else this.popup.removeAttribute("pointer");
      }
    }
    if (name === "theme") {
      if (this.popup) {
        if (newValue) this.popup.setAttribute("theme", newValue);
        else this.popup.removeAttribute("theme");
      }
    }
  }

  #hideOnChromeOpen(e) {
    if (!this.isOpen) return;

    // Check if the clicked element is a select or opens a dialog
    const target = e.target;

    // If the target is a child of this.popup, return early
    if (this.popup && this.popup.contains(target)) {
      return;
    }

    if (
      target.tagName === "SELECT" ||
      target.hasAttribute("popover") ||
      target.closest("dialog")
    ) {
      this.hidePopup();
    }
  }

  static #ensureDocumentExitListeners() {
    if (FigTooltip.#documentExitListenersReady) return;
    FigTooltip.#documentExitListenersReady = true;

    const handlePointerLeftDocument = () => {
      FigTooltip.dismissHoverTooltips();
    };
    const handleViewportChange = () => {
      FigTooltip.#dismissTooltipsOnViewportChange();
    };

    document.documentElement.addEventListener(
      "mouseleave",
      handlePointerLeftDocument,
    );
    document.addEventListener("mouseout", (event) => {
      if (event.relatedTarget) return;
      handlePointerLeftDocument();
    });
    document.addEventListener("scroll", handleViewportChange, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.visualViewport?.addEventListener("scroll", handleViewportChange, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", handleViewportChange, {
      passive: true,
    });

    // Same-origin embed: leaving the iframe element (e.g. into a parent dialog).
    try {
      const frame = window.frameElement;
      if (frame) {
        frame.addEventListener("mouseleave", handlePointerLeftDocument);
      }
    } catch {}

    window.addEventListener("message", (event) => {
      if (event?.data?.type !== "figui:dismiss-tooltips") return;
      if (window.parent !== window && event.source !== window.parent) return;
      handlePointerLeftDocument();
    });
  }

  /**
   * Dismiss open/pending hover tooltips and programmatic {@link FigTooltip.show} tips.
   * Skips `show`-persisted and `action="click"` tooltips. Call when opening menus/dialogs.
   */
  static dismissHoverTooltips() {
    for (const node of document.querySelectorAll("fig-tooltip")) {
      if (!(node instanceof FigTooltip)) continue;
      if (node.action !== "hover") continue;
      if (node.#showPersisted) continue;
      node.#suppressFocusOpen = true;
      setTimeout(() => {
        const trigger = node.#triggerEl;
        if (
          trigger !== document.activeElement &&
          !trigger?.matches?.(":focus, :focus-within")
        ) {
          node.#suppressFocusOpen = false;
        }
      }, 0);
      if (node.isOpen || node.timeout) node.hidePopup();
    }
    for (const anchor of Array.from(FigTooltip.#programmaticAnchors)) {
      FigTooltip.hide(anchor);
    }
  }

  static #programmatic = new WeakMap();

  static #dismissTooltipsOnViewportChange() {
    for (const node of document.querySelectorAll("fig-tooltip")) {
      if (!(node instanceof FigTooltip)) continue;
      if (node.#showPersisted) continue;
      if (node.isOpen || node.timeout) node.hidePopup();
    }
    for (const anchor of Array.from(FigTooltip.#programmaticAnchors)) {
      FigTooltip.hide(anchor);
    }
  }

  static show(anchor, text, options = {}) {
    FigTooltip.#ensureDocumentExitListeners();
    FigTooltip.hide(anchor);
    const delay = options.delay ?? 500;
    const warm =
      Date.now() - FigTooltip.#lastShownAt < FigTooltip.#warmupWindow;
    const effectiveDelay = warm ? 0 : delay;

    const state = { timeout: null, popup: null };
    FigTooltip.#programmatic.set(anchor, state);
    FigTooltip.#programmaticAnchors.add(anchor);

    state.timeout = setTimeout(() => {
      const supportsPopover =
        typeof HTMLElement !== "undefined" &&
        "popover" in HTMLElement.prototype;

      const popup = document.createElement("dialog", { is: "fig-popup" });
      popup.setAttribute("is", "fig-popup");
      popup.setAttribute("variant", "tooltip");
      popup.setAttribute("data-tooltip-managed", "");
      popup.setAttribute("role", "tooltip");
      popup.setAttribute("closedby", "closerequest");
      if (supportsPopover) popup.setAttribute("popover", "manual");
      const content = document.createElement("span");
      content.innerText = text;
      popup.append(content);

      if (supportsPopover) {
        (figGetOverlayRoot() ?? document.body).append(popup);
      } else {
        const parentDialog = anchor.closest?.("dialog");
        if (parentDialog && parentDialog.open) {
          parentDialog.append(popup);
        } else {
          (figGetOverlayRoot() ?? document.body).append(popup);
        }
      }

      popup.anchor = anchor;
      popup.open = true;

      state.popup = popup;
      FigTooltip.#lastShownAt = Date.now();
    }, effectiveDelay);
  }

  static hide(anchor) {
    const state = FigTooltip.#programmatic.get(anchor);
    if (!state) return;
    clearTimeout(state.timeout);
    if (state.popup) {
      state.popup.remove();
      FigTooltip.#lastHiddenAt = Date.now();
    }
    FigTooltip.#programmatic.delete(anchor);
    FigTooltip.#programmaticAnchors.delete(anchor);
  }
}

figDefineElement("fig-tooltip", FigTooltip);

export { FigTooltip };
