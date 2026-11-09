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
} from "../runtime/index.js";
import { AsyncOperationOwner } from "../../internal/async-operation-owner.js";

/* Media */
const FIG_IMAGE_FORWARDED_EVENTS = ["load", "error"];
const FIG_VIDEO_FORWARDED_EVENTS = [
  "loadstart",
  "progress",
  "suspend",
  "abort",
  "error",
  "emptied",
  "stalled",
  "loadedmetadata",
  "loadeddata",
  "canplay",
  "canplaythrough",
  "playing",
  "waiting",
  "seeking",
  "seeked",
  "durationchange",
  "timeupdate",
  "ratechange",
  "resize",
  "volumechange",
];
const FIG_MEDIA_FORWARDED_EVENTS = [
  ...new Set([
    ...FIG_IMAGE_FORWARDED_EVENTS,
    ...FIG_VIDEO_FORWARDED_EVENTS,
  ]),
];

/**
 * @attr {string} src - Media source URL
 * @attr {string} type - "image" (default) or "video" (for fig-media)
 * @attr {string} alt - Alt text for the generated image (default "")
 * @attr {boolean} loaded - Read-only reflected state when an image has loaded successfully
 * @attr {boolean|string} upload - Show upload overlay; use "icon" for Add/Remove icon buttons
 * @attr {boolean} loading-indicator - Set to `false` to disable the generated image loading spinner
 * @attr {string} label - Upload button label (default "Upload")
 * @attr {string} size - small | medium | large | auto (token-sized square)
 * @attr {string} aspect-ratio - CSS aspect-ratio value (default `4/3`)
 * @attr {string} fit - CSS object-fit value
 * @attr {boolean} checkerboard - Show checkerboard behind transparent media
 * @attr {string} caption - Caption text rendered below the media preview
 * @attr {boolean} controls - Video controls visibility (default false)
 * @attr {boolean} autoplay - Video autoplay
 * @attr {boolean} loop - Video loop
 * @attr {boolean} muted - Video muted
 * @attr {string} poster - Video poster image URL
 * @attr {string} aria-label - Accessible label forwarded to generated video
 * @attr {string} aria-labelledby - Accessible label reference forwarded to generated video
 * @fires load - Image loaded
 * @fires error - Image or video failed to load
 * @fires loadstart - Video loading started
 * @fires loadedmetadata - Video metadata loaded
 * @fires loadeddata - Video frame data loaded
 * @fires canplay - Video can begin playback
 * @fires canplaythrough - Video can likely play through
 * @fires waiting - Video playback is waiting for data
 *
 * When `controls` are shown and no video `src` is loaded, fig-media sets
 * `disabled` on the associated `fig-media-controls` until media is available.
 *
 * Sizing model:
 *   - Default: host shrinkwraps to its inner <img>/<video> intrinsic size.
 *   - `size` attribute applies a token-sized square.
 *   - `aspect-ratio` attribute fills container width and applies the ratio.
 */
class FigMedia extends HTMLElement {
  #src = null;
  #mediaEl = null;
  #previewEl = null;
  #fileInput = null;
  #blobUrl = null;
  #previewSrc = null;
  #file = null;
  #boundHandleFileInput = this.#handleFileInput.bind(this);
  #boundHandleMediaPlay = this.#handleMediaPlay.bind(this);
  #boundHandleMediaPause = this.#handleMediaPause.bind(this);
  #boundHandleMediaEnded = this.#handleMediaEnded.bind(this);
  #boundForwardMediaEvent = this.#forwardMediaEvent.bind(this);
  #loadingSpinner = null;
  #loadingTimer = null;
  #loadingSource = null;
  #ariaBusyBeforeLoading = undefined;
  #controlsEl = null;
  #controlsWiredFor = null;
  #controlsWiredControls = null;
  #controlsSync = null;
  #controlsOnPlay = null;
  #controlsOnPause = null;
  #controlsOnSeek = null;
  #sourceOwner = new AsyncOperationOwner();
  #sourceOperation = null;
  #imageLoadOwner = new AsyncOperationOwner();
  #blobOwner = new AsyncOperationOwner();

  static get observedAttributes() {
    return [
      "src",
      "type",
      "alt",
      "upload",
      "multiple",
      "loading-indicator",
      "label",
      "aspect-ratio",
      "fit",
      "checkerboard",
      "caption",
      "controls",
      "autoplay",
      "loop",
      "muted",
      "poster",
      "aria-label",
      "aria-labelledby",
      "title",
    ];
  }

  get mediaKind() {
    const type = (this.getAttribute("type") || "image").toLowerCase();
    return type === "video" ? "video" : "image";
  }

  get src() {
    return this.#src;
  }
  set src(value) {
    this.#src = value || "";
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("src");
    } else {
      this.setAttribute("src", value);
    }
  }

  get file() {
    return this.#file;
  }

  #currentMediaSrc() {
    return this.#previewSrc || this.#src || "";
  }

  /**
   * Returns a base64 data URL for the loaded image.
   * Requires a CORS-clean image (same-origin or with appropriate Access-Control headers);
   * cross-origin images without proper headers will throw a tainted-canvas error.
   */
  async getBase64() {
    if (this.mediaKind !== "image") return null;
    const src = this.#currentMediaSrc();
    const media = this.#mediaEl;
    if (!src || !media) return null;
    const operation =
      this.#sourceOperation || this.#beginMediaSourceOperation();
    try {
      if (typeof media.decode === "function") {
        await media.decode();
      } else if (!media.complete) {
        await new Promise((resolve, reject) => {
          let settled = false;
          const finish = (callback) => (event) => {
            if (settled) return;
            settled = true;
            listeners.dispose();
            callback(event);
          };
          const onLoad = finish(resolve);
          const onError = finish(reject);
          const listeners = operation.own(() => {
            media.removeEventListener("load", onLoad);
            media.removeEventListener("error", onError);
            if (!settled) {
              settled = true;
              resolve();
            }
          });
          media.addEventListener("load", onLoad, { once: true });
          media.addEventListener("error", onError, { once: true });
        });
      }
    } catch {
      // continue; canvas draw will throw if image truly unusable
    }
    if (
      !operation.isCurrent() ||
      !this.isConnected ||
      this.#mediaEl !== media ||
      this.#currentMediaSrc() !== src
    ) {
      return null;
    }
    const w = media.naturalWidth;
    const h = media.naturalHeight;
    if (!(w > 0) || !(h > 0)) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(media, 0, 0);
    return canvas.toDataURL();
  }

  connectedCallback() {
    if (this.#sourceOwner.disposed) {
      this.#sourceOwner = new AsyncOperationOwner();
    }
    if (this.#imageLoadOwner.disposed) {
      this.#imageLoadOwner = new AsyncOperationOwner();
    }
    if (this.#blobOwner.disposed) {
      this.#blobOwner = new AsyncOperationOwner();
    }
    this.#beginMediaSourceOperation();
    this.#src = this.getAttribute("src") || "";

    const ar = this.getAttribute("aspect-ratio");
    if (ar) {
      this.style.setProperty("--fig-media-aspect-ratio", ar);
    } else {
      this.style.setProperty("--fig-media-aspect-ratio", "4/3");
    }
    const fit = this.getAttribute("fit");
    if (fit) {
      this.style.setProperty("--fig-media-fit", fit);
    }

    this.querySelectorAll("fig-swatch[data-generated]").forEach((el) => el.remove());
    this.#ensurePreviewElement();
    this.#ensureMediaElement();
    this.#addMediaElementListeners();
    this.#syncGeneratedMediaElement();
    this.#syncImageLoadingState();
    this.#syncMediaAccessibility();
    this.#syncCaption();

    const isUpload = this.hasAttribute("upload") && this.getAttribute("upload") !== "false";
    if (isUpload && !this.querySelector("fig-input-file[data-generated]")) {
      this.#createFileInput();
    }
    this.#fileInput = this.querySelector("fig-input-file[data-generated]");
    this.#syncFileInputUploadMode();
    this.#fileInput?.removeEventListener("change", this.#boundHandleFileInput);
    this.#fileInput?.addEventListener("change", this.#boundHandleFileInput);
  }

  disconnectedCallback() {
    this.#fileInput?.removeEventListener("change", this.#boundHandleFileInput);
    this.#sourceOwner.dispose();
    this.#sourceOperation = null;
    this.#imageLoadOwner.dispose();
    this.#blobOwner.dispose();
    this.#finishImageLoading();
    this.#removeMediaElementListeners();
    this.#removeControls();
    this.#blobUrl = null;
    this.#previewSrc = null;
  }

  #beginMediaSourceOperation() {
    this.#sourceOperation = this.#sourceOwner.begin();
    return this.#sourceOperation;
  }

  #releaseBlobUrl() {
    this.#blobOwner.cancel();
    this.#blobUrl = null;
  }

  #createBlobUrl(file) {
    const operation = this.#blobOwner.begin();
    const url = URL.createObjectURL(file);
    this.#blobUrl = url;
    operation.own(() => {
      URL.revokeObjectURL(url);
      if (this.#blobUrl === url) this.#blobUrl = null;
    });
    return url;
  }

  #removeMediaElementListeners() {
    if (!this.#mediaEl) return;
    FIG_MEDIA_FORWARDED_EVENTS.forEach((type) => {
      this.#mediaEl.removeEventListener(type, this.#boundForwardMediaEvent);
    });
    if (this.#mediaEl.tagName === "VIDEO") {
      this.#mediaEl.removeEventListener("play", this.#boundHandleMediaPlay);
      this.#mediaEl.removeEventListener("pause", this.#boundHandleMediaPause);
      this.#mediaEl.removeEventListener("ended", this.#boundHandleMediaEnded);
    }
  }

  #addMediaElementListeners() {
    this.#removeMediaElementListeners();
    if (!this.#mediaEl) return;
    const forwardedEvents =
      this.#mediaEl.tagName === "VIDEO"
        ? FIG_VIDEO_FORWARDED_EVENTS
        : FIG_IMAGE_FORWARDED_EVENTS;
    forwardedEvents.forEach((type) => {
      this.#mediaEl.addEventListener(type, this.#boundForwardMediaEvent);
    });
    if (this.#mediaEl.tagName !== "VIDEO") return;
    this.#mediaEl.addEventListener("play", this.#boundHandleMediaPlay);
    this.#mediaEl.addEventListener("pause", this.#boundHandleMediaPause);
    this.#mediaEl.addEventListener("ended", this.#boundHandleMediaEnded);
  }

  #usesDefaultImageLoadingIndicator() {
    return (
      this.mediaKind === "image" &&
      this.getAttribute("loading-indicator") !== "false" &&
      this.#previewEl?.hasAttribute("data-generated") &&
      this.#mediaEl?.hasAttribute("data-generated")
    );
  }

  #syncImageLoadingState() {
    this.#syncImageLoadedState();
    const src = this.#currentMediaSrc();
    if (!src || !this.#usesDefaultImageLoadingIndicator()) {
      this.#finishImageLoading();
      return;
    }
    if (
      this.#mediaEl?.tagName === "IMG" &&
      this.#mediaEl.complete &&
      this.#mediaEl.currentSrc
    ) {
      this.#finishImageLoading();
      return;
    }
    if (this.#loadingSource === src) return;

    this.#finishImageLoading();
    const operation = this.#imageLoadOwner.begin();
    this.#loadingSource = src;
    this.#ariaBusyBeforeLoading = this.getAttribute("aria-busy");
    this.setAttribute("aria-busy", "true");
    const timer = setTimeout(() => {
      timerResource.dispose();
      if (
        !operation.isCurrent() ||
        this.#loadingSource !== src ||
        !this.isConnected ||
        !this.#usesDefaultImageLoadingIndicator()
      ) {
        return;
      }
      const spinner = document.createElement("fig-spinner");
      spinner.setAttribute("data-generated", "");
      spinner.setAttribute("data-loading-indicator", "");
      spinner.setAttribute("slot", "overlay");
      spinner.setAttribute("size", "small");
      spinner.setAttribute("aria-hidden", "true");
      this.append(spinner);
      this.#loadingSpinner = spinner;
    }, 150);
    this.#loadingTimer = timer;
    const timerResource = operation.own(() => {
      clearTimeout(timer);
      if (this.#loadingTimer === timer) this.#loadingTimer = null;
    });
  }

  #syncImageLoadedState() {
    const image = this.#mediaEl?.tagName === "IMG" ? this.#mediaEl : null;
    const src =
      image?.currentSrc ||
      image?.getAttribute("src") ||
      this.#currentMediaSrc();
    this.toggleAttribute(
      "loaded",
      Boolean(src && image?.complete && image.naturalWidth > 0),
    );
  }

  #finishImageLoading() {
    this.#imageLoadOwner.cancel();
    this.#loadingTimer = null;
    this.#loadingSpinner?.remove();
    this.#loadingSpinner = null;
    this.#loadingSource = null;
    if (this.#ariaBusyBeforeLoading !== undefined) {
      if (this.#ariaBusyBeforeLoading === null) {
        this.removeAttribute("aria-busy");
      } else {
        this.setAttribute("aria-busy", this.#ariaBusyBeforeLoading);
      }
      this.#ariaBusyBeforeLoading = undefined;
    }
  }

  #ensurePreviewElement() {
    if (this.#previewEl?.isConnected) return;
    const existing = this.querySelector(":scope > fig-preview");
    if (existing) {
      this.#previewEl = existing;
      return;
    }
    const preview = document.createElement("fig-preview");
    preview.setAttribute("data-generated", "");
    this.prepend(preview);
    this.#previewEl = preview;
  }

  #userProvidedMediaEl() {
    const tag = this.mediaKind === "video" ? "video" : "img";
    return this.querySelector(`${tag}:not([data-generated])`);
  }

  #ensureMediaElement() {
    const userEl = this.#userProvidedMediaEl();
    if (userEl) {
      this.#ensurePreviewElement();
      if (this.#mediaEl && this.#mediaEl !== userEl) {
        this.#removeMediaElementListeners();
        if (this.#mediaEl.hasAttribute("data-generated")) {
          this.#mediaEl.remove();
        }
      }
      if (this.#mediaEl !== userEl) this.#beginMediaSourceOperation();
      this.#mediaEl = userEl;
      if (this.#previewEl && userEl.parentElement !== this.#previewEl) {
        this.#previewEl.append(userEl);
      }
      this.#addMediaElementListeners();
      this.#syncMediaAccessibility();
      return;
    }

    this.#ensurePreviewElement();
    const expectedTag = this.mediaKind === "video" ? "VIDEO" : "IMG";
    if (this.#mediaEl && this.#mediaEl.tagName !== expectedTag) {
      this.#beginMediaSourceOperation();
      this.#removeMediaElementListeners();
      if (this.#mediaEl.hasAttribute("data-generated")) {
        this.#mediaEl.remove();
      }
      this.#mediaEl = null;
    }
    if (this.#mediaEl) return;

    if (this.mediaKind === "video") {
      this.#beginMediaSourceOperation();
      const video = document.createElement("video");
      video.setAttribute("data-generated", "");
      video.className = "fig-media-element";
      video.setAttribute("playsinline", "");
      video.preload = "auto";
      this.#previewEl.append(video);
      this.#mediaEl = video;
      const seekToFirstFrame = () => {
        if (this.#mediaEl?.autoplay) return;
        try {
          this.#mediaEl.currentTime = 0.001;
        } catch {}
      };
      this.#mediaEl.addEventListener("loadedmetadata", seekToFirstFrame, { once: true });
    } else {
      this.#beginMediaSourceOperation();
      const img = document.createElement("img");
      img.setAttribute("data-generated", "");
      img.className = "fig-media-element";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = this.getAttribute("alt") || "";
      this.#previewEl.append(img);
      this.#mediaEl = img;
    }
    this.#addMediaElementListeners();
  }

  #syncMediaAccessibility() {
    if (!this.#mediaEl) return;
    if (this.#mediaEl.tagName === "IMG") {
      if (
        this.hasAttribute("alt") ||
        this.#mediaEl.hasAttribute("data-generated")
      ) {
        this.#mediaEl.alt = this.getAttribute("alt") || "";
      }
      return;
    }
    if (this.#mediaEl.tagName !== "VIDEO") return;
    ["aria-label", "aria-labelledby", "title"].forEach((name) => {
      const value = this.getAttribute(name);
      if (value === null) {
        this.#mediaEl.removeAttribute(name);
      } else {
        this.#mediaEl.setAttribute(name, value);
      }
    });
  }

  #userProvidedCaptionEl() {
    return this.querySelector(":scope > figcaption:not([data-generated])");
  }

  #generatedCaptionEls() {
    return Array.from(
      this.querySelectorAll(":scope > figcaption[data-generated]"),
    );
  }

  #syncCaption() {
    const userCaption = this.#userProvidedCaptionEl();
    const generatedCaptions = this.#generatedCaptionEls();

    if (userCaption) {
      generatedCaptions.forEach((caption) => caption.remove());
      return;
    }

    const captionText = this.getAttribute("caption") || "";
    if (!captionText) {
      generatedCaptions.forEach((caption) => caption.remove());
      return;
    }

    const caption = generatedCaptions[0] || document.createElement("figcaption");
    generatedCaptions.slice(1).forEach((duplicate) => duplicate.remove());
    if (!caption.hasAttribute("data-generated")) {
      caption.setAttribute("data-generated", "");
    }
    if (caption.textContent !== captionText) {
      caption.textContent = captionText;
    }

    const controls = this.querySelector(":scope > fig-media-controls");
    if (controls) {
      controls.before(caption);
    } else if (this.#previewEl?.isConnected) {
      this.#previewEl.after(caption);
    } else if (!caption.isConnected) {
      this.append(caption);
    }
  }

  #isEnabledAttr(name, defaultEnabled = false) {
    if (!this.hasAttribute(name)) return defaultEnabled;
    return this.getAttribute(name) !== "false";
  }

  #syncGeneratedMediaElement() {
    if (!this.#mediaEl) return;
    if (!this.#mediaEl.hasAttribute("data-generated")) return;
    const src = this.#currentMediaSrc();
    if (this.#mediaEl.getAttribute("src") !== src) {
      this.#beginMediaSourceOperation();
      this.removeAttribute("loaded");
      if (src) {
        this.#mediaEl.setAttribute("src", src);
      } else {
        this.#mediaEl.removeAttribute("src");
        if (this.#mediaEl.tagName === "VIDEO") this.#mediaEl.load();
      }
    }
    if (this.#mediaEl.tagName === "IMG") {
      this.#syncMediaAccessibility();
      this.#syncImageLoadingState();
      return;
    }
    const poster = this.getAttribute("poster");
    if (poster) {
      this.#mediaEl.setAttribute("poster", poster);
    } else {
      this.#mediaEl.removeAttribute("poster");
    }
    this.#mediaEl.controls = false;
    this.#mediaEl.removeAttribute("controls");
    this.#mediaEl.autoplay = this.#isEnabledAttr("autoplay", false);
    this.#mediaEl.loop = this.#isEnabledAttr("loop", false);
    this.#mediaEl.muted = this.#isEnabledAttr("muted", false);
    this.#mediaEl.playsInline = true;
    this.#syncMediaAccessibility();
    this.#syncControlsVisibility();
    this.#syncControlsDisabled();
    this.#syncImageLoadingState();
  }

  get mediaEl() {
    return this.#mediaEl;
  }

  #hasPlayableVideo() {
    if (this.mediaKind !== "video") return false;
    return Boolean(this.#currentMediaSrc());
  }

  #syncControlsDisabled() {
    const controls =
      this.#controlsEl ||
      this.querySelector(":scope > fig-media-controls");
    if (!controls) return;
    if (this.mediaKind !== "video") return;

    if (this.#hasPlayableVideo()) {
      // Only clear disabled when we set it for the empty state.
      if (controls.hasAttribute("data-fig-empty-disabled")) {
        controls.removeAttribute("disabled");
        controls.removeAttribute("data-fig-empty-disabled");
      }
      return;
    }

    controls.setAttribute("disabled", "");
    controls.setAttribute("data-fig-empty-disabled", "");
    controls.playing = false;
    controls.time = 0;
    controls.duration = 0;
  }

  #syncControlsVisibility() {
    if (this.mediaKind !== "video") {
      this.#removeControls();
      return;
    }
    const userControls = this.querySelector(
      ":scope > fig-media-controls:not([data-generated])",
    );
    if (userControls) {
      if (this.#controlsEl !== userControls) {
        this.#removeControls();
        this.#controlsEl = userControls;
      }
      this.#wireControlsToMedia();
      this.#syncControlsDisabled();
      return;
    }
    if (this.#isEnabledAttr("controls", false)) {
      this.#ensureControls();
    } else {
      this.#removeControls();
    }
  }

  #ensureControls() {
    const generatedControls = Array.from(
      this.querySelectorAll(":scope > fig-media-controls[data-generated]"),
    );
    const existingControls = generatedControls[0];
    generatedControls.slice(1).forEach((controls) => controls.remove());

    if (existingControls) {
      this.#controlsEl = existingControls;
      this.#wireControlsToMedia();
      this.#syncControlsDisabled();
      return;
    }
    const controls = document.createElement("fig-media-controls");
    controls.setAttribute("data-generated", "");
    this.append(controls);
    this.#controlsEl = controls;
    this.#wireControlsToMedia();
    this.#syncControlsDisabled();
  }

  #wireControlsToMedia() {
    if (!this.#controlsEl || !this.#mediaEl) return;
    if (
      this.#controlsWiredFor === this.#mediaEl &&
      this.#controlsWiredControls === this.#controlsEl
    ) {
      this.#syncControlsDisabled();
      return;
    }
    this.#unwireControls();

    const controls = this.#controlsEl;
    const video = this.#mediaEl;
    this.#controlsWiredFor = video;
    this.#controlsWiredControls = controls;

    let pendingSeekTime = null;
    const syncFromVideo = () => {
      this.#syncControlsDisabled();
      if (!this.#hasPlayableVideo()) return;
      controls.playing = !video.paused && !video.ended;
      if (Number.isFinite(video.duration)) controls.duration = video.duration;
      if (pendingSeekTime !== null) {
        if (Math.abs(video.currentTime - pendingSeekTime) < 0.25) {
          pendingSeekTime = null;
        } else {
          return;
        }
      }
      controls.time = video.currentTime || 0;
    };
    const onPlay = () => {
      if (!this.#hasPlayableVideo()) return;
      const p = video.play?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    const onPause = () => video.pause?.();
    const onSeek = (e) => {
      if (!this.#hasPlayableVideo()) return;
      const next = Number(e?.detail?.time);
      if (!Number.isFinite(next)) return;
      pendingSeekTime = next;
      try { video.currentTime = next; } catch {}
    };

    this.#controlsSync = syncFromVideo;
    this.#controlsOnPlay = onPlay;
    this.#controlsOnPause = onPause;
    this.#controlsOnSeek = onSeek;

    video.addEventListener("play", syncFromVideo);
    video.addEventListener("pause", syncFromVideo);
    video.addEventListener("ended", syncFromVideo);
    video.addEventListener("timeupdate", syncFromVideo);
    video.addEventListener("loadedmetadata", syncFromVideo);
    video.addEventListener("durationchange", syncFromVideo);
    video.addEventListener("seeked", syncFromVideo);
    controls.addEventListener("play", onPlay);
    controls.addEventListener("pause", onPause);
    controls.addEventListener("seek", onSeek);

    syncFromVideo();
  }

  #unwireControls() {
    const video = this.#controlsWiredFor;
    const controls = this.#controlsWiredControls;
    if (video && this.#controlsSync) {
      video.removeEventListener("play", this.#controlsSync);
      video.removeEventListener("pause", this.#controlsSync);
      video.removeEventListener("ended", this.#controlsSync);
      video.removeEventListener("timeupdate", this.#controlsSync);
      video.removeEventListener("loadedmetadata", this.#controlsSync);
      video.removeEventListener("durationchange", this.#controlsSync);
      video.removeEventListener("seeked", this.#controlsSync);
    }
    if (controls) {
      if (this.#controlsOnPlay) controls.removeEventListener("play", this.#controlsOnPlay);
      if (this.#controlsOnPause) controls.removeEventListener("pause", this.#controlsOnPause);
      if (this.#controlsOnSeek) controls.removeEventListener("seek", this.#controlsOnSeek);
    }
    this.#controlsWiredFor = null;
    this.#controlsWiredControls = null;
    this.#controlsSync = null;
    this.#controlsOnPlay = null;
    this.#controlsOnPause = null;
    this.#controlsOnSeek = null;
  }

  #removeControls() {
    this.#unwireControls();
    this.querySelectorAll(":scope > fig-media-controls[data-generated]").forEach((controls) => {
      controls.remove();
    });
    this.#controlsEl = null;
  }

  toggle() {
    if (!this.#mediaEl || this.mediaKind !== "video") return;
    if (this.#mediaEl.paused || this.#mediaEl.ended) this.play();
    else this.pause();
  }

  play() {
    if (this.mediaKind !== "video" || !this.#mediaEl) return;
    const p = this.#mediaEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  pause() {
    if (this.mediaKind !== "video" || !this.#mediaEl) return;
    this.#mediaEl.pause();
  }

  #createFileInput() {
    const fi = document.createElement("fig-input-file");
    fi.setAttribute("data-generated", "");
    fi.setAttribute("accepts", this.mediaKind === "video" ? "video/*" : "image/*");
    fi.setAttribute("variant", "overlay");
    if (this.getAttribute("upload")?.toLowerCase() === "icon") {
      fi.setAttribute("upload", "icon");
    }
    if (figBooleanAttribute(this, "multiple")) {
      fi.setAttribute("multiple", "");
    }
    const defaultLabel = this.getAttribute("label") || "Upload";
    fi.setAttribute("label", this.#src ? "Replace" : defaultLabel);
    if (this.#file?.name) {
      fi.setAttribute("filename", this.#file.name);
    } else if (this.#src) {
      fi.setAttribute("url", this.#src);
    }
    fi.addEventListener("change", this.#boundHandleFileInput);
    this.#ensurePreviewElement();
    this.#previewEl.append(fi);
    this.#fileInput = fi;
  }

  #syncFileInputUploadMode() {
    if (!this.#fileInput) return;
    if (this.getAttribute("upload")?.toLowerCase() === "icon") {
      this.#fileInput.setAttribute("upload", "icon");
    } else {
      this.#fileInput.removeAttribute("upload");
    }
  }

  #removeFileInput() {
    if (this.#fileInput) {
      this.#fileInput.removeEventListener("change", this.#boundHandleFileInput);
      this.#fileInput.remove();
      this.#fileInput = null;
    }
  }

  #handleFileInput(e) {
    if (e.target !== this.#fileInput) return;
    const files = Array.from(e.detail?.files ?? []);
    const file = files[0];
    const cleared = e.detail?.cleared === true;

    if (!file) {
      if (this.#blobUrl) this.#releaseBlobUrl();
      this.#file = null;
      this.#previewSrc = null;
      if (cleared) this.src = "";
      this.#syncGeneratedMediaElement();
      if (this.#fileInput) {
        const defaultLabel = this.getAttribute("label") || "Upload";
        this.#fileInput.setAttribute("label", this.#src ? "Replace" : defaultLabel);
        this.#fileInput.removeAttribute("filename");
        if (this.#src) {
          this.#fileInput.setAttribute("url", this.#src);
        } else {
          this.#fileInput.removeAttribute("url");
        }
      }
      this.dispatchEvent(
        new CustomEvent("change", { bubbles: true, cancelable: true }),
      );
      return;
    }

    if (this.#blobUrl) this.#releaseBlobUrl();
    this.#file = file;
    this.#blobUrl = this.#createBlobUrl(file);
    this.#previewSrc = this.#blobUrl;

    this.#syncGeneratedMediaElement();

    this.dispatchEvent(
      new CustomEvent("loaded", {
        bubbles: true,
        cancelable: true,
        detail: { file, files, src: this.#blobUrl },
      }),
    );
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, cancelable: true }),
    );

    if (this.#fileInput) {
      this.#fileInput.removeAttribute("url");
      this.#fileInput.setAttribute("filename", file.name);
      this.#fileInput.setAttribute("label", "Replace");
    }
  }

  #emitPlaybackEvent(type) {
    if (!this.#mediaEl) return;
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail: {
          src: this.#src || "",
          currentTime: this.#mediaEl.currentTime,
          duration: this.#mediaEl.duration,
        },
      }),
    );
  }

  #forwardMediaEvent(event) {
    const media = this.#mediaEl;
    if (!media || event.currentTarget !== media) return;
    if (
      media.tagName === "IMG" &&
      (event.type === "load" || event.type === "error")
    ) {
      this.toggleAttribute("loaded", event.type === "load");
      this.#finishImageLoading();
    }
    const detail = {
      src: this.#currentMediaSrc(),
      media,
      originalEvent: event,
    };
    if (media.tagName === "VIDEO") {
      detail.currentTime = media.currentTime;
      detail.duration = media.duration;
      detail.readyState = media.readyState;
      detail.networkState = media.networkState;
      detail.error = media.error;
    }
    this.dispatchEvent(
      new CustomEvent(event.type, {
        bubbles: true,
        cancelable: false,
        composed: true,
        detail,
      }),
    );
    if (
      (media.tagName === "IMG" && event.type === "load") ||
      (media.tagName === "VIDEO" && event.type === "loadeddata")
    ) {
      this.dispatchEvent(
        new CustomEvent("loaded", {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            src: detail.src,
            file: this.#file,
            media,
          },
        }),
      );
    }
  }

  #handleMediaPlay() {
    this.#emitPlaybackEvent("play");
  }

  #handleMediaPause() {
    this.#emitPlaybackEvent("pause");
  }

  #handleMediaEnded() {
    this.#emitPlaybackEvent("ended");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "src") {
      const nextSrc = newValue || "";
      const isCurrentPreviewBlob =
        nextSrc && (nextSrc === this.#previewSrc || nextSrc === this.#blobUrl);
      this.#src = nextSrc;
      if (this.#blobUrl && !isCurrentPreviewBlob) {
        this.#releaseBlobUrl();
        this.#previewSrc = null;
        this.#file = null;
      }
      this.#syncGeneratedMediaElement();
      if (this.#fileInput) {
        const defaultLabel = this.getAttribute("label") || "Upload";
        this.#fileInput.setAttribute("label", this.#src ? "Replace" : defaultLabel);
        if (this.#src) {
          if (this.#file?.name) {
            this.#fileInput.removeAttribute("url");
            this.#fileInput.setAttribute("filename", this.#file.name);
          } else {
            this.#fileInput.setAttribute("url", this.#src);
            this.#fileInput.removeAttribute("filename");
          }
        } else {
          this.#fileInput.removeAttribute("url");
          this.#fileInput.removeAttribute("filename");
        }
      }
    }

    if (name === "type") {
      this.#ensureMediaElement();
      this.#syncGeneratedMediaElement();
      if (this.#fileInput) {
        this.#fileInput.setAttribute(
          "accepts",
          this.mediaKind === "video" ? "video/*" : "image/*",
        );
      }
    }

    if (["alt", "aria-label", "aria-labelledby", "title"].includes(name)) {
      this.#syncMediaAccessibility();
    }

    if (name === "upload") {
      const on = newValue !== null && newValue !== "false";
      if (on && !this.#fileInput) {
        this.#createFileInput();
      } else if (!on) {
        this.#removeFileInput();
      } else {
        this.#syncFileInputUploadMode();
      }
    }

    if (name === "multiple" && this.#fileInput) {
      this.#fileInput.toggleAttribute(
        "multiple",
        newValue !== null && newValue !== "false",
      );
    }

    if (name === "loading-indicator") {
      this.#syncImageLoadingState();
    }

    if (name === "aspect-ratio") {
      if (newValue) {
        this.style.setProperty("--fig-media-aspect-ratio", newValue);
      } else {
        this.style.removeProperty("--fig-media-aspect-ratio");
      }
    }

    if (name === "fit") {
      if (newValue) {
        this.style.setProperty("--fig-media-fit", newValue);
      } else {
        this.style.removeProperty("--fig-media-fit");
      }
    }

    if (name === "label" && this.#fileInput) {
      const defaultLabel = this.getAttribute("label") || "Upload";
      this.#fileInput.setAttribute("label", this.#src ? "Replace" : defaultLabel);
    }

    if (["controls", "autoplay", "loop", "muted", "poster"].includes(name)) {
      this.#syncGeneratedMediaElement();
    }

    if (name === "caption") {
      this.#syncCaption();
    }
  }
}

figDefineElement("fig-media", FigMedia);

export { FigMedia };
