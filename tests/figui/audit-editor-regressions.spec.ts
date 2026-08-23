import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-fill-picker audit regressions", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.addScriptTag({ type: "module", url: "/fig-lab.js" });
    await page.evaluate(() => customElements.whenDefined("fig-fill-picker"));
  });

  test("names the dialog, synchronizes trigger ARIA, and manages focus", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
        close(): void;
      };
      picker.setAttribute("aria-label", "Background fill");
      picker.innerHTML = `<fig-swatch id="fill-trigger"></fig-swatch>`;
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);

      const trigger = picker.querySelector("#fill-trigger") as HTMLElement;
      trigger.focus();
      picker.open();
      await new Promise(requestAnimationFrame);
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLDialogElement;
      const openState = {
        name: dialog.getAttribute("aria-label"),
        labelled: dialog.hasAttribute("aria-labelledby"),
        focusInside: dialog.contains(document.activeElement),
        haspopup: trigger.getAttribute("aria-haspopup"),
        expanded: trigger.getAttribute("aria-expanded"),
        controls: trigger.getAttribute("aria-controls"),
        dialogId: dialog.id,
        staleColorInputs: trigger.querySelectorAll('input[type="color"]').length,
      };

      picker.close();
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return {
        ...openState,
        expandedAfterClose: trigger.getAttribute("aria-expanded"),
        focusRestored: document.activeElement === trigger,
      };
    });

    expect(state).toMatchObject({
      name: "Background fill",
      focusInside: true,
      haspopup: "dialog",
      expanded: "true",
      expandedAfterClose: "false",
      staleColorInputs: 0,
      focusRestored: true,
    });
    expect(state.labelled || state.name).toBeTruthy();
    expect(state.controls).toBe(state.dialogId);
  });

  test("round-trips canonical alpha and legacy opacity", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);

      picker.value = { type: "solid", color: "#336699", alpha: 0.35 };
      const canonical = picker.value;
      picker.value = { type: "solid", color: "#336699", opacity: 72 };
      const compatible = picker.value;
      return {
        canonicalAlpha: canonical.alpha,
        canonicalHsvAlpha: canonical.hsv.a,
        compatibleAlpha: compatible.alpha,
        compatibleHsvAlpha: compatible.hsv.a,
      };
    });

    expect(state).toEqual({
      canonicalAlpha: 0.35,
      canonicalHsvAlpha: 0.35,
      compatibleAlpha: 0.72,
      compatibleHsvAlpha: 0.72,
    });
  });

  test("refreshes the active tab and its UI for external values", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();

      picker.value = {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 180,
          stops: [
            { position: 0, color: "#000000", opacity: 100 },
            { position: 100, color: "#FFFFFF", opacity: 100 },
          ],
        },
      };
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const gradientVisible =
        (dialog.querySelector('[data-tab="gradient"]') as HTMLElement).style
          .display === "block";
      picker.value = {
        type: "image",
        image: { url: "/tests/figui/fixture.html", scaleMode: "tile", scale: 37 },
      };
      const imageTab = dialog.querySelector('[data-tab="image"]') as HTMLElement;
      return {
        gradientVisible,
        imageVisible: imageTab.style.display === "block",
        imageMode: (imageTab.querySelector(".fig-fill-picker-scale-mode") as any)
          .value,
        imageScale: imageTab
          .querySelector(".fig-fill-picker-scale")
          ?.getAttribute("value"),
        imageSrc: imageTab
          .querySelector(".fig-fill-picker-image-preview")
          ?.getAttribute("src"),
      };
    });

    expect(state).toEqual({
      gradientVisible: true,
      imageVisible: true,
      imageMode: "tile",
      imageScale: "37",
      imageSrc: "/tests/figui/fixture.html",
    });
  });

  test("emits one committed change and enforces disabled behavior", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
        close(): void;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      let changes = 0;
      let inputs = 0;
      picker.addEventListener("change", (event) => {
        if (event.target === picker) changes++;
      });
      picker.addEventListener("input", (event) => {
        if (event.target === picker) inputs++;
      });

      picker.open();
      const hue = document.querySelector(
        ".fig-fill-picker-dialog fig-slider[type='hue']",
      ) as HTMLElement & { value: number };
      hue.value = 120;
      hue.dispatchEvent(new Event("input", { bubbles: true }));
      hue.dispatchEvent(new Event("change", { bubbles: true }));
      picker.close();
      await new Promise(requestAnimationFrame);
      const changesAfterClose = changes;

      picker.open();
      picker.setAttribute("disabled", "");
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLDialogElement;
      const closedWhenDisabled = !dialog.open;
      picker.open();
      hue.value = 240;
      hue.dispatchEvent(new Event("input", { bubbles: true }));
      hue.dispatchEvent(new Event("change", { bubbles: true }));
      return {
        changesAfterClose,
        inputs,
        closedWhenDisabled,
        stayedClosed: !dialog.open,
        disabled: picker
          .querySelector("fig-swatch")
          ?.getAttribute("aria-disabled"),
      };
    });

    expect(state).toEqual({
      changesAfterClose: 1,
      inputs: 1,
      closedWhenDisabled: true,
      stayedClosed: true,
      disabled: "true",
    });
  });

  test("exposes saturation/brightness state without toggle semantics", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.value = {
        type: "solid",
        color: { h: 20, s: 40, v: 60, a: 1 },
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      const handle = document.querySelector(
        ".fig-fill-picker-color-area fig-handle",
      ) as HTMLElement;
      return {
        role: handle.getAttribute("role"),
        valueNow: handle.getAttribute("aria-valuenow"),
        valueText: handle.getAttribute("aria-valuetext"),
        pressed: handle.getAttribute("aria-pressed"),
      };
    });

    expect(state).toEqual({
      role: "slider",
      valueNow: "60",
      valueText: "Saturation 40%, brightness 60%",
      pressed: null,
    });
  });

  test("removes unsupported rotate controls and gates webcam capture", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      let stoppedTracks = 0;
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({
            getTracks: () => [{ stop: () => stoppedTracks++ }],
          }),
          enumerateDevices: async () => [],
        },
      });
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.value = { type: "webcam" };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const status = dialog.querySelector(
        ".fig-fill-picker-webcam-status",
      ) as HTMLElement;
      const capture = dialog.querySelector(
        ".fig-fill-picker-webcam-capture",
      ) as HTMLElement;
      const video = dialog.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      const captureInitiallyDisabled = capture.hasAttribute("disabled");
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      const captureReady = !capture.hasAttribute("disabled");

      const revoked: string[] = [];
      const originalRevoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (url: string) => {
        revoked.push(url);
        originalRevoke(url);
      };
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["snapshot"], { type: "image/png" }));
      };
      capture.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      picker.remove();
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      return {
        rotateButtons: dialog.querySelectorAll(".fig-fill-picker-media-rotate")
          .length,
        statusRole: status.getAttribute("role"),
        statusLive: status.getAttribute("aria-live"),
        captureInitiallyDisabled,
        captureReady,
        mutedProperty: video.muted,
        revokedOwnedUrls: revoked.length,
        stoppedTracks,
        dialogRemoved: !dialog.isConnected,
      };
    });

    expect(state).toEqual({
      rotateButtons: 0,
      statusRole: "status",
      statusLive: "polite",
      captureInitiallyDisabled: true,
      captureReady: true,
      mutedProperty: true,
      revokedOwnedUrls: 0,
      stoppedTracks: 1,
      dialogRemoved: true,
    });
  });

  test("reports webcam captures when the picker is locked to webcam", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
          enumerateDevices: async () => [],
        },
      });
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.setAttribute("mode", "webcam");
      picker.value = { type: "webcam" };
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise(requestAnimationFrame);

      const events: string[] = [];
      picker.addEventListener("input", () => events.push("input"));
      picker.addEventListener("change", () => events.push("change"));
      picker.open();

      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const capture = dialog.querySelector(
        ".fig-fill-picker-webcam-capture",
      ) as HTMLElement;
      const video = dialog.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));

      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["snapshot"], { type: "image/png" }));
      };
      capture.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;

      const swatch = picker.querySelector("fig-swatch");
      const value = picker.value;
      picker.remove();
      return {
        events,
        type: value.type,
        capturedBlobUrl: String(value.webcam?.snapshot ?? "").startsWith("blob:"),
        activeTab: (
          dialog.querySelector(
            '.fig-fill-picker-tab[data-tab="webcam"]',
          ) as HTMLElement
        ).style.display,
        swatchShowsCapture: /url\("?blob:/.test(
          swatch?.getAttribute("background") ?? "",
        ),
      };
    });

    expect(state.events.filter((name) => name === "change")).toEqual(["change"]);
    expect(state.events).toContain("input");
    expect(state.type).toBe("webcam");
    expect(state.capturedBlobUrl).toBe(true);
    expect(state.activeTab).toBe("block");
    expect(state.swatchShowsCapture).toBe(true);
  });

  test("paints the swatch when webcam becomes ready", async ({ page }) => {
    const state = await page.evaluate(async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
          enumerateDevices: async () => [],
        },
      });
      const fill = document.createElement("fig-input-fill") as HTMLElement & {
        value: Record<string, any>;
      };
      fill.setAttribute("mode", "webcam");
      fill.setAttribute("value", JSON.stringify({ type: "webcam" }));
      document.body.append(fill);
      await new Promise(requestAnimationFrame);
      const picker = fill.querySelector("fig-fill-picker") as HTMLElement & {
        open(): void;
      };
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["live"], { type: "image/png" }));
      };
      picker.open();
      const video = document.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      const snapshot = fill.value.webcam?.snapshot;
      const background =
        fill.querySelector("fig-swatch")?.getAttribute("background") ?? "";
      const type = fill.value.type;
      fill.remove();
      return { type, snapshot, background };
    });

    expect(state.type).toBe("webcam");
    expect(state.snapshot).toMatch(/^blob:/);
    expect(state.background).toBe(`url("${state.snapshot}")`);
  });

  test("keeps a live webcam stream after the picker closes", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      let stoppedTracks = 0;
      const stream = {
        getTracks: () => [
          { readyState: "live", stop: () => stoppedTracks++ },
        ],
        getVideoTracks: () => [
          { readyState: "live", getSettings: () => ({ deviceId: "cam-1" }) },
        ],
      };
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => stream,
          enumerateDevices: async () => [],
        },
      });
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        webcamStream: MediaStream | null;
        open(): void;
        close(): void;
        releaseWebcam(): void;
      };
      picker.setAttribute("webcam-mode", "live");
      picker.value = { type: "webcam" };
      const streams: Array<unknown> = [];
      picker.addEventListener("webcamstream", (event) => {
        streams.push((event as CustomEvent).detail?.stream ?? null);
      });
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise((resolve) => setTimeout(resolve, 0));
      picker.close();
      const afterClose = {
        stoppedTracks,
        hasStream: Boolean(picker.webcamStream),
        live: picker.value.webcam?.live,
        deviceId: picker.value.webcam?.deviceId,
      };
      picker.remove();
      return {
        ...afterClose,
        stoppedAfterRemove: stoppedTracks,
        releasedThen: streams.includes(null),
      };
    });

    expect(state).toEqual({
      stoppedTracks: 0,
      hasStream: true,
      live: true,
      deviceId: "cam-1",
      stoppedAfterRemove: 1,
      releasedThen: true,
    });
  });

  test("parses webcam values and legacy image snapshots", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
      };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.value = {
        type: "webcam",
        webcam: {
          live: true,
          snapshot: "data:image/png;base64,abc",
          deviceId: "cam-9",
          scaleMode: "fit",
          scale: 40,
          opacity: 0.8,
        },
      };
      const modern = picker.value.webcam;
      picker.value = {
        type: "webcam",
        image: { url: "data:image/png;base64,legacy", scaleMode: "crop", scale: 25 },
      };
      const legacy = picker.value.webcam;
      picker.remove();
      return { modern, legacy, type: picker.value?.type };
    });

    expect(state.modern).toMatchObject({
      live: true,
      snapshot: "data:image/png;base64,abc",
      deviceId: "cam-9",
      scaleMode: "fit",
      scale: 40,
      opacity: 0.8,
    });
    expect(state.legacy).toMatchObject({
      snapshot: "data:image/png;base64,legacy",
      scaleMode: "crop",
      scale: 25,
    });
  });

  test("Capture turns a live webcam into an image fill", async ({ page }) => {
    const state = await page.evaluate(async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
          enumerateDevices: async () => [],
        },
      });
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.setAttribute("mode", "image,webcam");
      picker.value = { type: "webcam" };
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const capture = dialog.querySelector(
        ".fig-fill-picker-webcam-capture",
      ) as HTMLElement;
      const useCamera = dialog.querySelector(".fig-fill-picker-webcam-use");
      const video = dialog.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["snapshot"], { type: "image/png" }));
      };
      capture.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
      const value = picker.value;
      picker.remove();
      return {
        type: value.type,
        imageUrl: String(value.image?.url ?? "").startsWith("blob:"),
        useCamera: Boolean(useCamera),
        webcamTab: (
          dialog.querySelector(
            '.fig-fill-picker-tab[data-tab="webcam"]',
          ) as HTMLElement
        ).style.display,
        imageTab: (
          dialog.querySelector(
            '.fig-fill-picker-tab[data-tab="image"]',
          ) as HTMLElement
        ).style.display,
      };
    });

    expect(state).toEqual({
      type: "image",
      imageUrl: true,
      useCamera: false,
      webcamTab: "none",
      imageTab: "block",
    });
  });

  test("video tab forwards url and poster to fig-media and the swatch", async ({
    page,
  }) => {
    await page.addStyleTag({ url: "/fig-editor.css" });
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.setAttribute("mode", "video");
      picker.value = {
        type: "video",
        video: {
          url: "https://example.com/clip.mp4",
          poster: "https://example.com/still.jpg",
          scaleMode: "fill",
        },
      };
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      const preview = document.querySelector(".fig-fill-picker-video-preview");
      const swatch = picker.querySelector("fig-swatch");
      const play = preview?.querySelector("fig-media-controls fig-button");
      const result = {
        src: preview?.getAttribute("src"),
        poster: preview?.getAttribute("poster"),
        background: swatch?.getAttribute("background"),
        playVisibility: play ? getComputedStyle(play).visibility : "",
      };
      picker.remove();
      return result;
    });

    expect(state.src).toBe("https://example.com/clip.mp4");
    expect(state.poster).toBe("https://example.com/still.jpg");
    expect(state.background).toBe('url("https://example.com/still.jpg")');
    expect(state.playVisibility).toBe("visible");
  });

  test("uses default-video and posters the swatch, not the mp4", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.setAttribute("mode", "video");
      picker.setAttribute("default-video", "https://example.com/sample.mp4");
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      const afterOpen = picker.value.video;
      picker.value = {
        type: "video",
        video: {
          url: "https://example.com/clip.mp4",
          poster: "data:image/jpeg;base64,poster",
          scaleMode: "fit",
          scale: 50,
        },
      };
      await new Promise(requestAnimationFrame);
      const swatch = picker.querySelector("fig-swatch");
      const background = swatch?.getAttribute("background") ?? "";
      picker.remove();
      return {
        defaultUrl: afterOpen?.url,
        missing: afterOpen?.missing === true,
        background,
      };
    });

    expect(state.defaultUrl).toBe("https://example.com/sample.mp4");
    expect(state.missing).toBe(false);
    expect(state.background).toBe('url("data:image/jpeg;base64,poster")');
  });

  test("fig-input-fill copies webcam and video poster values", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-fill");
      const fill = document.createElement("fig-input-fill") as HTMLElement & {
        value: Record<string, any>;
      };
      fill.setAttribute(
        "value",
        JSON.stringify({
          type: "webcam",
          webcam: { snapshot: "data:image/png;base64,cam", deviceId: "front" },
        }),
      );
      document.body.append(fill);
      await new Promise(requestAnimationFrame);
      const webcam = fill.value.webcam;
      const webcamSwatch = fill
        .querySelector("fig-swatch")
        ?.getAttribute("background");
      fill.setAttribute(
        "value",
        JSON.stringify({
          type: "video",
          video: {
            url: "https://example.com/a.mp4",
            poster: "data:image/jpeg;base64,vid",
          },
        }),
      );
      await new Promise(requestAnimationFrame);
      const video = fill.value.video;
      const videoSwatchEl = fill.querySelector("fig-swatch");
      const videoSwatch = videoSwatchEl?.getAttribute("background");
      fill.setAttribute(
        "value",
        JSON.stringify({
          type: "webcam",
          image: { url: "data:image/png;base64,legacy" },
        }),
      );
      await new Promise(requestAnimationFrame);
      const legacy = fill.value.webcam;
      fill.remove();
      return {
        webcam,
        webcamSwatch,
        video,
        videoSwatch,
        legacy,
      };
    });

    expect(state.webcam).toMatchObject({
      snapshot: "data:image/png;base64,cam",
      deviceId: "front",
    });
    expect(state.webcamSwatch).toBe('url("data:image/png;base64,cam")');
    expect(state.video).toMatchObject({
      url: "https://example.com/a.mp4",
      poster: "data:image/jpeg;base64,vid",
    });
    expect(state.videoSwatch).toBe('url("data:image/jpeg;base64,vid")');
    expect(state.legacy.snapshot).toBe("data:image/png;base64,legacy");
  });

  test("keeps the webcam blob on fig-input-fill's swatch after remount", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
          enumerateDevices: async () => [],
        },
      });
      const fill = document.createElement("fig-input-fill") as HTMLElement & {
        value: Record<string, any>;
      };
      fill.setAttribute("mode", "webcam");
      fill.setAttribute("value", JSON.stringify({ type: "webcam" }));
      document.body.append(fill);
      await new Promise(requestAnimationFrame);
      const picker = fill.querySelector("fig-fill-picker") as HTMLElement & {
        open(): void;
      };
      picker.open();
      const dialog = document.querySelector(
        "dialog.fig-fill-picker-dialog",
      ) as HTMLElement;
      const capture = dialog.querySelector(
        ".fig-fill-picker-webcam-capture",
      ) as HTMLElement;
      const video = dialog.querySelector(
        ".fig-fill-picker-webcam-video",
      ) as HTMLVideoElement;
      await new Promise((resolve) => setTimeout(resolve, 0));
      Object.defineProperties(video, {
        readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage() {},
      })) as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.toBlob = function (callback) {
        callback(new Blob(["snapshot"], { type: "image/png" }));
      };
      capture.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;

      const afterCapture = fill
        .querySelector("fig-swatch")
        ?.getAttribute("background");
      const snapshot = fill.value.webcam?.snapshot;
      fill.setAttribute("alpha", "false");
      await new Promise(requestAnimationFrame);
      const afterRemount = fill
        .querySelector("fig-swatch")
        ?.getAttribute("background");
      fill.remove();
      return { afterCapture, afterRemount, snapshot };
    });

    expect(state.snapshot).toMatch(/^blob:/);
    expect(state.afterCapture).toBe(`url("${state.snapshot}")`);
    expect(state.afterRemount).toBe(`url("${state.snapshot}")`);
  });

  test("type select is ghost", async ({ page }) => {
    const variant = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
      };
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      const select = document.querySelector(
        "dialog.fig-fill-picker-dialog .fig-fill-picker-type",
      );
      const value = select?.getAttribute("variant") ?? "";
      picker.remove();
      return value;
    });

    expect(variant).toBe("ghost");
  });

  test("fig-content top padding is spacer-2", async ({ page }) => {
    await page.addStyleTag({ url: "/fig-editor.css" });
    const padding = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
      };
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      const content = document.querySelector(
        "dialog.fig-fill-picker-dialog > fig-content",
      );
      const probe = document.createElement("div");
      probe.style.paddingTop = "var(--spacer-2)";
      document.body.append(probe);
      const actual = content ? getComputedStyle(content).paddingTop : "";
      const expected = getComputedStyle(probe).paddingTop;
      picker.remove();
      probe.remove();
      return { actual, expected };
    });

    expect(padding.actual).toBe(padding.expected);
    expect(padding.actual).not.toBe("");
  });

  test("hides gradient interpolation and locks to srgb", async ({ page }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        value: Record<string, any>;
        open(): void;
      };
      picker.setAttribute("mode", "gradient");
      picker.value = {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 90,
          interpolationSpace: "oklab",
          stops: [
            { position: 0, color: "#FF0000", opacity: 100 },
            { position: 100, color: "#0000FF", opacity: 100 },
          ],
        },
      };
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise(requestAnimationFrame);
      picker.open();
      await new Promise(requestAnimationFrame);
      const dialog = document.querySelector("dialog.fig-fill-picker-dialog");
      const fieldCount = dialog?.querySelectorAll(
        ".fig-fill-picker-gradient-interpolation-field",
      ).length;
      const interpolationSpace = picker.value.gradient?.interpolationSpace;
      picker.remove();
      return { fieldCount, interpolationSpace };
    });

    expect(state.fieldCount).toBe(0);
    expect(state.interpolationSpace).toBe("srgb");
  });
});
