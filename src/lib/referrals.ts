import "server-only";

import { REFERRALS } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Referral lifecycle (D-014: Give $20 / Get $20 after a qualifying completed
 * paid cycle, with anti-fraud controls).
 *
 * Because the credit cap, expiration, and fraud policy are still owner-open
 * (OPEN_DECISIONS #6), qualification only ever creates credits in the *pending*
 * state — never spendable. An admin reviews and approves pending → earned. This
 * guarantees a growth feature can't mint unapproved account credit.
 */

export interface QualifyResult {
  outcome: "no_referral" | "already_qualified" | "qualified";
  fraudFlag?: string;
  creditsCreated?: number;
}

interface FraudCheck {
  suspicious: boolean;
  reason?: string;
}

async function detectFraud(
  advocateAccountId: string | null,
  referredAccountId: string,
): Promise<FraudCheck> {
  const supabase = createSupabaseAdminClient();

  // Self-referral: same account, or the payer email matches on both accounts.
  if (advocateAccountId && advocateAccountId === referredAccountId) {
    return { suspicious: true, reason: "self_referral_same_account" };
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, stripe_customer_id")
    .in("id", advocateAccountId ? [advocateAccountId, referredAccountId] : [referredAccountId]);

  if (advocateAccountId) {
    const advocate = accounts?.find((a) => a.id === advocateAccountId);
    const referred = accounts?.find((a) => a.id === referredAccountId);
    // Duplicate payment method → likely the same person / household.
    if (
      advocate?.stripe_customer_id &&
      referred?.stripe_customer_id &&
      advocate.stripe_customer_id === referred.stripe_customer_id
    ) {
      return { suspicious: true, reason: "shared_payment_method" };
    }

    // Shared payer email across the two accounts.
    const { data: payerContacts } = await supabase
      .from("contacts")
      .select("account_id, email")
      .in("account_id", [advocateAccountId, referredAccountId])
      .eq("kind", "payer");
    const emails = (payerContacts ?? [])
      .map((c) => c.email?.toLowerCase())
      .filter(Boolean);
    if (emails.length === 2 && emails[0] === emails[1]) {
      return { suspicious: true, reason: "shared_payer_email" };
    }

    // Same service address (household duplicate).
    const { data: props } = await supabase
      .from("properties")
      .select("account_id, address_line1, postal_code")
      .in("account_id", [advocateAccountId, referredAccountId]);
    const advocateAddrs = new Set(
      (props ?? [])
        .filter((p) => p.account_id === advocateAccountId)
        .map((p) => `${p.address_line1?.toLowerCase()}|${p.postal_code}`),
    );
    const referredShares = (props ?? [])
      .filter((p) => p.account_id === referredAccountId)
      .some((p) => advocateAddrs.has(`${p.address_line1?.toLowerCase()}|${p.postal_code}`));
    if (referredShares) {
      return { suspicious: true, reason: "shared_address" };
    }
  }

  return { suspicious: false };
}

async function resolveAdvocateAccountId(referralCodeId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data: code } = await supabase
    .from("referral_codes")
    .select("advocate_account_id, advocate_lead_id, waitlist_leads(email)")
    .eq("id", referralCodeId)
    .maybeSingle();
  if (!code) return null;
  if (code.advocate_account_id) return code.advocate_account_id;

  // Lead advocate: resolve to their account (if they've since become a customer)
  // by matching the lead email against a payer contact.
  const lead = Array.isArray(code.waitlist_leads) ? code.waitlist_leads[0] : code.waitlist_leads;
  if (!lead?.email) return null;
  const { data: payer } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("kind", "payer")
    .ilike("email", lead.email)
    .limit(1)
    .maybeSingle();
  return payer?.account_id ?? null;
}

/**
 * Called when an account completes its first paid collection cycle. Qualifies a
 * pending referral (if any) and creates pending credits. Idempotent: a referral
 * already marked qualified is left untouched.
 */
export async function maybeQualifyReferralForAccount(accountId: string): Promise<QualifyResult> {
  const supabase = createSupabaseAdminClient();

  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referral_code_id, qualifying_status")
    .eq("referred_account_id", accountId)
    .maybeSingle();
  if (!referral) return { outcome: "no_referral" };
  if (referral.qualifying_status !== "pending") return { outcome: "already_qualified" };

  const advocateAccountId = await resolveAdvocateAccountId(referral.referral_code_id);
  const fraud = await detectFraud(advocateAccountId, accountId);

  await supabase
    .from("referrals")
    .update({
      qualifying_status: "qualified",
      qualified_at: new Date().toISOString(),
      fraud_status: fraud.suspicious ? "review" : "none",
    })
    .eq("id", referral.id)
    .eq("qualifying_status", "pending");

  // Pending credits — never spendable until an admin approves them.
  const memo = fraud.suspicious ? `referral (flagged: ${fraud.reason})` : "referral reward";
  const creditRows = [
    {
      account_id: accountId,
      amount_cents: REFERRALS.referredCustomerCreditCents,
      kind: "referral",
      status: "pending",
      source_referral_id: referral.id,
      memo,
    },
    ...(advocateAccountId
      ? [
          {
            account_id: advocateAccountId,
            amount_cents: REFERRALS.advocateCreditCents,
            kind: "referral",
            status: "pending",
            source_referral_id: referral.id,
            memo,
          },
        ]
      : []),
  ];
  const { error } = await supabase.from("credits").insert(creditRows);
  if (error) throw new Error(`Referral credit creation failed: ${error.message}`);

  return {
    outcome: "qualified",
    fraudFlag: fraud.reason,
    creditsCreated: creditRows.length,
  };
}

/** Monthly earned-credit total for an account (cap enforcement at approval). */
export async function earnedReferralCentsThisMonth(accountId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const monthStart = (() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  })();
  const { data } = await supabase
    .from("credits")
    .select("amount_cents")
    .eq("account_id", accountId)
    .eq("kind", "referral")
    .eq("status", "earned")
    .gte("created_at", monthStart);
  return (data ?? []).reduce((sum, row) => sum + row.amount_cents, 0);
}
