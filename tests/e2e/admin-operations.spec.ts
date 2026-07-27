import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS, E2E } from "./fixtures/ids";
import { adminClient } from "./fixtures/provision";

test.beforeEach(async ({ page }) => {
  await signIn(page, DEV_USERS.admin.email);
});

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("admin resolves an open exception and it leaves the queue", async ({ page }) => {
  await page.goto("/admin/exceptions");
  await expect(page.getByRole("heading", { name: /exceptions & incidents/i })).toBeVisible();

  // The seeded open hauler-missed exception for the E2E property (the admin view
  // aggregates all accounts, so scope to our fixture's address).
  const card = page
    .locator("li")
    .filter({ hasText: E2E.address })
    .filter({ hasText: /hauler missed/i })
    .first();
  await expect(card).toBeVisible();

  await card.getByPlaceholder(/resolution note/i).fill("Confirmed city-wide delay; recheck scheduled.");
  await card.getByRole("button", { name: /^Resolve$/ }).click();

  // The card leaves the open-exceptions list once the action revalidates.
  await expect(card).toBeHidden();

  // And it is resolved server-side.
  const db = adminClient();
  await expect
    .poll(async () => {
      const { data } = await db
        .from("exceptions")
        .select("status")
        .eq("id", E2E.openExceptionId)
        .single();
      return data?.status;
    })
    .toBe("resolved");
});

test("admin can schedule a hauler-delay recheck", async ({ page }) => {
  await page.goto("/admin/exceptions");
  const delayed = page.locator("li", { hasText: E2E.address }).filter({ hasText: /collection day/i }).first();
  await expect(delayed).toBeVisible();
  await delayed.getByLabel(/recheck date/i).fill(
    new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10),
  );
  await delayed.getByRole("button", { name: /schedule recheck/i }).click();

  const db = adminClient();
  await expect
    .poll(async () => {
      const { count } = await db
        .from("service_tasks")
        .select("id", { count: "exact", head: true })
        .eq("cycle_id", E2E.openCycleId)
        .eq("task_type", "recheck");
      return count ?? 0;
    })
    .toBeGreaterThanOrEqual(1);
});

test("admin reports page renders reliability and route-economics inputs", async ({ page }) => {
  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { name: /^Reports$/ })).toBeVisible();
  await expect(page.getByText(/proof rate/i)).toBeVisible();
  await expect(page.getByText(/route economics/i)).toBeVisible();
});

test("admin sets a route cell's map center point and it persists", async ({ page }) => {
  const db = adminClient();
  await page.goto("/admin/route-cells");
  await expect(page.getByRole("heading", { name: /^Route cells$/ })).toBeVisible();

  const { data: cell } = await db.from("route_cells").select("id").eq("slug", "prescott-lakes").single();

  await page.locator(`#center-lat-${cell!.id}`).fill("34.5511");
  await page.locator(`#center-lng-${cell!.id}`).fill("-112.469");
  await page.locator(`#center-lat-${cell!.id}`).locator("xpath=ancestor::form").getByRole("button", { name: /save/i }).click();

  await expect
    .poll(async () => {
      const { data } = await db
        .from("route_cells")
        .select("center_latitude, center_longitude")
        .eq("id", cell!.id)
        .single();
      return data;
    })
    .toMatchObject({ center_latitude: 34.5511, center_longitude: -112.469 });

  // Clean up so this test is idempotent against a re-run.
  await db.from("route_cells").update({ center_latitude: null, center_longitude: null }).eq("id", cell!.id);
});
