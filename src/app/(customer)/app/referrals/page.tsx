import { formatCents, REFERRALS } from "@/config/business";
import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Get (or create) a stable referral code for the customer's primary account. */
async function getOrCreateCode(accountId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("advocate_account_id", accountId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.code;

  const code = `cs-${accountId.slice(0, 8)}`;
  const { data: created, error } = await admin
    .from("referral_codes")
    .upsert({ code, advocate_account_id: accountId }, { onConflict: "code" })
    .select("code")
    .maybeSingle();
  if (error) return null;
  return created?.code ?? code;
}

export default async function ReferralsPage() {
  const session = (await getSessionInfo())!;
  const rls = await createSupabaseServerClient();

  const { data: membership } = await rls
    .from("account_members")
    .select("account_id")
    .eq("profile_id", session.userId)
    .limit(1)
    .maybeSingle();

  const accountId = membership?.account_id ?? null;
  const code = accountId ? await getOrCreateCode(accountId) : null;

  // Credit balances (RLS-scoped to the customer's accounts).
  const { data: credits } = await rls
    .from("credits")
    .select("amount_cents, status, kind");
  const totals = { pending: 0, earned: 0, applied: 0 };
  for (const credit of credits ?? []) {
    if (credit.status === "pending") totals.pending += credit.amount_cents;
    else if (credit.status === "earned") totals.earned += credit.amount_cents;
    else if (credit.status === "applied") totals.applied += credit.amount_cents;
  }

  const shareUrl = code ? `${APP_URL}/waitlist?ref=${code}` : null;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Refer a neighbor</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Give {formatCents(REFERRALS.referredCustomerCreditCents)}, get{" "}
        {formatCents(REFERRALS.advocateCreditCents)}. When a neighbor signs up with your link and
        completes their first paid service cycle, you both earn an account credit. Denser routes
        also mean more reliable service for your street.
      </p>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-3xl font-bold">{formatCents(totals.earned)}</p>
          <p className="text-base text-muted">Earned (available)</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-3xl font-bold">{formatCents(totals.pending)}</p>
          <p className="text-base text-muted">Pending approval</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-3xl font-bold">{formatCents(totals.applied)}</p>
          <p className="text-base text-muted">Applied to billing</p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Your sharing link</h2>
        {shareUrl ? (
          <>
            <p className="mt-3 break-all rounded-lg bg-surface-2 px-4 py-3 font-mono text-base">{shareUrl}</p>
            <p className="mt-3 text-base text-muted">
              Credits aren&apos;t cash and aren&apos;t transferable. Referrals are reviewed before
              credits become available — fair&apos;s fair.
            </p>
          </>
        ) : (
          <p className="mt-3 text-base text-muted">
            Your referral link will appear here once your account is fully set up.
          </p>
        )}
      </section>
    </>
  );
}
