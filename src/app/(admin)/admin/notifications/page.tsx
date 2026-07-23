import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { runOutboxNow } from "./actions";

export const metadata = { title: "Admin — Notifications" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending: "text-warning",
  sending: "text-cyan",
  sent: "text-success",
  failed: "text-danger",
  cancelled: "text-muted",
};

export default async function AdminNotificationsPage() {
  const supabase = createSupabaseAdminClient();

  const { data: rows } = await supabase
    .from("notification_outbox")
    .select("id, template_id, channel, recipient, status, attempts, last_error, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(40);

  const counts = (rows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Notification outbox</h1>
        <form action={runOutboxNow}>
          <button type="submit" className="rounded-lg bg-cyan px-4 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong">
            Process pending now
          </button>
        </form>
      </div>
      <p className="mt-2 text-base text-muted">
        In production a cron job hits <code>/api/jobs/outbox</code> every minute. Recent 40 shown.
        {" "}
        Pending: {counts.pending ?? 0} · Sent: {counts.sent ?? 0} · Failed: {counts.failed ?? 0}
      </p>

      {!rows || rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          The outbox is empty.
        </p>
      ) : (
        <table className="mt-6 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-base font-semibold">Template</th>
              <th className="px-4 py-3 text-base font-semibold">Recipient</th>
              <th className="px-4 py-3 text-base font-semibold">Status</th>
              <th className="px-4 py-3 text-base font-semibold">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-t border-border px-4 py-3 text-base">{row.template_id ?? "—"}</td>
                <td className="border-t border-border px-4 py-3 text-base">{row.recipient}</td>
                <td className={`border-t border-border px-4 py-3 text-base font-medium ${STATUS_STYLES[row.status] ?? ""}`}>
                  {row.status}
                  {row.last_error ? <span className="block text-sm text-muted">{row.last_error}</span> : null}
                </td>
                <td className="border-t border-border px-4 py-3 text-base">{row.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
