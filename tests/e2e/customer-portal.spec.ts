import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS } from "./fixtures/ids";

test.beforeEach(async ({ page }) => {
  await signIn(page, DEV_USERS.customer.email);
});

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("service history shows proof photos and a resolved exception", async ({ page }) => {
  await page.goto("/app/history");
  await expect(page.getByRole("heading", { name: /service history/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /view rollout proof/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /view return proof/i })).toBeVisible();
  await expect(page.getByText(/bin blocked/i)).toBeVisible();
  await expect(page.getByText(/Resolution:/i).first()).toBeVisible();
});

test("a customer can only get a signed URL for their own proof photo", async ({ page }) => {
  // Own photo → authorized signed URL.
  const own = await page.request.get("/api/photos/e2e00000-0000-4000-8000-0000000000a1/url");
  expect(own.status()).toBe(200);
  expect((await own.json()).url).toContain("proof-photos");

  // Unknown/foreign photo → 404 (RLS denies the read).
  const foreign = await page.request.get("/api/photos/00000000-0000-4000-8000-000000000999/url");
  expect(foreign.status()).toBe(404);
});

test("billing self-service: pause then resume the subscription", async ({ page }) => {
  await page.goto("/app/billing");
  await expect(page.getByRole("heading", { name: /^Billing$/ })).toBeVisible();

  await page.getByRole("button", { name: /pause service/i }).click();
  await expect(page.getByText(/^Paused$/)).toBeVisible();

  await page.getByRole("button", { name: /resume service/i }).click();
  await expect(page.getByText(/^Active$/)).toBeVisible();
});

test("customer can open a support ticket", async ({ page }) => {
  await page.goto("/app/support");
  await page.getByLabel("Subject").fill("Question about my schedule");
  await page.getByLabel(/how can we help/i).fill("Can you confirm my Wednesday pickup day?");
  await page.getByRole("button", { name: /^Send$/ }).click();
  await expect(page.getByRole("heading", { name: /question about my schedule/i }).first()).toBeVisible();
});

test("overview shows a property map (or its fallback) for the seeded, located property", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: /your properties/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /88 Playwright Way/i })).toBeVisible();

  // Real canvas when WebGL is available, accessible fallback otherwise —
  // either is correct (see tests/e2e/service-areas-map.spec.ts for why).
  const canvas = page.locator(".mapboxgl-canvas");
  const fallback = page.getByText(/map view unavailable/i);
  await expect(canvas.or(fallback).first()).toBeVisible({ timeout: 10_000 });
});
