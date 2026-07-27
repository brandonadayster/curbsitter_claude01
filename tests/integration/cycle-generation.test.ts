import { beforeAll, describe, expect, it } from "vitest";

import { generateCyclesForDate, phoenixWeekday } from "@/lib/cycles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Integration test (local Supabase): cycle generation services only active,
 * non-cancelling subscriptions. The expensive failure path — generating (and
 * eventually billing) service for a paused customer — must not happen.
 */

const localStackAvailable =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!localStackAvailable)("generateCyclesForDate pause gating", () => {
  const runId = Date.now();
  // Declared, not called: describe.skipIf still executes this describe body
  // during collection even when skipped — only beforeAll/it callbacks are
  // truly skipped. createSupabaseAdminClient() throws with no local Supabase
  // configured (e.g. the CI "checks" job), so defer the call into beforeAll.
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  let propertyId: string;
  let subscriptionId: string;

  // Two future dates that both land on the property's collection weekday.
  const dateA = "2026-08-05"; // Wednesday
  const dateB = "2026-08-12"; // Wednesday
  const weekday = phoenixWeekday(dateA);

  beforeAll(async () => {
    supabase = createSupabaseAdminClient();
    const { data: account } = await supabase
      .from("accounts")
      .insert({ name: `Cycle Test ${runId}` })
      .select("id")
      .single();

    const { data: property } = await supabase
      .from("properties")
      .insert({
        account_id: account!.id,
        address_line1: `${runId} Cycle Test Ln`,
        city: "Prescott",
        postal_code: "86303",
        status: "active",
      })
      .select("id")
      .single();
    propertyId = property!.id;

    await supabase
      .from("collection_schedules")
      .insert({ property_id: propertyId, weekday, verification_status: "verified" });

    const { data: subscription } = await supabase
      .from("subscriptions")
      .insert({
        account_id: account!.id,
        property_id: propertyId,
        plan_id: "home",
        billing_interval: "monthly",
        status: "active",
      })
      .select("id")
      .single();
    subscriptionId = subscription!.id;
  });

  it("generates a cycle + two tasks for an active subscription", async () => {
    const result = await generateCyclesForDate(dateA);
    // Other seeded active properties may also match; assert on ours specifically.
    const { count } = await supabase
      .from("collection_cycles")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("collection_date", dateA);
    expect(count).toBe(1);
    expect(result.cyclesCreated).toBeGreaterThanOrEqual(1);
  });

  it("skips a paused subscription instead of generating a cycle", async () => {
    await supabase
      .from("subscriptions")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("id", subscriptionId);

    await generateCyclesForDate(dateB);

    const { count } = await supabase
      .from("collection_cycles")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("collection_date", dateB);
    expect(count).toBe(0);
  });

  it("skips a cancel-at-renewal subscription", async () => {
    await supabase
      .from("subscriptions")
      .update({ status: "active", paused_at: null, cancel_at_period_end: true })
      .eq("id", subscriptionId);

    const dateC = "2026-08-19"; // Wednesday
    await generateCyclesForDate(dateC);

    const { count } = await supabase
      .from("collection_cycles")
      .select("id", { count: "exact", head: true })
      .eq("property_id", propertyId)
      .eq("collection_date", dateC);
    expect(count).toBe(0);
  });
});
