import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-popup-easing", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    await page.addStyleTag({ url: "/fig-editor.css" });
    await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
    await page.evaluate(() =>
      Promise.all([
        customElements.whenDefined("fig-easing-curve"),
        customElements.whenDefined("fig-popup-easing"),
      ]),
    );
  });

  test("creates a 4/3 easing editor and inherits popup defaults", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-button id="easing-anchor">Easing</fig-button>
        <dialog
          is="fig-popup-easing"
          id="easing-popup"
          anchor="#easing-anchor"
          value="0.42, 0, 0.58, 1"
          open
        ></dialog>
      `;
    });

    const popup = page.locator("#easing-popup");
    const curve = popup.locator("fig-easing-curve");
    await expect(popup).toHaveAttribute("role", "dialog");
    await expect(popup).toHaveAttribute("position", "bottom left");
    await expect(popup).toHaveAttribute("offset", "0 8");
    await expect(popup).toHaveAttribute("aria-label", "Edit easing");
    await expect(curve).toHaveAttribute("aspect-ratio", "4/3");
    await expect(curve).toHaveAttribute("value", "0.42, 0, 0.58, 1");
  });

  test("synchronizes values and forwards easing events", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <dialog
          is="fig-popup-easing"
          id="easing-popup"
          mode="bezier"
          value="0.42, 0, 0.58, 1"
        ></dialog>
      `;
      const popup = root.querySelector("#easing-popup");
      popup?.addEventListener("change", (event) => {
        popup.setAttribute(
          "data-change-detail",
          String((event as CustomEvent).detail),
        );
      });
    });

    const popup = page.locator("#easing-popup");
    const curve = popup.locator("fig-easing-curve");
    await popup.evaluate((element) =>
      element.setAttribute("value", "0, 0, 1, 1"),
    );
    await expect(curve).toHaveAttribute("value", "0, 0, 1, 1");

    await curve.evaluate((element: any) => {
      element.value = "0.25, 0.1, 0.25, 1";
      element.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: element.value,
        }),
      );
    });
    await expect(popup).toHaveAttribute(
      "data-change-detail",
      "0.25, 0.10, 0.25, 1.00",
    );
    await expect(popup).toHaveAttribute(
      "value",
      "0.25, 0.10, 0.25, 1.00",
    );
  });

  test('fig-easing-curve edit="false" opens the easing popup', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing #fixture-root");
      root.innerHTML = `
        <fig-easing-curve
          id="compact"
          edit="false"
          value="0.42, 0, 0.58, 1"
        ></fig-easing-curve>
      `;
      const easing = root.querySelector("#compact");
      easing?.addEventListener("change", (event) => {
        easing.setAttribute(
          "data-change-value",
          String((event as CustomEvent).detail.value),
        );
      });
    });

    const compact = page.locator("#compact");
    const trigger = compact.locator(".fig-easing-curve-select");
    await trigger.click();

    const popup = page.locator('dialog[is="fig-popup-easing"]');
    await expect(popup).toHaveAttribute("open");
    await expect(popup.locator("fig-easing-curve")).toHaveAttribute(
      "value",
      "0.42, 0.00, 0.58, 1.00",
    );
    await expect(popup.locator("fig-easing-curve")).not.toHaveAttribute(
      "edit",
      "false",
    );

    await popup.locator(".fig-easing-curve-select").click();
    await popup.locator('fig-select-option[value="Linear"]').click();

    await expect(compact).toHaveAttribute("value", "0.00, 0.00, 1.00, 1.00");
    await expect(compact).toHaveAttribute(
      "data-change-value",
      "0.00, 0.00, 1.00, 1.00",
    );
    await expect(trigger).toHaveAttribute("value", "Linear");

    await popup.locator("fig-easing-curve").evaluate((element: any) => {
      element.value = "0.25, 0.1, 0.25, 1";
      element.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          detail: {
            mode: "bezier",
            value: element.value,
            cssValue: element.cssValue,
            preset: element.preset,
          },
        }),
      );
    });
    await expect(compact).toHaveAttribute(
      "value",
      "0.25, 0.10, 0.25, 1.00",
    );
    await expect(trigger).toHaveAttribute("value", "Custom bezier");
  });
});
