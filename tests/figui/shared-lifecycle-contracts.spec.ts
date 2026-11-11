import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

const reconnectContracts = [
  {
    name: "fig-layer",
    markup:
      '<fig-layer><div class="fig-layer-row">Layer</div></fig-layer>',
    selector: ".fig-layer-chevron",
  },
  {
    name: "fig-slider",
    markup: '<fig-slider value="25"></fig-slider>',
    selector: 'input[type="range"]',
  },
  {
    name: "fig-input-palette",
    markup: '<fig-input-palette value=\'["#0D99FF","#14AE5C"]\'></fig-input-palette>',
    selector: ".palette-colors",
  },
  {
    name: "fig-palette-editor",
    markup:
      '<fig-palette-editor value=\'["#0D99FF","#14AE5C"]\'></fig-palette-editor>',
    selector: ".fig-palette-editor-add",
  },
  {
    name: "fig-canvas-control",
    markup: '<fig-canvas-control type="point"></fig-canvas-control>',
    selector: "fig-handle",
  },
];

const delayedChildContracts = [
  {
    name: "fig-slider datalist",
    markup: '<fig-slider id="host" value="25"></fig-slider>',
    children:
      '<datalist id="ticks"><option value="25"></option></datalist>',
    selector: ":scope > #ticks",
    expected: 1,
  },
  {
    name: "fig-chooser choices",
    markup: '<fig-chooser id="host"></fig-chooser>',
    children:
      '<fig-choice value="one">One</fig-choice><fig-choice value="two">Two</fig-choice>',
    selector: ":scope > fig-choice",
    expected: 2,
  },
  {
    name: "fig-select options",
    markup: '<fig-select id="host"></fig-select>',
    children:
      '<fig-select-options><fig-select-option value="one">One</fig-select-option></fig-select-options>',
    selector: ":scope > fig-select-options fig-select-option",
    expected: 1,
  },
  {
    name: "fig-reorder items",
    markup: '<fig-reorder id="host"></fig-reorder>',
    children: "<div>One</div><div>Two</div>",
    selector: ":scope > [data-reorder-item]",
    expected: 2,
  },
];

test.describe("shared component lifecycle contracts", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(() =>
      Promise.all([import("/fig-editor.js"), import("/fig-lab.js")]),
    );
  });

  for (const contract of reconnectContracts) {
    test(`${contract.name} reconnects without duplicate internals`, async ({
      page,
    }) => {
      const errors = collectPageErrors(page);
      const counts = await page.evaluate(async (fixture) => {
        const root = document.querySelector("#fixture-root")!;
        root.innerHTML = fixture.markup;
        const frame = () => new Promise(requestAnimationFrame);
        await frame();
        await frame();
        const host = root.firstElementChild as HTMLElement;
        const before = host.querySelectorAll(fixture.selector).length;
        host.remove();
        root.append(host);
        await frame();
        await frame();
        return {
          before,
          after: host.querySelectorAll(fixture.selector).length,
        };
      }, contract);

      expect(counts).toEqual({ before: 1, after: 1 });
      expect(errors.pageErrors).toEqual([]);
      expect(errors.consoleErrors).toEqual([]);
    });
  }

  for (const contract of delayedChildContracts) {
    test(`${contract.name} accepts children added after connection`, async ({
      page,
    }) => {
      const count = await page.evaluate(async (fixture) => {
        const root = document.querySelector("#fixture-root")!;
        root.innerHTML = fixture.markup;
        const host = root.querySelector("#host") as HTMLElement;
        await new Promise(requestAnimationFrame);
        host.insertAdjacentHTML("beforeend", fixture.children);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        return host.querySelectorAll(fixture.selector).length;
      }, contract);

      expect(count).toBe(contract.expected);
    });
  }
});
