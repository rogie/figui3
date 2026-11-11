/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/
import {
  HTMLElement,
  figDefineElement,
} from "../runtime/index.js";

/**
 * Audio player composed from a waveform and shared media controls.
 *
 * @attr {string} src - Audio source URL
 * @attr {string} variant - Waveform rendering: bars or ribbon. Defaults to bars.
 * @attr {boolean} autoplay - Audio autoplay
 * @attr {boolean} controls - Show playback controls (default false)
 * @attr {boolean} muted - Mute audio playback
 * @attr {boolean} loop - Loop audio playback
 */
class FigAudio extends HTMLElement {
  #src = "";
  #audioEl = null;
  #waveformEl = null;
  #controlsEl = null;
  #controlsWiredFor = null;
  #controlsWiredControls = null;
  #controlsSync = null;
  #controlsOnPlay = null;
  #controlsOnPause = null;
  #controlsOnSeek = null;

  static get observedAttributes() {
    return ["src", "variant", "autoplay", "controls", "muted", "loop"];
  }

  connectedCallback() {
    this.#src = this.getAttribute("src") || "";
    this.#ensureAudioElement();
    this.#ensureWaveform();
    this.#syncAudioElement();
    this.#syncControlsVisibility();
    this.#syncPlaybackUi();
  }

  disconnectedCallback() {
    this.#unwireControls();
  }

  get src() {
    return this.#src;
  }

  set src(value) {
    if (value === null || value === undefined || value === "") {
      this.removeAttribute("src");
    } else {
      this.setAttribute("src", String(value));
    }
  }

  get variant() {
    return this.getAttribute("variant") === "ribbon" ? "ribbon" : "bars";
  }

  set variant(value) {
    if (value === null || value === undefined) {
      this.removeAttribute("variant");
    } else {
      this.setAttribute(
        "variant",
        String(value).trim().toLowerCase() === "ribbon" ? "ribbon" : "bars",
      );
    }
  }

  get audioEl() {
    return this.#audioEl;
  }

  #isEnabledAttr(name) {
    return this.hasAttribute(name) && this.getAttribute(name) !== "false";
  }

  #ensureAudioElement() {
    const authored = this.querySelector(":scope > audio:not([data-generated])");
    if (authored) {
      this.#audioEl = authored;
      return;
    }

    const generated = Array.from(
      this.querySelectorAll(":scope > audio[data-generated]"),
    );
    const audio = generated[0] || document.createElement("audio");
    generated.slice(1).forEach((duplicate) => duplicate.remove());
    if (!audio.hasAttribute("data-generated")) {
      audio.setAttribute("data-generated", "");
      audio.preload = "metadata";
      this.append(audio);
    }
    this.#audioEl = audio;
  }

  #ensureWaveform() {
    const authored = this.querySelector(
      ":scope > fig-audio-waveform:not([data-generated])",
    );
    if (authored) {
      this.querySelectorAll(
        ":scope > fig-audio-waveform[data-generated]",
      ).forEach((waveform) => waveform.remove());
      this.#waveformEl = authored;
    } else {
      const generated = Array.from(
        this.querySelectorAll(":scope > fig-audio-waveform[data-generated]"),
      );
      const waveform = generated[0] || document.createElement("fig-audio-waveform");
      generated.slice(1).forEach((duplicate) => duplicate.remove());
      if (!waveform.hasAttribute("data-generated")) {
        waveform.setAttribute("data-generated", "");
        waveform.setAttribute("full", "");
        this.prepend(waveform);
      }
      this.#waveformEl = waveform;
    }
    this.#syncWaveformSource();
    this.#syncWaveformVariant();
  }

  #syncWaveformSource() {
    if (!this.#waveformEl) return;
    if (this.#src) this.#waveformEl.setAttribute("url", this.#src);
    else this.#waveformEl.removeAttribute("url");
  }

  #syncWaveformVariant() {
    if (!this.#waveformEl) return;
    if (this.hasAttribute("variant")) {
      this.#waveformEl.setAttribute("variant", this.variant);
    } else {
      this.#waveformEl.removeAttribute("variant");
    }
  }

  #syncAudioElement() {
    if (!this.#audioEl) return;
    if (this.#audioEl.getAttribute("src") !== this.#src) {
      if (this.#src) this.#audioEl.setAttribute("src", this.#src);
      else {
        this.#audioEl.removeAttribute("src");
        this.#audioEl.load?.();
      }
    }
    this.#audioEl.controls = false;
    this.#audioEl.removeAttribute("controls");
    this.#audioEl.autoplay = this.#isEnabledAttr("autoplay");
    this.#audioEl.muted = this.#isEnabledAttr("muted");
    this.#audioEl.loop = this.#isEnabledAttr("loop");
    this.#syncWaveformSource();
    this.#syncControlsDisabled();
  }

  #hasPlayableAudio() {
    return Boolean(this.#src);
  }

  #syncControlsVisibility() {
    const authored = this.querySelector(
      ":scope > fig-media-controls:not([data-generated])",
    );
    if (authored) {
      if (this.#controlsEl !== authored) {
        this.#removeControls();
        this.#controlsEl = authored;
      }
      this.#wireControlsToAudio();
      this.#syncControlsDisabled();
      return;
    }

    if (this.#isEnabledAttr("controls")) {
      this.#ensureControls();
    } else {
      this.#removeControls();
    }
  }

  #ensureControls() {
    const generated = Array.from(
      this.querySelectorAll(":scope > fig-media-controls[data-generated]"),
    );
    const controls = generated[0] || document.createElement("fig-media-controls");
    generated.slice(1).forEach((duplicate) => duplicate.remove());
    if (!controls.hasAttribute("data-generated")) {
      controls.setAttribute("data-generated", "");
      this.append(controls);
    }
    this.#controlsEl = controls;
    this.#wireControlsToAudio();
    this.#syncControlsDisabled();
  }

  #syncControlsDisabled() {
    if (!this.#controlsEl) return;
    if (this.#hasPlayableAudio()) {
      if (this.#controlsEl.hasAttribute("data-fig-empty-disabled")) {
        this.#controlsEl.removeAttribute("disabled");
        this.#controlsEl.removeAttribute("data-fig-empty-disabled");
      }
      return;
    }
    this.#controlsEl.setAttribute("disabled", "");
    this.#controlsEl.setAttribute("data-fig-empty-disabled", "");
    this.#controlsEl.removeAttribute("playing");
    this.#controlsEl.setAttribute("time", "0");
    this.#controlsEl.setAttribute("duration", "0");
    this.#syncWaveformProgress(0, 0);
  }

  #syncWaveformProgress(time, duration) {
    if (!this.#waveformEl) return;
    const progress =
      Number.isFinite(time) && Number.isFinite(duration) && duration > 0
        ? Math.max(0, Math.min(time / duration, 1))
        : 0;
    this.#waveformEl.setAttribute("progress", String(progress));
  }

  #syncPlaybackUi() {
    const audio = this.#audioEl;
    if (!audio) return;
    const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (this.#controlsEl) {
      this.#controlsEl.toggleAttribute("playing", !audio.paused && !audio.ended);
      this.#controlsEl.setAttribute("time", String(time));
      this.#controlsEl.setAttribute("duration", String(duration));
    }
    this.#syncWaveformProgress(time, duration);
  }

  #wireControlsToAudio() {
    if (!this.#controlsEl || !this.#audioEl) return;
    if (
      this.#controlsWiredFor === this.#audioEl &&
      this.#controlsWiredControls === this.#controlsEl
    ) {
      this.#syncControlsDisabled();
      this.#syncPlaybackUi();
      return;
    }
    this.#unwireControls();

    const controls = this.#controlsEl;
    const audio = this.#audioEl;
    let pendingSeekTime = null;
    const syncFromAudio = () => {
      this.#syncControlsDisabled();
      if (!this.#hasPlayableAudio()) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      controls.toggleAttribute("playing", !audio.paused && !audio.ended);
      controls.setAttribute("duration", String(duration));
      if (pendingSeekTime !== null) {
        if (Math.abs(time - pendingSeekTime) < 0.25) pendingSeekTime = null;
        else {
          this.#syncWaveformProgress(time, duration);
          return;
        }
      }
      controls.setAttribute("time", String(time));
      this.#syncWaveformProgress(time, duration);
    };
    const onPlay = () => this.play();
    const onPause = () => this.pause();
    const onSeek = (event) => {
      if (!this.#hasPlayableAudio()) return;
      const next = Number(event?.detail?.time);
      if (!Number.isFinite(next)) return;
      pendingSeekTime = next;
      try {
        audio.currentTime = next;
      } catch {}
      this.#syncWaveformProgress(next, audio.duration);
    };

    this.#controlsWiredFor = audio;
    this.#controlsWiredControls = controls;
    this.#controlsSync = syncFromAudio;
    this.#controlsOnPlay = onPlay;
    this.#controlsOnPause = onPause;
    this.#controlsOnSeek = onSeek;

    [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "loadedmetadata",
      "durationchange",
      "seeked",
      "emptied",
    ].forEach((type) => audio.addEventListener(type, syncFromAudio));
    controls.addEventListener("play", onPlay);
    controls.addEventListener("pause", onPause);
    controls.addEventListener("seek", onSeek);
    syncFromAudio();
  }

  #unwireControls() {
    const audio = this.#controlsWiredFor;
    const controls = this.#controlsWiredControls;
    if (audio && this.#controlsSync) {
      [
        "play",
        "pause",
        "ended",
        "timeupdate",
        "loadedmetadata",
        "durationchange",
        "seeked",
        "emptied",
      ].forEach((type) => audio.removeEventListener(type, this.#controlsSync));
    }
    if (controls) {
      if (this.#controlsOnPlay) {
        controls.removeEventListener("play", this.#controlsOnPlay);
      }
      if (this.#controlsOnPause) {
        controls.removeEventListener("pause", this.#controlsOnPause);
      }
      if (this.#controlsOnSeek) {
        controls.removeEventListener("seek", this.#controlsOnSeek);
      }
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
    this.querySelectorAll(
      ":scope > fig-media-controls[data-generated]",
    ).forEach((controls) => controls.remove());
    this.#controlsEl = null;
  }

  play() {
    if (!this.#audioEl || !this.#hasPlayableAudio()) return;
    const promise = this.#audioEl.play?.();
    if (promise && typeof promise.catch === "function") promise.catch(() => {});
  }

  pause() {
    this.#audioEl?.pause?.();
  }

  toggle() {
    if (!this.#audioEl || !this.#hasPlayableAudio()) return;
    if (this.#audioEl.paused || this.#audioEl.ended) this.play();
    else this.pause();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "src") this.#src = newValue || "";
    if (!this.isConnected) return;
    if (name === "controls") this.#syncControlsVisibility();
    if (name === "variant") this.#syncWaveformVariant();
    if (["src", "autoplay", "muted", "loop"].includes(name)) {
      this.#syncAudioElement();
      this.#syncPlaybackUi();
    }
  }
}
figDefineElement("fig-audio", FigAudio);

export { FigAudio };
