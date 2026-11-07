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
 * Responsive waveform generated from an audio URL.
 *
 * @attr {string} url - Audio URL to decode when CORS permits.
 * @attr {string} variant - Waveform rendering: bars or ribbon. Defaults to bars.
 * @attr {number} polarization - Waveform contrast around half-height. Defaults to 1.5.
 * @attr {number} progress - Completed fraction from 0 to 1. Defaults to 0.
 * @attr {boolean|string} full - Makes the waveform fill its container.
 */
class FigAudioWaveform extends HTMLElement {
  static #instanceCount = 0;
  static observedAttributes = ["url", "variant", "polarization", "progress"];

  #surface = null;
  #svg = null;
  #waveformPath = null;
  #progressPath = null;
  #progressClipRect = null;
  #resizeObserver = null;
  #abortController = null;
  #audioContext = null;
  #levels = [];
  #generation = 0;
  #layoutFrame = 0;

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

  connectedCallback() {
    if (!this.#surface) this.#render();
    this.#observeWaveform();
    this.#syncSource();
  }

  disconnectedCallback() {
    this.#cancelDecode();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#layoutFrame) cancelAnimationFrame(this.#layoutFrame);
    this.#layoutFrame = 0;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.#surface) return;
    if (name === "url") this.#syncSource();
    if (name === "variant") this.#queueWaveformLayout();
    if (name === "polarization") this.#queueWaveformLayout();
    if (name === "progress") this.#syncProgress();
  }

  #render() {
    this.#surface = document.createElement("div");
    this.#surface.className = "fig-audio-waveform-surface";
    this.#surface.setAttribute("aria-hidden", "true");

    this.#svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.#svg.setAttribute("aria-hidden", "true");
    this.#svg.setAttribute("preserveAspectRatio", "none");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const progressClip = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "clipPath",
    );
    const progressClipId = `fig-audio-waveform-progress-${++FigAudioWaveform.#instanceCount}`;
    progressClip.id = progressClipId;
    progressClip.setAttribute("clipPathUnits", "userSpaceOnUse");
    this.#progressClipRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    progressClip.append(this.#progressClipRect);
    defs.append(progressClip);

    this.#waveformPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.#waveformPath.classList.add("fig-audio-waveform-path");
    this.#progressPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.#progressPath.classList.add("fig-audio-waveform-progress");
    this.#progressPath.setAttribute("clip-path", `url(#${progressClipId})`);
    this.#svg.append(defs, this.#waveformPath, this.#progressPath);
    this.#surface.appendChild(this.#svg);
    this.replaceChildren(this.#surface);

    this.#observeWaveform();
  }

  #observeWaveform() {
    if (this.#resizeObserver || !this.#svg) return;
    this.#resizeObserver = new ResizeObserver(() => this.#queueWaveformLayout());
    this.#resizeObserver.observe(this.#svg);
  }

  #syncSource() {
    const url = this.getAttribute("url");
    if (!url) {
      this.#clearWaveform();
      return;
    }

    this.#decodeSource(async (signal) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
      return response.arrayBuffer();
    });
  }

  async #decodeSource(loadArrayBuffer) {
    this.#cancelDecode();
    const generation = ++this.#generation;
    const controller = new AbortController();
    this.#abortController = controller;
    this.setAttribute("data-waveform-state", "loading");
    this.setAttribute("aria-busy", "true");
    this.#levels = [];
    this.#queueWaveformLayout();

    let context = null;
    try {
      const arrayBuffer = await loadArrayBuffer(controller.signal);
      if (generation !== this.#generation || !this.isConnected) return;

      const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) throw new Error("Web Audio is unavailable");
      context = new AudioContextConstructor();
      this.#audioContext = context;
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      if (generation !== this.#generation || !this.isConnected) return;

      this.#levels = this.#extractLevels(audioBuffer);
      this.setAttribute("data-waveform-state", "ready");
      this.#queueWaveformLayout();
    } catch (error) {
      if (generation !== this.#generation || error?.name === "AbortError") return;
      this.#levels = new Array(256).fill(0);
      this.setAttribute("data-waveform-state", "unavailable");
      this.#queueWaveformLayout();
    } finally {
      if (context) {
        try {
          await context.close();
        } catch {
          // Closing is best-effort in browsers with suspended audio contexts.
        }
      }
      if (this.#audioContext === context) this.#audioContext = null;
      if (this.#abortController === controller) this.#abortController = null;
      if (generation === this.#generation) this.removeAttribute("aria-busy");
    }
  }

  #extractLevels(audioBuffer) {
    const binCount = 256;
    const levels = new Array(binCount).fill(0);
    const channelCount = audioBuffer.numberOfChannels;
    const frameCount = audioBuffer.length;
    const sampleStride = Math.max(1, Math.ceil(frameCount / 500000));
    let maximum = 0;

    for (let bin = 0; bin < binCount; bin += 1) {
      const start = Math.floor((bin / binCount) * frameCount);
      const end = Math.max(
        start + 1,
        Math.floor(((bin + 1) / binCount) * frameCount),
      );
      let sumSquares = 0;
      let sampleCount = 0;
      for (let channel = 0; channel < channelCount; channel += 1) {
        const samples = audioBuffer.getChannelData(channel);
        for (let index = start; index < end; index += sampleStride) {
          const sample = samples[index] || 0;
          if (!Number.isFinite(sample)) continue;
          sumSquares += sample * sample;
          sampleCount += 1;
        }
      }
      const level = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
      levels[bin] = level;
      maximum = Math.max(maximum, level);
    }

    if (!Number.isFinite(maximum) || maximum <= 0) return levels.fill(0);
    const minimum = Math.min(...levels);
    const range = maximum - minimum;
    if (!Number.isFinite(range) || range <= Number.EPSILON) {
      return levels.fill(0);
    }
    return levels.map((level) => {
      const normalized = (level - minimum) / range;
      return Number.isFinite(normalized) ? normalized : 0;
    });
  }

  #clearWaveform() {
    this.#cancelDecode();
    this.#levels = [];
    this.removeAttribute("data-waveform-state");
    this.removeAttribute("aria-busy");
    this.#queueWaveformLayout();
  }

  #polarizeLevel(level) {
    const configured = Number.parseFloat(this.getAttribute("polarization"));
    const factor = Number.isFinite(configured)
      ? Math.max(0, Math.min(configured, 4))
      : 1.5;
    return Math.max(0, Math.min(1, 0.5 + (level - 0.5) * factor));
  }

  #progress() {
    const configured = Number.parseFloat(this.getAttribute("progress"));
    return Number.isFinite(configured)
      ? Math.max(0, Math.min(configured, 1))
      : 0;
  }

  #syncProgress() {
    if (!this.#svg || !this.#progressClipRect) return;
    const viewBox = this.#svg.viewBox.baseVal;
    const bounds = this.#svg.getBoundingClientRect();
    const width = viewBox.width || Math.max(1, Math.round(bounds.width));
    const height = viewBox.height || Math.max(1, Math.round(bounds.height));
    this.#progressClipRect.setAttribute("x", "0");
    this.#progressClipRect.setAttribute("y", "0");
    this.#progressClipRect.setAttribute("width", String(width * this.#progress()));
    this.#progressClipRect.setAttribute("height", String(height));
  }

  #cancelDecode() {
    this.#generation += 1;
    this.#abortController?.abort();
    this.#abortController = null;
    if (this.#audioContext) {
      try {
        this.#audioContext.close();
      } catch {
        // Closing is best-effort during teardown and source replacement.
      }
      this.#audioContext = null;
    }
  }

  #queueWaveformLayout() {
    if (this.#layoutFrame) return;
    this.#layoutFrame = requestAnimationFrame(() => {
      this.#layoutFrame = 0;
      this.#layoutWaveform();
    });
  }

  #createRibbonPath(levels, width, centerY, maxHeight, minimumHeight) {
    const lastIndex = levels.length - 1;
    const points = levels.map((level, index) => {
      const x = lastIndex > 0 ? (index / lastIndex) * width : width / 2;
      const halfHeight = Math.max(minimumHeight, level * maxHeight) / 2;
      return {
        x,
        top: centerY - halfHeight,
        bottom: centerY + halfHeight,
      };
    });
    if (points.length === 0) return "";

    const commands = [`M ${points[0].x} ${points[0].top}`];
    for (let index = 0; index < lastIndex; index += 1) {
      const point = points[index];
      const next = points[index + 1];
      const midpointX = (point.x + next.x) / 2;
      const midpointY = (point.top + next.top) / 2;
      if (index === 0) commands.push(`L ${midpointX} ${midpointY}`);
      else commands.push(`Q ${point.x} ${point.top} ${midpointX} ${midpointY}`);
    }
    const lastPoint = points[lastIndex];
    commands.push(`L ${lastPoint.x} ${lastPoint.top}`);
    commands.push(`L ${lastPoint.x} ${lastPoint.bottom}`);
    for (let index = lastIndex; index > 0; index -= 1) {
      const point = points[index];
      const previous = points[index - 1];
      const midpointX = (point.x + previous.x) / 2;
      const midpointY = (point.bottom + previous.bottom) / 2;
      if (index === lastIndex) commands.push(`L ${midpointX} ${midpointY}`);
      else {
        commands.push(
          `Q ${point.x} ${point.bottom} ${midpointX} ${midpointY}`,
        );
      }
    }
    commands.push(`L ${points[0].x} ${points[0].bottom} Z`);
    return commands.join(" ");
  }

  #layoutWaveform() {
    if (
      !this.#svg ||
      !this.#waveformPath ||
      !this.#progressPath ||
      !this.#progressClipRect
    ) {
      return;
    }
    const bounds = this.#svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    this.#svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.#syncProgress();

    if (this.#levels.length === 0) {
      this.#waveformPath.setAttribute("d", "");
      this.#progressPath.setAttribute("d", "");
      return;
    }

    const barCount = Math.min(
      this.#levels.length,
      Math.max(16, Math.floor(width / 3)),
    );
    const cellWidth = width / barCount;
    const configuredStrokeWidth = Number.parseFloat(
      getComputedStyle(this).getPropertyValue(
        "--fig-audio-waveform-stroke-width",
      ),
    );
    const strokeWidth =
      Number.isFinite(configuredStrokeWidth) && configuredStrokeWidth > 0
        ? configuredStrokeWidth
        : 2;
    const barWidth = Math.max(0.5, Math.min(strokeWidth, cellWidth * 0.75));
    const halfWidth = barWidth / 2;
    const centerY = height / 2;
    const maxBarHeight = Math.max(2, height - 12);
    const levels = [];

    for (let index = 0; index < barCount; index += 1) {
      const levelIndex = Math.min(
        this.#levels.length - 1,
        Math.floor((index / barCount) * this.#levels.length),
      );
      levels.push(this.#polarizeLevel(this.#levels[levelIndex]));
    }

    if (this.variant === "ribbon") {
      const path = this.#createRibbonPath(
        levels,
        width,
        centerY,
        maxBarHeight,
        barWidth,
      );
      this.#waveformPath.setAttribute("d", path);
      this.#progressPath.setAttribute("d", path);
      return;
    }

    const commands = [];

    for (let index = 0; index < barCount; index += 1) {
      const barHeight = Math.max(barWidth, levels[index] * maxBarHeight);
      const x = (index + 0.5) * cellWidth;
      const top = centerY - barHeight / 2;
      const bottom = centerY + barHeight / 2;
      const left = x - halfWidth;
      const right = x + halfWidth;
      commands.push(
        `M ${x} ${top}` +
          ` Q ${right} ${top} ${right} ${top + halfWidth}` +
          ` V ${bottom - halfWidth}` +
          ` Q ${right} ${bottom} ${x} ${bottom}` +
          ` Q ${left} ${bottom} ${left} ${bottom - halfWidth}` +
          ` V ${top + halfWidth}` +
          ` Q ${left} ${top} ${x} ${top} Z`,
      );
    }

    const path = commands.join(" ");
    this.#waveformPath.setAttribute("d", path);
    this.#progressPath.setAttribute("d", path);
  }
}
figDefineElement("fig-audio-waveform", FigAudioWaveform);

export { FigAudioWaveform };
