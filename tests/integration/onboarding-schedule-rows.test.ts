import { describe, expect, it } from "vitest";

import { finalizeOnboardingDraft } from "@/lib/onboarding";
import type { Stage1, Stage3 } from "@/lib/onboarding-schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Integration coverage for the schedule-row rule: `generateCyclesForDate`
 * creates one cycle per matching `collection_schedules` row, so a second row
 * must only ever be written when trash and recycling genuinely fall on
 * different days AND the plan's `collectionCoverage` actually covers every
 * regular collection day (Complete). Getting this wrong either double-books
 * a shared-day visit or silently upgrades a Home customer's coverage.
 *
 * Also covers per-type bin counts and `properties.property_type`
 * persistence, which land in the same finalize path.
 */

const localStackAvailable =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Unique per test-run invocation so re-running the suite against the same
// local stack never collides with a prior run's leftover fixture rows.
const RUN_ID = Date.now();

function stage1(overrides: Partial<Stage1> = {}): Stage1 {
  return {
    addressLine1: "1 Schedule Row Test Ln",
    unit: "",
    city: "Prescott",
    postalCode: "86301",
    servingWho: "myself",
    propertyType: "single_family",
    ...overrides,
  };
}

function stage3(overrides: Partial<Stage3> = {}): Stage3 {
  return {
    serviceChoice: "home",
    billingInterval: "monthly",
    hasBothBinTypes: false,
    trashBinCount: 1,
    recyclingBinCount: 0,
    collectionProviderKind: "city",
    collectionProvider: "",
    collectionDay: 2,
    collectionDayUnsure: false,
    sameDayCollection: null,
    recyclingCollectionDay: null,
    recyclingCollectionDayUnsure: false,
    binStorageLocation: "Side yard",
    curbPlacementNotes: "",
    hazards: [],
    accessSecretNotes: "",
    ...overrides,
  };
}

interface FinalizedFixture {
  accountId: string;
  propertyId: string;
}

async function finalizeDraft(
  runId: string,
  overrides: { stage1?: Partial<Stage1>; stage3?: Partial<Stage3> } = {},
): Promise<FinalizedFixture> {
  const supabase = createSupabaseAdminClient();
  const uniqueId = `${RUN_ID}-${runId}`;
  const email = `schedule-row-${uniqueId}@test.local`;
  const { data: draftRow, error } = await supabase
    .from("onboarding_drafts")
    .insert({
      current_stage: 4,
      stage1: stage1(overrides.stage1),
      stage2: {
        payer: { fullName: "Schedule Row Tester", email, phone: "" },
        additionalNotificationEmails: [],
        smsOptIn: false,
        marketingOptIn: false,
        forSomeoneElse: false,
      },
      stage3: stage3(overrides.stage3),
    })
    .select("id")
    .single();
  if (error || !draftRow) throw new Error(`draft fixture failed: ${error?.message}`);

  const { accountId } = await finalizeOnboardingDraft({
    draftId: draftRow.id,
    stripeCustomerId: `cus_test_${uniqueId}`,
    stripeSubscriptionId: `sub_test_${uniqueId}`,
  });

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("account_id", accountId)
    .single();
  if (propertyError || !property) {
    throw new Error(`property lookup failed: ${propertyError?.message}`);
  }

  return { accountId, propertyId: property.id };
}

async function scheduleRowsFor(propertyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("collection_schedules")
    .select("waste_stream, weekday, verification_status")
    .eq("property_id", propertyId)
    .order("waste_stream", { ascending: true });
  return data ?? [];
}

async function binsFor(propertyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("bins").select("bin_type").eq("property_id", propertyId);
  return data ?? [];
}

describe.skipIf(!localStackAvailable)("schedule-row rule at finalize", () => {
  it("writes a single trash row for a trash-only property", async () => {
    const { propertyId } = await finalizeDraft("trash-only", {
      stage3: { hasBothBinTypes: false, trashBinCount: 1, recyclingBinCount: 0, collectionDay: 2 },
    });
    const rows = await scheduleRowsFor(propertyId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ waste_stream: "trash", weekday: 2, verification_status: "unverified" });
  });

  it("writes a single trash row when trash and recycling share a day, on Home", async () => {
    const { propertyId } = await finalizeDraft("same-day-home", {
      stage3: {
        serviceChoice: "home",
        hasBothBinTypes: true,
        trashBinCount: 2,
        recyclingBinCount: 1,
        collectionDay: 1,
        sameDayCollection: true,
      },
    });
    const rows = await scheduleRowsFor(propertyId);
    expect(rows).toHaveLength(1);
    expect(rows[0].waste_stream).toBe("trash");
  });

  it("writes a single trash row when trash and recycling share a day, on Complete", async () => {
    const { propertyId } = await finalizeDraft("same-day-complete", {
      stage3: {
        serviceChoice: "complete",
        hasBothBinTypes: true,
        trashBinCount: 3,
        recyclingBinCount: 3,
        collectionDay: 4,
        sameDayCollection: true,
      },
    });
    const rows = await scheduleRowsFor(propertyId);
    // Same day never gets a second row, even on a plan that covers every day.
    expect(rows).toHaveLength(1);
    expect(rows[0].waste_stream).toBe("trash");
  });

  it("does not upgrade Home to a second row when trash and recycling differ", async () => {
    const { propertyId } = await finalizeDraft("diff-day-home", {
      stage3: {
        serviceChoice: "home",
        hasBothBinTypes: true,
        trashBinCount: 1,
        recyclingBinCount: 1,
        collectionDay: 3,
        sameDayCollection: false,
        recyclingCollectionDay: 5,
      },
    });
    const rows = await scheduleRowsFor(propertyId);
    // No silent upgrade: Home covers one day, so only trash is scheduled.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ waste_stream: "trash", weekday: 3 });
  });

  it("writes both rows for Complete when trash and recycling differ", async () => {
    const { propertyId } = await finalizeDraft("diff-day-complete", {
      stage3: {
        serviceChoice: "complete",
        hasBothBinTypes: true,
        trashBinCount: 4,
        recyclingBinCount: 2,
        collectionDay: 2,
        sameDayCollection: false,
        recyclingCollectionDay: 4,
      },
    });
    const rows = await scheduleRowsFor(propertyId);
    expect(rows).toHaveLength(2);
    const trash = rows.find((r) => r.waste_stream === "trash");
    const recycling = rows.find((r) => r.waste_stream === "recycling");
    expect(trash).toMatchObject({ weekday: 2, verification_status: "unverified" });
    expect(recycling).toMatchObject({ weekday: 4, verification_status: "unverified" });
  });

  it("anchors a one-time order to trash day only, even with a different recycling day", async () => {
    const { propertyId } = await finalizeDraft("onetime-diff-day", {
      stage3: {
        serviceChoice: "one_time_trash_day",
        hasBothBinTypes: true,
        trashBinCount: 2,
        recyclingBinCount: 1,
        collectionDay: 0,
        sameDayCollection: false,
        recyclingCollectionDay: 6,
      },
    });
    const rows = await scheduleRowsFor(propertyId);
    // onDemand is never covered by "every regular collection day" — trash only.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ waste_stream: "trash", weekday: 0 });
  });

  it("marks the trash row needs_review when the customer is unsure of the day", async () => {
    const { propertyId } = await finalizeDraft("unsure-day", {
      stage3: { hasBothBinTypes: false, collectionDay: null, collectionDayUnsure: true },
    });
    const rows = await scheduleRowsFor(propertyId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ weekday: null, verification_status: "needs_review" });
  });

  it("marks the recycling row needs_review independently of the trash row", async () => {
    const { propertyId } = await finalizeDraft("unsure-recycling-day", {
      stage3: {
        serviceChoice: "complete",
        hasBothBinTypes: true,
        recyclingBinCount: 1,
        collectionDay: 2,
        sameDayCollection: false,
        recyclingCollectionDay: null,
        recyclingCollectionDayUnsure: true,
      },
    });
    const rows = await scheduleRowsFor(propertyId);
    expect(rows).toHaveLength(2);
    const trash = rows.find((r) => r.waste_stream === "trash");
    const recycling = rows.find((r) => r.waste_stream === "recycling");
    expect(trash).toMatchObject({ weekday: 2, verification_status: "unverified" });
    expect(recycling).toMatchObject({ weekday: null, verification_status: "needs_review" });
  });
});

describe.skipIf(!localStackAvailable)("per-type bin counts at finalize", () => {
  it("inserts exactly the trash and recycling bin counts collected at signup", async () => {
    const { propertyId } = await finalizeDraft("bin-counts", {
      stage3: {
        serviceChoice: "complete",
        hasBothBinTypes: true,
        trashBinCount: 4,
        recyclingBinCount: 2,
        collectionDay: 1,
        sameDayCollection: true,
      },
    });
    const bins = await binsFor(propertyId);
    expect(bins.filter((b) => b.bin_type === "trash")).toHaveLength(4);
    expect(bins.filter((b) => b.bin_type === "recycling")).toHaveLength(2);
    expect(bins).toHaveLength(6);
  });

  it("inserts zero recycling bins for a trash-only property", async () => {
    const { propertyId } = await finalizeDraft("bin-counts-trash-only", {
      stage3: { hasBothBinTypes: false, trashBinCount: 2, recyclingBinCount: 0 },
    });
    const bins = await binsFor(propertyId);
    expect(bins.filter((b) => b.bin_type === "recycling")).toHaveLength(0);
    expect(bins.filter((b) => b.bin_type === "trash")).toHaveLength(2);
  });
});

describe.skipIf(!localStackAvailable)("property_type persistence at finalize", () => {
  it.each([
    ["single_family"],
    ["condo_townhome"],
    ["vacation_rental"],
    ["second_home"],
    ["hoa_community"],
  ] as const)("persists propertyType %s onto properties.property_type", async (propertyType) => {
    const supabase = createSupabaseAdminClient();
    const { propertyId } = await finalizeDraft(`property-type-${propertyType}`, {
      stage1: { propertyType },
    });
    const { data: property } = await supabase
      .from("properties")
      .select("property_type")
      .eq("id", propertyId)
      .single();
    expect(property?.property_type).toBe(propertyType);
  });
});
