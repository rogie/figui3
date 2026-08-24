import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-fill-picker open should not emit input", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.evaluate(() => customElements.whenDefined("fig-fill-picker"));
  });

  test("opening a video fill does not emit input from preview load", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-fill");

      const fill = document.createElement("fig-input-fill") as HTMLElement & {
        value: Record<string, unknown>;
      };
      fill.setAttribute("picker-mode", "video");
      fill.setAttribute(
        "default-video",
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      );
      fill.setAttribute(
        "value",
        JSON.stringify({
          type: "video",
          video: {
            url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            poster: "https://picsum.photos/id/106/64/36.webp",
            scaleMode: "fill",
            scale: 50,
          },
        }),
      );
      document.body.append(fill);
      await customElements.whenDefined("fig-fill-picker");
      await new Promise((r) => requestAnimationFrame(r));

      const picker = fill.querySelector("fig-fill-picker") as HTMLElement & {
        open(): void;
      };
      const events: Array<{
        host: string;
        type: string;
        target: string;
        detailType?: string;
      }> = [];

      const record = (host: string) => (event: Event) => {
        const detail = (event as CustomEvent).detail;
        events.push({
          host,
          type: event.type,
          target: (event.target as HTMLElement)?.tagName ?? "",
          detailType:
            detail && typeof detail === "object" ? detail.type : typeof detail,
        });
      };

      fill.addEventListener("input", record("fill"));
      fill.addEventListener("change", record("fill"));
      picker.addEventListener("input", record("picker"));

      picker.open();

      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      await new Promise((r) => setTimeout(r, 800));

      const preview = document.querySelector(".fig-fill-picker-video-preview");
      const result = {
        events,
        previewSrc: preview?.getAttribute("src") ?? "",
        dialogOpen: Boolean(
          document.querySelector("dialog.fig-fill-picker-dialog[open]"),
        ),
      };
      fill.remove();
      return result;
    });

    expect(state.dialogOpen).toBe(true);
    expect(state.previewSrc).toContain("flower.mp4");
    expect(state.events).toEqual([]);
  });

  test("opening applies default-video without emitting if already that url", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
        value: Record<string, any>;
      };
      picker.setAttribute("mode", "video");
      picker.setAttribute("default-video", "https://example.com/sample.mp4");
      picker.setAttribute(
        "value",
        JSON.stringify({
          type: "video",
          video: { url: "https://example.com/sample.mp4", scaleMode: "fill" },
        }),
      );
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise((r) => requestAnimationFrame(r));

      const events: string[] = [];
      picker.addEventListener("input", () => events.push("input"));
      picker.open();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const url = picker.value.video?.url;
      picker.remove();
      return { events, url };
    });

    expect(state.url).toBe("https://example.com/sample.mp4");
    expect(state.events).toEqual([]);
  });

  test("opening solid, gradient, image, and custom fills does not emit", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      await customElements.whenDefined("fig-input-fill");

      async function openAndListen(
        value: Record<string, unknown>,
        extra?: (fill: HTMLElement) => void,
      ) {
        const fill = document.createElement("fig-input-fill") as HTMLElement & {
          value: Record<string, unknown>;
        };
        extra?.(fill);
        fill.setAttribute("value", JSON.stringify(value));
        document.body.append(fill);
        await customElements.whenDefined("fig-fill-picker");
        await new Promise((r) => requestAnimationFrame(r));
        const picker = fill.querySelector("fig-fill-picker") as HTMLElement & {
          open(): void;
        };
        const events: Array<{ type: string; target: string }> = [];
        const record = (event: Event) => {
          events.push({
            type: event.type,
            target: (event.target as HTMLElement)?.tagName ?? "",
          });
        };
        fill.addEventListener("input", record);
        fill.addEventListener("change", record);
        picker.addEventListener("input", record);
        picker.open();
        for (let i = 0; i < 20; i += 1) {
          await new Promise((r) => requestAnimationFrame(r));
        }
        await new Promise((r) => setTimeout(r, 200));
        const dialogOpen = Boolean(
          document.querySelector("dialog.fig-fill-picker-dialog[open]"),
        );
        fill.remove();
        return { events, dialogOpen, type: value.type };
      }

      const solid = await openAndListen({
        type: "solid",
        color: "#0D99FF",
        alpha: 0.85,
      });
      const gradient = await openAndListen({
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 135,
          stops: [
            { position: 0, color: "#00F5A0", opacity: 100 },
            { position: 100, color: "#4B00E0", opacity: 100 },
          ],
        },
      });
      const image = await openAndListen({
        type: "image",
        image: {
          url: "https://picsum.photos/id/10/64/64.webp",
          scaleMode: "fill",
          scale: 50,
        },
      });
      const custom = await openAndListen(
        { type: "shader", source: "void main() {}" },
        (fill) => {
          fill.setAttribute("mode", "solid,shader");
          const slot = document.createElement("div");
          slot.setAttribute("slot", "mode-shader");
          slot.setAttribute("label", "Shader");
          slot.innerHTML = `<fig-input-text value="void main() {}"></fig-input-text>`;
          fill.append(slot);
        },
      );

      return { solid, gradient, image, custom };
    });

    for (const [name, result] of Object.entries(state)) {
      expect(result.dialogOpen, name).toBe(true);
      expect(result.events, name).toEqual([]);
    }
  });

  test("opening a webcam fill does not emit input when the preview starts", async ({
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
      await customElements.whenDefined("fig-input-fill");
      const fill = document.createElement("fig-input-fill") as HTMLElement & {
        value: Record<string, any>;
      };
      fill.setAttribute("mode", "webcam");
      fill.setAttribute("value", JSON.stringify({ type: "webcam" }));
      document.body.append(fill);
      await new Promise((r) => requestAnimationFrame(r));
      const picker = fill.querySelector("fig-fill-picker") as HTMLElement & {
        open(): void;
      };
      const events: string[] = [];
      fill.addEventListener("input", () => events.push("fill-input"));
      picker.addEventListener("input", () => events.push("picker-input"));

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
      await new Promise((r) => setTimeout(r, 0));
      Object.defineProperties(video, {
        readyState: {
          configurable: true,
          value: HTMLMediaElement.HAVE_CURRENT_DATA,
        },
        videoWidth: { configurable: true, value: 320 },
        videoHeight: { configurable: true, value: 240 },
      });
      video.dispatchEvent(new Event("canplay"));
      await new Promise((r) => setTimeout(r, 0));
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toBlob = originalToBlob;

      const background =
        fill.querySelector("fig-swatch")?.getAttribute("background") ?? "";
      fill.remove();
      return { events, background };
    });

    expect(state.background).toMatch(/^url\("blob:/);
    expect(state.events).toEqual([]);
  });

  test("opening empty video with default-video does not emit input", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const picker = document.createElement("fig-fill-picker") as HTMLElement & {
        open(): void;
        value: Record<string, any>;
      };
      picker.setAttribute("mode", "video");
      picker.setAttribute("default-video", "https://example.com/sample.mp4");
      picker.append(document.createElement("fig-swatch"));
      document.body.append(picker);
      await new Promise((r) => requestAnimationFrame(r));

      const events: string[] = [];
      picker.addEventListener("input", () => events.push("input"));
      picker.open();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const url = picker.value.video?.url;
      picker.remove();
      return { events, url };
    });

    expect(state.url).toBe("https://example.com/sample.mp4");
    expect(state.events).toEqual([]);
  });
});
