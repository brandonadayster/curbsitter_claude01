import { beforeAll, describe, expect, it } from "vitest";

import { maybeQualifyReferralForAccount } from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Referral qualification (D-014): credits accrue only as PENDING on the first
 * paid cycle, self-referrals are flagged, and re-running is idempotent.
 */

const localStackAvailable =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

// Declared, not called: createSupabaseAdminClient() throws when no local
// Supabase is configured (e.g. the CI "checks" job), and describe.skipIf
// still executes this module body during collection even when the describe
// block itself is skipped — only beforeAll/it callbacks are truly skipped.
// Assigned in beforeAll below, once we know the suite will actually run.
let supabase: ReturnType<typeof createSupabaseAdminClient>;

async function makeAccount(name: string, email: string, stripeCustomer?: string) {
  const { data: account } = await supabase
    .from("accounts")
    .insert({ name, stripe_customer_id: stripeCustomer ?? null })
    .select("id")
    .single();
  await supabase.from("contacts").insert({
    account_id: account!.id,
    kind: "payer",
    full_name: name,
    email,
  });
  return account!.id;
}

describe.skipIf(!localStackAvailable)("maybeQualifyReferralForAccount", () => {
  const runId = Date.now();
  let advocateAccount: string;
  let referredAccount: string;
  let selfAccount: string;

  beforeAll(async () => {
    supabase = createSupabaseAdminClient();
    advocateAccount = await makeAccount(`Advocate ${runId}`, `advocate-${runId}@test.local`, `cus_adv_${runId}`);
    referredAccount = await makeAccount(`Referred ${runId}`, `referred-${runId}@test.local`, `cus_ref_${runId}`);
    selfAccount = await makeAccount(`Self ${runId}`, `self-${runId}@test.local`, `cus_self_${runId}`);

    // Clean referral: advocate code -> referred account.
    const { data: cleanCode } = await supabase
      .from("referral_codes")
      .insert({ code: `adv-${runId}`, advocate_account_id: advocateAccount })
      .select("id")
      .single();
    await supabase
      .from("referrals")
      .insert({ referral_code_id: cleanCode!.id, referred_account_id: referredAccount });

    // Self-referral: same account is both advocate and referred (shared payment
    // method also, since we reuse the account).
    const { data: selfCode } = await supabase
      .from("referral_codes")
      .insert({ code: `self-${runId}`, advocate_account_id: selfAccount })
      .select("id")
      .single();
    await supabase
      .from("referrals")
      .insert({ referral_code_id: selfCode!.id, referred_account_id: selfAccount });
  });

  it("accrues pending credits for advocate and referred on a clean referral", async () => {
    const result = await maybeQualifyReferralForAccount(referredAccount);
    expect(result.outcome).toBe("qualified");
    expect(result.creditsCreated).toBe(2);

    const { data: credits } = await supabase
      .from("credits")
      .select("account_id, amount_cents, status")
      .in("account_id", [advocateAccount, referredAccount])
      .eq("kind", "referral");
    expect(credits).toHaveLength(2);
    // Never auto-earned — must be pending until admin approval.
    expect(credits!.every((c) => c.status === "pending")).toBe(true);
    expect(credits!.every((c) => c.amount_cents === 1000)).toBe(true);

    const { data: referral } = await supabase
      .from("referrals")
      .select("qualifying_status, fraud_status")
      .eq("referred_account_id", referredAccount)
      .single();
    expect(referral!.qualifying_status).toBe("qualified");
    expect(referral!.fraud_status).toBe("none");
  });

  it("is idempotent — a second run creates no further credits", async () => {
    const result = await maybeQualifyReferralForAccount(referredAccount);
    expect(result.outcome).toBe("already_qualified");

    const { count } = await supabase
      .from("credits")
      .select("id", { count: "exact", head: true })
      .eq("account_id", referredAccount)
      .eq("kind", "referral");
    expect(count).toBe(1);
  });

  it("flags a self-referral for review", async () => {
    const result = await maybeQualifyReferralForAccount(selfAccount);
    expect(result.outcome).toBe("qualified");
    expect(result.fraudFlag).toBeDefined();

    const { data: referral } = await supabase
      .from("referrals")
      .select("fraud_status")
      .eq("referred_account_id", selfAccount)
      .single();
    expect(referral!.fraud_status).toBe("review");
  });

  it("returns no_referral for an account that was never referred", async () => {
    const orphan = await makeAccount(`Orphan ${runId}`, `orphan-${runId}@test.local`);
    const result = await maybeQualifyReferralForAccount(orphan);
    expect(result.outcome).toBe("no_referral");
  });
});
