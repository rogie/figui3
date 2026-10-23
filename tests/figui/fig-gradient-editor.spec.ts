import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-gradient-editor", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      Promise.all([
        customElements.whenDefined("fig-gradient-editor"),
        customElements.whenDefined("fig-reorder"),
      ]),
    );
  });

  test("renders the extracted gradient controls and emits normalized edits", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
        ></fig-gradient-editor>
      `;
      const editor = root.querySelector("#editor");
      editor?.addEventListener("input", (event) => {
        editor.setAttribute(
          "data-input-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
    });

    const editor = page.locator("#editor");
    await expect(editor.locator(".fig-fill-picker-gradient-type")).toHaveCount(1);
    await expect(editor.locator(".fig-fill-picker-gradient-bar-input")).toHaveCount(
      1,
    );
    await expect
      .poll(() =>
        editor
          .locator(".fig-fill-picker-gradient-preview")
          .evaluate((element) => getComputedStyle(element).overflow),
      )
      .toBe("visible");
    await expect(editor.locator(".fig-fill-picker-gradient-stop-row")).toHaveCount(
      2,
    );

    await editor.locator(".fig-fill-picker-gradient-add").click();
    await expect(editor.locator(".fig-fill-picker-gradient-stop-row")).toHaveCount(
      3,
    );

    const state = await editor.evaluate((element: any) => ({
      value: element.value,
      cssValue: element.cssValue,
      detail: JSON.parse(element.getAttribute("data-input-detail")),
      rows: Array.from(
        element.querySelectorAll(".fig-fill-picker-gradient-stop-row"),
      ).map((row: any) => ({
        tag: row.tagName,
        leading: row.getAttribute("leading"),
        trailing: row.getAttribute("trailing"),
        inputSlot: row.querySelector(":scope > fig-stack")?.slot,
      })),
    }));
    expect(state.value.stops).toHaveLength(3);
    expect(state.value.interpolationSpace).toBe("srgb");
    expect(state.cssValue).toContain("linear-gradient(90deg");
    expect(state.detail.gradient.stops).toHaveLength(3);
    expect(state.rows).toEqual(
      Array.from({ length: 3 }, () => ({
        tag: "FIG-PROPERTY",
        leading: "drag",
        trailing: "remove",
        inputSlot: "input",
      })),
    );
  });

  test("supports full fill values, color space, and disabled state", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-gradient-editor
          id="editor"
          color-space="display-p3"
          disabled
          value='{"type":"gradient","gradient":{"type":"radial","centerX":25,"centerY":75,"stops":[{"position":0,"color":"#FF0000","opacity":50},{"position":100,"color":"#0000FF","opacity":100}]}}'
        ></fig-gradient-editor>
      `;
    });

    const editor = page.locator("#editor");
    await expect(editor.locator(".fig-fill-picker-gradient-add")).toHaveAttribute(
      "disabled",
    );
    await expect(
      editor.locator(".fig-fill-picker-stop-position").first(),
    ).toHaveAttribute("disabled");
    await expect
      .poll(() => editor.evaluate((element: any) => element.value.type))
      .toBe("radial");
    await expect
      .poll(() => editor.evaluate((element: any) => element.cssValue))
      .toContain("color(display-p3");
  });

  test("fig-popup-gradient owns an editor and forwards changes", async ({
    page,
  }) => {
    await page.evaluate(() => customElements.whenDefined("fig-popup-gradient"));
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="anchor">Gradient</fig-button>
        <dialog
          is="fig-popup-gradient"
          id="popup"
          anchor="#anchor"
          value='{"type":"linear","angle":90,"stops":[{"position":0,"color":"#0D99FF","opacity":100},{"position":100,"color":"#9747FF","opacity":100}]}'
          open
        ></dialog>
      `;
      const popup = root.querySelector("#popup");
      popup?.addEventListener("input", (event) => {
        popup.setAttribute(
          "data-input-detail",
          JSON.stringify((event as CustomEvent).detail),
        );
      });
    });

    const popup = page.locator("#popup");
    const editor = popup.locator("fig-gradient-editor");
    await expect(popup).toHaveAttribute("role", "dialog");
    await expect(popup).toHaveAttribute("aria-label", "Edit gradient");
    await expect(editor).toHaveCount(1);
    await editor.locator(".fig-fill-picker-gradient-add").click();
    await expect(editor.locator(".fig-fill-picker-gradient-stop-row")).toHaveCount(
      3,
    );
    await expect
      .poll(() =>
        popup.evaluate((element) =>
          JSON.parse(element.getAttribute("data-input-detail") || "{}"),
        ),
      )
      .toMatchObject({
        type: "gradient",
        gradient: { stops: [{}, {}, {}] },
      });
    await expect
      .poll(() =>
        popup.evaluate(
          (element) => JSON.parse(element.getAttribute("value") || "{}").stops,
        ),
      )
      .toHaveLength(3);
  });
});
