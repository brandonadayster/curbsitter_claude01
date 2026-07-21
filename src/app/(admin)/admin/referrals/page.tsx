import { formatCents } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { decideReferral } from "./actions";

export const metadata = { title: "Admin — Referrals" };
export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const supabase = createSupabaseAdminClient();

  const { data: referrals } = await supabase
    .from("referrals")
    .select(
      `id, qualifying_status, fraud_status, qualified_at, created_at,
       referral_codes (code),
       credits:credits!source_referral_id (id, account_id, amount_cents, status, memo, accounts(name))`,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const pendingReview = (referrals ?? []).filter(
    (r) =>
      r.qualifying_status === "qualified" &&
      (r.credits ?? []).some((c: { status: string }) => c.status === "pending"),
  );

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Give {formatCents(2000)} / Get {formatCents(2000)} after a referred account&apos;s first
        paid cycle completes. Credits accrue as <strong>pending</strong> and only become spendable
        when approved here — flagged referrals need a look before approval.
      </p>

      <section className="mt-6">
        <h2 className="text-xl font-bold">Awaiting approval</h2>
        {pendingReview.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No referrals awaiting approval.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {pendingReview.map((referral) => {
              const code = Array.isArray(referral.referral_codes)
                ? referral.referral_codes[0]
                : referral.referral_codes;
              const pendingCredits = (referral.credits ?? []).filter(
                (c: { status: string }) => c.status === "pending",
              );
              return (
                <li
                  key={referral.id}
                  className={`rounded-2xl border p-5 ${
                    referral.fraud_status === "review"
                      ? "border-warning/50 bg-warning/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">
                        Code {code?.code ?? "—"}
                        {referral.fraud_status === "review" ? (
                          <span className="ml-2 rounded-full border border-warning/60 px-2 py-0.5 text-sm text-warning">
                            flagged for review
                          </span>
                        ) : null}
                      </p>
                      <ul className="mt-2 space-y-1 text-base text-muted">
                        {pendingCredits.map(
                          (credit: {
                            id: string;
                            amount_cents: number;
                            memo: string | null;
                            accounts: { name: string } | { name: string }[] | null;
                          }) => {
                            const account = Array.isArray(credit.accounts)
                              ? credit.accounts[0]
                              : credit.accounts;
                            return (
                              <li key={credit.id}>
                                {formatCents(credit.amount_cents)} → {account?.name ?? "account"}
                                {credit.memo ? ` (${credit.memo})` : ""}
                              </li>
                            );
                          },
                        )}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <form action={decideReferral}>
                        <input type="hidden" name="referralId" value={referral.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button className="rounded-lg bg-success px-4 py-2 text-base font-semibold text-bg">
                          Approve credits
                        </button>
                      </form>
                      <form action={decideReferral}>
                        <input type="hidden" name="referralId" value={referral.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button className="rounded-lg border border-danger/60 px-4 py-2 text-base font-semibold text-danger hover:bg-danger/10">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">All referrals</h2>
        {!referrals || referrals.length === 0 ? (
          <p className="mt-3 text-base text-muted">No referrals yet.</p>
        ) : (
          <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-base font-semibold">Code</th>
                <th className="px-4 py-3 text-base font-semibold">Qualifying</th>
                <th className="px-4 py-3 text-base font-semibold">Fraud</th>
                <th className="px-4 py-3 text-base font-semibold">Credits</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => {
                const code = Array.isArray(referral.referral_codes)
                  ? referral.referral_codes[0]
                  : referral.referral_codes;
                const credits = referral.credits ?? [];
                return (
                  <tr key={referral.id}>
                    <td className="border-t border-border px-4 py-3 text-base">{code?.code ?? "—"}</td>
                    <td className="border-t border-border px-4 py-3 text-base">{referral.qualifying_status}</td>
                    <td className="border-t border-border px-4 py-3 text-base">{referral.fraud_status}</td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {credits.length > 0
                        ? credits
                            .map((c: { amount_cents: number; status: string }) => `${formatCents(c.amount_cents)} ${c.status}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
