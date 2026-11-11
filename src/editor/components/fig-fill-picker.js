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
import {
  figConvertRGB,
  figHexToRGB as figEditorHexToRgb,
  figHslToRGB,
  figHsvToRGB,
  figOklabToOklch as figEditorOklabToOklch,
  figOklabToRGB,
  figOklchToRGB,
  figRGBToHsl as figEditorRgbToHsl,
  figRGBToHsv,
  figRGBToOklab as figEditorRgbToOklab,
  figRGBToOklch,
} from "../../../fig-color.js";
import { AsyncOperationOwner } from "../../internal/async-operation-owner.js";
import { figGradientCSS } from "./fig-gradient-editor.js";
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
    angle: 180,
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
  #videoPosterCapturing = null;
  #videoPosterSrc = null;
  #webcamAcquireOwner = new AsyncOperationOwner();
  #webcamSnapshotOwner = new AsyncOperationOwner();
  #videoPosterOwner = new AsyncOperationOwner();
  #boundDialogLifecycle = (event) => {
    if (event.target !== this.#dialog) return;
    this.#syncTriggerA11y();
    if (event.detail?.state !== "closed") return;

    const dialog = this.#dialog;
    if (this.#isNativeSwatch(this.#swatch)) {
      this.#swatch.removeAttribute("selected");
    }
    if (this.#shouldKeepWebcamLive()) this.#detachWebcamPreview();
    else this.#stopWebcam();
    const closingValue = JSON.stringify(this.value);
    if (
      this.#lastChangeValue !== null &&
      this.#lastChangeValue !== closingValue
    ) {
      this.#emitChange();
    }
    this.#valueAtOpen = null;
    this.#lastChangeValue = null;
    const returnTarget = this.#trigger;
    this.#scheduleFrame(() => {
      if (
        this.#dialog === dialog &&
        dialog?.lifecycleState === "closed" &&
        returnTarget?.isConnected
      ) {
        HTMLElement.prototype.focus.call(returnTarget);
      }
    });
    this.dispatchEvent(new CustomEvent("close"));
  };

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
    if (this.#webcamAcquireOwner.disposed) {
      this.#webcamAcquireOwner = new AsyncOperationOwner();
    }
    if (this.#webcamSnapshotOwner.disposed) {
      this.#webcamSnapshotOwner = new AsyncOperationOwner();
    }
    if (this.#videoPosterOwner.disposed) {
      this.#videoPosterOwner = new AsyncOperationOwner();
    }
    // Use display: contents
    this.style.display = "contents";

    this.#scheduleFrame(() => {
      this.#setupTrigger();
      this.#parseValue();
      this.#updateSwatch();
      this.#ensureVideoPoster();
    });
  }

  disconnectedCallback() {
    this.#webcamAcquireOwner.dispose();
    this.#webcamSnapshotOwner.dispose();
    this.#videoPosterOwner.dispose();
    this.#videoPosterCapturing = null;
    this.#discardDialog({ stopWebcam: true });
    this.#cancelFrames();
    this.#revokeOwnedBlobUrls();
    if (this.#isNativeSwatch(this.#swatch)) {
      this.#swatch.removeAttribute("selected");
    }
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

  async #webcamFrameSources(video, operation) {
    const sources = [];
    const track = this.#webcam.stream?.getVideoTracks?.()?.[0];
    if (track && typeof ImageCapture === "function") {
      try {
        if (this.#webcamImageCapture?.track !== track) {
          this.#webcamImageCapture = new ImageCapture(track);
        }
        const frame = await this.#webcamImageCapture.grabFrame();
        if (!operation.isCurrent()) {
          frame?.close?.();
          return sources;
        }
        sources.push(frame);
      } catch {
        if (operation.isCurrent()) this.#webcamImageCapture = null;
      }
    }
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(video);
        if (!operation.isCurrent()) {
          bitmap?.close?.();
          return sources;
        }
        sources.push(bitmap);
      } catch {
        /* video not readable yet */
      }
    }
    sources.push(video);
    return sources.filter(Boolean);
  }

  async #paintWebcamFrame(ctx, video, width, height, operation) {
    const sources = await this.#webcamFrameSources(video, operation);
    try {
      for (const source of sources) {
        if (!operation.isCurrent()) return false;
        try {
          ctx.drawImage(source, 0, 0, width, height);
        } catch {
          continue;
        }
        if (!this.#webcamFrameIsBlank(ctx, width, height)) return true;
      }
      return false;
    } finally {
      sources.forEach((source) => source?.close?.());
    }
  }

  #waitForNextVideoFrame(video, operation) {
    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let frameId = null;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        resource.dispose();
        resolve(ready);
      };
      const resource = operation.own(() => {
        if (timer !== null) clearTimeout(timer);
        if (
          frameId !== null &&
          typeof video.cancelVideoFrameCallback === "function"
        ) {
          video.cancelVideoFrameCallback(frameId);
        }
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });
      if (typeof video.requestVideoFrameCallback === "function") {
        timer = setTimeout(() => finish(false), 400);
        frameId = video.requestVideoFrameCallback(() => finish(true));
        return;
      }
      timer = setTimeout(() => finish(false), 200);
    });
  }

  async #snapshotWebcamVideo(video, operation) {
    if (
      !operation.isCurrent() ||
      !video?.videoWidth ||
      !video.videoHeight
    ) {
      return null;
    }
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
      operation,
    );
    if (!painted || !operation.isCurrent()) return null;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob || !operation.isCurrent()) return null;
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
    const operation = this.#webcamSnapshotOwner.begin();
    this.#webcamSnapshotting = true;

    const attempt = async () => {
      try {
        while (
          operation.isCurrent() &&
          this.#fillType === "webcam" &&
          this.#webcam.stream === stream
        ) {
          const url = await this.#snapshotWebcamVideo(video, operation);
          if (url) {
            if (
              operation.isCurrent() &&
              this.#fillType === "webcam" &&
              this.#webcam.stream === stream
            ) {
              this.#webcamPosterStream = stream;
              this.#updateSwatch();
            }
            return;
          }
          await this.#waitForNextVideoFrame(video, operation);
        }
      } finally {
        if (operation.isCurrent()) this.#webcamSnapshotting = false;
      }
    };

    void attempt();
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

  #isNativeSwatch(element) {
    return element?.matches("fig-swatch, fig-chit") ?? false;
  }

  #isPreviewSwatch(element) {
    return (
      this.#isNativeSwatch(element) ||
      (element?.matches("[data-fig-fill-picker-swatch]") ?? false)
    );
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
    } else if (this.#isPreviewSwatch(child)) {
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
    if (this.#isNativeSwatch(this.#swatch)) {
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
    this.#trigger.setAttribute(
      "aria-expanded",
      this.#dialogExpanded() ? "true" : "false",
    );
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
        const prevUrl = this.#video.url;
        this.#video = { ...this.#video, ...parsed.video };
        this.#video.missing = !this.#video.url;
        if (parsed.video.poster != null && parsed.video.poster !== "") {
          this.#videoPosterSrc = this.#video.url;
        } else if (this.#video.url !== prevUrl) {
          this.#revokeVideoPoster();
        } else {
          this.#discardStaleVideoPoster();
        }
      }
      this.#applyParsedWebcam(parsed);

      // Store full parsed data for custom (non-built-in) types
      if (parsed.type && !builtinTypes.includes(parsed.type)) {
        const { type, ...rest } = parsed;
        this.#customData[parsed.type] = rest;
      }
    } catch (e) {
      if (valueAttr.startsWith("#")) {
        this.#fillType = "solid";
        this.#color = this.#hexToHSV(valueAttr);
        return;
      }
      if (figEditorLooksLikeVideoUrl(valueAttr)) {
        const prevUrl = this.#video.url;
        this.#fillType = "video";
        this.#video.url = valueAttr.trim();
        this.#video.missing = false;
        if (this.#video.url !== prevUrl) this.#revokeVideoPoster();
        else this.#discardStaleVideoPoster();
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
    } else {
      this.#dialog.anchor = this.anchorElement || this.#trigger;
    }

    this.#switchTab(this.#fillType, { emit: false });
    this.#valueAtOpen = JSON.stringify(this.value);
    this.#lastChangeValue = this.#valueAtOpen;

    if (this.#isNativeSwatch(this.#swatch)) {
      this.#swatch.setAttribute("selected", "true");
    }

    this.#dialog.open = true;

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
    }
  }

  #dialogExpanded() {
    const state = this.#dialog?.lifecycleState;
    return state === "opening" || state === "open";
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
    this.#dialog.removeEventListener(
      "fig-popup-lifecycle",
      this.#boundDialogLifecycle,
    );
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
    this.#webcamAcquireOwner.cancel();
    this.#webcamSnapshotOwner.cancel();
    this.#webcamSnapshotting = false;
    const video = this.#dialog?.querySelector(
      ".fig-fill-picker-webcam-video",
    );
    if (video) video.srcObject = null;
  }

  #stopWebcam({ emit = true } = {}) {
    this.#webcamRequestId += 1;
    this.#webcamAcquireOwner.cancel();
    this.#webcamSnapshotOwner.cancel();
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

    this.#dialog.addEventListener(
      "fig-popup-lifecycle",
      this.#boundDialogLifecycle,
    );

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

    if (tabName === "video") this.#applyDefaultVideo({ emit: false });
    if (tabName === "webcam") {
      this.#webcam.live = this.#webcamMode() === "live";
      this.#webcamStart?.(this.#webcam.deviceId);
    }

    this.#updateSwatch();
    if (emit) this.#emitInput();
  }

  #refreshDialogUI() {
    if (!this.#dialogExpanded()) return;
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
          text: "false",
          min: "0",
          max: "360",
          "aria-label": "Hue",
          value: this.#color.h,
        }),
        showAlpha
          ? figEditorCreateElement("fig-slider", {
              type: "opacity",
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
      const srgb = figHslToRGB(hue, 100, 50);
      const p3 = figConvertRGB(srgb.r, srgb.g, srgb.b, {
        from: "srgb",
        to: "display-p3",
      });
      gradH.addColorStop(
        1,
        `color(display-p3 ${p3.r / 255} ${p3.g / 255} ${p3.b / 255})`,
      );
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

    const num = (cls, label, min, max, step, units, steppers) =>
      figEditorCreateElement("fig-input-number", {
        className: cls,
        "aria-label": label,
        min,
        max,
        step,
        units,
        steppers,
      });

    const showAlpha = this.getAttribute("alpha") !== "false";
    const alphaField = () =>
      showAlpha
        ? wrap(
            "Alpha",
            num("fig-fill-picker-ci-a", "Alpha", 0, 100, 0.1, "%", "false"),
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
            ? figEditorCreateElement(
                "fig-input-combo",
                {
                  className: "input-combo fig-fill-picker-ci-hex-row",
                  full: true,
                },
                [hexInput, alphaField()],
              )
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
    {
      const container = this.#dialog.querySelector('[data-tab="gradient"]');
      const editor = document.createElement("fig-gradient-editor");
      editor.value = gradientToValueShape(this.#gradient);
      editor.setAttribute("color-space", this.#gamut);
      editor.toggleAttribute("disabled", this.#isDisabled());
      editor.pickerAnchor = this.#dialog;
      const syncFromEditor = (event) => {
        event.stopPropagation();
        if (!event.detail?.gradient) return;
        this.#gradient = lockFillPickerGradientInterpolation(
          event.detail.gradient,
        );
        this.#updateSwatch();
        if (event.type === "change") this.#emitChange();
        else this.#emitInput();
      };
      editor.addEventListener("input", syncFromEditor);
      editor.addEventListener("change", syncFromEditor);
      container.replaceChildren(editor);
      return;
    }

    const container = this.#dialog.querySelector('[data-tab="gradient"]');
    const gradientType = figEditorCreateElement(
      "fig-select",
      {
        className: "fig-fill-picker-gradient-type",
        label: "Gradient type",
        value: this.#gradient.type,
        variant: "ghost",
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
      "fig-stack",
      {
        className: "fig-fill-picker-gradient-actions",
        gap: "1",
      },
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
      "fig-header",
      {
        className: "fig-fill-picker-gradient-header",
        borderless: true,
        compact: true,
      },
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
          [figEditorCreateElement("h3", {}, "Stops"), addButton],
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
        gradientBarInput.value = {
          type: "gradient",
          gradient: gradientToValueShape(gradient),
        };
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
    const editor = container.querySelector("fig-gradient-editor");
    if (editor) {
      editor.value = this.#gradient;
      editor.setAttribute("color-space", this.#gamut);
      editor.toggleAttribute("disabled", this.#isDisabled());
      editor.pickerAnchor = this.#dialog;
      return;
    }

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

    const editor = this.#dialog.querySelector(
      '[data-tab="gradient"] > fig-gradient-editor',
    );
    if (editor) {
      editor.value = this.#gradient;
      editor.setAttribute("color-space", this.#gamut);
      this.#updateSwatch();
      return;
    }

    const barInput = this.#dialog.querySelector(
      ".fig-fill-picker-gradient-bar-input",
    );
    if (barInput) {
      this.#syncingGradientBar = true;
      barInput.value = {
        type: "gradient",
        gradient: gradientToValueShape(this.#gradient),
      };
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
        "fig-property",
        {
          className: "fig-fill-picker-gradient-stop-row",
          "data-index": index,
          leading: "drag",
          trailing: "remove",
          "show-leading": "hover",
          "show-trailing": true,
        },
        figEditorCreateElement(
          "fig-stack",
          {
            className: "fig-fill-picker-gradient-stop-inputs",
            slot: "input",
            direction: "horizontal",
            gap: "2",
            full: true,
          },
          [
            figEditorCreateElement("fig-input-number", {
              className: "fig-fill-picker-stop-position",
              "aria-label": "Gradient stop position",
              min: "0",
              max: "100",
              value: stop.position,
              units: "%",
              steppers: "false",
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
          ],
        ),
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

        const remove = row.querySelector(
          ':scope > [data-fig-property-action="remove"]',
        );
        remove.classList.add("fig-fill-picker-stop-remove");
        remove.setAttribute("aria-label", "Remove gradient stop");
        remove.toggleAttribute("disabled", this.#gradient.stops.length <= 2);
        row.addEventListener("remove", (event) => {
          event.stopPropagation();
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
    return figGradientCSS(this.#gradient, { colorSpace: this.#gamut });
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
      "fig-property",
      { className: "fig-fill-picker-media-header", ratio: "1:1" },
      figEditorCreateElement(
        "div",
        {
          className: "fig-fill-picker-media-header-controls",
          slot: "input",
        },
        [scaleMode, scale],
      ),
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
      const changed = src !== this.#image.url;
      this.#image.url = src;
      this.#updateImagePreview(preview);
      this.#updateSwatch();
      if (changed) this.#emitInput();
      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
          detail: e.detail ?? { src },
        }),
      );
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
      "fig-property",
      { className: "fig-fill-picker-media-header", ratio: "1:1" },
      figEditorCreateElement(
        "div",
        {
          className: "fig-fill-picker-media-header-controls",
          slot: "input",
        },
        scaleMode,
      ),
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
      controls: true,
      muted: "true",
      loop: "true",
    });
    container.replaceChildren(header, preview);

    this.#setupVideoEvents(container);
    this.#applyDefaultVideo({ emit: false });
  }

  #revokeVideoPoster({ cancelCapture = true } = {}) {
    if (cancelCapture) {
      this.#videoPosterOwner.cancel();
      this.#videoPosterCapturing = null;
    }
    if (this.#video.poster?.startsWith("blob:")) {
      URL.revokeObjectURL(this.#video.poster);
      this.#ownedBlobUrls.delete(this.#video.poster);
    }
    this.#video.poster = null;
    this.#videoPosterSrc = null;
  }

  #discardStaleVideoPoster() {
    if (!this.#video.poster) return;
    if (this.#videoPosterSrc && this.#videoPosterSrc === this.#video.url) return;
    this.#revokeVideoPoster();
  }

  #syncVideoPreview() {
    const preview = this.#dialog?.querySelector(
      ".fig-fill-picker-video-preview",
    );
    if (preview) this.#updateVideoPreviewStyle(preview);
  }

  #applyDefaultVideo({ emit = false } = {}) {
    if (this.#video.url) {
      this.#video.missing = false;
      this.#discardStaleVideoPoster();
      if (!this.#video.poster) this.#captureVideoPoster(this.#video.url);
      else this.#syncVideoPreview();
      return;
    }
    const fallback = this.getAttribute("default-video");
    if (!fallback) {
      this.#video.missing = true;
      return;
    }
    this.#video.url = fallback;
    this.#video.missing = false;
    this.#syncVideoPreview();
    this.#captureVideoPoster(fallback);
    if (emit) this.#emitInput();
  }

  #ensureVideoPoster() {
    if (this.#fillType !== "video") return;
    const src = this.#video.url;
    if (!src) return;
    this.#discardStaleVideoPoster();
    if (this.#video.poster) return;
    this.#captureVideoPoster(src);
  }

  #waitForVideoFrame(video, operation) {
    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let frameId = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        resource.dispose();
        resolve();
      };
      const resource = operation.own(() => {
        if (timer !== null) clearTimeout(timer);
        if (
          frameId !== null &&
          typeof video.cancelVideoFrameCallback === "function"
        ) {
          video.cancelVideoFrameCallback(frameId);
        }
        if (!settled) {
          settled = true;
          resolve();
        }
      });
      timer = setTimeout(finish, 80);
      frameId = video.requestVideoFrameCallback(finish);
    });
  }

  async #videoFrameBitmap(video, operation) {
    if (typeof video.requestVideoFrameCallback === "function") {
      await this.#waitForVideoFrame(video, operation);
    } else {
      try {
        await video.play();
        if (!operation.isCurrent()) return null;
        video.pause();
      } catch {
        /* use the current decoded frame */
      }
    }
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(video);
        if (!operation.isCurrent()) {
          bitmap?.close?.();
          return null;
        }
        return bitmap;
      } catch {
        /* tainted or undecoded — fall back to drawImage(video) */
      }
    }
    return null;
  }

  async #blobFromVideoFrame(video, operation) {
    const bitmap = await this.#videoFrameBitmap(video, operation);
    if (!operation.isCurrent()) {
      bitmap?.close?.();
      return null;
    }
    const width = bitmap?.width || video.videoWidth;
    const height = bitmap?.height || video.videoHeight;
    if (!width || !height) {
      bitmap?.close?.();
      return null;
    }
    const canvas =
      typeof OffscreenCanvas === "function"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap?.close?.();
      return null;
    }
    try {
      ctx.drawImage(bitmap || video, 0, 0, width, height);
    } finally {
      bitmap?.close?.();
    }
    const blob = await (canvas.convertToBlob
      ? canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 })
      : new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85)));
    return operation.isCurrent() ? blob : null;
  }

  async #captureVideoPoster(src, { emit = false } = {}) {
    if (!src || this.#videoPosterCapturing === src) return;
    const operation = this.#videoPosterOwner.begin();
    if (!operation.isCurrent()) return;
    this.#videoPosterCapturing = src;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    const videoResource = operation.own(() => {
      video.pause?.();
      video.removeAttribute("src");
      video.load();
    });
    try {
      const loaded = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          listeners.dispose();
          callback(value);
        };
        const fail = () =>
          finish(reject, new Error("video poster failed"));
        const ready = () => finish(resolve, true);
        const listeners = operation.own(() => {
          video.removeEventListener("error", fail);
          video.removeEventListener("loadeddata", ready);
          if (!settled) {
            settled = true;
            resolve(false);
          }
        });
        video.addEventListener("error", fail, { once: true });
        video.addEventListener("loadeddata", ready, { once: true });
        video.src = src;
      });
      if (
        !loaded ||
        !operation.isCurrent() ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }
      const blob = await this.#blobFromVideoFrame(video, operation);
      if (
        !blob ||
        !operation.isCurrent() ||
        !this.isConnected ||
        this.#video.url !== src
      ) {
        return;
      }
      this.#revokeVideoPoster({ cancelCapture: false });
      this.#video.poster = URL.createObjectURL(blob);
      this.#videoPosterSrc = src;
      this.#ownedBlobUrls.add(this.#video.poster);
      this.#updateSwatch();
      this.#syncVideoPreview();
      if (emit) this.#emitInput();
    } catch {
      // Cross-origin or decode failures leave the swatch empty until a poster exists.
    } finally {
      videoResource.dispose();
      if (
        operation.isCurrent() &&
        this.#videoPosterCapturing === src
      ) {
        this.#videoPosterCapturing = null;
      }
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
      const changed = src !== this.#video.url;
      if (changed) this.#revokeVideoPoster();
      this.#video.url = src;
      this.#video.missing = false;
      this.#updateVideoPreviewStyle(preview);
      this.#captureVideoPoster(src);
      this.#updateSwatch();
      if (changed) this.#emitInput();
      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
          detail: e.detail ?? { src },
        }),
      );
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

    const populateCameras = async (requestId, selectedId, operation = null) => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (
        (requestId != null && requestId !== this.#webcamRequestId) ||
        (operation && !operation.isCurrent()) ||
        !container.isConnected
      ) {
        return;
      }
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
          void populateCameras(null, requested || liveId);
          return;
        }
      }

      this.#stopWebcam({ emit: Boolean(existing) });
      const operation = this.#webcamAcquireOwner.begin();
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
          !operation.isCurrent() ||
          requestId !== this.#webcamRequestId ||
          !this.isConnected ||
          this.#activeTab !== "webcam" ||
          !container.isConnected
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
        await populateCameras(requestId, requested, operation);
      } catch (err) {
        if (
          !operation.isCurrent() ||
          requestId !== this.#webcamRequestId ||
          !container.isConnected
        ) {
          return;
        }
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
      const stream = this.#webcam.stream;
      if (!stream) return;
      const dialog = this.#dialog;
      const operation = this.#webcamSnapshotOwner.begin();
      this.#webcamSnapshotting = false;
      const snapshot = await this.#snapshotWebcamVideo(video, operation);
      if (
        !snapshot ||
        !operation.isCurrent() ||
        this.#webcam.stream !== stream ||
        this.#dialog !== dialog ||
        !dialog?.isConnected
      ) {
        return;
      }

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
    return figHsvToRGB(hsv.h, hsv.s, hsv.v);
  }

  #rgbToHSV(rgb) {
    return { ...figRGBToHsv(rgb.r, rgb.g, rgb.b), a: 1 };
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
    const srgb = figEditorHexToRgb(hex);
    const p3 = figConvertRGB(srgb.r, srgb.g, srgb.b, {
      from: "srgb",
      to: "display-p3",
    });
    const r = +(p3.r / 255).toFixed(4);
    const g = +(p3.g / 255).toFixed(4);
    const b = +(p3.b / 255).toFixed(4);
    return `color(display-p3 ${r} ${g} ${b} / ${alpha})`;
  }

  #rgbToHSL(rgb) {
    return figEditorRgbToHsl(rgb.r, rgb.g, rgb.b);
  }

  #hslToRGB(hsl) {
    return figHslToRGB(hsl.h, hsl.s, hsl.l);
  }

  #rgbToOKLAB(rgb) {
    return figEditorRgbToOklab(rgb.r, rgb.g, rgb.b);
  }

  #rgbToOKLCH(rgb) {
    return figRGBToOklch(rgb.r, rgb.g, rgb.b);
  }

  #oklabToRGB(lab) {
    return figOklabToRGB(lab.l, lab.a, lab.b);
  }

  #oklchToRGB(lch) {
    return figOklchToRGB(lch.l, lch.c, lch.h);
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
        this.#ensureVideoPoster();
        if (this.#dialogExpanded() && !this.#isDraggingColor) {
          this.#refreshDialogUI();
          this.#lastChangeValue = JSON.stringify(this.value);
        }
        break;
      case "disabled":
        this.#syncTriggerA11y();
        if (this.#isDisabled() && this.#dialogExpanded()) this.close();
        break;
      case "alpha":
      case "mode": {
        if (!this.#dialog) break;
        const wasOpen = this.#dialogExpanded();
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

export { FigFillPicker };
