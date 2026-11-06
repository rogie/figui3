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
      button.locator(':scope > fig-icon[slot="prepend"][name="rotate3d"]'),
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

  test("renders and updates the simple variant without icon or axis labels", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-input-rotate
          id="rotation"
          variant="simple"
          x="10"
          y="20"
          z="30">
        </fig-input-rotate>
      `;
    });

    const input = page.locator("#rotation");
    const button = input.locator(":scope > fig-button");
    await expect(button.locator(':scope > fig-icon[slot="prepend"]')).toHaveCount(
      0,
    );
    await expect(button.locator(".fig-input-rotate-axis")).toHaveCount(0);
    await expect(button.locator(".fig-input-rotate-value")).toHaveText(
      "10° · 20° · 30°",
    );

    await input.evaluate((element: any) => {
      element.variant = "default";
    });
    await expect(
      button.locator(':scope > fig-icon[slot="prepend"][name="rotate3d"]'),
    ).toHaveCount(1);
    await expect(button.locator(".fig-input-rotate-axis")).toHaveCount(3);
    await expect(button.locator(".fig-input-rotate-value")).toHaveText(
      "X 10° · Y 20° · Z 30°",
    );
    await expect(input).not.toHaveAttribute("variant");
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
      input.units = "%";
      return {
        text: input.querySelector(".fig-input-rotate-value")?.textContent,
        sameButton: button === input.querySelector(":scope > fig-button"),
        units: input.units,
        unitsAttribute: input.getAttribute("units"),
        value: input.value,
      };
    });

    expect(result).toEqual({
      text: "X 1.2% · Y 2% · Z 0%",
      sameButton: true,
      units: "%",
      unitsAttribute: "%",
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

  test("forwards per-axis defaults and resets with one host event pair", async ({
    page,
  }) => {
    const state = await page.evaluate(async () => {
      const root = document.querySelector("#fixture-root");
      if (!root) throw new Error("Missing fixture root");
      root.innerHTML = `
        <fig-input-rotate
          id="rotation"
          x="10"
          y="20"
          z="30"
          default-x="1"
          default-y="2"
          default-z="3">
        </fig-input-rotate>
      `;
      const input = root.querySelector("#rotation") as HTMLElement & {
        value: { x: number; y: number; z: number };
        default: { x: number; y: number; z: number };
        defaultValue: { x: number; y: number; z: number };
        isDefault: boolean;
        activate(): void;
        resetToDefault(): void;
      };
      input.activate();
      await new Promise(requestAnimationFrame);
      const editor = document.querySelector(
        "dialog.fig-input-rotate-popup fig-3d-rotate",
      ) as HTMLElement & {
        default: { x: number; y: number; z: number };
      };
      const events: Array<{ type: string; detail: unknown }> = [];
      input.addEventListener("input", (event) =>
        events.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        }),
      );
      input.addEventListener("change", (event) =>
        events.push({
          type: event.type,
          detail: (event as CustomEvent).detail,
        }),
      );
      const before = {
        value: input.value,
        default: input.default,
        defaultValue: input.defaultValue,
        isDefault: input.isDefault,
        editorDefault: editor.default,
      };
      input.resetToDefault();
      return {
        before,
        after: {
          value: input.value,
          isDefault: input.isDefault,
        },
        events,
      };
    });

    expect(state.before).toEqual({
      value: { x: 10, y: 20, z: 30 },
      default: { x: 1, y: 2, z: 3 },
      defaultValue: { x: 1, y: 2, z: 3 },
      isDefault: false,
      editorDefault: { x: 1, y: 2, z: 3 },
    });
    expect(state.after).toEqual({
      value: { x: 1, y: 2, z: 3 },
      isDefault: true,
    });
    expect(state.events).toEqual([
      { type: "input", detail: { x: 1, y: 2, z: 3 } },
      { type: "change", detail: { x: 1, y: 2, z: 3 } },
    ]);
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
