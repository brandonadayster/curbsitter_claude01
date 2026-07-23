import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility checks (WCAG 2.2 A/AA) on the key public pages.
 * Fails on serious/critical violations — the audience skews older, so this is
 * a launch requirement, not a nicety.
 */
const PUBLIC_PAGES = ["/", "/pricing", "/how-it-works", "/waitlist", "/faq"];

for (const path of PUBLIC_PAGES) {
  test(`no serious/critical a11y violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious,
      serious.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toEqual([]);
  });
}
