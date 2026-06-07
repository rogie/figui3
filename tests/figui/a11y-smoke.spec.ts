import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("axe accessibility smoke", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-button"),
        customElements.whenDefined("fig-combo-input"),
        customElements.whenDefined("fig-field"),
        customElements.whenDefined("fig-fill-picker"),
        customElements.whenDefined("fig-handle"),
        customElements.whenDefined("fig-input-fill"),
        customElements.whenDefined("fig-input-text"),
        customElements.whenDefined("fig-input-number"),
        customElements.whenDefined("fig-slider"),
        customElements.whenDefined("fig-toast"),
      ]);
    });
  });

  test("representative form and overlay controls have no axe violations", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field>
          <label>Layer name</label>
          <fig-input-text value="Button"></fig-input-text>
        </fig-field>
        <fig-combo-input
          aria-label="Font family"
          options="Inter, Roboto"
          value="Inter"
        ></fig-combo-input>
        <fig-input-fill aria-label="Layer fill" value="#0D99FF"></fig-input-fill>
        <fig-slider aria-label="Opacity" min="0" max="100" value="75" text="true"></fig-slider>
        <div aria-label="Color position" role="group" style="position: relative; width: 160px; height: 80px;">
          <fig-handle aria-label="Color position handle" drag="true" value="50% 50%"></fig-handle>
        </div>
        <dialog is="fig-toast">Saved</dialog>
      `;
    });
    await page.waitForTimeout(150);

    const results = await new AxeBuilder({ page }).include("#fixture-root").analyze();
    expect(results.violations).toEqual([]);
  });
});
