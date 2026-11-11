/*
MIT License
Copyright (c) 2026 Rogie King
License: https://github.com/rogie/figui3/blob/main/LICENSE
*/

const GIF_TYPE = "image/gif";
const DEFAULT_FRAME_DURATION_US = 100_000;

function isGif(bytes) {
  if (bytes.byteLength < 6) return false;
  const header = String.fromCharCode(...new Uint8Array(bytes, 0, 6));
  return header === "GIF87a" || header === "GIF89a";
}

function canInspectSource(src) {
  if (/^data:/i.test(src)) return /^data:image\/gif[;,]/i.test(src);
  if (/^blob:/i.test(src)) return true;
  try {
    const url = new URL(src, document.baseURI);
    if (url.origin === location.origin) return true;
    if (/\.gif$/i.test(url.pathname)) return true;
    return [...url.searchParams.values()].some((value) =>
      /^(?:gif|image\/gif)$/i.test(value),
    );
  } catch {
    return false;
  }
}

class AnimatedImagePlayback extends EventTarget {
  #decoder;
  #context;
  #durations;
  #frameStarts;
  #currentTime = 0;
  #frameIndex = -1;
  #decodeToken = 0;
  #animationFrame = 0;
  #startedAt = 0;
  #lastTimeUpdate = 0;
  #closed = false;

  constructor({ decoder, canvas, durations, width, height }) {
    super();
    this.#decoder = decoder;
    this.canvas = canvas;
    this.#context = canvas.getContext("2d");
    this.#durations = durations;
    this.#frameStarts = [];
    let elapsed = 0;
    for (const duration of durations) {
      this.#frameStarts.push(elapsed);
      elapsed += duration;
    }
    this.duration = elapsed;
    this.paused = true;
    this.ended = false;
    this.loop = false;
    canvas.width = width;
    canvas.height = height;
  }

  static async create(src, { signal } = {}) {
    const Decoder = globalThis.ImageDecoder;
    if (!src || !canInspectSource(src) || typeof Decoder !== "function") {
      return null;
    }
    if (!(await Decoder.isTypeSupported(GIF_TYPE))) return null;

    const response = await fetch(src, { signal });
    if (!response.ok) throw new Error(`Unable to load animated image: ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (!isGif(bytes)) return null;

    const decoder = new Decoder({ data: bytes, type: GIF_TYPE });
    try {
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      if (!track?.animated || track.frameCount < 2) {
        decoder.close();
        return null;
      }

      const durations = [];
      let width = 0;
      let height = 0;
      for (let index = 0; index < track.frameCount; index += 1) {
        if (signal?.aborted) throw signal.reason;
        const { image } = await decoder.decode({ frameIndex: index });
        width ||= image.displayWidth || image.codedWidth;
        height ||= image.displayHeight || image.codedHeight;
        durations.push(
          Math.max(1, image.duration || DEFAULT_FRAME_DURATION_US) / 1_000_000,
        );
        image.close();
      }

      const canvas = document.createElement("canvas");
      canvas.setAttribute("data-generated", "");
      canvas.setAttribute("data-animated-image", "");
      canvas.className = "fig-media-element";
      const playback = new AnimatedImagePlayback({
        decoder,
        canvas,
        durations,
        width,
        height,
      });
      await playback.#renderFrame(0);
      return playback;
    } catch (error) {
      decoder.close();
      throw error;
    }
  }

  get currentTime() {
    return this.#currentTime;
  }

  set currentTime(value) {
    if (this.#closed) return;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    this.#currentTime = Math.min(this.duration, Math.max(0, number));
    this.ended = this.#currentTime >= this.duration;
    if (!this.paused) {
      this.#startedAt = performance.now() - this.#currentTime * 1000;
    }
    this.#renderCurrentFrame();
    this.dispatchEvent(new Event("timeupdate"));
    this.dispatchEvent(new Event("seeked"));
  }

  play() {
    if (this.#closed) return Promise.resolve();
    if (this.ended || this.#currentTime >= this.duration) {
      this.#currentTime = 0;
      this.ended = false;
      this.#renderCurrentFrame();
    }
    if (!this.paused) return Promise.resolve();
    this.paused = false;
    this.#startedAt = performance.now() - this.#currentTime * 1000;
    this.#lastTimeUpdate = 0;
    this.dispatchEvent(new Event("play"));
    this.#tick();
    return Promise.resolve();
  }

  pause() {
    if (this.#closed || this.paused) return;
    this.paused = true;
    cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
    this.dispatchEvent(new Event("pause"));
  }

  close() {
    if (this.#closed) return;
    this.#closed = true;
    cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
    this.#decodeToken += 1;
    this.#decoder.close();
    this.canvas.remove();
  }

  #tick = (now = performance.now()) => {
    if (this.#closed || this.paused) return;
    let nextTime = (now - this.#startedAt) / 1000;
    if (nextTime >= this.duration) {
      if (this.loop) {
        nextTime %= this.duration;
        this.#startedAt = now - nextTime * 1000;
      } else {
        this.#currentTime = this.duration;
        this.ended = true;
        this.paused = true;
        this.#renderCurrentFrame();
        this.dispatchEvent(new Event("timeupdate"));
        this.dispatchEvent(new Event("ended"));
        return;
      }
    }

    this.#currentTime = nextTime;
    this.#renderCurrentFrame();
    if (now - this.#lastTimeUpdate >= 50) {
      this.#lastTimeUpdate = now;
      this.dispatchEvent(new Event("timeupdate"));
    }
    this.#animationFrame = requestAnimationFrame(this.#tick);
  };

  #frameAt(time) {
    if (time >= this.duration) return this.#durations.length - 1;
    for (let index = this.#frameStarts.length - 1; index >= 0; index -= 1) {
      if (time >= this.#frameStarts[index]) return index;
    }
    return 0;
  }

  #renderCurrentFrame() {
    const index = this.#frameAt(this.#currentTime);
    if (index === this.#frameIndex) return;
    this.#renderFrame(index);
  }

  async #renderFrame(index) {
    if (this.#closed || !this.#context) return;
    const token = ++this.#decodeToken;
    try {
      const { image } = await this.#decoder.decode({ frameIndex: index });
      if (token === this.#decodeToken && !this.#closed) {
        this.#context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.#context.drawImage(image, 0, 0);
        this.#frameIndex = index;
      }
      image.close();
    } catch {
      // Source changes and teardown can cancel pending decodes.
    }
  }
}

export { AnimatedImagePlayback };
