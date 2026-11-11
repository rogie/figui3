import { expect, test } from "@playwright/test";
import { bootFigFixture } from "./helpers";

test.describe("async resource lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await bootFigFixture(page);
  });

  test("audio decode replacement closes each context once and ignores stale completion", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const decodes: Array<(value: unknown) => void> = [];
      const closeCounts: number[] = [];
      Object.defineProperty(window, "fetch", {
        configurable: true,
        value: async () => ({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1),
        }),
      });
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: class {
          index = closeCounts.push(0) - 1;
          decodeAudioData() {
            return new Promise((resolve) => decodes.push(resolve));
          }
          close() {
            closeCounts[this.index] += 1;
            return Promise.resolve();
          }
        },
      });

      const host = document.createElement("fig-audio-waveform");
      host.setAttribute("url", "first");
      document.body.append(host);
      while (decodes.length < 1) await new Promise(requestAnimationFrame);

      host.setAttribute("url", "second");
      while (decodes.length < 2) await new Promise(requestAnimationFrame);
      decodes[1]({
        numberOfChannels: 1,
        length: 4,
        getChannelData: () => Float32Array.from([0, 0.25, 0.75, 1]),
      });
      while (host.getAttribute("data-waveform-state") !== "ready") {
        await new Promise(requestAnimationFrame);
      }
      const readyPath =
        host.querySelector(".fig-audio-waveform-path")?.getAttribute("d");

      host.remove();
      decodes[0]({
        numberOfChannels: 1,
        length: 4,
        getChannelData: () => Float32Array.from([1, 1, 1, 1]),
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      return {
        closeCounts,
        state: host.getAttribute("data-waveform-state"),
        pathUnchanged:
          host
            .querySelector(".fig-audio-waveform-path")
            ?.getAttribute("d") === readyPath,
      };
    });

    expect(state).toEqual({
      closeCounts: [1, 1],
      state: "ready",
      pathUnchanged: true,
    });
  });

  test("fig-media ignores stale image decode and cancels its loading timer", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const host = document.createElement("fig-media") as HTMLElement & {
        getBase64(): Promise<string | null>;
      };
      host.setAttribute("src", "first-image");
      document.body.append(host);
      await new Promise(requestAnimationFrame);

      const image = host.querySelector("img") as HTMLImageElement;
      let resolveDecode!: () => void;
      image.decode = () => new Promise<void>((resolve) => {
        resolveDecode = resolve;
      });
      Object.defineProperties(image, {
        naturalWidth: { configurable: true, value: 8 },
        naturalHeight: { configurable: true, value: 8 },
      });
      let draws = 0;
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {
          draws += 1;
        },
      })) as typeof HTMLCanvasElement.prototype.getContext;

      const base64 = host.getBase64();
      host.setAttribute("src", "second-image");
      host.remove();
      resolveDecode();
      const result = await base64;
      await new Promise((resolve) => setTimeout(resolve, 175));
      HTMLCanvasElement.prototype.getContext = originalGetContext;

      return {
        result,
        draws,
        busy: host.getAttribute("aria-busy"),
        spinners: host.querySelectorAll("[data-loading-indicator]").length,
      };
    });

    expect(state).toEqual({
      result: null,
      draws: 0,
      busy: null,
      spinners: 0,
    });
  });

  test("stops a webcam stream that resolves after disconnect exactly once", async ({
    page,
  }) => {
    await page.evaluate(() => import("/fig-editor.js"));
    const state = await page.evaluate(async () => {
      let resolveStream!: (stream: unknown) => void;
      let requested = false;
      let stops = 0;
      const stream = {
        getTracks: () => [{ stop: () => { stops += 1; } }],
        getVideoTracks: () => [],
      };
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: () => {
            requested = true;
            return new Promise((resolve) => {
              resolveStream = resolve;
            });
          },
          enumerateDevices: async () => [],
        },
      });

      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: unknown;
        open(): void;
      };
      picker.value = { type: "webcam" };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      while (!requested) await new Promise(requestAnimationFrame);
      picker.remove();
      resolveStream(stream);
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { stops, connected: picker.isConnected };
    });

    expect(state).toEqual({ stops: 1, connected: false });
  });

  test("drops stale webcam snapshots without creating blob URLs", async ({
    page,
  }) => {
    await page.evaluate(() => import("/fig-editor.js"));
    const state = await page.evaluate(async () => {
      let streamStops = 0;
      const stream = {
        getTracks: () => [{ stop: () => { streamStops += 1; } }],
        getVideoTracks: () => [],
      };
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => stream,
          enumerateDevices: async () => [],
        },
      });

      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
      let pendingSnapshot: BlobCallback | null = null;
      let objectUrls = 0;
      URL.createObjectURL = (blob: Blob) => {
        objectUrls += 1;
        return originalCreateObjectUrl(blob);
      };

      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: unknown;
        open(): void;
      };
      picker.value = { type: "webcam" };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const video = document.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      Object.defineProperties(video, {
        videoWidth: { configurable: true, value: 8 },
        videoHeight: { configurable: true, value: 8 },
      });
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        pendingSnapshot = callback;
      };
      const capture = document.querySelector(
        ".fig-fill-picker-webcam-capture",
      ) as HTMLElement;
      capture.removeAttribute("disabled");
      capture.click();
      while (!pendingSnapshot) await new Promise(requestAnimationFrame);
      picker.remove();
      pendingSnapshot(new Blob(["stale"], { type: "image/png" }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      URL.createObjectURL = originalCreateObjectUrl;
      return { objectUrls, streamStops };
    });

    expect(state).toEqual({ objectUrls: 0, streamStops: 1 });
  });

  test("only the current video source can publish a poster", async ({ page }) => {
    await page.evaluate(() => import("/fig-editor.js"));
    const state = await page.evaluate(async () => {
      const originalCreateElement = document.createElement;
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      const originalCreateImageBitmap = window.createImageBitmap;
      const originalOffscreenCanvas = Object.getOwnPropertyDescriptor(
        window,
        "OffscreenCanvas",
      );
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      const videos: HTMLVideoElement[] = [];
      const loadCounts: number[] = [];
      let objectUrls = 0;

      (document as any).createElement = function (
        name: string,
        options?: ElementCreationOptions,
      ) {
        const element = originalCreateElement.call(document, name, options);
        if (name.toLowerCase() !== "video") return element;
        const video = element as HTMLVideoElement;
        const index = videos.length;
        loadCounts.push(0);
        let source = "";
        Object.defineProperties(video, {
          src: {
            configurable: true,
            get: () => source,
            set: (value: string) => {
              source = value;
            },
          },
          videoWidth: { configurable: true, value: 8 },
          videoHeight: { configurable: true, value: 8 },
          load: {
            configurable: true,
            value: () => {
              loadCounts[index] += 1;
            },
          },
          requestVideoFrameCallback: {
            configurable: true,
            value: (callback: VideoFrameRequestCallback) => {
              queueMicrotask(() => callback(0, {} as VideoFrameCallbackMetadata));
              return 1;
            },
          },
          cancelVideoFrameCallback: {
            configurable: true,
            value: () => {},
          },
        });
        videos.push(video);
        return video;
      };
      Object.defineProperty(window, "OffscreenCanvas", {
        configurable: true,
        value: undefined,
      });
      window.createImageBitmap = async () => {
        throw new Error("use canvas fallback");
      };
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["poster"], { type: "image/jpeg" }));
      };
      URL.createObjectURL = () => `blob:poster-${++objectUrls}`;
      URL.revokeObjectURL = () => {};

      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
      };
      picker.value = { type: "video", video: { url: "first.mp4" } };
      document.body.append(picker);
      while (videos.length < 1) await new Promise(requestAnimationFrame);

      picker.value = { type: "video", video: { url: "second.mp4" } };
      while (videos.length < 2) await new Promise(requestAnimationFrame);
      videos[0].dispatchEvent(new Event("loadeddata"));
      videos[1].dispatchEvent(new Event("loadeddata"));
      while (!picker.value.video?.poster) {
        await new Promise(requestAnimationFrame);
      }
      const poster = picker.value.video.poster;
      picker.remove();
      await new Promise((resolve) => setTimeout(resolve, 0));

      (document as any).createElement = originalCreateElement;
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      window.createImageBitmap = originalCreateImageBitmap;
      if (originalOffscreenCanvas) {
        Object.defineProperty(window, "OffscreenCanvas", originalOffscreenCanvas);
      } else {
        delete (window as any).OffscreenCanvas;
      }
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;

      return { poster, objectUrls, loadCounts };
    });

    expect(state).toEqual({
      poster: "blob:poster-1",
      objectUrls: 1,
      loadCounts: [1, 1],
    });
  });
});
