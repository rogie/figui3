import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { figui3Sections } from "../../playground/src/data/figui3Sections";
import { propskitSections } from "../../playground/src/data/propskitSections";
import {
  INSTALL_COMMAND,
  INSTALL_PROMPT,
} from "../../playground/src/lib/installPrompt";

test("installation prompt points agents to MIT core skills", () => {
  expect(INSTALL_COMMAND).toBe("npm i @rogieking/figui3");
  expect(INSTALL_PROMPT).toContain(
    "node_modules/@rogieking/figui3/.cursor/skills/",
  );
  for (const skill of ["figui3", "propskit"]) {
    expect(INSTALL_PROMPT).toContain(`${skill}/SKILL.md`);
  }
  expect(INSTALL_PROMPT).not.toContain("fig-lab");
});

test("core playground section ids stay unique", () => {
  const sections = [...propskitSections, ...figui3Sections];
  const sectionIds = sections.map((section) => section.id);
  expect(new Set(sectionIds).size).toBe(sectionIds.length);
  for (const section of sections) {
    const exampleIds = section.examples.map((example) => example.id);
    expect(new Set(exampleIds).size).toBe(exampleIds.length);
  }
});

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a playground port"));
        return;
      }
      server.close((error) =>
        error ? reject(error) : resolve(address.port),
      );
    });
  });
}

async function waitForServer(url: string, child: ChildProcess) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error("Playground server exited early");
    }
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out starting playground server");
}

test.describe.serial("core playground package split", () => {
  let child: ChildProcess;
  let url = "";

  test.beforeAll(async () => {
    const port = await availablePort();
    url = `http://127.0.0.1:${port}`;
    child = spawn(
      process.execPath,
      [
        path.resolve("playground/node_modules/vite/bin/vite.js"),
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      { cwd: path.resolve("playground"), stdio: "ignore" },
    );
    await waitForServer(url, child);
  });

  test.afterAll(() => {
    if (child?.exitCode === null) child.kill("SIGTERM");
  });

  test("redirects the removed Lab route to PropsKit", async ({ page }) => {
    await page.goto(`${url}/propskit/lab`);
    await expect(page).toHaveURL(`${url}/propskit`);
  });

  test("loads Full editor from the Extended dependency", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("includeEditorControls", "true");
    });
    await page.goto(`${url}/propskit`);
    await page.waitForFunction(() => customElements.get("fig-select"));
    expect(
      await page.evaluate(() => Boolean(customElements.get("fig-fill-picker"))),
    ).toBe(true);
  });
});
