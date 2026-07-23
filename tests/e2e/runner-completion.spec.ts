import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS, E2E } from "./fixtures/ids";
import { adminClient } from "./fixtures/provision";

/** Runner completes an assigned rollout with the required proof photo. */

test.afterEach(async ({ page }) => {
  await signOut(page);
});

// 1x1 JPEG bytes for the proof upload.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

test("runner completes a rollout: proof required, then cycle advances to collection_pending", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto(`/runner/tasks/${E2E.liveRolloutTaskId}`);

  await expect(page.getByRole("heading", { name: /roll out bins/i })).toBeVisible();

  // Audited access reveal (no secret on file for this property → graceful message).
  await page.getByRole("button", { name: /reveal access details/i }).click();

  await page.getByRole("button", { name: /i've arrived/i }).click();

  // Complete is gated on a proof photo.
  await expect(page.getByText(/proof photo is required/i)).toBeVisible();

  await page.setInputFiles('input[type="file"]', {
    name: "proof.jpg",
    mimeType: "image/jpeg",
    buffer: JPEG,
  });
  await expect(page.getByText(/proof photo uploaded/i)).toBeVisible();

  await page.getByRole("button", { name: /complete stop/i }).click();
  await page.waitForURL(/\/runner$/);

  // The cycle advanced server-side.
  const db = adminClient();
  const { data: cycle } = await db
    .from("collection_cycles")
    .select("state")
    .eq("id", E2E.liveCycleId)
    .single();
  expect(cycle?.state).toBe("collection_pending");
});

test("runner can file a safety incident", async ({ page }) => {
  await signIn(page, DEV_USERS.runner.email);
  await page.goto("/runner/incidents/new");
  await page.getByLabel(/serious/i).check();
  await page.getByLabel(/what happened/i).fill("Loose dog at the gate; owner recalled it, no contact.");
  await page.getByRole("button", { name: /send report/i }).click();
  await expect(page.getByRole("heading", { name: /incident reported/i })).toBeVisible();
});
