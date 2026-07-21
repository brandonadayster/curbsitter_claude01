import { expect, test } from "@playwright/test";

/**
 * Public acquisition flows: address check, waitlist join, and the
 * buy-for-someone-else onboarding path. No auth or Stripe required.
 */

test("address check on a Prescott ZIP returns a waitlist outcome and offers the waitlist", async ({ page }) => {
  await page.goto("/");
  const addressForm = page.locator("#address-check");
  await addressForm.getByLabel("Street address").fill("123 Example Dr");
  await addressForm.getByLabel("ZIP code").fill("86301");
  await addressForm.getByRole("button", { name: /check my address/i }).click();

  // No active cells are seeded, so a Prescott ZIP resolves to waitlist.
  await expect(page.getByRole("heading", { name: /route hasn't opened yet/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /join the waitlist/i })).toBeVisible();
});

test("address check outside the service region shows an unavailable state", async ({ page }) => {
  await page.goto("/");
  const addressForm = page.locator("#address-check");
  await addressForm.getByLabel("Street address").fill("1 Nowhere Rd");
  await addressForm.getByLabel("ZIP code").fill("10001");
  await addressForm.getByRole("button", { name: /check my address/i }).click();

  await expect(page.getByRole("heading", { name: /not in our service area yet/i })).toBeVisible();
});

test("visitor can join the waitlist and receives a personal share link", async ({ page }) => {
  const email = `wl-${Date.now()}@e2e.curbsitter.test`;
  await page.goto("/waitlist");

  await page.getByLabel("Name").fill("Wait Lister");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("ZIP code").fill("86301");
  await page.getByRole("button", { name: /join the waitlist/i }).click();

  await expect(page.getByRole("heading", { name: /you're on the list/i })).toBeVisible();
  await expect(page.getByText(/\/waitlist\?ref=/)).toBeVisible();
});

test("onboarding supports buying for someone else and reveals recipient fields", async ({ page }) => {
  await page.goto("/onboarding");

  // Stage 1: address + "someone else".
  await page.getByLabel("Service street address").fill("200 Gift St");
  await page.getByLabel("ZIP code").fill("86303");
  await page.getByLabel(/someone else/i).check();
  await page.getByRole("button", { name: /continue/i }).click();

  // Stage 2: recipient section appears because the service is for someone else.
  await expect(page.getByRole("heading", { name: /service recipient/i })).toBeVisible();
  await page.getByLabel("Name").first().fill("Paying Child");
  await page.getByLabel("Email").first().fill(`payer-${Date.now()}@e2e.curbsitter.test`);
});

test("pricing page shows the locked Home and Complete prices", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("$59", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("$89", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/\$159\/quarter/i).first()).toBeVisible();
});
