import { defineConfig } from "@playwright/test";

/**
 * Pure import/unit specs (no browser fixture server).
 * Use when `bun` is unavailable or the test does not need /tests/figui/fixture.html.
 */
export default defineConfig({
  testDir: "./tests/figui",
  // Only specs that import modules and assert without page.goto.
  testMatch: /(build-info|playground-merge)\.spec\.ts/,
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
});
