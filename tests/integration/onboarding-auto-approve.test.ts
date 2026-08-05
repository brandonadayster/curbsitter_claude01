import { describe, expect, it } from "vitest";

import type { CollectionDayCheck } from "@/lib/collection-day-verification";
import { finalizeOnboardingDraft } from "@/lib/onboarding";
import type { Stage1, Stage3 } from "@/lib/onboarding-schemas";
import type { CommercialCheck } from "@/lib/property-usage-check";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * D-027: a signup activates without an admin click only when both automated
 * checks positively clear it. This is the most expensive thing in the
 * codebase to get wrong in the permissive direction — a false "clear" starts
 * billing and schedules runners against a property nobody verified — so
 * every combination that must NOT auto-approve is covered explicitly.
 */

const localStackAvailable =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const RUN_ID = Date.now();
const CHECKED_AT = "2026-08-04T12:00:00.000Z";

const residential: CommercialCheck = {
  status: "residential",
  usageType: "Residential",
  usageDesc: "Single Family Residence",
  checkedAt: CHECKED_AT,
};
const flagged: CommercialCheck = {
  status: "flagged",
  usageType: "Commercial",
  usageDesc: "Retail",
  checkedAt: CHECKED_AT,
};
const checkFailed: CommercialCheck = {
  status: "check_failed",
  usageType: null,
  usageDesc: null,
  checkedAt: CHECKED_AT,
};

const dayMatch: CollectionDayCheck = {
  status: "match",
  customerWeekday: 2,
  cityWeekday: 2,
  checkedAt: CHECKED_AT,
};
const dayCityResolved: CollectionDayCheck = {
  status: "city_resolved",
  customerWeekday: 4,
  cityWeekday: 4,
  checkedAt: CHECKED_AT,
};
const dayMismatchConfirmed: CollectionDayCheck = {
  status: "mismatch_confirmed",
  customerWeekday: 2,
  cityWeekday: 4,
  checkedAt: CHECKED_AT,
};
const dayNoZoneData: CollectionDayCheck = {
  status: "no_zone_data",
  customerWeekday: 2,
  cityWeekday: null,
  checkedAt: CHECKED_AT,
};
const dayUnsureNoData: CollectionDayCheck = {
  status: "unsure_no_data",
  customerWeekday: null,
  cityWeekday: null,
  checkedAt: CHECKED_AT,
};

function stage1(): Stage1 {
  return {
    addressLine1: "1 Auto Approve Test Ln",
    unit: "",
    city: "Prescott",
    postalCode: "86301",
    servingWho: "myself",
    propertyType: "single_family",
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

interface Finalized {
  accountId: string;
  propertyId: string;
  email: string;
}

async function finalize(
  label: string,
  options: {
    dayCheck: CollectionDayCheck | null;
    commercialCheck: CommercialCheck | null;
    stage3?: Partial<Stage3>;
  },
): Promise<Finalized> {
  const supabase = createSupabaseAdminClient();
  const uniqueId = `${RUN_ID}-${label}`;
  const email = `auto-approve-${uniqueId}@test.local`;

  const { data: draftRow, error } = await supabase
    .from("onboarding_drafts")
    .insert({
      current_stage: 4,
      stage1: stage1(),
      stage2: {
        payer: { fullName: "Auto Approve Tester", email, phone: "" },
        additionalNotificationEmails: [],
        smsOptIn: false,
        marketingOptIn: false,
        forSomeoneElse: false,
      },
      stage3: stage3(options.stage3),
      collection_day_check: options.dayCheck,
      commercial_check: options.commercialCheck,
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

  return { accountId, propertyId: property.id, email };
}

async function statuses(finalized: Finalized) {
  const supabase = createSupabaseAdminClient();
  const [{ data: property }, { data: subscriptions }, { data: outbox }, { data: schedule }] =
    await Promise.all([
      supabase.from("properties").select("status").eq("id", finalized.propertyId).single(),
      supabase.from("subscriptions").select("status").eq("account_id", finalized.accountId),
      supabase.from("notification_outbox").select("template_id").eq("recipient", finalized.email),
      supabase
        .from("collection_schedules")
        .select("weekday, verification_status, needs_review_reason")
        .eq("property_id", finalized.propertyId)
        .eq("waste_stream", "trash")
        .single(),
    ]);
  return {
    propertyStatus: property?.status,
    subscriptionStatus: subscriptions?.[0]?.status,
    templates: (outbox ?? []).map((row) => row.template_id),
    schedule,
  };
}

describe.skipIf(!localStackAvailable)("D-027 auto-approval", () => {
  it("activates a verified-day residential signup with no admin click", async () => {
    const finalized = await finalize("clean-match", {
      dayCheck: dayMatch,
      commercialCheck: residential,
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("active");
    expect(result.subscriptionStatus).toBe("active");
    expect(result.templates).toContain("service_confirmed");
    // The "passed review" copy would be a lie — no human looked at this.
    expect(result.templates).not.toContain("welcome_pending_review");
    expect(result.schedule?.verification_status).toBe("verified");

    const supabase = createSupabaseAdminClient();
    const { data: audit } = await supabase
      .from("audit_log")
      .select("action, actor_id")
      .eq("entity", "properties")
      .eq("entity_id", finalized.propertyId);
    expect(audit).toHaveLength(1);
    expect(audit![0].action).toBe("serviceability_review.auto_approve");
    expect(audit![0].actor_id).toBeNull();
  });

  it("activates when the City supplied a day the customer didn't know", async () => {
    const finalized = await finalize("city-resolved", {
      dayCheck: dayCityResolved,
      commercialCheck: residential,
      // The customer answered "I'm not sure"; the client filled in the City's
      // day before submitting, but finalize must not depend on that.
      stage3: { collectionDay: null, collectionDayUnsure: true },
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("active");
    expect(result.subscriptionStatus).toBe("active");
    expect(result.schedule?.weekday).toBe(4);
    expect(result.schedule?.verification_status).toBe("verified");
    expect(result.templates).toContain("service_confirmed");
  });

  it("activates a self-reported day the City has no record for", async () => {
    // Private hauler: nothing contradicts the customer, so nothing to review.
    const finalized = await finalize("no-zone-data", {
      dayCheck: dayNoZoneData,
      commercialCheck: residential,
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("active");
    expect(result.subscriptionStatus).toBe("active");
    expect(result.schedule?.weekday).toBe(2);
  });

  it("holds a reaffirmed day conflict for review", async () => {
    const finalized = await finalize("mismatch", {
      dayCheck: dayMismatchConfirmed,
      commercialCheck: residential,
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("pending_review");
    expect(result.subscriptionStatus).toBe("pending_serviceability_review");
    expect(result.templates).toContain("welcome_pending_review");
    expect(result.templates).not.toContain("service_confirmed");
    expect(result.schedule?.needs_review_reason).toBe("city_mismatch");
  });

  it("holds a signup with no established collection day", async () => {
    const finalized = await finalize("unsure-no-data", {
      dayCheck: dayUnsureNoData,
      commercialCheck: residential,
      stage3: { collectionDay: null, collectionDayUnsure: true },
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("pending_review");
    expect(result.subscriptionStatus).toBe("pending_serviceability_review");
    // Null weekday is exactly what makes this unschedulable — an admin
    // resolves it before approval.
    expect(result.schedule?.weekday).toBeNull();
    expect(result.schedule?.needs_review_reason).toBe("customer_unsure");
  });

  it("holds a property flagged as non-residential despite a clean day", async () => {
    const finalized = await finalize("commercial-flagged", {
      dayCheck: dayMatch,
      commercialCheck: flagged,
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("pending_review");
    expect(result.subscriptionStatus).toBe("pending_serviceability_review");
    // The day itself is still verified — only the usage check held it back.
    expect(result.schedule?.verification_status).toBe("verified");
  });

  it("holds a signup whose usage check failed rather than assuming residential", async () => {
    const finalized = await finalize("commercial-failed", {
      dayCheck: dayMatch,
      commercialCheck: checkFailed,
    });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("pending_review");
    expect(result.subscriptionStatus).toBe("pending_serviceability_review");
  });

  it("holds a signup with no checks recorded at all", async () => {
    // Drafts created before these columns existed must fail safe.
    const finalized = await finalize("no-checks", { dayCheck: null, commercialCheck: null });
    const result = await statuses(finalized);

    expect(result.propertyStatus).toBe("pending_review");
    expect(result.subscriptionStatus).toBe("pending_serviceability_review");
  });

  it("schedules a clean one-time order's tasks without an admin click", async () => {
    const finalized = await finalize("one-time-clean", {
      dayCheck: dayMatch,
      commercialCheck: residential,
      stage3: { serviceChoice: "one_time_trash_day" },
    });

    const supabase = createSupabaseAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, requested_date")
      .eq("account_id", finalized.accountId)
      .single();

    // generateTasksForOrder claims the order, so it lands on `scheduled`.
    expect(order?.status).toBe("scheduled");
    expect(order?.requested_date).toBeTruthy();

    const { data: tasks } = await supabase.from("service_tasks").select("task_type").eq("order_id", order!.id);
    expect((tasks ?? []).map((task) => task.task_type).sort()).toEqual(["return", "rollout"]);
  });

  it("leaves a one-time order requested when a check doesn't clear", async () => {
    const finalized = await finalize("one-time-flagged", {
      dayCheck: dayMatch,
      commercialCheck: flagged,
      stage3: { serviceChoice: "one_time_trash_day" },
    });

    const supabase = createSupabaseAdminClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("account_id", finalized.accountId)
      .single();
    expect(order?.status).toBe("requested");

    const { data: tasks } = await supabase.from("service_tasks").select("id").eq("order_id", order!.id);
    expect(tasks ?? []).toHaveLength(0);
  });
});
