import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { bootFigFixture, collectPageErrors } from "./helpers";

const execFileAsync = promisify(execFile);
let bundle = "";
let temporaryDirectory = "";

test.beforeAll(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "figui-react-runtime-"));
  const output = join(temporaryDirectory, "react-runtime.js");
  await execFileAsync("bun", [
    "build",
    fileURLToPath(new URL("./react-runtime-entry.js", import.meta.url)),
    "--target=browser",
    "--format=esm",
    `--outfile=${output}`,
  ]);
  bundle = await readFile(output, "utf8");
});

test.afterAll(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("React 19 preserves DOM ownership and receives native event detail", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  await page.route("**/react-runtime.js", (route) =>
    route.fulfill({
      body: bundle,
      contentType: "text/javascript",
    }),
  );
  await bootFigFixture(page);
  await page.addScriptTag({
    type: "module",
    url: "/react-runtime.js",
  });
  await page.waitForFunction(() => Boolean((window as any).__figuiReactRuntime));

  await page.evaluate(() => {
    const root = document.querySelector("#fixture-root");
    (window as any).__figuiReactSession = (
      window as any
    ).__figuiReactRuntime.mount(root);
  });

  await expect(page.locator("#react-ticks")).toHaveCount(1);
  expect(
    await page.locator("#react-ticks").evaluate((element) => element.parentElement?.id),
  ).toBe("react-slider");

  await page.evaluate(() => {
    (window as any).__figuiReactSession.render(false);
  });
  await expect(page.locator("#react-ticks")).toHaveCount(0);
  await expect(page.locator("#react-slider")).toHaveCount(1);

  await page.locator("#react-checkbox input").click();
  await page.locator("#react-number input").fill("42");
  const state = await page.evaluate(() => {
    const session = (window as any).__figuiReactSession;
    return {
      inputDetails: session.inputDetails,
      numberDetails: session.numberDetails,
      recoverableErrors: session.recoverableErrors,
    };
  });
  expect(state).toEqual({
    inputDetails: [{ checked: true, value: "yes" }],
    numberDetails: [42],
    recoverableErrors: [],
  });

  await page.evaluate(() => {
    (window as any).__figuiReactSession.unmount();
  });
  await expect(page.locator("#fixture-root")).toBeEmpty();
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
});
