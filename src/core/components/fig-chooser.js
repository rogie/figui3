/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigOverflowButtons,
  figBooleanAttribute,
  figDefineElement,
  figNextFrame,
  figScrollOverflowPage,
  figSyncOverflowState,
} from "../runtime/index.js";

/* Chooser */
/**
 * A selection controller for a list of choice elements.
 * @attr {string} choice-element - CSS selector for child choices (default: "fig-choice")
 * @attr {string} layout - Layout mode: "vertical" (default), "horizontal", "grid"
 * @attr {number} columns - Number of columns when layout="grid" (default: 2)
 * @attr {string} value - Selected choice value. Omit to select the first choice; `value=""` means none.
 * @attr {boolean} disabled - Whether the chooser is disabled
 * @attr {boolean} auto-scroll - Whether selection changes automatically scroll into view (default: true)
 * @attr {"auto"|"smooth"} scroll-behavior - Scrolling animation behavior (default: "smooth")
 */
class FigChooser extends HTMLElement {
  #selectedChoice = null;
  #boundHandleClick = this.#handleClick.bind(this);
  #boundHandleKeyDown = this.#handleKeyDown.bind(this);
  #boundSyncOverflow = this.#syncOverflow.bind(this);
  #mutationObserver = null;
  #resizeObserver = null;
  #navStart = null;
  #navEnd = null;
  #dragState = null;
  #isUnwrapping = false;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "choice-element",
      "columns",
      "drag",
      "layout",
      "overflow",
      "loop",
      "auto-scroll",
    ];
  }

  get #overflowMode() {
    return this.getAttribute("overflow") === "scrollbar"
      ? "scrollbar"
      : "buttons";
  }

  get #dragEnabled() {
    const attr = this.getAttribute("drag");
    return attr === null || attr !== "false";
  }

  get autoScroll() {
    const attr = this.getAttribute("auto-scroll");
    return attr === null || attr !== "false";
  }

  set autoScroll(value) {
    if (value === false || value === "false" || value === null) {
      this.setAttribute("auto-scroll", "false");
    } else {
      this.removeAttribute("auto-scroll");
    }
  }

  get scrollBehavior() {
    return this.getAttribute("scroll-behavior") === "auto" ? "auto" : "smooth";
  }

  set scrollBehavior(value) {
    if (value === "auto" || value === "smooth") {
      this.setAttribute("scroll-behavior", value);
    } else {
      this.removeAttribute("scroll-behavior");
    }
  }

  get #choiceSelector() {
    return this.getAttribute("choice-element") || "fig-choice";
  }

  #syncGridColumns() {
    const raw = this.getAttribute("columns");
    const columns = raw === null ? NaN : Number(raw);
    const validColumns = Number.isInteger(columns) && columns > 0;
    if (validColumns) {
      this.style.setProperty("--fig-chooser-grid-columns", String(columns));
    } else {
      this.style.removeProperty("--fig-chooser-grid-columns");
    }
  }

  get choices() {
    return Array.from(this.querySelectorAll(`:scope > ${this.#choiceSelector}`));
  }

  get selectedChoice() {
    return this.#selectedChoice;
  }

  set selectedChoice(element) {
    if (element && !this.contains(element)) return;
    const choices = this.choices;
    for (const choice of choices) {
      const shouldSelect = choice === element;
      const isSelected = figBooleanAttribute(choice, "selected");
      if (shouldSelect && !isSelected) {
        choice.setAttribute("selected", "");
      } else if (!shouldSelect && isSelected) {
        choice.removeAttribute("selected");
      }
    }
    this.#selectedChoice = element ?? null;
    const val = element?.getAttribute("value") ?? "";
    if (this.getAttribute("value") !== val) {
      this.setAttribute("value", val);
    }
    if (this.autoScroll) this.#scrollToChoice(element);
  }

  get value() {
    return this.#selectedChoice?.getAttribute("value") ?? "";
  }

  set value(val) {
    if (val === null || val === undefined || val === "") {
      this.setAttribute("value", "");
      return;
    }
    this.setAttribute("value", String(val));
  }

  scrollSelectionIntoView(options = {}) {
    if (!this.#selectedChoice) return;
    this.#scrollToChoice(this.#selectedChoice, options);
  }

  connectedCallback() {
    this.setAttribute("role", "listbox");
    if (this.shadowRoot) this.shadowRoot.replaceChildren();
    this.#syncGridColumns();
    this.#removeLegacyScroller();
    this.addEventListener("click", this.#boundHandleClick);
    this.addEventListener("keydown", this.#boundHandleKeyDown);
    this.addEventListener("scroll", this.#boundSyncOverflow);
    this.#applyOverflowMode();
    this.#setupDrag();
    this.#startObserver();
    this.#startResizeObserver();
    this.#syncDisabledChoices();

    figNextFrame(this, () => {
      this.#syncSelection();
      this.#syncOverflow();
      this.#scheduleInitialScrollSettle();
    });
  }

  #scheduleInitialScrollSettle() {
    requestAnimationFrame(() => {
      if (!this.isConnected || !this.autoScroll) return;
      if (this.#selectedChoice) {
        this.#scrollToChoice(this.#selectedChoice);
      }
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#boundHandleClick);
    this.removeEventListener("keydown", this.#boundHandleKeyDown);
    this.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#teardownDrag();
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#removeNavButtons();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value" && newValue !== oldValue) {
      if (newValue === "") {
        this.selectedChoice = null;
      } else if (newValue == null) {
        this.#syncSelection();
      } else {
        this.#selectByValue(newValue);
      }
    }
    if (name === "disabled") {
      this.#syncDisabledChoices();
    }
    if (name === "choice-element") {
      requestAnimationFrame(() => {
        this.#syncGridColumns();
        this.#syncSelection();
      });
    }
    if (name === "columns") {
      this.#syncGridColumns();
      this.#resettleSelectedChoice();
    }
    if (name === "drag") {
      if (this.#dragEnabled) {
        this.#setupDrag();
      } else {
        this.#teardownDrag();
      }
    }
    if (name === "overflow") {
      this.#applyOverflowMode();
      requestAnimationFrame(() => this.#syncOverflow());
    }
    if (name === "layout") {
      this.#syncGridColumns();
      this.#applyOverflowMode();
      if (newValue === "horizontal") {
        this.scrollTop = 0;
      } else {
        this.scrollLeft = 0;
      }
      this.#resettleSelectedChoice();
    }
    if (name === "auto-scroll" && this.autoScroll) {
      this.#resettleSelectedChoice();
    }
  }

  #syncSelection() {
    const choices = this.choices;
    if (!choices.length) {
      this.#selectedChoice = null;
      return;
    }

    const hasValueAttr = this.hasAttribute("value");
    const valueAttr = this.getAttribute("value");
    if (hasValueAttr && valueAttr === "") {
      this.selectedChoice = null;
      return;
    }
    if (valueAttr && this.#selectByValue(valueAttr)) return;

    const alreadySelected = choices.find((choice) =>
      figBooleanAttribute(choice, "selected"),
    );
    if (alreadySelected) {
      this.selectedChoice = alreadySelected;
      return;
    }

    this.selectedChoice = choices[0];
  }

  #syncDisabledChoices() {
    const chooserDisabled = figBooleanAttribute(this, "disabled");
    if (chooserDisabled) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");
    for (const choice of this.choices) {
      const disabled =
        chooserDisabled || figBooleanAttribute(choice, "disabled");
      if (disabled) {
        choice.setAttribute("aria-disabled", "true");
        choice.setAttribute("tabindex", "-1");
      } else {
        choice.removeAttribute("aria-disabled");
        choice.setAttribute("tabindex", "0");
      }
    }
  }

  #selectByValue(value) {
    const choices = this.choices;
    for (const choice of choices) {
      if (choice.getAttribute("value") === value) {
        this.selectedChoice = choice;
        return true;
      }
    }
    return false;
  }

  #findChoiceFromTarget(target) {
    const selector = this.#choiceSelector;
    let el = target;
    while (el && el !== this) {
      if (el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  #handleClick(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    const choice = this.#findChoiceFromTarget(event.target);
    if (!choice) return;
    if (
      choice.hasAttribute("disabled") &&
      choice.getAttribute("disabled") !== "false"
    )
      return;
    this.selectedChoice = choice;
    this.#emitEvents();
  }

  #handleKeyDown(event) {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    const choices = this.choices.filter(
      (c) =>
        !c.hasAttribute("disabled") || c.getAttribute("disabled") === "false",
    );
    if (!choices.length) return;
    const focusedChoice = this.#findChoiceFromTarget(event.target);
    const currentIndex = choices.indexOf(focusedChoice);
    let nextIndex = currentIndex;

    const loop = this.hasAttribute("loop");

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        if (currentIndex < choices.length - 1) {
          nextIndex = currentIndex + 1;
        } else if (loop) {
          nextIndex = 0;
        }
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        if (currentIndex > 0) {
          nextIndex = currentIndex - 1;
        } else if (loop) {
          nextIndex = choices.length - 1;
        }
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = choices.length - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedChoice && focusedChoice !== this.#selectedChoice) {
          this.selectedChoice = focusedChoice;
          this.#emitEvents();
        }
        return;
      default:
        return;
    }

    if (nextIndex !== currentIndex && choices[nextIndex]) {
      const nextChoice = choices[nextIndex];
      nextChoice.focus({ preventScroll: true });
      if (this.autoScroll) this.#scrollToChoice(nextChoice);
    }
  }

  #emitEvents() {
    const val = this.value;
    this.dispatchEvent(
      new CustomEvent("input", { detail: val, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: val, bubbles: true }),
    );
  }

  #syncOverflow() {
    if (this.#overflowMode === "scrollbar") return;
    const isHorizontal = this.getAttribute("layout") === "horizontal";
    figSyncOverflowState(this, this, isHorizontal ? "x" : "y");
  }

  #startResizeObserver() {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#syncOverflow();
      this.#resettleSelectedChoice();
    });
    this.#resizeObserver.observe(this);
  }

  #setupDrag() {
    if (this.#dragState?.bound) return;
    if (!this.#dragEnabled) return;

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest("[data-fig-chooser-nav]")) return;
      const isHorizontal = this.getAttribute("layout") === "horizontal";
      const hasOverflow = isHorizontal
        ? this.scrollWidth > this.clientWidth
        : this.scrollHeight > this.clientHeight;
      if (!hasOverflow) return;

      this.#dragState.active = true;
      this.#dragState.didDrag = false;
      this.#dragState.startX = e.clientX;
      this.#dragState.startY = e.clientY;
      this.#dragState.scrollLeft = this.scrollLeft;
      this.#dragState.scrollTop = this.scrollTop;
      this.style.cursor = "grab";
      this.style.userSelect = "none";
    };

    const onPointerMove = (e) => {
      if (!this.#dragState.active) return;
      const isHorizontal = this.getAttribute("layout") === "horizontal";
      const dx = e.clientX - this.#dragState.startX;
      const dy = e.clientY - this.#dragState.startY;

      if (!this.#dragState.didDrag && Math.abs(isHorizontal ? dx : dy) > 3) {
        this.#dragState.didDrag = true;
        this.style.cursor = "grabbing";
        this.setPointerCapture(e.pointerId);
      }

      if (!this.#dragState.didDrag) return;

      if (isHorizontal) {
        this.scrollLeft = this.#dragState.scrollLeft - dx;
      } else {
        this.scrollTop = this.#dragState.scrollTop - dy;
      }
    };

    const onPointerUp = (e) => {
      if (!this.#dragState.active) return;
      const wasDrag = this.#dragState.didDrag;
      this.#dragState.active = false;
      this.#dragState.didDrag = false;
      this.style.cursor = "";
      this.style.userSelect = "";
      if (e.pointerId !== undefined) {
        try {
          this.releasePointerCapture(e.pointerId);
        } catch {}
      }
      if (wasDrag) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClick = (e) => {
      if (this.#dragState?.suppressClick) {
        e.stopPropagation();
        e.preventDefault();
        this.#dragState.suppressClick = false;
      }
    };

    const onPointerUpCapture = (e) => {
      if (this.#dragState?.didDrag) {
        this.#dragState.suppressClick = true;
        setTimeout(() => {
          if (this.#dragState) this.#dragState.suppressClick = false;
        }, 0);
      }
    };

    const onDragStart = (e) => {
      if (this.#dragState?.active) {
        e.preventDefault();
      }
    };

    this.#dragState = {
      active: false,
      didDrag: false,
      suppressClick: false,
      startX: 0,
      startY: 0,
      scrollLeft: 0,
      scrollTop: 0,
      bound: true,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onClick,
      onPointerUpCapture,
      onDragStart,
    };

    this.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    this.addEventListener("pointerup", onPointerUpCapture, true);
    this.addEventListener("click", onClick, true);
    this.addEventListener("dragstart", onDragStart);
  }

  #teardownDrag() {
    if (!this.#dragState?.bound) return;
    this.removeEventListener("pointerdown", this.#dragState.onPointerDown);
    window.removeEventListener("pointermove", this.#dragState.onPointerMove);
    window.removeEventListener("pointerup", this.#dragState.onPointerUp);
    this.removeEventListener(
      "pointerup",
      this.#dragState.onPointerUpCapture,
      true,
    );
    this.removeEventListener("click", this.#dragState.onClick, true);
    this.removeEventListener("dragstart", this.#dragState.onDragStart);
    this.style.cursor = "";
    this.style.userSelect = "";
    this.#dragState = null;
  }

  #removeLegacyScroller() {
    if (this.#isUnwrapping) return;
    const legacy = this.querySelector(":scope > [data-fig-chooser-scroll]");
    if (!legacy) return;

    this.#isUnwrapping = true;
    try {
      const nodes = Array.from(legacy.childNodes);
      legacy.replaceWith(...nodes);
    } finally {
      this.#isUnwrapping = false;
    }
  }

  #applyOverflowMode() {
    const usesScrollbar = this.#overflowMode === "scrollbar";
    const isGrid = this.getAttribute("layout") === "grid";
    if (usesScrollbar || isGrid) {
      this.#removeNavButtons();
      this.classList.toggle("fig-overflow-fade", usesScrollbar);
      this.classList.toggle(
        "fig-overflow-fade-horizontal",
        usesScrollbar && this.getAttribute("layout") === "horizontal",
      );
    } else {
      this.#createNavButtons();
      this.classList.remove("fig-overflow-fade", "fig-overflow-fade-horizontal");
    }
  }

  #removeNavButtons() {
    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;
    this.classList.remove("overflow-start", "overflow-end");
  }

  #createNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.contains(this.#navStart) &&
      this.contains(this.#navEnd)
    ) {
      this.#positionNavButtons();
      return;
    }

    this.#navStart?.remove();
    this.#navEnd?.remove();
    this.#navStart = null;
    this.#navEnd = null;

    const buttons = createFigOverflowButtons({
      owner: "chooser",
      startClass: "fig-chooser-nav-start",
      endClass: "fig-chooser-nav-end",
      chevronClass: "fig-chooser-nav-chevron",
      onStart: () => this.#scrollByPage(-1),
      onEnd: () => this.#scrollByPage(1),
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

  #scrollByPage(direction) {
    const isHorizontal = this.getAttribute("layout") === "horizontal";
    figScrollOverflowPage(this, isHorizontal ? "x" : "y", direction, "auto");
  }

  #resettleSelectedChoice() {
    if (!this.autoScroll || !this.#selectedChoice) return;
    this.#scrollToChoice(this.#selectedChoice);
  }

  #scrollToChoice(el, options = {}) {
    if (!el) return;
    const scrollOptions =
      typeof options === "object" && options !== null ? options : {};
    const behavior =
      scrollOptions.behavior === "smooth" ||
      scrollOptions.behavior === "instant"
        ? scrollOptions.behavior
        : "auto";
    const block = scrollOptions.block || "center";
    const inline = scrollOptions.inline || "center";
    requestAnimationFrame(() => {
      if (!el.isConnected) return;
      const overflowY = this.scrollHeight > this.clientHeight;
      const overflowX = this.scrollWidth > this.clientWidth;
      if (!overflowX && !overflowY) return;

      const choiceRect = el.getBoundingClientRect();
      const hostRect = this.getBoundingClientRect();
      const options = { behavior };
      let shouldScroll = false;

      if (overflowY) {
        const choiceTop = choiceRect.top - hostRect.top + this.scrollTop;
        const maxScroll = this.scrollHeight - this.clientHeight;
        options.top = this.#alignedScrollPosition(
          choiceTop,
          choiceRect.height,
          this.clientHeight,
          this.scrollTop,
          maxScroll,
          block,
        );
        shouldScroll = true;
      }

      if (overflowX) {
        const choiceLeft = choiceRect.left - hostRect.left + this.scrollLeft;
        const maxScroll = this.scrollWidth - this.clientWidth;
        options.left = this.#alignedScrollPosition(
          choiceLeft,
          choiceRect.width,
          this.clientWidth,
          this.scrollLeft,
          maxScroll,
          inline,
        );
        shouldScroll = true;
      }

      if (shouldScroll) {
        this.scrollTo(options);
      }
      this.#syncOverflow();
    });
  }

  #alignedScrollPosition(
    elementStart,
    elementSize,
    viewportSize,
    currentScroll,
    maxScroll,
    alignment,
  ) {
    let nextScroll;
    if (alignment === "start") {
      nextScroll = elementStart;
    } else if (alignment === "end") {
      nextScroll = elementStart + elementSize - viewportSize;
    } else if (alignment === "nearest") {
      const viewportStart = currentScroll;
      const viewportEnd = currentScroll + viewportSize;
      const elementEnd = elementStart + elementSize;
      if (elementStart >= viewportStart && elementEnd <= viewportEnd) {
        nextScroll = currentScroll;
      } else if (elementStart < viewportStart) {
        nextScroll = elementStart;
      } else {
        nextScroll = elementEnd - viewportSize;
      }
    } else {
      nextScroll = elementStart + elementSize / 2 - viewportSize / 2;
    }
    return Math.max(0, Math.min(nextScroll, maxScroll));
  }

  #startObserver() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver(() => {
      if (this.#isUnwrapping) return;
      this.#removeLegacyScroller();
      this.#syncGridColumns();
      this.#applyOverflowMode();
      this.#syncDisabledChoices();
      const choices = this.choices;
      if (this.#selectedChoice && !choices.includes(this.#selectedChoice)) {
        this.#selectedChoice = null;
        this.#syncSelection();
      } else if (!this.#selectedChoice && choices.length) {
        this.#syncSelection();
      }
      requestAnimationFrame(() => this.#syncOverflow());
    });
    this.#mutationObserver.observe(this, { childList: true, subtree: false });
  }
}
figDefineElement("fig-chooser", FigChooser);

export { FigChooser };
