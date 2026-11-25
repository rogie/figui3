import { expect, test } from "@playwright/test";
import { bootFigFixture } from "./helpers";

test.beforeEach(async ({ page }) => {
  await bootFigFixture(page);
});

test("reports binding changes and restores the literal on keyboard detach", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = '<fig-input-number value="16" units="px" binding="min-content" binding-label="Width"></fig-input-number>';
    const number = root.querySelector("fig-input-number")!;
    const events: unknown[] = [];
    number.addEventListener("change", ({ detail, units, binding, previousBinding }) => {
      events.push({ detail, units, binding, previousBinding });
    });
    Object.assign(number, { events });
  });
  const number = page.locator("fig-input-number");
  const chip = number.locator('fig-chip[size="small"]');
  const selection = chip.getByRole("button");
  const value = () => number.evaluate((el) => (el as HTMLElementTagNameMap["fig-input-number"]).value);
  await expect(selection).toBeVisible();
  await expect(chip).toHaveAttribute("variant", "variable");
  await expect(number.locator("input")).toHaveCount(0);
  expect(await value()).toBe("min-content");

  await chip.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(selection).toHaveAccessibleName("Width");
  await expect(tooltip).toHaveText("min-content");
  await expect(chip).not.toHaveAttribute("title");
  await number.evaluate((el) => el.setAttribute("binding-label", "Minimum width"));
  await expect(selection).toHaveAccessibleName("Minimum width");
  await expect(tooltip).toHaveText("min-content");
  await number.evaluate((el) => el.setAttribute("binding", "max-content"));
  await expect(tooltip).toHaveText("max-content");
  await expect(selection).toHaveAccessibleName("Minimum width");
  await number.evaluate((el) => el.removeAttribute("binding-label"));
  await expect(tooltip).toHaveText("max-content");
  await expect(selection).toHaveAccessibleName("max-content");

  await number.evaluate((el) => {
    const host = el as HTMLElementTagNameMap["fig-input-number"];
    host.binding = null;
    host.setBinding("calc(1rem - 100%)", { emit: true });
    host.setBinding("--spacer-2", { emit: true });
    host.setBinding("--spacer-2", { emit: true });
    host.setAttribute("binding-label", "Width");
  });
  expect(await value()).toBe("--spacer-2");
  await selection.focus();
  await selection.press("Delete");
  await expect(chip).toHaveCount(1);
  await selection.press("Space");
  await selection.press("Delete");
  await expect(number).not.toHaveAttribute("binding");
  await expect(chip).toHaveCount(0);
  await expect(tooltip).toHaveCount(0);
  await expect(number.locator("input")).toBeFocused();
  await expect(number.locator("input")).toHaveValue("16");
  expect(await value()).toBe(16);
  expect(await number.evaluate((el) => Reflect.get(el, "events"))).toEqual([
    { detail: "calc(1rem - 100%)", units: "px", binding: "calc(1rem - 100%)", previousBinding: null },
    { detail: "--spacer-2", units: "px", binding: "--spacer-2", previousBinding: "calc(1rem - 100%)" },
    { detail: 16, units: "px", binding: null, previousBinding: "--spacer-2" },
  ]);
});

test("uses the numeric field focus outline when tabbing to a binding chip", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = `
      <button>Before</button>
      <fig-input-number value="16"></fig-input-number>
      <fig-input-number value="16" binding="--spacer-2"></fig-input-number>
    `;
  });
  const literal = page.locator("fig-input-number").first();
  const bound = page.locator("fig-input-number[binding]");
  const selection = bound.getByRole("button", { name: "--spacer-2" });
  const outline = (el: Element) => {
    const style = getComputedStyle(el);
    return { outline: style.outline, offset: style.outlineOffset };
  };

  await page.getByRole("button", { name: "Before" }).focus();
  await page.keyboard.press("Tab");
  await expect(literal.locator("input")).toBeFocused();
  await expect(literal).toHaveCSS("outline-style", "solid");
  const literalOutline = await literal.evaluate(outline);

  await page.keyboard.press("Tab");
  await expect(selection).toBeFocused();
  expect(await bound.evaluate(outline)).toEqual(literalOutline);
  await expect(selection).toHaveCSS("outline-style", "none");
});

test("keeps the prepend slot and suspends steppers and scrubbing while bound", async ({ page }) => {
  await page.locator("#fixture-root").evaluate((root) => {
    root.innerHTML = `<fig-input-number value="16" step="1">
      <fig-icon slot="prepend">W</fig-icon>
    </fig-input-number>`;
  });
  const number = page.locator("fig-input-number");
  const prepend = number.locator('[slot="prepend"]');
  const steppers = number.locator(".fig-steppers");
  await expect(steppers).toBeVisible();
  await expect(prepend).toHaveCSS("cursor", "ew-resize");
  await number.evaluate((el) => {
    (el as HTMLElementTagNameMap["fig-input-number"]).binding = "--spacer-2";
  });
  await expect(prepend).toHaveText("W");
  await prepend.hover();
  await expect(prepend).toHaveCSS("cursor", "default");
  await expect(steppers).toHaveCount(0);
  await expect(number.locator("fig-chip")).toHaveCSS("margin-left", "0px");
  const selection = number.getByRole("button", { name: "--spacer-2" });
  await expect(selection).toHaveAttribute("aria-pressed", "false");

  const drag = async () => {
    const box = (await prepend.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
    await page.mouse.up();
  };
  await drag();
  await expect(number).toHaveAttribute("binding", "--spacer-2");
  await prepend.click();
  await expect(selection).toBeFocused();
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  await expect(selection).toHaveCSS("outline-style", "none");
  await expect(number).toHaveCSS("outline-style", "none");
  await prepend.click();
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Delete");
  const input = number.locator("input");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("16");
  await expect(steppers).toBeVisible();
  await expect(prepend).toHaveCSS("cursor", "ew-resize");
  await drag();
  await expect(input).not.toHaveValue("16");
});
