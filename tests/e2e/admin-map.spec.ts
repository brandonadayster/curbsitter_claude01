import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS, E2E } from "./fixtures/ids";
import { adminClient } from "./fixtures/provision";

/**
 * Desktop (chromium project) behaviour of /admin/map. The page renders two
 * layouts — a mobile map-first sheet and this stacked one — and hides the
 * inactive one with `display: none`. Both carry the same data, so locators
 * are scoped to the desktop layout to avoid matching the mobile copy.
 * Mobile behaviour lives in admin-map.mobile.spec.ts.
 */
const desktop = (page: import("@playwright/test").Page) =>
  page.getByTestId("admin-map-desktop");

test.beforeEach(async ({ page }) => {
  await signIn(page, DEV_USERS.admin.email);
});

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("admin map shows route cells and properties with real economics data", async ({ page }) => {
  const db = adminClient();
  const { data: cell } = await db.from("route_cells").select("id").eq("slug", "prescott-lakes").single();

  // No other seed/fixture links a property to this cell, so pointing the E2E
  // property at it for the duration of this test makes its active-property
  // count and MRR exact and deterministic (home plan, monthly = $65.00).
  await db.from("properties").update({ route_cell_id: cell!.id }).eq("id", E2E.propertyId);

  try {
    await page.goto("/admin/map");
    await expect(page.getByRole("heading", { name: /^Map$/ })).toBeVisible();

    // The always-rendered accessible tables carry the same data as the map —
    // this is what actually renders in this WebGL-less environment, since
    // MapBase's onError fallback fires here just as it does in CI.
    const propertyRow = desktop(page).locator("tr").filter({ hasText: E2E.address });
    await expect(propertyRow).toBeVisible();
    await expect(propertyRow).toContainText(E2E.city);
    await expect(propertyRow).toContainText("Playwright Household");
    await expect(propertyRow).toContainText(/active/i);
    await expect(propertyRow).toContainText("Prescott Lakes");

    // Scope to the slug ("prescott-lakes"), not the cell name — the property
    // row's "Route cell" column also renders "Prescott Lakes" once linked.
    const cellRow = desktop(page).locator("tr").filter({ hasText: "prescott-lakes" });
    await expect(cellRow).toBeVisible();
    await expect(cellRow).toContainText("$65");
  } finally {
    await db.from("properties").update({ route_cell_id: null }).eq("id", E2E.propertyId);
  }
});

test("admin map search narrows both tables and shows empty states on no match", async ({ page }) => {
  await page.goto("/admin/map");

  const view = desktop(page);
  const search = view.getByLabel(/^search$/i);
  await search.fill(E2E.address);
  await expect(view.locator("tr").filter({ hasText: E2E.address })).toBeVisible();
  await expect(view.getByText(/no matching route cells/i)).toBeVisible();

  await search.fill("prescott-lakes");
  await expect(view.locator("tr").filter({ hasText: "Prescott Lakes" })).toBeVisible();
  await expect(view.getByText(/no matching properties/i)).toBeVisible();

  await search.fill("no-such-query-zzz");
  await expect(view.getByText(/no matching route cells/i)).toBeVisible();
  await expect(view.getByText(/no matching properties/i)).toBeVisible();
});

test("admin map layer toggles hide the corresponding table", async ({ page }) => {
  await page.goto("/admin/map");

  const view = desktop(page);
  await expect(view.getByRole("heading", { name: "Properties" })).toBeVisible();
  await expect(view.getByRole("heading", { name: "Route cells" })).toBeVisible();

  await view.getByLabel(/^properties$/i).uncheck();
  await expect(view.getByRole("heading", { name: "Properties" })).toBeHidden();
  await expect(view.getByRole("heading", { name: "Route cells" })).toBeVisible();

  await view.getByLabel(/^properties$/i).check();
  await view.getByLabel(/^route cells$/i).uncheck();
  await expect(view.getByRole("heading", { name: "Route cells" })).toBeHidden();
  await expect(view.getByRole("heading", { name: "Properties" })).toBeVisible();
});
