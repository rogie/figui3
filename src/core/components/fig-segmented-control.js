/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  figBooleanAttribute,
  figDefineElement,
  figNextFrame,
} from "../runtime/index.js";

/**
 * A custom segmented control container element.
 * @attr {string} name - Identifier for the segmented control group
 * @attr {string} value - Selected segment value
 * @attr {boolean} animated - Enables animated selection indicator
 * @attr {"equal"|"auto"} sizing - Segment sizing mode
 * @attr {string} size - Control size. Use `large` for a 32px-tall control.
 */
class FigSegmentedControl extends HTMLElement {
  #selectedSegment = null;
  #boundHandleClick = this.handleClick.bind(this);
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #mutationObserver = null;
  #resizeObserver = null;
  #indicatorFrame = 0;
  #indicatorSyncInstant = false;
  #hasRenderedIndicator = false;
  #parentDisabledSegments = new WeakSet();

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["disabled", "value", "animated", "sizing"];
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "segmented-control";
    if (!this.hasAttribute("role")) this.setAttribute("role", "radiogroup");
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.#applyDisabled(
      this.hasAttribute("disabled") &&
        this.getAttribute("disabled") !== "false",
    );
    this.#startSegmentObserver();
    this.#startResizeObserver();

    // Defer initial selection so child segments are available.
    figNextFrame(this, () => {
      this.#syncSelectionFromAttributes({ enforceFallback: true });
      this.#refreshResizeObserverTargets();
      this.#queueIndicatorSync({ forceInstant: true });
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#indicatorFrame) {
      cancelAnimationFrame(this.#indicatorFrame);
      this.#indicatorFrame = 0;
    }
    this.#indicatorSyncInstant = false;
    this.#hasRenderedIndicator = false;
  }

  get selectedSegment() {
    return this.#selectedSegment;
  }

  set selectedSegment(segment) {
    const segments = this.querySelectorAll("fig-segment");
    for (const seg of segments) {
      const shouldBeSelected = seg === segment;
      const isSelected = figBooleanAttribute(seg, "selected");
      if (shouldBeSelected && !isSelected) {
        seg.setAttribute("selected", "true");
      } else if (!shouldBeSelected && isSelected) {
        seg.removeAttribute("selected");
      }
    }
    this.#selectedSegment =
      segment instanceof HTMLElement && this.contains(segment) ? segment : null;
    this.#syncSegmentA11y();
    this.#queueIndicatorSync();
  }

  get value() {
    return this.getAttribute("value") || "";
  }

  set value(val) {
    if (val === null || val === undefined) {
      this.removeAttribute("value");
      return;
    }
    this.setAttribute("value", String(val));
  }

  #emitSelectionEvents(value) {
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: value,
        bubbles: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: value,
        bubbles: true,
      }),
    );
  }

  #resolveSegmentValue(segment) {
    const explicitValue = segment.getAttribute("value");
    if (explicitValue !== null) {
      const trimmedExplicitValue = explicitValue.trim();
      if (trimmedExplicitValue.length > 0) {
        return trimmedExplicitValue;
      }
    }

    return segment.textContent?.trim() || "";
  }

  #getFirstSelectedSegment() {
    const segments = this.querySelectorAll("fig-segment");
    for (const segment of segments) {
      if (
        segment.hasAttribute("selected") &&
        segment.getAttribute("selected") !== "false"
      )
        return segment;
    }
    return null;
  }

  #availableSegments() {
    return Array.from(this.querySelectorAll("fig-segment")).filter(
      (segment) =>
        !segment.hasAttribute("disabled") ||
        segment.getAttribute("disabled") === "false",
    );
  }

  #syncSegmentA11y() {
    const segments = Array.from(this.querySelectorAll("fig-segment"));
    const selected = segments.find(
      (segment) =>
        segment.hasAttribute("selected") &&
        segment.getAttribute("selected") !== "false",
    );
    segments.forEach((segment) => {
      const disabled =
        segment.hasAttribute("disabled") &&
        segment.getAttribute("disabled") !== "false";
      const isSelected = segment === selected;
      segment.setAttribute("aria-checked", isSelected ? "true" : "false");
      segment.setAttribute("tabindex", !disabled && isSelected ? "0" : "-1");
    });
  }

  #selectSegment(segment) {
    if (!segment) return;
    const previousSegment = this.selectedSegment;
    const previousValue = this.value;
    this.selectedSegment = segment;
    const resolvedValue = this.#resolveSegmentValue(segment);

    if (resolvedValue) {
      this.setAttribute("value", resolvedValue);
    } else {
      this.removeAttribute("value");
    }

    const nextValue = this.value;
    if (previousSegment !== segment || previousValue !== nextValue) {
      this.#emitSelectionEvents(nextValue);
    }
  }

  #handleKeyDown(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    const segments = this.#availableSegments();
    if (!segments.length) return;
    const currentIndex = segments.findIndex((segment) =>
      figBooleanAttribute(segment, "selected"),
    );
    let nextIndex = currentIndex >= 0 ? currentIndex : 0;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        nextIndex = nextIndex > 0 ? nextIndex - 1 : segments.length - 1;
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        nextIndex = nextIndex < segments.length - 1 ? nextIndex + 1 : 0;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = segments.length - 1;
        break;
      case " ":
      case "Enter": {
        const active = event.target.closest("fig-segment");
        if (active && this.contains(active)) {
          event.preventDefault();
          this.#selectSegment(active);
        }
        return;
      }
      default:
        return;
    }

    const next = segments[nextIndex];
    this.#selectSegment(next);
    next.focus();
    requestAnimationFrame(() => {
      if (this.contains(next)) next.focus();
    });
  }

  #selectByValue(value) {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) return false;

    const segments = this.querySelectorAll("fig-segment");
    for (const segment of segments) {
      const segmentValue = this.#resolveSegmentValue(segment);
      if (!segmentValue) continue;
      if (segmentValue === normalizedValue) {
        this.selectedSegment = segment;
        return true;
      }
    }

    return false;
  }

  #isAnimatedEnabled() {
    const rawAnimated = this.getAttribute("animated");
    if (rawAnimated === null) return false;
    if (rawAnimated === "") return true;
    return rawAnimated.trim().toLowerCase() === "true";
  }

  #queueIndicatorSync({ forceInstant = false } = {}) {
    this.#indicatorSyncInstant = this.#indicatorSyncInstant || forceInstant;
    if (this.#indicatorFrame) return;

    this.#indicatorFrame = requestAnimationFrame(() => {
      this.#indicatorFrame = 0;
      const nextForceInstant = this.#indicatorSyncInstant;
      this.#indicatorSyncInstant = false;
      this.#syncIndicator({ forceInstant: nextForceInstant });
    });
  }

  #syncIndicator({ forceInstant = false } = {}) {
    const isDisabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const isAnimated = this.#isAnimatedEnabled();
    const activeSegment =
      this.#selectedSegment && this.contains(this.#selectedSegment)
        ? this.#selectedSegment
        : this.#getFirstSelectedSegment();

    if (isDisabled || !isAnimated) {
      this.style.setProperty("--seg-indicator-opacity", "0");
      this.style.setProperty("--seg-indicator-transition-duration", "0ms");
      this.removeAttribute("data-indicator-ready");
      if (!isAnimated || isDisabled) {
        this.#hasRenderedIndicator = false;
      }
      return;
    }

    if (!activeSegment) {
      // During transient mutation/paint windows, keep the previous indicator
      // state to avoid flicker while the next selected segment resolves.
      if (this.#hasRenderedIndicator) return;
      this.style.setProperty("--seg-indicator-opacity", "0");
      this.style.setProperty("--seg-indicator-transition-duration", "0ms");
      this.removeAttribute("data-indicator-ready");
      return;
    }

    const hostRect = this.getBoundingClientRect();
    const segmentRect = activeSegment.getBoundingClientRect();
    if (hostRect.width <= 0 || segmentRect.width <= 0) {
      if (this.#hasRenderedIndicator) return;
      this.style.setProperty("--seg-indicator-opacity", "0");
      this.style.setProperty("--seg-indicator-transition-duration", "0ms");
      this.removeAttribute("data-indicator-ready");
      return;
    }

    const x = Math.max(0, segmentRect.left - hostRect.left);
    this.style.setProperty("--seg-indicator-x", `${x}px`);
    this.style.setProperty("--seg-indicator-w", `${segmentRect.width}px`);
    this.style.setProperty("--seg-indicator-opacity", "1");
    this.style.setProperty(
      "--seg-indicator-transition-duration",
      !this.#hasRenderedIndicator || forceInstant ? "0ms" : "150ms",
    );
    this.setAttribute("data-indicator-ready", "true");
    this.#hasRenderedIndicator = true;
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#queueIndicatorSync();
    });
    this.#refreshResizeObserverTargets();
  }

  #refreshResizeObserverTargets() {
    if (!this.#resizeObserver) return;
    this.#resizeObserver.disconnect();
    this.#resizeObserver.observe(this);
    this.querySelectorAll("fig-segment").forEach((segment) => {
      this.#resizeObserver?.observe(segment);
    });
  }

  #syncSelectionFromAttributes({ enforceFallback = false } = {}) {
    const segments = this.querySelectorAll("fig-segment");
    if (segments.length === 0) {
      this.#selectedSegment = null;
      this.#queueIndicatorSync({ forceInstant: true });
      return;
    }

    const rawValue = this.getAttribute("value");
    const normalizedValue = rawValue?.trim() ?? "";
    if (rawValue !== null) {
      if (normalizedValue !== rawValue) {
        this.setAttribute("value", normalizedValue);
        return;
      }

      if (normalizedValue && this.#selectByValue(normalizedValue)) {
        return;
      }
    }

    const selected = this.#getFirstSelectedSegment();
    if (selected) {
      this.selectedSegment = selected;
      return;
    }

    if (enforceFallback) {
      this.selectedSegment = this.#availableSegments()[0] || null;
    }
  }

  #startSegmentObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver((mutations) => {
      let shouldResync = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          shouldResync = true;
          break;
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement &&
          mutation.target.tagName.toLowerCase() === "fig-segment" &&
          (mutation.attributeName === "value" ||
            mutation.attributeName === "selected")
        ) {
          shouldResync = true;
          break;
        }

        if (mutation.type === "characterData") {
          shouldResync = true;
          break;
        }
      }

      if (shouldResync) {
        this.#applyDisabled(
          this.hasAttribute("disabled") &&
            this.getAttribute("disabled") !== "false",
        );
        this.#refreshResizeObserverTargets();
        this.#syncSelectionFromAttributes({ enforceFallback: true });
        this.#syncSegmentA11y();
      }
    });

    this.#mutationObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value", "selected"],
    });
  }

  handleClick(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    ) {
      return;
    }
    const segment = event.target.closest("fig-segment");
    if (!segment || !this.contains(segment)) return;
    if (
      segment.hasAttribute("disabled") &&
      segment.getAttribute("disabled") !== "false"
    )
      return;

    this.#selectSegment(segment);
  }

  #applyDisabled(disabled) {
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.querySelectorAll("fig-segment").forEach((segment) => {
      if (disabled) {
        const alreadyDisabled =
          segment.hasAttribute("disabled") &&
          segment.getAttribute("disabled") !== "false";
        if (!alreadyDisabled) {
          this.#parentDisabledSegments.add(segment);
          segment.setAttribute("disabled", "");
        }
        segment.setAttribute("aria-disabled", "true");
      } else if (this.#parentDisabledSegments.has(segment)) {
        this.#parentDisabledSegments.delete(segment);
        segment.removeAttribute("disabled");
        segment.removeAttribute("aria-disabled");
      }
    });
    this.#syncSegmentA11y();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "disabled") {
      this.#applyDisabled(newValue !== null && newValue !== "false");
      this.#queueIndicatorSync({ forceInstant: true });
      return;
    }

    if (name === "value") {
      this.#syncSelectionFromAttributes({ enforceFallback: false });
      return;
    }

    if (name === "animated") {
      if (!this.#isAnimatedEnabled()) {
        this.#hasRenderedIndicator = false;
      }
      this.#queueIndicatorSync({ forceInstant: true });
      return;
    }

    if (name === "sizing") {
      this.#queueIndicatorSync({ forceInstant: true });
    }
  }
}
figDefineElement("fig-segmented-control", FigSegmentedControl);

export { FigSegmentedControl };
