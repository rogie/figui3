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
/* Reorder wrapper */
/**
 * @attr {string} axis - Reorder direction: "vertical" (default) or "horizontal"
 * @attr {string} handle - Selector for the drag handle within each item
 * @attr {string} items - Selector limiting which direct children are reorderable
 * @attr {string} indicator - Drop indicator style: "default" or "ring"
 * @attr {boolean} disabled - Disable reordering
 */
class FigReorder extends HTMLElement {
  static observedAttributes = [
    "axis",
    "handle",
    "items",
    "indicator",
    "disabled",
  ];

  static #DRAG_THRESHOLD = 6;

  static #NESTED_DRAG_SELECTORS = [
    '[draggable]:not([draggable="false"])',
    'img:not([draggable="false"])',
    'a[href]:not([draggable="false"])',
    'input[type="range"]',
    "fig-handle",
    "fig-slider",
    "fig-input-number",
    "fig-input-gradient",
    "fig-easing-curve",
    "fig-angle",
    "fig-audio",
    "fig-audio-waveform",
    "fig-input-wheel",
    "fig-joystick",
    "fig-origin-grid",
    "fig-chooser",
    "fig-canvas-control",
  ];

  static #OWNED_ATTRIBUTES = new Set([
    "data-reorder-item",
    "data-reorder-generated-role",
    "data-reorder-handle",
    "role",
    "tabindex",
    "aria-label",
    "aria-roledescription",
  ]);

  #childObserver = null;
  #attributeObserver = null;
  #attributeSyncQueued = false;
  #bindings = new Map();
  #drag = null;
  #indicator = null;
  #liveRegion = null;

  connectedCallback() {
    this.style.display = "contents";
    if (!this.hasAttribute("role")) this.setAttribute("role", "list");
    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", "Reorderable list");
    }
    this.#ensureLiveRegion();
    this.#syncChildren();
    this.#childObserver = new MutationObserver(() => this.#syncChildren());
    this.#childObserver.observe(this, { childList: true });
    this.#syncAttributeObserver();
  }

  disconnectedCallback() {
    this.#childObserver?.disconnect();
    this.#childObserver = null;
    this.#attributeObserver?.disconnect();
    this.#attributeObserver = null;
    this.#unbindAll();
    this.#cancelDrag();
    this.#removeIndicator();
    this.#liveRegion?.remove();
    this.#liveRegion = null;
  }

  attributeChangedCallback(name) {
    if (this.isConnected) {
      if (this.#disabled) this.#cancelDrag();
      if (name === "indicator") this.#syncIndicatorStyle();
      this.#syncAttributeObserver();
      this.#syncChildren();
    }
  }

  refresh() {
    if (this.isConnected) this.#syncChildren();
  }

  #syncAttributeObserver() {
    if (!this.#itemsSelector) {
      this.#attributeObserver?.disconnect();
      this.#attributeObserver = null;
      return;
    }
    if (this.#attributeObserver) return;
    this.#attributeObserver = new MutationObserver((records) => {
      const relevant = records.some(
        (record) =>
          record.target.parentElement === this &&
          !FigReorder.#OWNED_ATTRIBUTES.has(record.attributeName) &&
          !(record.attributeName === "class" && record.target === this.#drag?.item),
      );
      if (!relevant || this.#attributeSyncQueued) return;
      this.#attributeSyncQueued = true;
      queueMicrotask(() => {
        this.#attributeSyncQueued = false;
        if (this.isConnected) this.#syncChildren();
      });
    });
    this.#attributeObserver.observe(this, { subtree: true, attributes: true });
  }

  get #disabled() {
    return (
      this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false"
    );
  }

  get #axis() {
    const value = (this.getAttribute("axis") || "vertical").trim().toLowerCase();
    return value === "horizontal" ? "horizontal" : "vertical";
  }

  get #handleSelector() {
    return (this.getAttribute("handle") || "").trim();
  }

  get #itemsSelector() {
    return (this.getAttribute("items") || "").trim();
  }

  get #indicatorStyle() {
    return (this.getAttribute("indicator") || "default").trim().toLowerCase();
  }

  #getAllElementChildren() {
    return [...this.children].filter(
      (node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        !node.hasAttribute("data-reorder-live"),
    );
  }

  #getElementChildren() {
    const children = this.#getAllElementChildren();
    const selector = this.#itemsSelector;
    if (!selector) return children;
    try {
      return children.filter((child) => child.matches(selector));
    } catch {
      return [];
    }
  }

  #syncChildren() {
    const allChildren = this.#getAllElementChildren();
    const children = this.#getElementChildren();
    const childSet = new Set(children);

    for (const [child, binding] of this.#bindings) {
      if (!childSet.has(child)) {
        binding.target.removeEventListener(
          "pointerdown",
          binding.onPointerDown,
          true,
        );
        binding.target.removeEventListener("keydown", binding.onKeyDown);
        this.#restoreKeyboardAttrs(binding);
        this.#bindings.delete(child);
      }
    }

    this.#clearHandleMarks(allChildren);
    this.#clearReorderItemMarks(allChildren);
    this.#markNonItems(allChildren.filter((child) => !childSet.has(child)));
    const reorderable = !this.#disabled && children.length >= 2;
    this.#markReorderItems(children, reorderable);

    if (!reorderable) {
      this.#unbindAll();
      return;
    }

    for (const child of children) {
      const target = this.#getDragTarget(child);
      const existing = this.#bindings.get(child);
      if (existing && existing.target === target) continue;
      if (existing) {
        existing.target.removeEventListener(
          "pointerdown",
          existing.onPointerDown,
          true,
        );
        this.#bindings.delete(child);
      }
      if (!target) continue;
      this.#bindChild(child, target);
    }

    this.#markHandles(children);
  }

  #clearReorderItemMarks(children) {
    for (const child of children) {
      child.removeAttribute("data-reorder-item");
      if (child.hasAttribute("data-reorder-generated-role")) {
        child.removeAttribute("role");
        child.removeAttribute("data-reorder-generated-role");
      }
    }
  }

  #markReorderItems(children, reorderable = true) {
    for (const child of children) {
      if (reorderable) child.setAttribute("data-reorder-item", "");
      if (!child.hasAttribute("role")) {
        child.setAttribute("role", "listitem");
        child.setAttribute("data-reorder-generated-role", "");
      }
    }
  }

  #markNonItems(children) {
    for (const child of children) {
      if (!child.hasAttribute("role")) {
        child.setAttribute("role", "none");
        child.setAttribute("data-reorder-generated-role", "");
      }
    }
  }

  #clearHandleMarks(children) {
    for (const child of children) {
      child
        .querySelectorAll("[data-reorder-handle]")
        .forEach((node) => {
          node.removeAttribute("data-reorder-handle");
          node.removeAttribute("aria-roledescription");
        });
    }
  }

  #markHandles(children) {
    if (!this.#handleSelector) return;
    for (const child of children) {
      const handle = child.querySelector(this.#handleSelector);
      if (handle) {
        handle.setAttribute("data-reorder-handle", "");
        handle.setAttribute("aria-roledescription", "reorder handle");
      }
    }
  }

  #getDragTarget(child) {
    if (this.#handleSelector) {
      return child.querySelector(this.#handleSelector);
    }
    return child;
  }

  #bindChild(child, target) {
    const onPointerDown = (event) => {
      if (this.#disabled || this.#getElementChildren().length < 2) return;
      if (event.button !== 0) return;
      if (
        !this.#handleSelector &&
        this.#isNestedDragTarget(event.target, child)
      ) {
        return;
      }
      this.#startPendingDrag(event, child, target);
    };
    const originalTabIndex = target.getAttribute("tabindex");
    const originalAriaLabel = target.getAttribute("aria-label");
    const originalRole = target.getAttribute("role");
    const itemName =
      child.getAttribute("aria-label") ||
      child.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
      "item";
    target.setAttribute("tabindex", "0");
    target.setAttribute("aria-label", `Move ${itemName}`);
    if (target !== child && !target.hasAttribute("role")) {
      target.setAttribute("role", "button");
    }
    const onKeyDown = (event) => {
      if (this.#disabled) return;
      const horizontal = this.#axis === "horizontal";
      const previousKey = horizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = horizontal ? "ArrowRight" : "ArrowDown";
      if (
        event.key !== previousKey &&
        event.key !== nextKey &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const items = this.#getElementChildren();
      const oldIndex = items.indexOf(child);
      let newIndex = oldIndex;
      if (event.key === previousKey) newIndex = Math.max(0, oldIndex - 1);
      else if (event.key === nextKey) {
        newIndex = Math.min(items.length - 1, oldIndex + 1);
      } else if (event.key === "Home") newIndex = 0;
      else if (event.key === "End") newIndex = items.length - 1;
      if (newIndex === oldIndex) {
        this.#announce(`${itemName}, position ${oldIndex + 1} of ${items.length}`);
        return;
      }
      this.#moveItemToFinalIndex(child, newIndex);
      this.#syncChildren();
      this.#getDragTarget(child)?.focus();
      this.dispatchEvent(
        new CustomEvent("reorder", {
          bubbles: true,
          detail: { oldIndex, newIndex, item: child },
        }),
      );
      this.#announce(`${itemName}, position ${newIndex + 1} of ${items.length}`);
    };

    target.addEventListener("pointerdown", onPointerDown, true);
    target.addEventListener("keydown", onKeyDown);
    this.#bindings.set(child, {
      target,
      onPointerDown,
      onKeyDown,
      originalTabIndex,
      originalAriaLabel,
      originalRole,
    });
  }

  #restoreKeyboardAttrs(binding) {
    const { target, originalTabIndex, originalAriaLabel, originalRole } = binding;
    if (originalTabIndex === null) target.removeAttribute("tabindex");
    else target.setAttribute("tabindex", originalTabIndex);
    if (originalAriaLabel === null) target.removeAttribute("aria-label");
    else target.setAttribute("aria-label", originalAriaLabel);
    if (originalRole === null) target.removeAttribute("role");
    else target.setAttribute("role", originalRole);
  }

  #ensureLiveRegion() {
    if (this.#liveRegion?.isConnected) return;
    const region = document.createElement("span");
    region.setAttribute("data-reorder-live", "");
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    Object.assign(region.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    this.#liveRegion = region;
    document.body.appendChild(region);
  }

  #announce(message) {
    if (!this.#liveRegion) return;
    this.#liveRegion.textContent = "";
    requestAnimationFrame(() => {
      if (this.#liveRegion) this.#liveRegion.textContent = message;
    });
  }

  #isNestedDragTarget(target, child) {
    let node = target;
    while (node && node !== child) {
      if (node instanceof Element) {
        for (const selector of FigReorder.#NESTED_DRAG_SELECTORS) {
          if (node.matches(selector)) return true;
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  static #DRAGGING_BODY_CLASS = "fig-reorder-dragging";

  static #setDocumentDragging(active) {
    document.body.classList.toggle(FigReorder.#DRAGGING_BODY_CLASS, active);
  }

  #startPendingDrag(event, item, target) {
    this.#cancelDrag();

    const state = {
      item,
      target,
      pointerId: event.pointerId,
      oldIndex: this.#getElementChildren().indexOf(item),
      targetIndex: this.#getElementChildren().indexOf(item),
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      onMove: null,
      onUp: null,
      onKeyDown: null,
    };

    state.onMove = (moveEvent) => {
      if (moveEvent.pointerId !== state.pointerId) return;

      const dx = moveEvent.clientX - state.startX;
      const dy = moveEvent.clientY - state.startY;

      if (!state.active) {
        if (dx * dx + dy * dy < FigReorder.#DRAG_THRESHOLD * FigReorder.#DRAG_THRESHOLD) {
          return;
        }
        state.active = true;
        event.preventDefault();
        event.stopPropagation();
        item.classList.add("dragging");
        FigReorder.#setDocumentDragging(true);
        try {
          target.setPointerCapture(state.pointerId);
        } catch {}
      }

      moveEvent.preventDefault();
      const pointer =
        this.#axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
      const index = this.#getInsertIndex(pointer);
      state.targetIndex = index;
      this.#updateIndicator(index, item);
    };

    state.onKeyDown = (keyEvent) => {
      if (keyEvent.key !== "Escape" || !state.active) return;
      keyEvent.preventDefault();
      this.#finishDrag(state, true);
    };

    state.onUp = (upEvent) => {
      if (upEvent.pointerId !== state.pointerId) return;
      this.#finishDrag(state, upEvent.type === "pointercancel");
    };

    this.#drag = state;
    window.addEventListener("pointermove", state.onMove);
    window.addEventListener("pointerup", state.onUp);
    window.addEventListener("pointercancel", state.onUp);
    window.addEventListener("keydown", state.onKeyDown);
  }

  #getInsertIndex(pointer) {
    const items = this.#getElementChildren();
    const horizontal = this.#axis === "horizontal";

    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      const midpoint = horizontal
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      if (pointer < midpoint) return i;
    }

    return items.length;
  }

  #shouldShowIndicator(item, index) {
    const items = this.#getElementChildren();
    const currentIndex = items.indexOf(item);
    if (currentIndex === -1) return false;

    const clamped = Math.max(0, Math.min(index, items.length));

    if (index === currentIndex) return false;

    // Hide only the redundant bottom line when the dragged item is already last.
    if (clamped >= items.length && currentIndex === items.length - 1) {
      return false;
    }

    return true;
  }

  #getReorderBounds(items) {
    if (!items.length) return null;

    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    for (const item of items) {
      const rect = item.getBoundingClientRect();
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
    }

    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  #getIndicatorRoot() {
    const topLayerSelectors = [":popover-open", ":modal", ":fullscreen"];
    let ancestor = this.parentElement;

    while (ancestor) {
      const isTopLayer = topLayerSelectors.some((selector) => {
        try {
          return ancestor.matches(selector);
        } catch {
          return false;
        }
      });
      if (isTopLayer) return ancestor;
      ancestor = ancestor.parentElement;
    }

    return document.body;
  }

  #ensureIndicator() {
    if (this.#indicator) return this.#indicator;

    const indicator = document.createElement("div");
    indicator.className = "fig-reorder-indicator";
    indicator.setAttribute("data-axis", this.#axis);
    indicator.classList.toggle(
      "fig-reorder-indicator-ring",
      this.#indicatorStyle === "ring",
    );
    this.#getIndicatorRoot().appendChild(indicator);
    this.#indicator = indicator;
    return indicator;
  }

  #syncIndicatorStyle() {
    this.#indicator?.classList.toggle(
      "fig-reorder-indicator-ring",
      this.#indicatorStyle === "ring",
    );
  }

  #updateIndicator(index, item) {
    const items = this.#getElementChildren();
    if (!this.#shouldShowIndicator(item, index)) {
      this.#removeIndicator();
      return;
    }

    const bounds = this.#getReorderBounds(items);
    if (!bounds) {
      this.#removeIndicator();
      return;
    }

    const indicator = this.#ensureIndicator();
    indicator.setAttribute("data-axis", this.#axis);

    if (this.#axis === "horizontal") {
      let x;
      if (index <= 0) {
        x = items[0].getBoundingClientRect().left;
      } else if (index >= items.length) {
        x = items[items.length - 1].getBoundingClientRect().right;
      } else {
        x = items[index].getBoundingClientRect().left;
      }

      indicator.style.left = `${x - 1}px`;
      indicator.style.top = `${bounds.top}px`;
      indicator.style.width = "2px";
      indicator.style.height = `${bounds.height}px`;
      return;
    }

    let y;
    if (index <= 0) {
      y = items[0].getBoundingClientRect().top;
    } else if (index >= items.length) {
      y = items[items.length - 1].getBoundingClientRect().bottom;
    } else {
      y = items[index].getBoundingClientRect().top;
    }

    indicator.style.left = `${bounds.left}px`;
    indicator.style.top = `${y - 1}px`;
    indicator.style.width = `${bounds.width}px`;
    indicator.style.height = "2px";
  }

  #removeIndicator() {
    this.#indicator?.remove();
    this.#indicator = null;
  }

  #moveItemToIndex(item, index) {
    const items = this.#getElementChildren();
    const clamped = Math.max(0, Math.min(index, items.length));

    if (clamped >= items.length) {
      const last = items[items.length - 1];
      if (last && last !== item) last.after(item);
      return;
    }

    const ref = items[clamped];
    if (ref !== item) this.insertBefore(item, ref);
  }

  #moveItemToFinalIndex(item, newIndex) {
    const items = this.#getElementChildren().filter((candidate) => candidate !== item);
    const ref = items[newIndex] ?? null;
    if (ref) this.insertBefore(item, ref);
    else if (items.length) items[items.length - 1].after(item);
    else this.appendChild(item);
  }

  #finishDrag(state, revert) {
    const { item, oldIndex, active, onMove, onUp, onKeyDown } = state;

    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKeyDown);

    if (active) {
      if (!revert) {
        this.#moveItemToIndex(item, state.targetIndex);
        const newIndex = this.#getElementChildren().indexOf(item);
        if (newIndex !== -1 && newIndex !== oldIndex) {
          this.dispatchEvent(
            new CustomEvent("reorder", {
              bubbles: true,
              detail: { oldIndex, newIndex, item },
            }),
          );
          const name =
            item.getAttribute("aria-label") ||
            item.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
            "item";
          this.#announce(
            `${name}, position ${newIndex + 1} of ${this.#getElementChildren().length}`,
          );
        }
      }
    }

    item.classList.remove("dragging");
    FigReorder.#setDocumentDragging(false);
    this.#removeIndicator();
    if (this.#drag === state) this.#drag = null;
  }

  #unbindAll() {
    for (const [, binding] of this.#bindings) {
      binding.target.removeEventListener(
        "pointerdown",
        binding.onPointerDown,
        true,
      );
      binding.target.removeEventListener("keydown", binding.onKeyDown);
      this.#restoreKeyboardAttrs(binding);
    }
    this.#bindings.clear();
  }

  #cancelDrag() {
    if (!this.#drag) return;
    this.#finishDrag(this.#drag, true);
  }
}

figEditorDefineElement("fig-reorder", FigReorder);

export { FigReorder };
