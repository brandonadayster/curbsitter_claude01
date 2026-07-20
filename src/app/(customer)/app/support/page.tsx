import { createSupabaseServerClient } from "@/lib/supabase/server";

import { openSupportTicket } from "./actions";

export const metadata = { title: "Support" };
export const dynamic = "force-dynamic";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function SupportPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: tickets }, { data: memberships }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id, subject, body, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("account_members").select("account_id").limit(1),
  ]);

  const accountId = memberships?.[0]?.account_id ?? "";

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Support</h1>
      <p className="mt-2 text-base text-muted">
        Questions about your service, schedule, or account? Send us a note and we&apos;ll get back
        to you.
      </p>

      <section className="mt-6 max-w-xl rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Open a ticket</h2>
        <form action={openSupportTicket} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="accountId" value={accountId} />
          <div>
            <label htmlFor="st-subject" className="mb-1 block text-base font-medium">
              Subject
            </label>
            <input id="st-subject" name="subject" className={inputClasses} />
          </div>
          <div>
            <label htmlFor="st-body" className="mb-1 block text-base font-medium">
              How can we help?
            </label>
            <textarea id="st-body" name="body" rows={4} className={inputClasses} />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-cyan px-5 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong"
          >
            Send
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Your tickets</h2>
        {!tickets || tickets.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No tickets yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                  <span className="rounded-full border border-border px-3 py-1 text-base text-muted">
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </span>
                </div>
                <p className="mt-2 text-base text-muted">{ticket.body}</p>
                <p className="mt-2 text-sm text-muted">
                  {new Date(ticket.created_at).toLocaleString("en-US", { timeZone: "America/Phoenix" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
