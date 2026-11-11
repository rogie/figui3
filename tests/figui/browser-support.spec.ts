import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const readWorkspaceFile = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("published browser support matches the cross-browser test matrix", async () => {
  const [readme, config, workflow] = await Promise.all([
    readWorkspaceFile("README.md"),
    readWorkspaceFile("playwright.config.ts"),
    readWorkspaceFile(".github/workflows/browser-tests.yml"),
  ]);

  expect(readme).toContain("Chrome/Edge 123+");
  expect(readme).toContain("Firefox 120+");
  expect(readme).toContain("Safari 17.5+");
  expect(readme).not.toContain("Chrome/Edge 67+");
  expect(readme).not.toContain("Firefox 63+");
  expect(readme).not.toContain("Safari 10.1+");

  for (const browser of ["chromium", "firefox", "webkit"]) {
    expect(config).toContain(`name: "${browser}"`);
    expect(workflow).toMatch(new RegExp(`- ${browser}\\b`));
  }
});
