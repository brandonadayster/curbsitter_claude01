import { createSupabaseServerClient } from "@/lib/supabase/server";

import { TaskCard } from "./task-card";

export const metadata = { title: "Service History" };
export const dynamic = "force-dynamic";

const STATE_LABELS: Record<string, string> = {
  planned: "Planned",
  rollout_scheduled: "Rollout scheduled",
  rolled_out: "Bins out",
  collection_pending: "Bins out — awaiting collection",
  return_scheduled: "Return scheduled",
  completed: "Completed",
  completed_with_exception: "Completed with an exception",
  delayed_by_hauler: "Collection delayed by your hauler",
  blocked: "Needed your attention",
  cancelled: "Cancelled",
};

const ORDER_STATE_LABELS: Record<string, string> = {
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: cycles }, { data: orders }] = await Promise.all([
    supabase
      .from("collection_cycles")
      .select(
        `id, collection_date, state,
         properties (address_line1),
         service_tasks (id, task_type, status, completed_at,
           service_photos (id, photo_type, taken_at),
           exceptions (id, exception_type, description, status, resolution, customer_visible))`,
      )
      .order("collection_date", { ascending: false })
      .limit(20),
    supabase
      .from("orders")
      .select(
        `id, requested_date, status,
         properties (address_line1),
         service_tasks (id, task_type, status, completed_at,
           service_photos (id, photo_type, taken_at),
           exceptions (id, exception_type, description, status, resolution, customer_visible))`,
      )
      .in("status", ["completed", "cancelled", "declined"])
      .order("requested_date", { ascending: false })
      .limit(20),
  ]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Service history</h1>
      <p className="mt-2 text-base text-muted">
        Every visit is photo-confirmed. Photo links open a secure, time-limited view.
      </p>

      {!cycles || cycles.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No service cycles yet — history appears after your first scheduled trash day.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {cycles.map((cycle) => {
            const property = Array.isArray(cycle.properties) ? cycle.properties[0] : cycle.properties;
            const tasks = cycle.service_tasks ?? [];
            return (
              <li key={cycle.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold">
                    {new Date(`${cycle.collection_date}T12:00:00-07:00`).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "America/Phoenix",
                    })}
                  </h2>
                  <span className="rounded-full border border-border px-3 py-1 text-base text-muted">
                    {STATE_LABELS[cycle.state] ?? cycle.state}
                  </span>
                </div>
                <p className="mt-1 text-base text-muted">{property?.address_line1}</p>

                <ul className="mt-4 space-y-3">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      {orders && orders.length > 0 ? (
        <>
          <h2 className="mt-10 text-2xl font-bold">One-time onDemand orders</h2>
          <ul className="mt-6 space-y-5">
            {orders.map((order) => {
              const property = Array.isArray(order.properties) ? order.properties[0] : order.properties;
              const tasks = order.service_tasks ?? [];
              return (
                <li key={order.id} className="rounded-2xl border border-border bg-surface p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl font-bold">
                      {order.requested_date
                        ? new Date(`${order.requested_date}T12:00:00-07:00`).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "America/Phoenix",
                          })
                        : "Date not set"}
                    </h3>
                    <span className="rounded-full border border-border px-3 py-1 text-base text-muted">
                      {ORDER_STATE_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-base text-muted">{property?.address_line1}</p>

                  <ul className="mt-4 space-y-3">
                    {tasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </>
  );
}
