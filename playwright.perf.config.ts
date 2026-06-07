import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/figui",
  testMatch: /.*-performance\.spec\.ts/,
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "bun server.ts",
    url: "http://127.0.0.1:3000/tests/figui/fixture.html",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: "perf",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
