import Link from "next/link";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin — Accounts" };
export const dynamic = "force-dynamic";

/**
 * Accounts overview with HOA/portfolio basics: multi-property accounts get an
 * aggregated view (property count, active subscriptions, completed cycles) —
 * the centralized-reporting foundation for community and portfolio customers.
 */
export default async function AdminAccountsPage() {
  const supabase = createSupabaseAdminClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select(
      `id, name, account_type, created_at,
       properties(id),
       subscriptions(id, status),
       account_members(profile_id)`,
    )
    .order("created_at", { ascending: false });

  // Completed-cycle counts per account (for portfolio reporting).
  const { data: cycles } = await supabase
    .from("collection_cycles")
    .select("state, properties(account_id)")
    .eq("state", "completed");
  const completedByAccount = new Map<string, number>();
  for (const cycle of cycles ?? []) {
    const property = Array.isArray(cycle.properties) ? cycle.properties[0] : cycle.properties;
    const accountId = property?.account_id;
    if (accountId) completedByAccount.set(accountId, (completedByAccount.get(accountId) ?? 0) + 1);
  }

  const portfolio = (accounts ?? []).filter((a) => ["hoa", "portfolio"].includes(a.account_type));
  const individual = (accounts ?? []).filter((a) => !["hoa", "portfolio"].includes(a.account_type));

  const renderRow = (account: NonNullable<typeof accounts>[number]) => {
    const activeSubs = (account.subscriptions ?? []).filter(
      (s: { status: string }) => s.status === "active",
    ).length;
    return (
      <tr key={account.id}>
        <td className="border-t border-border px-4 py-3 text-base">{account.name}</td>
        <td className="border-t border-border px-4 py-3 text-base">{account.account_type}</td>
        <td className="border-t border-border px-4 py-3 text-base">{(account.properties ?? []).length}</td>
        <td className="border-t border-border px-4 py-3 text-base">{activeSubs}</td>
        <td className="border-t border-border px-4 py-3 text-base">
          {completedByAccount.get(account.id) ?? 0}
        </td>
      </tr>
    );
  };

  const table = (rows: NonNullable<typeof accounts>) => (
    <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
      <thead className="bg-surface">
        <tr>
          <th className="px-4 py-3 text-base font-semibold">Account</th>
          <th className="px-4 py-3 text-base font-semibold">Type</th>
          <th className="px-4 py-3 text-base font-semibold">Properties</th>
          <th className="px-4 py-3 text-base font-semibold">Active subs</th>
          <th className="px-4 py-3 text-base font-semibold">Completed cycles</th>
        </tr>
      </thead>
      <tbody>{rows.map(renderRow)}</tbody>
    </table>
  );

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
      <p className="mt-2 text-base text-muted">
        HOA and portfolio accounts hold multiple properties under centralized reporting.
      </p>

      <section className="mt-6">
        <h2 className="text-xl font-bold">Community &amp; portfolio</h2>
        {portfolio.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No HOA or portfolio accounts yet. Leads come through{" "}
            <Link href="/admin/support" className="text-cyan underline">
              support
            </Link>{" "}
            and the contact form.
          </p>
        ) : (
          table(portfolio)
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Individual &amp; household</h2>
        {individual.length === 0 ? (
          <p className="mt-3 text-base text-muted">No individual accounts yet.</p>
        ) : (
          table(individual)
        )}
      </section>
    </>
  );
}
