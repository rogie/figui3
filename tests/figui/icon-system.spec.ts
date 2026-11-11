import { readdir, readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import {
  FIG_ICON_MANIFEST,
  FIG_ICON_TOKENS,
} from "../../icons/manifest.js";
import { bootFigFixture, collectPageErrors } from "./helpers";

const workspacePath = new URL("../../", import.meta.url);
const readWorkspaceFile = (path: string) =>
  readFile(new URL(path, workspacePath), "utf8");

test("manifest, SVG sources, and generated CSS stay in sync", async () => {
  const expectedTokens = FIG_ICON_MANIFEST.flatMap((icon) =>
    icon.sizes.map((size) => `${size}-${icon.name}`),
  ).sort();
  const css = await readWorkspaceFile("icons.css");
  const cssTokens = Array.from(
    css.matchAll(/--icon-(\d+-[a-z0-9-]+):/g),
    (match) => match[1],
  ).sort();

  const iconRoot = new URL("icons/", workspacePath);
  const sourceTokens = (
    await Promise.all(
      [14, 16, 24].map(async (size) => {
        const directory = new URL(`${size}/`, iconRoot);
        const files = await readdir(directory);
        return files
          .filter((file) => file.endsWith(".svg"))
          .map((file) => `${size}-${file.replace(/\.svg$/, "")}`);
      }),
    )
  )
    .flat()
    .sort();

  expect(cssTokens).toEqual(expectedTokens);
  expect(sourceTokens).toEqual(expectedTokens);
  expect(new Set(expectedTokens).size).toBe(64);
});

test("icons load from both standalone and default CSS entry points", async ({
  page,
}) => {
  collectPageErrors(page);
  await page.goto("/tests/figui/ssr-fixture.html");
  await page.setContent(
    '<link rel="stylesheet" href="/icons.css"><div id="standalone"></div>',
  );
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--icon-24-add")
        .trim() !== "",
  );
  const standalone = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--icon-24-add")
      .trim(),
  );
  expect(standalone).toContain("data:image/svg+xml,");

  await bootFigFixture(page);
  const bundled = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--icon-24-add")
      .trim(),
  );
  expect(bundled).toContain("data:image/svg+xml,");
});

test("fig-icon follows the shared token registry", async ({ page }) => {
  collectPageErrors(page);
  await bootFigFixture(page);

  const cases = Object.entries(FIG_ICON_TOKENS).flatMap(([name, token]) => {
    if (typeof token === "string") {
      return [
        { name, size: "medium", expected: `var(${token})` },
        { name, size: "small", expected: `var(${token})` },
      ];
    }
    return [
      { name, size: "medium", expected: `var(${token.medium})` },
      { name, size: "small", expected: `var(${token.small})` },
    ];
  });

  const actual = await page.evaluate((iconCases) => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    return iconCases.map(({ name, size }) => {
      const icon = document.createElement("fig-icon");
      icon.setAttribute("name", name);
      icon.setAttribute("size", size);
      root.append(icon);
      return icon.style.getPropertyValue("--icon");
    });
  }, cases);

  expect(actual).toEqual(cases.map(({ expected }) => expected));
});

test("unknown names clear the glyph and icon tokens remain overridable", async ({
  page,
}) => {
  collectPageErrors(page);
  await bootFigFixture(page);

  const result = await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    if (!root) throw new Error("Missing #fixture-root");
    const icon = document.createElement("fig-icon");
    icon.setAttribute("name", "add");
    root.append(icon);
    icon.setAttribute("name", "not-an-icon");

    document.documentElement.style.setProperty(
      "--icon-24-add",
      'url("/custom-icon.svg")',
    );
    return {
      unknown: icon.style.getPropertyValue("--icon"),
      override: getComputedStyle(document.documentElement)
        .getPropertyValue("--icon-24-add")
        .trim(),
    };
  });

  expect(result.unknown).toBe("");
  expect(result.override).toContain("/custom-icon.svg");
});
