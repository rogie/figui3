/**
 * Generates a unique ID string using timestamp and random values
 * @returns {string} A unique identifier
 */
function figUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Gets the highest z-index currently in use on the page
 * @returns {number} The highest z-index found, minimum of 1000
 */
function figGetHighestZIndex() {
  let highest = 1000; // Baseline minimum

  // Check all elements with inline z-index or computed z-index
  const elements = document.querySelectorAll("*");
  for (const el of elements) {
    const zIndex = parseInt(getComputedStyle(el).zIndex, 10);
    if (!isNaN(zIndex) && zIndex > highest) {
      highest = zIndex;
    }
  }

  return highest;
}
/**
 * Checks if the browser supports the native popover API
 * @returns {boolean} True if popover is supported
 */
function figSupportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}

/**
 * A custom button element that supports different types and states.
 * @attr {string} type - The button type: "button" (default), "toggle", "submit", or "link"
 * @attr {boolean} selected - Whether the button is in a selected state
 * @attr {boolean} disabled - Whether the button is disabled
 * @attr {string} href - URL for link type buttons
 * @attr {string} target - Target window for link type buttons (e.g., "_blank")
 */
class FigButton extends HTMLElement {
  type;
  #selected;
  constructor() {
    super();
    this.attachShadow({ mode: "open", delegatesFocus: true });
  }
  connectedCallback() {
    this.type = this.getAttribute("type") || "button";
    this.shadowRoot.innerHTML = `
            <style>
                button, button:hover, button:active {
                    padding: 0 var(--spacer-2);
                    appearance: none;
                    display: flex;
                    border: 0;
                    flex: 1;
                    text-align: center;
                    align-items: stretch;
                    justify-content: center;
                    font: inherit;
                    color: inherit;
                    outline: 0;
                    place-items: center; 
                    background: transparent;
                    margin: calc(var(--spacer-2)*-1);
                    height: var(--spacer-4);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                    min-width: 0;
                }
            </style>
            <button type="${this.type}">
                <slot></slot>
            </button>
            `;

    this.#selected =
      this.hasAttribute("selected") &&
      this.getAttribute("selected") !== "false";

    requestAnimationFrame(() => {
      this.button = this.shadowRoot.querySelector("button");
      this.button.addEventListener("click", this.#handleClick.bind(this));

      // Forward focus-visible state to host element
      this.button.addEventListener("focus", () => {
        if (this.button.matches(":focus-visible")) {
          this.setAttribute("data-focus-visible", "");
        }
      });
      this.button.addEventListener("blur", () => {
        this.removeAttribute("data-focus-visible");
      });
    });
  }

  get type() {
    return this.getAttribute("type") || "button";
  }
  set type(value) {
    this.setAttribute("type", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.setAttribute("selected", value);
  }

  #handleClick() {
    if (this.type === "toggle") {
      this.toggleAttribute("selected", !this.hasAttribute("selected"));
    }
    if (this.type === "submit") {
      let form = this.closest("form");
      if (form) {
        form.submit();
      }
    }
    if (this.type === "link") {
      const href = this.getAttribute("href");
      const target = this.getAttribute("target");
      if (href) {
        if (target) {
          window.open(href, target);
        } else {
          window.location.href = href;
        }
      }
    }
  }
  static get observedAttributes() {
    return ["disabled", "selected"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.button) {
      this.button[name] = newValue;
      switch (name) {
        case "disabled":
          this.disabled = this.button.disabled =
            newValue !== null && newValue !== "false";
          break;
        case "type":
          this.type = newValue;
          this.button.type = this.type;
          this.button.setAttribute("type", this.type);
          break;
        case "selected":
          this.#selected = newValue === "true";
          break;
      }
    }
  }
}
customElements.define("fig-button", FigButton);

/**
 * A custom dropdown/select element.
 * @attr {string} type - The dropdown type: "select" (default) or "dropdown"
 * @attr {string} value - The currently selected value
 */
class FigDropdown extends HTMLElement {
  #label = "Menu";
  #selectedValue = null; // Stores last selected value for dropdown type

  get label() {
    return this.#label;
  }
  set label(value) {
    this.#label = value;
  }
  constructor() {
    super();
    this.select = document.createElement("select");
    this.optionsSlot = document.createElement("slot");
    this.attachShadow({ mode: "open" });
  }

  #addEventListeners() {
    this.select.addEventListener("input", this.#handleSelectInput.bind(this));
    this.select.addEventListener("change", this.#handleSelectChange.bind(this));
  }

  connectedCallback() {
    this.type = this.getAttribute("type") || "select";

    this.#label = this.getAttribute("label") || this.#label;
    this.select.setAttribute("aria-label", this.#label);

    this.appendChild(this.select);
    this.shadowRoot.appendChild(this.optionsSlot);

    this.optionsSlot.addEventListener("slotchange", this.slotChange.bind(this));

    this.#addEventListeners();
  }

  slotChange() {
    while (this.select.firstChild) {
      this.select.firstChild.remove();
    }

    if (this.type === "dropdown") {
      const hiddenOption = document.createElement("option");
      hiddenOption.setAttribute("hidden", "true");
      hiddenOption.setAttribute("selected", "true");
      hiddenOption.selected = true;
      this.select.appendChild(hiddenOption);
    }
    this.optionsSlot.assignedNodes().forEach((option) => {
      if (option.nodeName === "OPTION" || option.nodeName === "OPTGROUP") {
        this.select.appendChild(option.cloneNode(true));
      }
    });
    this.#syncSelectedValue(this.value);
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
  }

  #handleSelectInput(e) {
    const selectedValue = e.target.value;
    // Store the selected value for dropdown type (before select gets reset)
    if (this.type === "dropdown") {
      this.#selectedValue = selectedValue;
    }
    this.setAttribute("value", selectedValue);
    this.dispatchEvent(
      new CustomEvent("input", {
        detail: selectedValue,
        bubbles: true,
        composed: true,
      }),
    );
  }

  #handleSelectChange(e) {
    // Get the value before resetting (use stored value for dropdown type)
    const selectedValue =
      this.type === "dropdown" ? this.#selectedValue : this.select.value;
    // Reset to hidden option for dropdown type
    if (this.type === "dropdown") {
      this.select.selectedIndex = -1;
    }
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: selectedValue,
        bubbles: true,
        composed: true,
      }),
    );
  }

  focus() {
    this.select.focus();
  }
  blur() {
    this.select.blur();
  }
  get value() {
    // For dropdown type, return the stored value since the select is reset after selection
    if (this.type === "dropdown") {
      return this.#selectedValue;
    }
    return this.select?.value;
  }
  set value(value) {
    // Store value for dropdown type
    if (this.type === "dropdown") {
      this.#selectedValue = value;
    }
    this.setAttribute("value", value);
  }
  static get observedAttributes() {
    return ["value", "type"];
  }
  #syncSelectedValue(value) {
    // For dropdown type, don't sync the visual selection - it should always show the hidden placeholder
    if (this.type === "dropdown") {
      return;
    }
    if (this.select) {
      this.select.querySelectorAll("option").forEach((o, i) => {
        if (o.value === this.getAttribute("value")) {
          this.select.selectedIndex = i;
        }
      });
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.#syncSelectedValue(newValue);
    }
    if (name === "type") {
      this.type = newValue;
    }
    if (name === "label") {
      this.#label = newValue;
      this.select.setAttribute("aria-label", this.#label);
    }
  }
}

customElements.define("fig-dropdown", FigDropdown);

/* Tooltip */
/**
 * A custom tooltip element that displays on hover or click.
 * @attr {string} action - The trigger action: "hover" (default) or "click"
 * @attr {number} delay - Delay in milliseconds before showing tooltip (default: 500)
 * @attr {string} text - The tooltip text content
 * @attr {string} offset - Comma-separated offset values: left,top,right,bottom
 */
class FigTooltip extends HTMLElement {
  #boundHideOnChromeOpen;
  #boundHideOnDragStart;
  #boundHidePopupOutsideClick;
  #touchTimeout;
  #isTouching = false;
  constructor() {
    super();
    this.action = this.getAttribute("action") || "hover";
    let delay = parseInt(this.getAttribute("delay"));
    this.delay = !isNaN(delay) ? delay : 500;

    // Bind methods that will be used as event listeners
    this.#boundHideOnChromeOpen = this.#hideOnChromeOpen.bind(this);
    this.#boundHideOnDragStart = this.hidePopup.bind(this);
    this.#boundHidePopupOutsideClick = this.hidePopupOutsideClick.bind(this);
  }
  connectedCallback() {
    this.setup();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.destroy();
    // Remove global listeners
    document.removeEventListener(
      "mousedown",
      this.#boundHideOnChromeOpen,
      true,
    );
    // Remove mousedown listener
    this.removeEventListener("mousedown", this.#boundHideOnDragStart);

    // Remove click outside listener for click action
    if (this.action === "click") {
      document.body.removeEventListener(
        "click",
        this.#boundHidePopupOutsideClick,
      );
    }

    // Clean up touch-related timers and listeners
    clearTimeout(this.#touchTimeout);
    if (this.action === "hover") {
      this.removeEventListener("touchstart", this.#handleTouchStart);
      this.removeEventListener("touchmove", this.#handleTouchMove);
      this.removeEventListener("touchend", this.#handleTouchEnd);
      this.removeEventListener("touchcancel", this.#handleTouchCancel);
    } else if (this.action === "click") {
      this.removeEventListener("touchstart", this.showDelayedPopup);
    }
  }

  setup() {
    this.style.display = "contents";
  }

  render() {
    this.destroy();
    let content = document.createElement("span");
    this.popup = document.createElement("span");
    this.popup.setAttribute("class", "fig-tooltip");
    this.popup.setAttribute("role", "tooltip");
    const tooltipId = figUniqueId();
    this.popup.setAttribute("id", tooltipId);
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.display = "inline-flex";
    this.popup.style.pointerEvents = "none";
    this.popup.append(content);
    content.innerText = this.getAttribute("text");
    // Set aria-describedby on the trigger element
    if (this.firstElementChild) {
      this.firstElementChild.setAttribute("aria-describedby", tooltipId);
    }

    // If tooltip is inside a dialog, append to dialog to stay in top layer
    const parentDialog = this.closest("dialog");
    if (parentDialog && parentDialog.open) {
      parentDialog.append(this.popup);
    } else {
      document.body.append(this.popup);
    }

    const text = content.childNodes[0];
    if (text) {
      const range = document.createRange();
      range.setStartBefore(text);
      range.setEndAfter(text);
      const clientRect = range.getBoundingClientRect();
      content.style.width = `${clientRect.width}px`;
    }
  }

  destroy() {
    if (this.popup) {
      this.popup.remove();
    }
    // Remove the click outside listener if it was added
    if (this.action === "click") {
      document.body.removeEventListener(
        "click",
        this.#boundHidePopupOutsideClick,
      );
    }
  }
  isTouchDevice() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  setupEventListeners() {
    if (this.action === "hover") {
      if (!this.isTouchDevice()) {
        this.addEventListener("pointerenter", this.showDelayedPopup.bind(this));
        this.addEventListener(
          "pointerleave",
          this.#handlePointerLeave.bind(this),
        );
      }
      // Add mousedown listener instead of dragstart
      this.addEventListener("mousedown", this.#boundHideOnDragStart);

      // Touch support for mobile hover simulation
      this.addEventListener("touchstart", this.#handleTouchStart.bind(this), {
        passive: true,
      });
      this.addEventListener("touchmove", this.#handleTouchMove.bind(this), {
        passive: true,
      });
      this.addEventListener("touchend", this.#handleTouchEnd.bind(this), {
        passive: true,
      });
      this.addEventListener("touchcancel", this.#handleTouchCancel.bind(this), {
        passive: true,
      });
    } else if (this.action === "click") {
      this.addEventListener("click", this.showDelayedPopup.bind(this));
      document.body.addEventListener("click", this.#boundHidePopupOutsideClick);

      // Touch support for better mobile responsiveness
      this.addEventListener("touchstart", this.showDelayedPopup.bind(this), {
        passive: true,
      });
    }

    // Add listener for chrome interactions
    document.addEventListener("mousedown", this.#boundHideOnChromeOpen, true);
  }

  getOffset() {
    const defaultOffset = { left: 8, top: 4, right: 8, bottom: 4 };
    const offsetAttr = this.getAttribute("offset");
    if (!offsetAttr) return defaultOffset;

    const [left, top, right, bottom] = offsetAttr.split(",").map(Number);
    return {
      left: isNaN(left) ? defaultOffset.left : left,
      top: isNaN(top) ? defaultOffset.top : top,
      right: isNaN(right) ? defaultOffset.right : right,
      bottom: isNaN(bottom) ? defaultOffset.bottom : bottom,
    };
  }

  showDelayedPopup() {
    this.render();
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.showPopup.bind(this), this.delay);
  }

  showPopup() {
    const rect = this.firstElementChild.getBoundingClientRect();
    const popupRect = this.popup.getBoundingClientRect();
    const offset = this.getOffset();

    // Position the tooltip above the element
    let top = rect.top - popupRect.height - offset.top;
    let left = rect.left + (rect.width - popupRect.width) / 2;
    this.popup.setAttribute("position", "top");

    // Adjust if tooltip would go off-screen
    if (top < 0) {
      this.popup.setAttribute("position", "bottom");
      top = rect.bottom + offset.bottom; // Position below instead
    }
    if (left < offset.left) {
      left = offset.left;
    } else if (left + popupRect.width > window.innerWidth - offset.right) {
      left = window.innerWidth - popupRect.width - offset.right;
    }

    // Calculate the center of the target element relative to the tooltip
    const targetCenter = rect.left + rect.width / 2;
    const tooltipLeft = left;
    const beakOffset = targetCenter - tooltipLeft;

    // Set the beak offset as a CSS custom property
    this.popup.style.setProperty("--beak-offset", `${beakOffset}px`);

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
    this.popup.style.opacity = "1";
    this.popup.style.visibility = "visible";
    this.popup.style.display = "block";
    this.popup.style.pointerEvents = "all";
    this.popup.style.zIndex = figGetHighestZIndex() + 1;

    this.isOpen = true;
  }

  hidePopup() {
    clearTimeout(this.timeout);
    clearTimeout(this.#touchTimeout);
    if (this.popup) {
      this.popup.style.opacity = "0";
      this.popup.style.display = "block";
      this.popup.style.pointerEvents = "none";
      this.destroy();
    }

    this.isOpen = false;
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

  static get observedAttributes() {
    return ["action", "delay", "open"];
  }
  get open() {
    return this.hasAttribute("open") && this.getAttribute("open") === "true";
  }
  set open(value) {
    this.setAttribute("open", value);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "action") {
      this.action = newValue;
    }
    if (name === "delay") {
      let delay = parseInt(newValue);
      this.delay = !isNaN(delay) ? delay : 500;
    }
    if (name === "open") {
      if (newValue === "true") {
        requestAnimationFrame(() => {
          this.showDelayedPopup();
        });
      } else {
        requestAnimationFrame(() => {
          this.hidePopup();
        });
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
}

customElements.define("fig-tooltip", FigTooltip);

/* Popover */
/**
 * A custom popover element extending FigTooltip.
 * @attr {string} action - The trigger action: "click" (default) or "hover"
 * @attr {string} size - The size of the popover
 */
class FigPopover extends FigTooltip {
  constructor() {
    super();
    this.action = this.getAttribute("action") || "click";
    this.delay = parseInt(this.getAttribute("delay")) || 0;
  }
  render() {
    this.popup = this.popup || this.querySelector("[popover]");
    this.popup.setAttribute("class", "fig-popover");
    this.popup.style.position = "fixed";
    this.popup.style.visibility = "hidden";
    this.popup.style.display = "inline-flex";
    document.body.append(this.popup);
  }
}
customElements.define("fig-popover", FigPopover);

/* Dialog */
/**
 * A custom dialog element for modal and non-modal dialogs.
 * @attr {boolean} open - Whether the dialog is visible
 * @attr {boolean} modal - Whether the dialog should be modal
 * @attr {boolean} drag - Whether the dialog is draggable
 * @attr {string} handle - CSS selector for the drag handle element (e.g., "fig-header"). If not specified, the entire dialog is draggable when drag is enabled.
 * @attr {string} position - Position of the dialog (e.g., "bottom right", "top left", "center center")
 */
class FigDialog extends HTMLDialogElement {
  #isDragging = false;
  #dragOffset = { x: 0, y: 0 };
  #boundPointerDown;
  #boundPointerMove;
  #boundPointerUp;
  #offset = 16; // 1rem in pixels
  #positionInitialized = false;

  constructor() {
    super();
    this.#boundPointerDown = this.#handlePointerDown.bind(this);
    this.#boundPointerMove = this.#handlePointerMove.bind(this);
    this.#boundPointerUp = this.#handlePointerUp.bind(this);
  }

  connectedCallback() {
    this.modal =
      this.hasAttribute("modal") && this.getAttribute("modal") !== "false";

    // Set up drag functionality
    this.drag =
      this.hasAttribute("drag") && this.getAttribute("drag") !== "false";

    requestAnimationFrame(() => {
      this.#addCloseListeners();
      this.#setupDragListeners();
      this.#applyPosition();
    });
  }

  disconnectedCallback() {
    this.#removeDragListeners();
  }

  #addCloseListeners() {
    this.querySelectorAll("fig-button[close-dialog]").forEach((button) => {
      button.removeEventListener("click", this.close);
      button.addEventListener("click", this.close.bind(this));
    });
  }

  #applyPosition() {
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
      this.style.top = `${this.#offset}px`;
    } else if (hasBottom) {
      this.style.bottom = `${this.#offset}px`;
    } else if (hasVCenter) {
      this.style.top = "0";
      this.style.bottom = "0";
    }

    // Horizontal positioning
    if (hasLeft) {
      this.style.left = `${this.#offset}px`;
    } else if (hasRight) {
      this.style.right = `${this.#offset}px`;
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

    this.#positionInitialized = true;
  }

  #setupDragListeners() {
    if (this.drag) {
      this.addEventListener("pointerdown", this.#boundPointerDown);
      // Set move cursor on handle element (or fig-header by default)
      const handleSelector = this.getAttribute("handle");
      const handleEl = handleSelector
        ? this.querySelector(handleSelector)
        : this.querySelector("fig-header, header");
      if (handleEl) {
        handleEl.style.cursor = "move";
      }
    }
  }

  #removeDragListeners() {
    this.removeEventListener("pointerdown", this.#boundPointerDown);
    document.removeEventListener("pointermove", this.#boundPointerMove);
    document.removeEventListener("pointerup", this.#boundPointerUp);
  }

  #isInteractiveElement(element) {
    // Standard HTML interactive elements
    const interactiveSelectors = [
      "input",
      "button",
      "select",
      "textarea",
      "a",
      "label",
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

  #handlePointerDown(e) {
    if (!this.drag || this.#isInteractiveElement(e.target)) {
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

    this.#isDragging = true;
    this.setPointerCapture(e.pointerId);

    // Get current position from computed style
    const rect = this.getBoundingClientRect();

    // Convert to pixel-based top/left positioning for dragging
    // (clears margin: auto centering)
    this.style.top = `${rect.top}px`;
    this.style.left = `${rect.left}px`;
    this.style.bottom = "auto";
    this.style.right = "auto";
    this.style.margin = "0";

    // Store offset from pointer to dialog top-left corner
    this.#dragOffset.x = e.clientX - rect.left;
    this.#dragOffset.y = e.clientY - rect.top;

    document.addEventListener("pointermove", this.#boundPointerMove);
    document.addEventListener("pointerup", this.#boundPointerUp);

    e.preventDefault();
  }

  #handlePointerMove(e) {
    if (!this.#isDragging) return;

    // Calculate new position based on pointer position minus offset
    const newLeft = e.clientX - this.#dragOffset.x;
    const newTop = e.clientY - this.#dragOffset.y;

    // Apply position directly with pixels
    this.style.left = `${newLeft}px`;
    this.style.top = `${newTop}px`;

    e.preventDefault();
  }

  #handlePointerUp(e) {
    if (!this.#isDragging) return;

    this.#isDragging = false;
    this.releasePointerCapture(e.pointerId);

    document.removeEventListener("pointermove", this.#boundPointerMove);
    document.removeEventListener("pointerup", this.#boundPointerUp);

    e.preventDefault();
  }

  static get observedAttributes() {
    return ["modal", "drag", "position", "handle"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "drag") {
      this.drag = newValue !== null && newValue !== "false";

      if (this.drag) {
        this.#setupDragListeners();
      } else {
        this.#removeDragListeners();
        // Remove move cursor from header
        const header = this.querySelector("fig-header, header");
        if (header) {
          header.style.cursor = "";
        }
      }
    }

    if (name === "position" && this.#positionInitialized) {
      this.#applyPosition();
    }
  }
}
customElements.define("fig-dialog", FigDialog, { extends: "dialog" });

/**
 * A popover element using the native Popover API.
 * @attr {string} trigger-action - The trigger action: "click" (default) or "hover"
 * @attr {number} delay - Delay in ms before showing on hover (default: 0)
 */
class FigPopover2 extends HTMLElement {
  #popover;
  #trigger;
  #id;
  #delay;
  #timeout;
  #action;

  constructor() {
    super();
  }
  connectedCallback() {
    this.#popover = this.querySelector("[popover]");
    this.#trigger = this;
    this.#delay = Number(this.getAttribute("delay")) || 0;
    this.#action = this.getAttribute("trigger-action") || "click";
    this.#id = `tooltip-${figUniqueId()}`;
    if (this.#popover) {
      this.#popover.setAttribute("id", this.#id);
      this.#popover.setAttribute("role", "tooltip");
      this.#popover.setAttribute("popover", "manual");
      this.#popover.style["position-anchor"] = `--${this.#id}`;

      this.#trigger.setAttribute("popovertarget", this.#id);
      this.#trigger.setAttribute("popovertargetaction", "toggle");
      this.#trigger.style["anchor-name"] = `--${this.#id}`;

      if (this.#action === "hover") {
        this.#trigger.addEventListener("mouseover", this.handleOpen.bind(this));
        this.#trigger.addEventListener("mouseout", this.handleClose.bind(this));
      } else {
        this.#trigger.addEventListener("click", this.handleToggle.bind(this));
      }

      document.body.append(this.#popover);
    }
  }

  handleClose() {
    clearTimeout(this.#timeout);
    this.#popover.hidePopover();
  }
  handleToggle() {
    if (this.#popover.matches(":popover-open")) {
      this.handleClose();
    } else {
      this.handleOpen();
    }
  }
  handleOpen() {
    clearTimeout(this.#timeout);
    this.#timeout = setTimeout(() => {
      this.#popover.showPopover();
    }, this.#delay);
  }
}
customElements.define("fig-popover-2", FigPopover2);

/* Tabs */
/**
 * A custom tab element for use within FigTabs.
 * @attr {string} label - The text label of the tab
 * @attr {boolean} selected - Whether the tab is currently selected
 */
class FigTab extends HTMLElement {
  #selected;
  constructor() {
    super();
    this.content = null;
    this.#selected = false;
  }
  connectedCallback() {
    this.setAttribute("label", this.innerText);
    this.setAttribute("role", "tab");
    this.setAttribute("tabindex", "0");
    this.addEventListener("click", this.handleClick.bind(this));

    requestAnimationFrame(() => {
      if (typeof this.getAttribute("content") === "string") {
        this.content = document.querySelector(this.getAttribute("content"));
        if (this.content) {
          this.content.setAttribute("role", "tabpanel");
          if (this.#selected) {
            this.content.style.display = "block";
            this.setAttribute("aria-selected", "true");
          } else {
            this.content.style.display = "none";
            this.setAttribute("aria-selected", "false");
          }
        }
      }
    });
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.setAttribute("selected", value ? "true" : "false");
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }
  handleClick() {
    this.selected = true;
    if (this.content) {
      this.content.style.display = "block";
    }
  }

  static get observedAttributes() {
    return ["selected"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "selected") {
      this.#selected = newValue !== null && newValue !== "false";
      this.setAttribute("aria-selected", this.#selected ? "true" : "false");
      if (this?.content) {
        this.content.style.display = this.#selected ? "block" : "none";
      }
    }
  }
}
customElements.define("fig-tab", FigTab);

/**
 * A custom tabs container element.
 * @attr {string} name - Identifier for the tabs group
 */
class FigTabs extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "name", "disabled"];
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "tabs";
    this.setAttribute("role", "tablist");
    this.addEventListener("click", this.handleClick.bind(this));
    this.addEventListener("keydown", this.#handleKeyDown.bind(this));
    // Set initial selected tab based on value
    const value = this.getAttribute("value");
    if (value) {
      this.#selectByValue(value);
    }
    // Apply disabled state
    if (this.hasAttribute("disabled")) {
      this.#applyDisabled(true);
    }
  }

  #applyDisabled(disabled) {
    const tabs = this.querySelectorAll("fig-tab");
    tabs.forEach((tab) => {
      if (disabled) {
        tab.setAttribute("disabled", "");
        tab.setAttribute("aria-disabled", "true");
        tab.setAttribute("tabindex", "-1");
      } else {
        tab.removeAttribute("disabled");
        tab.removeAttribute("aria-disabled");
        tab.setAttribute("tabindex", "0");
      }
    });
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
    this.removeEventListener("keydown", this.#handleKeyDown);
  }

  #handleKeyDown(event) {
    const tabs = Array.from(this.querySelectorAll("fig-tab"));
    const currentIndex = tabs.findIndex((tab) => tab.hasAttribute("selected"));
    let newIndex = currentIndex;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex && tabs[newIndex]) {
      tabs.forEach((tab) => tab.removeAttribute("selected"));
      this.selectedTab = tabs[newIndex];
      this.setAttribute("value", tabs[newIndex].getAttribute("value") || "");
      tabs[newIndex].focus();
    }
  }

  get value() {
    return this.selectedTab?.getAttribute("value") || "";
  }

  set value(val) {
    this.setAttribute("value", val);
  }

  #selectByValue(value) {
    const tabs = this.querySelectorAll("fig-tab");
    for (const tab of tabs) {
      if (tab.getAttribute("value") === value) {
        this.selectedTab = tab;
      } else {
        tab.removeAttribute("selected");
      }
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        if (newValue !== oldValue) {
          this.#selectByValue(newValue);
        }
        break;
      case "disabled":
        this.#applyDisabled(newValue !== null && newValue !== "false");
        break;
    }
  }

  handleClick(event) {
    // Ignore clicks when disabled
    if (this.hasAttribute("disabled")) return;
    const target = event.target;
    if (target.nodeName.toLowerCase() === "fig-tab") {
      const tabs = this.querySelectorAll("fig-tab");
      for (const tab of tabs) {
        if (tab === target) {
          this.selectedTab = tab;
          this.setAttribute("value", tab.getAttribute("value") || "");
        } else {
          tab.removeAttribute("selected");
        }
      }
    }
  }
}
customElements.define("fig-tabs", FigTabs);

/* Segmented Control */
/**
 * A custom segment element for use within FigSegmentedControl.
 * @attr {string} value - The value associated with this segment
 * @attr {boolean} selected - Whether the segment is currently selected
 */
class FigSegment extends HTMLElement {
  #value;
  #selected;
  constructor() {
    super();
  }
  connectedCallback() {
    this.addEventListener("click", this.handleClick.bind(this));
  }
  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }
  handleClick() {
    this.setAttribute("selected", "true");
  }
  get value() {
    return this.#value;
  }
  set value(value) {
    this.#value = value;
    this.setAttribute("value", value);
  }
  get selected() {
    return this.#selected;
  }
  set selected(value) {
    this.#selected = value;
    this.setAttribute("selected", value);
  }
  static get observedAttributes() {
    return ["selected", "value"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "value":
        this.#value = newValue;
        break;
      case "selected":
        this.#selected = newValue;
        break;
    }
  }
}
customElements.define("fig-segment", FigSegment);

/**
 * A custom segmented control container element.
 * @attr {string} name - Identifier for the segmented control group
 */
class FigSegmentedControl extends HTMLElement {
  #selectedSegment = null;

  constructor() {
    super();
  }

  connectedCallback() {
    this.name = this.getAttribute("name") || "segmented-control";
    this.addEventListener("click", this.handleClick.bind(this));

    // Ensure at least one segment is selected (default to first)
    requestAnimationFrame(() => {
      const segments = this.querySelectorAll("fig-segment");
      const hasSelected = Array.from(segments).some((s) =>
        s.hasAttribute("selected"),
      );
      if (!hasSelected && segments.length > 0) {
        this.selectedSegment = segments[0];
      }
    });
  }

  get selectedSegment() {
    return this.#selectedSegment;
  }

  set selectedSegment(segment) {
    // Deselect previous
    if (this.#selectedSegment) {
      this.#selectedSegment.removeAttribute("selected");
    }
    // Select new
    this.#selectedSegment = segment;
    if (segment) {
      segment.setAttribute("selected", "true");
    }
  }

  handleClick(event) {
    const target = event.target;
    if (target.nodeName.toLowerCase() === "fig-segment") {
      const segments = this.querySelectorAll("fig-segment");
      for (const segment of segments) {
        if (segment === target) {
          this.selectedSegment = segment;
        } else {
          segment.removeAttribute("selected");
        }
      }
    }
  }
}
customElements.define("fig-segmented-control", FigSegmentedControl);

/* Slider */
/**
 * A custom slider input element.
 * @attr {string} type - The slider type: "range", "hue", "delta", "stepper", or "opacity"
 * @attr {number} value - The current value of the slider
 * @attr {number} min - The minimum value
 * @attr {number} max - The maximum value
 * @attr {number} step - The step increment
 * @attr {boolean} text - Whether to show a text input alongside the slider
 * @attr {string} units - The units to display after the value
 * @attr {number} transform - A multiplier for the displayed value
 * @attr {boolean} disabled - Whether the slider is disabled
 * @attr {string} color - The color for the slider track (for opacity type)
 */
class FigSlider extends HTMLElement {
  // Private fields declarations
  #typeDefaults = {
    range: { min: 0, max: 100, step: 1 },
    hue: { min: 0, max: 255, step: 1 },
    delta: { min: -100, max: 100, step: 1 },
    stepper: { min: 0, max: 100, step: 25 },
    opacity: { min: 0, max: 100, step: 0.1, color: "#FF0000" },
  };

  #boundHandleInput;
  #boundHandleChange;
  #boundHandleTextInput;
  #boundHandleTextChange;

  constructor() {
    super();
    this.initialInnerHTML = this.innerHTML;

    // Bind the event handlers
    this.#boundHandleInput = (e) => {
      e.stopPropagation();
      this.#handleInput();
    };

    this.#boundHandleChange = (e) => {
      e.stopPropagation();
      this.#handleChange();
    };

    this.#boundHandleTextInput = (e) => {
      e.stopPropagation();
      this.#handleTextInput();
    };

    this.#boundHandleTextChange = (e) => {
      e.stopPropagation();
      this.#handleTextChange();
    };
  }

  #regenerateInnerHTML() {
    this.value = Number(this.getAttribute("value") || 0);
    this.type = this.getAttribute("type") || "range";
    this.text = this.getAttribute("text") || false;
    this.units = this.getAttribute("units") || "";
    this.transform = Number(this.getAttribute("transform") || 1);
    this.disabled = this.getAttribute("disabled") ? true : false;

    const defaults = this.#typeDefaults[this.type];
    this.min = Number(this.getAttribute("min") || defaults.min);
    this.max = Number(this.getAttribute("max") || defaults.max);
    this.step = Number(this.getAttribute("step") || defaults.step);
    this.color = this.getAttribute("color") || defaults?.color;
    this.default = this.getAttribute("default") || this.min;

    if (this.color) {
      this.style.setProperty("--color", this.color);
    }

    let html = "";
    let slider = `<div class="fig-slider-input-container" role="group">
                <input 
                    type="range"
                    ${this.disabled ? "disabled" : ""}
                    min="${this.min}"
                    max="${this.max}"
                    step="${this.step}"
                    class="${this.type}"
                    value="${this.value}"
                    aria-valuemin="${this.min}"
                    aria-valuemax="${this.max}"
                    aria-valuenow="${this.value}">
                ${this.initialInnerHTML}
            </div>`;
    if (this.text) {
      html = `${slider}
                    <fig-input-number
                        placeholder="##"
                        min="${this.min}"
                        max="${this.max}"
                        transform="${this.transform}"
                        step="${this.step}"
                        value="${this.value}"
                        ${this.units ? `units="${this.units}"` : ""}>
                    </fig-input-number>`;
    } else {
      html = slider;
    }
    this.innerHTML = html;

    //child nodes hack
    requestAnimationFrame(() => {
      this.input = this.querySelector("[type=range]");
      this.inputContainer = this.querySelector(".fig-slider-input-container");
      this.input.removeEventListener("input", this.#boundHandleInput);
      this.input.addEventListener("input", this.#boundHandleInput);
      this.input.removeEventListener("change", this.#boundHandleChange);
      this.input.addEventListener("change", this.#boundHandleChange);

      if (this.default) {
        this.style.setProperty(
          "--default",
          this.#calculateNormal(this.default),
        );
      }

      this.datalist = this.querySelector("datalist");
      this.figInputNumber = this.querySelector("fig-input-number");
      if (this.datalist) {
        this.inputContainer.append(this.datalist);
        this.datalist.setAttribute(
          "id",
          this.datalist.getAttribute("id") || figUniqueId(),
        );
        this.input.setAttribute("list", this.datalist.getAttribute("id"));
      } else if (this.type === "stepper") {
        this.datalist = document.createElement("datalist");
        this.datalist.setAttribute("id", figUniqueId());
        let steps = (this.max - this.min) / this.step + 1;
        for (let i = 0; i < steps; i++) {
          let option = document.createElement("option");
          option.setAttribute("value", this.min + i * this.step);
          this.datalist.append(option);
        }
        this.inputContainer.append(this.datalist);
        this.input.setAttribute("list", this.datalist.getAttribute("id"));
      } else if (this.type === "delta") {
        this.datalist = document.createElement("datalist");
        this.datalist.setAttribute("id", figUniqueId());
        let option = document.createElement("option");
        option.setAttribute("value", this.default);
        this.datalist.append(option);
        this.inputContainer.append(this.datalist);
        this.input.setAttribute("list", this.datalist.getAttribute("id"));
      }
      if (this.datalist) {
        let defaultOption = this.datalist.querySelector(
          `option[value='${this.default}']`,
        );
        if (defaultOption) {
          defaultOption.setAttribute("default", "true");
        }
      }
      if (this.figInputNumber) {
        this.figInputNumber.removeEventListener(
          "input",
          this.#boundHandleTextInput,
        );
        this.figInputNumber.addEventListener(
          "input",
          this.#boundHandleTextInput,
        );
        this.figInputNumber.removeEventListener(
          "change",
          this.#boundHandleTextChange,
        );
        this.figInputNumber.addEventListener(
          "change",
          this.#boundHandleTextChange,
        );
      }

      this.#syncValue();
    });
  }

  connectedCallback() {
    this.#regenerateInnerHTML();
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("input", this.#boundHandleInput);
      this.input.removeEventListener("change", this.#boundHandleChange);
    }
    if (this.figInputNumber) {
      this.figInputNumber.removeEventListener(
        "input",
        this.#boundHandleTextInput,
      );
      this.figInputNumber.removeEventListener(
        "change",
        this.#boundHandleTextChange,
      );
    }
  }

  #handleTextInput() {
    if (this.figInputNumber) {
      this.value = this.input.value = this.figInputNumber.value;
      this.#syncProperties();
      this.dispatchEvent(
        new CustomEvent("input", { detail: this.value, bubbles: true }),
      );
    }
  }
  #calculateNormal(value) {
    let min = Number(this.min);
    let max = Number(this.max);
    return (Number(value) - min) / (max - min);
  }
  #syncProperties() {
    let complete = this.#calculateNormal(this.value);
    this.style.setProperty("--slider-complete", complete);
    let defaultValue = this.#calculateNormal(this.default);
    this.style.setProperty("--default", defaultValue);
    this.style.setProperty("--unchanged", complete === defaultValue ? 1 : 0);
  }
  #syncValue() {
    let val = this.input.value;
    this.value = val;
    this.#syncProperties();
    // Update ARIA value
    this.input.setAttribute("aria-valuenow", val);
    if (this.figInputNumber) {
      this.figInputNumber.setAttribute("value", val);
    }
  }

  #handleInput() {
    this.#syncValue();
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
  }

  #handleChange() {
    this.#syncValue();
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleTextChange() {
    if (this.figInputNumber) {
      this.value = this.input.value = this.figInputNumber.value;
      this.#syncProperties();
      this.dispatchEvent(
        new CustomEvent("change", { detail: this.value, bubbles: true }),
      );
    }
  }

  static get observedAttributes() {
    return [
      "value",
      "step",
      "min",
      "max",
      "type",
      "disabled",
      "color",
      "units",
      "transform",
    ];
  }

  focus() {
    this.input.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "color":
          this.color = newValue;
          this.style.setProperty("--color", this.color);
          break;
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          if (this.figInputNumber) {
            this.figInputNumber.disabled = this.disabled;
            this.figInputNumber.setAttribute("disabled", this.disabled);
          }
          break;
        case "value":
          this.value = newValue;
          if (this.figInputNumber) {
            this.figInputNumber.setAttribute("value", newValue);
          }
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          if (this.figInputNumber) {
            this.figInputNumber.setAttribute("transform", this.transform);
          }
          break;
        case "min":
        case "max":
        case "step":
        case "type":
        case "text":
        case "units":
          this[name] = newValue;
          this.#regenerateInnerHTML();
          break;
        default:
          this[name] = this.input[name] = newValue;
          this.#syncValue();
          break;
      }
    }
  }
}
customElements.define("fig-slider", FigSlider);

/**
 * A custom text input element.
 * @attr {string} type - Input type: "text" (default) or "number"
 * @attr {string} value - The current input value
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {boolean} multiline - Whether to use a textarea instead of input
 * @attr {number} min - Minimum value (for number type)
 * @attr {number} max - Maximum value (for number type)
 * @attr {number} step - Step increment (for number type)
 * @attr {number} transform - A multiplier for displayed number values
 */
class FigInputText extends HTMLElement {
  #boundMouseMove;
  #boundMouseUp;
  #boundMouseDown;
  #boundInputChange;

  constructor() {
    super();
    // Pre-bind the event handlers once
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = this.#handleMouseUp.bind(this);
    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundInputChange = (e) => {
      e.stopPropagation();
      this.#handleInputChange(e);
    };
  }

  connectedCallback() {
    this.multiline = this.hasAttribute("multiline") || false;
    this.value = this.getAttribute("value") || "";
    this.type = this.getAttribute("type") || "text";
    this.placeholder = this.getAttribute("placeholder") || "";
    this.name = this.getAttribute("name") || null;

    if (this.type === "number") {
      if (this.getAttribute("step")) {
        this.step = Number(this.getAttribute("step"));
      }
      if (this.getAttribute("min")) {
        this.min = Number(this.getAttribute("min"));
      }
      if (this.getAttribute("max")) {
        this.max = Number(this.getAttribute("max"));
      }
      this.transform = Number(this.getAttribute("transform") || 1);
      if (this.getAttribute("value")) {
        this.value = Number(this.value);
      }
    }

    let html = `<input 
      type="${this.type}" 
      ${this.name ? `name="${this.name}"` : ""}
      placeholder="${this.placeholder}"
      value="${
        this.type === "number" ? this.#transformNumber(this.value) : this.value
      }" />`;
    if (this.multiline) {
      html = `<textarea  
      placeholder="${this.placeholder}">${this.value}</textarea>`;
    }

    //child nodes hack
    requestAnimationFrame(() => {
      let append = this.querySelector("[slot=append]");
      let prepend = this.querySelector("[slot=prepend]");

      this.innerHTML = html;

      if (prepend) {
        prepend.addEventListener("click", this.focus.bind(this));
        this.prepend(prepend);
      }
      if (append) {
        append.addEventListener("click", this.focus.bind(this));
        this.append(append);
      }

      this.input = this.querySelector("input,textarea");

      if (this.type === "number") {
        if (this.getAttribute("min")) {
          this.input.setAttribute("min", this.#transformNumber(this.min));
        }
        if (this.getAttribute("max")) {
          this.input.setAttribute("max", this.#transformNumber(this.max));
        }
        if (this.getAttribute("step")) {
          this.input.setAttribute("step", this.#transformNumber(this.step));
        }
        this.addEventListener("pointerdown", this.#boundMouseDown);
      }
      this.input.removeEventListener("change", this.#boundInputChange);
      this.input.addEventListener("change", this.#boundInputChange);
    });
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("change", this.#boundInputChange);
    }
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
  }

  focus() {
    this.input.focus();
  }
  #transformNumber(value) {
    if (value === "") return "";
    let transformed = Number(value) * (this.transform || 1);
    transformed = this.#formatNumber(transformed);
    return transformed;
  }
  #handleInputChange(e) {
    e.stopPropagation();
    let value = e.target.value;
    let valueTransformed = value;
    if (this.type === "number") {
      value = value / (this.transform || 1);
      value = this.#sanitizeInput(value, false);
      valueTransformed = value * (this.transform || 1);
    }
    this.value = value;
    this.input.value = valueTransformed;
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }
  #handleMouseMove(e) {
    if (this.type !== "number") return;
    if (e.altKey) {
      let step = (this.step || 1) * e.movementX;
      let value = Number(this.input.value);
      value = value / (this.transform || 1) + step;
      value = this.#sanitizeInput(value, false);
      let valueTransformed = value * (this.transform || 1);
      value = this.#formatNumber(value);
      valueTransformed = this.#formatNumber(valueTransformed);
      this.value = value;
      this.input.value = valueTransformed;
      this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
      this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
    }
  }
  #handleMouseDown(e) {
    if (this.type !== "number") return;
    if (e.altKey) {
      this.input.style.cursor =
        this.style.cursor =
        document.body.style.cursor =
          "ew-resize";
      this.style.userSelect = "none";
      // Use the pre-bound handlers
      window.addEventListener("pointermove", this.#boundMouseMove);
      window.addEventListener("pointerup", this.#boundMouseUp);
    }
  }
  #handleMouseUp(e) {
    if (this.type !== "number") return;
    this.input.style.cursor =
      this.style.cursor =
      document.body.style.cursor =
        "";
    this.style.userSelect = "all";
    // Remove the pre-bound handlers
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
  }
  #sanitizeInput(value, transform = true) {
    let sanitized = value;
    if (this.type === "number") {
      sanitized = Number(sanitized);
      if (typeof this.min === "number") {
        sanitized = Math.max(
          transform ? this.#transformNumber(this.min) : this.min,
          sanitized,
        );
      }
      if (typeof this.max === "number") {
        sanitized = Math.min(
          transform ? this.#transformNumber(this.max) : this.max,
          sanitized,
        );
      }

      sanitized = this.#formatNumber(sanitized);
    }
    return sanitized;
  }
  #formatNumber(num, precision = 2) {
    // Check if the number has any decimal places after rounding
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(precision);
  }

  /*
  get value() {
    return this.value;
  }

  set value(val) {
    this.value = val;
    this.setAttribute("value", val);
  }*/

  static get observedAttributes() {
    return [
      "value",
      "placeholder",
      "label",
      "disabled",
      "type",
      "step",
      "min",
      "max",
      "transform",
      "name",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          break;
        case "transform":
          if (this.type === "number") {
            this.transform = Number(newValue) || 1;
            this.input.value = this.#transformNumber(this.value);
          }
          break;
        case "value":
          let value = newValue;
          if (this.type === "number") {
            value = this.#sanitizeInput(value, false);
            this.value = value;
            this.input.value = this.#transformNumber(value);
          } else {
            this.value = value;
            this.input.value = value;
          }
          break;
        case "min":
        case "max":
        case "step":
          this[name] = this.input[name] = Number(newValue);
          if (this.input) {
            this.input.setAttribute(name, newValue);
          }
          break;
        case "name":
          this[name] = this.input[name] = newValue;
          this.input.setAttribute("name", newValue);
          break;
        default:
          this[name] = this.input[name] = newValue;
          break;
      }
    }
  }
}
customElements.define("fig-input-text", FigInputText);

/**
 * A custom numeric input element that uses type="text" with inputmode="decimal".
 * Supports units display and all standard number input attributes.
 * @attr {string} value - The current numeric value
 * @attr {string} placeholder - Placeholder text
 * @attr {boolean} disabled - Whether the input is disabled
 * @attr {number} min - Minimum value
 * @attr {number} max - Maximum value
 * @attr {number} step - Step increment
 * @attr {number} transform - A multiplier for displayed number values
 * @attr {string} units - Unit string to append/prepend to displayed value (e.g., "%", "°", "$")
 * @attr {string} unit-position - Position of unit: "suffix" (default) or "prefix"
 * @attr {string} name - Form field name
 */
class FigInputNumber extends HTMLElement {
  #boundMouseMove;
  #boundMouseUp;
  #boundMouseDown;
  #boundInputChange;
  #boundInput;
  #boundFocus;
  #boundBlur;
  #boundKeyDown;
  #units;
  #unitPosition;

  constructor() {
    super();
    // Pre-bind the event handlers once
    this.#boundMouseMove = this.#handleMouseMove.bind(this);
    this.#boundMouseUp = this.#handleMouseUp.bind(this);
    this.#boundMouseDown = this.#handleMouseDown.bind(this);
    this.#boundInputChange = (e) => {
      e.stopPropagation();
      this.#handleInputChange(e);
    };
    this.#boundInput = (e) => {
      e.stopPropagation();
      this.#handleInput(e);
    };
    this.#boundFocus = (e) => {
      this.#handleFocus(e);
    };
    this.#boundBlur = (e) => {
      this.#handleBlur(e);
    };
    this.#boundKeyDown = (e) => {
      this.#handleKeyDown(e);
    };
  }

  connectedCallback() {
    const valueAttr = this.getAttribute("value");
    this.value =
      valueAttr !== null && valueAttr !== "" ? Number(valueAttr) : "";
    this.placeholder = this.getAttribute("placeholder") || "";
    this.name = this.getAttribute("name") || null;
    this.#units = this.getAttribute("units") || "";
    this.#unitPosition = this.getAttribute("unit-position") || "suffix";

    if (this.getAttribute("step")) {
      this.step = Number(this.getAttribute("step"));
    }
    if (this.getAttribute("min")) {
      this.min = Number(this.getAttribute("min"));
    }
    if (this.getAttribute("max")) {
      this.max = Number(this.getAttribute("max"));
    }
    this.transform = Number(this.getAttribute("transform") || 1);

    let html = `<input 
      type="text"
      inputmode="decimal"
      ${this.name ? `name="${this.name}"` : ""}
      placeholder="${this.placeholder}"
      value="${this.#formatWithUnit(this.value)}" />`;

    //child nodes hack
    requestAnimationFrame(() => {
      let append = this.querySelector("[slot=append]");
      let prepend = this.querySelector("[slot=prepend]");

      this.innerHTML = html;

      if (prepend) {
        prepend.addEventListener("click", this.focus.bind(this));
        this.prepend(prepend);
      }
      if (append) {
        append.addEventListener("click", this.focus.bind(this));
        this.append(append);
      }

      this.input = this.querySelector("input");

      if (this.getAttribute("min")) {
        this.min = Number(this.getAttribute("min"));
      }
      if (this.getAttribute("max")) {
        this.max = Number(this.getAttribute("max"));
      }
      if (this.getAttribute("step")) {
        this.step = Number(this.getAttribute("step"));
      }

      // Set disabled state if present
      if (this.hasAttribute("disabled")) {
        const disabledAttr = this.getAttribute("disabled");
        this.disabled = this.input.disabled = disabledAttr !== "false";
      }

      this.addEventListener("pointerdown", this.#boundMouseDown);
      this.input.removeEventListener("change", this.#boundInputChange);
      this.input.addEventListener("change", this.#boundInputChange);
      this.input.removeEventListener("input", this.#boundInput);
      this.input.addEventListener("input", this.#boundInput);
      this.input.removeEventListener("focus", this.#boundFocus);
      this.input.addEventListener("focus", this.#boundFocus);
      this.input.removeEventListener("blur", this.#boundBlur);
      this.input.addEventListener("blur", this.#boundBlur);
      this.input.removeEventListener("keydown", this.#boundKeyDown);
      this.input.addEventListener("keydown", this.#boundKeyDown);
    });
  }

  disconnectedCallback() {
    if (this.input) {
      this.input.removeEventListener("change", this.#boundInputChange);
      this.input.removeEventListener("input", this.#boundInput);
      this.input.removeEventListener("focus", this.#boundFocus);
      this.input.removeEventListener("blur", this.#boundBlur);
      this.input.removeEventListener("keydown", this.#boundKeyDown);
    }
    this.removeEventListener("pointerdown", this.#boundMouseDown);
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
  }

  focus() {
    this.input.focus();
  }

  #getNumericValue(str) {
    if (!str) return "";
    if (!this.#units) {
      // No units, just extract numeric value
      let value = str.replace(/[^\d.-]/g, "");
      // Prevent multiple decimal points
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }
      return value;
    }
    let value = str.replace(this.#units, "").trim();
    value = value.replace(/[^\d.-]/g, "");
    // Prevent multiple decimal points
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }
    return value;
  }

  #formatWithUnit(numericValue) {
    if (
      numericValue === "" ||
      numericValue === null ||
      numericValue === undefined
    )
      return "";
    // numericValue is the internal (non-transformed) value
    // For display, we apply transform and format
    let displayValue = Number(numericValue) * (this.transform || 1);
    if (isNaN(displayValue)) return "";
    displayValue = this.#formatNumber(displayValue);
    if (!this.#units) return displayValue.toString();
    if (this.#unitPosition === "prefix") {
      return this.#units + displayValue;
    } else {
      return displayValue + this.#units;
    }
  }

  #transformNumber(value) {
    if (value === "" || value === null || value === undefined) return "";
    let transformed = Number(value) * (this.transform || 1);
    transformed = this.#formatNumber(transformed);
    return transformed.toString();
  }

  #handleFocus(e) {
    setTimeout(() => {
      const value = e.target.value;
      if (value && this.#units) {
        if (this.#unitPosition === "prefix") {
          e.target.setSelectionRange(this.#units.length, value.length);
        } else {
          const unitPos = value.indexOf(this.#units);
          if (unitPos > -1) {
            e.target.setSelectionRange(0, unitPos);
          }
        }
      }
    }, 0);
  }

  #handleBlur(e) {
    let numericValue = this.#getNumericValue(e.target.value);
    if (numericValue !== "") {
      let val = Number(numericValue) / (this.transform || 1);
      val = this.#sanitizeInput(val, false);
      this.value = val;
      e.target.value = this.#formatWithUnit(this.value);
    } else {
      this.value = "";
      e.target.value = "";
    }
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleKeyDown(e) {
    if (this.disabled) return;

    // Only handle arrow up/down
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

    e.preventDefault();

    const step = this.step || 1;
    // Shift multiplies step by 10
    const multiplier = e.shiftKey ? 10 : 1;
    const delta = step * multiplier * (e.key === "ArrowUp" ? 1 : -1);

    let numericValue = this.#getNumericValue(this.input.value);
    let value =
      (numericValue !== "" ? Number(numericValue) / (this.transform || 1) : 0) +
      delta;
    value = this.#sanitizeInput(value, false);
    this.value = value;
    this.input.value = this.#formatWithUnit(this.value);

    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleInput(e) {
    let numericValue = this.#getNumericValue(e.target.value);
    if (numericValue !== "") {
      this.value = Number(numericValue) / (this.transform || 1);
    } else {
      this.value = "";
    }
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
  }

  #handleInputChange(e) {
    e.stopPropagation();
    let numericValue = this.#getNumericValue(e.target.value);
    if (numericValue !== "") {
      let val = Number(numericValue) / (this.transform || 1);
      val = this.#sanitizeInput(val, false);
      this.value = val;
      e.target.value = this.#formatWithUnit(this.value);
    } else {
      this.value = "";
      e.target.value = "";
    }
    this.dispatchEvent(
      new CustomEvent("input", { detail: this.value, bubbles: true }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.value, bubbles: true }),
    );
  }

  #handleMouseMove(e) {
    if (this.disabled) return;
    if (e.altKey) {
      let step = (this.step || 1) * e.movementX;
      let numericValue = this.#getNumericValue(this.input.value);
      let value = Number(numericValue) / (this.transform || 1) + step;
      value = this.#sanitizeInput(value, false);
      this.value = value;
      this.input.value = this.#formatWithUnit(this.value);
      this.dispatchEvent(new CustomEvent("input", { bubbles: true }));
      this.dispatchEvent(new CustomEvent("change", { bubbles: true }));
    }
  }

  #handleMouseDown(e) {
    if (this.disabled) return;
    if (e.altKey) {
      this.input.style.cursor =
        this.style.cursor =
        document.body.style.cursor =
          "ew-resize";
      this.style.userSelect = "none";
      // Use the pre-bound handlers
      window.addEventListener("pointermove", this.#boundMouseMove);
      window.addEventListener("pointerup", this.#boundMouseUp);
    }
  }

  #handleMouseUp(e) {
    this.input.style.cursor =
      this.style.cursor =
      document.body.style.cursor =
        "";
    this.style.userSelect = "all";
    // Remove the pre-bound handlers
    window.removeEventListener("pointermove", this.#boundMouseMove);
    window.removeEventListener("pointerup", this.#boundMouseUp);
  }

  #sanitizeInput(value, transform = true) {
    let sanitized = Number(value);
    if (isNaN(sanitized)) return "";
    if (typeof this.min === "number") {
      sanitized = Math.max(this.min, sanitized);
    }
    if (typeof this.max === "number") {
      sanitized = Math.min(this.max, sanitized);
    }
    sanitized = this.#formatNumber(sanitized);
    return sanitized;
  }

  #formatNumber(num, precision = 2) {
    // Check if the number has any decimal places after rounding
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(precision);
  }

  static get observedAttributes() {
    return [
      "value",
      "placeholder",
      "disabled",
      "step",
      "min",
      "max",
      "transform",
      "name",
      "units",
      "unit-position",
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.input) {
      switch (name) {
        case "disabled":
          this.disabled = this.input.disabled =
            newValue !== null && newValue !== "false";
          break;
        case "units":
          this.#units = newValue || "";
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "unit-position":
          this.#unitPosition = newValue || "suffix";
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "transform":
          this.transform = Number(newValue) || 1;
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "value":
          let value =
            newValue !== null && newValue !== "" ? Number(newValue) : "";
          if (value !== "") {
            value = this.#sanitizeInput(value, false);
          }
          this.value = value;
          this.input.value = this.#formatWithUnit(this.value);
          break;
        case "min":
        case "max":
        case "step":
          this[name] = Number(newValue);
          break;
        case "name":
          this[name] = this.input[name] = newValue;
          this.input.setAttribute("name", newValue);
          break;
        default:
          this[name] = this.input[name] = newValue;
          break;
      }
    }
  }
}
customElements.define("fig-input-number", FigInputNumber);

/* Avatar */
class FigAvatar extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.src = this.getAttribute("src");
    this.name = this.getAttribute("name");
    this.initials = this.getInitials(this.name);
    this.setAttribute("initials", this.initials);
    this.setSrc(this.src);
    requestAnimationFrame(() => {
      this.img = this.querySelector("img");
    });
  }
  setSrc(src) {
    this.src = src;
    if (src) {
      this.innerHTML = `<img src="${this.src}" ${
        this.name ? `alt="${this.name}"` : ""
      } />`;
    }
  }
  getInitials(name) {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
      : "";
  }
  static get observedAttributes() {
    return ["src", "href", "name"];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    this[name] = newValue;
    if (name === "name") {
      this.img?.setAttribute("alt", newValue);
      this.name = newValue;
      this.initials = this.getInitials(this.name);
      this.setAttribute("initials", this.initials);
    } else if (name === "src") {
      this.src = newValue;
      this.setSrc(this.src);
    }
  }
}
customElements.define("fig-avatar", FigAvatar);

/* Form Field */
class FigField extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["label"];
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      this.label = this.querySelector(":scope>label");
      this.input = Array.from(this.childNodes).find((node) =>
        node.nodeName.toLowerCase().startsWith("fig-"),
      );
      if (this.input && this.label) {
        this.label.addEventListener("click", this.focus.bind(this));
        let inputId = this.input.getAttribute("id") || figUniqueId();
        this.input.setAttribute("id", inputId);
        this.label.setAttribute("for", inputId);
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (this.label) {
          this.label.textContent = newValue;
        }
        break;
    }
  }

  focus() {
    this.input.focus();
  }
}
customElements.define("fig-field", FigField);

/* Color swatch */
class FigInputColor extends HTMLElement {
  rgba;
  hex;
  alpha = 100;
  #swatch;
  #fillPicker;
  #textInput;
  #alphaInput;
  constructor() {
    super();
  }

  get picker() {
    return this.getAttribute("picker") || "native";
  }

  connectedCallback() {
    this.#setValues(this.getAttribute("value"));

    const useFigmaPicker = this.picker === "figma";
    const hidePicker = this.picker === "false";
    const showAlpha = this.getAttribute("alpha") === "true";

    let html = ``;
    if (this.getAttribute("text")) {
      // Display without # prefix
      let label = `<fig-input-text 
        type="text"
        placeholder="000000"
        value="${this.hexOpaque.slice(1).toUpperCase()}">
      </fig-input-text>`;
      if (showAlpha) {
        label += `<fig-tooltip text="Opacity">
                    <fig-input-number 
                        placeholder="##" 
                        min="0"
                        max="100"
                        value="${this.alpha}"
                        units="%">
                    </fig-input-number>
                </fig-tooltip>`;
      }

      let swatchElement = "";
      if (!hidePicker) {
        swatchElement = useFigmaPicker
          ? `<fig-fill-picker mode="solid" ${
              showAlpha ? "" : 'alpha="false"'
            } value='{"type":"solid","color":"${this.hexOpaque}","opacity":${
              this.alpha
            }}'></fig-fill-picker>`
          : `<fig-chit background="${this.hexOpaque}" alpha="${this.rgba.a}"></fig-chit>`;
      }

      html = `<div class="input-combo">
                ${swatchElement}
                ${label}
            </div>`;
    } else {
      // Without text, if picker is hidden, show nothing
      if (hidePicker) {
        html = ``;
      } else {
        html = useFigmaPicker
          ? `<fig-fill-picker mode="solid" ${
              showAlpha ? "" : 'alpha="false"'
            } value='{"type":"solid","color":"${this.hexOpaque}","opacity":${
              this.alpha
            }}'></fig-fill-picker>`
          : `<fig-chit background="${this.hexOpaque}" alpha="${this.rgba.a}"></fig-chit>`;
      }
    }
    this.innerHTML = html;

    requestAnimationFrame(() => {
      this.#swatch = this.querySelector("fig-chit");
      this.#fillPicker = this.querySelector("fig-fill-picker");
      this.#textInput = this.querySelector("fig-input-text:not([type=number])");
      this.#alphaInput = this.querySelector("fig-input-number");

      // Setup swatch (native picker)
      if (this.#swatch) {
        this.#swatch.disabled = this.hasAttribute("disabled");
        this.#swatch.addEventListener("input", this.#handleInput.bind(this));
      }

      // Setup fill picker (figma picker)
      if (this.#fillPicker) {
        if (this.hasAttribute("disabled")) {
          this.#fillPicker.setAttribute("disabled", "");
        }
        this.#fillPicker.addEventListener(
          "input",
          this.#handleFillPickerInput.bind(this),
        );
        this.#fillPicker.addEventListener(
          "change",
          this.#handleChange.bind(this),
        );
      }

      if (this.#textInput) {
        const hex = this.rgbAlphaToHex(this.rgba, 1);
        // Display without # prefix
        this.#textInput.value = hex.slice(1).toUpperCase();
        if (this.#swatch) {
          this.#swatch.background = hex;
        }
        this.#textInput.addEventListener(
          "input",
          this.#handleTextInput.bind(this),
        );
        this.#textInput.addEventListener(
          "change",
          this.#handleChange.bind(this),
        );
      }

      if (this.#alphaInput) {
        this.#alphaInput.addEventListener(
          "input",
          this.#handleAlphaInput.bind(this),
        );
        this.#alphaInput.addEventListener(
          "change",
          this.#handleChange.bind(this),
        );
      }
    });
  }
  #setValues(hexValue) {
    this.rgba = this.convertToRGBA(hexValue);
    this.value = this.rgbAlphaToHex(
      {
        r: isNaN(this.rgba.r) ? 0 : this.rgba.r,
        g: isNaN(this.rgba.g) ? 0 : this.rgba.g,
        b: isNaN(this.rgba.b) ? 0 : this.rgba.b,
      },
      this.rgba.a,
    );
    this.hexWithAlpha = this.value.toUpperCase();
    this.hexOpaque = this.hexWithAlpha.slice(0, 7);
    if (hexValue.length > 7) {
      this.alpha = (this.rgba.a * 100).toFixed(0);
    }
    this.style.setProperty("--alpha", this.rgba.a);
  }

  #handleTextInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    // Add # prefix if not present for internal processing
    let inputValue = event.target.value.replace("#", "");
    this.#setValues("#" + inputValue);
    if (this.#alphaInput) {
      this.#alphaInput.setAttribute("value", this.alpha);
    }
    if (this.#swatch) {
      this.#swatch.setAttribute("background", this.hexOpaque);
    }
    this.#emitInputEvent();
  }

  #handleAlphaInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    // fig-input-number stores numeric value internally, ensure it's a number
    const alphaValue = Number(event.target.value) || 0;
    const alpha = Math.round((alphaValue / 100) * 255);
    const alphaHex = alpha.toString(16).padStart(2, "0");
    this.#setValues(this.hexOpaque + alphaHex);
    if (this.#swatch) {
      this.#swatch.setAttribute("alpha", this.rgba.a);
    }
    if (this.#fillPicker) {
      this.#fillPicker.setAttribute(
        "value",
        JSON.stringify({
          type: "solid",
          color: this.hexOpaque,
          opacity: this.alpha,
        }),
      );
    }
    this.#emitInputEvent();
  }

  #handleChange(event) {
    event.stopPropagation();
    this.#emitChangeEvent();
  }

  focus() {
    this.#swatch.focus();
  }

  #handleInput(event) {
    //do not propagate to onInput handler for web component
    event.stopPropagation();
    this.#setValues(event.target.value);
    if (this.#textInput) {
      // Display without # prefix
      this.#textInput.setAttribute(
        "value",
        this.hexOpaque.slice(1).toUpperCase(),
      );
    }
    this.#emitInputEvent();
  }

  #handleFillPickerInput(event) {
    event.stopPropagation();
    const detail = event.detail;
    if (detail && detail.color) {
      // Build hex value with alpha included
      let hexValue = detail.color;
      if (detail.alpha !== undefined) {
        const alphaHex = Math.round(detail.alpha * 255)
          .toString(16)
          .padStart(2, "0");
        hexValue = detail.color + alphaHex;
      }
      this.#setValues(hexValue);
      if (this.#textInput) {
        this.#textInput.setAttribute(
          "value",
          this.hexOpaque.slice(1).toUpperCase(),
        );
      }
      if (this.#alphaInput && detail.alpha !== undefined) {
        this.#alphaInput.setAttribute("value", Math.round(detail.alpha * 100));
      }
      if (this.#swatch) {
        this.#swatch.setAttribute("background", this.hexOpaque);
        this.#swatch.setAttribute("alpha", this.rgba.a);
      }
      this.#emitInputEvent();
    }
  }

  #emitInputEvent() {
    const e = new CustomEvent("input", {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(e);
  }
  #emitChangeEvent() {
    const e = new CustomEvent("change", {
      bubbles: true,
      cancelable: true,
    });
    this.dispatchEvent(e);
  }

  static get observedAttributes() {
    return ["value", "style", "mode", "picker"];
  }

  get mode() {
    return this.getAttribute("mode");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Skip if value hasn't actually changed
    if (oldValue === newValue) return;

    switch (name) {
      case "value":
        this.#setValues(newValue);
        if (this.#textInput) {
          this.#textInput.setAttribute("value", this.value);
        }
        if (this.#swatch) {
          this.#swatch.setAttribute("background", this.hexOpaque);
          this.#swatch.setAttribute("alpha", this.rgba.a);
        }
        if (this.#fillPicker) {
          this.#fillPicker.setAttribute(
            "value",
            JSON.stringify({
              type: "solid",
              color: this.hexOpaque,
              opacity: this.alpha,
            }),
          );
        }
        if (this.#alphaInput) {
          this.#alphaInput.setAttribute("value", this.alpha);
        }
        // NOTE: Do NOT emit input events here!
        // Input events should only fire from user interactions, not programmatic changes.
        // Emitting here causes infinite loops with React and other frameworks.
        break;
      case "mode":
        // Mode attribute is passed through to fig-fill-picker when used
        if (this.#fillPicker && newValue) {
          this.#fillPicker.setAttribute("mode", newValue);
        }
        break;
      case "picker":
        // Picker type change requires re-render
        break;
    }
  }

  rgbAlphaToHex({ r, g, b }, a = 1) {
    // Ensure r, g, b are integers between 0 and 255
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    // Ensure alpha is between 0 and 1
    a = Math.max(0, Math.min(1, a));

    // Convert to hex and pad with zeros if necessary
    const hexR = r.toString(16).padStart(2, "0");
    const hexG = g.toString(16).padStart(2, "0");
    const hexB = b.toString(16).padStart(2, "0");

    // If alpha is 1, return 6-digit hex
    if (a === 1) {
      return `#${hexR}${hexG}${hexB}`.toUpperCase();
    }

    // Otherwise, include alpha in 8-digit hex
    const alpha = Math.round(a * 255);
    const hexA = alpha.toString(16).padStart(2, "0");
    return `#${hexR}${hexG}${hexB}${hexA}`.toUpperCase();
  }

  convertToRGBA(color) {
    let r,
      g,
      b,
      a = 1;

    // Handle hex colors
    if (color.startsWith("#")) {
      let hex = color.slice(1);
      if (hex.length === 8) {
        a = parseInt(hex.slice(6), 16) / 255;
        hex = hex.slice(0, 6);
      }
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    // Handle rgba colors
    else if (color.startsWith("rgba") || color.startsWith("rgb")) {
      let matches = color.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/,
      );
      if (matches) {
        r = parseInt(matches[1]);
        g = parseInt(matches[2]);
        b = parseInt(matches[3]);
        a = matches[4] ? parseFloat(matches[4]) : 1;
      }
    }
    // Handle hsla colors
    else if (color.startsWith("hsla") || color.startsWith("hsl")) {
      let matches = color.match(
        /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*(\d+(?:\.\d+)?))?\)/,
      );
      if (matches) {
        let h = parseInt(matches[1]) / 360;
        let s = parseInt(matches[2]) / 100;
        let l = parseInt(matches[3]) / 100;
        a = matches[4] ? parseFloat(matches[4]) : 1;

        if (s === 0) {
          r = g = b = l; // achromatic
        } else {
          let hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          let p = 2 * l - q;
          r = hue2rgb(p, q, h + 1 / 3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1 / 3);
        }

        r = Math.round(r * 255);
        g = Math.round(g * 255);
        b = Math.round(b * 255);
      }
    }
    // If it's not recognized, return null
    else {
      return null;
    }

    return { r, g, b, a };
  }
}
customElements.define("fig-input-color", FigInputColor);

/* Input Fill */
/**
 * A fill input that supports solid colors, gradients, images, and videos.
 * @attr {string} value - JSON string with fill data
 * @attr {boolean} disabled - Whether the input is disabled
 * @fires input - When the fill value changes
 * @fires change - When the fill value is committed
 */
class FigInputFill extends HTMLElement {
  #fillType = "solid";
  #fillPicker;
  #opacityInput;
  #hexInput;

  // Fill data storage
  #solid = { color: "#D9D9D9", alpha: 1 };
  #gradient = {
    type: "linear",
    angle: 180,
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };
  #image = { url: null, scaleMode: "fill", scale: 50, opacity: 1 };
  #video = { url: null, scaleMode: "fill", opacity: 1 };
  #webcam = { snapshot: null, opacity: 1 };

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "disabled"];
  }

  connectedCallback() {
    this.#parseValue();
    this.#render();
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;

    try {
      const parsed = JSON.parse(valueAttr);
      if (parsed.type) this.#fillType = parsed.type;

      switch (this.#fillType) {
        case "solid":
          if (parsed.color) this.#solid.color = parsed.color;
          if (parsed.alpha !== undefined) this.#solid.alpha = parsed.alpha;
          if (parsed.opacity !== undefined)
            this.#solid.alpha = parsed.opacity / 100;
          break;
        case "gradient":
          if (parsed.gradient)
            this.#gradient = { ...this.#gradient, ...parsed.gradient };
          break;
        case "image":
          if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
          break;
        case "video":
          if (parsed.video) this.#video = { ...this.#video, ...parsed.video };
          break;
        case "webcam":
          if (parsed.webcam)
            this.#webcam = { ...this.#webcam, ...parsed.webcam };
          if (parsed.opacity !== undefined)
            this.#webcam.opacity = parsed.opacity;
          break;
      }
    } catch (e) {
      // If not JSON, treat as hex color
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#solid.color = valueAttr.slice(0, 7);
        if (valueAttr.length > 7) {
          const alphaHex = valueAttr.slice(7, 9);
          this.#solid.alpha = parseInt(alphaHex, 16) / 255;
        }
      }
    }
  }

  #render() {
    const disabled = this.hasAttribute("disabled");
    const fillPickerValue = JSON.stringify(this.value);

    let controlsHtml = "";

    switch (this.#fillType) {
      case "solid":
        controlsHtml = `
          <fig-input-text 
            type="text"
            class="fig-input-fill-hex"
            placeholder="000000"
            value="${this.#solid.color.slice(1).toUpperCase()}"
            ${disabled ? "disabled" : ""}>
          </fig-input-text>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round(this.#solid.alpha * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;

      case "gradient":
        const gradientLabel =
          this.#gradient.type.charAt(0).toUpperCase() +
          this.#gradient.type.slice(1);
        controlsHtml = `
          <label class="fig-input-fill-label">${gradientLabel}</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${this.#gradient.stops[0]?.opacity || 100}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;

      case "image":
        controlsHtml = `
          <label class="fig-input-fill-label">Image</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#image.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;

      case "video":
        controlsHtml = `
          <label class="fig-input-fill-label">Video</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#video.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;

      case "webcam":
        controlsHtml = `
          <label class="fig-input-fill-label">Webcam</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#webcam.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
    }

    this.innerHTML = `
      <div class="input-combo">
        <fig-fill-picker value='${fillPickerValue}' ${disabled ? "disabled" : ""}></fig-fill-picker>
        ${controlsHtml}
      </div>`;

    this.#setupEventListeners();
  }

  #setupEventListeners() {
    requestAnimationFrame(() => {
      this.#fillPicker = this.querySelector("fig-fill-picker");
      this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
      this.#hexInput = this.querySelector(".fig-input-fill-hex");
      const label = this.querySelector(".fig-input-fill-label");

      // Label click triggers fill picker
      if (label && this.#fillPicker) {
        label.addEventListener("click", () => {
          const chit = this.#fillPicker.querySelector("fig-chit");
          if (chit) {
            chit.click();
          }
        });
      }

      if (this.#fillPicker) {
        this.#fillPicker.addEventListener("input", (e) => {
          e.stopPropagation();
          const detail = e.detail;
          if (!detail) return;

          const newType = detail.type;
          const typeChanged = newType !== this.#fillType;

          // Update internal state
          this.#fillType = newType;
          switch (newType) {
            case "solid":
              this.#solid.color = detail.color;
              this.#solid.alpha = detail.alpha;
              break;
            case "gradient":
              if (detail.gradient) this.#gradient = detail.gradient;
              break;
            case "image":
              if (detail.image) this.#image = detail.image;
              break;
            case "video":
              if (detail.video) this.#video = detail.video;
              break;
          }

          // Update controls (don't re-render to keep dialog open)
          if (typeChanged) {
            this.#updateControlsForType();
          } else {
            this.#updateControls();
          }

          this.#emitInput();
        });

        this.#fillPicker.addEventListener("change", (e) => {
          e.stopPropagation();
          this.#emitChange();
        });
      }

      // Hex input (solid only)
      if (this.#hexInput) {
        this.#hexInput.addEventListener("input", (e) => {
          e.stopPropagation();
          const hex = "#" + e.target.value.replace("#", "");
          this.#solid.color = hex;
          this.#updateFillPicker();
          this.#emitInput();
        });
        this.#hexInput.addEventListener("change", (e) => {
          e.stopPropagation();
          this.#emitChange();
        });
      }

      // Opacity input (all fill types)
      if (this.#opacityInput) {
        this.#opacityInput.addEventListener("input", (e) => {
          e.stopPropagation();
          const parsed = parseFloat(e.target.value);
          const opacity = isNaN(parsed) ? 100 : parsed;
          const alpha = opacity / 100;
          switch (this.#fillType) {
            case "solid":
              this.#solid.alpha = alpha;
              break;
            case "gradient":
              // Apply to all stops
              this.#gradient.stops.forEach((stop) => {
                stop.opacity = opacity;
              });
              break;
            case "image":
              this.#image.opacity = alpha;
              break;
            case "video":
              this.#video.opacity = alpha;
              break;
            case "webcam":
              this.#webcam.opacity = alpha;
              break;
          }
          this.#updateFillPicker();
          // Update the chit's alpha
          this.#updateChitAlpha(alpha);
          this.#emitInput();
        });
        this.#opacityInput.addEventListener("change", (e) => {
          e.stopPropagation();
          this.#emitChange();
        });
      }
    });
  }

  #updateControls() {
    // Update UI controls without full re-render
    switch (this.#fillType) {
      case "solid":
        if (this.#hexInput) {
          this.#hexInput.setAttribute(
            "value",
            this.#solid.color.slice(1).toUpperCase(),
          );
        }
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round(this.#solid.alpha * 100),
          );
        }
        break;
      case "gradient":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            this.#gradient.stops[0]?.opacity || 100,
          );
        }
        break;
      case "image":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#image.opacity ?? 1) * 100),
          );
        }
        break;
      case "video":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#video.opacity ?? 1) * 100),
          );
        }
        break;
      case "webcam":
        if (this.#opacityInput) {
          this.#opacityInput.setAttribute(
            "value",
            Math.round((this.#webcam.opacity ?? 1) * 100),
          );
        }
        break;
    }
  }

  #updateControlsForType() {
    // Update only the controls (not the fill picker) when type changes
    const disabled = this.hasAttribute("disabled");
    const combo = this.querySelector(".input-combo");
    if (!combo) return;

    // Remove old controls (keep the fill picker)
    const oldLabel = combo.querySelector(".fig-input-fill-label");
    const oldHex = combo.querySelector(".fig-input-fill-hex");
    const oldOpacity = combo.querySelector(".fig-input-fill-opacity");
    const oldTooltips = combo.querySelectorAll("fig-tooltip");

    oldLabel?.remove();
    oldHex?.remove();
    oldTooltips.forEach((t) => t.remove());

    // Generate new controls HTML
    let controlsHtml = "";
    switch (this.#fillType) {
      case "solid":
        controlsHtml = `
          <fig-input-text 
            type="text"
            class="fig-input-fill-hex"
            placeholder="000000"
            value="${this.#solid.color.slice(1).toUpperCase()}"
            ${disabled ? "disabled" : ""}>
          </fig-input-text>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round(this.#solid.alpha * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "gradient":
        const gradientLabel =
          this.#gradient.type.charAt(0).toUpperCase() +
          this.#gradient.type.slice(1);
        controlsHtml = `
          <label class="fig-input-fill-label">${gradientLabel}</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${this.#gradient.stops[0]?.opacity || 100}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "image":
        controlsHtml = `
          <label class="fig-input-fill-label">Image</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#image.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "video":
        controlsHtml = `
          <label class="fig-input-fill-label">Video</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#video.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
      case "webcam":
        controlsHtml = `
          <label class="fig-input-fill-label">Webcam</label>
          <fig-tooltip text="Opacity">
            <fig-input-number 
              class="fig-input-fill-opacity"
              placeholder="##" 
              min="0"
              max="100"
              value="${Math.round((this.#webcam.opacity ?? 1) * 100)}"
              units="%"
              ${disabled ? "disabled" : ""}>
            </fig-input-number>
          </fig-tooltip>`;
        break;
    }

    // Append new controls after the fill picker
    combo.insertAdjacentHTML("beforeend", controlsHtml);

    // Re-setup event listeners for the new controls
    requestAnimationFrame(() => {
      this.#opacityInput = this.querySelector(".fig-input-fill-opacity");
      this.#hexInput = this.querySelector(".fig-input-fill-hex");
      const label = this.querySelector(".fig-input-fill-label");

      // Label click triggers fill picker
      if (label && this.#fillPicker) {
        label.addEventListener("click", () => {
          const chit = this.#fillPicker.querySelector("fig-chit");
          if (chit) {
            chit.click();
          }
        });
      }

      // Hex input (solid only)
      if (this.#hexInput) {
        this.#hexInput.addEventListener("input", (e) => {
          e.stopPropagation();
          const hex = "#" + e.target.value.replace("#", "");
          this.#solid.color = hex;
          this.#updateFillPicker();
          this.#emitInput();
        });
        this.#hexInput.addEventListener("change", (e) => {
          e.stopPropagation();
          this.#emitChange();
        });
      }

      // Opacity input
      if (this.#opacityInput) {
        this.#opacityInput.addEventListener("input", (e) => {
          e.stopPropagation();
          const parsed = parseFloat(e.target.value);
          const opacity = isNaN(parsed) ? 100 : parsed;
          const alpha = opacity / 100;
          switch (this.#fillType) {
            case "solid":
              this.#solid.alpha = alpha;
              break;
            case "gradient":
              this.#gradient.stops.forEach((stop) => {
                stop.opacity = opacity;
              });
              break;
            case "image":
              this.#image.opacity = alpha;
              break;
            case "video":
              this.#video.opacity = alpha;
              break;
            case "webcam":
              this.#webcam.opacity = alpha;
              break;
          }
          this.#updateFillPicker();
          this.#updateChitAlpha(alpha);
          this.#emitInput();
        });
        this.#opacityInput.addEventListener("change", (e) => {
          e.stopPropagation();
          this.#emitChange();
        });
      }
    });
  }

  #updateFillPicker() {
    if (this.#fillPicker) {
      this.#fillPicker.setAttribute("value", JSON.stringify(this.value));
    }
  }

  #updateChitAlpha(alpha) {
    if (this.#fillPicker) {
      const chit = this.#fillPicker.querySelector("fig-chit");
      if (chit) {
        chit.setAttribute("alpha", alpha);
      }
    }
  }

  #emitInput() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  get value() {
    switch (this.#fillType) {
      case "solid":
        return {
          type: "solid",
          color: this.#solid.color,
          alpha: this.#solid.alpha,
          opacity: Math.round(this.#solid.alpha * 100), // FigFillPicker expects opacity 0-100
        };
      case "gradient":
        return {
          type: "gradient",
          gradient: { ...this.#gradient },
        };
      case "image":
        return {
          type: "image",
          image: { ...this.#image },
        };
      case "video":
        return {
          type: "video",
          video: { ...this.#video },
        };
      case "webcam":
        return {
          type: "webcam",
          webcam: { ...this.#webcam },
        };
      default:
        return { type: this.#fillType };
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
        if (this.#fillPicker) {
          this.#render();
        }
        break;
      case "disabled":
        // Re-render to update disabled state
        if (this.#fillPicker) {
          this.#render();
        }
        break;
    }
  }
}
customElements.define("fig-input-fill", FigInputFill);

/* Checkbox */
/**
 * A custom checkbox input element.
 * @attr {boolean} checked - Whether the checkbox is checked
 * @attr {boolean} disabled - Whether the checkbox is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The form field name
 * @attr {string} value - The value when checked
 */
class FigCheckbox extends HTMLElement {
  #labelElement = null;

  constructor() {
    super();
    this.input = document.createElement("input");
    this.name = this.getAttribute("name") || "checkbox";
    this.input.value = this.getAttribute("value") || "";
    this.input.setAttribute("id", figUniqueId());
    this.input.setAttribute("name", this.name);
    this.input.setAttribute("type", "checkbox");
    this.input.setAttribute("role", "checkbox");
  }
  connectedCallback() {
    this.input.checked =
      this.hasAttribute("checked") && this.getAttribute("checked") !== "false";
    this.input.addEventListener("change", this.handleInput.bind(this));

    if (this.hasAttribute("disabled")) {
      this.input.disabled = true;
    }
    if (this.hasAttribute("indeterminate")) {
      this.input.indeterminate = true;
      this.input.setAttribute("indeterminate", "true");
    }

    this.append(this.input);

    // Only create label if label attribute is present
    if (this.hasAttribute("label")) {
      this.#createLabel();
      this.#labelElement.innerText = this.getAttribute("label");
    }

    this.render();
  }
  static get observedAttributes() {
    return ["disabled", "label", "checked", "name", "value"];
  }

  #createLabel() {
    if (!this.#labelElement) {
      this.#labelElement = document.createElement("label");
      this.#labelElement.setAttribute("for", this.input.id);
    }
    // Add to DOM if not already there and input is in the DOM
    if (
      this.#labelElement &&
      !this.#labelElement.parentNode &&
      this.input.parentNode
    ) {
      this.input.after(this.#labelElement);
    }
  }

  render() {}

  focus() {
    this.input.focus();
  }

  get value() {
    return this.input.value;
  }

  set value(val) {
    this.input.value = val;
    this.setAttribute("value", val);
  }

  get checked() {
    return this.input.checked;
  }

  set checked(val) {
    this.input.checked = val;
    if (val) {
      this.setAttribute("checked", "");
    } else {
      this.removeAttribute("checked");
    }
  }

  disconnectedCallback() {
    this.input.remove();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "label":
        if (newValue) {
          this.#createLabel();
          this.#labelElement.innerText = newValue;
        } else if (this.#labelElement) {
          this.#labelElement.remove();
          this.#labelElement = null;
        }
        break;
      case "checked":
        this.input.checked =
          this.hasAttribute("checked") &&
          this.getAttribute("checked") !== "false";
        break;
      case "value":
        this.input.value = newValue;
        break;
      default:
        this.input[name] = newValue;
        this.input.setAttribute(name, newValue);
        break;
    }
  }

  handleInput(e) {
    e.stopPropagation();
    this.input.indeterminate = false;
    this.input.removeAttribute("indeterminate");
    // Update ARIA state
    this.input.setAttribute("aria-checked", this.input.checked);
    // Sync attribute with input state (without triggering setter loop)
    if (this.input.checked) {
      this.setAttribute("checked", "");
    } else {
      this.removeAttribute("checked");
    }
    // Emit both input and change events
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        composed: true,
        detail: { checked: this.input.checked, value: this.input.value },
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { checked: this.input.checked, value: this.input.value },
      }),
    );
  }
}
customElements.define("fig-checkbox", FigCheckbox);

/* Radio */
/**
 * A custom radio input element extending FigCheckbox.
 * @attr {boolean} checked - Whether the radio is selected
 * @attr {boolean} disabled - Whether the radio is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The radio group name
 * @attr {string} value - The value when selected
 */
class FigRadio extends FigCheckbox {
  constructor() {
    super();
    this.input.setAttribute("type", "radio");
    this.input.setAttribute("name", this.getAttribute("name") || "radio");
  }
}
customElements.define("fig-radio", FigRadio);

/* Switch */
/**
 * A custom switch/toggle input element extending FigCheckbox.
 * @attr {boolean} checked - Whether the switch is on
 * @attr {boolean} disabled - Whether the switch is disabled
 * @attr {string} label - The label text
 * @attr {string} name - The form field name
 * @attr {string} value - The value when on
 */
class FigSwitch extends FigCheckbox {
  render() {
    this.input.setAttribute("class", "switch");
    this.input.setAttribute("role", "switch");
  }
}
customElements.define("fig-switch", FigSwitch);

/* Toast */
/**
 * A toast notification element for non-modal, time-based messages.
 * Always positioned at bottom center of the screen.
 * @attr {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss, default: 5000)
 * @attr {number} offset - Distance from bottom edge in pixels (default: 16)
 * @attr {string} theme - Visual theme: "dark" (default), "light", "danger", "brand"
 * @attr {boolean} open - Whether the toast is visible
 */
class FigToast extends HTMLDialogElement {
  #defaultOffset = 16; // 1rem in pixels
  #autoCloseTimer = null;

  constructor() {
    super();
  }

  get #offset() {
    return parseInt(this.getAttribute("offset") ?? this.#defaultOffset);
  }

  connectedCallback() {
    // Set default theme if not specified
    if (!this.hasAttribute("theme")) {
      this.setAttribute("theme", "dark");
    }

    // Ensure toast is closed by default
    // Remove native open attribute if present and not explicitly "true"
    const shouldOpen =
      this.getAttribute("open") === "true" || this.getAttribute("open") === "";
    if (this.hasAttribute("open") && !shouldOpen) {
      this.removeAttribute("open");
    }

    // Close the dialog initially (override native behavior)
    if (!shouldOpen) {
      this.close();
    }

    requestAnimationFrame(() => {
      this.#addCloseListeners();
      this.#applyPosition();

      // Auto-show if open attribute is explicitly true
      if (shouldOpen) {
        this.showToast();
      }
    });
  }

  disconnectedCallback() {
    this.#clearAutoClose();
  }

  #addCloseListeners() {
    this.querySelectorAll("[close-toast]").forEach((button) => {
      button.removeEventListener("click", this.#handleClose);
      button.addEventListener("click", this.#handleClose.bind(this));
    });
  }

  #handleClose() {
    this.hideToast();
  }

  #applyPosition() {
    // Always bottom center
    this.style.position = "fixed";
    this.style.margin = "0";
    this.style.top = "auto";
    this.style.bottom = `${this.#offset}px`;
    this.style.left = "50%";
    this.style.right = "auto";
    this.style.transform = "translateX(-50%)";
  }

  #startAutoClose() {
    this.#clearAutoClose();

    const duration = parseInt(this.getAttribute("duration") ?? "5000");
    if (duration > 0) {
      this.#autoCloseTimer = setTimeout(() => {
        this.hideToast();
      }, duration);
    }
  }

  #clearAutoClose() {
    if (this.#autoCloseTimer) {
      clearTimeout(this.#autoCloseTimer);
      this.#autoCloseTimer = null;
    }
  }

  /**
   * Show the toast notification (non-modal)
   */
  showToast() {
    this.show(); // Non-modal show
    this.#applyPosition();
    this.#startAutoClose();
    this.dispatchEvent(new CustomEvent("toast-show", { bubbles: true }));
  }

  /**
   * Hide the toast notification
   */
  hideToast() {
    this.#clearAutoClose();
    this.close();
    this.dispatchEvent(new CustomEvent("toast-hide", { bubbles: true }));
  }

  static get observedAttributes() {
    return ["duration", "offset", "open", "theme"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "offset") {
      this.#applyPosition();
    }

    if (name === "open") {
      if (newValue !== null && newValue !== "false") {
        this.showToast();
      } else {
        this.hideToast();
      }
    }
  }
}
customElements.define("fig-toast", FigToast, { extends: "dialog" });

/* Combo Input */
/**
 * A custom combo input with text and dropdown.
 * @attr {string} options - Comma-separated list of dropdown options
 * @attr {string} placeholder - Placeholder text for the input
 * @attr {string} value - The current input value
 */
class FigComboInput extends HTMLElement {
  constructor() {
    super();
  }
  getOptionsFromAttribute() {
    return (this.getAttribute("options") || "").split(",");
  }
  connectedCallback() {
    this.options = this.getOptionsFromAttribute();
    this.placeholder = this.getAttribute("placeholder") || "";
    this.value = this.getAttribute("value") || "";
    this.innerHTML = `<div class="input-combo">
                        <fig-input-text placeholder="${this.placeholder}">
                        </fig-input-text> 
                        <fig-button type="select" variant="input" icon>
                            <svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
  <path d='M5.87868 7.12132L8 9.24264L10.1213 7.12132' stroke='currentColor' stroke-opacity="0.9" stroke-linecap='round'/>
</svg>
                            <fig-dropdown type="dropdown">
                              ${this.options
                                .map((option) => `<option>${option}</option>`)
                                .join("")}
                            </fig-dropdown>
                        </fig-button>
                    </div>`;
    requestAnimationFrame(() => {
      this.input = this.querySelector("fig-input-text");
      this.dropdown = this.querySelector("fig-dropdown");

      this.dropdown.addEventListener(
        "input",
        this.handleSelectInput.bind(this),
      );

      // Apply initial disabled state
      if (this.hasAttribute("disabled")) {
        this.#applyDisabled(true);
      }
    });
  }
  handleSelectInput(e) {
    this.setAttribute("value", e.target.closest("fig-dropdown").value);
  }
  handleInput(e) {
    this.value = this.input.value;
  }
  static get observedAttributes() {
    return ["options", "placeholder", "value", "disabled"];
  }
  focus() {
    this.input.focus();
  }
  #applyDisabled(disabled) {
    if (this.input) {
      if (disabled) {
        this.input.setAttribute("disabled", "");
      } else {
        this.input.removeAttribute("disabled");
      }
    }
    const button = this.querySelector("fig-button");
    if (button) {
      if (disabled) {
        button.setAttribute("disabled", "");
      } else {
        button.removeAttribute("disabled");
      }
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "options":
        this.options = newValue.split(",");
        if (this.dropdown) {
          this.dropdown.innerHTML = this.options
            .map((option) => `<option>${option}</option>`)
            .join("");
        }
        break;
      case "placeholder":
        this.placeholder = newValue;
        if (this.input) {
          this.input.setAttribute("placeholder", newValue);
        }
        break;
      case "value":
        this.value = newValue;
        if (this.input) {
          this.input.setAttribute("value", newValue);
        }
        break;
      case "disabled":
        this.#applyDisabled(newValue !== null && newValue !== "false");
        break;
    }
  }
}
customElements.define("fig-combo-input", FigComboInput);

/* Chit */
/**
 * A color/gradient/image swatch element.
 * @attr {string} background - Any CSS background value: color (#FF0000, rgba(...)), gradient (linear-gradient(...)), or image (url(...))
 * @attr {string} size - Size of the chip: "small" (default) or "large"
 * @attr {boolean} selected - Whether the chip shows a selection ring
 * @attr {boolean} disabled - Whether the chip is disabled
 * @attr {number} alpha - Opacity value (0-1) to display the color with transparency
 */
class FigChit extends HTMLElement {
  #type = "color"; // 'color', 'gradient', 'image'
  #boundHandleInput = null;
  #internalUpdate = false; // Flag to prevent re-render during internal input

  constructor() {
    super();
    this.#boundHandleInput = this.#handleInput.bind(this);
  }

  static get observedAttributes() {
    return ["background", "size", "selected", "disabled", "alpha"];
  }

  connectedCallback() {
    this.#render();
    this.#updateAlpha();
  }

  #updateAlpha() {
    const alpha = this.getAttribute("alpha");
    if (alpha !== null) {
      this.style.setProperty("--alpha", alpha);
    } else {
      this.style.removeProperty("--alpha");
    }
  }

  #detectType(bg) {
    if (!bg) return "color";
    const lower = bg.toLowerCase();
    if (lower.includes("gradient")) return "gradient";
    if (lower.includes("url(")) return "image";
    return "color";
  }

  #toHex(color) {
    // Convert color to hex for the native input
    if (!color) return "#D9D9D9";
    if (color.startsWith("#")) return color.slice(0, 7);
    // Use canvas to convert rgba/named colors to hex
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.fillStyle = color;
      return ctx.fillStyle;
    } catch {
      return "#D9D9D9";
    }
  }

  #render() {
    const bg = this.getAttribute("background") || "#D9D9D9";
    const newType = this.#detectType(bg);

    // Only rebuild DOM if type changes
    if (newType !== this.#type || !this.input) {
      this.#type = newType;
      this.setAttribute("data-type", this.#type);

      // Clean up old input listener if exists
      if (this.input) {
        this.input.removeEventListener("input", this.#boundHandleInput);
      }

      if (this.#type === "color") {
        const hex = this.#toHex(bg);
        this.innerHTML = `<input type="color" value="${hex}" />`;
        this.input = this.querySelector("input");
        this.input.addEventListener("input", this.#boundHandleInput);
      } else {
        this.innerHTML = "";
        this.input = null;
      }
    } else if (this.#type === "color" && this.input) {
      // Just update input value without rebuilding DOM
      const hex = this.#toHex(bg);
      if (this.input.value !== hex) {
        this.input.value = hex;
      }
    }

    // Always update CSS variable
    this.style.setProperty("--chit-background", bg);
  }

  #handleInput(e) {
    // Update background attribute without triggering full re-render
    this.#internalUpdate = true;
    this.setAttribute("background", e.target.value);
    this.#internalUpdate = false;
    // The native input/change events bubble naturally
  }

  get background() {
    return this.getAttribute("background");
  }

  set background(value) {
    this.setAttribute("background", value);
  }

  focus() {
    this.input?.focus();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "background") {
      // Skip full re-render if this was triggered by internal input
      if (this.#internalUpdate) {
        this.style.setProperty("--chit-background", newValue);
        return;
      }
      this.#render();
    } else if (name === "alpha") {
      this.#updateAlpha();
    }
  }

  get alpha() {
    return this.getAttribute("alpha");
  }

  set alpha(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("alpha");
    } else {
      this.setAttribute("alpha", value);
    }
  }
}
customElements.define("fig-chit", FigChit);

/* Upload */
/**
 * A custom image upload element.
 * @attr {string} src - The current image source URL
 * @attr {boolean} upload - Whether to show the upload button
 * @attr {string} label - The upload button label
 * @attr {string} size - Size of the image preview
 */
class FigImage extends HTMLElement {
  #src = null;
  constructor() {
    super();
  }
  #getInnerHTML() {
    return `<fig-chit size="large" background="${
      this.src ? `url(${this.src})` : "url()"
    }" disabled></fig-chit><div>${
      this.upload
        ? `<fig-button variant="overlay" type="upload">
          ${this.label} 
          <input type="file" accept="image/*" />
        </fig-button>`
        : ""
    } ${
      this.download
        ? `<fig-button variant="overlay" icon="true" type="download">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.5 13C17.7761 13 18 13.2239 18 13.5V16.5C18 17.3284 17.3284 18 16.5 18H7.5C6.67157 18 6 17.3284 6 16.5V13.5C6 13.2239 6.22386 13 6.5 13C6.77614 13 7 13.2239 7 13.5V16.5C7 16.7761 7.22386 17 7.5 17H16.5C16.7761 17 17 16.7761 17 16.5V13.5C17 13.2239 17.2239 13 17.5 13ZM12 6C12.2761 6 12.5 6.22386 12.5 6.5V12.293L14.6465 10.1465C14.8417 9.95122 15.1583 9.95122 15.3535 10.1465C15.5488 10.3417 15.5488 10.6583 15.3535 10.8535L12.3535 13.8535C12.2597 13.9473 12.1326 14 12 14C11.9006 14 11.8042 13.9704 11.7227 13.916L11.6465 13.8535L8.64648 10.8535C8.45122 10.6583 8.45122 10.3417 8.64648 10.1465C8.84175 9.95122 9.15825 9.95122 9.35352 10.1465L11.5 12.293V6.5C11.5 6.22386 11.7239 6 12 6Z" fill="black"/>
</svg></fig-button>`
        : ""
    }</div>`;
  }
  connectedCallback() {
    this.#src = this.getAttribute("src") || "";
    this.upload = this.getAttribute("upload") === "true";
    this.download = this.getAttribute("download") === "true";
    this.label = this.getAttribute("label") || "Upload";
    this.size = this.getAttribute("size") || "small";
    this.innerHTML = this.#getInnerHTML();
    this.#updateRefs();
  }
  disconnectedCallback() {
    this.fileInput.removeEventListener(
      "change",
      this.#handleFileInput.bind(this),
    );
  }

  #updateRefs() {
    requestAnimationFrame(() => {
      this.chit = this.querySelector("fig-chit");
      if (this.upload) {
        this.uploadButton = this.querySelector("fig-button[type='upload']");
        this.fileInput = this.uploadButton?.querySelector("input");
        this.fileInput.removeEventListener(
          "change",
          this.#handleFileInput.bind(this),
        );
        this.fileInput.addEventListener(
          "change",
          this.#handleFileInput.bind(this),
        );
      }
      if (this.download) {
        this.downloadButton = this.querySelector("fig-button[type='download']");
        this.downloadButton.removeEventListener(
          "click",
          this.#handleDownload.bind(this),
        );
        this.downloadButton.addEventListener(
          "click",
          this.#handleDownload.bind(this),
        );
      }
    });
  }
  #handleDownload() {
    //force blob download
    const link = document.createElement("a");
    link.href = this.blob;
    link.download = "image.png";
    link.click();
  }
  async #loadImage(src) {
    // Get blob from canvas
    await new Promise((resolve) => {
      this.image = new Image();
      this.image.crossOrigin = "Anonymous";
      this.image.onload = async () => {
        this.aspectRatio = this.image.width / this.image.height;
        this.style.setProperty(
          "--aspect-ratio",
          `${this.image.width}/${this.image.height}`,
        );
        this.dispatchEvent(
          new CustomEvent("loaded", {
            bubbles: true,
            cancelable: true,
            detail: {
              blob: this.blob,
              base64: this.base64,
            },
          }),
        );
        resolve();

        // Create canvas to extract blob and base64 from image
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = this.image.width;
        canvas.height = this.image.height;
        ctx.drawImage(this.image, 0, 0);

        // Get base64 from canvas
        this.base64 = canvas.toDataURL();

        // Get blob from canvas
        canvas.toBlob((blob) => {
          if (this.blob) {
            URL.revokeObjectURL(this.blob);
          }
          if (blob) {
            this.blob = URL.createObjectURL(blob);
          }
        });
      };
      this.image.src = src;
    });
  }
  async #handleFileInput(e) {
    if (this.blob) {
      URL.revokeObjectURL(this.blob);
    }
    this.blob = URL.createObjectURL(e.target.files[0]);
    //set base64 url
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    //await this data url to be set
    await new Promise((resolve) => {
      reader.onload = (e) => {
        this.base64 = e.target.result;
        resolve();
      };
    });
    //emit event for loaded
    this.dispatchEvent(
      new CustomEvent("loaded", {
        bubbles: true,
        cancelable: true,
        detail: {
          blob: this.blob,
          base64: this.base64,
        },
      }),
    );
    //emit for change too
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      }),
    );
    this.setAttribute("src", this.blob);
  }
  static get observedAttributes() {
    return ["src", "upload"];
  }
  get src() {
    return this.#src;
  }
  set src(value) {
    this.#src = value;
    this.setAttribute("src", value);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "src") {
      this.#src = newValue;
      if (this.chit) {
        this.chit.setAttribute(
          "background",
          this.#src ? `url(${this.#src})` : "",
        );
      }
      if (this.#src) {
        this.#loadImage(this.#src);
      }
    }
    if (name === "upload" || name === "download") {
      this.upload = newValue.toLowerCase() === "true";
      this.download = newValue.toLowerCase() === "true";
      this.innerHTML = this.#getInnerHTML();
      this.#updateRefs();
    }
    if (name === "size") {
      this.size = newValue;
    }
  }
}
customElements.define("fig-image", FigImage);

/**
 * A custom joystick input element.
 * @attr {string} value - The current position of the joystick (e.g., "0.5,0.5").
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {number} transform - A scaling factor for the output.
 * @attr {boolean} text - Whether to display text inputs for X and Y values.
 */
class FigInputJoystick extends HTMLElement {
  constructor() {
    super();

    this.position = { x: 0.5, y: 0.5 }; // Internal position (0-1)
    this.isDragging = false;
    this.isShiftHeld = false;
    this.plane = null;
    this.cursor = null;
    this.xInput = null;
    this.yInput = null;
    this.coordinates = "screen"; // "screen" (0,0 top-left) or "math" (0,0 bottom-left)
    this.#initialized = false;
  }

  #initialized = false;

  connectedCallback() {
    // Initialize position
    requestAnimationFrame(() => {
      this.precision = this.getAttribute("precision") || 3;
      this.precision = parseInt(this.precision);
      this.transform = this.getAttribute("transform") || 1;
      this.transform = Number(this.transform);
      this.text = this.getAttribute("text") === "true";
      this.coordinates = this.getAttribute("coordinates") || "screen";

      this.#render();
      this.#setupListeners();
      this.#syncHandlePosition();
      this.#initialized = true;
    });
  }

  // Convert Y for display (CSS uses top-down, math uses bottom-up)
  #displayY(y) {
    return this.coordinates === "math" ? 1 - y : y;
  }
  disconnectedCallback() {
    this.#cleanupListeners();
  }

  #render() {
    this.innerHTML = this.#getInnerHTML();
  }
  #getInnerHTML() {
    return `        
          <div class="fig-input-joystick-plane-container" tabindex="0">
            <div class="fig-input-joystick-plane">
              <div class="fig-input-joystick-guides"></div>
              <div class="fig-input-joystick-handle"></div>
            </div>
          </div>
          ${
            this.text
              ? `<fig-input-number
                  name="x"
                  step="1"
                  value="${this.position.x * 100}"
                  min="0"
                  max="100"
                  units="%">
                  <span slot="prepend">X</span>
                </fig-input-number>
                <fig-input-number
                  name="y"
                  step="1"
                  min="0"
                  max="100"
                  value="${this.position.y * 100}"
                  units="%">
                  <span slot="prepend">Y</span>
                </fig-input-number>`
              : ""
          }
        `;
  }

  #setupListeners() {
    this.plane = this.querySelector(".fig-input-joystick-plane");
    this.cursor = this.querySelector(".fig-input-joystick-handle");
    this.xInput = this.querySelector("fig-input-number[name='x']");
    this.yInput = this.querySelector("fig-input-number[name='y']");
    this.plane.addEventListener("mousedown", this.#handleMouseDown.bind(this));
    this.plane.addEventListener(
      "touchstart",
      this.#handleTouchStart.bind(this),
    );
    window.addEventListener("keydown", this.#handleKeyDown.bind(this));
    window.addEventListener("keyup", this.#handleKeyUp.bind(this));
    if (this.text && this.xInput && this.yInput) {
      this.xInput.addEventListener("input", this.#handleXInput.bind(this));
      this.yInput.addEventListener("input", this.#handleYInput.bind(this));
    }
  }

  #cleanupListeners() {
    if (this.plane) {
      this.plane.removeEventListener("mousedown", this.#handleMouseDown);
      this.plane.removeEventListener("touchstart", this.#handleTouchStart);
    }
    window.removeEventListener("keydown", this.#handleKeyDown);
    window.removeEventListener("keyup", this.#handleKeyUp);
    if (this.text && this.xInput && this.yInput) {
      this.xInput.removeEventListener("input", this.#handleXInput);
      this.yInput.removeEventListener("input", this.#handleYInput);
    }
  }

  #handleXInput(e) {
    e.stopPropagation();
    this.position.x = Number(e.target.value) / 100; // Convert from percentage to decimal
    this.#syncHandlePosition();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #handleYInput(e) {
    e.stopPropagation();
    this.position.y = Number(e.target.value) / 100; // Convert from percentage to decimal
    this.#syncHandlePosition();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #snapToGuide(value) {
    if (!this.isShiftHeld) return value;
    if (value < 0.1) return 0;
    if (value > 0.9) return 1;
    if (value > 0.4 && value < 0.6) return 0.5;
    return value;
  }

  #snapToDiagonal(x, y) {
    if (!this.isShiftHeld) return { x, y };
    const diff = Math.abs(x - y);
    if (diff < 0.1) return { x: (x + y) / 2, y: (x + y) / 2 };
    if (Math.abs(1 - x - y) < 0.1) return { x, y: 1 - x };
    return { x, y };
  }

  #updatePosition(e) {
    const rect = this.plane.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let screenY = Math.max(
      0,
      Math.min(1, (e.clientY - rect.top) / rect.height),
    );

    // Convert screen Y to internal Y (flip for math coordinates)
    let y = this.coordinates === "math" ? 1 - screenY : screenY;

    x = this.#snapToGuide(x);
    y = this.#snapToGuide(y);

    const snapped = this.#snapToDiagonal(x, y);
    this.position = snapped;

    const displayY = this.#displayY(snapped.y);
    this.cursor.style.left = `${snapped.x * 100}%`;
    this.cursor.style.top = `${displayY * 100}%`;
    if (this.text && this.xInput && this.yInput) {
      this.xInput.setAttribute("value", Math.round(snapped.x * 100));
      this.yInput.setAttribute("value", Math.round(snapped.y * 100));
    }

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  #syncHandlePosition() {
    const displayY = this.#displayY(this.position.y);
    if (this.cursor) {
      this.cursor.style.left = `${this.position.x * 100}%`;
      this.cursor.style.top = `${displayY * 100}%`;
    }
    // Also sync text inputs if they exist (convert to percentage 0-100)
    if (this.text && this.xInput && this.yInput) {
      this.xInput.setAttribute("value", Math.round(this.position.x * 100));
      this.yInput.setAttribute("value", Math.round(this.position.y * 100));
    }
  }

  #handleMouseDown(e) {
    this.isDragging = true;

    this.#updatePosition(e);

    this.plane.style.cursor = "grabbing";

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updatePosition(e);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      this.plane.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      this.#emitChangeEvent();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  #handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
    this.#updatePosition(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updatePosition(e.touches[0]);
    };

    const handleTouchEnd = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      this.#emitChangeEvent();
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }
  focus() {
    const container = this.querySelector(".fig-input-joystick-plane-container");
    container?.focus();
  }
  static get observedAttributes() {
    return ["value", "precision", "transform", "text", "coordinates"];
  }
  get value() {
    // Return as percentage values (0-100)
    return [
      Math.round(this.position.x * 100),
      Math.round(this.position.y * 100),
    ];
  }
  set value(value) {
    // Parse value, strip % symbols if present, convert from 0-100 to 0-1
    const v = value
      .toString()
      .split(",")
      .map((s) => {
        const num = parseFloat(s.replace(/%/g, "").trim());
        return isNaN(num) ? 0.5 : num / 100; // Convert from percentage to decimal, default to 0.5 if invalid
      });
    this.position = { x: v[0] ?? 0.5, y: v[1] ?? 0.5 };
    if (this.#initialized) {
      this.#syncHandlePosition();
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.value = newValue;
    }
    if (name === "precision") {
      this.precision = parseInt(newValue);
    }
    if (name === "transform") {
      this.transform = Number(newValue);
    }
    if (name === "text" && newValue !== oldValue) {
      this.text = newValue.toLowerCase() === "true";
      this.#render();
    }
    if (name === "coordinates") {
      this.coordinates = newValue || "screen";
      this.#syncHandlePosition();
    }
  }
}

customElements.define("fig-input-joystick", FigInputJoystick);

/**
 * A custom angle chooser input element.
 * @attr {number} value - The current angle of the handle in degrees.
 * @attr {number} precision - The number of decimal places for the output.
 * @attr {boolean} text - Whether to display a text input for the angle value.
 * @attr {number} adjacent - The adjacent value of the angle.
 * @attr {number} opposite - The opposite value of the angle.
 */
class FigInputAngle extends HTMLElement {
  // Declare private fields first
  #adjacent;
  #opposite;

  constructor() {
    super();

    this.angle = 0; // Angle in degrees
    this.#adjacent = 1;
    this.#opposite = 0;
    this.isDragging = false;
    this.isShiftHeld = false;
    this.handle = null;
    this.angleInput = null;
    this.plane = null;
  }

  connectedCallback() {
    requestAnimationFrame(() => {
      this.precision = this.getAttribute("precision") || 1;
      this.precision = parseInt(this.precision);
      this.text = this.getAttribute("text") === "true";

      this.#render();

      this.#setupListeners();

      this.#syncHandlePosition();
      if (this.text && this.angleInput) {
        this.angleInput.setAttribute(
          "value",
          this.angle.toFixed(this.precision),
        );
      }
    });
  }

  disconnectedCallback() {
    this.#cleanupListeners();
  }

  #render() {
    this.innerHTML = this.#getInnerHTML();
  }

  #getInnerHTML() {
    return `
        <div class="fig-input-angle-plane" tabindex="0">
          <div class="fig-input-angle-handle"></div>
        </div>
        ${
          this.text
            ? `<fig-input-number 
                name="angle"
                step="0.1"
                value="${this.angle}"
                min="0"
                max="360"
                units="°">
              </fig-input-number>`
            : ""
        }
    `;
  }

  #setupListeners() {
    this.handle = this.querySelector(".fig-input-angle-handle");
    this.plane = this.querySelector(".fig-input-angle-plane");
    this.angleInput = this.querySelector("fig-input-number[name='angle']");
    this.plane.addEventListener("mousedown", this.#handleMouseDown.bind(this));
    this.plane.addEventListener(
      "touchstart",
      this.#handleTouchStart.bind(this),
    );
    window.addEventListener("keydown", this.#handleKeyDown.bind(this));
    window.addEventListener("keyup", this.#handleKeyUp.bind(this));
    if (this.text && this.angleInput) {
      this.angleInput.addEventListener(
        "input",
        this.#handleAngleInput.bind(this),
      );
    }
  }

  #cleanupListeners() {
    this.plane.removeEventListener("mousedown", this.#handleMouseDown);
    this.plane.removeEventListener("touchstart", this.#handleTouchStart);
    window.removeEventListener("keydown", this.#handleKeyDown);
    window.removeEventListener("keyup", this.#handleKeyUp);
    if (this.text && this.angleInput) {
      this.angleInput.removeEventListener("input", this.#handleAngleInput);
    }
  }

  #handleAngleInput(e) {
    e.stopPropagation();
    this.angle = Number(e.target.value);
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
    this.#emitInputEvent();
    this.#emitChangeEvent();
  }

  #calculateAdjacentAndOpposite() {
    const radians = (this.angle * Math.PI) / 180;
    this.#adjacent = Math.cos(radians);
    this.#opposite = Math.sin(radians);
  }

  #snapToIncrement(angle) {
    if (!this.isShiftHeld) return angle;
    const increment = 45;
    return Math.round(angle / increment) * increment;
  }

  #updateAngle(e) {
    const rect = this.plane.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    let angle = ((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 360) % 360;

    angle = this.#snapToIncrement(angle);
    this.angle = angle;

    this.#calculateAdjacentAndOpposite();

    this.#syncHandlePosition();
    if (this.text && this.angleInput) {
      this.angleInput.setAttribute("value", this.angle.toFixed(this.precision));
    }

    this.#emitInputEvent();
  }

  #emitInputEvent() {
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  #emitChangeEvent() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  #syncHandlePosition() {
    if (this.handle) {
      const radians = (this.angle * Math.PI) / 180;
      const radius = this.plane.offsetWidth / 2 - this.handle.offsetWidth / 2;
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      this.handle.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  #handleMouseDown(e) {
    this.isDragging = true;
    this.#updateAngle(e);

    const handleMouseMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e);
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      this.#emitChangeEvent();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  #handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
    this.#updateAngle(e.touches[0]);

    const handleTouchMove = (e) => {
      this.plane.classList.add("dragging");
      if (this.isDragging) this.#updateAngle(e.touches[0]);
    };

    const handleTouchEnd = () => {
      this.isDragging = false;
      this.plane.classList.remove("dragging");
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      this.#emitChangeEvent();
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  }

  #handleKeyDown(e) {
    if (e.key === "Shift") this.isShiftHeld = true;
  }

  #handleKeyUp(e) {
    if (e.key === "Shift") this.isShiftHeld = false;
  }

  focus() {
    this.plane?.focus();
  }

  static get observedAttributes() {
    return ["value", "precision", "text"];
  }

  get value() {
    return this.angle;
  }

  get adjacent() {
    return this.#adjacent;
  }

  get opposite() {
    return this.#opposite;
  }

  set value(value) {
    if (isNaN(value)) {
      console.error("Invalid value: must be a number.");
      return;
    }
    this.angle = value;
    this.#calculateAdjacentAndOpposite();
    this.#syncHandlePosition();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "value") {
      this.value = Number(newValue);
    }
    if (name === "precision") {
      this.precision = parseInt(newValue);
    }
    if (name === "text" && newValue !== oldValue) {
      this.text = newValue.toLowerCase() === "true";
      this.#render();
    }
  }
}
customElements.define("fig-input-angle", FigInputAngle);

// FigShimmer
class FigShimmer extends HTMLElement {
  connectedCallback() {
    const duration = this.getAttribute("duration");
    if (duration) {
      this.style.setProperty("--shimmer-duration", duration);
    }
  }

  static get observedAttributes() {
    return ["duration", "playing"];
  }

  get playing() {
    return this.getAttribute("playing") !== "false";
  }

  set playing(value) {
    if (value) {
      this.removeAttribute("playing"); // Default is playing
    } else {
      this.setAttribute("playing", "false");
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "duration") {
      this.style.setProperty("--shimmer-duration", newValue || "1.5s");
    }
    // playing is handled purely by CSS attribute selectors
  }
}
customElements.define("fig-shimmer", FigShimmer);

// FigLayer
class FigLayer extends HTMLElement {
  static get observedAttributes() {
    return ["open", "visible"];
  }

  #chevron = null;
  #boundHandleChevronClick = null;

  connectedCallback() {
    // Use requestAnimationFrame to ensure child elements have rendered
    requestAnimationFrame(() => {
      this.#injectChevron();
    });
  }

  disconnectedCallback() {
    if (this.#chevron && this.#boundHandleChevronClick) {
      this.#chevron.removeEventListener("click", this.#boundHandleChevronClick);
    }
  }

  #injectChevron() {
    const row = this.querySelector(":scope > .fig-layer-row");
    if (!row) return;

    // Check if chevron already exists
    if (row.querySelector(".fig-layer-chevron")) return;

    // Always create chevron element - CSS handles visibility via :has(fig-layer)
    this.#chevron = document.createElement("span");
    this.#chevron.className = "fig-layer-chevron";
    row.prepend(this.#chevron);

    // Add click listener to chevron only
    this.#boundHandleChevronClick = this.#handleChevronClick.bind(this);
    this.#chevron.addEventListener("click", this.#boundHandleChevronClick);
  }

  #handleChevronClick(e) {
    e.stopPropagation();
    this.open = !this.open;
  }

  get open() {
    const attr = this.getAttribute("open");
    return attr !== null && attr !== "false";
  }

  set open(value) {
    const oldValue = this.open;
    if (value) {
      this.setAttribute("open", "true");
    } else {
      this.setAttribute("open", "false");
    }
    if (oldValue !== value) {
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: value },
          bubbles: true,
        }),
      );
    }
  }

  get visible() {
    const attr = this.getAttribute("visible");
    return attr !== "false";
  }

  set visible(value) {
    const oldValue = this.visible;
    if (value) {
      this.setAttribute("visible", "true");
    } else {
      this.setAttribute("visible", "false");
    }
    if (oldValue !== value) {
      this.dispatchEvent(
        new CustomEvent("visibilitychange", {
          detail: { visible: value },
          bubbles: true,
        }),
      );
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "open") {
      const isOpen = newValue !== null && newValue !== "false";
      this.dispatchEvent(
        new CustomEvent("openchange", {
          detail: { open: isOpen },
          bubbles: true,
        }),
      );
    }

    if (name === "visible") {
      const isVisible = newValue !== "false";
      this.dispatchEvent(
        new CustomEvent("visibilitychange", {
          detail: { visible: isVisible },
          bubbles: true,
        }),
      );
    }
  }
}
customElements.define("fig-layer", FigLayer);

// FigFillPicker
/**
 * A comprehensive fill picker component supporting solid colors, gradients, images, video, and webcam.
 * Uses display: contents and wraps a trigger element that opens a dialog picker.
 *
 * @attr {string} value - JSON-encoded fill value
 * @attr {boolean} disabled - Whether the picker is disabled
 * @attr {boolean} alpha - Whether to show alpha/opacity controls (default: true)
 * @attr {string} dialog-position - Position of the dialog (passed to fig-dialog)
 */
class FigFillPicker extends HTMLElement {
  #trigger = null;
  #chit = null;
  #dialog = null;
  #activeTab = "solid";

  // Fill state
  #fillType = "solid";
  #color = { h: 0, s: 0, v: 85, a: 1 }; // Default gray #D9D9D9
  #gradient = {
    type: "linear",
    angle: 0,
    centerX: 50,
    centerY: 50,
    stops: [
      { position: 0, color: "#D9D9D9", opacity: 100 },
      { position: 100, color: "#737373", opacity: 100 },
    ],
  };
  #image = { url: null, scaleMode: "fill", scale: 50 };
  #video = { url: null, scaleMode: "fill", scale: 50 };
  #webcam = { stream: null, snapshot: null };

  // DOM references for solid tab
  #colorArea = null;
  #colorAreaHandle = null;
  #hueSlider = null;
  #opacitySlider = null;
  #isDraggingColor = false;

  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["value", "disabled", "alpha", "mode"];
  }

  connectedCallback() {
    // Use display: contents
    this.style.display = "contents";

    requestAnimationFrame(() => {
      this.#setupTrigger();
      this.#parseValue();
      this.#updateChit();
    });
  }

  disconnectedCallback() {
    if (this.#dialog) {
      this.#dialog.close();
      this.#dialog.remove();
    }
  }

  #setupTrigger() {
    const child = this.firstElementChild;

    if (!child) {
      // Scenario 1: Empty - create fig-chit
      this.#chit = document.createElement("fig-chit");
      this.#chit.setAttribute("background", "#D9D9D9");
      this.appendChild(this.#chit);
      this.#trigger = this.#chit;
    } else if (child.tagName === "FIG-CHIT") {
      // Scenario 2: Has fig-chit - use and populate it
      this.#chit = child;
      this.#trigger = child;
    } else {
      // Scenario 3: Other element - trigger only, no populate
      this.#trigger = child;
      this.#chit = null;
    }

    this.#trigger.addEventListener("click", (e) => {
      if (this.hasAttribute("disabled")) return;
      e.stopPropagation();
      e.preventDefault();
      this.#openDialog();
    });

    // Prevent fig-chit's internal color input from opening system picker
    if (this.#chit) {
      requestAnimationFrame(() => {
        const input = this.#chit.querySelector('input[type="color"]');
        if (input) {
          input.style.pointerEvents = "none";
        }
      });
    }
  }

  #parseValue() {
    const valueAttr = this.getAttribute("value");
    if (!valueAttr) return;

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
      // Parse opacity (0-100) and convert to alpha (0-1)
      if (parsed.opacity !== undefined) {
        this.#color.a = parsed.opacity / 100;
      }
      if (parsed.gradient)
        this.#gradient = { ...this.#gradient, ...parsed.gradient };
      if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
      if (parsed.video) this.#video = { ...this.#video, ...parsed.video };
    } catch (e) {
      // If not JSON, treat as hex color
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#color = this.#hexToHSV(valueAttr);
      }
    }
  }

  #updateChit() {
    if (!this.#chit) return;

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
          bg = `url(${this.#image.url})`;
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
        if (this.#video.url) {
          bg = `url(${this.#video.url})`;
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
      default:
        bg = "#D9D9D9";
    }

    this.#chit.setAttribute("background", bg);
    this.#chit.style.setProperty("--chit-bg-size", bgSize);
    this.#chit.style.setProperty("--chit-bg-position", bgPosition);

    // For solid colors, also update the alpha
    if (this.#fillType === "solid") {
      this.#chit.setAttribute("alpha", this.#color.a);
    } else {
      this.#chit.removeAttribute("alpha");
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
    if (!this.#dialog) {
      this.#createDialog();
    }

    // Position off-screen first to prevent scroll jump
    this.#dialog.style.position = "fixed";
    this.#dialog.style.top = "-9999px";
    this.#dialog.style.left = "-9999px";

    this.#dialog.show();
    this.#switchTab(this.#fillType);

    // Position after dialog has rendered and has dimensions
    // Use nested RAF to ensure canvas is fully ready for drawing
    requestAnimationFrame(() => {
      this.#positionDialog();
      this.#dialog.setAttribute("closedby", "any");

      // Second RAF ensures the dialog is visible and canvas is ready
      requestAnimationFrame(() => {
        this.#drawColorArea();
        this.#updateHandlePosition();
      });
    });
  }

  #positionDialog() {
    const triggerRect = this.#trigger.getBoundingClientRect();
    const dialogRect = this.#dialog.getBoundingClientRect();
    const padding = 8; // Gap between trigger and dialog
    const viewportPadding = 16; // Min distance from viewport edges

    // Calculate available space in each direction
    const spaceBelow =
      window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const spaceRight = window.innerWidth - triggerRect.left - viewportPadding;
    const spaceLeft = triggerRect.right - viewportPadding;

    let top, left;

    // Vertical positioning: prefer below, fallback to above
    if (spaceBelow >= dialogRect.height || spaceBelow >= spaceAbove) {
      // Position below trigger
      top = triggerRect.bottom + padding;
    } else {
      // Position above trigger
      top = triggerRect.top - dialogRect.height - padding;
    }

    // Horizontal positioning: align left edge with trigger, adjust if needed
    left = triggerRect.left;

    // Adjust if dialog would go off right edge
    if (left + dialogRect.width > window.innerWidth - viewportPadding) {
      left = window.innerWidth - dialogRect.width - viewportPadding;
    }

    // Adjust if dialog would go off left edge
    if (left < viewportPadding) {
      left = viewportPadding;
    }

    // Clamp vertical position to viewport
    if (top < viewportPadding) {
      top = viewportPadding;
    }
    if (top + dialogRect.height > window.innerHeight - viewportPadding) {
      top = window.innerHeight - dialogRect.height - viewportPadding;
    }

    // Apply position (override fig-dialog's default positioning)
    this.#dialog.style.position = "fixed";
    this.#dialog.style.top = `${top}px`;
    this.#dialog.style.left = `${left}px`;
    this.#dialog.style.bottom = "auto";
    this.#dialog.style.right = "auto";
    this.#dialog.style.margin = "0";
  }

  #createDialog() {
    this.#dialog = document.createElement("dialog", { is: "fig-dialog" });
    this.#dialog.setAttribute("is", "fig-dialog");
    this.#dialog.setAttribute("drag", "true");
    this.#dialog.setAttribute("handle", "fig-header");
    this.#dialog.classList.add("fig-fill-picker-dialog");

    // Forward dialog attributes
    const dialogPosition = this.getAttribute("dialog-position");
    if (dialogPosition) {
      this.#dialog.setAttribute("position", dialogPosition);
    }

    // Check for locked mode
    const mode = this.getAttribute("mode");
    const validModes = ["solid", "gradient", "image", "video", "webcam"];
    const lockedMode = validModes.includes(mode) ? mode : null;

    // If locked mode, force fillType
    if (lockedMode) {
      this.#fillType = lockedMode;
      this.#activeTab = lockedMode;
    }

    // Build header content - dropdown or label
    const headerContent = lockedMode
      ? `<span class="fig-fill-picker-type-label">${
          lockedMode.charAt(0).toUpperCase() + lockedMode.slice(1)
        }</span>`
      : `<fig-dropdown class="fig-fill-picker-type" variant="neue" value="${this.#fillType}">
          <option value="solid">Solid</option>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="webcam">Webcam</option>
        </fig-dropdown>`;

    this.#dialog.innerHTML = `
      <fig-header>
        ${headerContent}
        <fig-button icon variant="ghost" close-dialog>
          <span class="fig-mask-icon" style="--icon: var(--icon-close)"></span>
        </fig-button>
      </fig-header>
      <div class="fig-fill-picker-content">
        <div class="fig-fill-picker-tab" data-tab="solid"></div>
        <div class="fig-fill-picker-tab" data-tab="gradient"></div>
        <div class="fig-fill-picker-tab" data-tab="image"></div>
        <div class="fig-fill-picker-tab" data-tab="video"></div>
        <div class="fig-fill-picker-tab" data-tab="webcam"></div>
      </div>
    `;

    document.body.appendChild(this.#dialog);

    // Setup type dropdown switching (only if not locked)
    const typeDropdown = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeDropdown) {
      typeDropdown.addEventListener("change", (e) => {
        this.#switchTab(e.target.value);
      });
    }

    // Close button
    this.#dialog
      .querySelector("fig-button[close-dialog]")
      .addEventListener("click", () => {
        this.#dialog.close();
      });

    // Emit change on close
    this.#dialog.addEventListener("close", () => {
      this.#emitChange();
    });

    // Initialize tabs
    this.#initSolidTab();
    this.#initGradientTab();
    this.#initImageTab();
    this.#initVideoTab();
    this.#initWebcamTab();
  }

  #switchTab(tabName) {
    // Check for locked mode - prevent switching if locked
    const mode = this.getAttribute("mode");
    const validModes = ["solid", "gradient", "image", "video", "webcam"];
    const lockedMode = validModes.includes(mode) ? mode : null;

    if (lockedMode && tabName !== lockedMode) {
      return; // Don't allow switching away from locked mode
    }

    this.#activeTab = tabName;
    this.#fillType = tabName;

    // Update dropdown selection (only exists if not locked)
    const typeDropdown = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeDropdown && typeDropdown.value !== tabName) {
      typeDropdown.value = tabName;
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

    // Update tab-specific UI after visibility change
    if (tabName === "gradient") {
      // Use RAF to ensure layout is complete before updating angle input
      requestAnimationFrame(() => {
        this.#updateGradientUI();
      });
    }

    this.#updateChit();
    this.#emitInput();
  }

  // ============ SOLID TAB ============
  #initSolidTab() {
    const container = this.#dialog.querySelector('[data-tab="solid"]');
    const showAlpha = this.getAttribute("alpha") !== "false";

    container.innerHTML = `
      <div class="fig-fill-picker-color-area">
        <canvas width="200" height="200"></canvas>
        <div class="fig-fill-picker-handle"></div>
      </div>
      <div class="fig-fill-picker-sliders">
        <fig-slider type="hue" variant="neue" min="0" max="360" value="${
          this.#color.h
        }"></fig-slider>
        ${
          showAlpha
            ? `<fig-slider type="opacity" variant="neue" text="true" units="%" min="0" max="100" value="${
                this.#color.a * 100
              }" color="${this.#hsvToHex(this.#color)}"></fig-slider>`
            : ""
        }
      </div>
      <div class="fig-fill-picker-inputs">
        <fig-button icon variant="ghost" class="fig-fill-picker-eyedropper" title="Pick color from screen"><span class="fig-mask-icon" style="--icon: var(--icon-eyedropper)"></span></fig-button>
        <fig-input-color class="fig-fill-picker-color-input" text="true" picker="false" value="${this.#hsvToHex(
          this.#color,
        )}"></fig-input-color>
      </div>
    `;

    // Setup color area
    this.#colorArea = container.querySelector("canvas");
    this.#colorAreaHandle = container.querySelector(".fig-fill-picker-handle");
    this.#drawColorArea();
    this.#updateHandlePosition();
    this.#setupColorAreaEvents();

    // Setup hue slider
    this.#hueSlider = container.querySelector('fig-slider[type="hue"]');
    this.#hueSlider.addEventListener("input", (e) => {
      this.#color.h = parseFloat(e.target.value);
      this.#drawColorArea();
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

    // Setup color input
    const colorInput = container.querySelector(".fig-fill-picker-color-input");
    colorInput.addEventListener("input", (e) => {
      // Skip if we're dragging - prevents feedback loop that loses saturation for dark colors
      if (this.#isDraggingColor) return;

      const hex = e.target.value;
      this.#color = { ...this.#hexToHSV(hex), a: this.#color.a };
      this.#drawColorArea();
      this.#updateHandlePosition();
      if (this.#hueSlider) {
        this.#hueSlider.setAttribute("value", this.#color.h);
      }
      this.#emitInput();
    });
    colorInput.addEventListener("change", () => {
      this.#emitChange();
    });

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

  #drawColorArea() {
    // Refresh canvas reference in case DOM changed
    if (!this.#colorArea && this.#dialog) {
      this.#colorArea = this.#dialog.querySelector('[data-tab="solid"] canvas');
    }
    if (!this.#colorArea) return;

    const ctx = this.#colorArea.getContext("2d");
    if (!ctx) return;

    const width = this.#colorArea.width;
    const height = this.#colorArea.height;

    // Clear canvas first
    ctx.clearRect(0, 0, width, height);

    // Draw saturation-value gradient
    const hue = this.#color.h;

    // Create horizontal gradient (white to hue color)
    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, "#FFFFFF");
    gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);

    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    // Create vertical gradient (transparent to black)
    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "rgba(0,0,0,1)");

    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }

  #updateHandlePosition() {
    if (!this.#colorAreaHandle || !this.#colorArea) return;

    const rect = this.#colorArea.getBoundingClientRect();
    const x = (this.#color.s / 100) * rect.width;
    const y = ((100 - this.#color.v) / 100) * rect.height;

    this.#colorAreaHandle.style.left = `${x}px`;
    this.#colorAreaHandle.style.top = `${y}px`;
    this.#colorAreaHandle.style.setProperty(
      "--picker-color",
      this.#hsvToHex({ ...this.#color, a: 1 }),
    );
  }

  #setupColorAreaEvents() {
    if (!this.#colorArea || !this.#colorAreaHandle) return;

    const updateFromEvent = (e) => {
      const rect = this.#colorArea.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      this.#color.s = (x / rect.width) * 100;
      this.#color.v = 100 - (y / rect.height) * 100;

      this.#updateHandlePosition();
      this.#updateColorInputs();
      this.#emitInput();
    };

    // Canvas click/drag
    this.#colorArea.addEventListener("pointerdown", (e) => {
      this.#isDraggingColor = true;
      this.#colorArea.setPointerCapture(e.pointerId);
      updateFromEvent(e);
    });

    this.#colorArea.addEventListener("pointermove", (e) => {
      if (this.#isDraggingColor) {
        updateFromEvent(e);
      }
    });

    this.#colorArea.addEventListener("pointerup", () => {
      this.#isDraggingColor = false;
      this.#emitChange();
    });

    // Handle drag (for when handle is at corners)
    this.#colorAreaHandle.addEventListener("pointerdown", (e) => {
      e.stopPropagation(); // Prevent canvas from also capturing
      this.#isDraggingColor = true;
      this.#colorAreaHandle.setPointerCapture(e.pointerId);
    });

    this.#colorAreaHandle.addEventListener("pointermove", (e) => {
      if (this.#isDraggingColor) {
        updateFromEvent(e);
      }
    });

    this.#colorAreaHandle.addEventListener("pointerup", () => {
      this.#isDraggingColor = false;
      this.#emitChange();
    });
  }

  #updateColorInputs() {
    if (!this.#dialog) return;

    const hex = this.#hsvToHex(this.#color);

    const colorInput = this.#dialog.querySelector(
      ".fig-fill-picker-color-input",
    );
    if (colorInput) {
      colorInput.setAttribute("value", hex);
    }

    if (this.#opacitySlider) {
      this.#opacitySlider.setAttribute("color", hex);
    }

    this.#updateChit();
  }

  // ============ GRADIENT TAB ============
  #initGradientTab() {
    const container = this.#dialog.querySelector('[data-tab="gradient"]');

    container.innerHTML = `
      <div class="fig-fill-picker-gradient-header">
        <fig-dropdown class="fig-fill-picker-gradient-type" value="${
          this.#gradient.type
        }">
          <option value="linear" selected>Linear</option>
          <option value="radial">Radial</option>
          <option value="angular">Angular</option>
        </fig-dropdown>
        <fig-tooltip text="Rotate gradient">
          <fig-input-angle class="fig-fill-picker-gradient-angle" value="${
            (this.#gradient.angle - 90 + 360) % 360
          }"></fig-input-angle>
        </fig-tooltip>
        <div class="fig-fill-picker-gradient-center input-combo" style="display: none;">
          <fig-input-number min="0" max="100" value="${
            this.#gradient.centerX
          }" units="%" class="fig-fill-picker-gradient-cx"></fig-input-number>
          <fig-input-number min="0" max="100" value="${
            this.#gradient.centerY
          }" units="%" class="fig-fill-picker-gradient-cy"></fig-input-number>
        </div>
        <fig-tooltip text="Flip gradient">
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-flip">
            <span class="fig-mask-icon" style="--icon: var(--icon-swap)"></span>
          </fig-button>
        </fig-tooltip>
      </div>
      <div class="fig-fill-picker-gradient-preview">
        <div class="fig-fill-picker-gradient-bar"></div>
        <div class="fig-fill-picker-gradient-stops-handles"></div>
      </div>
      <div class="fig-fill-picker-gradient-stops">
        <div class="fig-fill-picker-gradient-stops-header">
          <span>Stops</span>
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-add" title="Add stop">
            <span class="fig-mask-icon" style="--icon: var(--icon-add)"></span>
          </fig-button>
        </div>
        <div class="fig-fill-picker-gradient-stops-list"></div>
      </div>
    `;

    this.#updateGradientUI();
    this.#setupGradientEvents(container);
  }

  #setupGradientEvents(container) {
    // Type dropdown
    const typeDropdown = container.querySelector(
      ".fig-fill-picker-gradient-type",
    );
    typeDropdown.addEventListener("change", (e) => {
      this.#gradient.type = e.target.value;
      this.#updateGradientUI();
      this.#emitInput();
    });

    // Angle input
    // Convert from fig-input-angle coordinates (0° = right) to CSS coordinates (0° = up)
    const angleInput = container.querySelector(
      ".fig-fill-picker-gradient-angle",
    );
    angleInput.addEventListener("input", (e) => {
      const pickerAngle = parseFloat(e.target.value) || 0;
      this.#gradient.angle = (pickerAngle + 90) % 360;
      this.#updateGradientPreview();
      this.#emitInput();
    });

    // Center X/Y inputs
    const cxInput = container.querySelector(".fig-fill-picker-gradient-cx");
    const cyInput = container.querySelector(".fig-fill-picker-gradient-cy");
    cxInput?.addEventListener("input", (e) => {
      this.#gradient.centerX = parseFloat(e.target.value) || 50;
      this.#updateGradientPreview();
      this.#emitInput();
    });
    cyInput?.addEventListener("input", (e) => {
      this.#gradient.centerY = parseFloat(e.target.value) || 50;
      this.#updateGradientPreview();
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
  }

  #updateGradientUI() {
    if (!this.#dialog) return;

    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    if (!container) return;

    // Show/hide angle vs center inputs
    const angleInput = container.querySelector(
      ".fig-fill-picker-gradient-angle",
    );
    const centerInputs = container.querySelector(
      ".fig-fill-picker-gradient-center",
    );

    if (this.#gradient.type === "radial") {
      angleInput.style.display = "none";
      centerInputs.style.display = "flex";
    } else {
      angleInput.style.display = "block";
      centerInputs.style.display = "none";
      // Sync angle input value (convert CSS angle to picker angle)
      const pickerAngle = (this.#gradient.angle - 90 + 360) % 360;
      angleInput.setAttribute("value", pickerAngle);
    }

    this.#updateGradientPreview();
    this.#updateGradientStopsList();
  }

  #updateGradientPreview() {
    if (!this.#dialog) return;

    const bar = this.#dialog.querySelector(".fig-fill-picker-gradient-bar");
    if (bar) {
      bar.style.background = this.#getGradientCSS();
    }

    this.#updateChit();
  }

  #updateGradientStopsList() {
    if (!this.#dialog) return;

    const list = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-stops-list",
    );
    if (!list) return;

    list.innerHTML = this.#gradient.stops
      .map(
        (stop, index) => `
      <div class="fig-fill-picker-gradient-stop-row" data-index="${index}">
        <fig-input-number class="fig-fill-picker-stop-position" min="0" max="100" value="${
          stop.position
        }" units="%"></fig-input-number>
        <fig-input-color class="fig-fill-picker-stop-color" text="true" alpha="true" picker="figma" value="${
          stop.color
        }"></fig-input-color>
        <fig-button icon variant="ghost" class="fig-fill-picker-stop-remove" ${
          this.#gradient.stops.length <= 2 ? "disabled" : ""
        }>
          <span class="fig-mask-icon" style="--icon: var(--icon-minus)"></span>
        </fig-button>
      </div>
    `,
      )
      .join("");

    // Setup event listeners for each stop
    list
      .querySelectorAll(".fig-fill-picker-gradient-stop-row")
      .forEach((row) => {
        const index = parseInt(row.dataset.index);

        row
          .querySelector(".fig-fill-picker-stop-position")
          .addEventListener("input", (e) => {
            this.#gradient.stops[index].position =
              parseFloat(e.target.value) || 0;
            this.#updateGradientPreview();
            this.#emitInput();
          });

        row
          .querySelector(".fig-fill-picker-stop-color")
          .addEventListener("input", (e) => {
            this.#gradient.stops[index].color =
              e.target.hexOpaque || e.target.value;
            this.#gradient.stops[index].opacity =
              parseFloat(e.target.alpha) || 100;
            this.#updateGradientPreview();
            this.#emitInput();
          });

        row
          .querySelector(".fig-fill-picker-stop-remove")
          .addEventListener("click", () => {
            if (this.#gradient.stops.length > 2) {
              this.#gradient.stops.splice(index, 1);
              this.#updateGradientUI();
              this.#emitInput();
            }
          });
      });
  }

  #getGradientCSS() {
    const stops = this.#gradient.stops
      .map((s) => {
        const rgba = this.#hexToRGBA(s.color, s.opacity / 100);
        return `${rgba} ${s.position}%`;
      })
      .join(", ");

    switch (this.#gradient.type) {
      case "linear":
        return `linear-gradient(${this.#gradient.angle}deg, ${stops})`;
      case "radial":
        return `radial-gradient(circle at ${this.#gradient.centerX}% ${
          this.#gradient.centerY
        }%, ${stops})`;
      case "angular":
        // Offset by 90° to align with fig-input-angle (0° = right) vs CSS conic (0° = top)
        return `conic-gradient(from ${this.#gradient.angle + 90}deg, ${stops})`;
      default:
        return `linear-gradient(${this.#gradient.angle}deg, ${stops})`;
    }
  }

  // ============ IMAGE TAB ============
  #initImageTab() {
    const container = this.#dialog.querySelector('[data-tab="image"]');

    container.innerHTML = `
      <div class="fig-fill-picker-media-header">
        <fig-dropdown class="fig-fill-picker-scale-mode" value="${
          this.#image.scaleMode
        }">
          <option value="fill" selected>Fill</option>
          <option value="fit">Fit</option>
          <option value="crop">Crop</option>
          <option value="tile">Tile</option>
        </fig-dropdown>
        <fig-input-number class="fig-fill-picker-scale" min="1" max="200" value="${
          this.#image.scale
        }" units="%" style="display: none;"></fig-input-number>
      </div>
      <div class="fig-fill-picker-media-preview">
        <div class="fig-fill-picker-checkerboard"></div>
        <div class="fig-fill-picker-image-preview"></div>
        <fig-button variant="overlay" class="fig-fill-picker-upload">
          Upload from computer
          <input type="file" accept="image/*" style="display: none;" />
        </fig-button>
      </div>
    `;

    this.#setupImageEvents(container);
  }

  #setupImageEvents(container) {
    const scaleModeDropdown = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const scaleInput = container.querySelector(".fig-fill-picker-scale");
    const uploadBtn = container.querySelector(".fig-fill-picker-upload");
    const fileInput = container.querySelector('input[type="file"]');
    const preview = container.querySelector(".fig-fill-picker-image-preview");

    scaleModeDropdown.addEventListener("change", (e) => {
      this.#image.scaleMode = e.target.value;
      scaleInput.style.display = e.target.value === "tile" ? "block" : "none";
      this.#updateImagePreview(preview);
      this.#updateChit();
      this.#emitInput();
    });

    scaleInput.addEventListener("input", (e) => {
      this.#image.scale = parseFloat(e.target.value) || 100;
      this.#updateImagePreview(preview);
      this.#updateChit();
      this.#emitInput();
    });

    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.#image.url = e.target.result;
          this.#updateImagePreview(preview);
          this.#updateChit();
          this.#emitInput();
        };
        reader.readAsDataURL(file);
      }
    });

    // Drag and drop
    const previewArea = container.querySelector(
      ".fig-fill-picker-media-preview",
    );
    previewArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      previewArea.classList.add("dragover");
    });
    previewArea.addEventListener("dragleave", () => {
      previewArea.classList.remove("dragover");
    });
    previewArea.addEventListener("drop", (e) => {
      e.preventDefault();
      previewArea.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.#image.url = e.target.result;
          this.#updateImagePreview(preview);
          this.#updateChit();
          this.#emitInput();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  #updateImagePreview(element) {
    const container = element.closest(".fig-fill-picker-media-preview");
    if (!this.#image.url) {
      element.style.display = "none";
      container?.classList.remove("has-media");
      return;
    }

    element.style.display = "block";
    container?.classList.add("has-media");
    element.style.backgroundImage = `url(${this.#image.url})`;
    element.style.backgroundPosition = "center";

    switch (this.#image.scaleMode) {
      case "fill":
        element.style.backgroundSize = "cover";
        element.style.backgroundRepeat = "no-repeat";
        break;
      case "fit":
        element.style.backgroundSize = "contain";
        element.style.backgroundRepeat = "no-repeat";
        break;
      case "crop":
        element.style.backgroundSize = "cover";
        element.style.backgroundRepeat = "no-repeat";
        break;
      case "tile":
        element.style.backgroundSize = `${this.#image.scale}%`;
        element.style.backgroundRepeat = "repeat";
        element.style.backgroundPosition = "top left";
        break;
    }
  }

  // For video elements (still uses object-fit)
  #updateVideoPreviewStyle(element) {
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

    container.innerHTML = `
      <div class="fig-fill-picker-media-header">
        <fig-dropdown class="fig-fill-picker-scale-mode" value="${
          this.#video.scaleMode
        }">
          <option value="fill" selected>Fill</option>
          <option value="fit">Fit</option>
          <option value="crop">Crop</option>
        </fig-dropdown>
      </div>
      <div class="fig-fill-picker-media-preview">
        <div class="fig-fill-picker-checkerboard"></div>
        <video class="fig-fill-picker-video-preview" style="display: none;" muted loop></video>
        <fig-button variant="overlay" class="fig-fill-picker-upload">
          Upload from computer
          <input type="file" accept="video/*" style="display: none;" />
        </fig-button>
      </div>
    `;

    this.#setupVideoEvents(container);
  }

  #setupVideoEvents(container) {
    const scaleModeDropdown = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const uploadBtn = container.querySelector(".fig-fill-picker-upload");
    const fileInput = container.querySelector('input[type="file"]');
    const preview = container.querySelector(".fig-fill-picker-video-preview");

    scaleModeDropdown.addEventListener("change", (e) => {
      this.#video.scaleMode = e.target.value;
      this.#updateVideoPreviewStyle(preview);
      this.#updateChit();
      this.#emitInput();
    });

    uploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    // Drag and drop
    const previewArea = container.querySelector(
      ".fig-fill-picker-media-preview",
    );

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.#video.url = URL.createObjectURL(file);
        preview.src = this.#video.url;
        preview.style.display = "block";
        preview.play();
        previewArea.classList.add("has-media");
        this.#updateVideoPreviewStyle(preview);
        this.#updateChit();
        this.#emitInput();
      }
    });

    previewArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      previewArea.classList.add("dragover");
    });
    previewArea.addEventListener("dragleave", () => {
      previewArea.classList.remove("dragover");
    });
    previewArea.addEventListener("drop", (e) => {
      e.preventDefault();
      previewArea.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("video/")) {
        this.#video.url = URL.createObjectURL(file);
        preview.src = this.#video.url;
        preview.style.display = "block";
        preview.play();
        previewArea.classList.add("has-media");
        this.#updateVideoPreviewStyle(preview);
        this.#updateChit();
        this.#emitInput();
      }
    });
  }

  // ============ WEBCAM TAB ============
  #initWebcamTab() {
    const container = this.#dialog.querySelector('[data-tab="webcam"]');

    container.innerHTML = `
      <div class="fig-fill-picker-webcam-preview">
        <div class="fig-fill-picker-checkerboard"></div>
        <video class="fig-fill-picker-webcam-video" autoplay muted playsinline></video>
        <div class="fig-fill-picker-webcam-status">
          <span>Camera access required</span>
        </div>
      </div>
      <div class="fig-fill-picker-webcam-controls">
        <fig-dropdown class="fig-fill-picker-camera-select" style="display: none;">
        </fig-dropdown>
        <fig-button class="fig-fill-picker-webcam-capture" variant="primary">
          Capture
        </fig-button>
      </div>
    `;

    this.#setupWebcamEvents(container);
  }

  #setupWebcamEvents(container) {
    const video = container.querySelector(".fig-fill-picker-webcam-video");
    const status = container.querySelector(".fig-fill-picker-webcam-status");
    const captureBtn = container.querySelector(
      ".fig-fill-picker-webcam-capture",
    );
    const cameraSelect = container.querySelector(
      ".fig-fill-picker-camera-select",
    );

    const startWebcam = async (deviceId = null) => {
      try {
        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
        };

        if (this.#webcam.stream) {
          this.#webcam.stream.getTracks().forEach((track) => track.stop());
        }

        this.#webcam.stream =
          await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = this.#webcam.stream;
        video.style.display = "block";
        status.style.display = "none";

        // Enumerate cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === "videoinput");

        if (cameras.length > 1) {
          cameraSelect.style.display = "block";
          cameraSelect.innerHTML = cameras
            .map(
              (cam, i) =>
                `<option value="${cam.deviceId}">${
                  cam.label || `Camera ${i + 1}`
                }</option>`,
            )
            .join("");
        }
      } catch (err) {
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
        status.innerHTML = `<span>${message}</span>`;
        status.style.display = "flex";
        video.style.display = "none";
      }
    };

    // Start webcam when tab is shown
    const observer = new MutationObserver(() => {
      if (container.style.display !== "none" && !this.#webcam.stream) {
        startWebcam();
      }
    });
    observer.observe(container, {
      attributes: true,
      attributeFilter: ["style"],
    });

    cameraSelect.addEventListener("change", (e) => {
      startWebcam(e.target.value);
    });

    captureBtn.addEventListener("click", () => {
      if (!this.#webcam.stream) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);

      this.#webcam.snapshot = canvas.toDataURL("image/png");
      this.#image.url = this.#webcam.snapshot;
      this.#fillType = "image";
      this.#updateChit();
      this.#emitInput();

      // Switch to image tab to show result
      this.#switchTab("image");
      const tabs = this.#dialog.querySelector("fig-tabs");
      tabs.value = "image";
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

  // ============ EVENT EMITTERS ============
  #emitInput() {
    this.#updateChit();
    this.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: this.value,
      }),
    );
  }

  // ============ PUBLIC API ============
  get value() {
    const base = { type: this.#fillType };

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
          gradient: { ...this.#gradient },
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
          video: { ...this.#video },
        };
      case "webcam":
        return {
          ...base,
          image: { url: this.#webcam.snapshot, scaleMode: "fill", scale: 50 },
        };
      default:
        return base;
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
        this.#updateChit();
        if (this.#dialog) {
          // Update dialog UI if open - but don't rebuild if user is dragging
          if (!this.#isDraggingColor) {
            // Just update the handle position and color inputs without rebuilding
            this.#updateHandlePosition();
            this.#updateColorInputs();
            // Update hue slider
            if (this.#hueSlider) {
              this.#hueSlider.setAttribute("value", this.#color.h);
            }
            // Update opacity slider
            if (this.#opacitySlider) {
              this.#opacitySlider.setAttribute("value", this.#color.a * 100);
              this.#opacitySlider.setAttribute(
                "color",
                this.#hsvToHex(this.#color),
              );
            }
          }
        }
        break;
      case "disabled":
        // Handled in click listener
        break;
    }
  }
}
customElements.define("fig-fill-picker", FigFillPicker);
