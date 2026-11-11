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
import "./fig-select-option.js";
import "./fig-select-options.js";

/* Select — dropdown-styled trigger + fig-popup listbox */
/** Parse options attr — same formats as fig-options. */
function figSelectParseOptionsAttribute(raw) {
  const text = raw || "";
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      /* fall through */
    }
  }
  const delimiter = text.includes("\n") ? "\n" : ",";
  return text
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
}

function figSelectOptionEntryValue(opt) {
  if (opt && typeof opt === "object") {
    return String(opt.value ?? opt.label ?? "");
  }
  return String(opt ?? "");
}

function figSelectOptionEntryLabel(opt) {
  if (opt && typeof opt === "object") {
    return String(opt.label ?? opt.value ?? "");
  }
  return String(opt ?? "");
}

/**
 * A dropdown-styled select.
 * @attr {string} variant - Visual style: `primary`, `ghost`, or input-like `input`.
 * @attr {string} size - Control size. Use `large` for a 32px-tall control.
 * @attr {boolean} icon - Shows a square chevron-only trigger.
 * @attr {string} menu-anchor - CSS selector for an alternate menu anchor.
 * @property {Element|string|null} menuAnchor - Alternate menu anchor element or selector.
 * @event optionfocus - Fires with the focused option value during open-menu keyboard navigation.
 */
class FigSelect extends HTMLElement {
  #button = null;
  #popup = null;
  #prependEl = null;
  #prependSlot = null;
  #prependFallback = null;
  #customTriggerSlot = null;
  #labelEl = null;
  #panelSlot = null;
  #observer = null;
  #initialized = false;
  #focusedIndex = -1;
  #syncingValue = false;
  #popupPositionPatched = false;
  #originalPositionPopup = null;
  /**
   * After open align, ignore content/scroll-driven positionPopup passes so
   * overflow paging isn't yanked back. Still realign when the trigger moves
   * or the viewport size changes (window resize, layout shift, page scroll).
   */
  #freezeMenuPosition = false;
  #frozenLabelRect = null;
  #frozenViewport = null;
  #syncingOptions = false;
  #menuAnchorRef = null;
  #boundTriggerClick = this.#handleTriggerClick.bind(this);
  #boundTriggerFocus = () => {
    queueMicrotask(() => {
      if (!this.#button?.matches(":focus-within")) return;
      this.toggleAttribute(
        "data-focus-visible",
        this.#button.hasAttribute("data-focus-visible") ||
          this.#button.matches(":focus-visible"),
      );
    });
  };
  #boundTriggerBlur = () => this.removeAttribute("data-focus-visible");
  #boundOptionClick = this.#handleOptionClick.bind(this);
  #boundOptionPointerOver = this.#handleOptionPointerOver.bind(this);
  #boundKeydown = this.#handleKeydown.bind(this);
  #boundPopupLifecycle = this.#handlePopupLifecycle.bind(this);
  #boundSlotChange = this.#handleSlotChange.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "default",
      "disabled",
      "label",
      "options",
      "position",
      "offset",
      "closedby",
      "open",
      "variant",
      "size",
      "menu-anchor",
      "aria-label",
    ];
  }

  get value() {
    return this.getAttribute("value") ?? "";
  }

  set value(val) {
    if (val === null || val === undefined) this.removeAttribute("value");
    else this.setAttribute("value", String(val));
  }

  get default() {
    const authored = this.getAttribute("default");
    const options = this.#getOptions();
    if (
      authored !== null &&
      options.some((option) => this.#optionValue(option) === authored)
    ) {
      return authored;
    }
    return this.#optionValue(this.#pickFallbackOption(options));
  }

  set default(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("default");
    } else {
      this.setAttribute("default", String(value));
    }
  }

  get defaultValue() {
    return this.default;
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    return this.value === this.default;
  }

  resetToDefault() {
    if (figEditorBooleanAttribute(this, "disabled") || this.isDefault) return;
    this.value = this.default;
    this.#syncValue();
    this.#emitValueEvents(this.value);
  }

  get open() {
    return figEditorBooleanAttribute(this, "open");
  }

  set open(val) {
    if (val) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  #popupExpanded() {
    const state = this.#popup?.lifecycleState;
    return state === "opening" || state === "open";
  }

  get menuAnchor() {
    return this.#menuAnchorRef ?? this.getAttribute("menu-anchor");
  }

  set menuAnchor(value) {
    if (value instanceof Element) {
      if (this.hasAttribute("menu-anchor")) {
        this.removeAttribute("menu-anchor");
      }
      this.#menuAnchorRef = value;
    } else if (typeof value === "string" && value.trim()) {
      this.#menuAnchorRef = null;
      this.setAttribute("menu-anchor", value);
    } else {
      this.#menuAnchorRef = null;
      this.removeAttribute("menu-anchor");
    }
    this.#syncMenuAnchor();
  }

  connectedCallback() {
    if (!this.#initialized) this.#initialize();
    this.#ensurePanelSlotAttrs();
    this.#syncOptionsFromAttribute();
    this.#syncDisabled();
    this.#syncSize();
    this.#syncPopupAttrs();
    this.#syncValue();
    this.#setupListeners();
    this.#setupObserver();
    if (this.open) this.#openList();
  }

  disconnectedCallback() {
    this.#teardownListeners();
    document.removeEventListener("keydown", this.#boundKeydown, true);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#initialized) return;
    if (name === "options") {
      this.#syncOptionsFromAttribute();
      this.#syncValue();
      return;
    }
    if (name === "value" || name === "label" || name === "aria-label") {
      this.#syncValue();
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    if (name === "size") {
      this.#syncSize();
      return;
    }
    if (name === "open") {
      if (newValue === null || newValue === "false") this.#closeList();
      else this.#openList();
      return;
    }
    if (name === "menu-anchor") {
      this.#menuAnchorRef = null;
      this.#syncMenuAnchor();
      return;
    }
    if (name === "position" || name === "offset" || name === "closedby") {
      this.#syncPopupAttrs();
      if (this.open) this.#placeOpenMenu();
    }
  }

  focus(options) {
    this.#button?.focus(options);
  }

  activate(options) {
    if (figEditorBooleanAttribute(this, "disabled")) return;
    this.focus(options);
    this.open = true;
  }

  blur() {
    this.#button?.blur();
  }

  #syncSize() {
    if (!this.#button) return;
    const size = this.getAttribute("size");
    if (size) this.#button.setAttribute("size", size);
    else this.#button.removeAttribute("size");
  }

  #isMenuChild(node) {
    return (
      node?.nodeType === 1 &&
      (node.tagName === "FIG-SELECT-OPTION" ||
        node.tagName === "FIG-SEPARATOR" ||
        node.tagName === "FIG-SELECT-OPTIONS")
    );
  }

  #ensurePanelSlotAttrs() {
    for (const panel of this.querySelectorAll(":scope > fig-select-options")) {
      if (!panel.hasAttribute("slot")) panel.setAttribute("slot", "panel");
    }
  }

  #getPanel() {
    const assigned = this.#panelSlot?.assignedElements({ flatten: true }) ?? [];
    const fromSlot = assigned.find(
      (el) => el.tagName === "FIG-SELECT-OPTIONS",
    );
    if (fromSlot) return fromSlot;
    return this.querySelector(":scope > fig-select-options");
  }

  #hasAuthoredOptions() {
    return Boolean(
      this.querySelector(
        ":scope > fig-select-option:not([data-fig-generated]), :scope > fig-select-options > fig-select-option:not([data-fig-generated])",
      ),
    );
  }

  #ensureOptionsPanel() {
    let panel = this.#getPanel();
    if (panel) {
      if (!panel.hasAttribute("slot")) panel.setAttribute("slot", "panel");
      return panel;
    }
    panel = document.createElement("fig-select-options");
    panel.setAttribute("slot", "panel");
    panel.setAttribute("data-fig-generated", "");
    this.appendChild(panel);
    return panel;
  }

  /**
   * When no authored fig-select-option exists, build panel/options from the
   * options attribute (comma / newline / JSON — same as fig-options).
   */
  #syncOptionsFromAttribute() {
    if (this.#hasAuthoredOptions()) return;

    const hasOptionsAttr = this.hasAttribute("options");
    const panel = hasOptionsAttr
      ? this.#ensureOptionsPanel()
      : this.#getPanel();
    if (!panel) return;

    this.#syncingOptions = true;
    try {
      for (const opt of panel.querySelectorAll(
        ":scope > fig-select-option[data-fig-generated]",
      )) {
        opt.remove();
      }

      if (!hasOptionsAttr) return;

      const parsed = figSelectParseOptionsAttribute(this.getAttribute("options"));
      const endBtn = panel.querySelector(":scope > .fig-overflow-end");
      for (const entry of parsed) {
        const el = document.createElement("fig-select-option");
        el.setAttribute("data-fig-generated", "");
        el.setAttribute("value", figSelectOptionEntryValue(entry));
        el.textContent = figSelectOptionEntryLabel(entry);
        if (endBtn) panel.insertBefore(el, endBtn);
        else panel.appendChild(el);
      }
    } finally {
      this.#syncingOptions = false;
    }
  }

  #initialize() {
    this.#initialized = true;
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
        :host {
          display: inline-flex;
          position: relative;
          align-items: center;
          min-width: 0;
        }
        :host([full]:not([full="false"])) {
          display: flex;
          width: 100%;
        }
        .fig-select-trigger {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          flex: 1;
          min-width: 0;
          width: var(--fig-select-trigger-width, 100%);
          height: 100%;
          margin: 0;
          padding: 0 var(--spacer-4, 1rem) 0 var(--spacer-2, 0.5rem);
          border: 0;
          border-radius: inherit;
          background: transparent;
          box-shadow: none;
          color: inherit;
          font: inherit;
          font-weight: inherit;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: default;
        }
        .fig-select-trigger:has(.fig-select-prepend.has-content) {
          padding-left: 0;
        }
        .fig-select-trigger:hover,
        .fig-select-trigger:active,
        .fig-select-trigger:active:hover {
          background: transparent;
          box-shadow: none;
          color: inherit;
        }
        .fig-select-trigger:focus-visible,
        .fig-select-trigger[data-focus-visible] {
          outline: var(--figma-focus-outline);
          outline-offset: var(--figma-focus-outline-offset);
        }
        :host([disabled]:not([disabled="false"])) .fig-select-trigger,
        :host([disabled]:not([disabled="false"])) .fig-select-label {
          color: var(--figma-color-text-tertiary);
        }
        .fig-select-label {
          display: block;
          width: 100%;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
        }
        .fig-select-prepend {
          display: inline-flex;
          flex: 0 0 auto;
          justify-content: center;
          align-items: center;
          min-width: var(--spacer-4, 1.5rem);
          height: 100%;
          pointer-events: none;
        }
        :host([size="large"]) .fig-select-prepend {
          min-width: var(--spacer-5, 2rem);
        }
        .fig-select-prepend:not(.has-content) {
          display: none;
        }
        .fig-select-prepend > slot,
        .fig-select-prepend-fallback,
        slot[name="trigger"] {
          display: contents;
        }
        slot[name="prepend-trigger"]::slotted([data-fig-select-generated]) {
          display: contents;
        }
        .fig-select-label[hidden],
        .fig-select-prepend[hidden],
        slot[name="trigger"][hidden] {
          display: none;
        }
        /* Listbox chrome from document fig-select::part(listbox).
           Overflow UI lives on slotted fig-select-options.
           Never set display except when open — closed <dialog> must stay display:none. */
        dialog[is="fig-popup"] {
          flex-direction: column;
          overflow: hidden;
        }
        dialog[is="fig-popup"][open] {
          display: flex;
        }
        ::slotted(fig-select-options) {
          flex: 1 1 auto;
          min-height: 0;
          max-height: inherit;
        }
    `;
    shadow.appendChild(style);

    const button = document.createElement("fig-button");
    button.className = "fig-select-trigger";
    button.setAttribute("part", "trigger");
    button.setAttribute("variant", "ghost");
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");

    const prependEl = document.createElement("span");
    prependEl.className = "fig-select-prepend";
    prependEl.setAttribute("part", "prepend");
    prependEl.setAttribute("aria-hidden", "true");
    const prependSlot = document.createElement("slot");
    prependSlot.setAttribute("name", "prepend-trigger");
    prependSlot.hidden = true;
    const prependFallback = document.createElement("span");
    prependFallback.className = "fig-select-prepend-fallback";
    prependEl.append(prependSlot, prependFallback);

    const labelEl = document.createElement("span");
    labelEl.className = "fig-select-label";
    labelEl.setAttribute("part", "label");
    const customTriggerSlot = document.createElement("slot");
    customTriggerSlot.setAttribute("name", "trigger");
    customTriggerSlot.hidden = true;
    button.append(prependEl, labelEl, customTriggerSlot);

    const popup = document.createElement("dialog", { is: "fig-popup" });
    popup.setAttribute("is", "fig-popup");
    popup.setAttribute("part", "listbox");
    popup.setAttribute("theme", "menu");
    popup.setAttribute("role", "listbox");
    // Top-layer via popover so the menu escapes ancestor contain/overflow
    // (e.g. fig-fill-picker-dialog). Stays in shadow so option slots still work —
    // unlike tooltips, we cannot portal this popup to the overlay root.
    if ("popover" in HTMLElement.prototype) {
      popup.setAttribute("popover", "manual");
    }
    popup.id = figEditorUniqueId();
    button.setAttribute("aria-controls", popup.id);

    const panelSlot = document.createElement("slot");
    panelSlot.setAttribute("name", "panel");
    popup.appendChild(panelSlot);

    shadow.append(button, popup);

    this.#button = button;
    this.#prependEl = prependEl;
    this.#prependSlot = prependSlot;
    this.#prependFallback = prependFallback;
    this.#customTriggerSlot = customTriggerSlot;
    this.#labelEl = labelEl;
    this.#popup = popup;
    this.#panelSlot = panelSlot;
    this.#syncMenuAnchor();

    this.#ensurePanelSlotAttrs();
    this.#installPopupPositioning();

    if (!this.hasAttribute("value")) {
      const selected = this.#getOptions().find((opt) =>
        figEditorBooleanAttribute(opt, "selected"),
      );
      if (selected) this.setAttribute("value", selected.value);
    }
  }

  #installPopupPositioning() {
    if (!this.#popup || this.#popupPositionPatched) return;
    if (typeof this.#popup.positionPopup !== "function") return;
    this.#originalPositionPopup = this.#popup.positionPopup.bind(this.#popup);
    this.#popup.positionPopup = () => {
      if (!this.#popupExpanded()) {
        this.#originalPositionPopup?.();
        return;
      }
      this.#placeOpenMenu();
    };
    this.#popupPositionPatched = true;
  }

  #getOptionTextRect(option) {
    if (!option) return null;
    const range = document.createRange();
    range.selectNodeContents(option);
    const rects = [...range.getClientRects()].filter(
      (rect) => rect.width > 0 && rect.height > 0,
    );
    if (rects.length) return rects[0];
    return option.getBoundingClientRect();
  }

  #getViewportMargins() {
    if (typeof this.#popup?.parseViewportMargins === "function") {
      return this.#popup.parseViewportMargins();
    }
    return { top: 8, right: 8, bottom: 8, left: 8 };
  }

  #resolveExplicitMenuAnchor() {
    if (this.#menuAnchorRef?.isConnected) return this.#menuAnchorRef;

    const selector = this.getAttribute("menu-anchor");
    if (selector) {
      try {
        const localMatch = this.parentElement?.querySelector(selector);
        if (
          localMatch &&
          localMatch !== this &&
          !this.contains(localMatch)
        ) {
          return localMatch;
        }

        const root = this.getRootNode();
        const rootMatch = root?.querySelector?.(selector);
        if (
          rootMatch &&
          rootMatch !== this &&
          !this.contains(rootMatch)
        ) {
          return rootMatch;
        }
      } catch {}
    }

    return null;
  }

  #resolveMenuAnchor() {
    return this.#resolveExplicitMenuAnchor() || this.#button;
  }

  #hasMenuAnchor() {
    return Boolean(this.#resolveExplicitMenuAnchor());
  }

  #usesMenuAnchorOverlayGeometry() {
    return !this.#usesExplicitPosition() && this.#hasMenuAnchor();
  }

  #syncMenuAnchor() {
    if (!this.#popup) return;
    this.#popup.anchor = this.#resolveMenuAnchor();
    this.#syncPopupWidth();
    if (!this.#popupExpanded()) return;
    this.#freezeMenuPosition = false;
    this.#frozenLabelRect = null;
    this.#frozenViewport = null;
    this.#popup.setupObservers?.();
    this.#popup.queueReposition?.();
  }

  #getTriggerAlignmentRect() {
    const labelRect = this.#labelEl?.getBoundingClientRect();
    if (labelRect?.width && labelRect?.height) return labelRect;
    const customTriggerRect = this.querySelector(
      ':scope > [slot="trigger"]',
    )?.getBoundingClientRect();
    if (customTriggerRect?.width && customTriggerRect?.height) {
      return customTriggerRect;
    }
    return this.#prependEl?.getBoundingClientRect() ?? null;
  }

  #readLabelRectSnapshot() {
    const anchor = this.#usesMenuAnchorOverlayGeometry()
      ? this.#resolveExplicitMenuAnchor()
      : null;
    const rect = anchor?.getBoundingClientRect() ??
      this.#getTriggerAlignmentRect();
    if (!rect) return null;
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  #readViewportSnapshot() {
    const vv = window.visualViewport;
    return {
      width: vv?.width ?? window.innerWidth,
      height: vv?.height ?? window.innerHeight,
      offsetLeft: vv?.offsetLeft ?? 0,
      offsetTop: vv?.offsetTop ?? 0,
    };
  }

  #rectSnapshotChanged(prev, next, epsilon = 0.25) {
    if (!prev && !next) return false;
    if (!prev || !next) return true;
    return (
      Math.abs(prev.x - next.x) > epsilon ||
      Math.abs(prev.y - next.y) > epsilon ||
      Math.abs(prev.width - next.width) > epsilon ||
      Math.abs(prev.height - next.height) > epsilon
    );
  }

  #viewportSnapshotChanged(prev, next, epsilon = 0.25) {
    if (!prev && !next) return false;
    if (!prev || !next) return true;
    return (
      Math.abs(prev.width - next.width) > epsilon ||
      Math.abs(prev.height - next.height) > epsilon ||
      Math.abs(prev.offsetLeft - next.offsetLeft) > epsilon ||
      Math.abs(prev.offsetTop - next.offsetTop) > epsilon
    );
  }

  #shouldSkipFrozenPositionPass() {
    if (!this.#freezeMenuPosition) return false;
    const labelMoved = this.#rectSnapshotChanged(
      this.#frozenLabelRect,
      this.#readLabelRectSnapshot(),
    );
    const viewportChanged = this.#viewportSnapshotChanged(
      this.#frozenViewport,
      this.#readViewportSnapshot(),
    );
    // Skip only when neither the trigger nor the viewport moved — typical of
    // overflow scroll / content sync fighting the open-time alignment.
    return !labelMoved && !viewportChanged;
  }

  #rememberFrozenGeometry() {
    this.#frozenLabelRect = this.#readLabelRectSnapshot();
    this.#frozenViewport = this.#readViewportSnapshot();
  }

  #usesExplicitPosition() {
    const value = this.getAttribute("position");
    return Boolean(value && value.trim());
  }

  #clearOverlayPositionStyles() {
    if (!this.#popup) return;
    this.#popup.style.removeProperty("left");
    this.#popup.style.removeProperty("top");
    this.#popup.style.removeProperty("right");
    this.#popup.style.removeProperty("bottom");
  }

  #placeOpenMenu() {
    if (this.#usesExplicitPosition()) {
      this.#freezeMenuPosition = false;
      this.#frozenLabelRect = null;
      this.#frozenViewport = null;
      this.#syncPopupWidth();
      this.#clearOverlayPositionStyles();
      if (this.#positionExplicitMenuAnchor()) return;
      this.#originalPositionPopup?.();
      this.#clampMenuToViewport();
      return;
    }
    this.#positionPopupOverSelected();
  }

  #positionExplicitMenuAnchor() {
    const popup = this.#popup;
    const menuAnchor = this.#resolveExplicitMenuAnchor();
    if (
      !popup ||
      !menuAnchor ||
      typeof popup.parsePosition !== "function" ||
      typeof popup.parseOffset !== "function" ||
      typeof popup.computeCoords !== "function"
    ) {
      return false;
    }

    const popupRect = popup.getBoundingClientRect();
    const anchorRect = menuAnchor.getBoundingClientRect();
    if (!popupRect.width || !popupRect.height) return false;
    const { vertical, horizontal, shorthand } = popup.parsePosition();
    const offset = popup.parseOffset();
    let { left, top } = popup.computeCoords(
      anchorRect,
      popupRect,
      vertical,
      horizontal,
      offset,
      shorthand,
    );
    const margins = this.#getViewportMargins();
    if (typeof popup.clampToViewport === "function") {
      ({ left, top } = popup.clampToViewport(
        { left, top },
        popupRect,
        margins,
      ));
    }
    popup.style.setProperty("right", "auto", "important");
    popup.style.setProperty("bottom", "auto", "important");
    popup.style.setProperty("left", `${Math.round(left)}px`, "important");
    popup.style.setProperty("top", `${Math.round(top)}px`, "important");
    return true;
  }

  #clampMenuToViewport() {
    const popup = this.#popup;
    if (!popup || typeof popup.clampToViewport !== "function") return;
    const popupRect = popup.getBoundingClientRect();
    if (!popupRect.width || !popupRect.height) return;
    const margins = this.#getViewportMargins();
    const { left, top } = popup.clampToViewport(
      { left: popupRect.left, top: popupRect.top },
      popupRect,
      margins,
    );
    popup.style.setProperty("right", "auto", "important");
    popup.style.setProperty("bottom", "auto", "important");
    popup.style.setProperty("left", `${Math.round(left)}px`, "important");
    popup.style.setProperty("top", `${Math.round(top)}px`, "important");
  }

  #positionPopupOverSelected() {
    // Content ResizeObserver / overflow scroll re-enter here; keep the
    // open-time alignment unless the trigger or viewport actually changed.
    if (this.#shouldSkipFrozenPositionPass()) {
      this.#clampMenuToViewport();
      return;
    }

    const popup = this.#popup;
    const label = this.#labelEl;
    if (!popup || !label) {
      this.#originalPositionPopup?.();
      return;
    }

    const options = this.#getOptions();
    const selected =
      options.find((opt) => this.#optionValue(opt) === this.value) ||
      options[0];
    if (!selected) {
      this.#originalPositionPopup?.();
      return;
    }

    const menuAnchor = this.#usesMenuAnchorOverlayGeometry()
      ? this.#resolveExplicitMenuAnchor()
      : null;
    if (menuAnchor) this.#syncPopupWidth();

    // Lay out with the default positioning first so option metrics are valid.
    this.#originalPositionPopup?.();

    const popupRect = popup.getBoundingClientRect();
    const selectedOptionRect = selected.getBoundingClientRect();
    if (!popupRect.width || !popupRect.height || !selectedOptionRect.height) {
      return;
    }

    let left;
    let top;
    let alignmentRect;
    if (menuAnchor) {
      const anchorRect = menuAnchor.getBoundingClientRect();
      alignmentRect = anchorRect;
      left = anchorRect.left + (anchorRect.width - popupRect.width) / 2;
      top =
        anchorRect.top +
        (anchorRect.height - selectedOptionRect.height) / 2 -
        (selectedOptionRect.top - popupRect.top);
    } else {
      const labelRect = this.#getTriggerAlignmentRect();
      const optionTextRect = this.#getOptionTextRect(selected);
      if (!labelRect?.width || !optionTextRect) return;
      alignmentRect = labelRect;
      const selectedOffsetX = optionTextRect.left - popupRect.left;
      const selectedOffsetY = optionTextRect.top - popupRect.top;
      const full = figEditorBooleanAttribute(this, "full");
      // [full]: pin menu to host width/edges. Otherwise overlay selected
      // option text on the trigger label (blend-mode style).
      left = full
        ? this.getBoundingClientRect().left
        : labelRect.left - selectedOffsetX;
      top = labelRect.top - selectedOffsetY;
    }

    // Keep the whole menu in-view when aligning over the selected option
    // would otherwise push it past a viewport edge (corners / far sides).
    const margins = this.#getViewportMargins();
    if (typeof popup.clampToViewport === "function") {
      ({ left, top } = popup.clampToViewport({ left, top }, popupRect, margins));
    } else {
      const minLeft = margins.left;
      const minTop = margins.top;
      const maxLeft = window.innerWidth - popupRect.width - margins.right;
      const maxTop = window.innerHeight - popupRect.height - margins.bottom;
      left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));
      top = Math.min(Math.max(top, minTop), Math.max(minTop, maxTop));
    }

    // !important: fig-select::part(listbox) and dialog UA rules can otherwise
    // keep the menu at its static/anchor position past the viewport edge.
    popup.style.setProperty("right", "auto", "important");
    popup.style.setProperty("bottom", "auto", "important");
    popup.style.setProperty("left", `${Math.round(left)}px`, "important");
    popup.style.setProperty("top", `${Math.round(top)}px`, "important");

    // If the panel scrolls, keep the selected row centered over a menu anchor.
    // Standard selects retain text-to-trigger alignment.
    const panel = this.#getPanel();
    const alignedOptionRect = selected.getBoundingClientRect();
    const alignedTextRect = menuAnchor
      ? null
      : this.#getOptionTextRect(selected);
    if (
      panel &&
      panel.scrollHeight > panel.clientHeight + 1
    ) {
      const deltaY = menuAnchor
        ? alignedOptionRect.top +
          alignedOptionRect.height / 2 -
          (alignmentRect.top + alignmentRect.height / 2)
        : alignedTextRect
          ? alignedTextRect.top - alignmentRect.top
          : 0;
      if (Math.abs(deltaY) > 0.5) {
        panel.scrollTop += deltaY;
      }
      panel.syncOverflow?.();
    }

    if (this.#freezeMenuPosition || this.#popupExpanded()) {
      this.#rememberFrozenGeometry();
    }
  }

  #setupListeners() {
    this.#button?.addEventListener("click", this.#boundTriggerClick);
    this.#button?.addEventListener("keydown", this.#boundKeydown);
    this.#button?.addEventListener("focus", this.#boundTriggerFocus);
    this.#button?.addEventListener("blur", this.#boundTriggerBlur);
    // Host click: slotted options stay in light DOM (not dialog.contains).
    this.addEventListener("click", this.#boundOptionClick);
    this.addEventListener("pointerover", this.#boundOptionPointerOver);
    this.#popup?.addEventListener("keydown", this.#boundKeydown);
    this.#popup?.addEventListener(
      "fig-popup-lifecycle",
      this.#boundPopupLifecycle,
    );
    this.#panelSlot?.addEventListener("slotchange", this.#boundSlotChange);
  }

  #teardownListeners() {
    this.#button?.removeEventListener("click", this.#boundTriggerClick);
    this.#button?.removeEventListener("keydown", this.#boundKeydown);
    this.#button?.removeEventListener("focus", this.#boundTriggerFocus);
    this.#button?.removeEventListener("blur", this.#boundTriggerBlur);
    this.removeAttribute("data-focus-visible");
    this.removeEventListener("click", this.#boundOptionClick);
    this.removeEventListener("pointerover", this.#boundOptionPointerOver);
    this.#popup?.removeEventListener("keydown", this.#boundKeydown);
    this.#popup?.removeEventListener(
      "fig-popup-lifecycle",
      this.#boundPopupLifecycle,
    );
    this.#panelSlot?.removeEventListener("slotchange", this.#boundSlotChange);
  }

  #handleSlotChange() {
    this.#ensurePanelSlotAttrs();
    this.#syncValue();
  }

  #setupObserver() {
    if (this.#observer) return;
    this.#observer = new MutationObserver((mutations) => {
      if (this.#syncingValue || this.#syncingOptions) return;
      let needsSync = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          if (
            [...mutation.addedNodes].some((node) => this.#isMenuChild(node)) ||
            [...mutation.removedNodes].some((node) => this.#isMenuChild(node)) ||
            mutation.target?.closest?.("fig-select-option")
          ) {
            needsSync = true;
          }
        }
        if (
          mutation.type === "attributes" &&
          mutation.target?.tagName === "FIG-SELECT-OPTION"
        ) {
          if (
            mutation.attributeName === "value" ||
            mutation.attributeName === "disabled" ||
            mutation.attributeName === "label"
          ) {
            needsSync = true;
          } else if (mutation.attributeName === "selected") {
            if (figEditorBooleanAttribute(mutation.target, "selected")) {
              const nextValue = this.#optionValue(mutation.target);
              if ((this.getAttribute("value") ?? "") !== nextValue) {
                this.setAttribute("value", nextValue);
                needsSync = true;
              }
            } else if (
              this.#optionValue(mutation.target) ===
              (this.getAttribute("value") ?? "")
            ) {
              needsSync = true;
            }
          }
        }
        if (
          mutation.type === "characterData" &&
          mutation.target?.parentElement?.tagName === "FIG-SELECT-OPTION"
        ) {
          needsSync = true;
        }
      }
      if (needsSync) this.#syncValue();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["value", "disabled", "selected", "label"],
    });
  }

  #getOptions({ enabledOnly = false } = {}) {
    const panel = this.#getPanel();
    const options = panel
      ? Array.from(panel.querySelectorAll(":scope > fig-select-option"))
      : [];
    if (!enabledOnly) return options;
    return options.filter((opt) => !figEditorBooleanAttribute(opt, "disabled"));
  }

  #optionValue(option) {
    if (!option) return "";
    if (typeof option.value === "string") return option.value;
    const attr = option.getAttribute?.("value");
    if (attr != null) return attr;
    return (option.textContent || "").trim();
  }

  #optionLabel(option) {
    if (!option) return "";
    const labelAttr = option.getAttribute?.("label");
    if (labelAttr != null && labelAttr !== "") return labelAttr.trim();

    // Ignore prepend/append slot content when deriving a label from children.
    const parts = [];
    for (const node of option.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) parts.push(text);
        continue;
      }
      if (!(node instanceof Element)) continue;
      const slot = node.getAttribute("slot");
      if (slot === "prepend" || slot === "append") continue;
      const text = node.textContent?.trim();
      if (text) parts.push(text);
    }
    if (parts.length) return parts.join(" ").trim();
    return (option.textContent || "").trim();
  }

  #syncPrepend(option) {
    if (
      !this.#prependEl ||
      !this.#prependSlot ||
      !this.#prependFallback ||
      !this.#customTriggerSlot
    ) {
      return;
    }
    const customTrigger = this.querySelector(':scope > [slot="trigger"]');
    const generatedTrigger = this.querySelector(
      ':scope > [slot="prepend-trigger"][data-fig-select-generated]',
    );
    let triggerPrepend = this.querySelector(
      ':scope > [slot="prepend-trigger"]:not([data-fig-select-generated])',
    );
    const source = option?.querySelector?.(
      ':scope > [slot="prepend"]:not([data-fig-select-checkmark])',
    );
    this.#customTriggerSlot.hidden = !customTrigger;
    this.#labelEl.hidden = Boolean(customTrigger);
    this.#prependEl.hidden = Boolean(customTrigger);
    if (customTrigger) {
      generatedTrigger?.remove();
      this.#prependEl.classList.remove("has-content");
      this.#prependSlot.hidden = true;
      this.#prependFallback.replaceChildren();
      return;
    }
    if (!triggerPrepend && source?.childNodes.length) {
      const generated = generatedTrigger || document.createElement("span");
      generated.setAttribute("slot", "prepend-trigger");
      generated.setAttribute("data-fig-select-generated", "");
      generated.replaceChildren(
        ...Array.from(source.childNodes, (node) => node.cloneNode(true)),
      );
      if (generated.parentElement !== this) this.append(generated);
      triggerPrepend = generated;
    } else if (triggerPrepend) {
      generatedTrigger?.remove();
    } else {
      generatedTrigger?.remove();
    }
    const hasContent = Boolean(
      triggerPrepend,
    );
    this.#prependEl.classList.toggle("has-content", hasContent);
    this.#prependSlot.hidden = !triggerPrepend;
    this.#prependFallback.hidden = Boolean(triggerPrepend);
    if (triggerPrepend) {
      this.#prependFallback.replaceChildren();
      return;
    }
    this.#prependFallback.replaceChildren();
  }

  #syncPopupAttrs() {
    if (!this.#popup) return;
    this.#popup.setAttribute(
      "position",
      this.getAttribute("position") || "bottom left",
    );
    const offset = this.getAttribute("offset");
    if (offset) this.#popup.setAttribute("offset", offset);
    else this.#popup.removeAttribute("offset");
    const closedby = this.getAttribute("closedby");
    if (closedby) this.#popup.setAttribute("closedby", closedby);
    else this.#popup.removeAttribute("closedby");
  }

  #syncDisabled() {
    const disabled = figEditorBooleanAttribute(this, "disabled");
    if (this.#button) {
      if (disabled) this.#button.setAttribute("disabled", "");
      else this.#button.removeAttribute("disabled");
    }
    if (disabled && this.open) this.open = false;
  }

  #pickFallbackOption(options) {
    if (!options.length) return null;
    const selected = options.find((opt) =>
      figEditorBooleanAttribute(opt, "selected"),
    );
    if (selected && !figEditorBooleanAttribute(selected, "disabled")) {
      return selected;
    }
    return (
      options.find((opt) => !figEditorBooleanAttribute(opt, "disabled")) ||
      options[0] ||
      null
    );
  }

  #emitValueEvents(value) {
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: value,
        bubbles: true,
        composed: true,
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: value,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #syncValue() {
    if (this.#syncingValue) return;
    this.#syncingValue = true;
    try {
      const options = this.#getOptions();
      const hasValueAttr = this.hasAttribute("value");
      const previousValue = hasValueAttr ? this.getAttribute("value") : null;
      let match = hasValueAttr
        ? options.find((opt) => this.#optionValue(opt) === previousValue)
        : null;
      let valueCorrected = false;

      if (!match) {
        if (hasValueAttr) {
          // Options may not be built yet (options attr sync). Keep value until then.
          if (!options.length) {
            if (this.#labelEl) {
              this.#labelEl.textContent =
                previousValue || this.getAttribute("label") || "";
            }
            return;
          }
          // Value orphaned (option removed / value attr changed) — clamp or clear.
          match = this.#pickFallbackOption(options);
          if (match) {
            const nextValue = this.#optionValue(match);
            if (previousValue !== nextValue) {
              this.setAttribute("value", nextValue);
              valueCorrected = true;
            }
          } else {
            this.removeAttribute("value");
            valueCorrected = true;
          }
        } else {
          // No host value yet — honor a selected option if present.
          match = options.find((opt) =>
            figEditorBooleanAttribute(opt, "selected"),
          );
          if (match) {
            this.setAttribute("value", this.#optionValue(match));
            valueCorrected = true;
          }
        }
      }

      for (const opt of options) {
        figSelectOptionEnsureCheckmark(opt);
        const selected = opt === match;
        opt.setAttribute("aria-selected", selected ? "true" : "false");
        if (selected) opt.setAttribute("selected", "");
        else opt.removeAttribute("selected");
      }

      const label =
        (match && this.#optionLabel(match)) || this.getAttribute("label") || "";
      if (this.#labelEl) this.#labelEl.textContent = label;
      this.#syncPrepend(match);

      const ariaLabel =
        this.getAttribute("aria-label") ||
        this.getAttribute("label") ||
        "Select";
      this.#button?.setAttribute("aria-label", ariaLabel);

      // Don't scrollToOption while open — reposition/sync would fight overflow paging.
      this.#getPanel()?.syncOverflow?.();

      if (valueCorrected) {
        this.#emitValueEvents(this.getAttribute("value") ?? "");
      }
    } finally {
      this.#syncingValue = false;
    }
  }

  #handleTriggerClick(e) {
    if (figEditorBooleanAttribute(this, "disabled")) return;
    e.preventDefault();
    e.stopPropagation();
    const nextOpen = !this.#popupExpanded();
    if (nextOpen) this.#syncMenuAnchor();
    this.open = nextOpen;
  }

  #handleOptionClick(e) {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const option = path.find(
      (node) => node?.tagName === "FIG-SELECT-OPTION",
    );
    if (!option || !this.contains(option)) return;
    if (figEditorBooleanAttribute(option, "disabled")) return;
    // Do not stopPropagation — React light-DOM onClick must still fire.
    this.#selectOption(option);
  }

  /**
   * Fires `optionhover` with the enabled option's value in `event.detail`
   * without changing the current selection.
   */
  #handleOptionPointerOver(e) {
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    const option = path.find(
      (node) => node?.tagName === "FIG-SELECT-OPTION",
    );
    if (!option || !this.contains(option)) return;
    if (figEditorBooleanAttribute(option, "disabled")) return;
    if (
      e.relatedTarget instanceof Node &&
      option.contains(e.relatedTarget)
    ) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("optionhover", {
        detail: this.#optionValue(option),
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleKeydown(e) {
    if (e.currentTarget === document && e.key !== "Escape") return;

    const listOpen = this.#popupExpanded();
    if (!listOpen) {
      if (
        this.#button?.contains(e.target) &&
        (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        this.#syncMenuAnchor();
        this.open = true;
        requestAnimationFrame(() => {
          const options = this.#getOptions({ enabledOnly: true });
          const selectedIndex = options.findIndex(
            (opt) => this.#optionValue(opt) === this.value,
          );
          this.#focusOptionAt(selectedIndex >= 0 ? selectedIndex : 0);
        });
      }
      return;
    }

    const options = this.#getOptions({ enabledOnly: true });
    if (!options.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.#syncFocusedIndex();
        this.#focusOptionAt(this.#focusedIndex + 1, true);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.#syncFocusedIndex();
        this.#focusOptionAt(this.#focusedIndex - 1, true);
        break;
      case "Home":
        e.preventDefault();
        this.#focusOptionAt(0, true);
        break;
      case "End":
        e.preventDefault();
        this.#focusOptionAt(options.length - 1, true);
        break;
      case "Escape":
        e.preventDefault();
        this.open = false;
        this.#button?.focus();
        break;
      case "Enter":
      case " ": {
        this.#syncFocusedIndex();
        const focused = options[this.#focusedIndex];
        if (!focused) return;
        e.preventDefault();
        this.#selectOption(focused);
        break;
      }
    }
  }

  #handlePopupLifecycle(event) {
    if (event.target !== this.#popup) return;
    const state = event.detail?.state;
    const expanded = state === "opening" || state === "open";
    this.#button?.setAttribute("aria-expanded", String(expanded));
    if (expanded) return;
    if (this.open) this.open = false;
    if (state !== "closed") return;
    this.#button?.focus();
    this.#focusedIndex = -1;
  }

  #selectOption(option) {
    const value = this.#optionValue(option);
    this.setAttribute("value", value);
    this.#syncValue();
    this.#emitValueEvents(value);
    this.open = false;
  }

  #getEnabledOptions() {
    return this.#getOptions({ enabledOnly: true });
  }

  #syncFocusedIndex() {
    const options = this.#getEnabledOptions();
    if (!options.length) {
      this.#focusedIndex = -1;
      return;
    }
    const active = options.find((opt) => opt === document.activeElement);
    const index = active ? options.indexOf(active) : -1;
    this.#focusedIndex = index >= 0 ? index : this.#focusedIndex;
  }

  #focusOptionAt(index, emitEvent = false) {
    const options = this.#getEnabledOptions();
    if (!options.length) return;
    const next = ((index % options.length) + options.length) % options.length;
    const option = options[next];
    const changed = document.activeElement !== option;
    this.#focusedIndex = next;
    option?.focus();
    if (emitEvent && changed) {
      this.dispatchEvent(
        new CustomEvent("optionfocus", {
          detail: this.#optionValue(option),
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  #syncPopupWidth() {
    if (!this.#popup || !this.#button) return;
    const hostWidth = Math.ceil(this.getBoundingClientRect().width);
    const triggerWidth = Math.ceil(this.#button.getBoundingClientRect().width);
    const anchorWidth = Math.max(hostWidth, triggerWidth, 96);
    const menuAnchor = this.#hasMenuAnchor()
      ? this.#resolveExplicitMenuAnchor()
      : null;

    // Use !important — fig-select::part(listbox) width rules beat element.style.
    // Menus size to their options while remaining at least as wide as the trigger.
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const maxWidth = Math.max(
      0,
      Math.min(Math.floor(20 * rem), Math.floor(viewportWidth - 16)),
    );
    const maxHeight = Math.max(0, Math.floor(viewportHeight - 16));
    this.#popup.style.setProperty("box-sizing", "border-box", "important");
    this.#popup.style.setProperty("padding", "0", "important");
    this.#popup.style.setProperty("border", "0", "important");
    this.#popup.style.setProperty("margin", "0", "important");
    if (menuAnchor) {
      const requestedWidth = menuAnchor.getBoundingClientRect().width;
      // Match a normal anchor exactly. If that would make the menu narrower
      // than its usable trigger/content width, keep the wider menu. Default
      // overlay centers it; explicit position applies its requested alignment.
      this.#popup.style.setProperty("width", "max-content", "important");
      this.#popup.style.setProperty("min-width", "0", "important");
      this.#popup.style.setProperty("max-width", `${maxWidth}px`, "important");
      const intrinsicWidth = this.#popup.getBoundingClientRect().width;
      const minimumWidth = Math.min(
        maxWidth,
        Math.max(anchorWidth, intrinsicWidth),
      );
      const width = Math.max(requestedWidth, minimumWidth);
      this.#popup.style.setProperty("width", `${width}px`, "important");
      this.#popup.style.setProperty("min-width", `${width}px`, "important");
      this.#popup.style.setProperty("max-width", `${width}px`, "important");
    } else {
      this.#popup.style.setProperty(
        "width",
        "max-content",
        "important",
      );
      this.#popup.style.setProperty("min-width", `${anchorWidth}px`, "important");
      this.#popup.style.setProperty("max-width", `${maxWidth}px`, "important");
    }
    this.#popup.style.setProperty("max-height", `${maxHeight}px`, "important");
    this.#popup.style.setProperty("height", "max-content", "important");
    this.#popup.style.setProperty("overflow", "hidden", "important");
    const used = this.#popup.getBoundingClientRect();
    if (used.height > maxHeight) {
      this.#popup.style.setProperty("height", `${maxHeight}px`, "important");
    }
    if (!menuAnchor && used.width > maxWidth) {
      this.#popup.style.setProperty("width", `${maxWidth}px`, "important");
    }
  }

  #openList() {
    if (!this.#popup || figEditorBooleanAttribute(this, "disabled")) return;
    this.#syncMenuAnchor();
    this.#installPopupPositioning();
    this.#freezeMenuPosition = false;
    this.#frozenLabelRect = null;
    this.#frozenViewport = null;
    this.#syncValue();
    this.#syncPopupWidth();
    this.#popup.open = true;
    document.addEventListener("keydown", this.#boundKeydown, true);
    this.#focusedIndex = -1;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.#syncPopupWidth();
        this.#placeOpenMenu();
        this.#syncPopupWidth();
        this.#clampMenuToViewport();
        const panel = this.#getPanel();
        const options = this.#getEnabledOptions();
        const selectedIndex = options.findIndex(
          (opt) => this.#optionValue(opt) === this.value,
        );
        if (selectedIndex >= 0) {
          this.#focusOptionAt(selectedIndex);
        } else if (
          this.#button?.hasAttribute("data-focus-visible") ||
          this.#button?.matches?.(":focus-visible")
        ) {
          this.#focusOptionAt(0);
        }
        panel?.syncOverflow?.();
        // Freeze overlay after layout settles so later positionPopup passes
        // don't undo scroll. Still clamp if content grows past the viewport.
        // Explicit position stays live so the popup can follow the anchor.
        if (!this.#usesExplicitPosition()) {
          this.#freezeMenuPosition = true;
          this.#rememberFrozenGeometry();
        }
      });
    });
  }

  #closeList() {
    if (!this.#popup) return;
    this.#freezeMenuPosition = false;
    this.#frozenLabelRect = null;
    this.#frozenViewport = null;
    document.removeEventListener("keydown", this.#boundKeydown, true);
    this.#popup.open = false;
  }
}
figEditorDefineElement("fig-select", FigSelect);

export { FigSelect };
