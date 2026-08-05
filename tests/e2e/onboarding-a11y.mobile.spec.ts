import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile-viewport counterpart to onboarding-a11y.spec.ts. The onboarding
 * audience skews older and mobile-first (FRONTEND_GUIDELINES.md), and the
 * stage-3 rebuild's layout (day-picker grids, hazard multi-select, sticky
 * continue bars) genuinely reflows at Pixel 7 width, so this isn't a
 * duplicate of the desktop run — it's checking a different DOM/layout.
 */

async function assertNoSeriousViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, `${label}:\n${serious.map((v) => `${v.id}: ${v.help}`).join("\n")}`).toEqual([]);
}

test("no serious/critical a11y violations across the onboarding flow (mobile)", async ({ page }) => {
  await page.goto("/onboarding");
  await test.step("stage 1 — address, persona, property type", async () => {
    await assertNoSeriousViolations(page, "stage 1");
  });

  await page.getByLabel("Service street address").fill("77 Axe Test Ave");
  await page.getByLabel("ZIP code").fill("86301");
  await page.getByRole("button", { name: "Myself" }).click();
  await page.getByRole("button", { name: "Single-family home" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 2 — contact form", async () => {
    await expect(page.getByRole("heading", { name: /who should we contact/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 2");
  });

  await page.getByLabel("Name").fill("Axe Tester Mobile");
  await page.getByLabel("Email", { exact: true }).fill(`axe-mobile-${Date.now()}@e2e.curbsitter.test`);
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — plan (Choice, single-select)", async () => {
    await expect(page.getByRole("heading", { name: /which service do you want/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: plan");
  });
  await page.getByRole("button", { name: /CurbSitter Complete/ }).click();
  await page.getByRole("button", { name: "Monthly" }).click();

  await test.step("stage 3 — hasBoth (Choice, binary)", async () => {
    await expect(page.getByRole("heading", { name: /both trash and recycling/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: hasBoth");
  });
  await page.getByRole("button", { name: "Yes, both" }).click();

  await test.step("stage 3 — trashCount (CountPicker)", async () => {
    await expect(page.getByRole("heading", { name: /how many trash bins/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: trashCount");
  });
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "1", exact: true }).click(); // recyclingCount

  // Provider comes before the day questions. A private hauler is trusted
  // outright (D-025a), so the City cross-check never runs for this path.
  await test.step("stage 3 — provider (Choice, single-select)", async () => {
    await expect(page.getByRole("heading", { name: /who collects your trash/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: provider");
  });
  await page.getByRole("button", { name: "A private hauler" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — trashDay (DayPicker)", async () => {
    await expect(page.getByRole("heading", { name: /what day is your trash picked up/i })).toBeVisible();
    await expect(page.getByText(/no public source lists the hauler and collection day/i)).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: trashDay");
  });
  // D-025a: "I'm not sure" on a private hauler leaves nobody knowing the day,
  // so the signup proceeds and an admin resolves it — it must not dead-end.
  await page.getByRole("button", { name: /i'm not sure/i }).click();
  await page.getByRole("button", { name: "No, a different day" }).click();

  await test.step("stage 3 — recyclingDay (DayPicker, Complete plan — no coverage warning)", async () => {
    await expect(page.getByRole("heading", { name: /what day is your recycling picked up/i })).toBeVisible();
    await expect(page.getByText(/covers one collection day each week/i)).toHaveCount(0);
    await assertNoSeriousViolations(page, "stage 3: recyclingDay");
  });
  await page.getByRole("button", { name: "Friday" }).click();

  await test.step("stage 3 — hazards (Choice, multi-select)", async () => {
    await expect(page.getByRole("heading", { name: /anything we should plan for/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: hazards");
  });
  await page.getByRole("button", { name: "Bins in garage" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — storage (preset pills + text input)", async () => {
    await expect(page.getByRole("heading", { name: /where do the bins live/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: storage");
  });
  await page.getByRole("button", { name: "In the garage" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — curbNotes (optional text input)", async () => {
    await expect(page.getByRole("heading", { name: /where should the bins go at the curb/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: curbNotes");
  });
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — access (textarea, gated on gate/garage hazard)", async () => {
    await expect(page.getByRole("heading", { name: /how do we get to the bins/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: access");
  });
  await page.getByLabel(/gate or garage codes/i).fill("Garage code 5678");
  await page.getByRole("button", { name: /review/i }).click();

  await test.step("stage 4 — review and activate", async () => {
    await expect(page.getByRole("heading", { name: /review and activate/i })).toBeVisible();

    // This flow answered "I'm not sure" on a private hauler, so no day is
    // known. D-024 must not invent a pickup date here — the customer gets the
    // honest "we'll confirm it" notice instead.
    await expect(page.getByText(/Your first pickup:/)).toHaveCount(0);
    await expect(page.getByText(/don't have a collection day on file/i)).toBeVisible();

    await assertNoSeriousViolations(page, "stage 4");
  });
});
