import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS, E2E } from "./fixtures/ids";

/** Runner critical screens must be usable on a phone (mobile project). */

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("runner task view is usable on a mobile viewport with large controls", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto(`/runner/tasks/${E2E.mobileTaskId}`);

  await expect(page.getByRole("heading", { name: /roll out bins/i })).toBeVisible();

  // Primary action is a large, tappable control (≥44px tall).
  const arrived = page.getByRole("button", { name: /i've arrived/i });
  await expect(arrived).toBeVisible();
  const box = await arrived.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  // No horizontal overflow on the narrow viewport.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});
