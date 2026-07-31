import { expect, test } from "@playwright/test";

import { signIn, signOut } from "./fixtures/auth";
import { DEV_USERS } from "./fixtures/ids";

/**
 * Customer portal on a phone (mobile project). The portal's audience skews
 * senior and mobile-first, so the primary destinations must be permanently
 * visible, large, and reachable without horizontal scrolling or a hidden
 * menu (PP-16, FRONTEND_GUIDELINES.md accessibility rules).
 */

test.afterEach(async ({ page }) => {
  await signOut(page);
});

test("primary destinations are large, always-visible tab targets", async ({ page }) => {
  await signIn(page, DEV_USERS.customer.email);
  await page.goto("/app");

  const tabBar = page.getByRole("navigation", { name: "Primary" });
  await expect(tabBar).toBeVisible();

  // Every primary destination is reachable without opening a menu.
  for (const label of ["Home", "History", "Billing", "Refer"]) {
    const tab = tabBar.getByRole("link", { name: label });
    await expect(tab).toBeVisible();

    // 44px is the project's minimum touch target; the tab bar targets 56px.
    const box = await tab.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  // The desktop header nav is hidden at this width, so it can't be the thing
  // satisfying the assertions above.
  await expect(page.getByRole("navigation", { name: "Account" })).toBeHidden();
});

test("current tab is exposed non-visually, not by color alone", async ({ page }) => {
  await signIn(page, DEV_USERS.customer.email);
  await page.goto("/app");

  const tabBar = page.getByRole("navigation", { name: "Primary" });
  await expect(tabBar.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");

  // "/app" must not stay current once a nested route is open.
  await tabBar.getByRole("link", { name: "Billing" }).click();
  await page.waitForURL(/\/app\/billing$/);
  await expect(tabBar.getByRole("link", { name: "Billing" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabBar.getByRole("link", { name: "Home" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("secondary destinations stay reachable without a hidden menu", async ({ page }) => {
  await signIn(page, DEV_USERS.customer.email);
  await page.goto("/app");

  const more = page.getByRole("navigation", { name: "More" });
  await expect(more.getByRole("link", { name: "Notifications" })).toBeVisible();
  await expect(more.getByRole("link", { name: "Support" })).toBeVisible();
});

test("portal does not scroll horizontally and the tab bar never covers content", async ({
  page,
}) => {
  await signIn(page, DEV_USERS.customer.email);
  await page.goto("/app");

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

  // Scrolled to the bottom, the last in-page content must clear the fixed bar.
  // `behavior: "instant"` is required: globals.css sets `scroll-behavior:
  // smooth` on <html>, and the two-argument scrollTo(x, y) form honours it,
  // so the measurement below would race the scroll animation.
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  });
  const support = page.getByRole("navigation", { name: "More" }).getByRole("link", {
    name: "Support",
  });
  const supportBox = await support.boundingBox();
  const tabBarBox = await page.getByRole("navigation", { name: "Primary" }).boundingBox();
  expect(supportBox).not.toBeNull();
  expect(tabBarBox).not.toBeNull();
  expect((supportBox?.y ?? 0) + (supportBox?.height ?? 0)).toBeLessThanOrEqual(tabBarBox?.y ?? 0);
});
