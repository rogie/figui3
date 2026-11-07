/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  figHexToRGB,
  figHslToRGB,
  figInterpolateHue,
  figLinearToSRGB,
  figOklabToOklch,
  figOklabToRGB,
  figOklchToOklab,
  figRGBToHsl as figRgbToHsl,
  figRGBToLinear,
  figRGBToOklab,
} from "./fig-color.js";
import { FIG_ICON_TOKENS } from "../../../icons/manifest.js";
import {
  FIG_SVG_NAMESPACE,
  figAppendChildren,
  figBindFormReset,
  figBooleanAttribute,
  figCloneValue,
  figCreateElement,
  figCreateSvgElement,
  figNextFrame,
  figSetAttributes,
  figValuesEqual,
} from "../../shared/dom.js";
import {
  CustomEvent,
  HTMLDialogElement,
  HTMLElement,
} from "../../shared/platform.js";

/**
 * Generates a unique ID string using timestamp and random values
 * @returns {string} A unique identifier
 */
function figIsWebKitOrIOSBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const userAgent = navigator.userAgent || "";
  const isIOSBrowser =
    /\b(iPad|iPhone|iPod)\b/.test(userAgent) ||
    (/\bMacintosh\b/.test(userAgent) && /\bMobile\b/.test(userAgent));
  const isDesktopWebKit =
    /\bAppleWebKit\b/.test(userAgent) &&
    !/\b(Chrome|Chromium|Edg|OPR|SamsungBrowser)\b/.test(userAgent);
  return isIOSBrowser || isDesktopWebKit;
}

/** @param {string} name @param {{ size?: string, className?: string }} [options] */
function createFigIcon(name, options = {}) {
  const icon = document.createElement("fig-icon");
  if (name) icon.setAttribute("name", name);
  if (options.size) icon.setAttribute("size", options.size);
  if (options.slot) icon.setAttribute("slot", options.slot);
  if (options.className) icon.className = options.className;
  return icon;
}

function figColorEventAliases(color, alpha, opacity) {
  const numericAlpha = Number(alpha);
  const numericOpacity = Number(opacity);
  const normalizedAlpha = Number.isFinite(numericAlpha)
    ? Math.max(0, Math.min(1, numericAlpha))
    : Number.isFinite(numericOpacity)
      ? Math.max(0, Math.min(100, numericOpacity)) / 100
      : 1;
  const normalizedOpacity = Number.isFinite(numericOpacity)
    ? Math.max(0, Math.min(100, numericOpacity))
    : Math.round(normalizedAlpha * 100);
  return { color, alpha: normalizedAlpha, opacity: normalizedOpacity };
}

function createFigOverflowButtons({
  owner,
  onStart,
  onEnd,
  startClass = "",
  endClass = "",
  chevronClass = "",
  startLabel = "Scroll back",
  endLabel = "Scroll forward",
} = {}) {
  const makeButton = (direction, onPointerDown) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "fig-overflow",
      `fig-overflow-${direction}`,
      direction === "start" ? startClass : endClass,
    ]
      .filter(Boolean)
      .join(" ");
    button.dataset.figOverflow = direction;
    if (owner) button.setAttribute(`data-fig-${owner}-nav`, direction);
    button.setAttribute("tabindex", "-1");
    button.setAttribute(
      "aria-label",
      direction === "start" ? startLabel : endLabel,
    );
    button.appendChild(
      createFigIcon("chevron", {
        size: "small",
        className: ["fig-overflow-chevron", chevronClass].filter(Boolean).join(" "),
      }),
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onPointerDown?.(event);
    });
    return button;
  };

  return {
    start: makeButton("start", onStart),
    end: makeButton("end", onEnd),
  };
}

/* Shared by light-DOM fig-select-options and shadow fig-menu .fig-menu-options.
   Adopted on document and on fig-menu's shadow so hover/icon/overflow stay one source. */
const FIG_VERTICAL_OVERFLOW_CSS = `
fig-select-options,
.fig-menu-options {
  --fig-vertical-overflow-size: var(--spacer-4);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - 1rem);
  padding: 0;
  overflow: hidden auto;
  scrollbar-width: none;
}
fig-select-options::-webkit-scrollbar,
.fig-menu-options::-webkit-scrollbar {
  display: none;
}
fig-select-options > :not(.fig-overflow),
.fig-menu-options > :not(.fig-overflow) {
  flex-shrink: 0;
}
fig-select-options > :nth-child(1 of :not(.fig-overflow)):not(:is(fig-separator, fig-menu-separator):has(> label)),
.fig-menu-options > :nth-child(1 of :not(.fig-overflow)):not(:is(fig-separator, fig-menu-separator):has(> label)) {
  margin-top: var(--spacer-2);
}
fig-select-options > :not(.fig-overflow):last-child,
.fig-menu-options > :not(.fig-overflow):last-child,
fig-select-options > :not(.fig-overflow):has(+ .fig-overflow-end),
.fig-menu-options > :not(.fig-overflow):has(+ .fig-overflow-end) {
  margin-bottom: var(--spacer-2);
}
fig-select-options > .fig-overflow,
.fig-menu-options > .fig-overflow {
  all: unset;
  box-sizing: border-box;
  position: sticky;
  left: 0;
  z-index: 3;
  flex: 0 0 var(--fig-vertical-overflow-size);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--fig-vertical-overflow-size);
  margin: 0;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  color: var(--figma-color-text-menu);
  background: var(--figma-color-bg-menu) !important;
}
fig-select-options > .fig-overflow::before,
.fig-menu-options > .fig-overflow::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: 0;
  background: var(--figma-color-bg-menu) !important;
}
fig-select-options > .fig-overflow:hover,
.fig-menu-options > .fig-overflow:hover {
  color: var(--figma-color-text-menu);
}
fig-select-options > .fig-overflow:hover::before,
.fig-menu-options > .fig-overflow:hover::before {
  background: light-dark(
    rgba(0, 0, 0, 0.06),
    rgba(255, 255, 255, 0.08)
  ) !important;
}
fig-select-options > .fig-overflow .fig-overflow-chevron,
.fig-menu-options > .fig-overflow .fig-overflow-chevron {
  position: relative;
}
fig-select-options > .fig-overflow:active .fig-overflow-chevron,
.fig-menu-options > .fig-overflow:active .fig-overflow-chevron {
  transform: translateY(1px);
}
fig-select-options.overflow-start > .fig-overflow-start,
.fig-menu-options.overflow-start > .fig-overflow-start,
fig-select-options.overflow-end > .fig-overflow-end,
.fig-menu-options.overflow-end > .fig-overflow-end {
  opacity: 1;
  pointer-events: auto;
}
fig-select-options > .fig-overflow-start,
.fig-menu-options > .fig-overflow-start {
  order: -1;
  top: 0;
  margin-block-end: calc(-1 * var(--fig-vertical-overflow-size));
}
fig-select-options > .fig-overflow-start::before,
.fig-menu-options > .fig-overflow-start::before {
  border-radius: var(--radius-large) var(--radius-large) 0 0;
}
fig-select-options > .fig-overflow-start .fig-overflow-chevron,
.fig-menu-options > .fig-overflow-start .fig-overflow-chevron {
  rotate: 180deg;
}
fig-select-options > .fig-overflow-end,
.fig-menu-options > .fig-overflow-end {
  order: 1;
  bottom: 0;
  margin-block-start: calc(-1 * var(--fig-vertical-overflow-size));
}
fig-select-options > .fig-overflow-end::before,
.fig-menu-options > .fig-overflow-end::before {
  border-radius: 0 0 var(--radius-large) var(--radius-large);
}
fig-select-options.overflow-start > :is(fig-separator, fig-menu-separator)[sticky]:not([sticky="false"]),
.fig-menu-options.overflow-start > :is(fig-separator, fig-menu-separator)[sticky]:not([sticky="false"]) {
  top: var(--fig-vertical-overflow-size, var(--spacer-4)) !important;
}
`;

const FIG_SHADOW_ICON_CSS = `
fig-icon {
  contain: size;
  --size: var(--spacer-4);
  display: inline-flex;
  width: var(--size);
  height: var(--size);
  flex-shrink: 0;
  background: currentColor;
  mask-image: var(--icon);
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  -webkit-mask-image: var(--icon);
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
}
fig-icon[size="small"] {
  --size: var(--spacer-3);
}
`;

const figVerticalOverflowSheet =
  typeof CSSStyleSheet === "function" &&
  typeof CSSStyleSheet.prototype.replaceSync === "function"
    ? new CSSStyleSheet()
    : null;
figVerticalOverflowSheet?.replaceSync(FIG_VERTICAL_OVERFLOW_CSS);

const figShadowIconSheet =
  typeof CSSStyleSheet === "function" &&
  typeof CSSStyleSheet.prototype.replaceSync === "function"
    ? new CSSStyleSheet()
    : null;
figShadowIconSheet?.replaceSync(FIG_SHADOW_ICON_CSS);

function figAdoptConstructedSheet(root, sheet, cssText, marker) {
  if (!root || !cssText) return;
  if (sheet && "adoptedStyleSheets" in root) {
    if ([...root.adoptedStyleSheets].includes(sheet)) return;
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return;
  }
  const host = root === document ? document.documentElement : root;
  if (host.querySelector?.(`style[data-fig-${marker}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(`data-fig-${marker}`, "");
  style.textContent = cssText;
  host.prepend(style);
}

function figAdoptVerticalOverflowStyles(root, options = {}) {
  figAdoptConstructedSheet(
    root,
    figVerticalOverflowSheet,
    FIG_VERTICAL_OVERFLOW_CSS,
    "vertical-overflow",
  );
  if (options.icons) {
    figAdoptConstructedSheet(
      root,
      figShadowIconSheet,
      FIG_SHADOW_ICON_CSS,
      "shadow-icon",
    );
  }
}

if (typeof document !== "undefined") {
  figAdoptVerticalOverflowStyles(document);
}

function figSyncOverflowState(host, scrollEl, axis = "x", threshold = 2) {
  if (!host || !scrollEl) return false;
  const isHorizontal = axis === "x";
  const scrollSize = isHorizontal ? scrollEl.scrollWidth : scrollEl.scrollHeight;
  const clientSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollPosition = isHorizontal ? scrollEl.scrollLeft : scrollEl.scrollTop;
  const scrollable = scrollSize - clientSize > threshold;
  const atStart = !scrollable || scrollPosition <= threshold;
  const atEnd = !scrollable || scrollPosition + clientSize >= scrollSize - threshold;
  host.classList.toggle("overflow-start", !atStart);
  host.classList.toggle("overflow-end", !atEnd);
  return scrollable;
}

function figScrollOverflowPage(
  scrollEl,
  axis = "x",
  direction = 1,
  behavior = "smooth",
) {
  if (!scrollEl) return;
  const isHorizontal = axis === "x";
  const pageSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollAmount = pageSize * 0.8 * direction;
  scrollEl.scrollBy({
    [isHorizontal ? "left" : "top"]: scrollAmount,
    behavior,
  });
}

function figScrollElementToCenter(
  scrollEl,
  element,
  axis = "y",
  behavior = "auto",
) {
  if (!scrollEl || !element || !scrollEl.contains(element)) return;
  requestAnimationFrame(() => {
    if (!scrollEl.isConnected || !element.isConnected) return;
    const isHorizontal = axis === "x";
    const scrollSize = isHorizontal
      ? scrollEl.scrollWidth
      : scrollEl.scrollHeight;
    const clientSize = isHorizontal
      ? scrollEl.clientWidth
      : scrollEl.clientHeight;
    if (scrollSize <= clientSize + 1) {
      figSyncOverflowState(scrollEl, scrollEl, axis);
      return;
    }
    const elementRect = element.getBoundingClientRect();
    const hostRect = scrollEl.getBoundingClientRect();
    const currentScroll = isHorizontal
      ? scrollEl.scrollLeft
      : scrollEl.scrollTop;
    const elementStart =
      (isHorizontal ? elementRect.left - hostRect.left : elementRect.top - hostRect.top) +
      currentScroll;
    const elementSize = isHorizontal ? elementRect.width : elementRect.height;
    const maxScroll = scrollSize - clientSize;
    const nextScroll = Math.max(
      0,
      Math.min(elementStart + elementSize / 2 - clientSize / 2, maxScroll),
    );
    scrollEl.scrollTo({
      [isHorizontal ? "left" : "top"]: nextScroll,
      behavior,
    });
    figSyncOverflowState(scrollEl, scrollEl, axis);
  });
}

function hasFigFillPicker() {
  return typeof customElements !== "undefined" && !!customElements.get("fig-fill-picker");
}

function figSupportsCustomizedBuiltIns() {
  if (
    typeof window === "undefined" ||
    !window.customElements ||
    typeof HTMLButtonElement === "undefined"
  ) {
    return false;
  }

  const testName = `fig-builtin-probe-${Math.random().toString(36).slice(2)}`;
  class FigCustomizedBuiltInProbe extends HTMLButtonElement {}

  try {
    customElements.define(testName, FigCustomizedBuiltInProbe, {
      extends: "button",
    });
    const probe = document.createElement("button", { is: testName });
    return probe instanceof FigCustomizedBuiltInProbe;
  } catch (_error) {
    return false;
  }
}

const figNeedsBuiltInPolyfill =
  figIsWebKitOrIOSBrowser() && !figSupportsCustomizedBuiltIns();
const figBuiltInPolyfillReady = (
  figNeedsBuiltInPolyfill
    ? import("../../../polyfills/custom-elements-webkit.js")
    : Promise.resolve()
)
  .then(() => {})
  .catch((error) => {
    throw error;
  });

function figDefineCustomizedBuiltIn(name, constructor, options) {
  if (typeof customElements === "undefined") return;
  const define = () => {
    if (!customElements.get(name)) {
      customElements.define(name, constructor, options);
    }
  };

  if (!figNeedsBuiltInPolyfill) {
    define();
    return;
  }

  figBuiltInPolyfillReady.then(define).catch((error) => {
    console.error(
      `[figui3] Failed to load customized built-in polyfill for "${name}".`,
      error,
    );
  });
}

function figDefineElement(name, constructor) {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function figUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** Zero-size portal for fixed overlays so they never affect body layout metrics. */
function figGetOverlayRoot() {
  if (!document.body) return null;
  const attr = "data-figui-overlay-root";
  let root = document.body.querySelector(`:scope > [${attr}]`);
  if (!root) {
    root = document.createElement("div");
    root.setAttribute(attr, "");
    document.body.append(root);
  }
  return root;
}

let _figZCounter = 10000;
function figGetHighestZIndex() {
  return _figZCounter++;
}

function figSyncCssVar(el, prop, value) {
  if (value && value.trim()) {
    el.style.setProperty(prop, value.trim());
  } else {
    el.style.removeProperty(prop);
  }
}

function figEscapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

let _figSharedCanvas = null;
let _figSharedCtx = null;
function figGetSharedCanvas(width = 1, height = 1) {
  if (!_figSharedCanvas) {
    _figSharedCanvas = document.createElement("canvas");
    _figSharedCtx = _figSharedCanvas.getContext("2d");
  }
  if (_figSharedCanvas.width !== width) _figSharedCanvas.width = width;
  if (_figSharedCanvas.height !== height) _figSharedCanvas.height = height;
  return { canvas: _figSharedCanvas, ctx: _figSharedCtx };
}

/**
 * Checks if the browser supports the native popover API
 * @returns {boolean} True if popover is supported
 */
function figSupportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}

export {
  CustomEvent,
  FIG_ICON_TOKENS,
  FIG_SHADOW_ICON_CSS,
  FIG_SVG_NAMESPACE,
  FIG_VERTICAL_OVERFLOW_CSS,
  HTMLDialogElement,
  HTMLElement,
  createFigIcon,
  createFigOverflowButtons,
  figAdoptConstructedSheet,
  figAdoptVerticalOverflowStyles,
  figAppendChildren,
  figBindFormReset,
  figBooleanAttribute,
  figBuiltInPolyfillReady,
  figCloneValue,
  figColorEventAliases,
  figCreateElement,
  figCreateSvgElement,
  figDefineCustomizedBuiltIn,
  figDefineElement,
  figEscapeAttribute,
  figGetHighestZIndex,
  figGetOverlayRoot,
  figGetSharedCanvas,
  figHexToRGB,
  figHslToRGB,
  figInterpolateHue,
  figIsWebKitOrIOSBrowser,
  figLinearToSRGB,
  figNeedsBuiltInPolyfill,
  figNextFrame,
  figOklabToOklch,
  figOklabToRGB,
  figOklchToOklab,
  figRgbToHsl,
  figRGBToLinear,
  figRGBToOklab,
  figScrollElementToCenter,
  figScrollOverflowPage,
  figSetAttributes,
  figShadowIconSheet,
  figSupportsCustomizedBuiltIns,
  figSupportsPopover,
  figSyncCssVar,
  figSyncOverflowState,
  figUniqueId,
  figValuesEqual,
  figVerticalOverflowSheet,
  hasFigFillPicker,
};
