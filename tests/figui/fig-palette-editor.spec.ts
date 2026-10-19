import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-input-palette edit modes", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.evaluate(() => customElements.whenDefined("fig-input-palette"));
  });

  test("omits editing DOM outside inline mode and opens a late-registered picker", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      const value = '["#94BD00","#83AD00","#1A632A","#003905"]';
      root.innerHTML = `
        <fig-input-palette id="inline" edit="true" value='${value}'></fig-input-palette>
        <fig-input-palette id="preview" edit="false" value='${value}'></fig-input-palette>
        <fig-input-palette id="picker" edit="picker" value='${value}'></fig-input-palette>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#inline .palette-colors-expanded")).toHaveCount(1);
    await expect(page.locator("#inline .palette-add-btn")).toHaveCount(1);
    await expect(page.locator("#preview .palette-colors-expanded")).toHaveCount(0);
    await expect(page.locator("#preview .palette-add-btn")).toHaveCount(0);
    await expect(page.locator("#picker .palette-colors-expanded")).toHaveCount(0);
    await expect(page.locator("#picker .palette-add-btn")).toHaveCount(0);

    const previewTrigger = page.locator("#preview .palette-colors-inline");
    await expect(previewTrigger).toHaveAttribute("role", "img");
    await expect(previewTrigger).not.toHaveAttribute("aria-expanded");
    await previewTrigger.click();
    await expect(page.locator("#preview")).not.toHaveAttribute("open");

    const picker = page.locator("#picker");
    const pickerTrigger = picker.locator(".palette-colors-inline");
    await expect(pickerTrigger).toHaveAttribute("aria-haspopup", "dialog");
    await pickerTrigger.click();
    await expect(picker).toHaveAttribute("open", "");
    await expect(page.locator("dialog.fig-palette-editor-popup")).toHaveCount(0);

    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() => customElements.whenDefined("fig-palette-editor"));

    const popup = page.locator("dialog.fig-palette-editor-popup");
    await expect(popup).toHaveAttribute("open");
    await expect(popup.locator("fig-header h3")).toHaveText("Edit palette");
    await expect(popup.locator("fig-palette-editor")).toHaveCount(1);
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(pickerTrigger).toHaveAttribute(
      "aria-controls",
      await popup.getAttribute("id"),
    );

    await popup.locator("fig-palette-editor").evaluate((editor) => {
      editor.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: [
            { color: "#112233", alpha: 1 },
            { color: "#445566", alpha: 0.5 },
          ],
        }),
      );
    });
    await expect(picker).toHaveAttribute(
      "value",
      '[{"color":"#112233","alpha":1},{"color":"#445566","alpha":0.5}]',
    );
    await expect(picker.locator(".palette-colors fig-input-color")).toHaveCount(2);

    await popup.locator("fig-button[close-dialog]").click();
    await expect(picker).not.toHaveAttribute("open");
    await expect(pickerTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(pickerTrigger).toBeFocused();

    await picker.locator(".palette-colors-inline").click();
    await expect(popup).toHaveAttribute("open");
    await picker.evaluate((host) => host.setAttribute("edit", "false"));
    await expect(page.locator("dialog.fig-palette-editor-popup")).toHaveCount(0);
    await expect(picker).not.toHaveAttribute("open");
    await expect(picker.locator(".palette-colors-expanded")).toHaveCount(0);

    await picker.evaluate((host) => host.setAttribute("edit", "true"));
    await expect(picker.locator(".palette-colors-expanded")).toHaveCount(1);
    await expect(picker.locator(".palette-add-btn")).toHaveCount(1);
  });

  test("keeps preview and disabled picker modes non-interactive", async ({
    page,
  }) => {
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() => customElements.whenDefined("fig-palette-editor"));
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-input-palette id="preview" edit="false" open value='["#112233","#445566"]'></fig-input-palette>
        <fig-input-palette id="disabled-picker" edit="picker" disabled value='["#112233","#445566"]'></fig-input-palette>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#preview")).not.toHaveAttribute("open");
    await expect(
      page.locator("#disabled-picker .palette-colors-inline"),
    ).toHaveAttribute("tabindex", "-1");
    await page
      .locator("#disabled-picker .palette-colors-inline")
      .click({ force: true });
    await expect(page.locator("#disabled-picker")).not.toHaveAttribute("open");
    await expect(page.locator("dialog.fig-palette-editor-popup")).toHaveCount(0);
  });

  test("fig-field only adds a disclosure chevron for inline editing", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-field id="inline-field">
          <label>Inline</label>
          <fig-input-palette edit="true" value='["#112233","#445566"]'></fig-input-palette>
        </fig-field>
        <fig-field id="preview-field">
          <label>Preview</label>
          <fig-input-palette edit="false" value='["#112233","#445566"]'></fig-input-palette>
        </fig-field>
        <fig-field id="picker-field">
          <label>Picker</label>
          <fig-input-palette edit="picker" value='["#112233","#445566"]'></fig-input-palette>
        </fig-field>
      `;
    });
    await page.waitForTimeout(50);

    await expect(page.locator("#inline-field > .fig-field-chevron")).toHaveCount(1);
    await expect(page.locator("#preview-field > .fig-field-chevron")).toHaveCount(0);
    await expect(page.locator("#picker-field > .fig-field-chevron")).toHaveCount(0);

    await page
      .locator("#inline-field fig-input-palette")
      .evaluate((palette) => palette.setAttribute("edit", "false"));
    await expect(page.locator("#inline-field > .fig-field-chevron")).toHaveCount(0);

    await page
      .locator("#preview-field fig-input-palette")
      .evaluate((palette) => palette.setAttribute("edit", "true"));
    await expect(page.locator("#preview-field > .fig-field-chevron")).toHaveCount(1);
  });
});

test.describe("fig-palette-editor", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-lab.css" });
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(async () => {
      await Promise.all([
        customElements.whenDefined("fig-palette-editor"),
        customElements.whenDefined("fig-reorder"),
      ]);
    });
  });

  test("reorders fields and keeps DOM, value, and events aligned", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="editor"
          value='["#111111","#222222","#333333"]'
        ></fig-palette-editor>
      `;
      const editor = root.querySelector("#editor");
      editor?.addEventListener("input", (event) => {
        editor.setAttribute(
          "data-input-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
      editor?.addEventListener("change", (event) => {
        editor.setAttribute(
          "data-change-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
    });
    await page.waitForTimeout(50);

    const editor = page.locator("#editor");
    const rows = editor.locator(".fig-palette-editor-color-row");
    await expect(rows).toHaveCount(3);
    await rows.first().focus();
    await page.keyboard.press("ArrowDown");

    const state = await editor.evaluate((element: any) => ({
      value: element.value,
      domValues: Array.from(
        element.querySelectorAll(".fig-palette-editor-color"),
      ).map((input: any) => input.getAttribute("value")),
      indexes: Array.from(
        element.querySelectorAll(".fig-palette-editor-color-row"),
      ).map((row: any) => row.dataset.index),
      inputDetail: JSON.parse(element.getAttribute("data-input-detail")),
      changeDetail: JSON.parse(element.getAttribute("data-change-detail")),
    }));
    const expected = [
      { color: "#222222", alpha: 1 },
      { color: "#111111", alpha: 1 },
      { color: "#333333", alpha: 1 },
    ];
    expect(state).toEqual({
      value: expected,
      domValues: ["#222222", "#111111", "#333333"],
      indexes: ["0", "1", "2"],
      inputDetail: expected,
      changeDetail: expected,
    });
  });

  test("adds the average of the previous two colors", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor
          id="averaged"
          value='[
            {"color":"#FF0000","alpha":1},
            {"color":"#000000","alpha":0.25},
            {"color":"#FFFFFF","alpha":0.75}
          ]'
        ></fig-palette-editor>
      `;
    });
    await page.locator("#averaged .fig-palette-editor-add").click();

    await expect
      .poll(() =>
        page.locator("#averaged").evaluate((element: any) => element.value),
      )
      .toEqual([
        { color: "#FF0000", alpha: 1 },
        { color: "#000000", alpha: 0.25 },
        { color: "#FFFFFF", alpha: 0.75 },
        { color: "#808080", alpha: 0.5 },
      ]);
  });

  test("honors min, max, fixed, and disabled controls", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-palette-editor id="limited" min="2" max="3" value='["#111111","#222222"]'></fig-palette-editor>
        <fig-palette-editor id="unbounded" value='["#111111","#222222","#333333","#444444","#555555","#666666","#777777","#888888"]'></fig-palette-editor>
        <fig-palette-editor id="fixed" fixed value='["#111111","#222222"]'></fig-palette-editor>
        <fig-palette-editor id="disabled" disabled value='["#111111","#222222"]'></fig-palette-editor>
      `;
    });
    await page.waitForTimeout(50);

    const limited = page.locator("#limited");
    await expect(limited.locator(".fig-palette-editor-remove").first()).toHaveAttribute(
      "disabled",
    );
    await limited.locator(".fig-palette-editor-add").click();
    await expect(limited.locator(".fig-palette-editor-color-row")).toHaveCount(3);
    await expect(limited.locator(".fig-palette-editor-add")).toHaveAttribute(
      "disabled",
    );

    const unbounded = page.locator("#unbounded");
    await expect(unbounded.locator(".fig-palette-editor-add")).not.toHaveAttribute(
      "disabled",
    );
    await unbounded.locator(".fig-palette-editor-add").click();
    await expect(unbounded.locator(".fig-palette-editor-color-row")).toHaveCount(9);

    await expect(page.locator("#fixed .fig-palette-editor-remove")).toHaveCount(0);
    await expect(page.locator("#fixed .fig-palette-editor-add")).toHaveCount(0);
    await expect(page.locator("#disabled fig-reorder")).toHaveAttribute(
      "disabled",
    );
    await expect(
      page.locator("#disabled .fig-palette-editor-color").first(),
    ).toHaveAttribute("disabled");
  });
});
