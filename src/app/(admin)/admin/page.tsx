import Link from "next/link";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin — Overview" };
export const dynamic = "force-dynamic";

async function count(table: string, filters: Record<string, string>): Promise<number> {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }
  const { count: value } = await query;
  return value ?? 0;
}

export default async function AdminOverviewPage() {
  const [pendingReviews, waitingLeads, openExceptions, scheduledTasks] = await Promise.all([
    count("subscriptions", { status: "pending_serviceability_review" }),
    count("waitlist_leads", { status: "waiting" }),
    count("exceptions", { status: "open" }),
    count("service_tasks", { status: "scheduled" }),
  ]);

  const cards = [
    { label: "Pending serviceability reviews", value: pendingReviews, href: "/admin/reviews" },
    { label: "Waitlist leads waiting", value: waitingLeads, href: "/admin/route-cells" },
    { label: "Open exceptions", value: openExceptions, href: "/admin/cycles" },
    { label: "Scheduled tasks", value: scheduledTasks, href: "/admin/cycles" },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Operations overview</h1>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-border bg-surface p-6 hover:border-cyan/50"
          >
            <p className="text-4xl font-bold">{card.value}</p>
            <p className="mt-1 text-base text-muted">{card.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
