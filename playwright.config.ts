import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run e2e:server",
      url: "http://127.0.0.1:3100/api/health",
      reuseExistingServer: false,
      timeout: 30_000,
      env: { ...process.env, PORT: "3100" },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 30_000,
      env: { ...process.env, VITE_API_PROXY_TARGET: "http://127.0.0.1:3100" },
    },
  ],
});
