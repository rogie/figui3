import { test, type Page } from "@playwright/test";
import { bootFigFixture, collectPageErrors, type PageErrors } from "./helpers";
import { renderBudgets } from "./perf-budgets";
import {
  assertBudget,
  expectNoPageErrors,
  logMeasurement,
  measureScenario,
  mountMarkup,
  setFixtureRootStyle,
  waitForFigReady,
} from "./perf-helpers";

const renderTags = [
  "fig-button",
  "fig-dialog",
  "fig-field",
  "fig-input-color",
  "fig-input-fill",
  "fig-input-text",
  "fig-media",
  "fig-popup",
  "fig-preview",
  "fig-shimmer",
  "fig-skeleton",
  "fig-slider",
];

const sliderVariantFixtures = [
  {
    name: "range",
    markup: `<fig-slider value="25" min="0" max="100" text="true"></fig-slider>`,
  },
  {
    name: "hue",
    markup: `<fig-slider type="hue" value="128" text="false"></fig-slider>`,
  },
  {
    name: "opacity",
    markup: `<fig-slider type="opacity" value="75" color="#0D99FF" text="true"></fig-slider>`,
  },
  {
    name: "delta",
    markup: `<fig-slider type="delta" value="0" min="-100" max="100" text="true"></fig-slider>`,
  },
  {
    name: "stepper",
    markup: `<fig-slider type="stepper" value="25" min="0" max="100" step="25" text="true"></fig-slider>`,
  },
];

const transparentGif = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

const hasSelectorFixtures = [
  {
    name: "resizable-input",
    markup: `<fig-input-text id="has-resizable" multiline resizable value="Resizable text"></fig-input-text>`,
    tags: ["fig-input-text"],
  },
  {
    name: "field-child-open",
    markup: `
      <fig-field id="has-open-field">
        <fig-icon class="fig-field-chevron" name="chevron"></fig-icon>
        <label>Advanced</label>
        <fig-group id="has-open-child" name="Advanced"><fig-input-text value="Value"></fig-input-text></fig-group>
      </fig-field>
    `,
    tags: ["fig-field", "fig-group", "fig-icon", "fig-input-text"],
  },
  {
    name: "labelless-field",
    markup: `
      <fig-field id="has-labelless">
        <fig-input-text value="X"></fig-input-text>
        <fig-input-text value="Y"></fig-input-text>
      </fig-field>
    `,
    tags: ["fig-field", "fig-input-text"],
  },
  {
    name: "media-generated-src",
    markup: `
      <fig-media id="has-media" type="image" fit="cover" size="auto">
        <fig-preview>
          <img class="fig-media-element" data-generated alt="" src="${transparentGif}">
          <fig-input-file data-generated label="Upload"></fig-input-file>
        </fig-preview>
      </fig-media>
    `,
    tags: ["fig-media", "fig-preview", "fig-input-file"],
  },
  {
    name: "shimmer-descendants",
    markup: `
      <fig-shimmer id="has-shimmer">
        <fig-field><label>Loading</label><fig-input-text value="Value"></fig-input-text></fig-field>
        <fig-field><label>Loading</label><fig-input-text value="Value"></fig-input-text></fig-field>
        <fig-field><label>Loading</label><fig-input-text value="Value"></fig-input-text></fig-field>
      </fig-shimmer>
    `,
    tags: ["fig-shimmer", "fig-field", "fig-input-text"],
  },
];

const overlayPathFixtures = [
  "dialog-open-close",
  "popup-open-close",
  "tooltip-open-close",
  "mixed-open-close",
];

test.describe("fig.css render performance", () => {
  let errors: PageErrors;

  test.beforeEach(async ({ page }) => {
    errors = collectPageErrors(page);
    await bootFigFixture(page);
    await waitForFigReady(page, renderTags);
  });

  test.afterEach(() => {
    expectNoPageErrors(errors);
  });

  test("lays out dense property panels within a bounded frame budget", async ({ page }) => {
    await installRenderMarkup(page, densePanelMarkup(64));
    await setFixtureRootStyle(page, { display: "grid", gap: "8px", maxWidth: "520px" });

    const measurement = await measureScenario(page, async () => {
      const root = document.querySelector<HTMLElement>("#fixture-root");
      const html = window.__figPerfRenderMarkup ?? "";
      if (!root) throw new Error("Missing #fixture-root");

      root.innerHTML = "";
      const start = performance.now();
      root.innerHTML = html;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const widths = Array.from(root.querySelectorAll("fig-field, fig-slider, fig-input-text")).map(
        (element) => element.getBoundingClientRect().width,
      );
      if (widths.length < 128) throw new Error("Dense panel did not produce enough nodes");
      return performance.now() - start;
    });

    logMeasurement("render.densePanelLayout", measurement);
    assertBudget("render.densePanelLayout", measurement, renderBudgets.densePanelLayout);
  });

  test("toggles shimmer and skeleton loading states over dense rows", async ({ page }) => {
    await mountMarkup(page, shimmerMarkup(48), ["fig-shimmer", "fig-skeleton", "fig-field", "fig-input-text"]);

    const measurement = await measureScenario(page, async () => {
      const shimmer = document.querySelector("fig-shimmer");
      const skeleton = document.querySelector("fig-skeleton");
      if (!shimmer || !skeleton) throw new Error("Missing shimmer fixture");

      const start = performance.now();
      for (let index = 0; index < 12; index += 1) {
        const playing = index % 2 === 0 ? "true" : "false";
        shimmer.setAttribute("playing", playing);
        skeleton.setAttribute("playing", playing);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        getComputedStyle(shimmer).animationDuration;
        skeleton.getBoundingClientRect();
      }
      return performance.now() - start;
    });

    logMeasurement("render.shimmerToggle", measurement);
    assertBudget("render.shimmerToggle", measurement, renderBudgets.shimmerToggle);
  });

  test("updates slider paint paths across variants with frame-settled reads", async ({ page }) => {
    await mountMarkup(page, sliderPaintMarkup(), ["fig-slider", "fig-input-number"]);

    const measurement = await measureScenario(page, async () => {
      const sliders = Array.from(document.querySelectorAll("fig-slider"));
      const inputs = sliders.map((slider) => slider.querySelector<HTMLInputElement>("input[type='range']"));
      if (inputs.some((input) => !input)) throw new Error("Missing slider inputs");

      const start = performance.now();
      for (let step = 0; step < 30; step += 1) {
        inputs.forEach((input, index) => {
          if (!input) return;
          input.value = String((step * 5 + index * 21) % 100);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await new Promise((resolve) => requestAnimationFrame(resolve));
        sliders.forEach((slider) => {
          getComputedStyle(slider).getPropertyValue("--slider-percent");
          slider.getBoundingClientRect();
        });
      }
      return performance.now() - start;
    });

    logMeasurement("render.sliderPaint", measurement);
    assertBudget("render.sliderPaint", measurement, renderBudgets.sliderPaint);
  });

  for (const variant of sliderVariantFixtures) {
    test(`updates ${variant.name} slider style synchronously`, async ({ page }) => {
      await mountMarkup(page, variant.markup, ["fig-slider", "fig-input-number"]);

      const measurement = await measureScenario(page, async () => {
        const slider = document.querySelector("fig-slider");
        const input = slider?.querySelector<HTMLInputElement>("input[type='range']");
        if (!slider || !input) throw new Error("Missing slider fixture");

        const start = performance.now();
        for (let step = 0; step < 120; step += 1) {
          input.value = String((step * 7) % 100);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
        getComputedStyle(slider).getPropertyValue("--slider-percent");
        slider.getBoundingClientRect();
        return performance.now() - start;
      });

      logMeasurement(`render.sliderStyleUpdate.${variant.name}`, measurement);
      assertBudget(
        `render.sliderStyleUpdate.${variant.name}`,
        measurement,
        renderBudgets.sliderStyleUpdate,
      );
    });
  }

  test("opens elevated overlays without expensive first paint", async ({ page }) => {
    await mountMarkup(page, overlayMarkup(), ["fig-button", "fig-popup", "fig-dialog", "fig-content"]);
    await setFixtureRootStyle(page, { display: "block", maxWidth: "none", minHeight: "480px" });

    const measurement = await measureScenario(page, async () => {
      const popup = document.querySelector("dialog[is='fig-popup']");
      const dialog = document.querySelector("dialog[is='fig-dialog']");
      if (!(popup instanceof HTMLDialogElement) || !(dialog instanceof HTMLDialogElement)) {
        throw new Error("Missing overlay fixture");
      }

      const start = performance.now();
      for (let index = 0; index < 8; index += 1) {
        popup.setAttribute("open", "true");
        dialog.setAttribute("open", "true");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        getComputedStyle(popup).filter;
        getComputedStyle(dialog).boxShadow;
        popup.getBoundingClientRect();
        dialog.getBoundingClientRect();
        popup.removeAttribute("open");
        dialog.removeAttribute("open");
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return performance.now() - start;
    });

    logMeasurement("render.overlayOpen", measurement);
    assertBudget("render.overlayOpen", measurement, renderBudgets.overlayOpen);
  });

  for (const scenarioName of overlayPathFixtures) {
    test(`opens ${scenarioName} overlay path synchronously`, async ({ page }) => {
      await mountMarkup(page, overlayMarkup(), ["fig-button", "fig-popup", "fig-dialog", "fig-content"]);
      await setFixtureRootStyle(page, { display: "block", maxWidth: "none", minHeight: "480px" });
      await page.evaluate((name) => {
        window.__figPerfOverlayScenario = name;
      }, scenarioName);

      const measurement = await measureScenario(page, async () => {
        const scenario = window.__figPerfOverlayScenario;
        const popup = document.querySelector("dialog[is='fig-popup']");
        const tooltip = document.querySelector("dialog[is='fig-popup'][variant='tooltip']");
        const dialog = document.querySelector("dialog[is='fig-dialog']");
        if (
          !(popup instanceof HTMLDialogElement) ||
          !(tooltip instanceof HTMLDialogElement) ||
          !(dialog instanceof HTMLDialogElement)
        ) {
          throw new Error("Missing overlay fixture");
        }

        const start = performance.now();
        for (let index = 0; index < 80; index += 1) {
          if (scenario === "dialog-open-close") {
            dialog.toggleAttribute("open", index % 2 === 0);
          } else if (scenario === "popup-open-close") {
            popup.toggleAttribute("open", index % 2 === 0);
          } else if (scenario === "tooltip-open-close") {
            tooltip.toggleAttribute("open", index % 2 === 0);
          } else if (scenario === "mixed-open-close") {
            const open = index % 2 === 0;
            dialog.toggleAttribute("open", open);
            popup.toggleAttribute("open", open);
            tooltip.toggleAttribute("open", open);
          } else {
            throw new Error(`Unknown overlay scenario: ${scenario}`);
          }
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
        getComputedStyle(popup).filter;
        getComputedStyle(tooltip).filter;
        getComputedStyle(dialog).boxShadow;
        popup.getBoundingClientRect();
        tooltip.getBoundingClientRect();
        dialog.getBoundingClientRect();
        popup.removeAttribute("open");
        tooltip.removeAttribute("open");
        dialog.removeAttribute("open");
        return performance.now() - start;
      });

      logMeasurement(`render.overlayOpen.${scenarioName}`, measurement);
      assertBudget(
        `render.overlayOpen.${scenarioName}`,
        measurement,
        renderBudgets.overlayOpenPath,
      );
    });
  }

  test("flips color scheme over a dense panel without broad restyle stalls", async ({ page }) => {
    await mountMarkup(page, densePanelMarkup(48), ["fig-field", "fig-input-text", "fig-slider", "fig-input-color"]);

    const measurement = await measureScenario(page, async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");

      const start = performance.now();
      for (let index = 0; index < 10; index += 1) {
        document.documentElement.style.colorScheme = index % 2 === 0 ? "dark" : "light";
        await new Promise((resolve) => requestAnimationFrame(resolve));
        Array.from(root.querySelectorAll("fig-field, fig-input-text, fig-slider"))
          .slice(0, 30)
          .forEach((element) => {
            getComputedStyle(element).backgroundColor;
          });
      }
      document.documentElement.style.colorScheme = "";
      return performance.now() - start;
    });

    logMeasurement("render.themeFlip", measurement);
    assertBudget("render.themeFlip", measurement, renderBudgets.themeFlip);
  });

  test("keeps targeted :has selector paths bounded with frame-settled reads", async ({ page }) => {
    await mountMarkup(page, hasSelectorMarkup(), [
      "fig-field",
      "fig-input-text",
      "fig-media",
      "fig-preview",
      "fig-shimmer",
    ]);

    const measurement = await measureScenario(page, async () => {
      const textarea = document.querySelector<HTMLTextAreaElement>("fig-input-text textarea");
      const fieldChild = document.querySelector("#has-open-child");
      const mediaImage = document.querySelector<HTMLImageElement>("#has-media img.fig-media-element");
      const shimmer = document.querySelector("fig-shimmer");
      if (!textarea || !fieldChild || !mediaImage || !shimmer) {
        throw new Error("Missing :has fixture");
      }

      const gif = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
      const start = performance.now();
      for (let index = 0; index < 24; index += 1) {
        textarea.setAttribute("style", `width: ${180 + index}px; height: ${48 + (index % 5)}px`);
        fieldChild.toggleAttribute("open", index % 2 === 0);
        if (index % 2 === 0) mediaImage.setAttribute("src", gif);
        else mediaImage.removeAttribute("src");
        shimmer.toggleAttribute("playing", index % 3 !== 0);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        getComputedStyle(textarea).width;
        fieldChild.getBoundingClientRect();
      }
      return performance.now() - start;
    });

    logMeasurement("render.hasSelectorChurn", measurement);
    assertBudget("render.hasSelectorChurn", measurement, renderBudgets.hasSelectorChurn);
  });

  for (const fixture of hasSelectorFixtures) {
    test(`updates ${fixture.name} :has selector path synchronously`, async ({ page }) => {
      await mountMarkup(page, fixture.markup, fixture.tags);
      await page.evaluate((name) => {
        window.__figPerfHasScenario = name;
      }, fixture.name);

      const measurement = await measureScenario(page, async () => {
        const scenario = window.__figPerfHasScenario;
        const start = performance.now();

        if (scenario === "resizable-input") {
          const textarea = document.querySelector<HTMLTextAreaElement>("#has-resizable textarea");
          if (!textarea) throw new Error("Missing resizable textarea");
          for (let index = 0; index < 120; index += 1) {
            textarea.setAttribute("style", `width: ${180 + index}px; height: ${48 + (index % 5)}px`);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          getComputedStyle(textarea).width;
          textarea.getBoundingClientRect();
        } else if (scenario === "field-child-open") {
          const field = document.querySelector("#has-open-field");
          const child = document.querySelector("#has-open-child");
          const chevron = document.querySelector("#has-open-field .fig-field-chevron");
          if (!field || !child || !chevron) throw new Error("Missing open field fixture");
          for (let index = 0; index < 120; index += 1) {
            child.toggleAttribute("open", index % 2 === 0);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          getComputedStyle(chevron).transform;
          field.getBoundingClientRect();
        } else if (scenario === "labelless-field") {
          const field = document.querySelector("#has-labelless");
          if (!field) throw new Error("Missing labelless field fixture");
          for (let index = 0; index < 120; index += 1) {
            const label = field.querySelector(":scope > label");
            if (label) {
              label.remove();
            } else {
              const nextLabel = document.createElement("label");
              nextLabel.textContent = "Temporary";
              field.prepend(nextLabel);
            }
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          field.getBoundingClientRect();
        } else if (scenario === "media-generated-src") {
          const media = document.querySelector("#has-media");
          const image = document.querySelector<HTMLImageElement>("#has-media img.fig-media-element");
          const upload = document.querySelector("#has-media fig-input-file[data-generated]");
          if (!media || !image || !upload) throw new Error("Missing media fixture");
          for (let index = 0; index < 120; index += 1) {
            if (index % 2 === 0) image.setAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAAAACw=");
            else image.removeAttribute("src");
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          getComputedStyle(upload).opacity;
          media.getBoundingClientRect();
        } else if (scenario === "shimmer-descendants") {
          const shimmer = document.querySelector("#has-shimmer");
          if (!shimmer) throw new Error("Missing shimmer fixture");
          for (let index = 0; index < 120; index += 1) {
            shimmer.toggleAttribute("playing", index % 2 === 0);
          }
          await new Promise((resolve) => requestAnimationFrame(resolve));
          getComputedStyle(shimmer.querySelector("label") ?? shimmer).animationDuration;
          shimmer.getBoundingClientRect();
        } else {
          throw new Error(`Unknown :has scenario: ${scenario}`);
        }

        return performance.now() - start;
      });

      logMeasurement(`render.hasSelectorPath.${fixture.name}`, measurement);
      assertBudget(
        `render.hasSelectorPath.${fixture.name}`,
        measurement,
        renderBudgets.hasSelectorPath,
      );
    });
  }
});

async function installRenderMarkup(page: Page, markup: string) {
  await page.evaluate((html) => {
    window.__figPerfRenderMarkup = html;
  }, markup);
}

function densePanelMarkup(rows: number) {
  return Array.from({ length: rows }, (_, index) => {
    const color = index % 2 === 0 ? "#0D99FF" : "#14AE5C";
    return `
      <fig-field direction="horizontal">
        <label>Width ${index}</label>
        <fig-input-text value="${120 + index}px"></fig-input-text>
      </fig-field>
      <fig-field direction="horizontal">
        <label>Opacity ${index}</label>
        <fig-slider value="${index % 100}" min="0" max="100" text="true" units="%"></fig-slider>
      </fig-field>
      <fig-field direction="horizontal">
        <label>Color ${index}</label>
        <fig-input-color value="${color}" text="true"></fig-input-color>
      </fig-field>
    `;
  }).join("");
}

function shimmerMarkup(rows: number) {
  const fields = Array.from({ length: rows }, (_, index) => `
    <fig-field direction="horizontal">
      <label>Loading ${index}</label>
      <fig-input-text value="Placeholder ${index}"></fig-input-text>
    </fig-field>
  `).join("");
  return `
    <fig-shimmer>${fields}</fig-shimmer>
    <fig-skeleton>${fields}</fig-skeleton>
  `;
}

function sliderPaintMarkup() {
  return `
    <fig-slider value="25" min="0" max="100" text="true"></fig-slider>
    <fig-slider type="hue" value="128" text="false"></fig-slider>
    <fig-slider type="opacity" value="75" color="#0D99FF" text="true"></fig-slider>
    <fig-slider type="delta" value="0" min="-100" max="100" text="true"></fig-slider>
    <fig-slider type="stepper" value="25" min="0" max="100" step="25" text="true"></fig-slider>
  `;
}

function overlayMarkup() {
  return `
    <fig-button id="overlay-anchor" style="margin-left: 180px">Anchor</fig-button>
    <dialog is="fig-popup" anchor="#overlay-anchor" position="bottom left" offset="8 8" variant="popover">
      <fig-content>Popover popup</fig-content>
    </dialog>
    <dialog is="fig-popup" anchor="#overlay-anchor" position="bottom center" offset="8 8" variant="tooltip">
      <fig-content>Tooltip popup</fig-content>
    </dialog>
    <dialog is="fig-dialog" position="center center">
      <fig-header>Dialog</fig-header>
      <fig-content>Dialog body</fig-content>
    </dialog>
  `;
}

function hasSelectorMarkup() {
  return `
    <fig-field direction="horizontal">
      <label>Notes</label>
      <fig-input-text multiline resizable value="Resizable text"></fig-input-text>
    </fig-field>
    <fig-field id="has-open-field">
      <fig-icon class="fig-field-chevron" name="chevron"></fig-icon>
      <label>Disclosure</label>
      <fig-group id="has-open-child" name="Disclosure"><fig-input-text value="Open state"></fig-input-text></fig-group>
    </fig-field>
    <fig-media id="has-media" type="image" fit="cover" size="auto" checkerboard="true">
      <fig-preview>
        <img class="fig-media-element" data-generated alt="" src="${transparentGif}">
        <fig-input-file data-generated label="Upload"></fig-input-file>
      </fig-preview>
    </fig-media>
    <fig-shimmer>
      <fig-field><label>Loading</label><fig-input-text value="Value"></fig-input-text></fig-field>
      <fig-field><label>Loading</label><fig-input-text value="Value"></fig-input-text></fig-field>
      <fig-field><label>Loading</label><fig-input-text value="Value"></fig-input-text></fig-field>
    </fig-shimmer>
  `;
}

declare global {
  interface Window {
    __figPerfRenderMarkup?: string;
    __figPerfHasScenario?: string;
    __figPerfOverlayScenario?: string;
  }
}
