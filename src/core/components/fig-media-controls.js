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

/**
 * <fig-media-controls> — Standalone playback controls UI.
 *
 * Renders a play/pause button, a scrubber slider, and a MM:SS time display.
 * Holds its own state via attributes — no media element required.
 *
 * Attributes:
 *   - `playing` (boolean presence) — current play/pause state
 *   - `duration` (number, seconds) — total track length
 *   - `time` (number, seconds) — current playhead position
 *   - `disabled` (boolean) — disables play/seek interaction
 *
 * Events:
 *   - `play` — emitted when the user toggles playback on (detail: { playing: true })
 *   - `pause` — emitted when the user toggles playback off (detail: { playing: false })
 *   - `seek` — emitted when the user drags the scrubber (detail: { time })
 *
 * Properties: `playing`, `duration`, `time`, `disabled` mirror the attributes.
 */
class FigMediaControls extends HTMLElement {
  #playBtn = null;
  #playTooltip = null;
  #timeSlider = null;
  #timeEl = null;
  #userSeeking = false;
  #rendered = false;

  static get observedAttributes() {
    return ["playing", "duration", "time", "disabled"];
  }

  connectedCallback() {
    this.#render();
    this.#syncPlayingUi();
    this.#syncTimeUi();
    this.#syncDisabled();
  }

  get playing() {
    return this.hasAttribute("playing") && this.getAttribute("playing") !== "false";
  }
  set playing(value) {
    if (value) this.setAttribute("playing", "");
    else this.removeAttribute("playing");
  }

  get duration() {
    const n = Number(this.getAttribute("duration"));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  set duration(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      this.removeAttribute("duration");
      return;
    }
    this.setAttribute("duration", String(n));
  }

  get time() {
    const n = Number(this.getAttribute("time"));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  set time(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      this.removeAttribute("time");
      return;
    }
    this.setAttribute("time", String(n));
  }

  get disabled() {
    return figBooleanAttribute(this, "disabled");
  }
  set disabled(value) {
    if (value) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }

  attributeChangedCallback(name) {
    if (!this.#rendered) return;
    if (name === "playing") this.#syncPlayingUi();
    if (name === "duration" || name === "time") this.#syncTimeUi();
    if (name === "disabled") this.#syncDisabled();
  }

  #render() {
    if (this.#rendered) return;
    this.#rendered = true;
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-label") && !this.hasAttribute("aria-labelledby")) {
      this.setAttribute("aria-label", "Media controls");
    }

    const tooltip = document.createElement("fig-tooltip");
    tooltip.setAttribute("text", "Play");
    const btn = document.createElement("fig-button");
    btn.setAttribute("variant", "ghost");
    btn.setAttribute("icon", "true");
    btn.setAttribute("aria-label", "Play");
    btn.append(createFigIcon("play"));
    tooltip.append(btn);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    });

    const slider = document.createElement("fig-slider");
    slider.setAttribute("text", "false");
    slider.setAttribute("min", "0");
    slider.setAttribute("max", String(this.duration));
    slider.setAttribute("step", "1");
    slider.setAttribute("value", String(this.time));
    slider.setAttribute("full", "");
    slider.setAttribute("aria-label", "Seek");
    slider.setAttribute(
      "aria-valuetext",
      this.#formatTimeValueText(this.time, this.duration),
    );
    const timeEl = document.createElement("span");
    timeEl.className = "fig-media-controls-time";
    timeEl.textContent = this.#formatTime(this.time);

    const handleSeek = (e) => {
      if (this.disabled) {
        e.preventDefault?.();
        e.stopPropagation();
        return;
      }
      const host = e.currentTarget;
      const next = Number(host?.value);
      if (!Number.isFinite(next)) return;
      this.#userSeeking = true;
      this.setAttribute("time", String(next));
      this.dispatchEvent(
        new CustomEvent("seek", {
          bubbles: true,
          composed: true,
          detail: { time: next },
        }),
      );
      requestAnimationFrame(() => {
        this.#userSeeking = false;
      });
    };
    slider.addEventListener("input", handleSeek);
    slider.addEventListener("change", handleSeek);

    this.append(tooltip, slider, timeEl);

    this.#playBtn = btn;
    this.#playTooltip = tooltip;
    this.#timeSlider = slider;
    this.#timeEl = timeEl;
    this.#syncDisabled();
  }

  #syncDisabled() {
    const disabled = this.disabled;
    this.setAttribute("aria-disabled", disabled ? "true" : "false");
    if (this.#playBtn) {
      if (disabled) this.#playBtn.setAttribute("disabled", "");
      else this.#playBtn.removeAttribute("disabled");
    }
    if (this.#timeSlider) {
      if (disabled) this.#timeSlider.setAttribute("disabled", "");
      else this.#timeSlider.removeAttribute("disabled");
    }
  }

  #formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  #formatTimeValueText(time, duration = 0) {
    const current = this.#formatTime(time);
    if (!Number.isFinite(duration) || duration <= 0) return current;
    return `${current} of ${this.#formatTime(duration)}`;
  }

  #syncPlayingUi() {
    if (!this.#playBtn) return;
    const playing = this.playing;
    this.#playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    this.#playBtn.toggleAttribute("selected", playing);
    this.#playTooltip?.setAttribute("text", playing ? "Pause" : "Play");
    const icon = this.#playBtn.querySelector("fig-icon");
    if (icon) {
      icon.setAttribute("name", playing ? "pause" : "play");
    }
  }

  #syncTimeUi() {
    if (!this.#timeSlider) return;
    const duration = this.duration;
    if (Number(this.#timeSlider.getAttribute("max")) !== duration) {
      this.#timeSlider.setAttribute("max", String(duration));
    }
    const t = this.time;
    if (!this.#userSeeking) {
      this.#timeSlider.setAttribute("value", String(t));
    }
    this.#timeSlider.setAttribute(
      "aria-valuetext",
      this.#formatTimeValueText(t, duration),
    );
    if (this.#timeEl) this.#timeEl.textContent = this.#formatTime(t);
  }

  toggle() {
    if (this.disabled) return;
    const next = !this.playing;
    this.playing = next;
    this.dispatchEvent(
      new CustomEvent(next ? "play" : "pause", {
        bubbles: true,
        composed: true,
        detail: { playing: next },
      }),
    );
  }

  play() {
    if (this.disabled || this.playing) return;
    this.toggle();
  }

  pause() {
    if (this.disabled || !this.playing) return;
    this.toggle();
  }
}
figDefineElement("fig-media-controls", FigMediaControls);

export { FigMediaControls };
