import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS } from "./fixtures/ids";

/** Role-based sign-in and least-privilege routing. */

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("customer signs in and sees their account overview", async ({ page }) => {
  await signIn(page, DEV_USERS.customer.email);
  await expect(page.getByRole("heading", { name: /your account/i })).toBeVisible();
  await expect(page.getByText(DEV_USERS.customer.email)).toBeVisible();
});

test("runner signs in and reaches the runner route view", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto("/runner");
  await expect(page.getByRole("heading", { name: /my route/i })).toBeVisible();
});

test("admin reaches the operations console; a customer is redirected away", async ({ page }) => {
  await signIn(page, DEV_USERS.admin.email);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /operations overview/i })).toBeVisible();

  await signOut(page);

  // A customer hitting /admin is bounced to their own portal (server-side guard).
  await signIn(page, DEV_USERS.customer.email);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app(\/|$)/);
});
