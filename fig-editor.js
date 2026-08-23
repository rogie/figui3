import "./fig.js";
import "./fig-lab.js";

function figEditorDefineElement(name, constructor) {
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

function figEditorEscapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function figEditorBooleanAttribute(element, name) {
  return element.hasAttribute(name) && element.getAttribute(name) !== "false";
}

function figEditorUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function figEditorCssUrl(url) {
  if (!url) return "";
  return `url("${String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function figEditorCreateIcon(name, options = {}) {
  const icon = document.createElement("fig-icon");
  if (name) icon.setAttribute("name", name);
  if (options.size) icon.setAttribute("size", options.size);
  if (options.className) icon.className = options.className;
  return icon;
}

function figEditorAppendChildren(parent, children) {
  const append = (child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
      child.forEach(append);
      return;
    }
    parent.append(child instanceof Node ? child : String(child));
  };
  append(children);
  return parent;
}

function figEditorSetAttributes(element, attributes = {}) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      element.className = String(value);
    } else if (value === true) {
      element.setAttribute(name, "");
    } else {
      element.setAttribute(name, String(value));
    }
  }
  return element;
}

function figEditorCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  figEditorSetAttributes(element, attributes);
  return figEditorAppendChildren(element, children);
}

const FIG_EDITOR_SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function figEditorCreateSvgElement(tagName, attributes, children) {
  const element = document.createElementNS(FIG_EDITOR_SVG_NAMESPACE, tagName);
  for (const [name, value] of Object.entries(attributes || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "className") {
      element.setAttribute("class", String(value));
    } else if (value === true) {
      element.setAttribute(name, "");
    } else {
      element.setAttribute(name, String(value));
    }
  }
  return figEditorAppendChildren(element, children);
}

function figEditorHexToRgb(hex) {
  const h = String(hex || "").replace(/^#/, "");
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

function figEditorRgbToHsl(r, g, b) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case R:
      h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
      break;
    case G:
      h = ((B - R) / d + 2) / 6;
      break;
    default:
      h = ((R - G) / d + 4) / 6;
      break;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function figEditorRgbToLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function figEditorRgbToOklab(r, g, b) {
  const lr = figEditorRgbToLinear(r);
  const lg = figEditorRgbToLinear(g);
  const lb = figEditorRgbToLinear(b);
  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function figEditorOklabToOklch(L, a, b) {
  return {
    l: L,
    c: Math.sqrt(a * a + b * b),
    h: (Math.atan2(b, a) * 180) / Math.PI,
  };
}

function figEditorCreateOverflowButtons({
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
      figEditorCreateIcon("chevron", {
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

function figEditorSyncOverflowState(host, scrollEl, axis = "x", threshold = 2) {
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

function figEditorScrollOverflowPage(scrollEl, axis = "x", direction = 1) {
  if (!scrollEl) return;
  const isHorizontal = axis === "x";
  const pageSize = isHorizontal ? scrollEl.clientWidth : scrollEl.clientHeight;
  const scrollAmount = pageSize * 0.8 * direction;
  scrollEl.scrollBy({
    [isHorizontal ? "left" : "top"]: scrollAmount,
    behavior: "smooth",
  });
}

function figEditorScrollElementToCenter(
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
      figEditorSyncOverflowState(scrollEl, scrollEl, axis);
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
    figEditorSyncOverflowState(scrollEl, scrollEl, axis);
  });
}


/* Select — dropdown-styled trigger + fig-popup listbox */
/** Parse options attr — same formats as fig-options / propskit-select. */
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
 * A selectable option for fig-select.
 * Supports light-DOM slots: `slot="prepend"` (leading) and `slot="append"` (trailing).
 * Use the `label` attribute for the closed-trigger label when option content is rich.
 *
 * @attr {string} value - Option value
 * @attr {string} label - Optional display label for the select trigger
 * @attr {boolean} disabled - Whether the option is disabled
 * @attr {boolean} selected - Whether the option is selected
 */
class FigSelectOption extends HTMLElement {
  static get observedAttributes() {
    return ["value", "disabled", "selected", "label"];
  }

  get value() {
    const attr = this.getAttribute("value");
    if (attr !== null) return attr;
    return (this.textContent || "").trim();
  }

  set value(val) {
    if (val === null || val === undefined) {
      this.removeAttribute("value");
    } else {
      this.setAttribute("value", String(val));
    }
  }

  get disabled() {
    return figEditorBooleanAttribute(this, "disabled");
  }

  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }

  get selected() {
    return figEditorBooleanAttribute(this, "selected");
  }

  set selected(val) {
    if (val) this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "option");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    this.#syncDisabled();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "disabled") this.#syncDisabled();
  }

  #syncDisabled() {
    const disabled = this.disabled;
    if (disabled) {
      this.setAttribute("aria-disabled", "true");
      this.setAttribute("tabindex", "-1");
    } else {
      this.removeAttribute("aria-disabled");
      if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");
    }
  }
}
figEditorDefineElement("fig-select-option", FigSelectOption);

/** Light-DOM panel wrapper projected into fig-select's popup; owns overflow buttons. */
class FigSelectOptions extends HTMLElement {
  #navStart = null;
  #navEnd = null;
  #resizeObserver = null;
  #boundSyncOverflow = this.syncOverflow.bind(this);

  connectedCallback() {
    if (!this.hasAttribute("slot")) this.setAttribute("slot", "panel");
    this.#unwrapLegacyChooser();
    this.#markFirstSeparatorBorderless();
    this.#ensureNavButtons();
    this.addEventListener("scroll", this.#boundSyncOverflow, { passive: true });
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => this.syncOverflow());
    this.#resizeObserver.observe(this);
    requestAnimationFrame(() => this.syncOverflow());
  }

  disconnectedCallback() {
    this.removeEventListener("scroll", this.#boundSyncOverflow);
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#removeNavButtons();
  }

  syncOverflow() {
    this.#markFirstSeparatorBorderless();
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

  #markFirstSeparatorBorderless() {
    const firstContent = Array.from(this.children).find(
      (child) => !child.hasAttribute("data-fig-select-nav"),
    );
    if (firstContent?.tagName === "FIG-SEPARATOR") {
      firstContent.setAttribute("borderless", "");
    }
  }

  #ensureNavButtons() {
    if (
      this.#navStart &&
      this.#navEnd &&
      this.contains(this.#navStart) &&
      this.contains(this.#navEnd)
    ) {
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
    this.prepend(this.#navStart);
    this.append(this.#navEnd);
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

/**
 * A dropdown-styled select.
 * @attr {string} variant - Visual style. Use `ghost` for a borderless control.
 */
class FigSelect extends HTMLElement {
  #button = null;
  #popup = null;
  #prependEl = null;
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
  #boundTriggerClick = this.#handleTriggerClick.bind(this);
  #boundOptionClick = this.#handleOptionClick.bind(this);
  #boundOptionPointerOver = this.#handleOptionPointerOver.bind(this);
  #boundKeydown = this.#handleKeydown.bind(this);
  #boundPopupClose = this.#handlePopupClose.bind(this);
  #boundSlotChange = this.#handleSlotChange.bind(this);

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "label",
      "options",
      "position",
      "offset",
      "closedby",
      "open",
      "variant",
    ];
  }

  get value() {
    return this.getAttribute("value") ?? "";
  }

  set value(val) {
    if (val === null || val === undefined) this.removeAttribute("value");
    else this.setAttribute("value", String(val));
  }

  get open() {
    return figEditorBooleanAttribute(this, "open");
  }

  set open(val) {
    if (val) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }

  connectedCallback() {
    if (!this.#initialized) this.#initialize();
    this.#ensurePanelSlotAttrs();
    this.#syncOptionsFromAttribute();
    this.#syncDisabled();
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
    if (name === "value" || name === "label") {
      this.#syncValue();
      return;
    }
    if (name === "disabled") {
      this.#syncDisabled();
      return;
    }
    if (name === "open") {
      if (newValue === null || newValue === "false") this.#closeList();
      else this.#openList();
      return;
    }
    if (name === "position" || name === "offset" || name === "closedby") {
      this.#syncPopupAttrs();
    }
  }

  focus(options) {
    this.#button?.focus(options);
  }

  blur() {
    this.#button?.blur();
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
        .fig-select-trigger:has(.fig-select-prepend:not(:empty)) {
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
          align-items: center;
          margin-right: var(--spacer-1, 0.25rem);
          pointer-events: none;
        }
        .fig-select-prepend:empty {
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

    const labelEl = document.createElement("span");
    labelEl.className = "fig-select-label";
    labelEl.setAttribute("part", "label");
    button.append(prependEl, labelEl);

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
    this.#labelEl = labelEl;
    this.#popup = popup;
    this.#panelSlot = panelSlot;
    popup.anchor = button;

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
      if (!this.open) {
        this.#originalPositionPopup?.();
        return;
      }
      this.#positionPopupOverSelected();
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

  #readLabelRectSnapshot() {
    const rect = this.#labelEl?.getBoundingClientRect();
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

  #positionPopupOverSelected() {
    // Content ResizeObserver / overflow scroll re-enter here; keep the
    // open-time alignment unless the trigger or viewport actually changed.
    if (this.#shouldSkipFrozenPositionPass()) return;

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

    // Lay out with the default positioning first so option metrics are valid.
    this.#originalPositionPopup?.();

    const popupRect = popup.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const optionTextRect = this.#getOptionTextRect(selected);
    if (
      !popupRect.width ||
      !popupRect.height ||
      !labelRect.width ||
      !optionTextRect
    ) {
      return;
    }

    const selectedOffsetX = optionTextRect.left - popupRect.left;
    const selectedOffsetY = optionTextRect.top - popupRect.top;
    const full = figEditorBooleanAttribute(this, "full");
    // [full]: pin menu to host width/edges. Otherwise overlay selected
    // option text on the trigger label (blend-mode style).
    let left = full
      ? this.getBoundingClientRect().left
      : labelRect.left - selectedOffsetX;
    let top = labelRect.top - selectedOffsetY;

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

    // Nudge the panel scroller so the selected label stays over the trigger.
    const panel = this.#getPanel();
    const alignedTextRect = this.#getOptionTextRect(selected);
    if (
      alignedTextRect &&
      panel &&
      panel.scrollHeight > panel.clientHeight + 1
    ) {
      const deltaY = alignedTextRect.top - labelRect.top;
      if (Math.abs(deltaY) > 0.5) {
        panel.scrollTop += deltaY;
      }
      panel.syncOverflow?.();
    }

    if (this.#freezeMenuPosition || this.open) {
      this.#rememberFrozenGeometry();
    }
  }

  #setupListeners() {
    this.#button?.addEventListener("click", this.#boundTriggerClick);
    this.#button?.addEventListener("keydown", this.#boundKeydown);
    // Host click: slotted options stay in light DOM (not dialog.contains).
    this.addEventListener("click", this.#boundOptionClick);
    this.addEventListener("pointerover", this.#boundOptionPointerOver);
    this.#popup?.addEventListener("keydown", this.#boundKeydown);
    this.#popup?.addEventListener("close", this.#boundPopupClose);
    this.#panelSlot?.addEventListener("slotchange", this.#boundSlotChange);
  }

  #teardownListeners() {
    this.#button?.removeEventListener("click", this.#boundTriggerClick);
    this.#button?.removeEventListener("keydown", this.#boundKeydown);
    this.removeEventListener("click", this.#boundOptionClick);
    this.removeEventListener("pointerover", this.#boundOptionPointerOver);
    this.#popup?.removeEventListener("keydown", this.#boundKeydown);
    this.#popup?.removeEventListener("close", this.#boundPopupClose);
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
    if (!this.#prependEl) return;
    const source = option?.querySelector?.(':scope > [slot="prepend"]');
    this.#prependEl.replaceChildren(
      ...Array.from(source?.childNodes ?? [], (node) => node.cloneNode(true)),
    );
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
        const selected = opt === match;
        opt.setAttribute("aria-selected", selected ? "true" : "false");
        if (selected) opt.setAttribute("selected", "");
        else opt.removeAttribute("selected");
      }

      const label =
        (match && this.#optionLabel(match)) || this.getAttribute("label") || "";
      if (this.#labelEl) this.#labelEl.textContent = label;
      this.#syncPrepend(match);

      const ariaLabel = this.getAttribute("label") || "Select";
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
    const nextOpen = !this.open;
    if (nextOpen && this.#popup && this.#button) {
      this.#popup.anchor = this.#button;
    }
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

    const listOpen = this.open && (this.#popup?.matches?.(":open") ?? false);
    if (!listOpen) {
      if (
        this.#button?.contains(e.target) &&
        (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        if (this.#popup && this.#button) this.#popup.anchor = this.#button;
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
        this.#focusOptionAt(this.#focusedIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        this.#syncFocusedIndex();
        this.#focusOptionAt(this.#focusedIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        this.#focusOptionAt(0);
        break;
      case "End":
        e.preventDefault();
        this.#focusOptionAt(options.length - 1);
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

  #handlePopupClose() {
    if (this.hasAttribute("open")) this.removeAttribute("open");
    this.#button?.setAttribute("aria-expanded", "false");
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

  #focusOptionAt(index) {
    const options = this.#getEnabledOptions();
    if (!options.length) return;
    const next = ((index % options.length) + options.length) % options.length;
    this.#focusedIndex = next;
    options[next]?.focus();
  }

  #syncPopupWidth() {
    if (!this.#popup || !this.#button) return;
    const hostWidth = Math.ceil(this.getBoundingClientRect().width);
    const triggerWidth = Math.ceil(this.#button.getBoundingClientRect().width);
    const anchorWidth = Math.max(hostWidth, triggerWidth, 96);

    // Use !important — fig-select::part(listbox) width rules beat element.style.
    // Menus size to their options while remaining at least as wide as the trigger.
    this.#popup.style.setProperty("width", "max-content", "important");
    this.#popup.style.setProperty("min-width", `${anchorWidth}px`, "important");
    this.#popup.style.setProperty(
      "max-width",
      "min(20rem, calc(100vw - 1rem))",
      "important",
    );
  }

  #openList() {
    if (!this.#popup || figEditorBooleanAttribute(this, "disabled")) return;
    if (this.#button) this.#popup.anchor = this.#button;
    this.#installPopupPositioning();
    this.#freezeMenuPosition = false;
    this.#frozenLabelRect = null;
    this.#frozenViewport = null;
    this.#syncValue();
    this.#syncPopupWidth();
    this.#popup.open = true;
    document.addEventListener("keydown", this.#boundKeydown, true);
    this.#button?.setAttribute("aria-expanded", "true");
    this.#focusedIndex = -1;
    requestAnimationFrame(() => {
      this.#syncPopupWidth();
      this.#positionPopupOverSelected();
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
      // Freeze after open align so later positionPopup passes don't undo scroll.
      // Window resize / trigger movement still realigns via geometry checks.
      this.#freezeMenuPosition = true;
      this.#rememberFrozenGeometry();
    });
  }

  #closeList() {
    if (!this.#popup) return;
    this.#freezeMenuPosition = false;
    this.#frozenLabelRect = null;
    this.#frozenViewport = null;
    document.removeEventListener("keydown", this.#boundKeydown, true);
    this.#popup.open = false;
    this.#button?.setAttribute("aria-expanded", "false");
  }
}
figEditorDefineElement("fig-select", FigSelect);


// FigFillPicker
const GRADIENT_INTERPOLATION_SPACES = [
  "srgb",
  "srgb-linear",
  "display-p3",
  "oklab",
  "oklch",
  "hsl",
];
const GRADIENT_HUE_INTERPOLATIONS = [
  "shorter",
  "longer",
  "increasing",
  "decreasing",
];
const GRADIENT_HUE_SPACES = new Set(["oklch", "hsl"]);

function normalizeGradientConfig(gradient) {
  const next = { ...(gradient ?? {}) };
  let interpolationSpace = String(
    next.interpolationSpace ?? "srgb",
  ).toLowerCase();
  if (!GRADIENT_INTERPOLATION_SPACES.includes(interpolationSpace)) {
    interpolationSpace = "srgb";
  }
  next.interpolationSpace = interpolationSpace;

  const hueInterpolation = String(
    next.hueInterpolation ?? "shorter",
  ).toLowerCase();
  next.hueInterpolation = GRADIENT_HUE_INTERPOLATIONS.includes(hueInterpolation)
    ? hueInterpolation
    : "shorter";
  return next;
}

function lockFillPickerGradientInterpolation(gradient) {
  const next = normalizeGradientConfig(gradient);
  // Interpolation UI hidden for now — lock to sRGB.
  next.interpolationSpace = "srgb";
  delete next.hueInterpolation;
  return next;
}

function gradientToValueShape(gradient) {
  const normalized = lockFillPickerGradientInterpolation(gradient);
  const output = {
    ...normalized,
    interpolationSpace: normalized.interpolationSpace,
  };
  if (GRADIENT_HUE_SPACES.has(normalized.interpolationSpace)) {
    output.hueInterpolation = normalized.hueInterpolation;
  } else {
    delete output.hueInterpolation;
  }
  return output;
}

function gradientInterpolationClause(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  if (normalized.interpolationSpace === "srgb") {
    return "";
  }
  if (GRADIENT_HUE_SPACES.has(normalized.interpolationSpace)) {
    return `in ${normalized.interpolationSpace} ${normalized.hueInterpolation} hue`;
  }
  return `in ${normalized.interpolationSpace}`;
}

function gradientInterpolationSelectValue(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  if (GRADIENT_HUE_SPACES.has(normalized.interpolationSpace)) {
    return `${normalized.interpolationSpace}-${normalized.hueInterpolation || "shorter"}`;
  }
  return normalized.interpolationSpace;
}

function parseGradientInterpolationSelectValue(val) {
  const raw = String(val ?? "");
  for (const space of GRADIENT_HUE_SPACES) {
    const prefix = `${space}-`;
    if (raw.startsWith(prefix)) {
      return {
        interpolationSpace: space,
        hueInterpolation: raw.slice(prefix.length) || "shorter",
      };
    }
  }
  return {
    interpolationSpace: raw || "srgb",
    hueInterpolation: "shorter",
  };
}

/**
 * A comprehensive fill picker component supporting solid colors, gradients, images, video, and webcam.
 * Uses display: contents and wraps a trigger element that opens a dialog picker.
 *
 * @attr {string} value - JSON-encoded fill value
 * @attr {boolean} disabled - Whether the picker is disabled
 * @attr {boolean} alpha - Whether to show alpha/opacity controls (default: true)
 * @attr {string} dialog-position - Position of the popup (default: "left")
 * @attr {string} webcam-mode - `live` (default) keeps the camera after close; Capture always writes an image still
 * @attr {string} default-video - Sample clip URL when Video is selected with no file
 * @fires webcamstream - `{ stream, deviceId }` when the live camera starts, switches, or is released
 */
let figFillPickerDialogId = 0;

class FigFillPicker extends HTMLElement {
  // One segment per color space; `advanced` variants live in the overflow menu
  // and retarget their space's segment when picked.
  static #GRADIENT_INTERPOLATION_MODES = [
    { value: "srgb", space: "srgb", title: "Classic", subtitle: "sRGB Linear" },
    { value: "oklab", space: "oklab", title: "Smooth", subtitle: "OKLab" },
    {
      value: "oklch-increasing",
      space: "oklch",
      title: "Vibrant",
      subtitle: "OKLCH Increasing",
    },
    {
      value: "hsl-increasing",
      space: "hsl",
      title: "Vivid",
      subtitle: "HSL Increasing",
    },
    {
      value: "oklch-decreasing",
      space: "oklch",
      title: "Vibrant",
      subtitle: "OKLCH Decreasing",
      advanced: true,
    },
    {
      value: "hsl-decreasing",
      space: "hsl",
      title: "Vivid",
      subtitle: "HSL Decreasing",
      advanced: true,
    },
  ];

  static #gradientInterpolationMode(value) {
    const modes = FigFillPicker.#GRADIENT_INTERPOLATION_MODES;
    const exact = modes.find((mode) => mode.value === value);
    if (exact) return exact;
    // External values (e.g. "oklch-shorter") still label against their space.
    const parsed = parseGradientInterpolationSelectValue(value);
    const base = modes.find((mode) => mode.space === parsed.interpolationSpace);
    const spaceLabel =
      base?.subtitle.split(" ")[0] ?? parsed.interpolationSpace.toUpperCase();
    const hue = parsed.hueInterpolation;
    return {
      value,
      space: parsed.interpolationSpace,
      title: base?.title ?? "Custom",
      subtitle: GRADIENT_HUE_SPACES.has(parsed.interpolationSpace)
        ? `${spaceLabel} ${hue.charAt(0).toUpperCase()}${hue.slice(1)}`
        : spaceLabel,
    };
  }

  #trigger = null;
  #swatch = null;
  #dialog = null;
  #dialogId = `fig-fill-picker-dialog-${++figFillPickerDialogId}`;
  #activeTab = "solid";
  anchorElement = null;

  // Fill state
  #fillType = "solid";
  #gamut = "srgb"; // "srgb" or "display-p3"
  #color = { h: 0, s: 0, v: 85, a: 1 }; // Default gray #D9D9D9
  #colorInputMode = "hex";
  #gradient = {
    type: "linear",
    angle: 0,
    centerX: 50,
    centerY: 50,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };
  #image = { url: null, scaleMode: "fill", scale: 50 };
  #video = {
    url: null,
    poster: null,
    scaleMode: "fill",
    scale: 50,
    opacity: 1,
    missing: true,
  };
  #webcam = {
    stream: null,
    live: true,
    snapshot: null,
    deviceId: null,
    scaleMode: "fill",
    scale: 50,
    opacity: 1,
  };
  #webcamPosterStream = null;
  #webcamSnapshotting = false;
  #webcamImageCapture = null;

  // Custom mode slots and data
  #customSlots = {};
  #customData = {};

  // DOM references for solid tab
  #colorArea = null;
  #colorAreaHandle = null;
  #hueSlider = null;
  #opacitySlider = null;
  #isDraggingColor = false;
  #syncingGradientBar = false;
  #teardownColorAreaEvents = null;
  #gradientInterpolationOpenObserver = null;
  #valueAtOpen = null;
  #lastChangeValue = null;
  #webcamStart = null;
  #webcamRequestId = 0;
  #boundTriggerClick = null;
  #boundTriggerKeydown = null;
  #rafIds = new Set();
  #ownedBlobUrls = new Set();

  constructor() {
    super();
    this.#boundTriggerClick = this.#handleTriggerClick.bind(this);
    this.#boundTriggerKeydown = this.#handleTriggerKeydown.bind(this);
  }

  static get observedAttributes() {
    return [
      "value",
      "disabled",
      "alpha",
      "mode",
      "webcam-mode",
      "default-video",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
    ];
  }

  connectedCallback() {
    // Use display: contents
    this.style.display = "contents";

    this.#scheduleFrame(() => {
      this.#setupTrigger();
      this.#parseValue();
      this.#updateSwatch();
    });
  }

  disconnectedCallback() {
    this.#discardDialog({ stopWebcam: true });
    this.#cancelFrames();
    this.#revokeOwnedBlobUrls();
    if (this.#swatch) this.#swatch.removeAttribute("selected");
    if (this.#trigger) {
      this.#trigger.removeEventListener("click", this.#boundTriggerClick);
      this.#trigger.removeEventListener("keydown", this.#boundTriggerKeydown);
    }
    this.#trigger = null;
    this.#swatch = null;
  }

  #isDisabled() {
    return (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    );
  }

  #webcamMode() {
    return this.getAttribute("webcam-mode") === "snapshot" ? "snapshot" : "live";
  }

  #shouldKeepWebcamLive() {
    return (
      this.#fillType === "webcam" &&
      this.#webcamMode() === "live" &&
      this.#webcam.live !== false
    );
  }

  #webcamValue() {
    return {
      live: this.#webcamMode() === "live" && this.#webcam.live !== false,
      snapshot: this.#webcam.snapshot ?? null,
      deviceId: this.#webcam.deviceId ?? null,
      scaleMode: this.#webcam.scaleMode || "fill",
      scale: this.#webcam.scale ?? 50,
      opacity: this.#webcam.opacity ?? 1,
    };
  }

  #videoValue() {
    const url = this.#video.url ?? null;
    return {
      url,
      poster: this.#video.poster ?? null,
      scaleMode: this.#video.scaleMode || "fill",
      scale: this.#video.scale ?? 50,
      opacity: this.#video.opacity ?? 1,
      ...(url ? {} : { missing: true }),
    };
  }

  #applyParsedWebcam(parsed) {
    if (parsed.webcam && typeof parsed.webcam === "object") {
      const { stream: _ignored, snapshot, ...rest } = parsed.webcam;
      Object.assign(this.#webcam, rest);
      // Host writes can arrive as `{ snapshot: null }` while a live frame is
      // in flight — keep the captured still so the closed swatch can paint it.
      if (typeof snapshot === "string" && snapshot) {
        this.#webcam.snapshot = snapshot;
      }
      return;
    }
    if (parsed.type === "webcam" && parsed.image) {
      if (parsed.image.url != null) this.#webcam.snapshot = parsed.image.url;
      if (parsed.image.scaleMode) this.#webcam.scaleMode = parsed.image.scaleMode;
      if (parsed.image.scale != null) this.#webcam.scale = parsed.image.scale;
    }
  }

  #emitWebcamStream() {
    this.dispatchEvent(
      new CustomEvent("webcamstream", {
        bubbles: true,
        composed: true,
        detail: {
          stream: this.#webcam.stream,
          deviceId: this.#webcam.deviceId ?? null,
        },
      }),
    );
  }

  get webcamStream() {
    return this.#webcam.stream;
  }

  releaseWebcam() {
    this.#stopWebcam();
  }

  #writeWebcamSnapshot(blob) {
    if (!blob) return null;
    if (this.#webcam.snapshot?.startsWith("blob:")) {
      URL.revokeObjectURL(this.#webcam.snapshot);
      this.#ownedBlobUrls.delete(this.#webcam.snapshot);
    }
    this.#webcam.snapshot = URL.createObjectURL(blob);
    this.#ownedBlobUrls.add(this.#webcam.snapshot);
    return this.#webcam.snapshot;
  }

  #webcamFrameIsBlank(ctx, width, height) {
    if (typeof ctx.getImageData !== "function") return false;
    let data;
    try {
      data = ctx.getImageData(0, 0, width, height).data;
    } catch {
      return false;
    }
    const step = Math.max(1, Math.floor((width * height) / 256));
    let max = 0;
    let lit = 0;
    let samples = 0;
    for (let i = 0; i < data.length; i += step * 4) {
      const peak = Math.max(data[i], data[i + 1], data[i + 2]);
      max = Math.max(max, peak);
      samples += 1;
      if (peak > 24) lit += 1;
    }
    if (!samples) return true;
    // Built-in cams often emit near-black boot frames with a bit of noise.
    return max <= 40 || lit / samples < 0.04;
  }

  async #webcamFrameSources(video) {
    const sources = [];
    const track = this.#webcam.stream?.getVideoTracks?.()?.[0];
    if (track && typeof ImageCapture === "function") {
      try {
        if (this.#webcamImageCapture?.track !== track) {
          this.#webcamImageCapture = new ImageCapture(track);
        }
        sources.push(await this.#webcamImageCapture.grabFrame());
      } catch {
        this.#webcamImageCapture = null;
      }
    }
    if (typeof createImageBitmap === "function") {
      try {
        sources.push(await createImageBitmap(video));
      } catch {
        /* video not readable yet */
      }
    }
    sources.push(video);
    return sources.filter(Boolean);
  }

  async #paintWebcamFrame(ctx, video, width, height) {
    const sources = await this.#webcamFrameSources(video);
    for (const source of sources) {
      try {
        ctx.drawImage(source, 0, 0, width, height);
      } catch {
        continue;
      } finally {
        source.close?.();
      }
      if (!this.#webcamFrameIsBlank(ctx, width, height)) return true;
    }
    return false;
  }

  #waitForNextVideoFrame(video) {
    return new Promise((resolve) => {
      if (typeof video.requestVideoFrameCallback === "function") {
        const timer = setTimeout(() => resolve(false), 400);
        video.requestVideoFrameCallback(() => {
          clearTimeout(timer);
          resolve(true);
        });
        return;
      }
      setTimeout(() => resolve(false), 200);
    });
  }

  async #snapshotWebcamVideo(video) {
    if (!video?.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const painted = await this.#paintWebcamFrame(
      ctx,
      video,
      canvas.width,
      canvas.height,
    );
    if (!painted) return null;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return this.#writeWebcamSnapshot(blob);
  }

  #syncLiveWebcamSwatch(video) {
    if (this.#fillType !== "webcam") return;
    const stream = this.#webcam.stream;
    if (!stream) return;
    if (this.#webcamPosterStream === stream && this.#webcam.snapshot) {
      this.#updateSwatch();
      return;
    }
    if (this.#webcamSnapshotting) return;
    this.#webcamSnapshotting = true;

    const finish = (url) => {
      this.#webcamSnapshotting = false;
      if (!url || this.#fillType !== "webcam" || this.#webcam.stream !== stream) {
        return;
      }
      this.#webcamPosterStream = stream;
      this.#updateSwatch();
      this.#emitInput();
    };

    const attempt = async () => {
      const url = await this.#snapshotWebcamVideo(video);
      if (url) {
        finish(url);
        return;
      }
      if (this.#fillType !== "webcam" || this.#webcam.stream !== stream) {
        this.#webcamSnapshotting = false;
        return;
      }
      await this.#waitForNextVideoFrame(video);
      return attempt();
    };

    attempt();
  }

  #scheduleFrame(callback) {
    const id = requestAnimationFrame(() => {
      this.#rafIds.delete(id);
      if (this.isConnected) callback();
    });
    this.#rafIds.add(id);
    return id;
  }

  #cancelFrames() {
    this.#rafIds.forEach((id) => cancelAnimationFrame(id));
    this.#rafIds.clear();
  }

  #revokeOwnedBlobUrls() {
    // Keep blobs still published on value so fig-input-fill / hosts can paint the swatch.
    const keep = new Set(
      [this.#webcam.snapshot, this.#video.poster, this.#image.url].filter(
        (url) => typeof url === "string" && url.startsWith("blob:"),
      ),
    );
    this.#ownedBlobUrls.forEach((url) => {
      if (!keep.has(url)) URL.revokeObjectURL(url);
    });
    this.#ownedBlobUrls.clear();
    keep.forEach((url) => this.#ownedBlobUrls.add(url));
  }

  #setupTrigger() {
    const child = Array.from(this.children).find(
      (el) => !el.getAttribute("slot")?.startsWith("mode-"),
    );

    if (!child) {
      // Scenario 1: Empty - create fig-swatch
      this.#swatch = document.createElement("fig-swatch");
      this.#swatch.setAttribute("background", "#D9D9D9");
      this.appendChild(this.#swatch);
      this.#trigger = this.#swatch;
    } else if (child.matches("fig-swatch, fig-chit")) {
      // Scenario 2: Has swatch - use and populate it
      this.#swatch = child;
      this.#trigger = child;
    } else {
      // Scenario 3: Other element - trigger only, no populate
      this.#trigger = child;
      this.#swatch = null;
    }

    this.#syncTriggerA11y();
    this.#trigger.removeEventListener("click", this.#boundTriggerClick);
    this.#trigger.addEventListener("click", this.#boundTriggerClick);
    this.#trigger.removeEventListener("keydown", this.#boundTriggerKeydown);
    this.#trigger.addEventListener("keydown", this.#boundTriggerKeydown);

    // Prevent the swatch's internal color input from opening system picker
    if (this.#swatch) {
      this.#scheduleFrame(() => {
        const input = this.#swatch.querySelector('input[type="color"]');
        if (input) {
          input.remove();
        }
        this.#syncTriggerA11y();
      });
    }
  }

  #triggerLabel() {
    return this.getAttribute("aria-label") || "Fill picker";
  }

  #syncTriggerA11y() {
    if (!this.#trigger) return;
    const disabled = this.#isDisabled();
    const labelledBy = this.getAttribute("aria-labelledby");
    if (!this.#trigger.hasAttribute("role")) this.#trigger.setAttribute("role", "button");
    this.#trigger.setAttribute("tabindex", disabled ? "-1" : "0");
    this.#trigger.setAttribute("aria-disabled", disabled ? "true" : "false");
    this.#trigger.setAttribute("aria-haspopup", "dialog");
    this.#trigger.setAttribute("aria-expanded", this.#dialog?.open ? "true" : "false");
    this.#trigger.setAttribute("aria-controls", this.#dialogId);
    this.#trigger.removeAttribute("aria-hidden");
    if (labelledBy) {
      this.#trigger.setAttribute("aria-labelledby", labelledBy);
      this.#trigger.removeAttribute("aria-label");
    } else if (this.hasAttribute("aria-label")) {
      this.#trigger.setAttribute("aria-label", `Open ${this.#triggerLabel()}`);
      this.#trigger.removeAttribute("aria-labelledby");
    } else {
      this.#trigger.removeAttribute("aria-labelledby");
      if (!this.#trigger.hasAttribute("aria-label")) {
        this.#trigger.setAttribute("aria-label", `Open ${this.#triggerLabel()}`);
      }
    }
    const describedBy = this.getAttribute("aria-describedby");
    if (describedBy) this.#trigger.setAttribute("aria-describedby", describedBy);
    else this.#trigger.removeAttribute("aria-describedby");
  }

  #handleTriggerClick(e) {
    if (this.#isDisabled()) return;
    e.stopPropagation();
    e.preventDefault();
    this.#openDialog();
  }

  #handleTriggerKeydown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (this.#isDisabled()) return;
    e.preventDefault();
    e.stopPropagation();
    this.#openDialog();
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;

    const builtinTypes = ["solid", "gradient", "image", "video", "webcam"];

    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed.type) this.#fillType = parsed.type;
      if (parsed.color) {
        // Handle both hex string and HSV object
        if (typeof parsed.color === "string") {
          this.#color = this.#hexToHSV(parsed.color);
        } else if (
          typeof parsed.color === "object" &&
          parsed.color.h !== undefined
        ) {
          this.#color = parsed.color;
        }
      }
      // `alpha` is canonical (0-1); retain `opacity` (0-100) compatibility.
      const parsedAlpha =
        parsed.alpha !== undefined
          ? Number(parsed.alpha)
          : parsed.opacity !== undefined
            ? Number(parsed.opacity) / 100
            : undefined;
      if (Number.isFinite(parsedAlpha)) {
        this.#color.a = Math.max(0, Math.min(1, parsedAlpha));
      }
      // Gamut UI hidden for now — lock to sRGB.
      this.#gamut = "srgb";
      if (parsed.gradient) {
        this.#gradient = lockFillPickerGradientInterpolation({
          ...this.#gradient,
          ...parsed.gradient,
        });
      }
      if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
      if (parsed.video) {
        this.#video = { ...this.#video, ...parsed.video };
        this.#video.missing = !this.#video.url;
      }
      this.#applyParsedWebcam(parsed);

      // Store full parsed data for custom (non-built-in) types
      if (parsed.type && !builtinTypes.includes(parsed.type)) {
        const { type, ...rest } = parsed;
        this.#customData[parsed.type] = rest;
      }
    } catch (e) {
      // If not JSON, treat as hex color
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#color = this.#hexToHSV(valueAttr);
      }
    }
  }

  #updateSwatch() {
    if (!this.#swatch) return;

    let bg;
    let bgSize = "cover";
    let bgPosition = "center";

    switch (this.#fillType) {
      case "solid":
        bg = this.#hsvToHex(this.#color);
        break;
      case "gradient":
        bg = this.#getGradientCSS();
        break;
      case "image":
        if (this.#image.url) {
          bg = figEditorCssUrl(this.#image.url);
          const sizing = this.#getBackgroundSizing(
            this.#image.scaleMode,
            this.#image.scale,
          );
          bgSize = sizing.size;
          bgPosition = sizing.position;
        } else {
          bg = "";
        }
        break;
      case "video":
        if (this.#video.poster) {
          bg = figEditorCssUrl(this.#video.poster);
          const sizing = this.#getBackgroundSizing(
            this.#video.scaleMode,
            this.#video.scale,
          );
          bgSize = sizing.size;
          bgPosition = sizing.position;
        } else {
          bg = "";
        }
        break;
      case "webcam":
        if (this.#webcam.snapshot) {
          bg = figEditorCssUrl(this.#webcam.snapshot);
          const sizing = this.#getBackgroundSizing(
            this.#webcam.scaleMode,
            this.#webcam.scale,
          );
          bgSize = sizing.size;
          bgPosition = sizing.position;
        } else {
          bg = "";
        }
        break;
      default: {
        const slot =
          this.#customSlots[this.#fillType]?.element ||
          this.querySelector(`[slot="mode-${this.#fillType}"]`);
        bg = slot?.getAttribute("swatch-background") || "";
        break;
      }
    }

    this.#swatch.setAttribute("background", bg);
    this.#swatch.style.setProperty("--swatch-bg-size", bgSize);
    this.#swatch.style.setProperty("--swatch-bg-position", bgPosition);

    if (this.#fillType === "solid") {
      this.#swatch.setAttribute("alpha", this.#color.a);
    } else {
      this.#swatch.removeAttribute("alpha");
    }
  }

  #getBackgroundSizing(scaleMode, scale) {
    switch (scaleMode) {
      case "fill":
        return { size: "cover", position: "center" };
      case "fit":
        return { size: "contain", position: "center" };
      case "crop":
        return { size: "cover", position: "center" };
      case "tile":
        return { size: `${scale}%`, position: "top left" };
      default:
        return { size: "cover", position: "center" };
    }
  }

  #openDialog() {
    if (this.#isDisabled()) return;
    if (!this.#dialog) {
      this.#createDialog();
    }

    this.#valueAtOpen = JSON.stringify(this.value);
    this.#lastChangeValue = this.#valueAtOpen;
    this.#switchTab(this.#fillType, { emit: false });

    if (this.#swatch) this.#swatch.setAttribute("selected", "true");

    this.#dialog.open = true;
    this.#syncTriggerA11y();

    this.#scheduleFrame(() => {
      const focusTarget = this.#dialog?.querySelector(
        ".fig-fill-picker-close, .fig-fill-picker-type, fig-button, button, input, [tabindex='0']",
      );
      focusTarget?.focus?.();
      this.#scheduleFrame(() => {
        this.#drawColorArea();
        this.#updateHandlePosition();
      });
    });
  }

  open() {
    this.#openDialog();
  }

  close() {
    if (this.#dialog) {
      this.#dialog.open = false;
      this.#syncTriggerA11y();
    }
  }

  #restoreCustomSlotContent() {
    if (!this.#dialog) return;
    for (const [modeName, { element }] of Object.entries(this.#customSlots)) {
      const container = Array.from(
        this.#dialog.querySelectorAll(".fig-fill-picker-tab"),
      ).find((candidate) => candidate.dataset.tab === modeName);
      if (!container) continue;
      while (container.firstChild) element.appendChild(container.firstChild);
    }
  }

  #discardDialog({ stopWebcam = false } = {}) {
    if (this.#teardownColorAreaEvents) {
      this.#teardownColorAreaEvents();
      this.#teardownColorAreaEvents = null;
    }
    this.#gradientInterpolationOpenObserver?.disconnect();
    this.#gradientInterpolationOpenObserver = null;
    if (!stopWebcam && this.#shouldKeepWebcamLive()) this.#detachWebcamPreview();
    else this.#stopWebcam();
    if (!this.#dialog) return;
    this.#restoreCustomSlotContent();
    this.#dialog.remove();
    this.#dialog = null;
    this.#webcamStart = null;
    this.#valueAtOpen = null;
    this.#lastChangeValue = null;
    this.#colorArea = null;
    this.#colorAreaHandle = null;
    this.#hueSlider = null;
    this.#opacitySlider = null;
    this.#syncingGradientBar = false;
    this.#syncTriggerA11y();
  }

  #detachWebcamPreview() {
    this.#webcamRequestId += 1;
    const video = this.#dialog?.querySelector(
      ".fig-fill-picker-webcam-video",
    );
    if (video) video.srcObject = null;
  }

  #stopWebcam({ emit = true } = {}) {
    this.#webcamRequestId += 1;
    const hadStream = Boolean(this.#webcam.stream);
    if (this.#webcam.stream) {
      this.#webcam.stream.getTracks().forEach((track) => track.stop());
      this.#webcam.stream = null;
    }
    this.#webcamPosterStream = null;
    this.#webcamSnapshotting = false;
    this.#webcamImageCapture = null;
    const video = this.#dialog?.querySelector(
      ".fig-fill-picker-webcam-video",
    );
    if (video) video.srcObject = null;
    if (hadStream && emit) this.#emitWebcamStream();
  }

  #createDialog() {
    // Collect slotted custom mode content before any DOM changes
    this.#customSlots = {};
    this.querySelectorAll('[slot^="mode-"]').forEach((el) => {
      const modeName = el.getAttribute("slot").slice(5);
      this.#customSlots[modeName] = {
        element: el,
        label:
          el.getAttribute("label") ||
          modeName.charAt(0).toUpperCase() + modeName.slice(1),
      };
    });

    this.#dialog = document.createElement("dialog", { is: "fig-popup" });
    this.#dialog.setAttribute("is", "fig-popup");
    this.#dialog.id = this.#dialogId;
    this.#dialog.setAttribute("aria-label", this.#triggerLabel());
    this.#dialog.setAttribute("drag", "true");
    this.#dialog.setAttribute("handle", "fig-header");
    this.#dialog.setAttribute("autoresize", "false");
    this.#dialog.classList.add("fig-fill-picker-dialog");

    this.#dialog.anchor = this.anchorElement || this.#trigger;
    const dialogPosition = this.getAttribute("dialog-position") || "left";
    this.#dialog.setAttribute("position", dialogPosition);
    this.#dialog.setAttribute("offset", this.getAttribute("dialog-offset") || "8 8");

    const builtinModes = ["solid", "gradient", "image", "video", "webcam"];
    const builtinLabels = {
      solid: "Solid",
      gradient: "Gradient",
      image: "Image",
      video: "Video",
      webcam: "Webcam",
    };

    // Build allowed modes: built-ins filtered normally, custom names accepted if slot exists
    const mode = this.getAttribute("mode");
    let allowedModes;
    if (mode) {
      const requested = mode.split(",").map((m) => m.trim().toLowerCase());
      allowedModes = requested.filter(
        (m) => builtinModes.includes(m) || this.#customSlots[m],
      );
      if (allowedModes.length === 0) allowedModes = [...builtinModes];
    } else {
      allowedModes = [...builtinModes];
    }

    // Build labels map: built-in labels + custom slot labels
    const modeLabels = { ...builtinLabels };
    for (const [name, { label }] of Object.entries(this.#customSlots)) {
      modeLabels[name] = label;
    }

    if (!allowedModes.includes(this.#fillType)) {
      this.#fillType = allowedModes[0];
      this.#activeTab = allowedModes[0];
    }

    let headerContent;
    if (allowedModes.length === 1) {
      headerContent = figEditorCreateElement(
        "h3",
        { className: "fig-fill-picker-type-label" },
        modeLabels[allowedModes[0]],
      );
    } else {
      const options = figEditorCreateElement(
        "fig-select-options",
        {},
        allowedModes.map((modeName) =>
          figEditorCreateElement(
            "fig-select-option",
            { value: modeName },
            modeLabels[modeName],
          ),
        ),
      );
      headerContent = figEditorCreateElement(
        "fig-select",
        {
          className: "fig-fill-picker-type",
          label: "Fill type",
          variant: "ghost",
          value: this.#fillType,
        },
        options,
      );
    }

    // Generate tab containers for all allowed modes
    const tabDivs = allowedModes.map((modeName) =>
      figEditorCreateElement("div", {
        className: "fig-fill-picker-tab",
        "data-tab": modeName,
      }),
    );
    const closeButton = figEditorCreateElement(
      "fig-button",
      {
        icon: true,
        variant: "ghost",
        className: "fig-fill-picker-close",
        "aria-label": "Close fill picker",
      },
      figEditorCreateIcon("close"),
    );
    this.#dialog.replaceChildren(
      figEditorCreateElement("fig-header", {}, [
        headerContent,
        closeButton,
      ]),
      figEditorCreateElement("fig-content", {}, tabDivs),
    );

    document.body.appendChild(this.#dialog);

    // Populate custom tab containers and emit modeready
    for (const [modeName, { element }] of Object.entries(this.#customSlots)) {
      const container = Array.from(
        this.#dialog.querySelectorAll(".fig-fill-picker-tab"),
      ).find((candidate) => candidate.dataset.tab === modeName);
      if (!container) continue;

      // Move children (not the element itself) for vanilla HTML usage
      while (element.firstChild) {
        container.appendChild(element.firstChild);
      }

      // Emit modeready so frameworks can render into the container
      this.dispatchEvent(
        new CustomEvent("modeready", {
          bubbles: true,
          detail: { mode: modeName, container },
        }),
      );
    }

    // Setup type select switching (only if not locked)
    const typeSelect = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeSelect) {
      typeSelect.addEventListener("change", (e) => {
        const next =
          typeof e.detail === "string" ? e.detail : e.target?.value;
        if (next) this.#switchTab(next);
      });
    }

    this.#dialog
      .querySelector(".fig-fill-picker-close")
      .addEventListener("click", () => {
        this.#dialog.open = false;
      });

    const onDialogClose = () => {
      if (this.#swatch) this.#swatch.removeAttribute("selected");
      if (this.#shouldKeepWebcamLive()) this.#detachWebcamPreview();
      else this.#stopWebcam();
      const closingValue = JSON.stringify(this.value);
      if (this.#lastChangeValue !== null && this.#lastChangeValue !== closingValue) {
        this.#emitChange();
      }
      this.#valueAtOpen = null;
      this.#lastChangeValue = null;
      this.#syncTriggerA11y();
      const returnTarget = this.#trigger;
      this.#scheduleFrame(() => {
        if (returnTarget?.isConnected) {
          HTMLElement.prototype.focus.call(returnTarget);
        }
      });
      this.dispatchEvent(new CustomEvent("close"));
    };
    this.#dialog.addEventListener("close", onDialogClose);

    // Initialize built-in tabs (skip any overridden by custom slots)
    const builtinInits = {
      solid: () => this.#initSolidTab(),
      gradient: () => this.#initGradientTab(),
      image: () => this.#initImageTab(),
      video: () => this.#initVideoTab(),
      webcam: () => this.#initWebcamTab(),
    };
    for (const [name, init] of Object.entries(builtinInits)) {
      if (!this.#customSlots[name] && allowedModes.includes(name)) init();
    }

    // Listen for input/change from custom tab content
    for (const modeName of Object.keys(this.#customSlots)) {
      if (builtinModes.includes(modeName)) continue;
      const container = Array.from(
        this.#dialog.querySelectorAll(".fig-fill-picker-tab"),
      ).find((candidate) => candidate.dataset.tab === modeName);
      if (!container) continue;
      container.addEventListener("input", (e) => {
        if (e.target === this) return;
        e.stopPropagation();
        if (e.detail) this.#customData[modeName] = e.detail;
        this.#emitInput();
      });
      container.addEventListener("change", (e) => {
        if (e.target === this) return;
        e.stopPropagation();
        if (e.detail) this.#customData[modeName] = e.detail;
        this.#emitChange();
      });
    }
  }

  #switchTab(tabName, { emit = true } = {}) {
    // Only allow switching to modes that have a tab container in the dialog
    const tab = Array.from(
      this.#dialog?.querySelectorAll(".fig-fill-picker-tab") ?? [],
    ).find((candidate) => candidate.dataset.tab === tabName);
    if (!tab) return;

    const previousTab = this.#activeTab;
    this.#activeTab = tabName;
    this.#fillType = tabName;
    if (previousTab === "webcam" && tabName !== "webcam") {
      this.#stopWebcam();
    }

    // Update type select (only exists if not locked)
    const typeSelect = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeSelect && typeSelect.value !== tabName) {
      typeSelect.value = tabName;
    }

    // Show/hide tab content
    const tabContents = this.#dialog.querySelectorAll(".fig-fill-picker-tab");
    tabContents.forEach((content) => {
      if (content.dataset.tab === tabName) {
        content.style.display = "block";
      } else {
        content.style.display = "none";
      }
    });

    // Zero out content padding for custom mode tabs
    const contentEl = this.#dialog.querySelector("fig-content");
    if (contentEl) {
      contentEl.style.padding = this.#customSlots[tabName] ? "0" : "";
    }

    // Update tab-specific UI after visibility change
    if (tabName === "gradient") {
      // Use RAF to ensure layout is complete before refreshing gradient UI
      this.#scheduleFrame(() => {
        this.#updateGradientUI();
        const barInput = tab.querySelector(".fig-fill-picker-gradient-bar-input");
        barInput?.refreshLayout?.();
        this.#scheduleFrame(() => {
          barInput?.refreshLayout?.();
        });
      });
    }

    if (tabName === "video") this.#applyDefaultVideo();
    if (tabName === "webcam") {
      this.#webcam.live = this.#webcamMode() === "live";
      this.#webcamStart?.(this.#webcam.deviceId);
    }

    this.#updateSwatch();
    if (emit) this.#emitInput();
  }

  #refreshDialogUI() {
    if (!this.#dialog?.open) return;
    this.#switchTab(this.#fillType, { emit: false });

    this.#drawColorArea();
    this.#updateHandlePosition();
    this.#updateColorInputs();
    if (this.#hueSlider) this.#hueSlider.setAttribute("value", this.#color.h);
    if (this.#opacitySlider) {
      this.#opacitySlider.setAttribute("value", this.#color.a * 100);
      this.#opacitySlider.setAttribute("color", this.#hsvToHex(this.#color));
    }

    this.#updateGradientUI();

    const imageTab = this.#dialog.querySelector('[data-tab="image"]');
    const imageMode = imageTab?.querySelector(".fig-fill-picker-scale-mode");
    const imageScale = imageTab?.querySelector(".fig-fill-picker-scale");
    const imagePreview = imageTab?.querySelector(".fig-fill-picker-image-preview");
    if (imageMode) imageMode.value = this.#image.scaleMode;
    if (imageScale) {
      imageScale.setAttribute("value", this.#image.scale);
      imageScale.style.display =
        this.#image.scaleMode === "tile" ? "block" : "none";
    }
    if (imagePreview) this.#updateImagePreview(imagePreview);

    const videoTab = this.#dialog.querySelector('[data-tab="video"]');
    const videoMode = videoTab?.querySelector(".fig-fill-picker-scale-mode");
    const videoPreview = videoTab?.querySelector(".fig-fill-picker-video-preview");
    if (videoMode) videoMode.value = this.#video.scaleMode;
    if (videoPreview) this.#updateVideoPreviewStyle(videoPreview);
  }

  // ============ SOLID TAB ============
  #initSolidTab() {
    const container = this.#dialog.querySelector('[data-tab="solid"]');
    const showAlpha = this.getAttribute("alpha") !== "false";

    const canvas = figEditorCreateElement("canvas", {
      width: "200",
      height: "200",
    });
    const colorHandle = figEditorCreateElement("fig-handle", {
      "aria-label": "Color saturation and brightness",
      role: "slider",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      type: "color",
      color: this.#hsvToHex({ ...this.#color, a: 1 }),
      "data-no-color-picker": true,
      drag: true,
      "drag-surface": ".fig-fill-picker-color-area",
      "drag-axes": "x,y",
      "drag-snapping": "modifier",
    });
    const preview = figEditorCreateElement(
      "fig-preview",
      { className: "fig-fill-picker-color-area" },
      [canvas, colorHandle],
    );
    const eyedropperControl = figEditorCreateElement(
      "fig-tooltip",
      { text: "Sample color" },
      figEditorCreateElement(
        "fig-button",
        {
          icon: true,
          variant: "ghost",
          className: "fig-fill-picker-eyedropper",
          "aria-label": "Sample color",
        },
        figEditorCreateIcon("eyedropper"),
      ),
    );
    const sliders = figEditorCreateElement(
      "div",
      {
        className: `fig-fill-picker-sliders${showAlpha ? "" : " is-hue-only"}`,
      },
      [
        eyedropperControl,
        figEditorCreateElement("fig-slider", {
          type: "hue",
          variant: "classic",
          text: "false",
          min: "0",
          max: "360",
          "aria-label": "Hue",
          value: this.#color.h,
        }),
        showAlpha
          ? figEditorCreateElement("fig-slider", {
              type: "opacity",
              variant: "classic",
              text: "false",
              min: "0",
              max: "100",
              "aria-label": "Opacity",
              value: this.#color.a * 100,
              color: this.#hsvToHex(this.#color),
            })
          : null,
      ],
    );
    const formatOptions = figEditorCreateElement(
      "fig-select-options",
      {},
      [
        ["hex", "Hex"],
        ["rgb", "RGB"],
        ["css", "CSS"],
        ["hsl", "HSL"],
        ["hsb", "HSB"],
        ["lab", "LAB"],
        ["lch", "LCH"],
      ].map(([value, label]) =>
        figEditorCreateElement("fig-select-option", { value }, label),
      ),
    );
    const inputs = figEditorCreateElement(
      "fig-field",
      { className: "fig-fill-picker-inputs" },
      [
        figEditorCreateElement(
          "fig-select",
          {
            className: "fig-fill-picker-input-mode",
            label: "Color value format",
            value: this.#colorInputMode,
          },
          formatOptions,
        ),
        figEditorCreateElement("span", {
          className: "fig-fill-picker-input-fields",
        }),
      ],
    );
    container.replaceChildren(preview, sliders, inputs);

    // Setup color area
    this.#colorArea = container.querySelector("canvas");
    this.#colorAreaHandle = container.querySelector("fig-handle");
    this.#syncColorAreaA11y();
    this.#drawColorArea();
    this.#updateHandlePosition();
    this.#setupColorAreaEvents();

    // Setup hue slider
    this.#hueSlider = container.querySelector('fig-slider[type="hue"]');
    this.#hueSlider.addEventListener("input", (e) => {
      this.#color.h = parseFloat(e.target.value);
      this.#drawColorArea();
      this.#updateHandlePosition();
      this.#updateColorInputs();
      this.#emitInput();
    });
    this.#hueSlider.addEventListener("change", () => {
      this.#emitChange();
    });

    // Setup opacity slider
    if (showAlpha) {
      this.#opacitySlider = container.querySelector(
        'fig-slider[type="opacity"]',
      );
      this.#opacitySlider.addEventListener("input", (e) => {
        this.#color.a = parseFloat(e.target.value) / 100;
        this.#updateColorInputs();
        this.#emitInput();
      });
      this.#opacitySlider.addEventListener("change", () => {
        this.#emitChange();
      });
    }

    // Setup color input mode select
    const modeSelect = container.querySelector(".fig-fill-picker-input-mode");
    modeSelect.addEventListener("change", (e) => {
      const next =
        typeof e.detail === "string" ? e.detail : e.target?.value;
      if (!next) return;
      this.#colorInputMode = next;
      this.#rebuildColorInputFields();
    });

    // Build initial color input fields
    this.#rebuildColorInputFields();

    // Setup eyedropper
    const eyedropper = container.querySelector(".fig-fill-picker-eyedropper");
    if ("EyeDropper" in window) {
      eyedropper.addEventListener("click", async () => {
        try {
          const dropper = new EyeDropper();
          const result = await dropper.open();
          this.#color = { ...this.#hexToHSV(result.sRGBHex), a: this.#color.a };
          this.#drawColorArea();
          this.#updateHandlePosition();
          this.#updateColorInputs();
          this.#emitInput();
        } catch (e) {
          // User cancelled or error
        }
      });
    } else {
      eyedropper.setAttribute("disabled", "");
      eyedropper.title = "EyeDropper not supported in this browser";
    }
  }

  #onGamutChange() {
    // Recreate the solid canvas with the new color space
    const solidContainer = this.#dialog?.querySelector('[data-tab="solid"]');
    if (solidContainer) {
      const oldCanvas = solidContainer.querySelector("canvas");
      if (oldCanvas) {
        const newCanvas = document.createElement("canvas");
        newCanvas.width = oldCanvas.width;
        newCanvas.height = oldCanvas.height;
        oldCanvas.replaceWith(newCanvas);
        this.#colorArea = newCanvas;
        this.#setupColorAreaEvents();
      }
      this.#drawColorArea();
      this.#updateHandlePosition();
    }
    // Refresh gradient preview if gradient tab exists
    this.#updateGradientPreview();
    this.#emitInput();
  }

  #drawColorArea() {
    // Refresh canvas reference in case DOM changed
    if (!this.#colorArea && this.#dialog) {
      this.#colorArea = this.#dialog.querySelector('[data-tab="solid"] canvas');
    }
    if (!this.#colorArea) return;

    const colorSpace = this.#gamut === "display-p3" ? "display-p3" : "srgb";
    const ctx = this.#colorArea.getContext("2d", { colorSpace });
    if (!ctx) return;

    const width = this.#colorArea.width;
    const height = this.#colorArea.height;

    ctx.clearRect(0, 0, width, height);

    const hue = this.#color.h;
    const isP3 = this.#gamut === "display-p3";

    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    if (isP3) {
      gradH.addColorStop(0, "color(display-p3 1 1 1)");
      const [r, g, b] = hslToP3(hue, 100, 50);
      gradH.addColorStop(1, `color(display-p3 ${r} ${g} ${b})`);
    } else {
      gradH.addColorStop(0, "#FFFFFF");
      gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    }

    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "rgba(0,0,0,1)");

    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }

  #updateHandlePosition(retryCount = 0) {
    if (!this.#colorAreaHandle || !this.#colorArea) return;
    this.#syncColorAreaA11y();

    const rect = this.#colorArea.getBoundingClientRect();

    // If the canvas isn't visible yet (0 dimensions), schedule a retry (max 5 attempts)
    if ((rect.width === 0 || rect.height === 0) && retryCount < 5) {
      this.#scheduleFrame(() => this.#updateHandlePosition(retryCount + 1));
      return;
    }

    const xPct = Math.max(0, Math.min(100, this.#color.s));
    const yPct = Math.max(0, Math.min(100, 100 - this.#color.v));

    this.#colorAreaHandle.setAttribute("value", `${xPct}% ${yPct}%`);
    this.#colorAreaHandle.setAttribute(
      "color",
      this.#hsvToHex({ ...this.#color, a: 1 }),
    );
  }

  #syncColorAreaA11y() {
    if (!this.#colorAreaHandle) return;
    this.#colorAreaHandle.setAttribute(
      "aria-valuenow",
      String(Math.round(this.#color.v)),
    );
    this.#colorAreaHandle.setAttribute(
      "aria-valuetext",
      `Saturation ${Math.round(this.#color.s)}%, brightness ${Math.round(this.#color.v)}%`,
    );
    this.#colorAreaHandle.removeAttribute("aria-pressed");
  }

  #updateColorFromAreaPosition(x, y, opts = {}) {
    const { updateHandle = true, emitInput = true, emitChange = false } = opts;
    this.#color.s = Math.max(0, Math.min(100, x * 100));
    this.#color.v = Math.max(0, Math.min(100, (1 - y) * 100));
    if (this.#colorAreaHandle) {
      this.#colorAreaHandle.setAttribute(
        "color",
        this.#hsvToHex({ ...this.#color, a: 1 }),
      );
      this.#syncColorAreaA11y();
    }
    if (updateHandle) this.#updateHandlePosition();
    this.#updateColorInputs();
    if (emitInput) this.#emitInput();
    if (emitChange) this.#emitChange();
  }

  #setupColorAreaEvents() {
    if (this.#teardownColorAreaEvents) {
      this.#teardownColorAreaEvents();
      this.#teardownColorAreaEvents = null;
    }
    if (!this.#colorArea || !this.#colorAreaHandle) return;

    const colorAreaEl = this.#colorArea.parentElement || this.#colorArea;
    const colorAreaHandleEl = this.#colorAreaHandle;

    let isPlaneDragging = false;

    const updatePlaneFromEvent = (e, opts = {}) => {
      const rect = colorAreaEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      this.#updateColorFromAreaPosition(x / rect.width, y / rect.height, opts);
    };

    const onPlanePointerDown = (e) => {
      if (e.button !== 0) return;
      if (
        e.target === colorAreaHandleEl ||
        colorAreaHandleEl.contains(e.target)
      )
        return;
      isPlaneDragging = true;
      this.#isDraggingColor = true;
      colorAreaEl.setPointerCapture(e.pointerId);
      updatePlaneFromEvent(e, { updateHandle: true, emitInput: true });
    };

    const onPlanePointerMove = (e) => {
      if (!isPlaneDragging) return;
      if (e.buttons === 0) {
        onPlaneDragEnd();
        return;
      }
      updatePlaneFromEvent(e, { updateHandle: true, emitInput: true });
    };

    const onPlaneDragEnd = () => {
      if (!isPlaneDragging) return;
      isPlaneDragging = false;
      this.#isDraggingColor = false;
      this.#emitChange();
    };

    const onHandleInput = (e) => {
      this.#isDraggingColor = true;
      const px = e.detail?.px;
      const py = e.detail?.py;
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      colorAreaHandleEl.setAttribute("value", `${px * 100}% ${py * 100}%`);
      this.#updateColorFromAreaPosition(px, py, {
        updateHandle: false,
        emitInput: true,
      });
    };

    const onHandleChange = (e) => {
      const px = e.detail?.px;
      const py = e.detail?.py;
      if (Number.isFinite(px) && Number.isFinite(py)) {
        colorAreaHandleEl.setAttribute("value", `${px * 100}% ${py * 100}%`);
        this.#updateColorFromAreaPosition(px, py, {
          updateHandle: false,
          emitInput: false,
        });
      }
      this.#isDraggingColor = false;
      this.#emitChange();
    };

    colorAreaEl.addEventListener("pointerdown", onPlanePointerDown);
    colorAreaEl.addEventListener("pointermove", onPlanePointerMove);
    colorAreaEl.addEventListener("pointerup", onPlaneDragEnd);
    colorAreaEl.addEventListener("pointercancel", onPlaneDragEnd);
    colorAreaEl.addEventListener("lostpointercapture", onPlaneDragEnd);

    colorAreaHandleEl.addEventListener("input", onHandleInput);
    colorAreaHandleEl.addEventListener("change", onHandleChange);

    this.#teardownColorAreaEvents = () => {
      colorAreaEl.removeEventListener("pointerdown", onPlanePointerDown);
      colorAreaEl.removeEventListener("pointermove", onPlanePointerMove);
      colorAreaEl.removeEventListener("pointerup", onPlaneDragEnd);
      colorAreaEl.removeEventListener("pointercancel", onPlaneDragEnd);
      colorAreaEl.removeEventListener("lostpointercapture", onPlaneDragEnd);

      colorAreaHandleEl.removeEventListener("input", onHandleInput);
      colorAreaHandleEl.removeEventListener("change", onHandleChange);
      this.#isDraggingColor = false;
    };
  }

  #rebuildColorInputFields() {
    const container = this.#dialog?.querySelector(
      ".fig-fill-picker-input-fields",
    );
    if (!container) return;

    const wrap = (tooltip, child) =>
      figEditorCreateElement("fig-tooltip", { text: tooltip }, child);

    const num = (cls, label, min, max, step, units) =>
      figEditorCreateElement("fig-input-number", {
        className: cls,
        "aria-label": label,
        min,
        max,
        step,
        units,
      });

    const showAlpha = this.getAttribute("alpha") !== "false";
    const alphaField = () =>
      showAlpha
        ? wrap(
            "Alpha",
            num("fig-fill-picker-ci-a", "Alpha", 0, 100, 0.1, "%"),
          )
        : null;
    const combo = (children, extraClass = "") =>
      figEditorCreateElement(
        "div",
        {
          className: ["input-combo", extraClass].filter(Boolean).join(" "),
        },
        children,
      );

    let content;
    switch (this.#colorInputMode) {
      case "rgb":
        content = combo([
          wrap("Red", num("fig-fill-picker-ci-r", "Red", 0, 255)),
          wrap("Green", num("fig-fill-picker-ci-g", "Green", 0, 255)),
          wrap("Blue", num("fig-fill-picker-ci-b", "Blue", 0, 255)),
          alphaField(),
        ]);
        break;
      case "hsl":
        content = combo([
          wrap("Hue", num("fig-fill-picker-ci-h", "Hue", 0, 360)),
          wrap(
            "Saturation",
            num("fig-fill-picker-ci-s", "Saturation", 0, 100),
          ),
          wrap(
            "Lightness",
            num("fig-fill-picker-ci-l", "Lightness", 0, 100),
          ),
          alphaField(),
        ]);
        break;
      case "hsb":
        content = combo([
          wrap("Hue", num("fig-fill-picker-ci-h", "Hue", 0, 360)),
          wrap(
            "Saturation",
            num("fig-fill-picker-ci-s", "Saturation", 0, 100),
          ),
          wrap(
            "Brightness",
            num("fig-fill-picker-ci-v", "Brightness", 0, 100),
          ),
          alphaField(),
        ]);
        break;
      case "lab":
        content = combo([
          wrap(
            "Lightness",
            num("fig-fill-picker-ci-okl", "Lightness", 0, 100),
          ),
          wrap(
            "Green-Red axis",
            num(
              "fig-fill-picker-ci-oka",
              "Green-Red axis",
              -0.4,
              0.4,
              0.001,
            ),
          ),
          wrap(
            "Blue-Yellow axis",
            num(
              "fig-fill-picker-ci-okb",
              "Blue-Yellow axis",
              -0.4,
              0.4,
              0.001,
            ),
          ),
          alphaField(),
        ]);
        break;
      case "lch":
        content = combo([
          wrap(
            "Lightness",
            num("fig-fill-picker-ci-okl", "Lightness", 0, 100),
          ),
          wrap(
            "Chroma",
            num("fig-fill-picker-ci-okc", "Chroma", 0, 0.4, 0.001),
          ),
          wrap("Hue", num("fig-fill-picker-ci-okh", "Hue", 0, 360)),
          alphaField(),
        ]);
        break;
      case "css":
        content = figEditorCreateElement("fig-input-text", {
          className: "fig-fill-picker-ci-css",
          "aria-label": "CSS color",
          placeholder: "rgba(0, 0, 0, 1)",
        });
        break;
      default: // hex
        {
          const hexInput = figEditorCreateElement("fig-input-text", {
            className: "fig-fill-picker-ci-hex",
            "aria-label": "Hex color",
            placeholder: "FFFFFF",
          });
          content = showAlpha
            ? combo([hexInput, alphaField()], "fig-fill-picker-ci-hex-row")
            : hexInput;
        }
        break;
    }

    container.replaceChildren(content);
    this.#wireColorInputEvents();
    this.#scheduleFrame(() => this.#updateColorInputs());
  }

  #wireColorInputEvents() {
    const container = this.#dialog?.querySelector(
      ".fig-fill-picker-input-fields",
    );
    if (!container) return;

    const onInput = () => {
      if (this.#isDraggingColor) return;
      const color = this.#readColorFromInputs();
      if (!color) return;
      const nextAlpha = Number.isFinite(color.a) ? color.a : this.#color.a;
      this.#color = { ...color, a: nextAlpha };
      this.#drawColorArea();
      this.#updateHandlePosition();
      if (this.#hueSlider) {
        this.#hueSlider.setAttribute("value", this.#color.h);
      }
      if (this.#opacitySlider && Number.isFinite(color.a)) {
        this.#opacitySlider.setAttribute("value", this.#color.a * 100);
      }
      this.#emitInput();
    };

    const onChange = () => this.#emitChange();

    const inputs = container.querySelectorAll(
      "fig-input-number, fig-input-text",
    );
    inputs.forEach((el) => {
      el.addEventListener("input", onInput);
      el.addEventListener("change", onChange);
    });
  }

  #readAlphaFromInput() {
    const el = this.#dialog?.querySelector(".fig-fill-picker-ci-a");
    if (!el) return undefined;
    const pct = parseFloat(el.value);
    if (!Number.isFinite(pct)) return undefined;
    return Math.max(0, Math.min(1, pct / 100));
  }

  #readColorFromInputs() {
    const q = (cls) => this.#dialog?.querySelector(`.${cls}`);
    const val = (cls) => parseFloat(q(cls)?.value ?? 0);
    const withAlpha = (color) => {
      if (!color) return null;
      const a = this.#readAlphaFromInput();
      return { ...color, a: a ?? color.a ?? this.#color.a };
    };

    switch (this.#colorInputMode) {
      case "rgb":
        return withAlpha(
          this.#rgbToHSV({
            r: val("fig-fill-picker-ci-r"),
            g: val("fig-fill-picker-ci-g"),
            b: val("fig-fill-picker-ci-b"),
          }),
        );
      case "hsl": {
        const rgb = this.#hslToRGB({
          h: val("fig-fill-picker-ci-h"),
          s: val("fig-fill-picker-ci-s"),
          l: val("fig-fill-picker-ci-l"),
        });
        return withAlpha(this.#rgbToHSV(rgb));
      }
      case "hsb":
        return withAlpha({
          h: val("fig-fill-picker-ci-h"),
          s: val("fig-fill-picker-ci-s"),
          v: val("fig-fill-picker-ci-v"),
        });
      case "lab": {
        const rgb = this.#oklabToRGB({
          l: val("fig-fill-picker-ci-okl") / 100,
          a: val("fig-fill-picker-ci-oka"),
          b: val("fig-fill-picker-ci-okb"),
        });
        return withAlpha(this.#rgbToHSV(rgb));
      }
      case "lch": {
        const rgb = this.#oklchToRGB({
          l: val("fig-fill-picker-ci-okl") / 100,
          c: val("fig-fill-picker-ci-okc"),
          h: val("fig-fill-picker-ci-okh"),
        });
        return withAlpha(this.#rgbToHSV(rgb));
      }
      case "css": {
        const cssEl = q("fig-fill-picker-ci-css");
        if (!cssEl) return null;
        return this.#parseCssColor(cssEl.value);
      }
      default: {
        // hex
        const hexEl = q("fig-fill-picker-ci-hex");
        if (!hexEl) return null;
        let hex = hexEl.value.replace(/^#/, "");
        if (hex.length === 3)
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length === 8) {
          const alpha = parseInt(hex.slice(6, 8), 16) / 255;
          hex = hex.slice(0, 6);
          if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
          return { ...this.#hexToHSV(`#${hex}`), a: alpha };
        }
        if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return withAlpha(this.#hexToHSV(`#${hex}`));
      }
    }
  }

  #updateColorInputs() {
    if (!this.#dialog) return;

    const hex = this.#hsvToHex(this.#color);
    const rgb = this.#hsvToRGB(this.#color);
    const q = (cls) => this.#dialog.querySelector(`.${cls}`);
    const set = (cls, v) => {
      const el = q(cls);
      if (el) el.setAttribute("value", v);
    };

    switch (this.#colorInputMode) {
      case "rgb":
        set("fig-fill-picker-ci-r", rgb.r);
        set("fig-fill-picker-ci-g", rgb.g);
        set("fig-fill-picker-ci-b", rgb.b);
        break;
      case "hsl": {
        const hsl = this.#rgbToHSL(rgb);
        set("fig-fill-picker-ci-h", Math.round(hsl.h));
        set("fig-fill-picker-ci-s", Math.round(hsl.s));
        set("fig-fill-picker-ci-l", Math.round(hsl.l));
        break;
      }
      case "hsb":
        set("fig-fill-picker-ci-h", Math.round(this.#color.h));
        set("fig-fill-picker-ci-s", Math.round(this.#color.s));
        set("fig-fill-picker-ci-v", Math.round(this.#color.v));
        break;
      case "lab": {
        const lab = this.#rgbToOKLAB(rgb);
        set("fig-fill-picker-ci-okl", Math.round(lab.l * 100));
        set("fig-fill-picker-ci-oka", +lab.a.toFixed(3));
        set("fig-fill-picker-ci-okb", +lab.b.toFixed(3));
        break;
      }
      case "lch": {
        const lch = this.#rgbToOKLCH(rgb);
        set("fig-fill-picker-ci-okl", Math.round(lch.l * 100));
        set("fig-fill-picker-ci-okc", +lch.c.toFixed(3));
        set("fig-fill-picker-ci-okh", Math.round(lch.h));
        break;
      }
      case "css":
        set("fig-fill-picker-ci-css", this.#formatCssColor(this.#color));
        break;
      default: // hex
        set("fig-fill-picker-ci-hex", hex.replace(/^#/, "").toUpperCase());
        break;
    }

    if (this.#colorInputMode !== "css") {
      const alphaPct = Math.round(this.#color.a * 1000) / 10;
      set(
        "fig-fill-picker-ci-a",
        Number.isInteger(alphaPct) ? alphaPct : +alphaPct.toFixed(1),
      );
    }

    if (this.#opacitySlider) {
      this.#opacitySlider.setAttribute("color", hex);
    }

    this.#updateSwatch();
  }

  // ============ GRADIENT TAB ============
  #initGradientTab() {
    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    const gradientType = figEditorCreateElement(
      "fig-select",
      {
        className: "fig-fill-picker-gradient-type",
        label: "Gradient type",
        value: this.#gradient.type,
      },
      figEditorCreateElement(
        "fig-select-options",
        {},
        [
          ["linear", "Linear"],
          ["radial", "Radial"],
          ["angular", "Angular"],
        ].map(([value, label]) =>
          figEditorCreateElement("fig-select-option", { value }, label),
        ),
      ),
    );
    const createAction = (text, className, iconName) =>
      figEditorCreateElement(
        "fig-tooltip",
        { text },
        figEditorCreateElement(
          "fig-button",
          {
            icon: true,
            variant: "ghost",
            className,
            "aria-label": text,
          },
          figEditorCreateIcon(iconName),
        ),
      );
    const actions = figEditorCreateElement(
      "div",
      { className: "fig-fill-picker-gradient-actions" },
      [
        createAction(
          "Flip gradient",
          "fig-fill-picker-gradient-flip",
          "swap",
        ),
        createAction(
          "Rotate gradient",
          "fig-fill-picker-gradient-rotate",
          "rotate",
        ),
      ],
    );
    const header = figEditorCreateElement(
      "fig-field",
      { className: "fig-fill-picker-gradient-header" },
      [gradientType, actions],
    );
    const gradientBar = figEditorCreateElement("fig-input-gradient", {
      className: "fig-fill-picker-gradient-bar-input",
      "aria-label": "Gradient stops",
      edit: "true",
      mode: "tip",
      size: "large",
      value: JSON.stringify({
        type: "gradient",
        gradient: gradientToValueShape(this.#gradient),
      }),
    });
    const preview = figEditorCreateElement(
      "fig-preview",
      { className: "fig-fill-picker-gradient-preview" },
      gradientBar,
    );
    const addButton = figEditorCreateElement(
      "fig-button",
      {
        icon: true,
        variant: "ghost",
        className: "fig-fill-picker-gradient-add",
        "aria-label": "Add gradient stop",
        title: "Add stop",
      },
      figEditorCreateIcon("add"),
    );
    const stops = figEditorCreateElement(
      "div",
      { className: "fig-fill-picker-gradient-stops" },
      [
        figEditorCreateElement(
          "fig-header",
          {
            className: "fig-fill-picker-gradient-stops-header",
            borderless: true,
          },
          [figEditorCreateElement("span", {}, "Stops"), addButton],
        ),
        figEditorCreateElement(
          "div",
          { className: "fig-fill-picker-gradient-stops-list" },
          document.createElement("fig-reorder"),
        ),
      ],
    );
    container.replaceChildren(header, preview, stops);

    this.#updateGradientUI();
    this.#setupGradientEvents(container);
  }

  #createGradientInterpolationOptions() {
    const createOption = ({ value, title, subtitle, advanced = false }) =>
      figEditorCreateElement(
        "fig-select-option",
        {
          value,
          label: `${title} — ${subtitle}`,
          className: advanced
            ? "fig-fill-picker-gradient-interpolation-advanced"
            : null,
        },
        [
          figEditorCreateElement("fig-interpolation-swatch", {
            slot: "prepend",
            size: "large",
            "aria-hidden": "true",
          }),
          figEditorCreateElement(
            "span",
            { className: "fig-fill-picker-gradient-interpolation-label" },
            [
              figEditorCreateElement(
                "span",
                { className: "fig-fill-picker-gradient-interpolation-title" },
                title,
              ),
              figEditorCreateElement(
                "span",
                { className: "fig-fill-picker-gradient-interpolation-subtitle" },
                subtitle,
              ),
            ],
          ),
        ],
      );

    const separator = figEditorCreateElement("fig-separator", {
      className: "fig-fill-picker-gradient-interpolation-advanced",
    });

    const modes = FigFillPicker.#GRADIENT_INTERPOLATION_MODES;
    return [
      ...modes.filter((mode) => !mode.advanced).map(createOption),
      separator,
      ...modes.filter((mode) => mode.advanced).map(createOption),
    ];
  }

  #setupGradientEvents(container) {
    const getSelectValue = (event) =>
      typeof event.detail === "string" ? event.detail : event.target?.value;
    const gradientBarInput = container.querySelector(
      ".fig-fill-picker-gradient-bar-input",
    );
    const setGradientBarPreview = (gradient) => {
      if (!gradientBarInput) return;
      this.#syncingGradientBar = true;
      try {
        gradientBarInput.setAttribute(
          "value",
          JSON.stringify({
            type: "gradient",
            gradient: gradientToValueShape(gradient),
          }),
        );
      } finally {
        this.#syncingGradientBar = false;
      }
    };
    const restoreGradientBarPreview = () => {
      setGradientBarPreview(this.#gradient);
    };

    const typeSelect = container.querySelector(".fig-fill-picker-gradient-type");
    typeSelect?.addEventListener("change", (e) => {
      const next = getSelectValue(e);
      if (!next) return;
      this.#gradient.type = next;
      this.#updateGradientUI();
      this.#emitInput();
    });

    const interpolationSelect = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    const interpolationPanel = interpolationSelect?.querySelector(
      "fig-select-options",
    );
    // Collapsed list clips the advanced options so fig-select-options' own
    // overflow chevron is the "show all" affordance; clicking it expands.
    const COLLAPSED_CLASS = "fig-fill-picker-gradient-interpolation-collapsed";
    const firstAdvancedOption = interpolationPanel?.querySelector(
      ".fig-fill-picker-gradient-interpolation-advanced",
    );
    const isInterpolationCollapsed = () =>
      Boolean(interpolationPanel?.classList.contains(COLLAPSED_CLASS));
    const setOverflowChevronLabel = (collapsed) => {
      interpolationPanel
        ?.querySelector(".fig-overflow-end")
        ?.setAttribute(
          "aria-label",
          collapsed ? "Show all color interpolation options" : "Scroll down",
        );
    };
    const expandInterpolationOptions = () => {
      if (!interpolationPanel) return;
      interpolationPanel.classList.remove(COLLAPSED_CLASS);
      interpolationPanel.style.removeProperty("max-height");
      setOverflowChevronLabel(false);
      interpolationPanel.syncOverflow?.();
    };
    const collapseInterpolationOptions = () => {
      if (!interpolationPanel || !firstAdvancedOption) return;
      interpolationPanel.style.removeProperty("max-height");
      interpolationPanel.classList.add(COLLAPSED_CLASS);
      interpolationPanel.scrollTop = 0;
      const panelTop = interpolationPanel.getBoundingClientRect().top;
      const advancedTop = firstAdvancedOption.getBoundingClientRect().top;
      const chevronHeight =
        interpolationPanel.querySelector(".fig-overflow-end")?.offsetHeight || 0;
      const visibleHeight = advancedTop - panelTop;
      if (visibleHeight > 0) {
        interpolationPanel.style.maxHeight = `${Math.round(visibleHeight + chevronHeight)}px`;
      }
      setOverflowChevronLabel(true);
      interpolationPanel.syncOverflow?.();
    };
    const isAdvancedInterpolationValue = (value) =>
      Boolean(
        interpolationPanel?.querySelector(
          `fig-select-option.fig-fill-picker-gradient-interpolation-advanced[value="${value}"]`,
        ),
      );
    const syncInterpolationCollapse = () => {
      if (
        isAdvancedInterpolationValue(
          gradientInterpolationSelectValue(this.#gradient),
        )
      ) {
        expandInterpolationOptions();
      } else {
        collapseInterpolationOptions();
      }
    };
    interpolationPanel?.addEventListener(
      "click",
      (event) => {
        if (!isInterpolationCollapsed()) return;
        if (!event.target?.closest?.(".fig-overflow-end")) return;
        event.preventDefault();
        event.stopPropagation();
        expandInterpolationOptions();
      },
      true,
    );
    // Arrow-key focus lands on a clipped option — reveal the rest instead.
    interpolationPanel?.addEventListener("focusin", (event) => {
      if (!isInterpolationCollapsed()) return;
      if (
        event.target?.closest?.(
          ".fig-fill-picker-gradient-interpolation-advanced",
        )
      ) {
        expandInterpolationOptions();
      }
    });
    // Menu alignment nudges the scroller; collapsed list must stay at the top.
    interpolationPanel?.addEventListener("scroll", () => {
      if (isInterpolationCollapsed() && interpolationPanel.scrollTop !== 0) {
        interpolationPanel.scrollTop = 0;
      }
    });
    interpolationSelect
      ?.querySelectorAll("fig-select-option")
      .forEach((option) => {
        const previewOption = () => {
          const parsed = parseGradientInterpolationSelectValue(
            option.getAttribute("value") || "srgb",
          );
          setGradientBarPreview(
            normalizeGradientConfig({
              ...this.#gradient,
              ...parsed,
            }),
          );
        };
        option.addEventListener("pointerenter", previewOption);
        option.addEventListener("pointerleave", () => {
          if (document.activeElement !== option) restoreGradientBarPreview();
        });
        option.addEventListener("focus", previewOption);
        option.addEventListener("blur", () => {
          if (!option.matches(":hover")) restoreGradientBarPreview();
        });
      });
    this.#gradientInterpolationOpenObserver?.disconnect();
    if (interpolationSelect) {
      this.#gradientInterpolationOpenObserver = new MutationObserver(() => {
        if (!interpolationSelect.hasAttribute("open")) {
          restoreGradientBarPreview();
        } else {
          this.#scheduleFrame(syncInterpolationCollapse);
        }
      });
      this.#gradientInterpolationOpenObserver.observe(interpolationSelect, {
        attributes: true,
        attributeFilter: ["open"],
      });
    }
    const interpolationModes = container.querySelector(
      ".fig-fill-picker-gradient-interpolation-modes",
    );
    interpolationModes?.addEventListener("change", (e) => {
      const val = typeof e.detail === "string" ? e.detail : e.target?.value;
      if (!val) return;
      const parsed = parseGradientInterpolationSelectValue(val);
      this.#gradient = normalizeGradientConfig({
        ...this.#gradient,
        ...parsed,
      });
      this.#updateGradientUI();
      this.#emitInput();
    });
    interpolationModes?.querySelectorAll("fig-segment").forEach((segment) => {
      const previewSegment = () => {
        setGradientBarPreview(
          normalizeGradientConfig({
            ...this.#gradient,
            ...parseGradientInterpolationSelectValue(
              segment.getAttribute("value") || "srgb",
            ),
          }),
        );
      };
      segment.addEventListener("pointerenter", previewSegment);
      segment.addEventListener("pointerleave", restoreGradientBarPreview);
    });
    interpolationSelect?.addEventListener("change", (e) => {
      const val = getSelectValue(e);
      if (!val) return;
      const parsed = parseGradientInterpolationSelectValue(val);
      this.#gradient = normalizeGradientConfig({
        ...this.#gradient,
        ...parsed,
      });
      this.#updateGradientUI();
      this.#emitInput();
    });

    // Rotate 90° clockwise
    container
      .querySelector(".fig-fill-picker-gradient-rotate")
      ?.addEventListener("click", () => {
        this.#gradient.angle = (Number(this.#gradient.angle) + 90) % 360;
        this.#updateGradientUI();
        this.#emitInput();
      });

    // Flip button
    container
      .querySelector(".fig-fill-picker-gradient-flip")
      .addEventListener("click", () => {
        this.#gradient.stops.forEach((stop) => {
          stop.position = 100 - stop.position;
        });
        this.#gradient.stops.sort((a, b) => a.position - b.position);
        this.#updateGradientUI();
        this.#emitInput();
      });

    // Add stop button
    container
      .querySelector(".fig-fill-picker-gradient-add")
      .addEventListener("click", () => {
        const midPosition = 50;
        this.#gradient.stops.push({
          position: midPosition,
          color: "#888888",
          opacity: 100,
        });
        this.#gradient.stops.sort((a, b) => a.position - b.position);
        this.#updateGradientUI();
        this.#emitInput();
      });

    // Embedded gradient bar input
    if (gradientBarInput) {
      const syncFromBarInput = (e) => {
        e.stopPropagation();
        if (this.#syncingGradientBar) return;
        const detail = e.detail;
        if (!detail?.gradient) return;
        this.#gradient = lockFillPickerGradientInterpolation({
          ...this.#gradient,
          ...detail.gradient,
        });
        this.#updateSwatch();
        this.#updateGradientInterpolationSwatches();
        this.#updateGradientStopsList();
      };
      gradientBarInput.addEventListener("input", (e) => {
        syncFromBarInput(e);
        this.#emitInput();
      });
      gradientBarInput.addEventListener("change", (e) => {
        syncFromBarInput(e);
        this.#emitChange();
      });
    }

    const stopsReorder = container.querySelector(
      ".fig-fill-picker-gradient-stops-list > fig-reorder",
    );
    stopsReorder?.addEventListener("reorder", (event) => {
      this.#handleGradientStopsReorder(event);
    });
  }

  #formatStopColorValue(stop) {
    const hex = String(stop.color || "#888888")
      .replace(/^#/, "")
      .slice(0, 6);
    const opacity = stop.opacity ?? 100;
    if (opacity >= 100) return `#${hex}`;
    const alpha = Math.round((opacity / 100) * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${hex}${alpha}`;
  }

  #readGradientStopColor(colorInput) {
    if (!(colorInput instanceof HTMLElement)) return "#888888";

    if (colorInput.hexOpaque) {
      return this.#normalizeStopHex(colorInput.hexOpaque);
    }

    const liveValue = colorInput.value;
    if (typeof liveValue === "string" && liveValue.startsWith("#")) {
      return this.#normalizeStopHex(
        liveValue.length > 7 ? liveValue.slice(0, 7) : liveValue,
      );
    }

    const textInput = colorInput.querySelector(
      'fig-input-text:not([type="number"])',
    );
    const textHex = String(
      textInput?.value ?? textInput?.getAttribute("value") ?? "",
    )
      .replace(/#/g, "")
      .slice(0, 6);
    if (/^[0-9A-Fa-f]{6}$/.test(textHex)) {
      return `#${textHex.toUpperCase()}`;
    }

    const attr = colorInput.getAttribute("value");
    if (typeof attr === "string" && attr.startsWith("#")) {
      return this.#normalizeStopHex(
        attr.length > 7 ? attr.slice(0, 7) : attr,
      );
    }

    return "#888888";
  }

  #normalizeStopHex(color) {
    const hex = String(color || "#888888")
      .replace(/^#/, "")
      .slice(0, 6);
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return "#888888";
    return `#${hex.toUpperCase()}`;
  }

  #readGradientStopFromRow(row) {
    const posInput = row.querySelector(".fig-fill-picker-stop-position");
    const colorInput = row.querySelector(".fig-fill-picker-stop-color");

    const position =
      parseFloat(posInput?.value ?? posInput?.getAttribute("value") ?? "0") ||
      0;

    const color = this.#readGradientStopColor(colorInput);
    let opacity = 100;

    if (colorInput instanceof HTMLElement && colorInput.rgba?.a !== undefined) {
      opacity = Math.round(colorInput.rgba.a * 100);
    } else {
      const oldIndex = parseInt(row.dataset.index, 10);
      if (!isNaN(oldIndex) && this.#gradient.stops[oldIndex]) {
        opacity = this.#gradient.stops[oldIndex].opacity ?? 100;
      }
    }

    return { position, color, opacity };
  }

  #syncGradientStopRow(row) {
    const index = parseInt(row.dataset.index, 10);
    if (isNaN(index) || index < 0 || index >= this.#gradient.stops.length) {
      return;
    }
    const stop = {
      ...this.#gradient.stops[index],
      ...this.#readGradientStopFromRow(row),
    };
    this.#gradient.stops[index] = stop;
    // Persist to the input value attributes so that reordering (which detaches
    // and re-attaches the row's DOM nodes) doesn't reset them to stale markup.
    this.#persistGradientStopRowAttrs(row, stop);
  }

  #persistGradientStopRowAttrs(row, stop) {
    const posInput = row.querySelector(".fig-fill-picker-stop-position");
    if (posInput) posInput.setAttribute("value", String(stop.position));
    const colorInput = row.querySelector(".fig-fill-picker-stop-color");
    if (colorInput) {
      colorInput.setAttribute("value", this.#formatStopColorValue(stop));
    }
  }

  #handleGradientStopsReorder(event) {
    const { oldIndex, newIndex } = event.detail ?? {};
    if (
      oldIndex == null ||
      newIndex == null ||
      oldIndex === newIndex ||
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= this.#gradient.stops.length ||
      newIndex >= this.#gradient.stops.length
    ) {
      return;
    }

    const reorder = event.currentTarget;
    const rows = reorder.querySelectorAll(".fig-fill-picker-gradient-stop-row");

    // Rows still carry their pre-drag data-index; flush live inputs first.
    rows.forEach((row) => this.#syncGradientStopRow(row));

    const [stop] = this.#gradient.stops.splice(oldIndex, 1);
    this.#gradient.stops.splice(newIndex, 0, stop);

    rows.forEach((row, index) => {
      row.dataset.index = String(index);
    });

    this.#syncingGradientBar = true;
    try {
      this.#updateGradientInterpolationSwatches();
      this.#updateGradientPreview();
      this.#emitInput();
    } finally {
      this.#syncingGradientBar = false;
    }
  }

  #updateGradientUI() {
    if (!this.#dialog) return;

    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    if (!container) return;
    this.#gradient = lockFillPickerGradientInterpolation(this.#gradient);

    const interpolationValue = gradientInterpolationSelectValue(this.#gradient);
    const interpolationSelect = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    if (interpolationSelect) {
      interpolationSelect.value = interpolationValue;
    }
    const interpolationModes = container.querySelector(
      ".fig-fill-picker-gradient-interpolation-modes",
    );
    if (interpolationModes) {
      const mode = FigFillPicker.#gradientInterpolationMode(interpolationValue);
      // Menu-only variants retarget the segment for their color space.
      const segment =
        interpolationModes.querySelector(
          `fig-segment[value="${interpolationValue}"]`,
        ) ||
        interpolationModes.querySelector(`fig-segment[data-space="${mode.space}"]`);
      if (segment) {
        const label = `${mode.title} — ${mode.subtitle}`;
        segment.setAttribute("value", interpolationValue);
        segment.setAttribute("aria-label", label);
        const tip = segment.closest("fig-tooltip");
        if (tip) tip.setAttribute("text", label);
        interpolationModes.value = interpolationValue;
      }
    }

    this.#updateGradientInterpolationSwatches();
    this.#updateGradientPreview();
    this.#updateGradientStopsList();
  }

  #interpolationPreviewStops() {
    const stops = Array.isArray(this.#gradient.stops)
      ? [...this.#gradient.stops].sort(
          (a, b) => (a.position ?? 0) - (b.position ?? 0),
        )
      : [];
    if (stops.length < 2) {
      return [
        { color: "#FF0000", position: 0 },
        { color: "#4F9EFF", position: 100 },
      ];
    }
    return stops.map((stop) => ({
      color: String(stop.color || "#D9D9D9").replace(/^(#(?:[0-9a-f]{6})).*/i, "$1"),
      position: stop.position ?? 0,
    }));
  }

  #updateGradientInterpolationSwatches() {
    if (!this.#dialog) return;
    const stops = this.#interpolationPreviewStops();
    this.#dialog
      .querySelectorAll("fig-interpolation-swatch")
      .forEach((swatch) => {
        const optionVal =
          swatch
            .closest("fig-select-option, fig-segment")
            ?.getAttribute("value") || "srgb";
        const parsed = parseGradientInterpolationSelectValue(optionVal);
        const gradient = {
          type: "linear",
          stops,
          interpolationSpace: parsed.interpolationSpace,
        };
        if (GRADIENT_HUE_SPACES.has(parsed.interpolationSpace)) {
          gradient.hueInterpolation = parsed.hueInterpolation;
        }
        swatch.value = { type: "gradient", gradient };
      });
  }

  #updateGradientPreview() {
    if (!this.#dialog) return;

    const barInput = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-bar-input",
    );
    if (barInput) {
      this.#syncingGradientBar = true;
      barInput.setAttribute(
        "value",
        JSON.stringify({
          type: "gradient",
          gradient: gradientToValueShape(this.#gradient),
        }),
      );
      this.#syncingGradientBar = false;
    }

    this.#updateSwatch();
  }

  #updateGradientStopsList() {
    if (!this.#dialog) return;

    const list = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-stops-list",
    );
    const reorder = list?.querySelector("fig-reorder");
    if (!list || !reorder) return;

    const existingRows = reorder.querySelectorAll(
      ".fig-fill-picker-gradient-stop-row",
    );

    if (existingRows.length === this.#gradient.stops.length) {
      this.#gradient.stops.forEach((stop, index) => {
        const row = existingRows[index];
        row.dataset.index = index;
        const posInput = row.querySelector(".fig-fill-picker-stop-position");
        if (posInput) posInput.setAttribute("value", stop.position);
        const colorInput = row.querySelector(".fig-fill-picker-stop-color");
        if (colorInput) {
          colorInput.setAttribute("value", this.#formatStopColorValue(stop));
        }
        const removeBtn = row.querySelector(".fig-fill-picker-stop-remove");
        if (removeBtn) {
          if (this.#gradient.stops.length <= 2)
            removeBtn.setAttribute("disabled", "");
          else removeBtn.removeAttribute("disabled");
        }
      });
      return;
    }

    this.#rebuildGradientStopsList(list);
  }

  #rebuildGradientStopsList(list) {
    const reorder = list.querySelector("fig-reorder");
    if (!reorder) return;

    const rows = this.#gradient.stops.map((stop, index) =>
      figEditorCreateElement(
        "fig-field",
        {
          className: "fig-fill-picker-gradient-stop-row",
          "data-index": index,
        },
        [
          figEditorCreateElement("fig-input-number", {
            className: "fig-fill-picker-stop-position",
            "aria-label": "Gradient stop position",
            min: "0",
            max: "100",
            value: stop.position,
            units: "%",
          }),
          figEditorCreateElement("fig-input-color", {
            className: "fig-fill-picker-stop-color",
            "aria-label": "Gradient stop color",
            text: "true",
            alpha: "true",
            picker: "figma",
            "picker-dialog-position": "right",
            value: this.#formatStopColorValue(stop),
          }),
          figEditorCreateElement(
            "fig-button",
            {
              icon: true,
              variant: "ghost",
              className: "fig-fill-picker-stop-remove",
              disabled: this.#gradient.stops.length <= 2,
              "aria-label": "Remove gradient stop",
            },
            figEditorCreateIcon("minus"),
          ),
        ],
      ),
    );
    reorder.replaceChildren(...rows);

    reorder
      .querySelectorAll(".fig-fill-picker-gradient-stop-row")
      .forEach((row) => {
        row
          .querySelector(".fig-fill-picker-stop-position")
          .addEventListener("input", () => {
            this.#syncGradientStopRow(row);
            this.#updateGradientInterpolationSwatches();
            this.#updateGradientPreview();
            this.#emitInput();
          });

        const stopColor = row.querySelector(".fig-fill-picker-stop-color");
        const stopFillPicker = stopColor.querySelector("fig-fill-picker");
        if (stopFillPicker) {
          stopFillPicker.anchorElement = this.#dialog;
        } else {
          this.#scheduleFrame(() => {
            const fp = stopColor.querySelector("fig-fill-picker");
            if (fp) fp.anchorElement = this.#dialog;
          });
        }

        const syncStopColor = () => {
          this.#syncGradientStopRow(row);
          this.#syncingGradientBar = true;
          try {
            this.#updateGradientInterpolationSwatches();
            this.#updateGradientPreview();
            this.#emitInput();
          } finally {
            this.#syncingGradientBar = false;
          }
        };

        stopColor.addEventListener("input", syncStopColor);
        stopColor.addEventListener("change", syncStopColor);

        row
          .querySelector(".fig-fill-picker-stop-remove")
          .addEventListener("click", () => {
            const index = parseInt(row.dataset.index, 10);
            if (this.#gradient.stops.length > 2) {
              this.#gradient.stops.splice(index, 1);
              this.#updateGradientUI();
              this.#emitInput();
            }
          });
      });
  }

  #buildGradientCSS(interpolationSpaceOverride, includeInterpolation = true) {
    const gradient = normalizeGradientConfig({
      ...this.#gradient,
      interpolationSpace:
        interpolationSpaceOverride ?? this.#gradient.interpolationSpace,
    });
    const isP3 = this.#gamut === "display-p3";
    const stops = gradient.stops
      .map((s) => {
        const alpha = (s.opacity ?? 100) / 100;
        const color = isP3
          ? this.#hexToP3(s.color, alpha)
          : this.#hexToRGBA(s.color, alpha);
        return `${color} ${s.position}%`;
      })
      .join(", ");
    const interpolationClause = gradientInterpolationClause(gradient);
    const interpolation =
      includeInterpolation && interpolationClause ? ` ${interpolationClause}` : "";
    switch (gradient.type) {
      case "linear":
        return `linear-gradient(${gradient.angle}deg${interpolation}, ${stops})`;
      case "radial":
        return `radial-gradient(circle at ${gradient.centerX}% ${gradient.centerY}%${interpolation}, ${stops})`;
      case "angular":
        return `conic-gradient(from ${gradient.angle}deg${interpolation}, ${stops})`;
      default:
        return `linear-gradient(${gradient.angle}deg${interpolation}, ${stops})`;
    }
  }

  static #gradientSupportCache = new Map();
  #testGradientSupport(css) {
    const cached = FigFillPicker.#gradientSupportCache.get(css);
    if (cached !== undefined) return cached;
    const el = document.createElement("div");
    el.style.background = css;
    const result = !!el.style.background;
    FigFillPicker.#gradientSupportCache.set(css, result);
    return result;
  }

  #getGradientCSS() {
    const preferred = this.#buildGradientCSS(undefined, true);
    if (this.#testGradientSupport(preferred)) return preferred;

    const oklabFallback = this.#buildGradientCSS("oklab", true);
    if (this.#testGradientSupport(oklabFallback)) return oklabFallback;

    return this.#buildGradientCSS("oklab", false);
  }

  // ============ IMAGE TAB ============
  #initImageTab() {
    const container = this.#dialog.querySelector('[data-tab="image"]');

    const scaleMode = figEditorCreateElement(
      "fig-select",
      {
        className: "fig-fill-picker-scale-mode",
        label: "Image scale mode",
        value: this.#image.scaleMode,
      },
      figEditorCreateElement(
        "fig-select-options",
        {},
        [
          ["fill", "Fill"],
          ["fit", "Fit"],
          ["crop", "Crop"],
          ["tile", "Tile"],
        ].map(([value, label]) =>
          figEditorCreateElement("fig-select-option", { value }, label),
        ),
      ),
    );
    const scale = figEditorCreateElement("fig-input-number", {
      className: "fig-fill-picker-scale",
      "aria-label": "Image tile scale",
      min: "1",
      max: "200",
      value: this.#image.scale,
      units: "%",
    });
    if (this.#image.scaleMode !== "tile") scale.style.display = "none";
    const header = figEditorCreateElement(
      "fig-field",
      { className: "fig-fill-picker-media-header" },
      [scaleMode, scale],
    );
    const preview = figEditorCreateElement("fig-image", {
      className:
        "fig-fill-picker-media-preview fig-fill-picker-image-preview",
      upload: "true",
      label: "Upload from computer",
      alt: "Image fill preview",
      size: "auto",
      "aspect-ratio": "1/1",
      fit: "cover",
      checkerboard: "true",
    });
    container.replaceChildren(header, preview);

    this.#setupImageEvents(container);
  }

  #setupImageEvents(container) {
    const scaleModeSelect = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const scaleInput = container.querySelector(".fig-fill-picker-scale");
    const preview = container.querySelector(".fig-fill-picker-image-preview");

    scaleModeSelect.addEventListener("change", (e) => {
      const next =
        typeof e.detail === "string" ? e.detail : e.target?.value;
      if (!next) return;
      this.#image.scaleMode = next;
      scaleInput.style.display = next === "tile" ? "block" : "none";
      this.#updateImagePreview(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    scaleInput.addEventListener("input", (e) => {
      this.#image.scale = parseFloat(e.target.value) || 100;
      this.#updateImagePreview(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    preview.addEventListener("loaded", (e) => {
      const src = e.detail?.src || preview.src;
      if (!src) return;
      this.#image.url = src;
      this.#updateImagePreview(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    preview.addEventListener("change", () => {
      if (preview.src) return;
      this.#image.url = null;
      this.#updateImagePreview(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    this.#updateImagePreview(preview);
  }

  #updateImagePreview(element) {
    if (!this.#image.url) {
      element.removeAttribute("src");
      element.classList.remove("has-media", "is-tiled");
      element.style.backgroundImage = "";
      element.style.backgroundPosition = "";
      element.style.backgroundRepeat = "";
      element.style.backgroundSize = "";
      return;
    }

    element.setAttribute("src", this.#image.url);
    element.classList.add("has-media");
    element.style.backgroundImage = "";
    element.style.backgroundPosition = "";
    element.style.backgroundRepeat = "";
    element.style.backgroundSize = "";
    element.mediaEl?.style.removeProperty("opacity");

    const fileInput = element.querySelector("fig-input-file[data-generated]");
    if (fileInput) {
      fileInput.setAttribute("label", "Replace");
      fileInput.removeAttribute("url");
    }

    switch (this.#image.scaleMode) {
      case "fill":
        element.classList.remove("is-tiled");
        element.setAttribute("fit", "cover");
        break;
      case "crop":
        element.classList.remove("is-tiled");
        element.setAttribute("fit", "cover");
        break;
      case "fit":
        element.classList.remove("is-tiled");
        element.setAttribute("fit", "contain");
        break;
      case "tile":
        element.classList.add("is-tiled");
        element.setAttribute("fit", "none");
        element.style.backgroundImage = `url(${this.#image.url})`;
        element.style.backgroundPosition = "top left";
        element.style.backgroundSize = `${this.#image.scale}%`;
        element.style.backgroundRepeat = "repeat";
        if (element.mediaEl) element.mediaEl.style.opacity = "0";
        break;
    }
  }

  // For video elements (still uses object-fit)
  #updateVideoPreviewStyle(element) {
    if (element.tagName === "FIG-MEDIA") {
      if (!this.#video.url) {
        element.removeAttribute("src");
        element.classList.remove("has-media");
        return;
      }

      element.setAttribute("src", this.#video.url);
      if (this.#video.poster) {
        element.setAttribute("poster", this.#video.poster);
      } else {
        element.removeAttribute("poster");
      }
      element.classList.add("has-media");

      const fileInput = element.querySelector("fig-input-file[data-generated]");
      if (fileInput) {
        fileInput.setAttribute("label", "Replace");
        fileInput.removeAttribute("url");
      }

      switch (this.#video.scaleMode) {
        case "fill":
        case "crop":
          element.setAttribute("fit", "cover");
          break;
        case "fit":
          element.setAttribute("fit", "contain");
          break;
      }
      return;
    }

    element.style.objectPosition = "center";
    element.style.width = "100%";
    element.style.height = "100%";

    switch (this.#video.scaleMode) {
      case "fill":
      case "crop":
        element.style.objectFit = "cover";
        break;
      case "fit":
        element.style.objectFit = "contain";
        break;
    }
  }

  // ============ VIDEO TAB ============
  #initVideoTab() {
    const container = this.#dialog.querySelector('[data-tab="video"]');

    const scaleMode = figEditorCreateElement(
      "fig-select",
      {
        className: "fig-fill-picker-scale-mode",
        label: "Video scale mode",
        value: this.#video.scaleMode,
      },
      figEditorCreateElement(
        "fig-select-options",
        {},
        [
          ["fill", "Fill"],
          ["fit", "Fit"],
          ["crop", "Crop"],
        ].map(([value, label]) =>
          figEditorCreateElement("fig-select-option", { value }, label),
        ),
      ),
    );
    const header = figEditorCreateElement(
      "fig-field",
      { className: "fig-fill-picker-media-header" },
      scaleMode,
    );
    const preview = figEditorCreateElement("fig-media", {
      className:
        "fig-fill-picker-media-preview fig-fill-picker-video-preview",
      type: "video",
      upload: "true",
      label: "Upload from computer",
      "aria-label": "Video fill preview",
      size: "auto",
      "aspect-ratio": "1/1",
      fit: "cover",
      checkerboard: "true",
      autoplay: "true",
      controls: true,
      muted: "true",
      loop: "true",
    });
    container.replaceChildren(header, preview);

    this.#setupVideoEvents(container);
    this.#applyDefaultVideo();
  }

  #revokeVideoPoster() {
    if (this.#video.poster?.startsWith("blob:")) {
      URL.revokeObjectURL(this.#video.poster);
      this.#ownedBlobUrls.delete(this.#video.poster);
    }
    this.#video.poster = null;
  }

  #applyDefaultVideo({ emit = true } = {}) {
    if (this.#video.url) {
      this.#video.missing = false;
      if (!this.#video.poster) this.#captureVideoPoster(this.#video.url, { emit });
      return;
    }
    const fallback = this.getAttribute("default-video");
    if (!fallback) {
      this.#video.missing = true;
      return;
    }
    this.#video.url = fallback;
    this.#video.missing = false;
    const preview = this.#dialog?.querySelector(
      ".fig-fill-picker-video-preview",
    );
    if (preview) this.#updateVideoPreviewStyle(preview);
    this.#captureVideoPoster(fallback, { emit });
  }

  async #captureVideoPoster(src, { emit = true } = {}) {
    if (!src) return;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    try {
      await new Promise((resolve, reject) => {
        const fail = () => reject(new Error("video poster failed"));
        video.addEventListener("error", fail, { once: true });
        video.addEventListener("loadeddata", resolve, { once: true });
        video.src = src;
      });
      if (!video.videoWidth || !video.videoHeight) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (!blob) return;
      this.#revokeVideoPoster();
      this.#video.poster = URL.createObjectURL(blob);
      this.#ownedBlobUrls.add(this.#video.poster);
      this.#updateSwatch();
      if (emit) this.#emitInput();
    } catch {
      // Cross-origin or decode failures leave the swatch empty until a poster exists.
    }
  }

  #setupVideoEvents(container) {
    const scaleModeSelect = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const preview = container.querySelector(".fig-fill-picker-video-preview");

    scaleModeSelect.addEventListener("change", (e) => {
      const next =
        typeof e.detail === "string" ? e.detail : e.target?.value;
      if (!next) return;
      this.#video.scaleMode = next;
      this.#updateVideoPreviewStyle(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    preview.addEventListener("loaded", (e) => {
      const src = e.detail?.src || preview.src;
      if (!src) return;
      this.#video.url = src;
      this.#video.missing = false;
      this.#updateVideoPreviewStyle(preview);
      preview.play?.();
      this.#captureVideoPoster(src);
      this.#updateSwatch();
      this.#emitInput();
    });

    preview.addEventListener("change", () => {
      if (preview.src) return;
      this.#video.url = null;
      this.#revokeVideoPoster();
      this.#applyDefaultVideo();
      this.#updateVideoPreviewStyle(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    this.#updateVideoPreviewStyle(preview);
  }

  // ============ WEBCAM TAB ============
  #initWebcamTab() {
    const container = this.#dialog.querySelector('[data-tab="webcam"]');

    const cameraField = figEditorCreateElement(
      "fig-field",
      { className: "fig-fill-picker-webcam-camera" },
      figEditorCreateElement(
        "fig-select",
        {
          className: "fig-fill-picker-camera-select",
          label: "Camera",
          full: true,
        },
        document.createElement("fig-select-options"),
      ),
    );
    cameraField.style.display = "none";
    const video = figEditorCreateElement("video", {
      className: "fig-fill-picker-webcam-video",
      autoplay: true,
      muted: true,
      playsinline: true,
    });
    video.muted = true;
    const status = figEditorCreateElement(
      "div",
      {
        className: "fig-fill-picker-webcam-status",
        role: "status",
        "aria-live": "polite",
      },
      figEditorCreateElement("span", {}, "Camera access required"),
    );
    const preview = figEditorCreateElement(
      "fig-video",
      {
        className: "fig-fill-picker-webcam-preview",
        "aria-label": "Webcam preview",
        "aspect-ratio": "1/1",
        fit: "cover",
        checkerboard: "true",
        autoplay: "true",
        muted: "true",
      },
      [video, status],
    );
    const controls = figEditorCreateElement(
      "div",
      { className: "fig-fill-picker-webcam-controls" },
      figEditorCreateElement(
        "fig-button",
        {
          className: "fig-fill-picker-webcam-capture",
          variant: "secondary",
          full: true,
          disabled: true,
        },
        "Capture",
      ),
    );
    container.replaceChildren(cameraField, preview, controls);

    this.#setupWebcamEvents(container);
  }

  #setupWebcamEvents(container) {
    const video = container.querySelector(".fig-fill-picker-webcam-video");
    const status = container.querySelector(".fig-fill-picker-webcam-status");
    const captureBtn = container.querySelector(
      ".fig-fill-picker-webcam-capture",
    );
    const cameraField = container.querySelector(
      ".fig-fill-picker-webcam-camera",
    );
    const cameraSelect = container.querySelector(
      ".fig-fill-picker-camera-select",
    );
    const setCaptureReady = (ready) => {
      if (ready) captureBtn.removeAttribute("disabled");
      else captureBtn.setAttribute("disabled", "");
    };
    const updateFrameReadiness = () => {
      const ready =
        !!this.#webcam.stream &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0;
      setCaptureReady(ready);
      if (ready) {
        status.querySelector("span").textContent = "Camera ready";
        status.style.display = "none";
        this.#syncLiveWebcamSwatch(video);
      }
    };
    video.addEventListener("loadedmetadata", updateFrameReadiness);
    video.addEventListener("canplay", updateFrameReadiness);
    video.addEventListener("playing", updateFrameReadiness);

    const attachPreview = (stream) => {
      this.#webcam.stream = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.style.display = "block";
      const play = video.play?.();
      if (play?.catch) play.catch(() => {});
      updateFrameReadiness();
    };

    const populateCameras = async (requestId, selectedId) => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (requestId != null && requestId !== this.#webcamRequestId) return;
      const cameras = devices.filter((d) => d.kind === "videoinput");

      if (cameras.length > 1) {
        cameraField.style.display = "";
        let panel = cameraSelect.querySelector(":scope > fig-select-options");
        if (!panel) {
          panel = document.createElement("fig-select-options");
          cameraSelect.append(panel);
        }
        panel.replaceChildren();
        cameras.forEach((cam, i) => {
          const option = document.createElement("fig-select-option");
          option.value = cam.deviceId;
          const label =
            cam.label || (cameras.length > 1 ? `Camera ${i + 1}` : "Camera");
          option.textContent = label.replace(
            /\s*\((?:[0-9a-f]{4}:)*([0-9a-f]{4})\)$/i,
            (_, id) => {
              const displayId = /^\d+$/.test(id)
                ? Number.parseInt(id, 10).toString()
                : id.replace(/^0+/, "") || "0";
              return ` ${displayId}`;
            },
          );
          panel.append(option);
        });
        if (selectedId) cameraSelect.value = selectedId;
      } else {
        cameraField.style.display = "none";
        cameraSelect
          .querySelector(":scope > fig-select-options")
          ?.replaceChildren();
      }
    };

    const startWebcam = async (deviceId = null) => {
      const requested = deviceId || this.#webcam.deviceId || null;
      const existing = this.#webcam.stream;
      const liveTracks =
        existing?.getTracks?.().filter((track) => track.readyState !== "ended") ??
        [];
      if (existing && liveTracks.length) {
        const liveId =
          existing.getVideoTracks?.()?.[0]?.getSettings?.()?.deviceId ||
          this.#webcam.deviceId ||
          null;
        // Reuse the live stream only when it is already the requested device.
        // An unknown liveId is not a match — otherwise the camera select cannot switch.
        if (!requested || requested === liveId) {
          attachPreview(existing);
          this.#emitWebcamStream();
          populateCameras(null, requested || liveId);
          return;
        }
      }

      this.#stopWebcam({ emit: Boolean(existing) });
      const requestId = this.#webcamRequestId;
      setCaptureReady(false);
      status.querySelector("span").textContent = "Starting camera";
      status.style.display = "flex";
      try {
        const constraints = {
          video: requested ? { deviceId: { exact: requested } } : true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (
          requestId !== this.#webcamRequestId ||
          !this.isConnected ||
          this.#activeTab !== "webcam"
        ) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const track = stream.getVideoTracks?.()?.[0];
        this.#webcam.deviceId =
          requested || track?.getSettings?.()?.deviceId || null;
        this.#webcam.live = this.#webcamMode() === "live";
        attachPreview(stream);
        this.#emitWebcamStream();
        await populateCameras(requestId, requested);
      } catch (err) {
        if (requestId !== this.#webcamRequestId) return;
        console.error("Webcam error:", err.name, err.message);
        let message = "Camera access denied";
        if (err.name === "NotAllowedError") {
          message = "Camera permission denied";
        } else if (err.name === "NotFoundError") {
          message = "No camera found";
        } else if (err.name === "NotReadableError") {
          message = "Camera in use by another app";
        } else if (err.name === "OverconstrainedError") {
          message = "Camera constraints not supported";
        } else if (!window.isSecureContext) {
          message = "Camera requires secure context";
        }
        status.replaceChildren();
        const messageElement = document.createElement("span");
        messageElement.textContent = message;
        status.appendChild(messageElement);
        status.style.display = "flex";
        video.style.display = "none";
        setCaptureReady(false);
      }
    };
    this.#webcamStart = startWebcam;

    cameraSelect.addEventListener("change", (e) => {
      const next =
        typeof e.detail === "string" ? e.detail : e.target?.value;
      if (!next || next === this.#webcam.deviceId) return;
      startWebcam(next);
    });

    captureBtn.addEventListener("click", async () => {
      if (!this.#webcam.stream) return;
      const snapshot = await this.#snapshotWebcamVideo(video);
      if (!snapshot) return;

      this.#image.url = snapshot;
      this.#webcam.live = false;

      const imagePreview = this.#dialog.querySelector(
        ".fig-fill-picker-image-preview",
      );
      if (imagePreview) this.#updateImagePreview(imagePreview);

      const hasImageTab = Array.from(
        this.#dialog.querySelectorAll(".fig-fill-picker-tab"),
      ).some((candidate) => candidate.dataset.tab === "image");

      if (hasImageTab) {
        this.#switchTab("image");
      } else {
        this.#updateSwatch();
        this.#emitInput();
      }
      this.#emitChange();
    });
  }

  // ============ COLOR CONVERSION UTILITIES ============
  #hsvToRGB(hsv) {
    const h = hsv.h / 360;
    const s = hsv.s / 100;
    const v = hsv.v / 100;

    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  #rgbToHSV(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: h * 360,
      s: s * 100,
      v: v * 100,
      a: 1,
    };
  }

  #hsvToHex(hsv) {
    // Safety check for valid HSV object
    if (
      !hsv ||
      typeof hsv.h !== "number" ||
      typeof hsv.s !== "number" ||
      typeof hsv.v !== "number"
    ) {
      return "#D9D9D9"; // Default gray
    }
    const rgb = this.#hsvToRGB(hsv);
    const toHex = (n) => {
      const val = isNaN(n) ? 217 : Math.max(0, Math.min(255, Math.round(n)));
      return val.toString(16).padStart(2, "0");
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  #hexToHSV(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return this.#rgbToHSV({ r, g, b });
  }

  #hexToRGBA(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  #formatCssAlpha(alpha) {
    const a = Math.max(0, Math.min(1, Number(alpha) || 0));
    const rounded = Math.round(a * 1000) / 1000;
    return String(rounded);
  }

  #formatCssColor(color = this.#color) {
    const rgb = this.#hsvToRGB(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.#formatCssAlpha(color.a)})`;
  }

  /** Parse CSS color strings (rgba/rgb/hex) into HSV(+alpha). */
  #parseCssColor(raw) {
    const value = String(raw ?? "").trim();
    if (!value) return null;

    const hexMatch = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      let alpha = 1;
      if (hex.length === 8) {
        alpha = parseInt(hex.slice(6, 8), 16) / 255;
        hex = hex.slice(0, 6);
      }
      const hsv = this.#hexToHSV(`#${hex}`);
      return { ...hsv, a: alpha };
    }

    const rgbMatch = value.match(
      /^rgba?\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))(?:\s*,\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*)?\)$/i,
    );
    if (rgbMatch) {
      const r = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[1]))));
      const g = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[2]))));
      const b = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[3]))));
      const alpha =
        rgbMatch[4] !== undefined
          ? Math.max(0, Math.min(1, parseFloat(rgbMatch[4])))
          : 1;
      if (![r, g, b, alpha].every(Number.isFinite)) return null;
      return { ...this.#rgbToHSV({ r, g, b }), a: alpha };
    }

    return null;
  }

  #hexToP3(hex, alpha = 1) {
    const r = +(parseInt(hex.slice(1, 3), 16) / 255).toFixed(4);
    const g = +(parseInt(hex.slice(3, 5), 16) / 255).toFixed(4);
    const b = +(parseInt(hex.slice(5, 7), 16) / 255).toFixed(4);
    return `color(display-p3 ${r} ${g} ${b} / ${alpha})`;
  }

  #rgbToHSL(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  #hslToRGB(hsl) {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  // OKLAB/OKLCH conversions (simplified)
  #rgbToOKLAB(rgb) {
    // Convert to linear sRGB
    const toLinear = (c) => {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    const r = toLinear(rgb.r);
    const g = toLinear(rgb.g);
    const b = toLinear(rgb.b);

    // Convert to LMS
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    // Convert to Oklab
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return {
      l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
      a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
      b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    };
  }

  #rgbToOKLCH(rgb) {
    const lab = this.#rgbToOKLAB(rgb);
    return {
      l: lab.l,
      c: Math.sqrt(lab.a * lab.a + lab.b * lab.b),
      h: ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360,
    };
  }

  #oklabToRGB(lab) {
    const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
    const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
    const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const toSRGB = (c) => {
      const v =
        c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      return Math.round(Math.max(0, Math.min(1, v)) * 255);
    };

    return {
      r: toSRGB(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      g: toSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      b: toSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    };
  }

  #oklchToRGB(lch) {
    const hRad = (lch.h * Math.PI) / 180;
    return this.#oklabToRGB({
      l: lch.l,
      a: lch.c * Math.cos(hRad),
      b: lch.c * Math.sin(hRad),
    });
  }

  // ============ EVENT EMITTERS ============
  #emitInput() {
    if (this.#isDisabled()) return;
    this.#updateSwatch();
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    if (this.#isDisabled()) return;
    this.#lastChangeValue = JSON.stringify(this.value);
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  // ============ PUBLIC API ============
  get value() {
    const base = { type: this.#fillType, colorSpace: this.#gamut };

    switch (this.#fillType) {
      case "solid":
        return {
          ...base,
          color: this.#hsvToHex(this.#color),
          alpha: this.#color.a,
          hsv: { ...this.#color },
        };
      case "gradient":
        return {
          ...base,
          gradient: gradientToValueShape(this.#gradient),
          css: this.#getGradientCSS(),
        };
      case "image":
        return {
          ...base,
          image: { ...this.#image },
        };
      case "video":
        return {
          ...base,
          video: this.#videoValue(),
        };
      case "webcam":
        return {
          ...base,
          webcam: this.#webcamValue(),
        };
      default:
        return { ...base, ...this.#customData[this.#fillType] };
    }
  }

  set value(val) {
    if (typeof val === "string") {
      this.setAttribute("value", val);
    } else {
      this.setAttribute("value", JSON.stringify(val));
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        this.#parseValue();
        this.#updateSwatch();
        if (this.#dialog?.open && !this.#isDraggingColor) {
          this.#refreshDialogUI();
          this.#lastChangeValue = JSON.stringify(this.value);
        }
        break;
      case "disabled":
        this.#syncTriggerA11y();
        if (this.#isDisabled() && this.#dialog?.open) this.close();
        break;
      case "alpha":
      case "mode": {
        if (!this.#dialog) break;
        const wasOpen = this.#dialog.open;
        this.#discardDialog();
        if (wasOpen && this.isConnected) this.#openDialog();
        break;
      }
      case "webcam-mode":
        if (this.#fillType === "webcam") this.#updateSwatch();
        break;
      case "default-video":
        if (this.#fillType === "video") {
          this.#applyDefaultVideo({ emit: false });
          this.#updateSwatch();
        }
        break;
      case "aria-label":
        if (this.#dialog) {
          this.#dialog.setAttribute("aria-label", this.#triggerLabel());
        }
      case "aria-labelledby":
      case "aria-describedby":
        this.#syncTriggerA11y();
        break;
    }
  }
}
figEditorDefineElement("fig-fill-picker", FigFillPicker);

/**
 * Compact swatch previewing gradient color-space interpolation.
 * Polar: CSS conic-gradient masked (SVG data-URL, round linecaps) to an arc.
 * Non-polar: CSS linear-gradient masked to a horizontal round-capped stroke.
 * Accepts the same `value` shape as fig-input-gradient / fig-fill-picker.
 *
 * @element fig-interpolation-swatch
 * @attr {string} value - JSON `{ type: "gradient", gradient: { … } }` (or a bare gradient object)
 * @attr {string} size - `small` (default, 24px) or `large` (32px)
 */
class FigInterpolationSwatch extends HTMLElement {
  static #HUE_SPACES = new Set(["oklch", "hsl"]);
  static #CX = 10;
  static #CY = 10;
  static #R = 8;
  static #STROKE = 3;
  // Polar endpoints ≈ 10 o'clock → 2 o'clock (SVG deg: 0 = east, CW).
  // CSS conic `from` is 0 = north; convert with +90.
  static #START_DEG = 210;
  static #DEFAULT_GRADIENT = {
    type: "linear",
    angle: 135,
    interpolationSpace: "srgb",
    hueInterpolation: "shorter",
    stops: [
      { color: "#FF0000", position: 0, opacity: 100 },
      { color: "#4F9EFF", position: 100, opacity: 100 },
    ],
  };

  #rendered = false;
  #svgEl = null;
  #fillEl = null;
  #gradient = { ...FigInterpolationSwatch.#DEFAULT_GRADIENT };

  static get observedAttributes() {
    return ["value"];
  }

  get value() {
    return {
      type: "gradient",
      gradient: { ...this.#gradient },
    };
  }

  set value(val) {
    if (val == null || val === "") {
      this.removeAttribute("value");
      return;
    }
    if (typeof val === "string") {
      this.setAttribute("value", val);
      return;
    }
    this.setAttribute("value", JSON.stringify(val));
  }

  connectedCallback() {
    this.#ensureA11y();
    this.#parseValue();
    this.#render();
    this.#updatePreview();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name !== "value") return;
    this.#parseValue();
    if (this.#rendered) this.#updatePreview();
  }

  #ensureA11y() {
    const named =
      this.hasAttribute("aria-label") || this.hasAttribute("aria-labelledby");
    if (!named && !this.hasAttribute("aria-hidden")) {
      this.setAttribute("aria-hidden", "true");
    }
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) {
      this.#gradient = {
        ...FigInterpolationSwatch.#DEFAULT_GRADIENT,
        stops: FigInterpolationSwatch.#DEFAULT_GRADIENT.stops.map((s) => ({
          ...s,
        })),
      };
      return;
    }
    try {
      const parsed = JSON.parse(valueAttr);
      const gradient = parsed?.type === "gradient" && parsed.gradient
        ? parsed.gradient
        : parsed?.gradient
          ? parsed.gradient
          : parsed;
      if (!gradient || typeof gradient !== "object") return;
      this.#gradient = this.#normalizeGradient({
        ...FigInterpolationSwatch.#DEFAULT_GRADIENT,
        ...gradient,
      });
    } catch {
      // Keep current/default gradient on invalid JSON.
    }
  }

  #normalizeGradient(gradient) {
    const next = { ...(gradient ?? {}) };
    const interpolationSpace = String(
      next.interpolationSpace ?? "srgb",
    ).toLowerCase();
    const hueInterpolation = String(
      next.hueInterpolation ?? "shorter",
    ).toLowerCase();
    const stops = Array.isArray(next.stops)
      ? next.stops.map((stop) => ({
          color: String(stop?.color || "#D9D9D9").replace(
            /^(#(?:[0-9a-f]{6})).*/i,
            "$1",
          ),
          position: stop?.position ?? 0,
          opacity: stop?.opacity ?? 100,
        }))
      : FigInterpolationSwatch.#DEFAULT_GRADIENT.stops.map((s) => ({ ...s }));
    if (stops.length < 2) {
      return {
        ...FigInterpolationSwatch.#DEFAULT_GRADIENT,
        stops: FigInterpolationSwatch.#DEFAULT_GRADIENT.stops.map((s) => ({
          ...s,
        })),
      };
    }
    return {
      type: ["linear", "radial", "angular"].includes(next.type)
        ? next.type
        : "linear",
      angle: Number.isFinite(Number(next.angle)) ? Number(next.angle) : 135,
      interpolationSpace,
      hueInterpolation,
      stops,
    };
  }

  #isPolar() {
    return FigInterpolationSwatch.#HUE_SPACES.has(
      this.#gradient.interpolationSpace || "srgb",
    );
  }

  #hueForColor(color) {
    const { r, g, b } = figEditorHexToRgb(color);
    if (this.#gradient.interpolationSpace === "hsl") {
      return figEditorRgbToHsl(r, g, b).h;
    }
    const lab = figEditorRgbToOklab(r, g, b);
    const hue = figEditorOklabToOklch(lab.l, lab.a, lab.b).h;
    return ((hue % 360) + 360) % 360;
  }

  #polarArcGeometry() {
    const stops = this.#sortedStops();
    const startHue = this.#hueForColor(stops[0]?.color || "#FF0000");
    const endHue = this.#hueForColor(
      stops[stops.length - 1]?.color || "#4F9EFF",
    );
    const startDeg = FigInterpolationSwatch.#START_DEG - startHue;
    const endDeg = FigInterpolationSwatch.#START_DEG - endHue;
    const clockwiseSweep = ((endDeg - startDeg) % 360 + 360) % 360;
    const counterclockwiseSweep =
      clockwiseSweep === 0 ? 0 : clockwiseSweep - 360;
    const method = this.#gradient.hueInterpolation || "shorter";

    let sweepDeg;
    if (method === "increasing") {
      sweepDeg = counterclockwiseSweep;
    } else if (method === "decreasing") {
      sweepDeg = clockwiseSweep;
    } else if (method === "longer") {
      sweepDeg =
        clockwiseSweep < 180 ? counterclockwiseSweep : clockwiseSweep;
    } else {
      sweepDeg =
        clockwiseSweep <= 180 ? clockwiseSweep : counterclockwiseSweep;
    }

    // A round cap extends beyond the path endpoint. Inset the centerline so
    // the visible cap edges, rather than their centers, land on the hues.
    const direction = Math.sign(sweepDeg);
    const capAngle =
      (Math.asin(FigInterpolationSwatch.#STROKE / 2 / FigInterpolationSwatch.#R) *
        180) /
      Math.PI;
    const inset = Math.min(
      capAngle,
      Math.max(0, (Math.abs(sweepDeg) - 0.01) / 2),
    );
    return {
      startDeg: startDeg + direction * inset,
      sweepDeg: sweepDeg - direction * inset * 2,
    };
  }

  #pointOnCircle(deg) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: FigInterpolationSwatch.#CX + FigInterpolationSwatch.#R * Math.cos(rad),
      y: FigInterpolationSwatch.#CY + FigInterpolationSwatch.#R * Math.sin(rad),
    };
  }

  #arcMaskPath(startDeg, sweepDeg) {
    const endDeg = startDeg + sweepDeg;
    const start = this.#pointOnCircle(startDeg);
    const end = this.#pointOnCircle(endDeg);
    const largeArc = Math.abs(sweepDeg) > 180 ? 1 : 0;
    const sweepFlag = sweepDeg >= 0 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${FigInterpolationSwatch.#R} ${FigInterpolationSwatch.#R} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
  }

  #lineMaskPath() {
    const start = this.#pointOnCircle(180);
    const end = this.#pointOnCircle(0);
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  #maskImageForPath(d) {
    const stroke = FigInterpolationSwatch.#STROKE;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">` +
      `<path d="${d}" fill="none" stroke="white" stroke-width="${stroke}" ` +
      `stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  #sortedStops() {
    return [...this.#gradient.stops].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
  }

  #cssInterpolationClause() {
    const space = this.#gradient.interpolationSpace || "srgb";
    if (space === "srgb") return "";
    if (FigInterpolationSwatch.#HUE_SPACES.has(space)) {
      return ` in ${space} ${this.#gradient.hueInterpolation || "shorter"} hue`;
    }
    return ` in ${space}`;
  }

  #previewBackground() {
    const stops = this.#sortedStops();
    const clause = this.#cssInterpolationClause();
    if (this.#isPolar()) {
      // Fixed hue wheel. The mask maps gradient endpoint hues onto this wheel.
      const cssFrom = (FigInterpolationSwatch.#START_DEG + 90) % 360;
      const space = this.#gradient.interpolationSpace;
      const wheelColor = (hue) =>
        space === "oklch"
          ? `oklch(65% 0.25 ${hue})`
          : `hsl(${hue} 100% 50%)`;
      const wheelStops = [0, 300, 240, 180, 120, 60, 0]
        .map(wheelColor)
        .join(", ");
      return `conic-gradient(from ${cssFrom}deg in ${space} decreasing hue, ${wheelStops})`;
    }
    const stopList = stops
      .map((s) => `${s.color} ${s.position ?? 0}%`)
      .join(", ");
    return `linear-gradient(90deg${clause}, ${stopList})`;
  }

  #render() {
    if (this.#rendered) return;
    const stroke = FigInterpolationSwatch.#STROKE;
    const svg = figEditorCreateSvgElement(
      "svg",
      {
        className: "fig-interpolation-swatch-svg",
        width: "20",
        height: "20",
        viewBox: "0 0 20 20",
        fill: "none",
        "aria-hidden": "true",
      },
      figEditorCreateSvgElement("circle", {
        className: "fig-interpolation-swatch-rim",
        cx: "10",
        cy: "10",
        r: "8",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": stroke,
      }),
    );
    const fill = figEditorCreateElement("div", {
      className: "fig-interpolation-swatch-fill",
      "aria-hidden": "true",
    });
    this.replaceChildren(svg, fill);
    this.#svgEl = svg;
    this.#fillEl = fill;
    this.#rendered = true;
  }

  #updatePreview() {
    if (!this.#fillEl) return;

    const polar = this.#isPolar();
    if (this.#svgEl) this.#svgEl.style.display = polar ? "" : "none";

    const d = polar
      ? (() => {
          const { startDeg, sweepDeg } = this.#polarArcGeometry();
          return this.#arcMaskPath(startDeg, sweepDeg);
        })()
      : this.#lineMaskPath();
    const mask = this.#maskImageForPath(d);
    this.#fillEl.style.setProperty("-webkit-mask-image", mask);
    this.#fillEl.style.maskImage = mask;
    this.#fillEl.style.background = this.#previewBackground();
  }
}
figEditorDefineElement("fig-interpolation-swatch", FigInterpolationSwatch);
