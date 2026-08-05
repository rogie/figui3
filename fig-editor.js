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

function gradientToValueShape(gradient) {
  const normalized = normalizeGradientConfig(gradient);
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
 */
let figFillPickerDialogId = 0;

class FigFillPicker extends HTMLElement {
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
    this.#discardDialog();
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
    this.#ownedBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.#ownedBlobUrls.clear();
    if (this.#webcam.snapshot?.startsWith("blob:")) {
      if (this.#image.url === this.#webcam.snapshot) this.#image.url = null;
      this.#webcam.snapshot = null;
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

  #discardDialog() {
    if (this.#teardownColorAreaEvents) {
      this.#teardownColorAreaEvents();
      this.#teardownColorAreaEvents = null;
    }
    this.#gradientInterpolationOpenObserver?.disconnect();
    this.#gradientInterpolationOpenObserver = null;
    this.#stopWebcam();
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

  #stopWebcam() {
    this.#webcamRequestId += 1;
    if (this.#webcam.stream) {
      this.#webcam.stream.getTracks().forEach((track) => track.stop());
      this.#webcam.stream = null;
    }
    const video = this.#dialog?.querySelector(
      ".fig-fill-picker-webcam-video",
    );
    if (video) video.srcObject = null;
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
      headerContent = `<h3 class="fig-fill-picker-type-label">${figEditorEscapeAttribute(modeLabels[allowedModes[0]])}</h3>`;
    } else {
      const options = allowedModes
        .map(
          (m) =>
            `<fig-select-option value="${figEditorEscapeAttribute(m)}">${figEditorEscapeAttribute(modeLabels[m])}</fig-select-option>`,
        )
        .join("\n            ");
      headerContent = `<fig-select class="fig-fill-picker-type" label="Fill type" value="${figEditorEscapeAttribute(this.#fillType)}">
          <fig-select-options>
            ${options}
          </fig-select-options>
        </fig-select>`;
    }

    // Generate tab containers for all allowed modes
    const tabDivs = allowedModes
      .map(
        (m) =>
          `<div class="fig-fill-picker-tab" data-tab="${figEditorEscapeAttribute(m)}"></div>`,
      )
      .join("\n        ");

    this.#dialog.innerHTML = `
      <fig-header>
        ${headerContent}
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
      this.#stopWebcam();
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
      // Use RAF to ensure layout is complete before updating angle input
      this.#scheduleFrame(() => {
        this.#updateGradientUI();
        const barInput = tab.querySelector(".fig-fill-picker-gradient-bar-input");
        barInput?.refreshLayout?.();
        this.#scheduleFrame(() => {
          barInput?.refreshLayout?.();
        });
      });
    }

    if (tabName === "webcam") this.#webcamStart?.();

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

    container.innerHTML = `
      <fig-preview class="fig-fill-picker-color-area">
        <canvas width="200" height="200"></canvas>
        <fig-handle
          aria-label="Color saturation and brightness"
          role="slider"
          aria-valuemin="0"
          aria-valuemax="100"
          type="color"
          color="${this.#hsvToHex({ ...this.#color, a: 1 })}"
          data-no-color-picker
          drag
          drag-surface=".fig-fill-picker-color-area"
          drag-axes="x,y"
          drag-snapping="modifier"
        ></fig-handle>
      </fig-preview>
      <div class="fig-fill-picker-sliders${showAlpha ? "" : " is-hue-only"}">
        <fig-tooltip text="Sample color"><fig-button icon variant="ghost" class="fig-fill-picker-eyedropper" aria-label="Sample color"><fig-icon name="eyedropper"></fig-icon></fig-button></fig-tooltip>
        <fig-slider type="hue" variant="classic" text="false" min="0" max="360" aria-label="Hue" value="${
          this.#color.h
        }"></fig-slider>
        ${
          showAlpha
            ? `<fig-slider type="opacity" variant="classic" text="false" min="0" max="100" aria-label="Opacity" value="${
                this.#color.a * 100
              }" color="${this.#hsvToHex(this.#color)}"></fig-slider>`
            : ""
        }
      </div>
      <fig-field class="fig-fill-picker-inputs">
        <fig-select class="fig-fill-picker-input-mode" label="Color value format" value="${figEditorEscapeAttribute(this.#colorInputMode)}">
          <fig-select-options>
            <fig-select-option value="hex">Hex</fig-select-option>
            <fig-select-option value="rgb">RGB</fig-select-option>
            <fig-select-option value="css">CSS</fig-select-option>
            <fig-select-option value="hsl">HSL</fig-select-option>
            <fig-select-option value="hsb">HSB</fig-select-option>
            <fig-select-option value="lab">LAB</fig-select-option>
            <fig-select-option value="lch">LCH</fig-select-option>
          </fig-select-options>
        </fig-select>
        <span class="fig-fill-picker-input-fields"></span>
      </fig-field>
    `;

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

    const wrap = (tooltip, html) =>
      `<fig-tooltip text="${tooltip}">${html}</fig-tooltip>`;

    const num = (cls, label, min, max, step, units) =>
      `<fig-input-number class="${cls}" aria-label="${label}" min="${min}" max="${max}"${step != null ? ` step="${step}"` : ""}${units ? ` units="${units}"` : ""}></fig-input-number>`;

    const showAlpha = this.getAttribute("alpha") !== "false";
    const alphaField = () =>
      showAlpha
        ? wrap(
            "Alpha",
            num("fig-fill-picker-ci-a", "Alpha", 0, 100, 0.1, "%"),
          )
        : "";

    let html;
    switch (this.#colorInputMode) {
      case "rgb":
        html = `<div class="input-combo">
          ${wrap("Red", num("fig-fill-picker-ci-r", "Red", 0, 255))}
          ${wrap("Green", num("fig-fill-picker-ci-g", "Green", 0, 255))}
          ${wrap("Blue", num("fig-fill-picker-ci-b", "Blue", 0, 255))}
          ${alphaField()}
        </div>`;
        break;
      case "hsl":
        html = `<div class="input-combo">
          ${wrap("Hue", num("fig-fill-picker-ci-h", "Hue", 0, 360))}
          ${wrap("Saturation", num("fig-fill-picker-ci-s", "Saturation", 0, 100))}
          ${wrap("Lightness", num("fig-fill-picker-ci-l", "Lightness", 0, 100))}
          ${alphaField()}
        </div>`;
        break;
      case "hsb":
        html = `<div class="input-combo">
          ${wrap("Hue", num("fig-fill-picker-ci-h", "Hue", 0, 360))}
          ${wrap("Saturation", num("fig-fill-picker-ci-s", "Saturation", 0, 100))}
          ${wrap("Brightness", num("fig-fill-picker-ci-v", "Brightness", 0, 100))}
          ${alphaField()}
        </div>`;
        break;
      case "lab":
        html = `<div class="input-combo">
          ${wrap("Lightness", num("fig-fill-picker-ci-okl", "Lightness", 0, 100))}
          ${wrap("Green-Red axis", num("fig-fill-picker-ci-oka", "Green-Red axis", -0.4, 0.4, 0.001))}
          ${wrap("Blue-Yellow axis", num("fig-fill-picker-ci-okb", "Blue-Yellow axis", -0.4, 0.4, 0.001))}
          ${alphaField()}
        </div>`;
        break;
      case "lch":
        html = `<div class="input-combo">
          ${wrap("Lightness", num("fig-fill-picker-ci-okl", "Lightness", 0, 100))}
          ${wrap("Chroma", num("fig-fill-picker-ci-okc", "Chroma", 0, 0.4, 0.001))}
          ${wrap("Hue", num("fig-fill-picker-ci-okh", "Hue", 0, 360))}
          ${alphaField()}
        </div>`;
        break;
      case "css":
        html = `<fig-input-text class="fig-fill-picker-ci-css" aria-label="CSS color" placeholder="rgba(0, 0, 0, 1)"></fig-input-text>`;
        break;
      default: // hex
        html = showAlpha
          ? `<div class="input-combo fig-fill-picker-ci-hex-row">
          <fig-input-text class="fig-fill-picker-ci-hex" aria-label="Hex color" placeholder="FFFFFF"></fig-input-text>
          ${alphaField()}
        </div>`
          : `<fig-input-text class="fig-fill-picker-ci-hex" aria-label="Hex color" placeholder="FFFFFF"></fig-input-text>`;
        break;
    }

    container.innerHTML = html;
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
    const interpolationValue = gradientInterpolationSelectValue(this.#gradient);

    container.innerHTML = `
      <fig-field class="fig-fill-picker-gradient-header">
        <fig-select class="fig-fill-picker-gradient-type" label="Gradient type" value="${figEditorEscapeAttribute(this.#gradient.type)}">
          <fig-select-options>
            <fig-select-option value="linear">Linear</fig-select-option>
            <fig-select-option value="radial">Radial</fig-select-option>
            <fig-select-option value="angular">Angular</fig-select-option>
          </fig-select-options>
        </fig-select>
        <fig-tooltip text="Gradient angle">
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
        <div class="fig-fill-picker-gradient-actions">
          <fig-tooltip text="Flip gradient">
            <fig-button icon variant="ghost" class="fig-fill-picker-gradient-flip" aria-label="Flip gradient">
              <fig-icon name="swap"></fig-icon>
            </fig-button>
          </fig-tooltip>
          <fig-tooltip text="Rotate gradient">
            <fig-button icon variant="ghost" class="fig-fill-picker-gradient-rotate" aria-label="Rotate gradient">
              <fig-icon name="rotate"></fig-icon>
            </fig-button>
          </fig-tooltip>
        </div>
      </fig-field>
      <fig-preview class="fig-fill-picker-gradient-preview">
        <fig-input-gradient class="fig-fill-picker-gradient-bar-input" aria-label="Gradient stops" edit="true" mode="tip" size="large" value='${JSON.stringify({ type: "gradient", gradient: gradientToValueShape(this.#gradient) })}'></fig-input-gradient>
      </fig-preview>
      <div class="fig-fill-picker-gradient-stops">
        <fig-header class="fig-fill-picker-gradient-stops-header" borderless>
          <span>Stops</span>
          <fig-button icon variant="ghost" class="fig-fill-picker-gradient-add" aria-label="Add gradient stop" title="Add stop">
            <fig-icon name="add"></fig-icon>
          </fig-button>
        </fig-header>
        <div class="fig-fill-picker-gradient-stops-list">
          <fig-reorder></fig-reorder>
        </div>
      </div>
      <div class="fig-fill-picker-gradient-interpolation">
        <fig-header class="fig-fill-picker-gradient-interpolation-header" borderless>
          <span>Color interpolation</span>
        </fig-header>
        <fig-field class="fig-fill-picker-gradient-interpolation-field">
          <fig-select class="fig-fill-picker-gradient-space" label="Color interpolation" full value="${figEditorEscapeAttribute(interpolationValue)}">
            <fig-select-options>
              ${this.#gradientInterpolationOptionsMarkup()}
            </fig-select-options>
          </fig-select>
        </fig-field>
      </div>
    `;

    this.#updateGradientUI();
    this.#setupGradientEvents(container);
  }

  #gradientInterpolationOptionsMarkup() {
    const hueMethods = ["shorter", "longer", "increasing", "decreasing"];
    const groups = [
      {
        label: "Linear",
        options: [
          { value: "srgb", label: "sRGB" },
        ],
      },
      {
        label: "",
        options: [{ value: "oklab", label: "OKLAB" }],
      },
      {
        label: "Polar",
        options: hueMethods.map((method) => ({
          value: `oklch-${method}`,
          label: `OKLCH ${method.charAt(0).toUpperCase()}${method.slice(1)}`,
        })),
      },
      {
        label: "",
        separator: true,
        options: hueMethods.map((method) => ({
          value: `hsl-${method}`,
          label: `HSL ${method.charAt(0).toUpperCase()}${method.slice(1)}`,
        })),
      },
    ];
    return groups
      .map((group) => {
        const options = group.options
          .map((opt) => {
            const methodLabel = opt.method
              ? opt.method.charAt(0).toUpperCase() + opt.method.slice(1)
              : "";
            const appendLabel = opt.append || methodLabel;
            return `<fig-select-option value="${figEditorEscapeAttribute(opt.value)}" label="${figEditorEscapeAttribute(opt.label)}">
          <fig-interpolation-swatch slot="prepend" size="large" aria-hidden="true"></fig-interpolation-swatch>
          ${figEditorEscapeAttribute(opt.label)}
          ${appendLabel ? `<span slot="append">${figEditorEscapeAttribute(appendLabel)}</span>` : ""}
        </fig-select-option>`;
          })
          .join("");
        const separator = group.label || group.separator
          ? `<fig-menu-separator${group.label ? ` label="${figEditorEscapeAttribute(group.label)}"` : ""}></fig-menu-separator>`
          : "";
        return `${separator}${options}`;
      })
      .join("");
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
        }
      });
      this.#gradientInterpolationOpenObserver.observe(interpolationSelect, {
        attributes: true,
        attributeFilter: ["open"],
      });
    }
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
      const value = Number.parseFloat(e.target.value);
      this.#gradient.centerX = Number.isFinite(value) ? value : 50;
      this.#updateGradientPreview();
      this.#emitInput();
    });
    cyInput?.addEventListener("input", (e) => {
      const value = Number.parseFloat(e.target.value);
      this.#gradient.centerY = Number.isFinite(value) ? value : 50;
      this.#updateGradientPreview();
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
        this.#gradient = normalizeGradientConfig({
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
    this.#gradient = normalizeGradientConfig(this.#gradient);

    // Show/hide angle vs center inputs
    const angleInput = container.querySelector(
      ".fig-fill-picker-gradient-angle",
    );
    const rotateBtn = container.querySelector(
      ".fig-fill-picker-gradient-rotate",
    );
    const centerInputs = container.querySelector(
      ".fig-fill-picker-gradient-center",
    );

    if (this.#gradient.type === "radial") {
      angleInput.style.display = "none";
      if (rotateBtn) rotateBtn.style.display = "none";
      centerInputs.style.display = "flex";
    } else {
      angleInput.style.removeProperty("display");
      rotateBtn?.style.removeProperty("display");
      centerInputs.style.display = "none";
      // Sync angle input value (convert CSS angle to picker angle)
      const pickerAngle = (this.#gradient.angle - 90 + 360) % 360;
      angleInput.setAttribute("value", pickerAngle);
    }

    const interpolationSelect = container.querySelector(
      ".fig-fill-picker-gradient-space",
    );
    if (interpolationSelect) {
      interpolationSelect.value = gradientInterpolationSelectValue(
        this.#gradient,
      );
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
          swatch.closest("fig-select-option")?.getAttribute("value") || "srgb";
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

    reorder.innerHTML = this.#gradient.stops
      .map(
        (stop, index) => `
      <fig-field class="fig-fill-picker-gradient-stop-row" data-index="${index}">
        <fig-input-number class="fig-fill-picker-stop-position" aria-label="Gradient stop position" min="0" max="100" value="${
          stop.position
        }" units="%"></fig-input-number>
        <fig-input-color class="fig-fill-picker-stop-color" aria-label="Gradient stop color" text="true" alpha="true" picker="figma" picker-dialog-position="right" value="${this.#formatStopColorValue(
          stop,
        )}"></fig-input-color>
        <fig-button icon variant="ghost" class="fig-fill-picker-stop-remove" ${
          this.#gradient.stops.length <= 2 ? "disabled" : ""
        } aria-label="Remove gradient stop">
          <fig-icon name="minus"></fig-icon>
        </fig-button>
      </fig-field>
    `,
      )
      .join("");

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

    container.innerHTML = `
      <fig-field class="fig-fill-picker-media-header">
        <fig-select class="fig-fill-picker-scale-mode" label="Image scale mode" value="${figEditorEscapeAttribute(this.#image.scaleMode)}">
          <fig-select-options>
            <fig-select-option value="fill">Fill</fig-select-option>
            <fig-select-option value="fit">Fit</fig-select-option>
            <fig-select-option value="crop">Crop</fig-select-option>
            <fig-select-option value="tile">Tile</fig-select-option>
          </fig-select-options>
        </fig-select>
        <fig-input-number class="fig-fill-picker-scale" aria-label="Image tile scale" min="1" max="200" value="${
          this.#image.scale
        }" units="%" ${
          this.#image.scaleMode === "tile" ? "" : 'style="display: none;"'
        }></fig-input-number>
      </fig-field>
      <fig-image class="fig-fill-picker-media-preview fig-fill-picker-image-preview" upload="true" label="Upload from computer" alt="Image fill preview" size="auto" aspect-ratio="1/1" fit="cover" checkerboard="true"></fig-image>
    `;

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

    container.innerHTML = `
      <fig-field class="fig-fill-picker-media-header">
        <fig-select class="fig-fill-picker-scale-mode" label="Video scale mode" value="${figEditorEscapeAttribute(this.#video.scaleMode)}">
          <fig-select-options>
            <fig-select-option value="fill">Fill</fig-select-option>
            <fig-select-option value="fit">Fit</fig-select-option>
            <fig-select-option value="crop">Crop</fig-select-option>
          </fig-select-options>
        </fig-select>
      </fig-field>
      <fig-media class="fig-fill-picker-media-preview fig-fill-picker-video-preview" type="video" upload="true" label="Upload from computer" aria-label="Video fill preview" size="auto" aspect-ratio="1/1" fit="cover" checkerboard="true" autoplay="true" controls muted="true" loop="true"></fig-media>
    `;

    this.#setupVideoEvents(container);
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

    container.innerHTML = `
      <fig-field class="fig-fill-picker-webcam-camera" style="display: none;">
        <fig-select class="fig-fill-picker-camera-select" label="Camera" full>
          <fig-select-options></fig-select-options>
        </fig-select>
      </fig-field>
      <fig-video class="fig-fill-picker-webcam-preview" aria-label="Webcam preview" aspect-ratio="1/1" fit="cover" checkerboard="true" autoplay="true" muted="true">
        <video class="fig-fill-picker-webcam-video" autoplay muted playsinline></video>
        <div class="fig-fill-picker-webcam-status" role="status" aria-live="polite">
          <span>Camera access required</span>
        </div>
      </fig-video>
      <div class="fig-fill-picker-webcam-controls">
        <fig-button class="fig-fill-picker-webcam-capture" variant="secondary" full disabled>
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
      }
    };
    video.addEventListener("loadedmetadata", updateFrameReadiness);
    video.addEventListener("canplay", updateFrameReadiness);

    const startWebcam = async (deviceId = null) => {
      this.#stopWebcam();
      const requestId = this.#webcamRequestId;
      setCaptureReady(false);
      status.querySelector("span").textContent = "Starting camera";
      status.style.display = "flex";
      try {
        const constraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
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

        this.#webcam.stream = stream;
        video.srcObject = stream;
        video.style.display = "block";
        updateFrameReadiness();

        // Enumerate cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (requestId !== this.#webcamRequestId) return;
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
          if (deviceId) cameraSelect.value = deviceId;
        } else {
          cameraField.style.display = "none";
          cameraSelect
            .querySelector(":scope > fig-select-options")
            ?.replaceChildren();
        }
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
      if (next) startWebcam(next);
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
        this.#ownedBlobUrls.delete(this.#webcam.snapshot);
      }
      this.#webcam.snapshot = URL.createObjectURL(blob);
      this.#ownedBlobUrls.add(this.#webcam.snapshot);
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
