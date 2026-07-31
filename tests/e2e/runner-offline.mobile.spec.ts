import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS, E2E } from "./fixtures/ids";

/**
 * Offline proof-photo queue (PP-17).
 *
 * The behaviour that matters in the field: a photo captured with no signal is
 * kept on the device and uploads itself when signal returns. Before this
 * queue existed the capture was dropped while the UI claimed it had been
 * saved, so these assertions are the guard against that regressing.
 *
 * `mobileTaskId` is used rather than the live rollout task so this never
 * competes with runner-completion.spec.ts for the same cycle state.
 */

const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

test.afterEach(async ({ page }) => {
  await page.context().setOffline(false);
  await signOut(page);
});

test("a photo captured with no signal is queued on the device, not lost", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto(`/runner/tasks/${E2E.mobileTaskId}`);

  await page.getByRole("button", { name: /i've arrived/i }).click();
  await expect(page.getByRole("button", { name: /take proof photo/i })).toBeVisible();

  await page.context().setOffline(true);
  await page.setInputFiles('input[type="file"]', {
    name: "proof.jpg",
    mimeType: "image/jpeg",
    buffer: JPEG,
  });

  // The capture survived: it is on the device and the UI says so honestly.
  await expect(page.getByText(/saved on this device, waiting to upload/i)).toBeVisible();
  await expect(page.getByText(/no signal/i)).toBeVisible();

  // It must not count as proof yet — the photo has not reached the server.
  await expect(page.getByText(/proof photo uploaded/i)).toBeHidden();
});

test("the queue drains itself when signal returns", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto(`/runner/tasks/${E2E.mobileTaskId}`);

  await page.getByRole("button", { name: /i've arrived/i }).click();
  await page.context().setOffline(true);
  await page.setInputFiles('input[type="file"]', {
    name: "proof.jpg",
    mimeType: "image/jpeg",
    buffer: JPEG,
  });
  await expect(page.getByText(/saved on this device, waiting to upload/i)).toBeVisible();

  await page.context().setOffline(false);

  // No tap required — returning online drains the queue on its own.
  await expect(page.getByText(/saved on this device, waiting to upload/i)).toBeHidden({
    timeout: 15_000,
  });
});

test("the route list reports queued work instead of looking clean", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto(`/runner/tasks/${E2E.mobileTaskId}`);

  await page.getByRole("button", { name: /i've arrived/i }).click();
  await page.context().setOffline(true);
  await page.setInputFiles('input[type="file"]', {
    name: "proof.jpg",
    mimeType: "image/jpeg",
    buffer: JPEG,
  });
  await expect(page.getByText(/saved on this device, waiting to upload/i)).toBeVisible();

  // Still offline: the route list must not imply everything is uploaded.
  await page.goto("/runner");
  const sync = page.getByRole("region", { name: /sync status/i });
  await expect(sync).toBeVisible();
  await expect(sync.getByText(/waiting to upload/i)).toBeVisible();
  await expect(page.getByText(/photo queued/i)).toBeVisible();
});

test("sync status stays out of the way when there is nothing to report", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto("/runner");

  // Online with an empty queue: no banner, so the one that does appear means
  // something.
  await expect(page.getByRole("region", { name: /sync status/i })).toBeHidden();
});
