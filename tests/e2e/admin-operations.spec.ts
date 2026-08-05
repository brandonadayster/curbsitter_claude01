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

/**
 * PP-14 prerequisite (finishes P6-02): a one-time CurbSitter onDemand order
 * goes through the same serviceability review as subscriptions, and
 * approving it generates the rollout/return visit tasks.
 */
test("admin approves a one-time onDemand order and it generates the visit tasks", async ({ page }) => {
  const db = adminClient();
  const orderId = "e2e00000-0000-4000-8000-0000000000b3";
  await db.from("orders").insert({
    id: orderId,
    account_id: E2E.accountId,
    property_id: E2E.propertyId,
    status: "requested",
  });

  try {
    await page.goto("/admin/reviews");
    await expect(page.getByRole("heading", { name: /one-time ondemand orders/i })).toBeVisible();

    // Pending orders no longer display a customer-supplied date (signup only
    // asks for a collection day; the actual date is derived at approval), so
    // the card is matched on address alone — unique among this test's fixtures.
    const card = page.locator("li").filter({ hasText: E2E.address }).filter({ hasText: /CurbSitter onDemand/ });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /^Approve$/ }).click();

    await expect(card).toBeHidden();

    await expect
      .poll(async () => {
        const { data } = await db.from("orders").select("status").eq("id", orderId).single();
        return data?.status;
      })
      .toBe("scheduled");

    const { count } = await db
      .from("service_tasks")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);
    expect(count).toBe(2);
  } finally {
    await db.from("service_tasks").delete().eq("order_id", orderId);
    await db.from("orders").delete().eq("id", orderId);
  }
});

/**
 * D-025 revision / D-027: a customer who didn't know their collection day and
 * whose address the City doesn't cover still completes signup — the day is
 * resolved here, by hand, from the hauler's own schedule tool. Without this
 * control the property has no weekday, so no visit could ever be scheduled.
 */
test("admin resolves an unknown collection day from the review queue", async ({ page }) => {
  const db = adminClient();
  const orderId = "e2e00000-0000-4000-8000-0000000000b4";

  // Put the shared fixture property into the "nobody knows the day" state.
  await db
    .from("collection_schedules")
    .update({ weekday: null, verification_status: "needs_review", needs_review_reason: "customer_unsure" })
    .eq("id", E2E.scheduleId);
  await db.from("orders").insert({
    id: orderId,
    account_id: E2E.accountId,
    property_id: E2E.propertyId,
    status: "requested",
  });

  try {
    await page.goto("/admin/reviews");
    const card = page.locator("li").filter({ hasText: E2E.address }).filter({ hasText: /CurbSitter onDemand/ });
    await expect(card).toBeVisible();

    // The reviewer is told what to do, not just that something is wrong.
    await expect(card.getByText(/look it up in the hauler's own schedule tool/i)).toBeVisible();

    await card.getByLabel(/collection day/i).selectOption("5");
    await card.getByPlaceholder(/e\.g\. WM/i).fill("WM");
    await card.getByRole("button", { name: /save day/i }).click();

    await expect
      .poll(async () => {
        const { data } = await db
          .from("collection_schedules")
          .select("weekday, verification_status, needs_review_reason, provider")
          .eq("id", E2E.scheduleId)
          .single();
        return data;
      })
      .toMatchObject({
        weekday: 5,
        verification_status: "verified",
        needs_review_reason: null,
        provider: "WM",
      });

    // With a day on file the order is now approvable, which it wasn't before.
    await card.getByRole("button", { name: /^Approve$/ }).click();
    await expect
      .poll(async () => {
        const { data } = await db.from("orders").select("status").eq("id", orderId).single();
        return data?.status;
      })
      .toBe("scheduled");
  } finally {
    await db.from("service_tasks").delete().eq("order_id", orderId);
    await db.from("orders").delete().eq("id", orderId);
    // Restore the shared fixture for other specs.
    await db
      .from("collection_schedules")
      .update({
        weekday: 3,
        verification_status: "verified",
        needs_review_reason: null,
        provider: "City of Prescott",
      })
      .eq("id", E2E.scheduleId);
  }
});
