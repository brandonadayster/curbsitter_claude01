import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E suite for CurbSitter's critical flows (AGENTS.md testing
 * requirements). Runs against the local dev server + local Supabase stack.
 * global-setup provisions deterministic fixtures via the service role.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // `*.mobile.spec.ts` belongs to the mobile project only. Without this
      // the desktop project also picks those files up, and specs asserting
      // mobile-only UI (the portal tab bar, the admin map sheet — both
      // `sm:hidden`) fail at desktop width for the right reason and the
      // wrong test. The naming convention now actually selects a viewport.
      testIgnore: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
