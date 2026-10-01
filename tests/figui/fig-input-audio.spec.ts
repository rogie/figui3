import { expect, test } from "@playwright/test";
import { collectPageErrors, type PageErrors } from "./helpers";

function createWavFile(name = "tone.wav") {
  const sampleRate = 8000;
  const sampleCount = 800;
  const dataLength = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = 0.15 + 0.85 * Math.abs(Math.sin(index / 95));
    const sample = Math.sin((index / sampleRate) * Math.PI * 2 * 440);
    buffer.writeInt16LE(Math.round(sample * envelope * 0x7fff), 44 + index * 2);
  }

  return { name, mimeType: "audio/wav", buffer };
}

function wavDataUrl() {
  return `data:audio/wav;base64,${createWavFile().buffer.toString("base64")}`;
}

async function mountAudio(
  page: import("@playwright/test").Page,
  attributes = "",
) {
  await page.locator("#fixture-root").evaluate((root, attrs) => {
    root.innerHTML = `<fig-input-audio id="audio" ${attrs}></fig-input-audio>`;
  }, attributes);
}

test.describe("fig-input-audio", () => {
  let errors: PageErrors;

  test.beforeEach(async ({ page }) => {
    errors = collectPageErrors(page);
    await page.goto("/tests/figui/fixture-lab.html");
    await page.waitForFunction(() => customElements.get("fig-input-audio"));
  });

  test.afterEach(() => {
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });

  test("registers with native single-audio upload semantics", async ({ page }) => {
    await mountAudio(page);
    const host = page.locator("#audio");
    const input = host.locator('input[type="file"]');

    await expect(input).toHaveAttribute("accept", "audio/*");
    await expect(input).toHaveAttribute("aria-label", "Upload audio");
    await expect(input).not.toHaveAttribute("multiple", "");
    await expect(host.getByText("Upload audio", { exact: true })).toBeVisible();
  });

  test("uploads, replaces, emits host events, and clears with minus", async ({
    page,
  }) => {
    await mountAudio(page, "full");
    await page.locator("#audio").evaluate((host) => {
      const records: Array<Record<string, unknown>> = [];
      for (const type of ["input", "change"]) {
        host.addEventListener(type, (event) => {
          const detail = (event as CustomEvent).detail;
          records.push({
            type,
            targetIsHost: event.target === host,
            names: detail.files ? [...detail.files].map((file: File) => file.name) : [],
            cleared: detail.cleared === true,
          });
        });
      }
      (host as HTMLElement & { records?: Array<Record<string, unknown>> }).records =
        records;
    });

    const nativeInput = page.locator("#audio input[type=file]");
    await nativeInput.setInputFiles(createWavFile("first.wav"));
    await expect(page.locator("#audio")).toHaveAttribute("data-waveform-state", "ready");
    await expect(page.locator("#audio")).toHaveAttribute("data-has-audio", "");
    await expect(page.locator("#audio input[type=file]")).toHaveAttribute(
      "aria-label",
      "Replace audio",
    );

    await page.locator("#audio input[type=file]").setInputFiles(createWavFile("second.wav"));
    await expect(page.locator("#audio")).toHaveAttribute("data-waveform-state", "ready");

    const remove = page.locator("#audio .fig-input-file-clear");
    await expect(remove).toHaveAttribute("aria-label", "Remove audio");
    await page.locator("#audio").hover();
    await expect(remove).toHaveCSS("opacity", "1");
    const hoverColors = await remove.evaluate((button) => {
      const probe = document.createElement("div");
      probe.style.backgroundColor = "var(--figma-color-bg-secondary)";
      document.body.append(probe);
      const colors = {
        button: getComputedStyle(button).backgroundColor,
        secondary: getComputedStyle(probe).backgroundColor,
      };
      probe.remove();
      return colors;
    });
    expect(hoverColors.button).toBe(hoverColors.secondary);
    await remove.click();

    await expect(page.locator("#audio")).not.toHaveAttribute("data-has-audio", "");
    await expect(page.locator("#audio input[type=file]")).toHaveAttribute(
      "aria-label",
      "Upload audio",
    );

    const state = await page.locator("#audio").evaluate((host) => ({
      value: (host as HTMLElement & { value: string }).value,
      files: (host as HTMLElement & { files: FileList | null }).files,
      records: (host as HTMLElement & { records?: unknown[] }).records,
    }));
    expect(state.value).toBe("");
    expect(state.files).toBeNull();
    expect(state.records).toEqual([
      { type: "input", targetIsHost: true, names: ["first.wav"], cleared: false },
      { type: "change", targetIsHost: true, names: ["first.wav"], cleared: false },
      { type: "input", targetIsHost: true, names: ["second.wav"], cleared: false },
      { type: "change", targetIsHost: true, names: ["second.wav"], cleared: false },
      { type: "input", targetIsHost: true, names: [], cleared: true },
      { type: "change", targetIsHost: true, names: [], cleared: true },
    ]);
  });

  test("decodes a URL into one responsive rounded waveform path", async ({ page }) => {
    await mountAudio(page);
    await page.locator("#audio").evaluate((host, url) => {
      host.style.width = "288px";
      host.style.setProperty("--fig-input-audio-waveform-stroke-width", "1px");
      host.setAttribute("url", url);
      host.setAttribute("filename", "tone.wav");
    }, wavDataUrl());

    await expect(page.locator("#audio")).toHaveAttribute("data-waveform-state", "ready");
    const geometry = await page.locator("#audio").evaluate((host) => {
      const surface = host.querySelector(".fig-input-audio-waveform")!;
      const svg = surface.querySelector("svg")!;
      const path = svg.querySelector("path")!;
      const style = getComputedStyle(surface);
      const pathData = path.getAttribute("d") || "";
      const firstBar = pathData.match(/^M ([\d.]+) [\d.]+ Q ([\d.]+)/);
      return {
        pathCount: svg.querySelectorAll("path").length,
        path: pathData,
        viewBox: svg.getAttribute("viewBox"),
        svgAriaHidden: svg.getAttribute("aria-hidden"),
        height: host.getBoundingClientRect().height,
        background: style.backgroundColor,
        hostBackground: getComputedStyle(host).backgroundColor,
        strokeWidth: firstBar
          ? (Number(firstBar[2]) - Number(firstBar[1])) * 2
          : null,
      };
    });

    expect(geometry.pathCount).toBe(1);
    expect(geometry.path).toMatch(/^M .+ Q .+ V .+ Q .+ Z/);
    expect(geometry.path).toContain(" Q ");
    expect(geometry.viewBox).toMatch(/^0 0 \d+ \d+$/);
    expect(geometry.svgAriaHidden).toBe("true");
    expect(geometry.height).toBe(24);
    expect(geometry.strokeWidth).toBe(1);
    expect(geometry.hostBackground).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("relayouts on resize without decoding again", async ({ page }) => {
    await page.evaluate(() => {
      let count = 0;
      const prototype = window.AudioContext.prototype;
      const decodeAudioData = prototype.decodeAudioData;
      Object.defineProperty(window, "__audioDecodeCount", {
        configurable: true,
        get: () => count,
      });
      Object.defineProperty(prototype, "decodeAudioData", {
        configurable: true,
        value(this: AudioContext, buffer: ArrayBuffer) {
          count += 1;
          return decodeAudioData.call(this, buffer);
        },
      });
    });
    await mountAudio(page);
    await page.locator("#audio").evaluate((host, url) => {
      host.style.width = "288px";
      host.setAttribute("url", url);
    }, wavDataUrl());
    await expect(page.locator("#audio")).toHaveAttribute("data-waveform-state", "ready");
    const firstPath = await page.locator("#audio path").getAttribute("d");

    await page.locator("#audio").evaluate((host) => {
      host.style.width = "160px";
    });
    await expect
      .poll(() => page.locator("#audio path").getAttribute("d"))
      .not.toBe(firstPath);

    const decodeCount = await page.evaluate(
      () => (window as typeof window & { __audioDecodeCount?: number }).__audioDecodeCount,
    );
    expect(decodeCount).toBe(1);
  });

  test("keeps upload and removal focus visible and blocks disabled actions", async ({
    page,
  }) => {
    await mountAudio(page);
    await page.locator("#audio").evaluate((host, url) => {
      host.setAttribute("url", url);
      host.setAttribute("disabled", "");
    }, wavDataUrl());
    await expect(page.locator("#audio")).toHaveAttribute("data-waveform-state", "ready");

    const input = page.locator("#audio input[type=file]");
    const remove = page.locator("#audio .fig-input-file-clear");
    await expect(input).toBeDisabled();
    await expect(remove).toHaveAttribute("disabled", "");
    await expect(page.locator("#audio")).toHaveCSS("pointer-events", "none");
    await expect(page.locator("#audio")).toHaveAttribute("data-has-audio", "");

    await page.locator("#audio").evaluate((host) => host.removeAttribute("disabled"));
    await input.focus();
    await expect(input).toBeFocused();
    await expect(page.locator("#audio .fig-input-audio-waveform")).toHaveCSS(
      "outline-style",
      "solid",
    );
    await remove.focus();
    await expect(remove).toBeFocused();
    await expect(page.locator("#audio .fig-input-audio-waveform")).toHaveCSS(
      "outline-style",
      "solid",
    );
  });

  test("ignores stale decodes after the source changes", async ({ page }) => {
    await page.evaluate(() => {
      const makeAudioBuffer = (marker: number) => {
        const values =
          marker === 1
            ? Float32Array.from([1, 1, 1, 1, 0.1, 0.1, 0.1, 0.1])
            : Float32Array.from([0.1, 1, 0.1, 1, 0.1, 1, 0.1, 1]);
        return {
          numberOfChannels: 1,
          length: values.length,
          getChannelData: () => values,
        };
      };
      Object.defineProperty(window, "fetch", {
        configurable: true,
        value: async (url: string) => ({
          ok: true,
          arrayBuffer: async () =>
            Uint8Array.from([url.includes("slow") ? 1 : 2]).buffer,
        }),
      });
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: class {
          decodeAudioData(buffer: ArrayBuffer) {
            const marker = new Uint8Array(buffer)[0];
            return new Promise((resolve) => {
              setTimeout(() => resolve(makeAudioBuffer(marker)), marker === 1 ? 120 : 5);
            });
          }
          close() {
            return Promise.resolve();
          }
        },
      });
    });

    await page.locator("#fixture-root").evaluate((root) => {
      root.innerHTML = `
        <fig-input-audio id="baseline" style="width:240px" url="fast"></fig-input-audio>
        <fig-input-audio id="audio" style="width:240px"></fig-input-audio>`;
    });
    await expect(page.locator("#baseline")).toHaveAttribute("data-waveform-state", "ready");
    await expect
      .poll(() => page.locator("#baseline path").getAttribute("d"))
      .not.toBeFalsy();
    const expectedPath = await page.locator("#baseline path").getAttribute("d");

    await page.locator("#audio").evaluate((host) => host.setAttribute("url", "slow"));
    await page.waitForTimeout(20);
    await page.locator("#audio").evaluate((host) => host.setAttribute("url", "fast"));
    await expect(page.locator("#audio")).toHaveAttribute("data-waveform-state", "ready");
    await page.waitForTimeout(140);
    expect(await page.locator("#audio path").getAttribute("d")).toBe(expectedPath);
  });

  test("quietly falls back when audio decoding fails", async ({ page }) => {
    await mountAudio(page);
    await page.locator("#audio").evaluate((host) => {
      host.setAttribute("url", "data:audio/wav;base64,bm90LWF1ZGlv");
      host.setAttribute("filename", "invalid.wav");
    });

    await expect(page.locator("#audio")).toHaveAttribute(
      "data-waveform-state",
      "unavailable",
    );
    await expect
      .poll(() => page.locator("#audio path").getAttribute("d"))
      .not.toBeFalsy();
    expect(await page.locator("#audio path").getAttribute("d")).not.toContain("NaN");
    await expect(page.locator("#audio")).toHaveAttribute("data-has-audio", "");
  });
});
