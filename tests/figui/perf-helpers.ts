import { expect, type Page } from "@playwright/test";
import type { PageErrors } from "./helpers";

export interface PerfBudget {
  median: number;
  max?: number;
  longTasks?: number;
  note: string;
}

export interface LongTaskSummary {
  count: number;
  total: number;
  max: number;
}

export interface Measurement {
  samples: number[];
  median: number;
  min: number;
  max: number;
  longTasks: LongTaskSummary;
}

export interface MeasureOptions {
  samples?: number;
  warmup?: number;
}

type BrowserScenario = () => number | Promise<number>;

const DEFAULT_SAMPLES = 5;
const DEFAULT_WARMUP = 1;

export async function waitForFigReady(page: Page, tags: string[] = []) {
  await page.evaluate(async (componentTags) => {
    await Promise.all(componentTags.map((tag) => customElements.whenDefined(tag)));
    if ("fonts" in document) await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }, Array.from(new Set(tags)));
}

export async function mountMarkup(page: Page, markup: string, tags: string[] = []) {
  await page.evaluate((html) => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    root.innerHTML = html;
  }, markup);
  await waitForFigReady(page, tags);
}

export async function setFixtureRootStyle(page: Page, styles: Partial<CSSStyleDeclaration>) {
  await page.evaluate((nextStyles) => {
    const root = document.querySelector<HTMLElement>("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    Object.assign(root.style, nextStyles);
  }, styles);
}

export async function measureScenario(
  page: Page,
  scenario: BrowserScenario,
  options: MeasureOptions = {},
): Promise<Measurement> {
  const samples = options.samples ?? DEFAULT_SAMPLES;
  const warmup = options.warmup ?? DEFAULT_WARMUP;

  return page.evaluate(
    async ({ scenarioSource, samples, warmup }) => {
      const win = window as Window & {
        __figPerfLongTasks?: PerformanceEntry[];
      };
      const run = new Function(`return (${scenarioSource})`)() as BrowserScenario;
      const timings: number[] = [];

      win.__figPerfLongTasks = [];
      let observer: PerformanceObserver | undefined;
      if (PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
        observer = new PerformanceObserver((list) => {
          win.__figPerfLongTasks?.push(...list.getEntries());
        });
        observer.observe({ type: "longtask", buffered: true });
      }

      for (let index = 0; index < warmup; index += 1) {
        await run();
      }

      for (let index = 0; index < samples; index += 1) {
        timings.push(await run());
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }

      observer?.disconnect();

      const sorted = [...timings].sort((a, b) => a - b);
      const longTasks = win.__figPerfLongTasks ?? [];
      const totalLongTaskTime = longTasks.reduce((total, entry) => total + entry.duration, 0);
      const maxLongTaskTime = longTasks.reduce((max, entry) => Math.max(max, entry.duration), 0);

      return {
        samples: timings,
        median: sorted[Math.floor(sorted.length / 2)] ?? 0,
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        longTasks: {
          count: longTasks.length,
          total: totalLongTaskTime,
          max: maxLongTaskTime,
        },
      };
    },
    {
      scenarioSource: scenario.toString(),
      samples,
      warmup,
    },
  );
}

export function assertBudget(name: string, measurement: Measurement, budget: PerfBudget) {
  expect(
    measurement.median,
    `${name} median ${formatMs(measurement.median)} exceeded ${formatMs(budget.median)}: ${budget.note}`,
  ).toBeLessThanOrEqual(budget.median);

  if (budget.max !== undefined) {
    expect(
      measurement.max,
      `${name} max ${formatMs(measurement.max)} exceeded ${formatMs(budget.max)}: ${budget.note}`,
    ).toBeLessThanOrEqual(budget.max);
  }

  if (budget.longTasks !== undefined) {
    expect(
      measurement.longTasks.count,
      `${name} long tasks exceeded ${budget.longTasks}: ${budget.note}`,
    ).toBeLessThanOrEqual(budget.longTasks);
  }
}

export function expectNoPageErrors(errors: PageErrors) {
  expect(errors.pageErrors, "page errors").toEqual([]);
  expect(errors.consoleErrors, "console errors").toEqual([]);
}

export function logMeasurement(name: string, measurement: Measurement) {
  console.info(
    `[perf] ${name}: median=${formatMs(measurement.median)} max=${formatMs(measurement.max)} samples=${measurement.samples
      .map(formatMs)
      .join(",")} longTasks=${measurement.longTasks.count}`,
  );
}

function formatMs(value: number) {
  return `${value.toFixed(2)}ms`;
}
