import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { updateTicketStatus } from "./actions";

export const metadata = { title: "Admin — Support" };
export const dynamic = "force-dynamic";

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export default async function AdminSupportPage() {
  const supabase = createSupabaseAdminClient();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, body, status, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Support tickets</h1>

      {!tickets || tickets.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No support tickets.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {tickets.map((ticket) => {
            const opener = Array.isArray(ticket.profiles) ? ticket.profiles[0] : ticket.profiles;
            return (
              <li key={ticket.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{ticket.subject}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {opener?.full_name ?? "customer"} ·{" "}
                      {new Date(ticket.created_at).toLocaleString("en-US", { timeZone: "America/Phoenix" })}
                    </p>
                  </div>
                  <form action={updateTicketStatus} className="flex items-center gap-2">
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <label className="sr-only" htmlFor={`status-${ticket.id}`}>
                      Status
                    </label>
                    <select
                      id={`status-${ticket.id}`}
                      name="status"
                      defaultValue={ticket.status}
                      className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg bg-cyan px-4 py-2 text-base font-semibold text-bg hover:bg-cyan-strong">
                      Update
                    </button>
                  </form>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-base text-muted">{ticket.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
