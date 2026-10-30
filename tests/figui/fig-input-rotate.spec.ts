import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.describe("fig-input-rotate", () => {
  test.beforeEach(async ({ page }) => {
    collectPageErrors(page);
    await bootFigFixture(page);
    expect(
      await page.evaluate(() =>
        Boolean(customElements.get("fig-input-rotate")),
      ),
    ).toBe(false);
    await page.addStyleTag({ url: "/fig-input-rotate.css" });
    await page.addScriptTag({ type: "module", url: "/fig-input-rotate.js" });
    await page.evaluate(() => customElements.whenDefined("fig-input-rotate"));
  });

  test("renders the default property button and secondary labels", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `<fig-input-rotate id="rotation"></fig-input-rotate>`;
    });

    const input = page.locator("#rotation");
    const button = input.locator(":scope > fig-button");
    await expect(button).toHaveAttribute("variant", "property");
    await expect(button).toHaveAttribute("full", "");
    await expect(
      button.locator(':scope > fig-icon[slot="prepend"][name="rotate"]'),
    ).toHaveCount(1);
    await expect(button.locator(".fig-input-rotate-value")).toHaveText(
      "X 0° · Y 0° · Z 0°",
    );

    const colors = await input.evaluate((element) => {
      const axis = element.querySelector(".fig-input-rotate-axis");
      const separator = element.querySelector(".fig-input-rotate-separator");
      const probe = document.createElement("span");
      probe.style.color = "var(--figma-color-text-secondary)";
      element.append(probe);
      const result = {
        axis: getComputedStyle(axis!).color,
        separator: getComputedStyle(separator!).color,
        secondary: getComputedStyle(probe).color,
      };
      probe.remove();
      return result;
    });
    expect(colors.axis).toBe(colors.secondary);
    expect(colors.separator).toBe(colors.secondary);
  });

  test("updates values and units without replacing the button", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-input-rotate id="rotation" x="10" y="invalid" z="30"></fig-input-rotate>
      `;
      const input = root.querySelector<any>("#rotation");
      const button = input.querySelector(":scope > fig-button");
      input.setAttribute("x", "1.234");
      input.setAttribute("y", "2");
      input.setAttribute("z", "invalid");
      input.setAttribute("units", "rad");
      return {
        text: input.querySelector(".fig-input-rotate-value")?.textContent,
        sameButton: button === input.querySelector(":scope > fig-button"),
        units: input.units,
        value: input.value,
      };
    });

    expect(result).toEqual({
      text: "X 1.2rad · Y 2rad · Z 0rad",
      sameButton: true,
      units: "rad",
      value: { x: 1.234, y: 2, z: 0 },
    });
  });

  test("opens an anchored 3D rotation popup and syncs edits", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-input-rotate id="rotation" x="10" y="20" z="30"></fig-input-rotate>
      `;
      root.querySelector("#rotation")?.addEventListener("input", (event) => {
        (event.currentTarget as HTMLElement).dataset.detail = JSON.stringify(
          (event as CustomEvent).detail,
        );
      });
    });

    const input = page.locator("#rotation");
    const button = input.locator(":scope > fig-button");
    await button.click();

    const popup = page.locator("dialog.fig-input-rotate-popup");
    const editor = popup.locator("fig-3d-rotate");
    await expect(popup).toHaveAttribute("open", "true");
    await expect(button).toHaveAttribute("aria-haspopup", "dialog");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(editor).toHaveAttribute(
      "fields",
      "rotateX,rotateY,rotateZ",
    );
    await expect(editor).toHaveAttribute("aspect-ratio", "4/3");
    await expect
      .poll(() => editor.evaluate((element: any) => element.value))
      .toBe("rotateX(10.0deg) rotateY(20.0deg) rotateZ(30.0deg)");

    await editor.evaluate((element) => {
      element.dispatchEvent(
        new CustomEvent("input", {
          bubbles: true,
          detail: { rotateX: 45, rotateY: -15, rotateZ: 90 },
        }),
      );
    });
    await expect(input).toHaveAttribute("x", "45");
    await expect(input).toHaveAttribute("y", "-15");
    await expect(input).toHaveAttribute("z", "90");
    await expect(input).toHaveAttribute(
      "data-detail",
      '{"x":45,"y":-15,"z":90}',
    );
    await expect(button.locator(".fig-input-rotate-value")).toHaveText(
      "X 45° · Y -15° · Z 90°",
    );

    await popup.evaluate((element: any) => {
      element.open = false;
    });
    await expect(input).not.toHaveAttribute("open");
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

test("is registered by the editor bundle", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
  expect(
    await page.evaluate(() =>
      Boolean(customElements.get("fig-input-rotate")),
    ),
  ).toBe(false);
  await page.addScriptTag({ type: "module", url: "/fig-editor.js" });
  await page.evaluate(() => customElements.whenDefined("fig-input-rotate"));
  expect(
    await page.evaluate(() =>
      Boolean(customElements.get("fig-input-rotate")),
    ),
  ).toBe(true);
});
