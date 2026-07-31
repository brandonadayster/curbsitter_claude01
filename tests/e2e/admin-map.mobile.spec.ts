import { expect, test, type Page } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS } from "./fixtures/ids";

/**
 * Mobile (map-first) layout of /admin/map — PP-12. The map is the page and
 * everything else lives in a drag-up sheet, with layers collapsed behind one
 * control.
 *
 * Locators are scoped to the mobile layout: the desktop layout is still in
 * the DOM (hidden with `display: none`) and carries the same data, so
 * unscoped accessible-name locators would match twice.
 */
const mobile = (page: Page) => page.getByTestId("admin-map-mobile");

test.beforeEach(async ({ page }) => {
  await signIn(page, DEV_USERS.admin.email);
  await page.goto("/admin/map");
});

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("details sheet is collapsed by default and expands on tap", async ({ page }) => {
  const view = mobile(page);

  const toggle = view.getByRole("button", { name: /show details/i });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  // Collapsed: search and metrics peek, but the lists are not reachable.
  await expect(view.getByLabel(/search cells and properties/i)).toBeVisible();
  await expect(view.getByRole("heading", { name: "Route cells" })).toBeHidden();

  await toggle.click();
  await expect(view.getByRole("button", { name: /hide details/i })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(view.getByRole("heading", { name: "Route cells" })).toBeVisible();
  await expect(view.getByRole("heading", { name: "Properties" })).toBeVisible();
});

test("sheet toggle is a real button meeting the touch-target minimum", async ({ page }) => {
  const toggle = mobile(page).getByRole("button", { name: /show details/i });
  const box = await toggle.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("layer control collapses and still reports how many layers are on", async ({ page }) => {
  const view = mobile(page);

  // Collapsed state names the active count without needing a tap.
  const layers = view.getByText(/layers · 2 on/i);
  await expect(layers).toBeVisible();

  await layers.click();
  const properties = view.getByLabel(/^properties$/i);
  await expect(properties).toBeVisible();

  await properties.uncheck();
  await expect(view.getByText(/layers · 1 on/i)).toBeVisible();

  // A layer that is off leaves the sheet list too, so the two never disagree.
  await view.getByRole("button", { name: /show details/i }).click();
  await expect(view.getByRole("heading", { name: "Properties" })).toBeHidden();
  await expect(view.getByRole("heading", { name: "Route cells" })).toBeVisible();
});

test("search filters the sheet lists", async ({ page }) => {
  const view = mobile(page);
  await view.getByRole("button", { name: /show details/i }).click();

  await view.getByLabel(/search cells and properties/i).fill("no-such-query-zzz");
  await expect(view.getByText(/no matching route cells/i)).toBeVisible();
  await expect(view.getByText(/no matching properties/i)).toBeVisible();
});

test("page does not scroll horizontally at mobile width", async ({ page }) => {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});
