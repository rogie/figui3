import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const readWorkspaceFile = (path: string) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("public JavaScript bundles import without browser globals", async () => {
  const script = `
    const bundles = ["fig.js", "fig-editor.js", "fig-lab.js"];
    await Promise.all(bundles.map((bundle) => import(\`./\${bundle}\`)));
    const { register } = await import("./register.js");
    await register({ editor: true, lab: true });
    console.log("ssr-import-ok");
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: workspace },
  );

  expect(stderr).toBe("");
  expect(stdout.trim()).toBe("ssr-import-ok");
});

test("explicit registration upgrades server markup and is idempotent", async ({
  page,
}) => {
  await page.goto("/tests/figui/ssr-fixture.html");
  const before = await page.evaluate(() => ({
    core: !!customElements.get("fig-button"),
    editor: !!customElements.get("fig-select"),
    lab: !!customElements.get("fig-canvas-control"),
  }));
  expect(before).toEqual({
    core: false,
    editor: false,
    lab: false,
  });

  const state = await page.evaluate(async () => {
    const registration = await import("/register.js");
    await registration.register({ editor: true, lab: true });
    const constructors = {
      core: customElements.get("fig-button"),
      editor: customElements.get("fig-select"),
      lab: customElements.get("fig-canvas-control"),
    };
    await registration.register({ editor: true, lab: true });
    const button = document.querySelector("#server-button");
    return {
      registered: Object.fromEntries(
        Object.entries(constructors).map(([key, value]) => [key, !!value]),
      ),
      idempotent:
        constructors.core === customElements.get("fig-button") &&
        constructors.editor === customElements.get("fig-select") &&
        constructors.lab === customElements.get("fig-canvas-control"),
      upgraded: !!constructors.core && button instanceof constructors.core,
    };
  });

  expect(state).toEqual({
    registered: { core: true, editor: true, lab: true },
    idempotent: true,
    upgraded: true,
  });
});

test("published guidance requires hydrate-before-register ordering", async () => {
  const [cursorGuide, packagedGuide, readme, packageJson] = await Promise.all([
    readWorkspaceFile(".cursor/skills/figui3/react.md"),
    readWorkspaceFile("skills/figui3/react.md"),
    readWorkspaceFile("README.md"),
    readWorkspaceFile("package.json"),
  ]);

  expect(cursorGuide).toBe(packagedGuide);
  for (const content of [cursorGuide, readme]) {
    expect(content).toContain("@rogieking/figui3/register.js");
    expect(content).toMatch(/after hydration|post-hydration/);
    expect(content).toMatch(/do not statically import/i);
  }

  const manifest = JSON.parse(packageJson);
  expect(manifest.exports["./register.js"].default).toBe(
    "./dist/register.js",
  );
  expect(manifest.exports["./register.js"].types).toBe(
    "./types/register.d.ts",
  );
  expect(manifest.exports["./src/register.js"]).toBe("./register.js");
  expect(manifest.files).toContain("register.js");
});
