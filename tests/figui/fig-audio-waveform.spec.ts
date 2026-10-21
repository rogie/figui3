import { expect, test } from "@playwright/test";
import { collectPageErrors, type PageErrors } from "./helpers";

function createWavBuffer() {
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

  return buffer;
}

function wavDataUrl() {
  return `data:audio/wav;base64,${createWavBuffer().toString("base64")}`;
}

async function mountWaveform(
  page: import("@playwright/test").Page,
  attributes = "",
) {
  await page.locator("#fixture-root").evaluate((root, attrs) => {
    root.innerHTML = `<fig-audio-waveform id="waveform" ${attrs}></fig-audio-waveform>`;
  }, attributes);
}

test.describe("fig-audio-waveform", () => {
  let errors: PageErrors;

  test.beforeEach(async ({ page }) => {
    errors = collectPageErrors(page);
    await page.goto("/tests/figui/fixture.html");
    await page.waitForFunction(() => customElements.get("fig-audio-waveform"));
  });

  test.afterEach(() => {
    expect(errors.pageErrors).toEqual([]);
    expect(errors.consoleErrors).toEqual([]);
  });

  test("renders only a waveform surface", async ({ page }) => {
    await mountWaveform(page);
    const host = page.locator("#waveform");

    await expect(host.locator(":scope > .fig-audio-waveform-surface")).toHaveCount(1);
    await expect(host.locator("svg")).toHaveCount(1);
    await expect(host.locator("path")).toHaveCount(2);
    await expect(host.locator("fig-button, input, audio, label")).toHaveCount(0);
    await expect(host).toHaveCSS("height", "24px");
  });

  test("decodes its URL into responsive rounded waveform paths", async ({
    page,
  }) => {
    await mountWaveform(page);
    await page.locator("#waveform").evaluate((host, url) => {
      host.style.width = "288px";
      host.style.setProperty("--fig-audio-waveform-stroke-width", "1px");
      host.setAttribute("url", url);
    }, wavDataUrl());

    await expect(page.locator("#waveform")).toHaveAttribute(
      "data-waveform-state",
      "ready",
    );
    const geometry = await page.locator("#waveform").evaluate((host) => {
      const svg = host.querySelector("svg")!;
      const path = svg.querySelector(".fig-audio-waveform-path")!;
      const pathData = path.getAttribute("d") || "";
      const firstBar = pathData.match(/^M ([\d.]+) [\d.]+ Q ([\d.]+)/);
      return {
        childCount: host.children.length,
        pathCount: svg.querySelectorAll("path").length,
        barCount: (pathData.match(/(?:^| )M /g) || []).length,
        path: pathData,
        viewBox: svg.getAttribute("viewBox"),
        svgAriaHidden: svg.getAttribute("aria-hidden"),
        strokeWidth: firstBar
          ? (Number(firstBar[2]) - Number(firstBar[1])) * 2
          : null,
      };
    });

    expect(geometry.childCount).toBe(1);
    expect(geometry.pathCount).toBe(2);
    expect(geometry.barCount).toBeGreaterThanOrEqual(80);
    expect(geometry.path).toMatch(/^M .+ Q .+ V .+ Q .+ Z/);
    expect(geometry.viewBox).toMatch(/^0 0 \d+ \d+$/);
    expect(geometry.svgAriaHidden).toBe("true");
    expect(geometry.strokeWidth).toBe(1);

    await page.locator("#waveform").evaluate((host) => {
      host.setAttribute("polarization", "1");
    });
    await expect
      .poll(() =>
        page
          .locator("#waveform .fig-audio-waveform-path")
          .getAttribute("d"),
      )
      .not.toBe(geometry.path);

    const firstPath = await page
      .locator("#waveform .fig-audio-waveform-path")
      .getAttribute("d");
    await page.locator("#waveform").evaluate((host) => {
      host.style.width = "160px";
    });
    await expect
      .poll(() =>
        page
          .locator("#waveform .fig-audio-waveform-path")
          .getAttribute("d"),
      )
      .not.toBe(firstPath);
  });

  test("uses RMS energy so isolated peaks do not flatten the waveform", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const binCount = 256;
      const samplesPerBin = 8;
      const samples = new Float32Array(binCount * samplesPerBin);
      for (let bin = 0; bin < binCount; bin += 1) {
        const backgroundLevel = bin / (binCount - 1);
        const start = bin * samplesPerBin;
        samples[start] = 1;
        for (let offset = 1; offset < samplesPerBin; offset += 1) {
          samples[start + offset] = backgroundLevel;
        }
      }
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
          decodeAudioData() {
            return Promise.resolve({
              numberOfChannels: 1,
              length: samples.length,
              getChannelData: () => samples,
            });
          }
          close() {
            return Promise.resolve();
          }
        },
      });
    });

    await mountWaveform(page, 'url="rms-test" style="width:240px"');
    await expect(page.locator("#waveform")).toHaveAttribute(
      "data-waveform-state",
      "ready",
    );
    const uniqueBarTops = await page.locator("#waveform").evaluate((host) => {
      const path =
        host.querySelector(".fig-audio-waveform-path")?.getAttribute("d") || "";
      return new Set(
        [...path.matchAll(/(?:^| )M [\d.]+ ([\d.]+)/g)].map((match) =>
          Number(match[1]).toFixed(2),
        ),
      ).size;
    });
    expect(uniqueBarTops).toBeGreaterThan(5);
  });

  test("colors a clamped progress fraction with the selected icon color", async ({
    page,
  }) => {
    await mountWaveform(page);
    await page.locator("#waveform").evaluate((host, url) => {
      host.style.width = "240px";
      host.setAttribute("url", url);
      host.setAttribute("progress", "0.25");
    }, wavDataUrl());
    await expect(page.locator("#waveform")).toHaveAttribute(
      "data-waveform-state",
      "ready",
    );

    const initial = await page.locator("#waveform").evaluate((host) => {
      const svg = host.querySelector("svg")!;
      const base = svg.querySelector(".fig-audio-waveform-path")!;
      const progress = svg.querySelector(".fig-audio-waveform-progress")!;
      const clipRect = svg.querySelector("clipPath rect")!;
      const probe = document.createElement("div");
      probe.style.color = "var(--figma-color-icon-selected-secondary)";
      document.body.append(probe);
      const result = {
        width: Number(svg.getAttribute("viewBox")?.split(" ")[2]),
        clipWidth: Number(clipRect.getAttribute("width")),
        samePath: base.getAttribute("d") === progress.getAttribute("d"),
        clipPath: progress.getAttribute("clip-path"),
        progressFill: getComputedStyle(progress).fill,
        brandColor: getComputedStyle(probe).color,
      };
      probe.remove();
      return result;
    });

    expect(initial.clipWidth).toBeCloseTo(initial.width * 0.25, 5);
    expect(initial.samePath).toBe(true);
    expect(initial.clipPath).toMatch(/fig-audio-waveform-progress-\d+/);
    expect(initial.progressFill).toBe(initial.brandColor);

    await page.locator("#waveform").evaluate((host) => {
      const statefulHost = host as HTMLElement & { pathMutations?: number };
      statefulHost.pathMutations = 0;
      const observer = new MutationObserver((records) => {
        statefulHost.pathMutations =
          (statefulHost.pathMutations || 0) +
          records.filter((record) => record.attributeName === "d").length;
      });
      for (const path of host.querySelectorAll("path")) {
        observer.observe(path, { attributes: true, attributeFilter: ["d"] });
      }
    });

    const assertProgress = async (value: string, expected: number) => {
      await page
        .locator("#waveform")
        .evaluate((host, nextValue) => host.setAttribute("progress", nextValue), value);
      await expect
        .poll(() =>
          page
            .locator("#waveform clipPath rect")
            .getAttribute("width")
            .then(Number),
        )
        .toBeCloseTo(initial.width * expected, 5);
    };

    await assertProgress("0", 0);
    await assertProgress("1", 1);
    await assertProgress("-2", 0);
    await assertProgress("3", 1);
    await assertProgress("invalid", 0);
    expect(
      await page
        .locator("#waveform")
        .evaluate(
          (host) =>
            (host as HTMLElement & { pathMutations?: number }).pathMutations,
        ),
    ).toBe(0);
  });

  test("clears when the URL is removed", async ({ page }) => {
    await mountWaveform(page);
    await page.locator("#waveform").evaluate((host, url) => {
      host.setAttribute("url", url);
    }, wavDataUrl());
    await expect(page.locator("#waveform")).toHaveAttribute(
      "data-waveform-state",
      "ready",
    );

    await page.locator("#waveform").evaluate((host) => host.removeAttribute("url"));
    await expect(page.locator("#waveform")).not.toHaveAttribute(
      "data-waveform-state",
      /.+/,
    );
    await expect(
      page.locator("#waveform .fig-audio-waveform-path"),
    ).toHaveAttribute("d", "");
  });

  test("ignores stale decodes after the URL changes", async ({ page }) => {
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
        <fig-audio-waveform id="baseline" style="width:240px" url="fast"></fig-audio-waveform>
        <fig-audio-waveform id="waveform" style="width:240px"></fig-audio-waveform>`;
    });
    await expect(page.locator("#baseline")).toHaveAttribute(
      "data-waveform-state",
      "ready",
    );
    await expect
      .poll(() =>
        page
          .locator("#baseline .fig-audio-waveform-path")
          .getAttribute("d"),
      )
      .not.toBeFalsy();
    const expectedPath = await page
      .locator("#baseline .fig-audio-waveform-path")
      .getAttribute("d");

    await page.locator("#waveform").evaluate((host) => host.setAttribute("url", "slow"));
    await page.waitForTimeout(20);
    await page.locator("#waveform").evaluate((host) => host.setAttribute("url", "fast"));
    await expect(page.locator("#waveform")).toHaveAttribute(
      "data-waveform-state",
      "ready",
    );
    await page.waitForTimeout(140);
    expect(
      await page
        .locator("#waveform .fig-audio-waveform-path")
        .getAttribute("d"),
    ).toBe(expectedPath);
  });

  test("quietly renders a flat fallback when decoding fails", async ({ page }) => {
    await mountWaveform(
      page,
      'url="data:audio/wav;base64,bm90LWF1ZGlv"',
    );

    await expect(page.locator("#waveform")).toHaveAttribute(
      "data-waveform-state",
      "unavailable",
    );
    await expect
      .poll(() =>
        page
          .locator("#waveform .fig-audio-waveform-path")
          .getAttribute("d"),
      )
      .not.toBeFalsy();
    expect(
      await page
        .locator("#waveform .fig-audio-waveform-path")
        .getAttribute("d"),
    ).not.toContain("NaN");
  });
});
