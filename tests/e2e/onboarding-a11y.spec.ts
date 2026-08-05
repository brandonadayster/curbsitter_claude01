import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility checks (WCAG 2.2 A/AA) on the rebuilt onboarding
 * stage-3 sub-wizard (click-to-answer Q&A). Same severity gate as
 * tests/e2e/a11y.spec.ts, but that file only ever scanned page-load state —
 * stage 3's ~13 question types are reached through interaction and were
 * never covered. Walks one instance of every distinct control (Choice
 * single-select, Choice binary, CountPicker, DayPicker, DayPicker with the
 * Home-plan coverage warning, optional text input, Choice multi-select,
 * preset pills, and the gated access textarea) plus stage 4.
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

test("no serious/critical a11y violations across the onboarding flow", async ({ page }) => {
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

  await page.getByLabel("Name").fill("Axe Tester");
  await page.getByLabel("Email", { exact: true }).fill(`axe-${Date.now()}@e2e.curbsitter.test`);
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — plan (Choice, single-select)", async () => {
    await expect(page.getByRole("heading", { name: /which service do you want/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: plan");
  });
  await page.getByRole("button", { name: /CurbSitter Home/ }).click();
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

  // Provider comes before the day questions: a private hauler skips the City
  // cross-check entirely rather than being shown a conflict about a hauler
  // that isn't theirs.
  await test.step("stage 3 — provider (Choice, single-select)", async () => {
    await expect(page.getByRole("heading", { name: /who collects your trash/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: provider");
  });
  await page.getByRole("button", { name: "A private hauler" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — trashDay (DayPicker)", async () => {
    await expect(page.getByRole("heading", { name: /what day is your trash picked up/i })).toBeVisible();
    // D-025 revision: the accuracy disclaimer is part of this screen.
    await expect(page.getByText(/no public source lists the hauler and collection day/i)).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: trashDay");
  });
  await page.getByRole("button", { name: "Wednesday" }).click();
  await page.getByRole("button", { name: "No, a different day" }).click();

  await test.step("stage 3 — recyclingDay (DayPicker + Home coverage warning)", async () => {
    await expect(page.getByRole("heading", { name: /what day is your recycling picked up/i })).toBeVisible();
    await expect(page.getByText(/covers one collection day each week/i)).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: recyclingDay");
  });
  await page.getByRole("button", { name: "Friday" }).click();

  await test.step("stage 3 — hazards (Choice, multi-select)", async () => {
    await expect(page.getByRole("heading", { name: /anything we should plan for/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: hazards");
  });
  await page.getByRole("button", { name: "Gate" }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  await test.step("stage 3 — storage (preset pills + text input)", async () => {
    await expect(page.getByRole("heading", { name: /where do the bins live/i })).toBeVisible();
    await assertNoSeriousViolations(page, "stage 3: storage");
  });
  await page.getByRole("button", { name: "Side yard" }).click();
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
  await page.getByLabel(/gate or garage codes/i).fill("Gate code 1234");
  await page.getByRole("button", { name: /review/i }).click();

  await test.step("stage 4 — review and activate", async () => {
    await expect(page.getByRole("heading", { name: /review and activate/i })).toBeVisible();

    // D-024: a real pickup date, not just a weekday. This flow picked
    // Wednesday, and the lead-time floor must never move the visit off the
    // property's own collection day — so rollout is always the Tuesday before.
    await expect(page.getByText(/Your first pickup: Wednesday, /)).toBeVisible();
    // Rollout names the evening before the pickup, and the return promise
    // stays on the card. The window label is built from config, so the
    // regex also guards that seam against a lost or doubled separator.
    await expect(
      page.getByText(/evening before \(Tuesday, .+ p\.m\.\) and bring them back after collection\./),
    ).toBeVisible();

    await assertNoSeriousViolations(page, "stage 4");
  });
});
