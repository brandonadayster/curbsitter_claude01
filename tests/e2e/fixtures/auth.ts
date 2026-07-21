import { expect, type Page } from "@playwright/test";

import { DEV_PASSWORD } from "./ids";

/**
 * Sign in with password (the seeded dev users). Lands on /app; callers that
 * need admin/runner surfaces navigate there afterward.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: /password instead/i }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: /^Sign In$/ }).click();
  // signInWithPassword redirects to /app on success.
  await page.waitForURL(/\/app(\/|$)/, { timeout: 15_000 });
}

export async function signOut(page: Page): Promise<void> {
  await page.request.post("/auth/signout");
  await page.context().clearCookies();
}

export async function expectSignedIn(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
}
