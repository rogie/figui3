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

const clampProgress = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
};

/**
 * A play/pause button with a circular progress ring.
 *
 * Without `progress`, the component runs an internal timer for `duration`
 * seconds. Authoring `progress` switches to externally controlled mode.
 *
 * @attr {boolean} playing - Current play/pause state.
 * @attr {number} duration - Internal timer duration in seconds (default 5).
 * @attr {number} progress - Controlled progress from 0 to 1.
 * @attr {boolean} disabled - Disables interaction and pauses the timer.
 * @attr {string} variant - Variant forwarded to the inner fig-button.
 * @attr {string} size - Large size forwarded to the inner fig-button.
 */
class FigButtonPlay extends HTMLElement {
  #button = null;
  #icon = null;
  #progressCircle = null;
  #elapsedMs = 0;
  #startedAt = 0;
  #animationFrame = 0;
  #rendered = false;

  static get observedAttributes() {
    return [
      "playing",
      "duration",
      "progress",
      "disabled",
      "variant",
      "size",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "title",
    ];
  }

  connectedCallback() {
    this.#render();
    this.#syncButton();
    this.#syncProgress();
    this.#syncTimer();
  }

  disconnectedCallback() {
    this.#pauseTimer();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.#rendered || oldValue === newValue) return;
    if (name === "progress" && newValue === null) {
      this.#elapsedMs = clampProgress(oldValue) * this.duration * 1000;
    }
    if (name === "duration") {
      this.#elapsedMs = Math.min(this.#elapsedMs, this.duration * 1000);
    }
    this.#syncButton();
    this.#syncProgress();
    this.#syncTimer();
  }

  get playing() {
    return figBooleanAttribute(this, "playing");
  }
  set playing(value) {
    this.toggleAttribute("playing", Boolean(value));
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

  get progress() {
    if (this.hasAttribute("progress")) {
      return clampProgress(this.getAttribute("progress"));
    }
    return clampProgress(this.#elapsedMs / (this.duration * 1000));
  }
  set progress(value) {
    this.setAttribute("progress", String(clampProgress(value)));
  }

  get disabled() {
    return figBooleanAttribute(this, "disabled");
  }
  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  #render() {
    if (this.#rendered) return;
    this.#rendered = true;

    const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ring.classList.add("fig-button-play-ring");
    ring.setAttribute("viewBox", "0 0 32 32");
    ring.setAttribute("aria-hidden", "true");

    const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    track.classList.add("fig-button-play-track");
    track.setAttribute("cx", "16");
    track.setAttribute("cy", "16");
    track.setAttribute("r", "15");

    const progress = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    progress.classList.add("fig-button-play-progress");
    progress.setAttribute("cx", "16");
    progress.setAttribute("cy", "16");
    progress.setAttribute("r", "15");
    progress.setAttribute("pathLength", "1");
    ring.append(track, progress);

    const button = document.createElement("fig-button");
    button.setAttribute("variant", "ghost");
    button.setAttribute("icon", "");
    button.setAttribute("pill", "");
    const icon = createFigIcon("play");
    icon.setAttribute("aria-hidden", "true");
    button.append(icon);
    button.addEventListener("click", () => this.toggle());

    this.replaceChildren(ring, button);
    this.#button = button;
    this.#icon = icon;
    this.#progressCircle = progress;
  }

  #syncButton() {
    if (!this.#button || !this.#icon) return;
    const playing = this.playing;
    this.#icon.setAttribute("name", playing ? "pause" : "play");
    this.#button.setAttribute(
      "variant",
      this.getAttribute("variant") || "ghost",
    );

    const size = this.getAttribute("size");
    if (size) this.#button.setAttribute("size", size);
    else this.#button.removeAttribute("size");

    if (this.disabled) this.#button.setAttribute("disabled", "");
    else this.#button.removeAttribute("disabled");

    for (const name of [
      "aria-labelledby",
      "aria-describedby",
      "title",
    ]) {
      const value = this.getAttribute(name);
      if (value === null) this.#button.removeAttribute(name);
      else this.#button.setAttribute(name, value);
    }

    const authoredLabel = this.getAttribute("aria-label");
    if (authoredLabel === null) {
      this.#button.setAttribute("aria-label", playing ? "Pause" : "Play");
    } else {
      this.#button.setAttribute("aria-label", authoredLabel);
    }
  }

  #syncProgress() {
    if (!this.#progressCircle) return;
    this.#progressCircle.style.strokeDashoffset = String(1 - this.progress);
  }

  #syncTimer() {
    const shouldRun =
      this.isConnected &&
      this.playing &&
      !this.disabled &&
      !this.hasAttribute("progress");
    if (shouldRun) this.#startTimer();
    else this.#pauseTimer();
  }

  #startTimer() {
    if (this.#animationFrame) return;
    this.#startedAt = performance.now() - this.#elapsedMs;
    const tick = (now) => {
      this.#elapsedMs = Math.min(
        this.duration * 1000,
        now - this.#startedAt,
      );
      this.#syncProgress();
      if (this.progress >= 1) {
        this.#animationFrame = 0;
        this.removeAttribute("playing");
        this.dispatchEvent(
          new CustomEvent("complete", {
            bubbles: true,
            composed: true,
            detail: { progress: 1 },
          }),
        );
        return;
      }
      this.#animationFrame = requestAnimationFrame(tick);
    };
    this.#animationFrame = requestAnimationFrame(tick);
  }

  #pauseTimer() {
    if (!this.#animationFrame) return;
    this.#elapsedMs = Math.min(
      this.duration * 1000,
      performance.now() - this.#startedAt,
    );
    cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
    this.#syncProgress();
  }

  #dispatchPlaybackEvent(type) {
    this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        detail: { playing: this.playing, progress: this.progress },
      }),
    );
  }

  play() {
    if (this.disabled || this.playing) return;
    if (!this.hasAttribute("progress") && this.progress >= 1) {
      this.#elapsedMs = 0;
      this.#syncProgress();
    }
    this.playing = true;
    this.#dispatchPlaybackEvent("play");
  }

  pause() {
    if (this.disabled || !this.playing) return;
    this.playing = false;
    this.#dispatchPlaybackEvent("pause");
  }

  toggle() {
    if (this.disabled) return;
    if (this.playing) this.pause();
    else this.play();
  }

  reset() {
    this.#pauseTimer();
    this.#elapsedMs = 0;
    this.removeAttribute("progress");
    if (this.playing) {
      this.removeAttribute("playing");
    }
    this.#syncButton();
    this.#syncProgress();
  }
}

figDefineElement("fig-button-play", FigButtonPlay);

export { FigButtonPlay };
