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
} from "../runtime/index.js";

const SLIDE_SELECTOR = ":scope > fig-media, :scope > fig-image, :scope > fig-video";

/**
 * A timed carousel for FigUI media elements.
 *
 * @attr {number} index - Zero-based active item index.
 * @attr {boolean} playing - Current playback state.
 * @attr {boolean} autoplay - Start playing on first connection (default true).
 * @attr {number} duration - Default non-video item duration in seconds (default 5).
 * @attr {boolean} loop - Wrap navigation and playback at either end.
 * @attr {string} navigation - "buttons" (default) or "dots".
 * @attr {boolean} progress - Animate progress in dot navigation (default true).
 *
 * Direct media children may set `carousel-duration` to override their timing.
 */
class FigCarousel extends HTMLElement {
  #slides = [];
  #controls = null;
  #previousButton = null;
  #nextButton = null;
  #playButton = null;
  #activePlayback = null;
  #mutationObserver = null;
  #initialized = false;
  #syncing = false;
  #playbackToken = 0;
  #activeIndex = 0;
  #indicatorButtons = [];
  #progressFrame = 0;

  #boundPrevious = () => this.previous();
  #boundNext = () => this.next();
  #boundPlay = (event) => {
    if (event.target !== this.#playButton) return;
    this.play();
  };
  #boundPause = (event) => {
    if (event.target !== this.#playButton) return;
    this.pause();
  };
  #boundComplete = (event) => {
    if (event.target !== this.#playButton) return;
    this.#advanceFromPlayback();
  };
  #boundPlaybackTimeUpdate = () => this.#syncPlaybackProgress();
  #boundPlaybackDurationChange = () => this.#syncPlaybackProgress();
  #boundPlaybackEnded = () => {
    if (this.#activeItemDuration() !== null) return;
    this.#advanceFromPlayback();
  };

  static get observedAttributes() {
    return [
      "index",
      "playing",
      "autoplay",
      "duration",
      "loop",
      "navigation",
      "progress",
    ];
  }

  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-roledescription")) {
      this.setAttribute("aria-roledescription", "carousel");
    }
    this.#ensureControls();
    this.#observeChildren();
    this.#syncSlides({ preferAuthoredSelection: !this.hasAttribute("index") });
    if (!this.#initialized) {
      this.#initialized = true;
      const shouldAutoplay =
        this.getAttribute("autoplay") !== "false" &&
        this.getAttribute("playing") !== "false";
      if (shouldAutoplay) this.setAttribute("playing", "");
      else this.removeAttribute("playing");
    }
    this.#syncPlayback();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#pauseInactivePlayback();
      this.#syncPlayback({ reset: true });
    });
  }

  disconnectedCallback() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = null;
    this.#stopActivePlayback();
    this.#playButton?.pause();
    this.#stopProgressUpdates();
    this.#playbackToken += 1;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected || this.#syncing) return;
    if (name === "index") {
      this.#applyIndex(this.index, { emit: false });
      return;
    }
    if (name === "duration") {
      this.#syncPlayback({ reset: true });
      return;
    }
    if (name === "loop") {
      this.#syncControls();
      return;
    }
    if (name === "navigation") {
      this.#renderControls();
      this.#syncPlayback({ reset: true });
      return;
    }
    if (name === "progress") {
      this.#syncIndicators();
      this.#syncProgressUpdates();
      return;
    }
    if (name === "autoplay") {
      if (newValue === "false") this.pause();
      else this.play();
      return;
    }
    if (name === "playing") {
      this.#syncPlayback();
    }
  }

  get index() {
    const value = Number.parseInt(this.getAttribute("index") ?? "0", 10);
    if (!Number.isFinite(value)) return 0;
    return this.#clampIndex(value);
  }
  set index(value) {
    const number = Number.parseInt(value, 10);
    this.setAttribute("index", String(Number.isFinite(number) ? number : 0));
  }

  get playing() {
    return figBooleanAttribute(this, "playing");
  }
  set playing(value) {
    this.toggleAttribute("playing", Boolean(value));
  }

  get autoplay() {
    return this.getAttribute("autoplay") !== "false";
  }
  set autoplay(value) {
    if (value) this.removeAttribute("autoplay");
    else this.setAttribute("autoplay", "false");
  }

  get duration() {
    const value = Number(this.getAttribute("duration") ?? 5);
    return Number.isFinite(value) && value > 0 ? value : 5;
  }
  set duration(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      this.removeAttribute("duration");
      return;
    }
    this.setAttribute("duration", String(number));
  }

  get loop() {
    return figBooleanAttribute(this, "loop");
  }
  set loop(value) {
    this.toggleAttribute("loop", Boolean(value));
  }

  get navigation() {
    return this.getAttribute("navigation") === "dots" ? "dots" : "buttons";
  }
  set navigation(value) {
    if (value === "dots") this.setAttribute("navigation", "dots");
    else this.removeAttribute("navigation");
  }

  get progress() {
    return this.getAttribute("progress") !== "false";
  }
  set progress(value) {
    if (value) this.removeAttribute("progress");
    else this.setAttribute("progress", "false");
  }

  get items() {
    return [...this.#slides];
  }

  get currentItem() {
    return this.#activeSlide();
  }

  get canGoPrevious() {
    if (this.#slides.length < 2) return false;
    return this.loop || this.index > 0;
  }

  get canGoNext() {
    if (this.#slides.length < 2) return false;
    return this.loop || this.index < this.#slides.length - 1;
  }

  previous() {
    if (!this.#slides.length) return;
    const target =
      this.index > 0
        ? this.index - 1
        : this.loop
          ? this.#slides.length - 1
          : this.index;
    this.goTo(target);
  }

  next() {
    if (!this.#slides.length) return;
    const target =
      this.index < this.#slides.length - 1
        ? this.index + 1
        : this.loop
          ? 0
          : this.index;
    this.goTo(target);
  }

  goTo(index) {
    if (!this.#slides.length) return;
    const number = Number.parseInt(index, 10);
    if (!Number.isFinite(number)) return;
    const target = this.#clampIndex(number);
    this.#applyIndex(target, { emit: target !== this.index });
  }

  first() {
    this.goTo(0);
  }

  last() {
    this.goTo(this.#slides.length - 1);
  }

  restart() {
    if (!this.#slides.length) return;
    this.#syncPlayback({ reset: true });
  }

  play() {
    if (!this.#slides.length) return;
    if (!this.playing) this.setAttribute("playing", "");
    else this.#syncPlayback();
  }

  pause() {
    if (this.playing) this.removeAttribute("playing");
    else this.#syncPlayback();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  #ensureControls() {
    if (!this.#controls?.isConnected) {
      const controls = document.createElement("div");
      controls.className = "fig-carousel-controls";
      controls.setAttribute("data-generated", "");
      controls.setAttribute("data-fig-carousel-controls", "");
      this.append(controls);
      this.#controls = controls;
    }

    if (!this.#playButton) {
      const play = document.createElement("fig-button-play");
      play.setAttribute("data-generated", "");
      play.setAttribute("variant", "ghost");
      play.addEventListener("play", this.#boundPlay);
      play.addEventListener("pause", this.#boundPause);
      play.addEventListener("complete", this.#boundComplete);
      this.#playButton = play;
    }

    this.#renderControls();
  }

  #renderControls() {
    const controls = this.#controls;
    const play = this.#playButton;
    if (!controls || !play) return;

    controls.replaceChildren();
    controls.setAttribute("data-navigation", this.navigation);
    this.#previousButton = null;
    this.#nextButton = null;
    this.#indicatorButtons = [];

    if (this.navigation === "dots") {
      const indicators = document.createElement("div");
      indicators.className = "fig-carousel-indicators";
      indicators.setAttribute("role", "group");
      indicators.setAttribute("aria-label", "Carousel pages");
      this.#slides.forEach((_, index) => {
        const button = document.createElement("fig-button");
        button.className = "fig-carousel-indicator";
        button.setAttribute("variant", "ghost");
        button.setAttribute("icon", "");
        button.setAttribute("aria-label", `Go to item ${index + 1}`);
        button.setAttribute("data-fig-carousel-index", String(index));
        button.addEventListener("click", () => this.goTo(index));
        const dot = document.createElement("span");
        dot.className = "fig-carousel-dot";
        button.append(dot);
        indicators.append(button);
        this.#indicatorButtons.push(button);
      });
      play.hidden = true;
      play.setAttribute("aria-hidden", "true");
      controls.append(indicators, play);
    } else {
      const createNavigationButton = (action, label, iconName, handler) => {
        const button = document.createElement("fig-button");
        button.setAttribute("variant", "ghost");
        button.setAttribute("pill", "");
        button.setAttribute("icon", "");
        button.setAttribute("aria-label", label);
        button.setAttribute("data-generated", "");
        button.setAttribute("data-fig-carousel-action", action);
        const icon = createFigIcon(iconName);
        icon.setAttribute("aria-hidden", "true");
        button.append(icon);
        button.addEventListener("click", handler);
        return button;
      };
      this.#previousButton = createNavigationButton(
        "previous",
        "Previous item",
        "back",
        this.#boundPrevious,
      );
      this.#nextButton = createNavigationButton(
        "next",
        "Next item",
        "forward",
        this.#boundNext,
      );
      play.hidden = false;
      play.removeAttribute("aria-hidden");
      controls.append(this.#previousButton, this.#nextButton, play);
    }

    this.#syncControls();
  }

  #observeChildren() {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new MutationObserver((records) => {
      if (this.#syncing) return;
      const affectsSlides = records.some((record) => {
        if (record.type === "childList") {
          if (record.target !== this) return false;
          return [...record.addedNodes, ...record.removedNodes].some((node) =>
            node.matches?.("fig-media, fig-image, fig-video"),
          );
        }
        return this.#slides.includes(record.target);
      });
      if (affectsSlides) this.#syncSlides({ preferAuthoredSelection: true });
    });
    this.#mutationObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["animated", "carousel-duration", "type", "src"],
    });
  }

  #syncSlides({ preferAuthoredSelection = false } = {}) {
    const previousSlide = this.#slides[this.index] ?? null;
    this.#slides = Array.from(this.querySelectorAll(SLIDE_SELECTOR));
    if (this.navigation === "dots") this.#renderControls();
    if (this.#controls && this.lastElementChild !== this.#controls) {
      this.append(this.#controls);
    }

    let nextIndex = this.index;
    if (preferAuthoredSelection) {
      const selectedIndex = this.#slides.findIndex(
        (slide) =>
          slide.hasAttribute("selected") &&
          slide.getAttribute("selected") !== "false",
      );
      if (selectedIndex >= 0) nextIndex = selectedIndex;
      else if (previousSlide && this.#slides.includes(previousSlide)) {
        nextIndex = this.#slides.indexOf(previousSlide);
      }
    }
    nextIndex = this.#clampIndex(nextIndex);
    this.#applyIndex(nextIndex, { emit: false, force: true });
  }

  #applyIndex(nextIndex, { emit = false, force = false } = {}) {
    const next = this.#clampIndex(nextIndex);
    const previous = this.#activeIndex;
    if (!force && next === previous) {
      this.#syncControls();
      return;
    }

    this.#stopActivePlayback({ reset: true });
    this.#playbackToken += 1;
    this.#syncing = true;
    this.#activeIndex = next;
    if (this.getAttribute("index") !== String(next)) {
      this.setAttribute("index", String(next));
    }
    this.#slides.forEach((slide, index) => {
      const active = index === next;
      slide.toggleAttribute("selected", active);
      slide.toggleAttribute("hidden", !active);
      slide.inert = !active;
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      if (!slide.hasAttribute("role")) slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      const generatedLabel = slide.getAttribute("data-fig-carousel-label");
      const currentLabel = slide.getAttribute("aria-label");
      if (generatedLabel !== null && currentLabel !== generatedLabel) {
        slide.removeAttribute("data-fig-carousel-label");
      }
      if (!currentLabel || currentLabel === generatedLabel) {
        const label = `${index + 1} of ${this.#slides.length}`;
        slide.setAttribute("aria-label", label);
        slide.setAttribute("data-fig-carousel-label", label);
      }
    });
    this.#pauseInactivePlayback();
    this.#syncing = false;
    this.#syncControls();
    this.#syncPlayback({ reset: true });

    if (emit) {
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: {
            value: next,
            index: next,
            previousIndex: previous,
            item: this.#slides[next] ?? null,
          },
        }),
      );
    }
  }

  #clampIndex(value) {
    if (!this.#slides.length) return 0;
    return Math.min(this.#slides.length - 1, Math.max(0, value));
  }

  #activeSlide() {
    return this.#slides[this.index] ?? null;
  }

  #activePlaybackElement() {
    const slide = this.#activeSlide();
    if (!slide) return null;
    return slide.playbackEl ?? null;
  }

  #pauseInactivePlayback() {
    this.#slides.forEach((slide, index) => {
      if (index === this.#activeIndex) return;
      slide.playbackEl?.pause?.();
    });
  }

  #activeItemDuration() {
    const value = Number(this.#activeSlide()?.getAttribute("carousel-duration"));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  #syncControls() {
    const count = this.#slides.length;
    const noItems = count === 0;
    this.#setControlDisabled(this.#previousButton, !this.canGoPrevious);
    this.#setControlDisabled(this.#nextButton, !this.canGoNext);
    if (this.#playButton) {
      this.#playButton.disabled = noItems;
      this.#playButton.playing = !noItems && this.playing;
    }
    this.#syncIndicators();
    this.#syncProgressUpdates();
  }

  #setControlDisabled(control, disabled) {
    if (!control) return;
    control.toggleAttribute("disabled", disabled);
  }

  #syncIndicators() {
    this.#indicatorButtons.forEach((button, index) => {
      const active = index === this.index;
      button.toggleAttribute("data-active", active);
      if (active) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");

      const dot = button.querySelector(".fig-carousel-dot");
      if (!dot) return;
      if (!active || !this.progress) {
        dot.replaceChildren();
        return;
      }
      this.#ensureIndicatorProgress(dot);
    });
  }

  #ensureIndicatorProgress(dot) {
    let progress = dot.querySelector("progress");
    if (!progress) {
      progress = document.createElement("progress");
      progress.max = 1;
      progress.setAttribute("aria-hidden", "true");
      dot.replaceChildren(progress);
    }
    this.#setIndicatorProgress(progress);
  }

  #setIndicatorProgress(progressElement) {
    progressElement.value = this.#playButton?.progress ?? 0;
  }

  #syncProgressUpdates() {
    this.#stopProgressUpdates();
    this.#updateIndicatorProgress();
    if (
      this.navigation !== "dots" ||
      !this.progress ||
      !this.playing ||
      !this.isConnected
    ) {
      return;
    }
    const tick = () => {
      this.#updateIndicatorProgress();
      if (
        this.navigation === "dots" &&
        this.progress &&
        this.playing &&
        this.isConnected
      ) {
        this.#progressFrame = requestAnimationFrame(tick);
      } else {
        this.#progressFrame = 0;
      }
    };
    this.#progressFrame = requestAnimationFrame(tick);
  }

  #updateIndicatorProgress() {
    const progress =
      this.#indicatorButtons[this.index]?.querySelector("progress");
    if (progress) this.#setIndicatorProgress(progress);
  }

  #stopProgressUpdates() {
    if (!this.#progressFrame) return;
    cancelAnimationFrame(this.#progressFrame);
    this.#progressFrame = 0;
  }

  #syncPlayback({ reset = false } = {}) {
    if (!this.#playButton) return;

    const slide = this.#activeSlide();
    if (!slide) {
      this.#syncControls();
      return;
    }

    if (reset) {
      this.#stopActivePlayback({ reset: true });
      this.#playButton.reset();
      this.#playButton.setAttribute("progress", "0");

      const overrideDuration = this.#activeItemDuration();
      const playback = this.#activePlaybackElement();
      if (playback && overrideDuration === null) {
        this.#activePlayback = playback;
        this.#wireActivePlayback(playback);
        this.#syncPlaybackProgress();
      } else {
        this.#playButton.removeAttribute("progress");
        this.#playButton.duration = overrideDuration ?? this.duration;
        if (playback) {
          this.#activePlayback = playback;
          this.#wireActivePlayback(playback);
        }
      }
    }

    this.#playButton.playing = this.playing;
    this.#syncControls();
    if (this.playing && this.#activePlayback) {
      this.#playActivePlayback(this.#activePlayback);
    } else if (!this.playing) {
      this.#activePlayback?.pause?.();
    }
  }

  #wireActivePlayback(playback) {
    playback.addEventListener("timeupdate", this.#boundPlaybackTimeUpdate);
    playback.addEventListener(
      "loadedmetadata",
      this.#boundPlaybackDurationChange,
    );
    playback.addEventListener(
      "durationchange",
      this.#boundPlaybackDurationChange,
    );
    playback.addEventListener("ended", this.#boundPlaybackEnded);
  }

  #stopActivePlayback({ reset = false } = {}) {
    const playback = this.#activePlayback;
    if (!playback) return;
    playback.removeEventListener("timeupdate", this.#boundPlaybackTimeUpdate);
    playback.removeEventListener(
      "loadedmetadata",
      this.#boundPlaybackDurationChange,
    );
    playback.removeEventListener(
      "durationchange",
      this.#boundPlaybackDurationChange,
    );
    playback.removeEventListener("ended", this.#boundPlaybackEnded);
    playback.pause?.();
    if (reset) {
      try {
        playback.currentTime = 0;
      } catch {}
    }
    this.#activePlayback = null;
  }

  #playActivePlayback(playback) {
    if (playback.ended) playback.currentTime = 0;
    const token = ++this.#playbackToken;
    const result = playback.play?.();
    if (!result || typeof result.catch !== "function") return;
    result.catch(() => {
      if (
        token !== this.#playbackToken ||
        playback !== this.#activePlayback
      ) {
        return;
      }
      this.pause();
    });
  }

  #syncPlaybackProgress() {
    const playback = this.#activePlayback;
    if (!playback || !this.#playButton) return;
    const overrideDuration = this.#activeItemDuration();
    if (overrideDuration !== null) return;
    const duration = overrideDuration ?? playback.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      this.#playButton.progress = 0;
      return;
    }
    this.#playButton.duration = duration;
    this.#playButton.progress = Math.min(
      1,
      (playback.currentTime || 0) / duration,
    );
    this.#updateIndicatorProgress();
  }

  #advanceFromPlayback() {
    if (!this.playing) return;
    const atEnd = this.index >= this.#slides.length - 1;
    if (atEnd && !this.loop) {
      this.pause();
      return;
    }
    this.next();
  }
}

figDefineElement("fig-carousel", FigCarousel);

export { FigCarousel };
