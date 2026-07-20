import { beforeAll, describe, expect, it } from "vitest";

import { finalizeOnboardingDraft } from "@/lib/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Integration test against the local Supabase stack (Phase 3 exit criterion):
 * a paid draft finalizes into a pending-review account exactly once; duplicate
 * finalize calls (duplicate webhooks) are harmless.
 */

const localStackAvailable =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!localStackAvailable)("finalizeOnboardingDraft", () => {
  const runId = Date.now();
  const testEmail = `finalize-test-${runId}@test.local`;
  let draftId: string;

  beforeAll(async () => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("onboarding_drafts")
      .insert({
        current_stage: 4,
        stage1: {
          addressLine1: "742 Test Ln",
          unit: "",
          city: "Prescott",
          postalCode: "86301",
          forSomeoneElse: false,
        },
        stage2: {
          payer: { fullName: "Finalize Tester", email: testEmail, phone: "" },
          additionalNotificationEmails: [],
          smsOptIn: false,
          marketingOptIn: false,
          forSomeoneElse: false,
        },
        stage3: {
          serviceChoice: "home",
          billingInterval: "monthly",
          binCount: 2,
          binTypes: ["trash", "recycling"],
          collectionProvider: "",
          collectionDay: 2,
          collectionDayUnsure: false,
          binStorageLocation: "Side yard",
          curbPlacementNotes: "",
          hazards: ["gate"],
        },
        access_secrets: { notes: "Gate code 4321" },
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`draft fixture failed: ${error?.message}`);
    draftId = data.id;
  });

  it("creates a pending-review account exactly once across duplicate deliveries", async () => {
    const first = await finalizeOnboardingDraft({
      draftId,
      stripeCustomerId: `cus_test_${runId}`,
      stripeSubscriptionId: `sub_test_${runId}`,
    });
    expect(first.alreadyFinalized).toBe(false);

    const second = await finalizeOnboardingDraft({
      draftId,
      stripeCustomerId: `cus_test_${runId}`,
      stripeSubscriptionId: `sub_test_${runId}`,
    });
    expect(second.alreadyFinalized).toBe(true);
    expect(second.accountId).toBe(first.accountId);

    const supabase = createSupabaseAdminClient();

    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("status, plan_id, billing_interval")
      .eq("account_id", first.accountId);
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions![0].status).toBe("pending_serviceability_review");
    expect(subscriptions![0].plan_id).toBe("home");

    const { data: properties } = await supabase
      .from("properties")
      .select("id, status")
      .eq("account_id", first.accountId);
    expect(properties).toHaveLength(1);
    expect(properties![0].status).toBe("pending_review");

    // Access secret is stored encrypted in the isolated table, not plaintext.
    const { data: secret } = await supabase
      .from("property_access_secrets")
      .select("encrypted_payload")
      .eq("property_id", properties![0].id)
      .single();
    expect(secret!.encrypted_payload).toMatch(/^v1\./);
    expect(secret!.encrypted_payload).not.toContain("4321");

    // Welcome email queued once.
    const { data: outbox } = await supabase
      .from("notification_outbox")
      .select("id")
      .eq("recipient", testEmail)
      .eq("template_id", "welcome_pending_review");
    expect(outbox).toHaveLength(1);
  });
});
