import { expect, test, type Page } from "@playwright/test";
import { componentContracts } from "../../playground/src/testing/componentManifest";
import { bootFigFixture, collectPageErrors, type PageErrors } from "./helpers";
import { runtimeBudgets } from "./perf-budgets";
import {
  assertBudget,
  expectNoPageErrors,
  logMeasurement,
  measureScenario,
  mountMarkup,
  setFixtureRootStyle,
  waitForFigReady,
} from "./perf-helpers";

const componentTags = Array.from(new Set(componentContracts.map((contract) => contract.tag)));

const mountChurnFixtures = [
  {
    name: "sliders",
    selector: "fig-slider",
    expectedCount: 12,
    markup: (repeats: number) => Array.from({ length: repeats }, (_, index) => `
      <fig-field direction="horizontal">
        <label>Opacity ${index}</label>
        <fig-slider value="${index % 100}" min="0" max="100" text="true" units="%"></fig-slider>
      </fig-field>
    `).join(""),
  },
  {
    name: "color-inputs",
    selector: "fig-input-color",
    expectedCount: 12,
    markup: (repeats: number) => Array.from({ length: repeats }, (_, index) => `
      <fig-field direction="horizontal">
        <label>Color ${index}</label>
        <fig-input-color value="${index % 2 === 0 ? "#0D99FF" : "#14AE5C"}" text="true"></fig-input-color>
      </fig-field>
    `).join(""),
  },
  {
    name: "fill-inputs",
    selector: "fig-input-fill",
    expectedCount: 12,
    markup: (repeats: number) => Array.from({ length: repeats }, (_, index) => {
      const color = index % 2 === 0 ? "#0D99FF" : "#14AE5C";
      return `
        <fig-field direction="horizontal">
          <label>Fill ${index}</label>
          <fig-input-fill value='{"type":"solid","color":"${color}"}'></fig-input-fill>
        </fig-field>
      `;
    }).join(""),
  },
  {
    name: "gradients",
    selector: "fig-input-gradient",
    expectedCount: 12,
    markup: (repeats: number) => Array.from({ length: repeats }, (_, index) => `
      <fig-input-gradient mode="tip" value='${gradientValue(index)}'></fig-input-gradient>
    `).join(""),
  },
];

const colorFillSyncFixtures = [
  {
    name: "color-value",
    markup: `<fig-input-color value="#0D99FF" text="true"></fig-input-color>`,
    tags: ["fig-input-color", "fig-input-text", "fig-input-number", "fig-swatch"],
  },
  {
    name: "fill-solid-value",
    markup: `<fig-input-fill value='{"type":"solid","color":"#0D99FF"}'></fig-input-fill>`,
    tags: ["fig-input-fill", "fig-input-text", "fig-input-number", "fig-swatch"],
  },
  {
    name: "fill-type-swap",
    markup: `<fig-input-fill value='{"type":"solid","color":"#0D99FF"}'></fig-input-fill>`,
    tags: ["fig-input-fill", "fig-input-text", "fig-input-number", "fig-swatch"],
  },
  {
    name: "fill-mode",
    markup: `<fig-input-fill mode="solid" value='{"type":"solid","color":"#0D99FF"}'></fig-input-fill>`,
    tags: ["fig-input-fill", "fig-swatch"],
  },
];

const gradientDragFixtures = [
  {
    name: "tip-drag",
    markup: `<fig-input-gradient mode="tip" value='${gradientValue(1)}' style="width: 320px"></fig-input-gradient>`,
  },
  {
    name: "handle-drag",
    markup: `<fig-input-gradient mode="true" value='${gradientValue(1)}' style="width: 320px"></fig-input-gradient>`,
  },
  {
    name: "pointerdown-up",
    markup: `<fig-input-gradient mode="tip" value='${gradientValue(1)}' style="width: 320px"></fig-input-gradient>`,
  },
  {
    name: "ghost-hover",
    markup: `<fig-input-gradient mode="tip" value='${gradientValue(1)}' style="width: 320px"></fig-input-gradient>`,
  },
];

const popupRepositionFixtures = [
  "direct-placement",
  "offset-churn",
  "content-mutation",
  "scroll-queue",
  "open-close",
];

test.describe("fig.js runtime performance", () => {
  let errors: PageErrors;

  test.beforeEach(async ({ page }) => {
    errors = collectPageErrors(page);
    await bootFigFixture(page);
    await waitForFigReady(page, componentTags);
  });

  test.afterEach(() => {
    expectNoPageErrors(errors);
  });

  test("defines the full component manifest promptly", async ({ page }) => {
    await page.evaluate((tags) => {
      window.__figPerfComponentTags = tags;
    }, componentTags);

    const measurement = await measureScenario(
      page,
      async () => {
        const tags = window.__figPerfComponentTags ?? [];
        const start = performance.now();
        await Promise.all(tags.map((tag) => customElements.whenDefined(tag)));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return performance.now() - start;
      },
      { samples: 7, warmup: 1 },
    );

    logMeasurement("runtime.definitionsReady", measurement);
    assertBudget("runtime.definitionsReady", measurement, runtimeBudgets.definitionsReady);
  });

  test("bulk upgrades a dense property panel without nonlinear churn", async ({ page }) => {
    await installRuntimeMarkup(page, buildRuntimePanelMarkup(16));

    const measurement = await measureScenario(page, async () => {
      const root = document.querySelector("#fixture-root");
      const html = window.__figPerfMarkup ?? "";
      if (!root) throw new Error("Missing #fixture-root");

      root.innerHTML = "";
      const start = performance.now();
      root.innerHTML = html;
      await Promise.all([
        customElements.whenDefined("fig-field"),
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-input-color"),
        customElements.whenDefined("fig-input-fill"),
        customElements.whenDefined("fig-input-gradient"),
      ]);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const rects = Array.from(root.querySelectorAll("fig-field, fig-slider, fig-input-color")).map(
        (element) => element.getBoundingClientRect().width,
      );
      if (rects.length < 80) throw new Error("Dense panel did not mount");
      return performance.now() - start;
    });

    logMeasurement("runtime.bulkUpgrade", measurement);
    assertBudget("runtime.bulkUpgrade", measurement, runtimeBudgets.bulkUpgrade);
  });

  test("mounts and unmounts interactive components without duplicate events", async ({ page }) => {
    await installRuntimeMarkup(page, buildRuntimePanelMarkup(8));

    const measurement = await measureScenario(page, async () => {
      const root = document.querySelector("#fixture-root");
      const html = window.__figPerfMarkup ?? "";
      if (!root) throw new Error("Missing #fixture-root");

      const start = performance.now();
      for (let index = 0; index < 12; index += 1) {
        root.innerHTML = html;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        root.innerHTML = "";
      }
      root.innerHTML = html;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return performance.now() - start;
    });

    const eventCount = await page.locator("fig-slider").first().evaluate((host) => {
      let events = 0;
      host.addEventListener("input", () => {
        events += 1;
      });
      const input = host.querySelector<HTMLInputElement>("input[type='range']");
      if (!input) throw new Error("Missing slider input");
      input.value = "64";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return events;
    });

    expect(eventCount).toBe(1);
    logMeasurement("runtime.mountUnmount", measurement);
    assertBudget("runtime.mountUnmount", measurement, runtimeBudgets.mountUnmount);
  });

  for (const fixture of mountChurnFixtures) {
    test(`mounts and unmounts ${fixture.name} controls`, async ({ page }) => {
      await installRuntimeMarkup(page, fixture.markup(12));
      await page.evaluate((metadata) => {
        window.__figPerfMountSelector = metadata.selector;
        window.__figPerfMountExpectedCount = metadata.expectedCount;
      }, {
        selector: fixture.selector,
        expectedCount: fixture.expectedCount,
      });

      const measurement = await measureScenario(page, async () => {
        const root = document.querySelector("#fixture-root");
        const html = window.__figPerfMarkup ?? "";
        const selector = window.__figPerfMountSelector ?? "";
        const expectedCount = window.__figPerfMountExpectedCount ?? 0;
        if (!root) throw new Error("Missing #fixture-root");

        const start = performance.now();
        for (let index = 0; index < 12; index += 1) {
          root.innerHTML = html;
          await new Promise((resolve) => requestAnimationFrame(resolve));
          root.innerHTML = "";
        }
        root.innerHTML = html;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const count = root.querySelectorAll(selector).length;
        if (count < expectedCount) {
          throw new Error(`Expected ${expectedCount} ${selector} controls, found ${count}`);
        }
        return performance.now() - start;
      });

      logMeasurement(`runtime.mountUnmount.${fixture.name}`, measurement);
      assertBudget(
        `runtime.mountUnmount.${fixture.name}`,
        measurement,
        runtimeBudgets.mountUnmountFamily,
      );
    });
  }

  test("repositions anchored popups under scroll and mutation pressure", async ({ page }) => {
    await mountMarkup(page, popupMarkup(), ["fig-button", "fig-popup", "fig-content"]);
    await setFixtureRootStyle(page, {
      display: "block",
      maxWidth: "none",
      minHeight: "900px",
      paddingTop: "180px",
    });

    const measurement = await measureScenario(page, async () => {
      const popup = document.querySelector("dialog[is='fig-popup']");
      const content = popup?.querySelector("fig-content");
      if (!(popup instanceof HTMLDialogElement) || !content) {
        throw new Error("Missing popup fixture");
      }

      const start = performance.now();
      popup.setAttribute("open", "true");
      for (let index = 0; index < 12; index += 1) {
        content.textContent = `Popup content ${index}`;
        window.scrollTo(0, index * 4);
        popup.setAttribute("offset", `${index % 4} ${8 + (index % 3)}`);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        popup.getBoundingClientRect();
      }
      popup.removeAttribute("open");
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return performance.now() - start;
    });

    logMeasurement("runtime.popupReposition", measurement);
    assertBudget("runtime.popupReposition", measurement, runtimeBudgets.popupReposition);
  });

  for (const scenarioName of popupRepositionFixtures) {
    test(`runs ${scenarioName} popup reposition subpath`, async ({ page }) => {
      await mountMarkup(page, popupMarkup(), ["fig-button", "fig-popup", "fig-content"]);
      await setFixtureRootStyle(page, {
        display: "block",
        maxWidth: "none",
        minHeight: "900px",
        paddingTop: "180px",
      });
      await page.evaluate((name) => {
        window.__figPerfPopupScenario = name;
      }, scenarioName);

      const measurement = await measureScenario(page, async () => {
        const scenario = window.__figPerfPopupScenario;
        const popup = document.querySelector("dialog[is='fig-popup']");
        const content = popup?.querySelector("fig-content");
        if (!(popup instanceof HTMLDialogElement) || !content) {
          throw new Error("Missing popup fixture");
        }

        popup.setAttribute("open", "true");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const start = performance.now();

        if (scenario === "direct-placement") {
          for (let index = 0; index < 120; index += 1) {
            popup.positionPopup?.();
          }
          popup.getBoundingClientRect();
        } else if (scenario === "offset-churn") {
          for (let index = 0; index < 120; index += 1) {
            popup.setAttribute("offset", `${index % 4} ${8 + (index % 3)}`);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          popup.getBoundingClientRect();
        } else if (scenario === "content-mutation") {
          for (let index = 0; index < 120; index += 1) {
            content.textContent = `Popup content ${index}`;
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          popup.getBoundingClientRect();
        } else if (scenario === "scroll-queue") {
          for (let index = 0; index < 120; index += 1) {
            window.scrollTo(0, index % 64);
            window.dispatchEvent(new Event("scroll"));
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          popup.getBoundingClientRect();
        } else if (scenario === "open-close") {
          for (let index = 0; index < 40; index += 1) {
            popup.removeAttribute("open");
            popup.setAttribute("open", "true");
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          popup.getBoundingClientRect();
        } else {
          throw new Error(`Unknown popup scenario: ${scenario}`);
        }

        popup.removeAttribute("open");
        return performance.now() - start;
      });

      logMeasurement(`runtime.popupReposition.${scenarioName}`, measurement);
      assertBudget(
        `runtime.popupReposition.${scenarioName}`,
        measurement,
        runtimeBudgets.popupRepositionPath,
      );
    });
  }

  test("keeps slider scrubbing responsive across visual variants", async ({ page }) => {
    await mountMarkup(page, sliderMarkup(), ["fig-slider", "fig-input-number"]);

    const measurement = await measureScenario(page, async () => {
      const sliders = Array.from(document.querySelectorAll("fig-slider"));
      const inputs = sliders.map((slider) => slider.querySelector<HTMLInputElement>("input[type='range']"));
      if (inputs.some((input) => !input)) throw new Error("Missing slider inputs");

      let events = 0;
      sliders.forEach((slider) => {
        slider.addEventListener("input", () => {
          events += 1;
        }, { once: true });
      });

      const start = performance.now();
      for (let step = 0; step < 24; step += 1) {
        inputs.forEach((input, index) => {
          if (!input) return;
          input.value = String((step * 7 + index * 17) % 100);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
      document.querySelector("#fixture-root")?.getBoundingClientRect();
      if (events !== sliders.length) throw new Error("Slider input listeners did not fire");
      return performance.now() - start;
    });

    logMeasurement("runtime.sliderScrub", measurement);
    assertBudget("runtime.sliderScrub", measurement, runtimeBudgets.sliderScrub);
  });

  test("drags gradient handles with color tips visible", async ({ page }) => {
    await mountMarkup(page, gradientMarkup(), ["fig-input-gradient", "fig-handle", "fig-color-tip"]);

    const measurement = await measureScenario(page, async () => {
      const host = document.querySelector("fig-input-gradient");
      const track = host?.querySelector<HTMLElement>(".fig-input-gradient-track");
      const handle = host?.querySelector<HTMLElement>("fig-handle[type='color']");
      if (!host || !track || !handle) throw new Error("Missing gradient fixture");

      const rect = track.getBoundingClientRect();
      const start = performance.now();
      handle.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: rect.left + rect.width * 0.2,
        clientY: rect.top + rect.height / 2,
        pointerId: 1,
      }));
      for (let index = 0; index < 18; index += 1) {
        window.dispatchEvent(new PointerEvent("pointermove", {
          bubbles: true,
          clientX: rect.left + rect.width * (0.2 + index * 0.03),
          clientY: rect.top + rect.height / 2,
          pointerId: 1,
        }));
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      window.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true,
        clientX: rect.left + rect.width * 0.74,
        clientY: rect.top + rect.height / 2,
        pointerId: 1,
      }));
      track.getBoundingClientRect();
      return performance.now() - start;
    });

    logMeasurement("runtime.gradientDrag", measurement);
    assertBudget("runtime.gradientDrag", measurement, runtimeBudgets.gradientDrag);
  });

  for (const fixture of gradientDragFixtures) {
    test(`runs ${fixture.name} gradient drag subpath`, async ({ page }) => {
      await mountMarkup(page, fixture.markup, ["fig-input-gradient", "fig-handle", "fig-color-tip"]);
      await page.evaluate((name) => {
        window.__figPerfGradientDragScenario = name;
      }, fixture.name);

      const measurement = await measureScenario(page, async () => {
        const scenario = window.__figPerfGradientDragScenario;
        const host = document.querySelector("fig-input-gradient");
        const track = host?.querySelector<HTMLElement>(".fig-input-gradient-track");
        const handle = host?.querySelector<HTMLElement>("fig-handle[type='color']");
        if (!host || !track || !handle) throw new Error("Missing gradient drag fixture");

        const rect = track.getBoundingClientRect();
        const start = performance.now();

        if (scenario === "ghost-hover") {
          for (let index = 0; index < 120; index += 1) {
            host.dispatchEvent(new PointerEvent("pointermove", {
              bubbles: true,
              clientX: rect.left + rect.width * ((index % 100) / 100),
              clientY: rect.top + rect.height / 2,
              pointerId: 1,
            }));
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          track.getBoundingClientRect();
          return performance.now() - start;
        }

        handle.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: rect.left + rect.width * 0.2,
          clientY: rect.top + rect.height / 2,
          pointerId: 1,
        }));

        const moves = scenario === "pointerdown-up" ? 1 : 120;
        for (let index = 0; index < moves; index += 1) {
          window.dispatchEvent(new PointerEvent("pointermove", {
            bubbles: true,
            clientX: rect.left + rect.width * (0.2 + ((index % 70) / 100)),
            clientY: rect.top + rect.height / 2,
            pointerId: 1,
          }));
        }

        window.dispatchEvent(new PointerEvent("pointerup", {
          bubbles: true,
          clientX: rect.left + rect.width * 0.74,
          clientY: rect.top + rect.height / 2,
          pointerId: 1,
        }));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        track.getBoundingClientRect();
        return performance.now() - start;
      });

      logMeasurement(`runtime.gradientDrag.${fixture.name}`, measurement);
      assertBudget(
        `runtime.gradientDrag.${fixture.name}`,
        measurement,
        runtimeBudgets.gradientDragPath,
      );
    });
  }

  test("syncs color and fill controls through public attribute paths with frame-settled reads", async ({ page }) => {
    await mountMarkup(page, colorFillMarkup(), ["fig-input-color", "fig-input-fill", "fig-swatch"]);

    const measurement = await measureScenario(page, async () => {
      const color = document.querySelector("fig-input-color");
      const fill = document.querySelector("fig-input-fill");
      if (!color || !fill) throw new Error("Missing color/fill fixture");

      const fills = [
        "{\"type\":\"solid\",\"color\":\"#0D99FF\"}",
        "{\"type\":\"solid\",\"color\":\"#14AE5C\",\"opacity\":0.62}",
        "{\"type\":\"image\",\"src\":\"data:image/gif;base64,R0lGODlhAQABAAAAACw=\"}",
        "{\"type\":\"solid\",\"color\":\"#FF00BF\"}",
      ];
      const start = performance.now();
      for (let index = 0; index < 20; index += 1) {
        color.setAttribute("value", index % 2 === 0 ? "#0D99FF" : "#FF00BF");
        fill.setAttribute("value", fills[index % fills.length]);
        fill.setAttribute("mode", index % 2 === 0 ? "solid" : "image");
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      color.getBoundingClientRect();
      fill.getBoundingClientRect();
      return performance.now() - start;
    });

    logMeasurement("runtime.colorFillSync", measurement);
    assertBudget("runtime.colorFillSync", measurement, runtimeBudgets.colorFillSync);
  });

  for (const fixture of colorFillSyncFixtures) {
    test(`syncs ${fixture.name} public attribute path`, async ({ page }) => {
      await mountMarkup(page, fixture.markup, fixture.tags);
      await page.evaluate((name) => {
        window.__figPerfColorFillScenario = name;
      }, fixture.name);

      const measurement = await measureScenario(page, async () => {
        const scenario = window.__figPerfColorFillScenario;
        const start = performance.now();

        if (scenario === "color-value") {
          const color = document.querySelector("fig-input-color");
          if (!color) throw new Error("Missing color fixture");
          for (let index = 0; index < 120; index += 1) {
            color.setAttribute("value", index % 2 === 0 ? "#0D99FF" : "#FF00BF");
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          color.getBoundingClientRect();
        } else if (scenario === "fill-solid-value") {
          const fill = document.querySelector("fig-input-fill");
          if (!fill) throw new Error("Missing fill fixture");
          const fills = [
            "{\"type\":\"solid\",\"color\":\"#0D99FF\",\"opacity\":100}",
            "{\"type\":\"solid\",\"color\":\"#14AE5C\",\"opacity\":62}",
            "{\"type\":\"solid\",\"color\":\"#FF00BF\",\"opacity\":88}",
          ];
          for (let index = 0; index < 120; index += 1) {
            fill.setAttribute("value", fills[index % fills.length]);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          fill.getBoundingClientRect();
        } else if (scenario === "fill-type-swap") {
          const fill = document.querySelector("fig-input-fill");
          if (!fill) throw new Error("Missing fill fixture");
          const fills = [
            "{\"type\":\"solid\",\"color\":\"#0D99FF\",\"opacity\":100}",
            "{\"type\":\"image\",\"image\":{\"url\":\"data:image/gif;base64,R0lGODlhAQABAAAAACw=\",\"opacity\":0.82}}",
            "{\"type\":\"solid\",\"color\":\"#FF00BF\",\"opacity\":88}",
          ];
          for (let index = 0; index < 60; index += 1) {
            fill.setAttribute("value", fills[index % fills.length]);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          fill.getBoundingClientRect();
        } else if (scenario === "fill-mode") {
          const fill = document.querySelector("fig-input-fill");
          if (!fill) throw new Error("Missing fill fixture");
          const modes = ["solid", "solid,image", "solid,gradient,image"];
          for (let index = 0; index < 120; index += 1) {
            fill.setAttribute("mode", modes[index % modes.length]);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          fill.getBoundingClientRect();
        } else {
          throw new Error(`Unknown color/fill scenario: ${scenario}`);
        }

        return performance.now() - start;
      });

      logMeasurement(`runtime.colorFillSync.${fixture.name}`, measurement);
      assertBudget(
        `runtime.colorFillSync.${fixture.name}`,
        measurement,
        runtimeBudgets.colorFillSyncPath,
      );
    });
  }
});

async function installRuntimeMarkup(page: Page, markup: string) {
  await page.evaluate((html) => {
    window.__figPerfMarkup = html;
  }, markup);
}

function buildRuntimePanelMarkup(repeats: number) {
  return Array.from({ length: repeats }, (_, index) => {
    const color = index % 2 === 0 ? "#0D99FF" : "#14AE5C";
    return `
      <fig-field direction="horizontal">
        <label>Opacity ${index}</label>
        <fig-slider value="${index % 100}" min="0" max="100" text="true" units="%"></fig-slider>
      </fig-field>
      <fig-field direction="horizontal">
        <label>Color ${index}</label>
        <fig-input-color value="${color}" text="true"></fig-input-color>
      </fig-field>
      <fig-field direction="horizontal">
        <label>Fill ${index}</label>
        <fig-input-fill value='{"type":"solid","color":"${color}"}'></fig-input-fill>
      </fig-field>
      <fig-input-gradient mode="tip" value='${gradientValue(index)}'></fig-input-gradient>
    `;
  }).join("");
}

function popupMarkup() {
  return `
    <fig-button id="popup-anchor" style="margin-left: 120px">Anchor</fig-button>
    <dialog is="fig-popup" anchor="#popup-anchor" position="bottom left" offset="8 8" variant="popover">
      <fig-content>Popup content</fig-content>
    </dialog>
  `;
}

function sliderMarkup() {
  return `
    <fig-slider value="25" min="0" max="100" text="true"></fig-slider>
    <fig-slider type="hue" value="128" text="false"></fig-slider>
    <fig-slider type="opacity" value="70" color="#0D99FF" text="true"></fig-slider>
    <fig-slider type="delta" value="0" min="-100" max="100" text="true"></fig-slider>
  `;
}

function gradientMarkup() {
  return `
    <fig-input-gradient mode="tip" value='${gradientValue(1)}' style="width: 320px"></fig-input-gradient>
  `;
}

function colorFillMarkup() {
  return `
    <fig-input-color value="#0D99FF" text="true"></fig-input-color>
    <fig-input-fill value='{"type":"solid","color":"#0D99FF"}'></fig-input-fill>
  `;
}

function gradientValue(seed: number) {
  return JSON.stringify({
    type: "gradient",
    gradient: {
      type: "linear",
      angle: 90,
      stops: [
        { position: 0, color: "#0D99FF", opacity: 100 },
        { position: 20 + (seed % 6), color: "#14AE5C", opacity: 90 },
        { position: 45 + (seed % 8), color: "#FFCD29", opacity: 80 },
        { position: 70 + (seed % 5), color: "#FF00BF", opacity: 92 },
        { position: 100, color: "#9747FF", opacity: 100 },
      ],
    },
  });
}

declare global {
  interface Window {
    __figPerfComponentTags?: string[];
    __figPerfMarkup?: string;
    __figPerfMountExpectedCount?: number;
    __figPerfMountSelector?: string;
    __figPerfColorFillScenario?: string;
    __figPerfGradientDragScenario?: string;
    __figPerfPopupScenario?: string;
  }
}
