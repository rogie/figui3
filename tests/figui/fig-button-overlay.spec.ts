import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);
});

test("overlay button has distinct hover and press fills", async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.style.colorScheme = "dark";
    const button = document.createElement("fig-button");
    button.setAttribute("variant", "overlay");
    button.textContent = "Change";
    document.body.append(button);
  });

  const button = page.locator('fig-button[variant="overlay"]');
  const read = () =>
    button.evaluate((el) => {
      const used = (token: string) => {
        const probe = document.createElement("span");
        probe.style.backgroundColor = `var(${token})`;
        el.append(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      };
      const style = getComputedStyle(el);
      return {
        background: style.backgroundColor,
        color: style.color,
        rest: used("--figma-color-bg"),
        hover: used("--figma-color-bg-hover"),
        pressed: used("--figma-color-bg-tertiary"),
      };
    });

  const rest = await read();
  expect(rest.background).toBe(rest.rest);
  expect(rest.hover).not.toBe(rest.rest);
  expect(rest.pressed).not.toBe(rest.hover);

  await button.hover();
  const hover = await read();
  expect(hover.background).toBe(hover.hover);
  expect(hover.color).toBe(rest.color);

  await page.mouse.down();
  const pressed = await read();
  expect(pressed.background).toBe(pressed.pressed);
  expect(pressed.color).toBe(rest.color);
  await page.mouse.up();
});
