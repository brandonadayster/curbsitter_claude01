import { expect, test } from "@playwright/test";

/**
 * The route-cell status map is additive to the existing accessible text list
 * on /service-areas — never a replacement, and it must degrade gracefully.
 *
 * This asserts "map renders OR fallback renders" rather than requiring a real
 * Mapbox canvas: headless/sandboxed Chromium (including this local env and
 * many CI runners without GPU passthrough) can lack WebGL, which makes
 * MapBase's `onError` path fire and show `RouteCellMapFallback` instead —
 * that is the correct, intended behavior, not a bug. NEXT_PUBLIC_* vars are
 * also inlined by Next.js at build time, so a live "missing token" case isn't
 * practical to exercise separately here; both branches converge on the same
 * fallback UI, which this test already covers.
 */
test("service-areas page shows the map or its accessible fallback, never a broken page", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/service-areas");
  await expect(page.getByRole("heading", { name: /route status by neighborhood/i })).toBeVisible();

  // Accessible text list stays present and is the source of truth either way.
  // `.first()`: RouteCellMapFallback shows its own copy of the same cell
  // names when the map can't render, so "Prescott Lakes" can legitimately
  // appear twice (page list + fallback list) — either is a correct pass.
  await expect(page.getByText(/prescott lakes/i).first()).toBeVisible();

  // Exactly one of: a real Mapbox canvas (WebGL available) or the labeled
  // fallback region (WebGL unavailable / token missing) — never neither.
  const canvas = page.locator(".mapboxgl-canvas");
  const fallback = page.getByText(/map view unavailable/i);
  await expect(canvas.or(fallback).first()).toBeVisible({ timeout: 10_000 });

  // No uncaught exceptions reached the page (a caught WebGL init error inside
  // MapBase's onError handler doesn't count as one).
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("no waitlist/lead counts leak onto the public map or list", async ({ page }) => {
  await page.goto("/service-areas");
  await expect(page.getByText(/waiting lead/i)).toHaveCount(0);
  await expect(page.getByText(/\d+\s*(people|leads?|signups?)\b/i)).toHaveCount(0);
});
