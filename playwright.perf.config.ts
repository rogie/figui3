import { defineConfig, devices } from "@playwright/test";

const testPort = Number.parseInt(process.env.FIGUI_TEST_PORT ?? "3000", 10);
const baseURL = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/figui",
  testMatch: /.*-performance\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
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
      name: "perf",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
