import { expect, test } from "@playwright/test";

async function bootPropsKitFixture(page: import("@playwright/test").Page) {
  await page.goto("/tests/figui/propskit-fixture.html");
  await page.waitForFunction(() => window.__propskitReady === true);
  await page.waitForFunction(() => customElements.get("propskit-slider"));
}

test.describe("PropsKit isolation", () => {
  test.beforeEach(async ({ page }) => {
    await bootPropsKitFixture(page);
  });

  test("does not restyle host button outside .figui-root", async ({ page }) => {
    const hostBg = await page.locator("#host-button").evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    const hostDisplay = await page.locator("#host-button").evaluate((el) => {
      return getComputedStyle(el).display;
    });

    // FigUI brand buttons use flex + brand fill; host should stay native-ish.
    expect(hostDisplay === "inline-block" || hostDisplay === "inline" || hostDisplay === "block").toBe(
      true,
    );
    // Not the FigUI brand blue (approx). Allow transparent/default.
    expect(hostBg).not.toMatch(/rgb\(11,\s*106,\s*255\)|rgb\(13,\s*153,\s*255\)/i);
  });

  test("styles controls inside .figui-root", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById("panel-root");
      if (!root || !window.createPropsKit) throw new Error("missing mount");
      window.createPropsKit(
        root,
        "Layer",
        {
          opacity: [75, 0, 100, 1],
          visible: true,
        },
        { theme: "system" },
      );
    });

    await expect(page.locator("propskit-slider")).toHaveCount(1);
    await expect(page.locator("propskit-switch")).toHaveCount(1);

    const panelButton = page.locator("#panel-root button").first();
    // Panel may not include a raw button; create one to verify scope.
    await page.evaluate(() => {
      const root = document.getElementById("panel-root");
      const button = document.createElement("button");
      button.id = "panel-button";
      button.textContent = "Panel";
      root?.append(button);
    });

    const panelBg = await page.locator("#panel-button").evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    const hostBg = await page.locator("#host-button").evaluate((el) => {
      return getComputedStyle(el).backgroundColor;
    });
    expect(panelBg).not.toEqual(hostBg);
  });

  test("theme=dark forces dark color-scheme on panel and overlay root", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const root = document.getElementById("panel-root");
      if (!root || !window.createPropsKit) throw new Error("missing mount");
      window.createPropsKit(
        root,
        "Layer",
        { opacity: [50, 0, 100, 1] },
        { theme: "dark" },
      );
      // Ensure overlay root exists and syncs
      window.applyFiguiTheme?.(root, "dark");
      root.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    await expect(page.locator("#panel-root")).toHaveAttribute("theme", "dark");
    await expect(page.locator("#panel-root")).toHaveClass(/figma-dark/);

    const scheme = await page.locator("#panel-root").evaluate((el) => {
      return getComputedStyle(el).colorScheme;
    });
    expect(scheme).toContain("dark");

    const overlayTheme = await page.evaluate(() => {
      const overlay = document.querySelector("[data-figui-overlay-root]");
      if (!overlay) {
        // create via helper path
        const root = document.getElementById("panel-root");
        root?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      }
      const node = document.querySelector("[data-figui-overlay-root]");
      return {
        hasDark: node?.classList.contains("figma-dark") ?? false,
        theme: node?.getAttribute("theme"),
      };
    });
    expect(overlayTheme.hasDark || overlayTheme.theme === "dark").toBeTruthy();
  });

  test("theme=system does not force figma-dark/light classes", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById("panel-root");
      if (!root || !window.createPropsKit) throw new Error("missing mount");
      window.createPropsKit(root, "Layer", { opacity: [10, 0, 100] }, { theme: "system" });
    });

    await expect(page.locator("#panel-root")).toHaveAttribute("theme", "system");
    const classes = await page.locator("#panel-root").getAttribute("class");
    expect(classes || "").not.toMatch(/\bfigma-dark\b/);
    expect(classes || "").not.toMatch(/\bfigma-light\b/);
  });

  test("createPropsKit emits onChange from control interaction", async ({ page }) => {
    await page.evaluate(() => {
      const root = document.getElementById("panel-root");
      if (!root || !window.createPropsKit) throw new Error("missing mount");
      window.__lastChange = null;
      window.createPropsKit(
        root,
        "Layer",
        { visible: true },
        {
          theme: "system",
          onChange: (path, value) => {
            window.__lastChange = { path, value };
          },
        },
      );
    });

    await page.locator("propskit-switch").click();
    await expect
      .poll(async () => page.evaluate(() => window.__lastChange?.path ?? null))
      .toBe("visible");
  });
});

declare global {
  interface Window {
    __propskitReady?: boolean;
    createPropsKit?: typeof import("../../propskit-core.js").createPropsKit;
    applyFiguiTheme?: typeof import("../../propskit-core.js").applyFiguiTheme;
    __lastChange?: { path: string; value: unknown } | null;
  }
}
