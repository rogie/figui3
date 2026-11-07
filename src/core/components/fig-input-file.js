/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  CustomEvent,
  HTMLElement,
  createFigIcon,
  figBooleanAttribute,
  figDefineElement,
  figValuesEqual,
} from "../runtime/index.js";

/* File Upload Input */
const FIG_INPUT_FILE_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
];
const FIG_INPUT_FILE_AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".aac",
  ".m4a",
  ".ogg",
  ".flac",
];
const FIG_INPUT_FILE_VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".avi",
  ".mkv",
  ".ogv",
  ".mpeg",
  ".mpg",
  ".3gp",
];

/**
 * File upload input with file-aware icons, image previews, and audio playback waveforms.
 * @attr {string} accepts - Native file chooser filter.
 * @attr {boolean} preview - Preview supported files or show their media-specific icon.
 * @attr {string} label - Upload button label. Defaults by known file type.
 * @attr {boolean} remove - Show the remove button for a selected file. Defaults to true.
 */
class FigInputFile extends HTMLElement {
  static observedAttributes = [
    "accepts",
    "preview",
    "label",
    "disabled",
    "multiple",
    "variant",
    "url",
    "filename",
    "default-url",
    "default-filename",
    "remove",
  ];

  #fileInput = null;
  #filenameEl = null;
  #clearBtn = null;
  #tooltipEl = null;
  #uploadBtn = null;
  #files = null;
  #imageBlobUrl = null;
  #audioPreview = null;
  #audioIcon = null;
  #audioWaveform = null;
  #audioPlaying = false;
  #audioBlobUrl = null;
  #suppressAttributeRender = false;

  get files() {
    return this.#files;
  }

  get #urlFilename() {
    const filename = this.getAttribute("filename");
    if (filename) return filename;
    const url = this.getAttribute("url");
    if (!url) return "";
    try {
      const path = new URL(url, location.href).pathname;
      const name = path.split("/").pop();
      return name ? decodeURIComponent(name) : url;
    } catch {
      return url;
    }
  }

  get value() {
    if (this.#files && this.#files.length > 0) {
      if (this.#files.length === 1) return this.#files[0].name;
      return `${this.#files.length} files`;
    }
    return this.#urlFilename;
  }

  get default() {
    return {
      url: this.getAttribute("default-url") || "",
      filename: this.getAttribute("default-filename") || "",
    };
  }

  set default(value) {
    const next =
      value && typeof value === "object"
        ? value
        : { url: value == null ? "" : String(value), filename: "" };
    this.#suppressAttributeRender = true;
    if (next.url) this.setAttribute("default-url", String(next.url));
    else this.removeAttribute("default-url");
    if (next.filename)
      this.setAttribute("default-filename", String(next.filename));
    else this.removeAttribute("default-filename");
    this.#suppressAttributeRender = false;
  }

  get defaultValue() {
    return { ...this.default };
  }

  set defaultValue(value) {
    this.default = value;
  }

  get isDefault() {
    if (this.#files?.length) return false;
    const current = {
      url: this.getAttribute("url") || "",
      filename: this.getAttribute("filename") || "",
    };
    return figValuesEqual(current, this.default);
  }

  resetToDefault() {
    if (figBooleanAttribute(this, "disabled") || this.isDefault) return;
    const next = this.default;
    this.#files = null;
    if (this.#fileInput) this.#fileInput.value = "";
    this.#suppressAttributeRender = true;
    if (next.url) this.setAttribute("url", next.url);
    else this.removeAttribute("url");
    if (next.filename) this.setAttribute("filename", next.filename);
    else this.removeAttribute("filename");
    this.#suppressAttributeRender = false;
    this.#render();
    this.#emitEvents();
  }

  get #effectiveAccepts() {
    return this.getAttribute("accepts") || "";
  }

  get #previewEnabled() {
    return (
      this.hasAttribute("preview") &&
      this.getAttribute("preview") !== "false"
    );
  }

  get #removeEnabled() {
    return this.getAttribute("remove") !== "false";
  }

  get #largePreviewEnabled() {
    return this.getAttribute("preview")?.toLowerCase() === "large";
  }

  #hasKnownExtension(filename, extensions) {
    const lowerName = filename.toLowerCase();
    return extensions.some((extension) => lowerName.endsWith(extension));
  }

  #isKnownFile(file, extensions, mimePrefix) {
    return (
      this.#hasKnownExtension(file.name, extensions) ||
      file.type.toLowerCase().startsWith(mimePrefix)
    );
  }

  #generatedLabel() {
    if (this.#files?.[0]) {
      if (
        this.#isKnownFile(
          this.#files[0],
          FIG_INPUT_FILE_AUDIO_EXTENSIONS,
          "audio/",
        )
      ) {
        return "Upload audio";
      }
      if (
        this.#isKnownFile(
          this.#files[0],
          FIG_INPUT_FILE_IMAGE_EXTENSIONS,
          "image/",
        )
      ) {
        return "Upload image";
      }
    }

    if (
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_AUDIO_EXTENSIONS,
      )
    ) {
      return "Upload audio";
    }
    if (
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_IMAGE_EXTENSIONS,
      )
    ) {
      return "Upload image";
    }

    const acceptedTypes = this.#effectiveAccepts
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .map((value) => {
        if (
          value.startsWith("audio/") ||
          FIG_INPUT_FILE_AUDIO_EXTENSIONS.includes(value)
        ) {
          return "audio";
        }
        if (
          value.startsWith("image/") ||
          FIG_INPUT_FILE_IMAGE_EXTENSIONS.includes(value)
        ) {
          return "image";
        }
        return "file";
      });
    if (
      acceptedTypes.length > 0 &&
      acceptedTypes.every((type) => type === "audio")
    ) {
      return "Upload audio";
    }
    if (
      acceptedTypes.length > 0 &&
      acceptedTypes.every((type) => type === "image")
    ) {
      return "Upload image";
    }
    return "Upload file";
  }

  #hasPreviewableImage() {
    if (this.#files?.length) {
      return this.#isKnownFile(
        this.#files[0],
        FIG_INPUT_FILE_IMAGE_EXTENSIONS,
        "image/",
      );
    }
    return (
      !!this.getAttribute("url") &&
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_IMAGE_EXTENSIONS,
      )
    );
  }

  #hasPreviewableAudio() {
    if (this.#files?.length) {
      return this.#isKnownFile(
        this.#files[0],
        FIG_INPUT_FILE_AUDIO_EXTENSIONS,
        "audio/",
      );
    }
    return (
      !!this.getAttribute("url") &&
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_AUDIO_EXTENSIONS,
      )
    );
  }

  #largePreviewKind() {
    const file = this.#files?.[0];
    if (file) {
      if (
        this.#isKnownFile(
          file,
          FIG_INPUT_FILE_VIDEO_EXTENSIONS,
          "video/",
        )
      ) {
        return "video";
      }
      if (
        this.#isKnownFile(
          file,
          FIG_INPUT_FILE_IMAGE_EXTENSIONS,
          "image/",
        )
      ) {
        return "image";
      }
      return null;
    }

    if (
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_VIDEO_EXTENSIONS,
      )
    ) {
      return "video";
    }
    if (
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_IMAGE_EXTENSIONS,
      )
    ) {
      return "image";
    }

    const acceptedKinds = this.#effectiveAccepts
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .map((value) => {
        if (
          value.startsWith("video/") ||
          FIG_INPUT_FILE_VIDEO_EXTENSIONS.includes(value)
        ) {
          return "video";
        }
        if (
          value.startsWith("image/") ||
          FIG_INPUT_FILE_IMAGE_EXTENSIONS.includes(value)
        ) {
          return "image";
        }
        return null;
      });
    if (
      acceptedKinds.length > 0 &&
      acceptedKinds.every((kind) => kind === acceptedKinds[0])
    ) {
      return acceptedKinds[0];
    }
    return null;
  }

  #selectedFileIcon() {
    if (this.#files && this.#files.length > 0) {
      const files = Array.from(this.#files);
      if (
        this.#previewEnabled &&
        files.every((file) =>
          this.#isKnownFile(
            file,
            FIG_INPUT_FILE_VIDEO_EXTENSIONS,
            "video/",
          ),
        )
      ) {
        return "video";
      }
      if (
        files.every((file) =>
          this.#isKnownFile(
            file,
            FIG_INPUT_FILE_AUDIO_EXTENSIONS,
            "audio/",
          ),
        )
      ) {
        return "audio";
      }
      if (
        files.every((file) =>
          this.#isKnownFile(
            file,
            FIG_INPUT_FILE_IMAGE_EXTENSIONS,
            "image/",
          ),
        )
      ) {
        return "image";
      }
    }
    if (
      this.#previewEnabled &&
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_VIDEO_EXTENSIONS,
      )
    ) {
      return "video";
    }
    if (
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_AUDIO_EXTENSIONS,
      )
    ) {
      return "audio";
    }
    if (
      this.#hasKnownExtension(
        this.#urlFilename,
        FIG_INPUT_FILE_IMAGE_EXTENSIONS,
      )
    ) {
      return "image";
    }
    return "upload";
  }

  connectedCallback() {
    this.#render();
    this.addEventListener("dragover", this.#onDragOver);
    this.addEventListener("dragleave", this.#onDragLeave);
    this.addEventListener("drop", this.#onDrop);
  }

  disconnectedCallback() {
    this.#fileInput?.removeEventListener("change", this.#onFileChange);
    this.#clearBtn?.removeEventListener("click", this.#onClear);
    this.#disconnectImagePreview();
    this.#disconnectAudioPreview();
    this.removeEventListener("dragover", this.#onDragOver);
    this.removeEventListener("dragleave", this.#onDragLeave);
    this.removeEventListener("drop", this.#onDrop);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (this.#suppressAttributeRender) return;
    this.#render();
  }

  focus(options) {
    const nestedInput = this.querySelector(
      ":scope > fig-image fig-input-file[data-generated], :scope > fig-video fig-input-file[data-generated]",
    );
    if (nestedInput) {
      nestedInput.focus(options);
      return;
    }
    if (this.#fileInput) {
      this.#fileInput.focus(options);
      return;
    }
    this.#uploadBtn?.focus(options);
  }

  activate(options) {
    if (figBooleanAttribute(this, "disabled")) return;
    const nestedInput = this.querySelector(
      ":scope > fig-image fig-input-file[data-generated], :scope > fig-video fig-input-file[data-generated]",
    );
    if (nestedInput) {
      nestedInput.activate(options);
      return;
    }
    this.focus(options);
    if (this.#fileInput) {
      this.#fileInput.click();
      return;
    }
    this.#uploadBtn?.click();
  }

  clear() {
    this.#files = null;
    if (this.#fileInput) this.#fileInput.value = "";
    this.removeAttribute("url");
    this.removeAttribute("filename");
    this.#render();
    this.#emitEvents({ cleared: true });
  }

  #emitEvents(extraDetail = {}) {
    const detail = { files: this.#files, ...extraDetail };
    this.dispatchEvent(new CustomEvent("input", { detail, bubbles: true }));
    this.dispatchEvent(new CustomEvent("change", { detail, bubbles: true }));
  }

  #removeExternalFileAttributes() {
    this.#suppressAttributeRender = true;
    this.removeAttribute("url");
    this.removeAttribute("filename");
    this.#suppressAttributeRender = false;
  }

  #onFileChange = () => {
    if (this.#fileInput.files.length > 0) {
      this.#files = this.#fileInput.files;
      this.#removeExternalFileAttributes();
      this.#render();
      this.#emitEvents();
    }
  };

  #onClear = (e) => {
    e.stopPropagation();
    this.clear();
  };

  #onDragOver = (e) => {
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;
    e.preventDefault();
    if (!this.hasAttribute("dragover")) {
      this.setAttribute("dragover", "");
      if (this.#uploadBtn) {
        this.#uploadBtn.dataset.prevText = this.#uploadBtn.textContent;
        this.#uploadBtn.textContent = "Drop file";
      }
    }
  };

  #onDragLeave = () => {
    this.removeAttribute("dragover");
    if (this.#uploadBtn && this.#uploadBtn.dataset.prevText !== undefined) {
      this.#uploadBtn.textContent = this.#uploadBtn.dataset.prevText;
      delete this.#uploadBtn.dataset.prevText;
    }
  };

  #onDrop = (e) => {
    e.preventDefault();
    this.removeAttribute("dragover");
    if (this.#uploadBtn && this.#uploadBtn.dataset.prevText !== undefined) {
      this.#uploadBtn.textContent = this.#uploadBtn.dataset.prevText;
      delete this.#uploadBtn.dataset.prevText;
    }
    if (
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false"
    )
      return;

    const accepts = this.#effectiveAccepts;
    let dropped = Array.from(e.dataTransfer.files);
    if (accepts) {
      const allowed = accepts.split(",").map((s) => s.trim().toLowerCase());
      dropped = dropped.filter((file) => {
        const ext = "." + file.name.split(".").pop().toLowerCase();
        const mime = file.type.toLowerCase();
        return allowed.some(
          (a) =>
            a === ext ||
            a === mime ||
            (a.endsWith("/*") && mime.startsWith(a.slice(0, -1))),
        );
      });
    }
    if (
      !this.hasAttribute("multiple") ||
      this.getAttribute("multiple") === "false"
    ) {
      dropped = dropped.slice(0, 1);
    }
    if (dropped.length === 0) return;

    const dt = new DataTransfer();
    dropped.forEach((f) => dt.items.add(f));
    this.#files = dt.files;
    if (this.#fileInput) {
      this.#fileInput.files = dt.files;
    }
    this.#removeExternalFileAttributes();
    this.#render();
    this.#emitEvents();
  };

  #disconnectImagePreview() {
    if (!this.#imageBlobUrl) return;
    URL.revokeObjectURL(this.#imageBlobUrl);
    this.#imageBlobUrl = null;
  }

  #disconnectAudioPreview() {
    this.#audioPreview?.pause();
    if (this.#audioBlobUrl) {
      URL.revokeObjectURL(this.#audioBlobUrl);
      this.#audioBlobUrl = null;
    }
    this.#audioPreview = null;
    this.#audioIcon = null;
    this.#audioWaveform = null;
    this.#audioPlaying = false;
    this.removeAttribute("data-audio-playing");
  }

  #setAudioPlaybackUi(playing) {
    this.#audioPlaying = playing;
    this.#audioIcon?.setAttribute("name", playing ? "pause" : "play");
    this.toggleAttribute("data-audio-playing", playing);
    this.#uploadBtn?.toggleAttribute("selected", playing);
    this.#uploadBtn?.setAttribute(
      "aria-label",
      playing ? "Pause audio" : "Play audio",
    );
  }

  #syncAudioWaveformProgress() {
    if (!this.#audioPreview || !this.#audioWaveform) return;
    const duration = this.#audioPreview.duration;
    const currentTime = this.#audioPreview.currentTime;
    const progress =
      Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)
        ? Math.max(0, Math.min(currentTime / duration, 1))
        : 0;
    this.#audioWaveform.setAttribute("progress", String(progress));
  }

  #onAudioPlaybackToggle = (event) => {
    event.preventDefault();
    if (!this.#audioPreview || this.#uploadBtn?.hasAttribute("disabled")) return;
    if (this.#audioPlaying) {
      this.#audioPreview.pause();
      return;
    }
    const playback = this.#audioPreview.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => this.#setAudioPlaybackUi(false));
    }
  };

  #renderAudioPreview() {
    const audio = document.createElement("audio");
    audio.hidden = true;
    audio.preload = "metadata";
    if (this.#files?.[0]) {
      this.#audioBlobUrl = URL.createObjectURL(this.#files[0]);
      audio.src = this.#audioBlobUrl;
    } else {
      audio.src = this.getAttribute("url") || "";
    }

    audio.addEventListener("play", () => this.#setAudioPlaybackUi(true));
    audio.addEventListener("pause", () => this.#setAudioPlaybackUi(false));
    audio.addEventListener("ended", () => {
      this.#setAudioPlaybackUi(false);
      this.#audioWaveform?.setAttribute("progress", "0");
    });
    audio.addEventListener("timeupdate", () =>
      this.#syncAudioWaveformProgress(),
    );
    audio.addEventListener("durationchange", () =>
      this.#syncAudioWaveformProgress(),
    );

    this.#audioPreview = audio;
    this.#audioWaveform = document.createElement("fig-audio-waveform");
    this.#audioWaveform.className = "fig-input-file-audio-waveform";
    this.#audioWaveform.setAttribute("url", audio.src);
    this.#audioWaveform.setAttribute("polarization", "3");
    this.#audioWaveform.setAttribute("progress", "0");
    this.#uploadBtn?.append(this.#audioWaveform);
    this.#uploadBtn?.addEventListener("click", this.#onAudioPlaybackToggle);
    this.#setAudioPlaybackUi(false);
    this.append(audio);
  }

  #createImagePreviewSwatch() {
    const swatch = document.createElement("fig-swatch");
    const file = this.#files?.[0];
    const url = file
      ? (this.#imageBlobUrl = URL.createObjectURL(file))
      : this.getAttribute("url") || "";
    swatch.setAttribute("background", `url(${JSON.stringify(url)})`);
    swatch.setAttribute("slot", "prepend");
    return swatch;
  }

  #createMultipleFileIcon(count) {
    const icon = document.createElement("fig-icon");
    icon.setAttribute("slot", "prepend");
    const label = document.createElement("label");
    label.textContent = String(count);
    icon.append(label);
    return icon;
  }

  #onLargePreviewChange = (event) => {
    if (event.target !== event.currentTarget) {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    const media = event.currentTarget;
    const file = media.file;
    if (file) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      this.#files = dataTransfer.files;
      this.#removeExternalFileAttributes();
      this.#render();
      this.#emitEvents();
      return;
    }

    this.#files = null;
    this.#removeExternalFileAttributes();
    this.#render();
    this.#emitEvents({ cleared: true });
  };

  #renderLargePreview(kind, disabled) {
    const media = document.createElement(
      kind === "video" ? "fig-video" : "fig-image",
    );
    media.setAttribute("upload", "");
    media.setAttribute("full", "");
    media.setAttribute("checkerboard", "");
    const file = this.#files?.[0];
    const url = file
      ? (this.#imageBlobUrl = URL.createObjectURL(file))
      : this.getAttribute("url") || "";
    if (url) media.setAttribute("src", url);
    media.addEventListener("change", this.#onLargePreviewChange);
    this.append(media);
    const nestedInput = media.querySelector(
      ":scope > fig-preview > fig-input-file[data-generated]",
    );
    if (disabled) nestedInput?.setAttribute("disabled", "");
    this.setAttribute("data-previewing", "large");
  }

  #render() {
    const accepts = this.#effectiveAccepts;
    const customLabel = this.getAttribute("label");
    const label = customLabel?.trim() ? customLabel : this.#generatedLabel();
    const disabled =
      this.hasAttribute("disabled") &&
      this.getAttribute("disabled") !== "false";
    const multiple =
      this.hasAttribute("multiple") && this.getAttribute("multiple") !== "false";
    const variant = this.getAttribute("variant") || "property";
    const hasFile =
      (this.#files && this.#files.length > 0) ||
      !!this.getAttribute("url") ||
      !!this.getAttribute("filename");
    const showsMultiplePreview =
      this.#previewEnabled &&
      multiple &&
      (this.#files?.length ?? 0) > 1;
    const showsImagePreview =
      !showsMultiplePreview &&
      this.#previewEnabled &&
      this.#hasPreviewableImage();
    const showsAudioPreview =
      !showsMultiplePreview &&
      this.#previewEnabled &&
      this.#hasPreviewableAudio();

    this.#disconnectImagePreview();
    this.#disconnectAudioPreview();
    this.replaceChildren();
    this.#fileInput = null;
    this.#uploadBtn = null;
    this.#clearBtn = null;
    this.#tooltipEl = null;
    this.removeAttribute("data-previewing");

    const largePreviewKind =
      this.#largePreviewEnabled && !showsMultiplePreview
      ? this.#largePreviewKind()
      : null;
    if (largePreviewKind) {
      this.#renderLargePreview(largePreviewKind, disabled);
      return;
    }

    if (hasFile) {
      const filename = this.value;
      const selectedFileNames =
        multiple && this.#files?.length
          ? Array.from(this.#files, (file) => file.name).join(", ")
          : "";
      const tooltipText = selectedFileNames
        ? selectedFileNames
        : showsAudioPreview
        ? filename
        : accepts
        ? `Accepts ${accepts
            .split(",")
            .map((s) => s.trim())
            .join(", ")}`
        : "";

      this.#uploadBtn = document.createElement("fig-button");
      this.#uploadBtn.setAttribute("variant", variant);
      if (variant === "property") this.#uploadBtn.setAttribute("full", "");
      this.#uploadBtn.className = "fig-input-file-filename";
      if (disabled) this.#uploadBtn.setAttribute("disabled", "");
      const fileIcon = showsMultiplePreview
        ? this.#createMultipleFileIcon(this.#files.length)
        : showsImagePreview
          ? this.#createImagePreviewSwatch()
          : createFigIcon(this.#selectedFileIcon());
      const truncEl = document.createElement("fig-truncate");
      truncEl.setAttribute("position", "middle");
      truncEl.setAttribute("tooltip", "");
      const buttonLabel = showsMultiplePreview
        ? "Multiple files"
        : filename;
      const dotIdx = buttonLabel.lastIndexOf(".");
      if (!showsMultiplePreview && dotIdx > 0) {
        truncEl.setAttribute("tail", buttonLabel.slice(dotIdx));
      }
      truncEl.textContent = buttonLabel;
      fileIcon.setAttribute("slot", "prepend");
      if (showsAudioPreview) {
        fileIcon.classList.add("fig-input-file-audio-icon");
        truncEl.classList.add("fig-input-file-audio-label");
        this.#audioIcon = createFigIcon("play");
        this.#audioIcon.classList.add("fig-input-file-audio-control");
        this.#audioIcon.setAttribute("slot", "prepend");
        this.#uploadBtn.append(fileIcon, this.#audioIcon, truncEl);
      } else {
        this.#uploadBtn.append(fileIcon, truncEl);
      }

      if (!showsAudioPreview) {
        this.#uploadBtn.setAttribute("type", "upload");
        this.#fileInput = document.createElement("input");
        this.#fileInput.type = "file";
        this.#fileInput.title = "";
        this.#fileInput.disabled = disabled;
        if (accepts) this.#fileInput.setAttribute("accept", accepts);
        if (multiple) this.#fileInput.setAttribute("multiple", "");
        this.#fileInput.addEventListener("change", this.#onFileChange);
        this.#uploadBtn.appendChild(this.#fileInput);
      }

      if (tooltipText) {
        this.#tooltipEl = document.createElement("fig-tooltip");
        this.#tooltipEl.setAttribute("text", tooltipText);
        this.#tooltipEl.appendChild(this.#uploadBtn);
        this.appendChild(this.#tooltipEl);
      } else {
        this.appendChild(this.#uploadBtn);
      }

      if (this.#removeEnabled) {
        const clearTooltip = document.createElement("fig-tooltip");
        clearTooltip.setAttribute("text", "Remove");
        this.#clearBtn = document.createElement("fig-button");
        this.#clearBtn.setAttribute("variant", variant === "overlay" ? "overlay" : "ghost");
        this.#clearBtn.setAttribute("icon", "true");
        this.#clearBtn.setAttribute("aria-label", "Remove");
        this.#clearBtn.className = "fig-input-file-clear";
        if (disabled) this.#clearBtn.setAttribute("disabled", "");
        this.#clearBtn.replaceChildren(createFigIcon("minus"));
        this.#clearBtn.addEventListener("click", this.#onClear);
        clearTooltip.appendChild(this.#clearBtn);
        this.appendChild(clearTooltip);
      }
      if (showsAudioPreview) this.#renderAudioPreview();
    } else {
      const tooltipText = accepts
        ? `Accepts ${accepts
            .split(",")
            .map((s) => s.trim())
            .join(", ")}`
        : "";

      if (tooltipText) {
        this.#tooltipEl = document.createElement("fig-tooltip");
        this.#tooltipEl.setAttribute("text", tooltipText);
      }

      this.#uploadBtn = document.createElement("fig-button");
      this.#uploadBtn.setAttribute("variant", variant);
      if (variant === "property") this.#uploadBtn.setAttribute("full", "");
      this.#uploadBtn.setAttribute("type", "upload");
      this.#uploadBtn.textContent = label;
      const uploadIcon = createFigIcon("upload");
      uploadIcon.setAttribute("slot", "prepend");
      this.#uploadBtn.prepend(uploadIcon);
      if (disabled) this.#uploadBtn.setAttribute("disabled", "");

      this.#fileInput = document.createElement("input");
      this.#fileInput.type = "file";
      this.#fileInput.title = "";
      this.#fileInput.disabled = disabled;
      if (accepts) this.#fileInput.setAttribute("accept", accepts);
      if (multiple) this.#fileInput.setAttribute("multiple", "");
      this.#fileInput.addEventListener("change", this.#onFileChange);
      this.#uploadBtn.appendChild(this.#fileInput);

      if (this.#tooltipEl) {
        this.#tooltipEl.appendChild(this.#uploadBtn);
        this.appendChild(this.#tooltipEl);
      } else {
        this.appendChild(this.#uploadBtn);
      }
    }
  }
}
figDefineElement("fig-input-file", FigInputFile);

export { FigInputFile };
