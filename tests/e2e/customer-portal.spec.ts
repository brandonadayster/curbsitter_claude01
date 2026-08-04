import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS, E2E } from "./fixtures/ids";
import { adminClient } from "./fixtures/provision";

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

/**
 * PP-14: self-serve reschedule for a scheduled one-time CurbSitter onDemand
 * order. Both dates land on the fixture property's verified Wednesday
 * schedule (weekday 3).
 */
async function seedOrder(
  db: ReturnType<typeof adminClient>,
  orderId: string,
  requestedDate: string,
  taskStatus: "scheduled" | "assigned",
) {
  await db.from("orders").insert({
    id: orderId,
    account_id: E2E.accountId,
    property_id: E2E.propertyId,
    status: "scheduled",
    requested_date: requestedDate,
  });

  let routeId: string | null = null;
  if (taskStatus === "assigned") {
    const { data: route } = await db
      .from("routes")
      .insert({ route_date: requestedDate, task_type: "rollout", status: "published" })
      .select("id")
      .single();
    routeId = route!.id;
  }

  await db.from("service_tasks").insert([
    {
      property_id: E2E.propertyId,
      order_id: orderId,
      task_type: "rollout",
      status: taskStatus,
      route_id: routeId,
      window_start: `${requestedDate}T17:00:00-07:00`,
      window_end: `${requestedDate}T22:00:00-07:00`,
    },
    {
      property_id: E2E.propertyId,
      order_id: orderId,
      task_type: "return",
      status: taskStatus,
      route_id: routeId,
      window_start: `${requestedDate}T12:00:00-07:00`,
      window_end: `${requestedDate}T21:00:00-07:00`,
    },
  ]);
}

async function cleanupOrder(db: ReturnType<typeof adminClient>, orderId: string) {
  await db.from("service_tasks").delete().eq("order_id", orderId);
  await db.from("orders").delete().eq("id", orderId);
}

test("customer can reschedule a one-time order before its route is built", async ({ page }) => {
  const db = adminClient();
  const orderId = "e2e00000-0000-4000-8000-0000000000b1";
  await seedOrder(db, orderId, "2026-09-02", "scheduled");

  try {
    await page.goto("/app");
    await expect(page.getByRole("heading", { name: /your one-time service/i })).toBeVisible();
    await expect(page.getByText(/2026-09-02/)).toBeVisible();

    await page.getByLabel(/request a different pickup date/i).fill("2026-09-09");
    await page.getByRole("button", { name: /request new date/i }).click();

    await expect(page.getByText(/2026-09-09/)).toBeVisible();

    await expect
      .poll(async () => {
        const { data } = await db.from("orders").select("requested_date").eq("id", orderId).single();
        return data?.requested_date;
      })
      .toBe("2026-09-09");
  } finally {
    await cleanupOrder(db, orderId);
  }
});

test("reschedule is blocked once the route has been finalized", async ({ page }) => {
  const db = adminClient();
  const orderId = "e2e00000-0000-4000-8000-0000000000b2";
  await seedOrder(db, orderId, "2026-09-16", "assigned");

  try {
    await page.goto("/app");
    await expect(page.getByText(/2026-09-16/)).toBeVisible();
    await expect(page.getByText(/route for this service date has already been finalized/i)).toBeVisible();
    await expect(page.getByLabel(/request a different pickup date/i)).toHaveCount(0);
  } finally {
    await cleanupOrder(db, orderId);
    await db.from("routes").delete().eq("route_date", "2026-09-16").eq("task_type", "rollout");
  }
});
