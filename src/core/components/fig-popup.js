/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLDialogElement,
  HTMLElement,
  figDefineCustomizedBuiltIn,
  figGetHighestZIndex,
} from "../runtime/index.js";
import { figCreateStateMachine } from "../../shared/state-machine.js";
import { figCreatePointerSession } from "../../shared/pointer-session.js";
import {
  figQuerySelector,
  figWarnInvariant,
} from "../../shared/invariants.js";
import { figEnsureAutoDialogHeader } from "./fig-dialog.js";
import { FigTooltip } from "./fig-tooltip.js";

function figDialogIsTopLayer(dialog) {
  for (const selector of [":modal", ":popover-open"]) {
    try {
      if (dialog.matches(selector)) return true;
    } catch {}
  }
  return false;
}

function figPopupTransition(state, event) {
  switch (event.type) {
    case "REQUEST_OPEN":
      return state === "open" || state === "opening" ? state : "opening";
    case "REQUEST_CLOSE":
      return state === "closed" || state === "closing" ? state : "closing";
    case "NATIVE_OPENED":
      return event.requestedOpen ? "open" : "closing";
    case "NATIVE_CLOSED":
    case "OPEN_FAILED":
    case "DISCONNECT":
      return "closed";
    default:
      return state;
  }
}

/* Popup */
/**
 * A floating popup foundation component based on <dialog>.
 * @attr {string} anchor - CSS selector used to resolve the anchor element.
 * @attr {string} position - Preferred placement as "vertical horizontal" (default: "top center").
 * @attr {string} offset - Horizontal and vertical offset as "x y" (default: "0 0").
 * @attr {string} variant - Visual variant. Use variant="popover" to show an anchor beak.
 * @attr {string} theme - Visual theme: "light", "dark", or "menu".
 * @attr {string} title - Title text for the auto-generated header (same as fig-dialog).
 * @attr {boolean|string} open - Open when present and not "false".
 * @event fig-popup-lifecycle - Emitted for closed/opening/open/closing transitions.
 */
class FigPopup extends HTMLDialogElement {
  _anchorObserver = null;
  _contentObserver = null;
  _mutationObserver = null;
  _anchorTrackRAF = null;
  _lastAnchorRect = null;
  _boundReposition;
  _boundContentReposition;
  _boundScroll;
  _boundOutsidePointerDown;
  _rafId = null;
  _pendingFullReposition = false;
  _anchorRef = null;

  _isDragging = false;
  _dragPending = false;
  _dragStartPos = { x: 0, y: 0 };
  _dragOffset = { x: 0, y: 0 };
  _dragThreshold = 3;
  _dragSession = null;
  _boundPointerDown;
  _boundPointerMove;
  _boundPointerUp;
  _wasDragged = false;
  _previousFocus = null;
  _boundDocumentKeydown;
  _boundDocumentPointerUp;
  _boundNativeClose;
  _boundNativeCancel;
  _suppressNativeCancel = false;
  _nativeCancelResetTimer = null;
  _lifecycle = null;
  _boundNativeToggle;

  constructor() {
    super();
    this._boundReposition = () => this.queueReposition();
    this._boundContentReposition = () =>
      this.queueReposition({ preserveCurrentPosition: true });
    this._boundScroll = (e) => {
      const target = e.target;
      if (
        this.open &&
        (!(target instanceof Node) || !this.contains(target)) &&
        this.shouldAutoReposition()
      ) {
        this.queueReposition();
      }
    };
    this._boundOutsidePointerDown = this.handleOutsidePointerDown.bind(this);
    this._boundPointerDown = this.handlePointerDown.bind(this);
    this._boundPointerMove = this.handlePointerMove.bind(this);
    this._boundPointerUp = this.handlePointerUp.bind(this);
    this._boundDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this._boundDocumentPointerUp =
      this.handleDocumentPointerUp.bind(this);
    this._boundNativeClose = this.handleNativeClose.bind(this);
    this._boundNativeCancel = this.handleNativeCancel.bind(this);
    this._boundNativeToggle = this.handleNativeToggle.bind(this);
    this._boundAutoClose = () => {
      this.open = false;
    };
    this.ensureLifecycle();
  }

  ensureLifecycle() {
    if (this._lifecycle) return;
    this._lifecycle = figCreateStateMachine({
      initialState: "closed",
      transition: figPopupTransition,
      effect: (transition) => this.applyLifecycleTransition(transition),
    });
  }

  ensureInitialized() {
    if (typeof this._anchorObserver === "undefined")
      this._anchorObserver = null;
    if (typeof this._contentObserver === "undefined")
      this._contentObserver = null;
    if (typeof this._mutationObserver === "undefined")
      this._mutationObserver = null;
    if (typeof this._anchorTrackRAF === "undefined")
      this._anchorTrackRAF = null;
    if (typeof this._lastAnchorRect === "undefined")
      this._lastAnchorRect = null;
    if (typeof this._rafId === "undefined") this._rafId = null;
    if (typeof this._pendingFullReposition === "undefined")
      this._pendingFullReposition = false;
    if (typeof this._anchorRef === "undefined") this._anchorRef = null;
    if (typeof this._isDragging === "undefined") this._isDragging = false;
    if (typeof this._dragPending === "undefined") this._dragPending = false;
    if (typeof this._dragStartPos === "undefined")
      this._dragStartPos = { x: 0, y: 0 };
    if (typeof this._dragOffset === "undefined")
      this._dragOffset = { x: 0, y: 0 };
    if (typeof this._dragThreshold !== "number") this._dragThreshold = 3;
    if (!this._dragSession) {
      this._dragSession = figCreatePointerSession({
        threshold: this._dragThreshold,
        listenerTarget: document,
        capture: true,
        onActivate: ({ event }) => this.activateDrag(event),
        onMove: ({ event }) => this.updateDrag(event),
        onFinish: ({ event }) => this.finishDrag(event),
      });
    }
    if (typeof this._wasDragged === "undefined") this._wasDragged = false;
    if (typeof this._previousFocus === "undefined") this._previousFocus = null;
    if (typeof this._suppressNativeCancel === "undefined")
      this._suppressNativeCancel = false;
    if (typeof this._nativeCancelResetTimer === "undefined")
      this._nativeCancelResetTimer = null;
    this.ensureLifecycle();

    if (typeof this._boundReposition !== "function") {
      this._boundReposition = () => this.queueReposition();
    }
    if (typeof this._boundContentReposition !== "function") {
      this._boundContentReposition = () =>
        this.queueReposition({ preserveCurrentPosition: true });
    }
    if (typeof this._boundScroll !== "function") {
      this._boundScroll = (e) => {
        const target = e.target;
        if (
          this.open &&
          (!(target instanceof Node) || !this.contains(target)) &&
          this.shouldAutoReposition()
        ) {
          this.queueReposition();
        }
      };
    }
    if (typeof this._boundOutsidePointerDown !== "function") {
      this._boundOutsidePointerDown = this.handleOutsidePointerDown.bind(this);
    }
    if (typeof this._boundPointerDown !== "function") {
      this._boundPointerDown = this.handlePointerDown.bind(this);
    }
    if (typeof this._boundPointerMove !== "function") {
      this._boundPointerMove = this.handlePointerMove.bind(this);
    }
    if (typeof this._boundPointerUp !== "function") {
      this._boundPointerUp = this.handlePointerUp.bind(this);
    }
    if (typeof this._boundDocumentKeydown !== "function") {
      this._boundDocumentKeydown = this.handleDocumentKeydown.bind(this);
    }
    if (typeof this._boundDocumentPointerUp !== "function") {
      this._boundDocumentPointerUp =
        this.handleDocumentPointerUp.bind(this);
    }
    if (typeof this._boundNativeClose !== "function") {
      this._boundNativeClose = this.handleNativeClose.bind(this);
    }
    if (typeof this._boundNativeCancel !== "function") {
      this._boundNativeCancel = this.handleNativeCancel.bind(this);
    }
    if (typeof this._boundNativeToggle !== "function") {
      this._boundNativeToggle = this.handleNativeToggle.bind(this);
    }
    if (typeof this._boundAutoClose !== "function") {
      this._boundAutoClose = () => {
        this.open = false;
      };
    }
  }

  static get observedAttributes() {
    return [
      "open",
      "anchor",
      "position",
      "offset",
      "variant",
      "theme",
      "drag",
      "handle",
      "autoresize",
      "viewport-margin",
      "title",
    ];
  }

  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") !== "false";
  }

  set open(value) {
    if (value === false || value === "false" || value === null) {
      if (this.hasAttribute("open")) this.removeAttribute("open");
      else this._lifecycle?.dispatch({ type: "REQUEST_CLOSE" });
      return;
    }
    if (this.open) return;
    this.setAttribute("open", "true");
  }

  get lifecycleState() {
    this.ensureInitialized();
    return this._lifecycle.state;
  }

  get anchor() {
    return this._anchorRef ?? this.getAttribute("anchor");
  }

  set anchor(value) {
    if (value instanceof Element) {
      this._anchorRef = value;
    } else if (typeof value === "string") {
      this._anchorRef = null;
      this.setAttribute("anchor", value);
    } else if (value && typeof value.getBoundingClientRect === "function") {
      this._anchorRef = value;
    } else {
      this._anchorRef = null;
    }
    if (this.open) this.queueReposition();
  }

  connectedCallback() {
    this.ensureInitialized();
    if (this.getAttribute("variant") === "tooltip") {
      if (!this.hasAttribute("position")) {
        this.setAttribute("position", "top center");
      }
      if (!this.hasAttribute("offset")) {
        this.setAttribute("offset", "8 8");
      }
      if (!this.hasAttribute("viewport-margin")) {
        this.setAttribute("viewport-margin", "8");
      }
      if (!this.hasAttribute("theme")) {
        this.setAttribute("theme", "menu");
      }
    }
    if (!this.hasAttribute("position")) {
      this.setAttribute("position", "top center");
    }
    if (!this.hasAttribute("role")) {
      this.setAttribute(
        "role",
        this.getAttribute("variant") === "tooltip" ? "tooltip" : "dialog",
      );
    }
    if (!this.hasAttribute("closedby")) {
      this.setAttribute("closedby", "any");
    }

    this.drag =
      this.hasAttribute("drag") && this.getAttribute("drag") !== "false";

    this._ensureHeader();

    this.removeEventListener("close", this._boundNativeClose);
    this.addEventListener("close", this._boundNativeClose);
    this.removeEventListener("cancel", this._boundNativeCancel);
    this.addEventListener("cancel", this._boundNativeCancel);
    this.removeEventListener("toggle", this._boundNativeToggle);
    this.addEventListener("toggle", this._boundNativeToggle);

    requestAnimationFrame(() => {
      if (this.isConnected) this.setupDragListeners();
    });

    if (this.open) {
      this._lifecycle.dispatch({ type: "REQUEST_OPEN" });
    } else {
      this._lifecycle.dispatch({ type: "REQUEST_CLOSE" });
    }
  }

  disconnectedCallback() {
    this.ensureInitialized();
    this._lifecycle.dispatch({ type: "DISCONNECT" });
    this.removeDragListeners();
    this.removeEventListener("close", this._boundNativeClose);
    this.removeEventListener("cancel", this._boundNativeCancel);
    this.removeEventListener("toggle", this._boundNativeToggle);
    if (this._nativeCancelResetTimer !== null) {
      clearTimeout(this._nativeCancelResetTimer);
      this._nativeCancelResetTimer = null;
    }
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.ensureInitialized();
    if (oldValue === newValue) return;

    if (name === "open") {
      if (newValue === "false") {
        this.removeAttribute("open");
        return;
      }
      if (newValue === null) {
        this._lifecycle.dispatch({ type: "REQUEST_CLOSE" });
        return;
      }
      this._lifecycle.dispatch({ type: "REQUEST_OPEN" });
      return;
    }

    if (name === "drag") {
      this.drag = newValue !== null && newValue !== "false";
      if (this.drag) {
        this.setupDragListeners();
      } else {
        this.removeDragListeners();
      }
      return;
    }

    if (name === "title") {
      this._ensureHeader();
      const autoHeader = this.querySelector("fig-header[data-auto] h3");
      if (autoHeader) autoHeader.textContent = newValue || "Dialog";
      return;
    }

    if (this.lifecycleState === "open" || this.lifecycleState === "opening") {
      this.queueReposition();
      this.setupObservers();
    }
  }

  showPopup() {
    if (!this.open) this.setAttribute("open", "true");
    else this._lifecycle.dispatch({ type: "REQUEST_OPEN" });
  }

  applyLifecycleTransition({ event, from, to, generation }) {
    if (to === "opening") {
      this.beginOpening(from);
    } else if (to === "open") {
      this.startAnchorTracking();
      this.queueReposition();
    } else if (to === "closing") {
      this.beginClosing();
    } else if (to === "closed") {
      this.finishClosed(event, from, generation);
    }

    this.dispatchEvent(
      new CustomEvent("fig-popup-lifecycle", {
        detail: {
          state: to,
          previousState: from,
          requestedOpen: this.open,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  beginOpening(from) {
    if (!this.isConnected) {
      this._lifecycle.dispatch({ type: "OPEN_FAILED" });
      return;
    }
    this.style.position = "fixed";
    this.style.inset = "auto";
    this.style.margin = "0";
    this.style.zIndex = String(figGetHighestZIndex() + 1);
    if (from === "closed") this.captureFocusBeforeOpen();

    // When the popup opts into the native popover API, prefer showPopover()
    // so the element is promoted into the browser's top layer (above any
    // modal dialogs) without needing showModal().
    let usePopover =
      this.hasAttribute("popover") &&
      typeof this.showPopover === "function";
    const positionBeforeReveal = this.shouldAutoReposition();
    if (positionBeforeReveal) {
      this.style.visibility = "hidden";
    }
    if (usePopover && !this.nativePopoverOpen()) {
      try {
        this.showPopover();
      } catch (e) {
        usePopover = false;
      }
    }
    if (!usePopover && !this.nativeDialogOpen()) {
      try {
        this.show();
      } catch (e) {
        this.style.visibility = "";
        this._lifecycle.dispatch({ type: "OPEN_FAILED" });
        return;
      }
    }
    if (!this.nativeDisplayed()) {
      this.style.visibility = "";
      this._lifecycle.dispatch({ type: "OPEN_FAILED" });
      return;
    }
    if (positionBeforeReveal) {
      this.positionPopup();
      this.style.visibility = "";
    }

    this.setupObservers();
    document.addEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );
    document.addEventListener("keydown", this._boundDocumentKeydown, true);
    document.addEventListener(
      "pointerup",
      this._boundDocumentPointerUp,
      true,
    );
    document.addEventListener(
      "pointercancel",
      this._boundDocumentPointerUp,
      true,
    );
    this._wasDragged = false;
    this.queueReposition();

    const anchor = this.resolveAnchor();
    if (anchor?.classList) anchor.classList.add("has-popup-open");

    // Tooltips lose to interactive overlays (menus, selects, popovers).
    if (this.getAttribute("variant") !== "tooltip") {
      FigTooltip.dismissHoverTooltips();
    }
    this._lifecycle.dispatch({
      type: "NATIVE_OPENED",
      requestedOpen: this.open,
    });
  }

  hidePopup() {
    if (this.hasAttribute("open")) this.removeAttribute("open");
    else this._lifecycle.dispatch({ type: "REQUEST_CLOSE" });
  }

  beginClosing() {
    this.teardownActivePopup();
    let requestedNativeClose = false;
    if (
      this.hasAttribute("popover") &&
      typeof this.hidePopover === "function" &&
      this.nativePopoverOpen()
    ) {
      try {
        requestedNativeClose = true;
        this.hidePopover();
      } catch (e) {
        requestedNativeClose = false;
      }
    }
    if (this.nativeDialogOpen()) {
      try {
        requestedNativeClose = true;
        this.close();
      } catch (e) {
        requestedNativeClose = false;
      }
    }
    if (!requestedNativeClose && !this.nativeDisplayed()) {
      this._lifecycle.dispatch({ type: "NATIVE_CLOSED" });
    }
  }

  teardownActivePopup() {
    const anchor = this.resolveAnchor();
    if (anchor?.classList) anchor.classList.remove("has-popup-open");

    this.style.visibility = "";
    this._wasDragged = false;
    this.teardownObservers();
    document.removeEventListener(
      "pointerdown",
      this._boundOutsidePointerDown,
      true,
    );
    document.removeEventListener("keydown", this._boundDocumentKeydown, true);
    document.removeEventListener(
      "pointerup",
      this._boundDocumentPointerUp,
      true,
    );
    document.removeEventListener(
      "pointercancel",
      this._boundDocumentPointerUp,
      true,
    );
    this._suppressNativeCancel = false;
    if (this._nativeCancelResetTimer !== null) {
      clearTimeout(this._nativeCancelResetTimer);
      this._nativeCancelResetTimer = null;
    }
  }

  finishClosed(event, from, generation) {
    this.teardownActivePopup();
    if (event.type === "DISCONNECT") {
      if (this.nativePopoverOpen()) {
        try {
          this.hidePopover();
        } catch {}
      }
      if (this.nativeDialogOpen()) {
        try {
          this.close();
        } catch {}
      }
    }
    if (event.type !== "DISCONNECT" && this.hasAttribute("open")) {
      this.removeAttribute("open");
    }
    if (event.type === "DISCONNECT" || from === "closed") return;
    this.restoreFocusAfterClose({ generation, state: "closed" });
  }

  shouldRestoreFocus() {
    return this.getAttribute("variant") !== "tooltip";
  }

  captureFocusBeforeOpen() {
    if (!this.shouldRestoreFocus()) return;
    const active = document.activeElement;
    this._previousFocus =
      active instanceof HTMLElement && active !== document.body && !this.contains(active)
        ? active
        : null;
  }

  restoreFocusAfterClose(token = this._lifecycle.capture()) {
    if (!this.shouldRestoreFocus()) {
      this._previousFocus = null;
      return;
    }
    const anchor = this.resolveAnchor();
    const target =
      this._previousFocus?.isConnected
        ? this._previousFocus
        : anchor instanceof HTMLElement
          ? anchor
          : null;
    this._previousFocus = null;
    if (!target?.isConnected) return;
    const active = document.activeElement;
    if (active && active !== document.body && !this.contains(active)) return;
    requestAnimationFrame(() => {
      if (!this._lifecycle.isCurrent(token, "closed")) return;
      target.focus?.();
    });
  }

  get autoresize() {
    const val = this.getAttribute("autoresize");
    return val === null || val !== "false";
  }
  set autoresize(value) {
    if (value === false || value === "false" || value === null) {
      this.setAttribute("autoresize", "false");
    } else if (value || value === "") {
      this.setAttribute("autoresize", value === true ? "" : value);
    } else {
      this.setAttribute("autoresize", "false");
    }
  }

  handleNativeClose() {
    if (this.nativeDisplayed()) return;
    this._lifecycle.dispatch({ type: "NATIVE_CLOSED" });
  }

  handleNativeCancel(event) {
    if (
      this._suppressNativeCancel &&
      this.getAttribute("closedby") === "any"
    ) {
      event.preventDefault();
    }
    const token = this._lifecycle.capture();
    queueMicrotask(() => {
      if (event.defaultPrevented || !this._lifecycle.isCurrent(token)) return;
      if (this.nativeDisplayed()) {
        this.open = false;
      } else {
        this._lifecycle.dispatch({ type: "NATIVE_CLOSED" });
      }
    });
  }

  handleNativeToggle(event) {
    const opened =
      event.newState === "open" ||
      (event.newState === undefined && this.nativeDisplayed());
    if (opened) {
      this._lifecycle.dispatch({
        type: "NATIVE_OPENED",
        requestedOpen: this.open,
      });
    } else if (!this.nativeDisplayed()) {
      this._lifecycle.dispatch({ type: "NATIVE_CLOSED" });
    }
  }

  nativeDialogOpen() {
    return this.matches?.(":open") ?? false;
  }

  nativePopoverOpen() {
    return this.matches?.(":popover-open") ?? false;
  }

  nativeDisplayed() {
    return this.nativeDialogOpen() || this.nativePopoverOpen();
  }

  setupObservers() {
    this.teardownObservers();

    const anchor = this.resolveAnchor();
    if (anchor instanceof Element && "ResizeObserver" in window) {
      this._anchorObserver = new ResizeObserver(this._boundReposition);
      this._anchorObserver.observe(anchor);
    }

    if (this.autoresize) {
      if ("ResizeObserver" in window) {
        this._contentObserver = new ResizeObserver(
          this._boundContentReposition,
        );
        this._contentObserver.observe(this);
      }

      this._mutationObserver = new MutationObserver(
        this._boundContentReposition,
      );
      this._mutationObserver.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    window.addEventListener("resize", this._boundReposition);
    window.addEventListener("scroll", this._boundScroll, {
      capture: true,
      passive: true,
    });
    this.startAnchorTracking();
  }

  teardownObservers() {
    if (this._anchorObserver) {
      this._anchorObserver.disconnect();
      this._anchorObserver = null;
    }
    if (this._contentObserver) {
      this._contentObserver.disconnect();
      this._contentObserver = null;
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
    window.removeEventListener("resize", this._boundReposition);
    window.removeEventListener("scroll", this._boundScroll, {
      capture: true,
      passive: true,
    });
    this.stopAnchorTracking();
  }

  readRectSnapshot(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  hasRectChanged(prev, next, epsilon = 0.25) {
    if (!prev && !next) return false;
    if (!prev || !next) return true;
    return (
      Math.abs(prev.x - next.x) > epsilon ||
      Math.abs(prev.y - next.y) > epsilon ||
      Math.abs(prev.width - next.width) > epsilon ||
      Math.abs(prev.height - next.height) > epsilon
    );
  }

  startAnchorTracking() {
    this.stopAnchorTracking();
    if (this.lifecycleState !== "open" && this.lifecycleState !== "opening")
      return;
    const token = this._lifecycle.capture();

    const tick = () => {
      if (
        !this._lifecycle.isCurrent(token) ||
        (this.lifecycleState !== "open" &&
          this.lifecycleState !== "opening")
      ) {
        this._anchorTrackRAF = null;
        return;
      }

      const anchor = this.resolveAnchor();
      const nextRect = this.readRectSnapshot(anchor);
      const canAutoReposition = this.shouldAutoReposition();
      if (
        canAutoReposition &&
        this.hasRectChanged(this._lastAnchorRect, nextRect)
      ) {
        this._lastAnchorRect = nextRect;
        this.queueReposition();
      } else if (!canAutoReposition) {
        // Keep anchor geometry fresh without forcing reposition when user has dragged away.
        this._lastAnchorRect = nextRect;
      }
      this._anchorTrackRAF = requestAnimationFrame(tick);
    };

    this._lastAnchorRect = this.readRectSnapshot(this.resolveAnchor());
    this._anchorTrackRAF = requestAnimationFrame(tick);
  }

  stopAnchorTracking() {
    if (this._anchorTrackRAF !== null) {
      cancelAnimationFrame(this._anchorTrackRAF);
      this._anchorTrackRAF = null;
    }
    this._lastAnchorRect = null;
  }

  _ensureHeader() {
    if (
      !this.hasAttribute("title") ||
      this.getAttribute("variant") === "tooltip"
    ) {
      return;
    }
    figEnsureAutoDialogHeader(this);
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      button.removeEventListener("click", this._boundAutoClose);
      button.addEventListener("click", this._boundAutoClose);
    });
  }

  handleOutsidePointerDown(event) {
    if (
      this.lifecycleState !== "open"
    )
      return;
    const closedby = this.getAttribute("closedby");
    if (closedby === "none" || closedby === "closerequest") return;
    const target = event.target;
    if (!(target instanceof Node)) return;

    // Prefer composedPath so slotted light-DOM content (e.g. fig-select options)
    // counts as inside — Node.contains() is false for slotted nodes.
    const path =
      typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(this) || this.contains(target)) {
      this.markOwnedPointerInteraction();
      return;
    }

    const anchor = this.resolveAnchor();
    if (anchor && (path.includes(anchor) || anchor.contains?.(target))) {
      this.markOwnedPointerInteraction();
      return;
    }

    if (this.isInsideDescendantPopup(target, path)) {
      this.markOwnedPointerInteraction();
      return;
    }

    this._suppressNativeCancel = false;
    this.open = false;
  }

  markOwnedPointerInteraction() {
    this._suppressNativeCancel = true;
    if (this._nativeCancelResetTimer !== null) {
      clearTimeout(this._nativeCancelResetTimer);
      this._nativeCancelResetTimer = null;
    }
  }

  handleDocumentPointerUp() {
    if (!this._suppressNativeCancel) return;
    if (this._nativeCancelResetTimer !== null) {
      clearTimeout(this._nativeCancelResetTimer);
    }
    // Native dialog light-dismiss runs after pointer dispatch. Keep the guard
    // through that algorithm, then allow later requestClose() calls normally.
    this._nativeCancelResetTimer = setTimeout(() => {
      this._suppressNativeCancel = false;
      this._nativeCancelResetTimer = null;
    }, 0);
  }

  handleDocumentKeydown(event) {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    if (!this.open) return;
    if (this.getAttribute("role") === "menu") return;
    const closedby = this.getAttribute("closedby");
    if (closedby === "none") return;
    const openDialogs = Array.from(document.querySelectorAll("dialog[open]"));
    const topDialog = openDialogs
      .map((dialog, index) => ({
        dialog,
        topLayer: figDialogIsTopLayer(dialog) ? 1 : 0,
        z: Number.parseInt(getComputedStyle(dialog).zIndex || "0", 10) || 0,
        index,
      }))
      .sort(
        (a, b) =>
          a.topLayer - b.topLayer ||
          a.z - b.z ||
          a.index - b.index,
      )
      .at(-1)?.dialog;
    if (topDialog && topDialog !== this) return;
    event.preventDefault();
    this.open = false;
  }

  getContainingPopup(node) {
    let current = node;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      if (current instanceof FigPopup) return current;
      current =
        current.parentNode ??
        (current.getRootNode?.() instanceof ShadowRoot
          ? current.getRootNode().host
          : null);
    }
    return null;
  }

  composedContains(node) {
    let current = node;
    const visited = new Set();
    while (current && !visited.has(current)) {
      if (current === this) return true;
      visited.add(current);
      current =
        current.parentNode ??
        (current.getRootNode?.() instanceof ShadowRoot
          ? current.getRootNode().host
          : null);
    }
    return false;
  }

  isInsideDescendantPopup(target, path = []) {
    const targetDialog =
      path.find((node) => node instanceof FigPopup) ??
      this.getContainingPopup(target);
    if (!targetDialog || targetDialog === this) return false;

    let current = targetDialog;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const popupAnchor = current.anchor;
      if (!(popupAnchor instanceof Element)) break;
      if (this.composedContains(popupAnchor)) return true;
      current = this.getContainingPopup(popupAnchor);
    }
    return false;
  }

  // ---- Drag support ----

  setupDragListeners() {
    if (this.drag) {
      this.addEventListener("pointerdown", this._boundPointerDown);
    }
  }

  removeDragListeners() {
    this.removeEventListener("pointerdown", this._boundPointerDown);
    this._dragSession?.abort("disabled-or-disconnected");
  }

  isInteractiveElement(element) {
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

    const nonInteractiveFigElements = [
      "FIG-HEADER",
      "FIG-DIALOG",
      "FIG-POPUP",
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
      interactiveSelectors.some((s) => el.matches?.(s)) ||
      (el.tagName?.startsWith("FIG-") &&
        !nonInteractiveFigElements.includes(el.tagName));

    if (isInteractive(element)) return true;

    let parent = element.parentElement;
    while (parent && parent !== this) {
      if (isInteractive(parent)) return true;
      parent = parent.parentElement;
    }

    return false;
  }

  handlePointerDown(e) {
    if (!this.drag) return;
    if (this.isInteractiveElement(e.target)) return;

    const handleSelector = this.getAttribute("handle");
    if (handleSelector && handleSelector.trim()) {
      const handleEl = this.querySelector(handleSelector);
      if (!handleEl || !handleEl.contains(e.target)) return;
    }

    this._dragPending = true;
    this._dragStartPos.x = e.clientX;
    this._dragStartPos.y = e.clientY;

    const rect = this.getBoundingClientRect();
    this._dragOffset.x = e.clientX - rect.left;
    this._dragOffset.y = e.clientY - rect.top;
    this._dragSession.start(e, {
      target: document,
      captureTarget: this,
    });
  }

  activateDrag() {
    this._isDragging = true;
    this._dragPending = false;
    this._wasDragged = true;
    this.style.cursor = "grabbing";
    const rect = this.getBoundingClientRect();
    this.style.top = `${rect.top}px`;
    this.style.left = `${rect.left}px`;
    this.style.bottom = "auto";
    this.style.right = "auto";
    this.style.margin = "0";
  }

  updateDrag(e) {
    this.style.left = `${e.clientX - this._dragOffset.x}px`;
    this.style.top = `${e.clientY - this._dragOffset.y}px`;
    e.preventDefault();
  }

  finishDrag(e) {
    this.style.cursor = "";
    this._isDragging = false;
    this._dragPending = false;
    e?.preventDefault?.();
  }

  handlePointerMove(e) {
    this._dragSession?.move(e);
  }

  handlePointerUp(e) {
    if (e.type === "pointercancel") {
      this._dragSession?.cancel("pointercancel", e);
    } else {
      this._dragSession?.commit(e);
    }
  }

  // ---- Anchor resolution ----

  resolveAnchor() {
    if (this._anchorRef) return this._anchorRef;

    const selector = this.getAttribute("anchor");
    if (!selector) return null;

    // Local-first: nearest parent subtree.
    const localScope = this.parentElement;
    const localMatch = figQuerySelector(
      localScope,
      selector,
      "fig-popup anchor",
      { warnMissing: false },
    );
    if (localMatch && !this.contains(localMatch)) return localMatch;

    const rootMatch = figQuerySelector(
      this.getRootNode(),
      selector,
      "fig-popup anchor",
    );
    if (rootMatch && this.contains(rootMatch)) {
      figWarnInvariant(
        `popup-anchor-descendant:${selector}`,
        `fig-popup anchor "${selector}" resolves inside the popup.`,
      );
      return null;
    }
    return rootMatch;
  }

  parsePosition() {
    const raw = (this.getAttribute("position") || "top center")
      .trim()
      .toLowerCase();
    const tokens = raw.split(/\s+/).filter(Boolean);
    const verticalValues = new Set(["top", "center", "bottom"]);
    const horizontalValues = new Set(["left", "center", "right"]);

    let vertical = "top";
    let horizontal = "center";
    let shorthand = null;

    // Treat position as "vertical horizontal" to avoid center ambiguity.
    if (tokens.length >= 2) {
      if (verticalValues.has(tokens[0])) {
        vertical = tokens[0];
      }
      if (horizontalValues.has(tokens[1])) {
        horizontal = tokens[1];
      }
      return { vertical, horizontal, shorthand };
    }

    // Single-token fallback: apply only if non-ambiguous.
    if (tokens.length === 1) {
      const token = tokens[0];
      if (token === "top" || token === "bottom") {
        vertical = token;
        shorthand = token;
      } else if (token === "left" || token === "right") {
        horizontal = token;
        shorthand = token;
      } else if (token === "center") {
        vertical = "center";
        horizontal = "center";
      }
    }

    return { vertical, horizontal, shorthand };
  }

  normalizeOffsetToken(token, fallback = "0px") {
    if (!token) return fallback;
    const trimmed = token.trim();
    if (!trimmed) return fallback;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  }

  measureLengthPx(value, axis = "x") {
    if (!value) return 0;
    const normalized = this.normalizeOffsetToken(value, "0px");
    if (normalized.endsWith("px")) {
      const px = parseFloat(normalized);
      return Number.isFinite(px) ? px : 0;
    }

    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.left = "0";
    probe.style.top = "0";
    probe.style.margin = "0";
    probe.style.padding = "0";
    probe.style.border = "0";
    if (axis === "x") {
      probe.style.width = normalized;
      probe.style.height = "0";
    } else {
      probe.style.height = normalized;
      probe.style.width = "0";
    }
    document.body.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    return axis === "x" ? rect.width : rect.height;
  }

  parseOffset() {
    const raw = (this.getAttribute("offset") || "0 0").trim();
    const tokens = raw.split(/\s+/).filter(Boolean);

    const xToken = this.normalizeOffsetToken(tokens[0], "0px");
    const yToken = this.normalizeOffsetToken(tokens[1], "0px");

    return {
      xToken,
      yToken,
      xPx: this.measureLengthPx(xToken, "x"),
      yPx: this.measureLengthPx(yToken, "y"),
    };
  }

  parseViewportMargins() {
    const raw = (this.getAttribute("viewport-margin") || "8").trim();
    const tokens = raw
      .split(/\s+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    const d = 8;
    if (tokens.length === 0) return { top: d, right: d, bottom: d, left: d };
    if (tokens.length === 1)
      return {
        top: tokens[0],
        right: tokens[0],
        bottom: tokens[0],
        left: tokens[0],
      };
    if (tokens.length === 2)
      return {
        top: tokens[0],
        right: tokens[1],
        bottom: tokens[0],
        left: tokens[1],
      };
    if (tokens.length === 3)
      return {
        top: tokens[0],
        right: tokens[1],
        bottom: tokens[2],
        left: tokens[1],
      };
    return {
      top: tokens[0],
      right: tokens[1],
      bottom: tokens[2],
      left: tokens[3],
    };
  }

  getPlacementCandidates(vertical, horizontal, shorthand) {
    const opp = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
      center: "center",
    };

    if (shorthand) {
      const isHorizontal = shorthand === "left" || shorthand === "right";
      const perp = isHorizontal ? ["top", "bottom"] : ["left", "right"];
      return [
        { v: vertical, h: horizontal, s: shorthand },
        { v: vertical, h: horizontal, s: opp[shorthand] },
        { v: vertical, h: horizontal, s: perp[0] },
        { v: vertical, h: horizontal, s: perp[1] },
      ];
    }

    if (vertical === "center") {
      return [
        { v: "center", h: horizontal, s: null },
        { v: "center", h: opp[horizontal], s: null },
        { v: "top", h: horizontal, s: null },
        { v: "bottom", h: horizontal, s: null },
        { v: "top", h: opp[horizontal], s: null },
        { v: "bottom", h: opp[horizontal], s: null },
      ];
    }

    if (horizontal === "center") {
      return [
        { v: vertical, h: "center", s: null },
        { v: opp[vertical], h: "center", s: null },
        { v: vertical, h: "left", s: null },
        { v: vertical, h: "right", s: null },
        { v: opp[vertical], h: "left", s: null },
        { v: opp[vertical], h: "right", s: null },
      ];
    }

    return [
      { v: vertical, h: horizontal, s: null },
      { v: opp[vertical], h: horizontal, s: null },
      { v: vertical, h: opp[horizontal], s: null },
      { v: opp[vertical], h: opp[horizontal], s: null },
    ];
  }

  computeCoords(
    anchorRect,
    popupRect,
    vertical,
    horizontal,
    offset,
    shorthand,
  ) {
    let top;
    let left;

    if (shorthand === "left" || shorthand === "right") {
      left =
        shorthand === "left"
          ? anchorRect.left - popupRect.width - offset.xPx
          : anchorRect.right + offset.xPx;
      top = anchorRect.top;
      return { top, left };
    }
    if (shorthand === "top" || shorthand === "bottom") {
      top =
        shorthand === "top"
          ? anchorRect.top - popupRect.height - offset.yPx
          : anchorRect.bottom + offset.yPx;
      left = anchorRect.left;
      return { top, left };
    }

    if (vertical === "top") {
      top = anchorRect.top - popupRect.height - offset.yPx;
    } else if (vertical === "bottom") {
      top = anchorRect.bottom + offset.yPx;
    } else {
      top = anchorRect.top + (anchorRect.height - popupRect.height) / 2;
    }

    if (vertical === "center") {
      // Side placement: popup beside the anchor
      if (horizontal === "left") {
        left = anchorRect.left - popupRect.width - offset.xPx;
      } else if (horizontal === "right") {
        left = anchorRect.right + offset.xPx;
      } else {
        left = anchorRect.left + (anchorRect.width - popupRect.width) / 2;
      }
    } else {
      // Edge alignment: popup above/below, aligned to anchor edge
      if (horizontal === "left") {
        left = anchorRect.left + offset.xPx;
      } else if (horizontal === "right") {
        left = anchorRect.right - popupRect.width - offset.xPx;
      } else {
        left = anchorRect.left + (anchorRect.width - popupRect.width) / 2;
      }
    }

    return { top, left };
  }

  oppositeSide(side) {
    const map = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };
    return map[side] || "bottom";
  }

  getPlacementSide(vertical, horizontal, shorthand) {
    if (shorthand === "top") return "top";
    if (shorthand === "bottom") return "bottom";
    if (shorthand === "left") return "left";
    if (shorthand === "right") return "right";

    if (vertical !== "center") return vertical;
    if (horizontal !== "center") return horizontal;
    return "top";
  }

  lengthToPx(value, fallback = 0) {
    const styles = getComputedStyle(this);
    const raw = String(value || "").trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    if (raw.endsWith("rem")) {
      return n * parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    if (raw.endsWith("em")) {
      return n * parseFloat(styles.fontSize);
    }
    return n;
  }

  radiusForSide(side) {
    const styles = getComputedStyle(this);
    const toPx = (value) => this.lengthToPx(value, 0);
    if (side === "top") {
      return Math.max(
        toPx(styles.borderTopLeftRadius),
        toPx(styles.borderTopRightRadius),
      );
    }
    if (side === "bottom") {
      return Math.max(
        toPx(styles.borderBottomLeftRadius),
        toPx(styles.borderBottomRightRadius),
      );
    }
    if (side === "left") {
      return Math.max(
        toPx(styles.borderTopLeftRadius),
        toPx(styles.borderBottomLeftRadius),
      );
    }
    if (side === "right") {
      return Math.max(
        toPx(styles.borderTopRightRadius),
        toPx(styles.borderBottomRightRadius),
      );
    }
    return 0;
  }

  getBeakEdgeInset(beakSide) {
    const beakWidth = this.lengthToPx(
      getComputedStyle(this).getPropertyValue("--fig-popup-beak-width"),
      16,
    );
    return Math.max(10, this.radiusForSide(beakSide) + beakWidth / 2);
  }

  tracksAnchorBeak() {
    const variant = this.getAttribute("variant");
    return variant === "popover" || variant === "tooltip";
  }

  getViewportBounds(m) {
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const height = vv?.height ?? window.innerHeight;
    const offsetLeft = vv?.offsetLeft ?? 0;
    const offsetTop = vv?.offsetTop ?? 0;

    return {
      minLeft: offsetLeft + m.left,
      minTop: offsetTop + m.top,
      maxRight: offsetLeft + width - m.right,
      maxBottom: offsetTop + height - m.bottom,
    };
  }

  clampToViewport(coords, popupRect, m) {
    const bounds = this.getViewportBounds(m);
    const maxLeft = bounds.maxRight - popupRect.width;
    const maxTop = bounds.maxBottom - popupRect.height;
    const clampLeftMax = Math.max(bounds.minLeft, maxLeft);
    const clampTopMax = Math.max(bounds.minTop, maxTop);

    return {
      left: Math.min(clampLeftMax, Math.max(bounds.minLeft, coords.left)),
      top: Math.min(clampTopMax, Math.max(bounds.minTop, coords.top)),
    };
  }

  resolveCoordsAtViewport(anchorRect, popupRect, coords, placementSide, m) {
    let { left, top } = this.clampToViewport(coords, popupRect, m);
    if (!anchorRect || !this.tracksAnchorBeak()) {
      return { left, top };
    }

    const beakSide = this.oppositeSide(placementSide);
    const bounds = this.getViewportBounds(m);
    const maxLeft = bounds.maxRight - popupRect.width;
    const minLeft = bounds.minLeft;
    const maxTop = bounds.maxBottom - popupRect.height;
    const minTop = bounds.minTop;

    if (beakSide === "top" || beakSide === "bottom") {
      const inset = this.getBeakEdgeInset(beakSide);
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const beakOffset = anchorCenterX - left;
      if (beakOffset < inset) {
        left = anchorCenterX - inset;
      } else if (beakOffset > popupRect.width - inset) {
        left = anchorCenterX - (popupRect.width - inset);
      }
      left = Math.min(maxLeft, Math.max(minLeft, left));
    } else if (beakSide === "left" || beakSide === "right") {
      const inset = this.getBeakEdgeInset(beakSide);
      const anchorCenterY = anchorRect.top + anchorRect.height / 2;
      const beakOffset = anchorCenterY - top;
      if (beakOffset < inset) {
        top = anchorCenterY - inset;
      } else if (beakOffset > popupRect.height - inset) {
        top = anchorCenterY - (popupRect.height - inset);
      }
      top = Math.min(maxTop, Math.max(minTop, top));
    }

    return { left, top };
  }

  canPointAtAnchor(anchorRect, popupRect, left, top, placementSide) {
    if (!anchorRect || !this.tracksAnchorBeak()) return true;

    const beakSide = this.oppositeSide(placementSide);
    const inset = this.getBeakEdgeInset(beakSide);

    if (beakSide === "top" || beakSide === "bottom") {
      const beakOffset = anchorRect.left + anchorRect.width / 2 - left;
      return (
        beakOffset >= inset - 0.5 &&
        beakOffset <= popupRect.width - inset + 0.5
      );
    }

    const beakOffset = anchorRect.top + anchorRect.height / 2 - top;
    return (
      beakOffset >= inset - 0.5 &&
      beakOffset <= popupRect.height - inset + 0.5
    );
  }

  updatePopoverBeak(anchorRect, popupRect, left, top, placementSide) {
    if (!this.tracksAnchorBeak() || !anchorRect) {
      this.style.removeProperty("--fig-popup-beak-offset");
      this.removeAttribute("data-beak-side");
      return;
    }

    const beakSide = this.oppositeSide(placementSide);
    this.setAttribute("data-beak-side", beakSide);

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const measuredRect = this.getBoundingClientRect();
    const rect =
      measuredRect.width > 0 && measuredRect.height > 0
        ? measuredRect
        : popupRect;
    const resolvedLeft = rect.left;
    const resolvedTop = rect.top;
    const edgeInset = this.getBeakEdgeInset(beakSide);

    let beakOffset;
    if (beakSide === "top" || beakSide === "bottom") {
      beakOffset = anchorCenterX - resolvedLeft;
      const min = edgeInset;
      const max = Math.max(min, rect.width - edgeInset);
      beakOffset = Math.min(max, Math.max(min, beakOffset));
    } else {
      beakOffset = anchorCenterY - resolvedTop;
      const min = edgeInset;
      const max = Math.max(min, rect.height - edgeInset);
      beakOffset = Math.min(max, Math.max(min, beakOffset));
    }

    this.style.setProperty("--fig-popup-beak-offset", `${beakOffset}px`);
  }

  overflowScore(coords, popupRect, m) {
    const bounds = this.getViewportBounds(m);
    const right = coords.left + popupRect.width;
    const bottom = coords.top + popupRect.height;

    const overflowLeft = Math.max(0, bounds.minLeft - coords.left);
    const overflowTop = Math.max(0, bounds.minTop - coords.top);
    const overflowRight = Math.max(0, right - bounds.maxRight);
    const overflowBottom = Math.max(0, bottom - bounds.maxBottom);

    return overflowLeft + overflowTop + overflowRight + overflowBottom;
  }

  fits(coords, popupRect, m) {
    return this.overflowScore(coords, popupRect, m) === 0;
  }

  clamp(coords, popupRect, m, anchorRect = null, placementSide = "top") {
    if (anchorRect) {
      return this.resolveCoordsAtViewport(
        anchorRect,
        popupRect,
        coords,
        placementSide,
        m,
      );
    }
    return this.clampToViewport(coords, popupRect, m);
  }

  primaryAxisOverflowPenalty(coords, popupRect, m, placementSide) {
    const bounds = this.getViewportBounds(m);
    let overflow = 0;

    if (placementSide === "top") {
      overflow = Math.max(0, bounds.minTop - coords.top);
    } else if (placementSide === "bottom") {
      overflow = Math.max(0, coords.top + popupRect.height - bounds.maxBottom);
    } else if (placementSide === "left") {
      overflow = Math.max(0, bounds.minLeft - coords.left);
    } else if (placementSide === "right") {
      overflow = Math.max(0, coords.left + popupRect.width - bounds.maxRight);
    }

    return overflow > 0 ? 1000 + overflow : 0;
  }

  placementScore(anchorRect, popupRect, coords, placementSide, m) {
    const resolved = this.resolveCoordsAtViewport(
      anchorRect,
      popupRect,
      coords,
      placementSide,
      m,
    );
    let score = this.overflowScore(resolved, popupRect, m);
    score += this.primaryAxisOverflowPenalty(
      coords,
      popupRect,
      m,
      placementSide,
    );
    if (
      anchorRect &&
      !this.canPointAtAnchor(
        anchorRect,
        popupRect,
        resolved.left,
        resolved.top,
        placementSide,
      )
    ) {
      score += 10000;
    }
    return { score, resolved };
  }

  applyPopupPosition(
    anchorRect,
    popupRect,
    coords,
    placementSide,
    m,
  ) {
    const resolved = this.resolveCoordsAtViewport(
      anchorRect,
      popupRect,
      coords,
      placementSide,
      m,
    );
    this.style.left = `${resolved.left}px`;
    this.style.top = `${resolved.top}px`;
    this.updatePopoverBeak(
      anchorRect,
      popupRect,
      resolved.left,
      resolved.top,
      placementSide,
    );
  }

  currentPlacementSide() {
    const beakSide = this.getAttribute("data-beak-side");
    if (beakSide) return this.oppositeSide(beakSide);
    const { vertical, horizontal, shorthand } = this.parsePosition();
    return this.getPlacementSide(vertical, horizontal, shorthand);
  }

  preservePopupPosition(popupRect, anchor, m) {
    const current = {
      left: popupRect.left,
      top: popupRect.top,
    };
    const next = this.fits(current, popupRect, m)
      ? current
      : this.clampToViewport(current, popupRect, m);
    const anchorRect = anchor ? anchor.getBoundingClientRect() : null;
    const placementSide = this.currentPlacementSide();

    if (
      anchorRect &&
      this.tracksAnchorBeak() &&
      !this.canPointAtAnchor(
        anchorRect,
        popupRect,
        next.left,
        next.top,
        placementSide,
      )
    ) {
      return false;
    }

    this.style.left = `${next.left}px`;
    this.style.top = `${next.top}px`;
    this.updatePopoverBeak(
      anchorRect,
      popupRect,
      next.left,
      next.top,
      placementSide,
    );
    return true;
  }

  positionPopup({ preserveCurrentPosition = false } = {}) {
    if (this.lifecycleState !== "open" && this.lifecycleState !== "opening")
      return;

    const popupRect = this.getBoundingClientRect();
    const anchor = this.resolveAnchor();
    const m = this.parseViewportMargins();
    if (
      preserveCurrentPosition &&
      this.preservePopupPosition(popupRect, anchor, m)
    ) {
      return;
    }
    const offset = this.parseOffset();
    const { vertical, horizontal, shorthand } = this.parsePosition();

    if (!anchor) {
      this.updatePopoverBeak(null, popupRect, 0, 0, "top");
      const bounds = this.getViewportBounds(m);
      const centered = {
        left:
          bounds.minLeft +
          (bounds.maxRight - bounds.minLeft - popupRect.width) / 2,
        top:
          bounds.minTop +
          (bounds.maxBottom - bounds.minTop - popupRect.height) / 2,
      };
      const clamped = this.clampToViewport(centered, popupRect, m);
      this.style.left = `${clamped.left}px`;
      this.style.top = `${clamped.top}px`;
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const candidates = this.getPlacementCandidates(
      vertical,
      horizontal,
      shorthand,
    );
    let best = null;
    let bestSide = "top";
    let bestScore = Number.POSITIVE_INFINITY;

    for (const { v, h, s } of candidates) {
      const coords = this.computeCoords(anchorRect, popupRect, v, h, offset, s);
      const placementSide = this.getPlacementSide(v, h, s);
      const { score, resolved } = this.placementScore(
        anchorRect,
        popupRect,
        coords,
        placementSide,
        m,
      );

      if (s) {
        const bounds = this.getViewportBounds(m);
        const primaryFits =
          s === "left" || s === "right"
            ? coords.left >= bounds.minLeft &&
              coords.left + popupRect.width <= bounds.maxRight
            : coords.top >= bounds.minTop &&
              coords.top + popupRect.height <= bounds.maxBottom;
        if (primaryFits && score < 10000) {
          this.applyPopupPosition(
            anchorRect,
            popupRect,
            coords,
            placementSide,
            m,
          );
          return;
        }
      } else if (score === 0) {
        this.applyPopupPosition(
          anchorRect,
          popupRect,
          coords,
          placementSide,
          m,
        );
        return;
      }

      if (score < bestScore) {
        bestScore = score;
        best = resolved;
        bestSide = placementSide;
      }
    }

    this.applyPopupPosition(
      anchorRect,
      popupRect,
      best || { left: 0, top: 0 },
      bestSide,
      m,
    );
  }

  queueReposition({ preserveCurrentPosition = false } = {}) {
    if (!this.open || !this.isPopupDisplayed() || !this.shouldAutoReposition()) {
      return;
    }
    if (!preserveCurrentPosition) this._pendingFullReposition = true;
    if (this._rafId !== null) return;
    const token = this._lifecycle.capture();

    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      if (!this._lifecycle.isCurrent(token)) return;
      const preservePosition = !this._pendingFullReposition;
      this._pendingFullReposition = false;
      this.positionPopup({ preserveCurrentPosition: preservePosition });
    });
  }

  shouldAutoReposition() {
    if (!(this.drag && this._wasDragged)) return true;
    return !this.resolveAnchor();
  }

  isPopupDisplayed() {
    return (
      this.lifecycleState === "opening" ||
      this.lifecycleState === "open"
    );
  }
}
figDefineCustomizedBuiltIn("fig-popup", FigPopup, { extends: "dialog" });

export { FigPopup };
