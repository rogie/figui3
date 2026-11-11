/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLDialogElement,
  figBooleanAttribute,
  figDefineCustomizedBuiltIn,
} from "../runtime/index.js";
import { figCreateStateMachine } from "../../shared/state-machine.js";

function figToastTransition(state, event) {
  switch (event.type) {
    case "REQUEST_OPEN":
      return state === "open" || state === "opening" ? state : "opening";
    case "REQUEST_CLOSE":
      return state === "closed" || state === "closing" ? state : "closing";
    case "NATIVE_OPENED":
      return "open";
    case "NATIVE_CLOSED":
    case "OPEN_FAILED":
    case "DISCONNECT":
      return "closed";
    default:
      return state;
  }
}

/* Toast */
/* Toast */
/**
 * A temporary toast notification based on &lt;dialog&gt;.
 * @attr {number|string} duration - Auto-dismiss ms (default 5000; 0 = no dismiss).
 * @attr {number|string} offset - Distance from bottom in px (default 16).
 * @attr {string} theme - Visual theme: "dark", "light", "danger", "brand", "success", or "auto".
 * @attr {string} live - Set to "assertive" for urgent announcements.
 * @attr {string} icon - Optional fig-icon name prepended when set; omit for no icon.
 * @attr {boolean|string} dismiss - When true, appends a ghost close button that hides the toast.
 * @attr {boolean|string} open - Open when present and not "false".
 */
class FigToast extends HTMLDialogElement {
  constructor() {
    super();
    this._figInit();
  }

  _figInit() {
    if (this._figInitialized) return;
    this._figInitialized = true;
    this._defaultOffset = 16;
    this._autoCloseTimer = null;
    this._syncingOpen = false;
    this._managedRole = null;
    this._managedLive = null;
    this._managedIcon = null;
    this._managedDismiss = null;
    this._managedDismissSeparator = null;
    this._boundHandleClose = this.handleClose.bind(this);
    this._boundNativeClose = () => {
      this._toastLifecycle.dispatch({ type: "NATIVE_CLOSED" });
    };
    this._toastLifecycle = figCreateStateMachine({
      initialState: "closed",
      transition: figToastTransition,
      effect: (transition) => this.applyLifecycleTransition(transition),
    });
  }

  connectedCallback() {
    this._figInit();
    if (!this.hasAttribute("theme")) this.setAttribute("theme", "dark");
    this.syncLiveRegion();
    this.syncIcon();
    this.syncDismiss();
    this.addCloseListeners();
    this.removeEventListener("close", this._boundNativeClose);
    this.addEventListener("close", this._boundNativeClose);
    this.applyPosition();
    if (this.hasAttribute("open") && this.getAttribute("open") !== "false") {
      this.showToast();
    } else {
      if (this.getAttribute("open") === "false") {
        this._syncingOpen = true;
        this.removeAttribute("open");
        this._syncingOpen = false;
      }
      this._toastLifecycle.dispatch({ type: "REQUEST_CLOSE" });
    }
  }

  disconnectedCallback() {
    this._figInit();
    this._toastLifecycle.dispatch({ type: "DISCONNECT" });
    this.removeEventListener("close", this._boundNativeClose);
  }

  addCloseListeners() {
    this.querySelectorAll("[close-toast]").forEach((button) => {
      if (!button.hasAttribute("aria-label")) button.setAttribute("aria-label", "Close notification");
      button.removeEventListener("click", this._boundHandleClose);
      button.addEventListener("click", this._boundHandleClose);
    });
  }

  handleClose() {
    this.hideToast();
  }

  applyPosition() {
    this.style.position = "fixed";
    this.style.margin = "0";
    this.style.top = "auto";
    const configuredOffset = Number.parseFloat(this.getAttribute("offset"));
    const offset = Number.isFinite(configuredOffset)
      ? configuredOffset
      : this._defaultOffset;
    this.style.bottom = `${offset}px`;
    this.style.left = "50%";
    this.style.right = "auto";
    this.style.transform = "translateX(-50%)";
  }

  syncLiveRegion() {
    const assertive =
      this.getAttribute("live") === "assertive" ||
      this.getAttribute("theme") === "danger";
    const desiredRole = assertive ? "alert" : "status";
    const desiredLive = assertive ? "assertive" : "polite";
    if (!this.hasAttribute("role") || this.getAttribute("role") === this._managedRole) {
      this.setAttribute("role", desiredRole);
      this._managedRole = desiredRole;
    }
    if (
      !this.hasAttribute("aria-live") ||
      this.getAttribute("aria-live") === this._managedLive
    ) {
      this.setAttribute("aria-live", desiredLive);
      this._managedLive = desiredLive;
    }
    if (!this.hasAttribute("aria-atomic")) {
      this.setAttribute("aria-atomic", "true");
    }
  }

  syncIcon() {
    const name = this.getAttribute("icon");
    let icon = this._managedIcon;
    if (!icon || icon.parentNode !== this) {
      icon = this.querySelector(":scope > fig-icon[data-fig-toast-icon]");
    }

    if (!name) {
      if (icon) icon.remove();
      this._managedIcon = null;
      return;
    }

    if (!icon) {
      icon = document.createElement("fig-icon");
      icon.setAttribute("data-fig-toast-icon", "");
      icon.setAttribute("aria-hidden", "true");
      this.prepend(icon);
    } else if (this.firstElementChild !== icon) {
      this.prepend(icon);
    }

    if (icon.getAttribute("size") !== "medium") {
      icon.setAttribute("size", "medium");
    }
    if (icon.getAttribute("name") !== name) {
      icon.setAttribute("name", name);
    }
    this._managedIcon = icon;
  }

  syncDismiss() {
    const enabled = figBooleanAttribute(this, "dismiss");
    let button = this._managedDismiss;
    if (!button || button.parentNode !== this) {
      button = this.querySelector(":scope > fig-button[data-fig-toast-dismiss]");
    }
    let separator = this._managedDismissSeparator;
    if (!separator || separator.parentNode !== this) {
      separator = this.querySelector(
        ":scope > fig-separator[data-fig-toast-dismiss-separator]",
      );
    }

    if (!enabled) {
      if (button) {
        button.removeEventListener("click", this._boundHandleClose);
        button.remove();
      }
      if (separator) separator.remove();
      this._managedDismiss = null;
      this._managedDismissSeparator = null;
      return;
    }

    if (!separator) {
      separator = document.createElement("fig-separator");
      separator.setAttribute("data-fig-toast-dismiss-separator", "");
      separator.setAttribute("direction", "vertical");
      separator.setAttribute("aria-orientation", "vertical");
      separator.setAttribute("aria-hidden", "true");
    }

    if (!button) {
      button = document.createElement("fig-button");
      button.setAttribute("data-fig-toast-dismiss", "");
      button.setAttribute("variant", "ghost");
      button.setAttribute("icon", "");
      button.setAttribute("close-toast", "");
      button.setAttribute("aria-label", "Close notification");
      const icon = document.createElement("fig-icon");
      icon.setAttribute("name", "close");
      icon.setAttribute("aria-hidden", "true");
      button.append(icon);
    }

    if (separator.parentNode !== this || button.parentNode !== this) {
      this.append(separator, button);
    } else if (
      this.lastElementChild !== button ||
      button.previousElementSibling !== separator
    ) {
      this.append(separator, button);
    }

    if (separator.getAttribute("direction") !== "vertical") {
      separator.setAttribute("direction", "vertical");
    }

    button.removeEventListener("click", this._boundHandleClose);
    button.addEventListener("click", this._boundHandleClose);
    this._managedDismiss = button;
    this._managedDismissSeparator = separator;
  }

  startAutoClose() {
    this.clearAutoClose();
    const duration = parseInt(this.getAttribute("duration") ?? "5000");
    if (duration > 0) {
      const token = this._toastLifecycle.capture();
      this._autoCloseTimer = setTimeout(() => {
        if (!this._toastLifecycle.isCurrent(token, "open")) return;
        this.hideToast();
      }, duration);
    }
  }

  clearAutoClose() {
    if (this._autoCloseTimer) {
      clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }
  }

  _resolveAutoTheme() {
    if (this.getAttribute("theme") !== "auto") return;
    const colorScheme =
      getComputedStyle(document.documentElement).colorScheme || "";
    this.style.colorScheme = colorScheme.includes("dark") ? "light" : "dark";
  }

  showToast() {
    if (!this.hasAttribute("open")) {
      this.setAttribute("open", "");
      return;
    }
    this._toastLifecycle.dispatch({ type: "REQUEST_OPEN" });
  }

  beginOpening() {
    this.syncLiveRegion();
    this.syncIcon();
    this.syncDismiss();
    this._resolveAutoTheme();
    this._syncingOpen = true;
    try {
      if (!this.open) this.show();
      this._toastLifecycle.dispatch({ type: "NATIVE_OPENED" });
    } catch {
      this._toastLifecycle.dispatch({ type: "OPEN_FAILED" });
    } finally {
      this._syncingOpen = false;
    }
  }

  finishOpening() {
    this.applyPosition();
    this.startAutoClose();
    this.dispatchEvent(new CustomEvent("toast-show", { bubbles: true }));
  }

  hideToast() {
    if (this.hasAttribute("open")) {
      this.removeAttribute("open");
      return;
    }
    this._toastLifecycle.dispatch({ type: "REQUEST_CLOSE" });
  }

  beginClosing() {
    this.clearAutoClose();
    this._syncingOpen = true;
    try {
      if (this.open) this.close();
    } finally {
      this._syncingOpen = false;
    }
    if (!this.open) {
      this._toastLifecycle.dispatch({ type: "NATIVE_CLOSED" });
    }
  }

  finishClosed(event, from) {
    this.clearAutoClose();
    if (event.type !== "DISCONNECT" && this.hasAttribute("open")) {
      this._syncingOpen = true;
      this.removeAttribute("open");
      this._syncingOpen = false;
    }
    if (event.type !== "DISCONNECT" && from !== "closed") {
      this.dispatchEvent(new CustomEvent("toast-hide", { bubbles: true }));
    }
  }

  applyLifecycleTransition({ event, from, to }) {
    if (to === "opening") this.beginOpening();
    else if (to === "open") this.finishOpening();
    else if (to === "closing") this.beginClosing();
    else if (to === "closed") this.finishClosed(event, from);

    this.dispatchEvent(
      new CustomEvent("fig-toast-lifecycle", {
        detail: {
          state: to,
          previousState: from,
          requestedOpen:
            this.hasAttribute("open") &&
            this.getAttribute("open") !== "false",
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  static get observedAttributes() {
    return ["duration", "offset", "open", "theme", "live", "icon", "dismiss"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._figInit();
    if (oldValue === newValue) return;
    if (!this.isConnected) return;
    if (this._syncingOpen) return;
    if (name === "offset") this.applyPosition();
    if (name === "open") {
      if (newValue !== null && newValue !== "false") this.showToast();
      else this.hideToast();
    }
    if (name === "duration" && this._toastLifecycle.state === "open") {
      this.startAutoClose();
    }
    if (name === "theme") {
      if (newValue === "auto") this._resolveAutoTheme();
      else this.style.removeProperty("color-scheme");
    }
    if (name === "theme" || name === "live") this.syncLiveRegion();
    if (name === "icon") this.syncIcon();
    if (name === "dismiss") this.syncDismiss();
  }
}
figDefineCustomizedBuiltIn("fig-toast", FigToast, { extends: "dialog" });

export { FigToast };
