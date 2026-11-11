import { defineConfig, devices } from "@playwright/test";

const testPort = Number.parseInt(process.env.FIGUI_TEST_PORT ?? "3000", 10);
const baseURL = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/figui",
  testIgnore: /.*-performance\.spec\.ts/,
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `FIGUI_PORT=${testPort} bun server.ts`,
    url: `${baseURL}/tests/figui/fixture.html`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
