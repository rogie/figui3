import "./fig-layer.js";

function figEditorIsWebKitOrIOSBrowser() {
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

function figEditorSupportsCustomizedBuiltIns() {
  if (
    typeof window === "undefined" ||
    !window.customElements ||
    typeof HTMLButtonElement === "undefined"
  ) {
    return false;
  }

  const testName = `fig-editor-builtin-probe-${Math.random().toString(36).slice(2)}`;
  class FigEditorCustomizedBuiltInProbe extends HTMLButtonElement {}

  try {
    customElements.define(testName, FigEditorCustomizedBuiltInProbe, {
      extends: "button",
    });
    const probe = document.createElement("button", { is: testName });
    return probe instanceof FigEditorCustomizedBuiltInProbe;
  } catch (_error) {
    return false;
  }
}

const figEditorNeedsBuiltInPolyfill =
  figEditorIsWebKitOrIOSBrowser() && !figEditorSupportsCustomizedBuiltIns();
const figEditorBuiltInPolyfillReady = (
  figEditorNeedsBuiltInPolyfill
    ? import("./polyfills/custom-elements-webkit.js")
    : Promise.resolve()
)
  .then(() => {})
  .catch((error) => {
    throw error;
  });

function figEditorDefineCustomizedBuiltIn(name, constructor, options) {
  const define = () => {
    if (!customElements.get(name)) {
      customElements.define(name, constructor, options);
    }
  };

  if (!figEditorNeedsBuiltInPolyfill) {
    define();
    return;
  }

  figEditorBuiltInPolyfillReady.then(define).catch((error) => {
    console.error(
      `[figui3] Failed to load customized built-in polyfill for "${name}".`,
      error,
    );
  });
}

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
  constructor() {
    super();
    this._figInit();
  }

  _figInit() {
    if (this._figInitialized) return;
    this._figInitialized = true;
    this._defaultOffset = 16;
    this._autoCloseTimer = null;
    this._boundHandleClose = this.handleClose.bind(this);
  }

  getOffset() {
    return parseInt(this.getAttribute("offset") ?? this._defaultOffset);
  }

  connectedCallback() {
    this._figInit();

    if (!this.hasAttribute("theme")) {
      this.setAttribute("theme", "dark");
    }

    this.syncLiveRegion();

    const shouldOpen =
      this.getAttribute("open") === "true" || this.getAttribute("open") === "";
    if (this.hasAttribute("open") && !shouldOpen) {
      this.removeAttribute("open");
    }

    if (!shouldOpen) {
      this.close();
    }

    requestAnimationFrame(() => {
      this.addCloseListeners();
      this.applyPosition();

      if (shouldOpen) {
        this.showToast();
      }
    });
  }

  disconnectedCallback() {
    this._figInit();
    this.clearAutoClose();
  }

  addCloseListeners() {
    this.querySelectorAll("[close-toast]").forEach((button) => {
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
    this.style.bottom = `${this.getOffset()}px`;
    this.style.left = "50%";
    this.style.right = "auto";
    this.style.transform = "translateX(-50%)";
  }

  startAutoClose() {
    this.clearAutoClose();

    const duration = parseInt(this.getAttribute("duration") ?? "5000");
    if (duration > 0) {
      this._autoCloseTimer = setTimeout(() => {
        this.hideToast();
      }, duration);
    }
  }

  syncLiveRegion() {
    const assertive =
      this.getAttribute("live") === "assertive" ||
      this.getAttribute("theme") === "danger";
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", assertive ? "alert" : "status");
    }
    if (!this.hasAttribute("aria-live")) {
      this.setAttribute("aria-live", assertive ? "assertive" : "polite");
    }
    if (!this.hasAttribute("aria-atomic")) {
      this.setAttribute("aria-atomic", "true");
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
    const cs = getComputedStyle(document.documentElement).colorScheme || "";
    const isDark = cs.includes("dark");
    this.style.colorScheme = isDark ? "light" : "dark";
  }

  showToast() {
    this._resolveAutoTheme();
    if (!this.open) this.show();
    this.applyPosition();
    this.startAutoClose();
    this.dispatchEvent(new CustomEvent("toast-show", { bubbles: true }));
  }

  hideToast() {
    this.clearAutoClose();
    this.close();
    this.dispatchEvent(new CustomEvent("toast-hide", { bubbles: true }));
  }

  static get observedAttributes() {
    return ["duration", "offset", "open", "theme", "live"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._figInit();
    if (!this.isConnected) return;
    if (name === "offset") {
      this.applyPosition();
    }

    if (name === "open") {
      if (newValue !== null && newValue !== "false") {
        this.showToast();
      } else {
        this.hideToast();
      }
    }

    if (name === "theme") {
      if (newValue === "auto") {
        this._resolveAutoTheme();
      } else {
        this.style.removeProperty("color-scheme");
      }
    }

    if (name === "theme" || name === "live") {
      this.syncLiveRegion();
    }
  }
}
figEditorDefineCustomizedBuiltIn("fig-toast", FigToast, { extends: "dialog" });

// FigFillPicker
const GRADIENT_INTERPOLATION_SPACES = [
  "srgb",
  "srgb-linear",
  "display-p3",
  "oklab",
  "oklch",
];
const GRADIENT_HUE_INTERPOLATIONS = [
  "shorter",
  "longer",
  "increasing",
  "decreasing",
];

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

function gradientToValueShape(gradient) {
  const normalized = normalizeGradientConfig(gradient);
  const output = {
    ...normalized,
    interpolationSpace: normalized.interpolationSpace,
  };
  if (normalized.interpolationSpace === "oklch") {
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
  if (normalized.interpolationSpace === "oklch") {
    return `in oklch ${normalized.hueInterpolation} hue`;
  }
  return `in ${normalized.interpolationSpace}`;
}

/**
 * A comprehensive fill picker component supporting solid colors, gradients, images, video, and webcam.
 * Uses display: contents and wraps a trigger element that opens a dialog picker.
 *
 * @attr {string} value - JSON-encoded fill value
 * @attr {boolean} disabled - Whether the picker is disabled
 * @attr {boolean} alpha - Whether to show alpha/opacity controls (default: true)
 * @attr {string} dialog-position - Position of the popup (default: "left")
 */
class FigFillPicker extends HTMLElement {
  #trigger = null;
  #swatch = null;
  #dialog = null;
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
  #video = { url: null, scaleMode: "fill", scale: 50 };
  #webcam = { stream: null, snapshot: null };

  // Custom mode slots and data
  #customSlots = {};
  #customData = {};

  // DOM references for solid tab
  #colorArea = null;
  #colorAreaHandle = null;
  #hueSlider = null;
  #opacitySlider = null;
  #isDraggingColor = false;
  #teardownColorAreaEvents = null;
  #dialogOpenObserver = null;
  #webcamTabObserver = null;
  #boundTriggerClick = null;
  #boundTriggerKeydown = null;

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
      "experimental",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
    ];
  }

  connectedCallback() {
    // Use display: contents
    this.style.display = "contents";

    requestAnimationFrame(() => {
      this.#setupTrigger();
      this.#parseValue();
      this.#updateSwatch();
    });
  }

  disconnectedCallback() {
    if (this.#teardownColorAreaEvents) {
      this.#teardownColorAreaEvents();
      this.#teardownColorAreaEvents = null;
    }
    if (this.#dialogOpenObserver) {
      this.#dialogOpenObserver.disconnect();
      this.#dialogOpenObserver = null;
    }
    if (this.#webcamTabObserver) {
      this.#webcamTabObserver.disconnect();
      this.#webcamTabObserver = null;
    }
    if (this.#webcam.stream) {
      this.#webcam.stream.getTracks().forEach((track) => track.stop());
      this.#webcam.stream = null;
    }
    if (this.#webcam.snapshot?.startsWith("blob:")) {
      URL.revokeObjectURL(this.#webcam.snapshot);
      this.#webcam.snapshot = null;
    }
    if (this.#video.url && this.#video.url.startsWith("blob:")) {
      URL.revokeObjectURL(this.#video.url);
    }
    if (this.#swatch) this.#swatch.removeAttribute("selected");
    if (this.#trigger) {
      this.#trigger.removeEventListener("click", this.#boundTriggerClick);
      this.#trigger.removeEventListener("keydown", this.#boundTriggerKeydown);
    }
    if (this.#dialog) {
      this.#dialog.close();
      this.#dialog.remove();
      this.#dialog = null;
    }
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
    } else if (child.matches("fig-swatch")) {
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
      requestAnimationFrame(() => {
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
    const disabled = this.hasAttribute("disabled") && this.getAttribute("disabled") !== "false";
    const labelledBy = this.getAttribute("aria-labelledby");
    if (!this.#trigger.hasAttribute("role")) this.#trigger.setAttribute("role", "button");
    this.#trigger.setAttribute("tabindex", disabled ? "-1" : "0");
    this.#trigger.setAttribute("aria-disabled", disabled ? "true" : "false");
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
    if (this.hasAttribute("disabled")) return;
    e.stopPropagation();
    e.preventDefault();
    this.#openDialog();
  }

  #handleTriggerKeydown(e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (this.hasAttribute("disabled")) return;
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
      // Parse opacity (0-100) and convert to alpha (0-1)
      if (parsed.opacity !== undefined) {
        this.#color.a = parsed.opacity / 100;
      }
      if (parsed.colorSpace === "display-p3" || parsed.colorSpace === "srgb") {
        this.#gamut = parsed.colorSpace;
      }
      if (parsed.gradient) {
        this.#gradient = normalizeGradientConfig({
          ...this.#gradient,
          ...parsed.gradient,
        });
      }
      if (parsed.image) this.#image = { ...this.#image, ...parsed.image };
      if (parsed.video) this.#video = { ...this.#video, ...parsed.video };

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
        const slot = this.#customSlots[this.#fillType];
        bg = slot?.element?.getAttribute("swatch-background") || "#D9D9D9";
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
    if (!this.#dialog) {
      this.#createDialog();
    }

    this.#switchTab(this.#fillType);

    const gamutEl = this.#dialog.querySelector(".fig-fill-picker-gamut");
    if (gamutEl) gamutEl.value = this.#gamut;

    if (this.#swatch) this.#swatch.setAttribute("selected", "true");

    this.#dialog.open = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.#drawColorArea();
        this.#updateHandlePosition();
      });
    });
  }

  open() {
    this.#openDialog();
  }

  close() {
    if (this.#dialog) this.#dialog.open = false;
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

    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    let headerContent;
    if (allowedModes.length === 1) {
      headerContent = `<h3 class="fig-fill-picker-type-label">${modeLabels[allowedModes[0]]}</h3>`;
    } else {
      const options = allowedModes
        .map((m) => `<option value="${m}">${modeLabels[m]}</option>`)
        .join("\n          ");
      headerContent = `<fig-dropdown class="fig-fill-picker-type" label="Fill type" ${expAttr} value="${this.#fillType}">
          ${options}
        </fig-dropdown>`;
    }

    // Generate tab containers for all allowed modes
    const tabDivs = allowedModes
      .map((m) => `<div class="fig-fill-picker-tab" data-tab="${m}"></div>`)
      .join("\n        ");

    const gamutDropdown = `<fig-dropdown class="fig-fill-picker-gamut" label="Color gamut" ${expAttr} value="${this.#gamut}">
          <option value="srgb">sRGB</option>
          <option value="display-p3">Display P3</option>
        </fig-dropdown>`;

    this.#dialog.innerHTML = `
      <fig-header>
        ${headerContent}
        ${gamutDropdown}
        <fig-button icon variant="ghost" class="fig-fill-picker-close" aria-label="Close fill picker">
          <fig-icon name="close"></fig-icon>
        </fig-button>
      </fig-header>
      <fig-content>
        ${tabDivs}
      </fig-content>
    `;

    document.body.appendChild(this.#dialog);

    // Populate custom tab containers and emit modeready
    for (const [modeName, { element }] of Object.entries(this.#customSlots)) {
      const container = this.#dialog.querySelector(`[data-tab="${modeName}"]`);
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

    // Setup type dropdown switching (only if not locked)
    const typeDropdown = this.#dialog.querySelector(".fig-fill-picker-type");
    if (typeDropdown) {
      typeDropdown.addEventListener("change", (e) => {
        this.#switchTab(e.target.value);
      });
    }

    // Setup gamut dropdown
    const gamutEl = this.#dialog.querySelector(".fig-fill-picker-gamut");
    if (gamutEl) {
      const handleGamutChange = (e) => {
        const val = e.currentTarget?.value ?? e.target?.value ?? e.detail;
        if (val && val !== this.#gamut) {
          this.#gamut = val;
          this.#onGamutChange();
        }
      };
      gamutEl.addEventListener("input", handleGamutChange);
      gamutEl.addEventListener("change", handleGamutChange);
    }

    this.#dialog
      .querySelector(".fig-fill-picker-close")
      .addEventListener("click", () => {
        this.#dialog.open = false;
      });

    const onDialogClose = () => {
      if (this.#swatch) this.#swatch.removeAttribute("selected");
      this.#emitChange();
      this.dispatchEvent(new CustomEvent("close"));
    };
    this.#dialog.addEventListener("close", onDialogClose);

    this.#dialogOpenObserver = new MutationObserver(() => {
      const isOpen =
        this.#dialog.hasAttribute("open") &&
        this.#dialog.getAttribute("open") !== "false";
      if (!isOpen) onDialogClose();
    });
    this.#dialogOpenObserver.observe(this.#dialog, {
      attributes: true,
      attributeFilter: ["open"],
    });

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
      const container = this.#dialog.querySelector(`[data-tab="${modeName}"]`);
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

  #switchTab(tabName) {
    // Only allow switching to modes that have a tab container in the dialog
    const tab = this.#dialog?.querySelector(
      `.fig-fill-picker-tab[data-tab="${tabName}"]`,
    );
    if (!tab) return;

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

    // Zero out content padding for custom mode tabs
    const contentEl = this.#dialog.querySelector("fig-content");
    if (contentEl) {
      contentEl.style.padding = this.#customSlots[tabName] ? "0" : "";
    }

    // Update tab-specific UI after visibility change
    if (tabName === "gradient") {
      // Use RAF to ensure layout is complete before updating angle input
      requestAnimationFrame(() => {
        this.#updateGradientUI();
        const barInput = tab.querySelector(".fig-fill-picker-gradient-bar-input");
        barInput?.refreshLayout?.();
        requestAnimationFrame(() => {
          barInput?.refreshLayout?.();
        });
      });
    }

    this.#updateSwatch();
    this.#emitInput();
  }

  // ============ SOLID TAB ============
  #initSolidTab() {
    const container = this.#dialog.querySelector('[data-tab="solid"]');
    const showAlpha = this.getAttribute("alpha") !== "false";
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-preview class="fig-fill-picker-color-area">
        <canvas width="200" height="200"></canvas>
        <fig-handle
          aria-label="Color saturation and brightness"
          type="color"
          color="${this.#hsvToHex({ ...this.#color, a: 1 })}"
          data-no-color-picker
          drag
          drag-surface=".fig-fill-picker-color-area"
          drag-axes="x,y"
          drag-snapping="modifier"
        ></fig-handle>
      </fig-preview>
      <div class="fig-fill-picker-sliders">
        <fig-tooltip text="Sample color"><fig-button icon variant="ghost" class="fig-fill-picker-eyedropper" aria-label="Sample color"><fig-icon name="eyedropper"></fig-icon></fig-button></fig-tooltip>
        <fig-slider type="hue" text="false" min="0" max="360" aria-label="Hue" value="${
          this.#color.h
        }"></fig-slider>
        ${
          showAlpha
            ? `<fig-slider type="opacity" text="true" units="%" min="0" max="100" aria-label="Opacity" value="${
                this.#color.a * 100
              }" color="${this.#hsvToHex(this.#color)}"></fig-slider>`
            : ""
        }
      </div>
      <fig-field class="fig-fill-picker-inputs">
        <fig-dropdown class="fig-fill-picker-input-mode" label="Color value format" ${expAttr} value="${this.#colorInputMode}">
          <option value="hex">Hex</option>
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
          <option value="hsb">HSB</option>
          <option value="lab">LAB</option>
          <option value="lch">LCH</option>
        </fig-dropdown>
        <span class="fig-fill-picker-input-fields"></span>
      </fig-field>
    `;

    // Setup color area
    this.#colorArea = container.querySelector("canvas");
    this.#colorAreaHandle = container.querySelector("fig-handle");
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

    // Setup color input mode dropdown
    const modeDropdown = container.querySelector(".fig-fill-picker-input-mode");
    modeDropdown.addEventListener("input", (e) => {
      this.#colorInputMode = e.target.value;
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

    const rect = this.#colorArea.getBoundingClientRect();

    // If the canvas isn't visible yet (0 dimensions), schedule a retry (max 5 attempts)
    if ((rect.width === 0 || rect.height === 0) && retryCount < 5) {
      requestAnimationFrame(() => this.#updateHandlePosition(retryCount + 1));
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

  #updateColorFromAreaPosition(x, y, opts = {}) {
    const { updateHandle = true, emitInput = true, emitChange = false } = opts;
    this.#color.s = Math.max(0, Math.min(100, x * 100));
    this.#color.v = Math.max(0, Math.min(100, (1 - y) * 100));
    if (this.#colorAreaHandle) {
      this.#colorAreaHandle.setAttribute(
        "color",
        this.#hsvToHex({ ...this.#color, a: 1 }),
      );
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

    const wrap = (tooltip, html) =>
      `<fig-tooltip text="${tooltip}">${html}</fig-tooltip>`;

    const num = (cls, label, min, max, step) =>
      `<fig-input-number class="${cls}" aria-label="${label}" min="${min}" max="${max}"${step != null ? ` step="${step}"` : ""}></fig-input-number>`;

    let html;
    switch (this.#colorInputMode) {
      case "rgb":
        html = `<div class="input-combo">
          ${wrap("Red", num("fig-fill-picker-ci-r", "Red", 0, 255))}
          ${wrap("Green", num("fig-fill-picker-ci-g", "Green", 0, 255))}
          ${wrap("Blue", num("fig-fill-picker-ci-b", "Blue", 0, 255))}
        </div>`;
        break;
      case "hsl":
        html = `<div class="input-combo">
          ${wrap("Hue", num("fig-fill-picker-ci-h", "Hue", 0, 360))}
          ${wrap("Saturation", num("fig-fill-picker-ci-s", "Saturation", 0, 100))}
          ${wrap("Lightness", num("fig-fill-picker-ci-l", "Lightness", 0, 100))}
        </div>`;
        break;
      case "hsb":
        html = `<div class="input-combo">
          ${wrap("Hue", num("fig-fill-picker-ci-h", "Hue", 0, 360))}
          ${wrap("Saturation", num("fig-fill-picker-ci-s", "Saturation", 0, 100))}
          ${wrap("Brightness", num("fig-fill-picker-ci-v", "Brightness", 0, 100))}
        </div>`;
        break;
      case "lab":
        html = `<div class="input-combo">
          ${wrap("Lightness", num("fig-fill-picker-ci-okl", "Lightness", 0, 100))}
          ${wrap("Green-Red axis", num("fig-fill-picker-ci-oka", "Green-Red axis", -0.4, 0.4, 0.001))}
          ${wrap("Blue-Yellow axis", num("fig-fill-picker-ci-okb", "Blue-Yellow axis", -0.4, 0.4, 0.001))}
        </div>`;
        break;
      case "lch":
        html = `<div class="input-combo">
          ${wrap("Lightness", num("fig-fill-picker-ci-okl", "Lightness", 0, 100))}
          ${wrap("Chroma", num("fig-fill-picker-ci-okc", "Chroma", 0, 0.4, 0.001))}
          ${wrap("Hue", num("fig-fill-picker-ci-okh", "Hue", 0, 360))}
        </div>`;
        break;
      default: // hex
        html = `<fig-input-text class="fig-fill-picker-ci-hex" aria-label="Hex color" placeholder="FFFFFF"></fig-input-text>`;
        break;
    }

    container.innerHTML = html;
    this.#wireColorInputEvents();
    requestAnimationFrame(() => this.#updateColorInputs());
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
      this.#color = { ...color, a: this.#color.a };
      this.#drawColorArea();
      this.#updateHandlePosition();
      if (this.#hueSlider) {
        this.#hueSlider.setAttribute("value", this.#color.h);
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

  #readColorFromInputs() {
    const q = (cls) => this.#dialog?.querySelector(`.${cls}`);
    const val = (cls) => parseFloat(q(cls)?.value ?? 0);

    switch (this.#colorInputMode) {
      case "rgb":
        return this.#rgbToHSV({
          r: val("fig-fill-picker-ci-r"),
          g: val("fig-fill-picker-ci-g"),
          b: val("fig-fill-picker-ci-b"),
        });
      case "hsl": {
        const rgb = this.#hslToRGB({
          h: val("fig-fill-picker-ci-h"),
          s: val("fig-fill-picker-ci-s"),
          l: val("fig-fill-picker-ci-l"),
        });
        return this.#rgbToHSV(rgb);
      }
      case "hsb":
        return {
          h: val("fig-fill-picker-ci-h"),
          s: val("fig-fill-picker-ci-s"),
          v: val("fig-fill-picker-ci-v"),
          a: 1,
        };
      case "lab": {
        const rgb = this.#oklabToRGB({
          l: val("fig-fill-picker-ci-okl") / 100,
          a: val("fig-fill-picker-ci-oka"),
          b: val("fig-fill-picker-ci-okb"),
        });
        return this.#rgbToHSV(rgb);
      }
      case "lch": {
        const rgb = this.#oklchToRGB({
          l: val("fig-fill-picker-ci-okl") / 100,
          c: val("fig-fill-picker-ci-okc"),
          h: val("fig-fill-picker-ci-okh"),
        });
        return this.#rgbToHSV(rgb);
      }
      default: {
        // hex
        const hexEl = q("fig-fill-picker-ci-hex");
        if (!hexEl) return null;
        let hex = hexEl.value.replace(/^#/, "");
        if (hex.length === 3)
          hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return null;
        return this.#hexToHSV(`#${hex}`);
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
      default: // hex
        set("fig-fill-picker-ci-hex", hex.replace(/^#/, "").toUpperCase());
        break;
    }

    if (this.#opacitySlider) {
      this.#opacitySlider.setAttribute("color", hex);
    }

    this.#updateSwatch();
  }

  // ============ GRADIENT TAB ============
  #initGradientTab() {
    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-gradient-header">
        <fig-dropdown class="fig-fill-picker-gradient-type" label="Gradient type" ${expAttr} value="${
          this.#gradient.type
        }">
          <option value="linear" selected>Linear</option>
          <option value="radial">Radial</option>
          <option value="angular">Angular</option>
        </fig-dropdown>
        <fig-tooltip text="Rotate gradient">
          <fig-input-number class="fig-fill-picker-gradient-angle" aria-label="Gradient angle" value="${
            (this.#gradient.angle - 90 + 360) % 360
          }" min="0" max="360" units="°" wrap></fig-input-number>
        </fig-tooltip>
        <div class="fig-fill-picker-gradient-center input-combo" style="display: none;">
          <fig-input-number min="0" max="100" aria-label="Gradient center X" value="${
            this.#gradient.centerX
          }" units="%" class="fig-fill-picker-gradient-cx"></fig-input-number>
          <fig-input-number min="0" max="100" aria-label="Gradient center Y" value="${
            this.#gradient.centerY
          }" units="%" class="fig-fill-picker-gradient-cy"></fig-input-number>
        </div>
        <fig-tooltip text="Flip gradient">
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-flip" aria-label="Flip gradient">
            <fig-icon name="swap"></fig-icon>
          </fig-button>
        </fig-tooltip>
      </fig-field>
      <fig-preview class="fig-fill-picker-gradient-preview">
        <fig-input-gradient class="fig-fill-picker-gradient-bar-input" aria-label="Gradient stops" edit="true" mode="tip" size="large" value='${JSON.stringify({ type: "gradient", gradient: gradientToValueShape(this.#gradient) })}'></fig-input-gradient>
      </fig-preview>
      <fig-field class="fig-fill-picker-gradient-interpolation">
        <label>Mixing</label>
        <fig-dropdown class="fig-fill-picker-gradient-space" label="Gradient mixing" full ${expAttr} value="${
          this.#gradient.interpolationSpace === "oklch"
            ? `oklch-${this.#gradient.hueInterpolation || "shorter"}`
            : this.#gradient.interpolationSpace
        }">
          <optgroup label="sRGB">
            <option value="srgb">Classic</option>
            <option value="srgb-linear">Linear</option>
          </optgroup>
          <optgroup label="OKLab">
            <option value="oklab">Perceptual</option>
          </optgroup>
          <optgroup label="OKLCH">
            <option value="oklch-shorter">Shorter hue</option>
            <option value="oklch-longer">Longer hue</option>
            <option value="oklch-increasing">Increasing hue</option>
            <option value="oklch-decreasing">Decreasing hue</option>
          </optgroup>
        </fig-dropdown>
      </fig-field>
      <div class="fig-fill-picker-gradient-stops">
        <fig-header class="fig-fill-picker-gradient-stops-header" borderless>
          <span>Stops</span>
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-add" aria-label="Add gradient stop" title="Add stop">
            <fig-icon name="add"></fig-icon>
          </fig-button>
        </fig-header>
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
    const getDropdownValue = (event) =>
      event.currentTarget?.value ?? event.target?.value ?? event.detail;

    const handleTypeChange = (e) => {
      this.#gradient.type = getDropdownValue(e);
      this.#updateGradientUI();
      this.#emitInput();
    };
    typeDropdown.addEventListener("input", handleTypeChange);
    typeDropdown.addEventListener("change", handleTypeChange);

    const interpolationDropdown = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    const handleInterpolationChange = (e) => {
      const val = getDropdownValue(e);
      let space = val;
      let hue = "shorter";
      if (val.startsWith("oklch-")) {
        space = "oklch";
        hue = val.slice(6);
      }
      this.#gradient = normalizeGradientConfig({
        ...this.#gradient,
        interpolationSpace: space,
        hueInterpolation: hue,
      });
      this.#updateGradientUI();
      this.#emitInput();
    };
    interpolationDropdown?.addEventListener("input", handleInterpolationChange);
    interpolationDropdown?.addEventListener(
      "change",
      handleInterpolationChange,
    );

    // Angle input
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

    // Embedded gradient bar input
    const gradientBarInput = container.querySelector(
      ".fig-fill-picker-gradient-bar-input",
    );
    if (gradientBarInput) {
      const syncFromBarInput = (e) => {
        e.stopPropagation();
        const detail = e.detail;
        if (!detail?.gradient) return;
        this.#gradient = normalizeGradientConfig({
          ...this.#gradient,
          ...detail.gradient,
        });
        this.#updateSwatch();
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
  }

  #updateGradientUI() {
    if (!this.#dialog) return;

    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    if (!container) return;
    this.#gradient = normalizeGradientConfig(this.#gradient);

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

    const interpolationDropdown = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    if (interpolationDropdown) {
      interpolationDropdown.value =
        this.#gradient.interpolationSpace === "oklch"
          ? `oklch-${this.#gradient.hueInterpolation || "shorter"}`
          : this.#gradient.interpolationSpace;
    }

    this.#updateGradientPreview();
    this.#updateGradientStopsList();
  }

  #updateGradientPreview() {
    if (!this.#dialog) return;

    const barInput = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-bar-input",
    );
    if (barInput) {
      barInput.setAttribute(
        "value",
        JSON.stringify({
          type: "gradient",
          gradient: gradientToValueShape(this.#gradient),
        }),
      );
    }

    this.#updateSwatch();
  }

  #updateGradientStopsList() {
    if (!this.#dialog) return;

    const list = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-stops-list",
    );
    if (!list) return;

    const existingRows = list.querySelectorAll(
      ".fig-fill-picker-gradient-stop-row",
    );

    if (existingRows.length === this.#gradient.stops.length) {
      this.#gradient.stops.forEach((stop, index) => {
        const row = existingRows[index];
        row.dataset.index = index;
        const posInput = row.querySelector(".fig-fill-picker-stop-position");
        if (posInput) posInput.setAttribute("value", stop.position);
        const colorInput = row.querySelector(".fig-fill-picker-stop-color");
        if (colorInput) colorInput.setAttribute("value", stop.color);
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
    list.innerHTML = this.#gradient.stops
      .map(
        (stop, index) => `
      <fig-field class="fig-fill-picker-gradient-stop-row" data-index="${index}">
        <fig-input-number class="fig-fill-picker-stop-position" aria-label="Gradient stop position" min="0" max="100" value="${
          stop.position
        }" units="%"></fig-input-number>
        <fig-input-color class="fig-fill-picker-stop-color" aria-label="Gradient stop color" text="true" alpha="true" picker="figma" picker-dialog-position="right" value="${
          stop.color
        }"></fig-input-color>
        <fig-button icon variant="ghost" class="fig-fill-picker-stop-remove" ${
          this.#gradient.stops.length <= 2 ? "disabled" : ""
        } aria-label="Remove gradient stop">
          <fig-icon name="minus"></fig-icon>
        </fig-button>
      </fig-field>
    `,
      )
      .join("");

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

        const stopColor = row.querySelector(".fig-fill-picker-stop-color");
        const stopFillPicker = stopColor.querySelector("fig-fill-picker");
        if (stopFillPicker) {
          stopFillPicker.anchorElement = this.#dialog;
        } else {
          requestAnimationFrame(() => {
            const fp = stopColor.querySelector("fig-fill-picker");
            if (fp) fp.anchorElement = this.#dialog;
          });
        }

        stopColor.addEventListener("input", (e) => {
          this.#gradient.stops[index].color =
            e.target.hexOpaque || e.target.value;
          const a = e.detail?.rgba?.a;
          if (a !== undefined) {
            this.#gradient.stops[index].opacity = Math.round(a * 100);
          }
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
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-media-header">
        <fig-dropdown class="fig-fill-picker-scale-mode" label="Image scale mode" ${expAttr} value="${
          this.#image.scaleMode
        }">
          <option value="fill" selected>Fill</option>
          <option value="fit">Fit</option>
          <option value="crop">Crop</option>
          <option value="tile">Tile</option>
        </fig-dropdown>
        <fig-input-number class="fig-fill-picker-scale" aria-label="Image tile scale" min="1" max="200" value="${
          this.#image.scale
        }" units="%" ${
          this.#image.scaleMode === "tile" ? "" : 'style="display: none;"'
        }></fig-input-number>
        <fig-button class="fig-fill-picker-media-rotate" icon variant="ghost" aria-label="Rotate">
          <fig-icon name="rotate"></fig-icon>
        </fig-button>
      </fig-field>
      <fig-image class="fig-fill-picker-media-preview fig-fill-picker-image-preview" upload="true" label="Upload from computer" alt="Image fill preview" size="auto" aspect-ratio="1/1" fit="cover" checkerboard="true"></fig-image>
    `;

    this.#setupImageEvents(container);
  }

  #setupImageEvents(container) {
    const scaleModeDropdown = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const scaleInput = container.querySelector(".fig-fill-picker-scale");
    const preview = container.querySelector(".fig-fill-picker-image-preview");

    scaleModeDropdown.addEventListener("change", (e) => {
      this.#image.scaleMode = e.target.value;
      scaleInput.style.display = e.target.value === "tile" ? "block" : "none";
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
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-media-header">
        <fig-dropdown class="fig-fill-picker-scale-mode" label="Video scale mode" ${expAttr} value="${
          this.#video.scaleMode
        }">
          <option value="fill" selected>Fill</option>
          <option value="fit">Fit</option>
          <option value="crop">Crop</option>
        </fig-dropdown>
        <fig-button class="fig-fill-picker-media-rotate" icon variant="ghost" aria-label="Rotate">
          <fig-icon name="rotate"></fig-icon>
        </fig-button>
      </fig-field>
      <fig-media class="fig-fill-picker-media-preview fig-fill-picker-video-preview" type="video" upload="true" label="Upload from computer" aria-label="Video fill preview" size="auto" aspect-ratio="1/1" fit="cover" checkerboard="true" autoplay="true" controls muted="true" loop="true"></fig-media>
    `;

    this.#setupVideoEvents(container);
  }

  #setupVideoEvents(container) {
    const scaleModeDropdown = container.querySelector(
      ".fig-fill-picker-scale-mode",
    );
    const preview = container.querySelector(".fig-fill-picker-video-preview");

    scaleModeDropdown.addEventListener("change", (e) => {
      this.#video.scaleMode = e.target.value;
      this.#updateVideoPreviewStyle(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    preview.addEventListener("loaded", (e) => {
      const src = e.detail?.src || preview.src;
      if (!src) return;
      this.#video.url = src;
      this.#updateVideoPreviewStyle(preview);
      preview.play?.();
      this.#updateSwatch();
      this.#emitInput();
    });

    preview.addEventListener("change", () => {
      if (preview.src) return;
      this.#video.url = null;
      this.#updateVideoPreviewStyle(preview);
      this.#updateSwatch();
      this.#emitInput();
    });

    this.#updateVideoPreviewStyle(preview);
  }

  // ============ WEBCAM TAB ============
  #initWebcamTab() {
    const container = this.#dialog.querySelector('[data-tab="webcam"]');
    const experimental = this.getAttribute("experimental");
    const expAttr = experimental ? `experimental="${experimental}"` : "";

    container.innerHTML = `
      <fig-field class="fig-fill-picker-webcam-camera" style="display: none;">
        <fig-dropdown class="fig-fill-picker-camera-select" label="Camera" full ${expAttr}>
        </fig-dropdown>
      </fig-field>
      <fig-video class="fig-fill-picker-webcam-preview" aria-label="Webcam preview" aspect-ratio="1/1" fit="cover" checkerboard="true" autoplay="true" muted="true">
        <video class="fig-fill-picker-webcam-video" autoplay muted playsinline></video>
        <div class="fig-fill-picker-webcam-status">
          <span>Camera access required</span>
        </div>
      </fig-video>
      <div class="fig-fill-picker-webcam-controls">
        <fig-button class="fig-fill-picker-webcam-capture" variant="secondary" full>
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
    const cameraField = container.querySelector(
      ".fig-fill-picker-webcam-camera",
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
          cameraField.style.display = "";
          cameraSelect
            .querySelectorAll(":scope > option, :scope > optgroup")
            .forEach((option) => option.remove());
          cameras.forEach((cam, i) => {
            const option = document.createElement("option");
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
            cameraSelect.append(option);
          });
          if (deviceId) cameraSelect.value = deviceId;
        } else {
          cameraField.style.display = "none";
          cameraSelect
            .querySelectorAll(":scope > option, :scope > optgroup")
            .forEach((option) => option.remove());
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

    this.#webcamTabObserver = new MutationObserver(() => {
      if (container.style.display !== "none" && !this.#webcam.stream) {
        startWebcam();
      }
    });
    this.#webcamTabObserver.observe(container, {
      attributes: true,
      attributeFilter: ["style"],
    });

    cameraSelect.addEventListener("change", (e) => {
      startWebcam(e.target.value);
    });

    captureBtn.addEventListener("click", async () => {
      if (!this.#webcam.stream) return;
      if (!video.videoWidth || !video.videoHeight) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) return;

      if (this.#webcam.snapshot?.startsWith("blob:")) {
        URL.revokeObjectURL(this.#webcam.snapshot);
      }
      this.#webcam.snapshot = URL.createObjectURL(blob);
      this.#image.url = this.#webcam.snapshot;

      const imagePreview = this.#dialog.querySelector(
        ".fig-fill-picker-image-preview",
      );
      if (imagePreview) this.#updateImagePreview(imagePreview);

      // Switch to image tab to show result
      this.#switchTab("image");
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
    this.#updateSwatch();
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
          video: { ...this.#video },
        };
      case "webcam":
        return {
          ...base,
          image: { url: this.#webcam.snapshot, scaleMode: "fill", scale: 50 },
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
        this.#syncTriggerA11y();
        break;
      case "aria-label":
      case "aria-labelledby":
      case "aria-describedby":
        this.#syncTriggerA11y();
        break;
    }
  }
}
customElements.define("fig-fill-picker", FigFillPicker);
