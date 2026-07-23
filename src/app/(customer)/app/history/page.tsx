import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function HistoryPage() {
  const supabase = await createSupabaseServerClient();

  const { data: cycles } = await supabase
    .from("collection_cycles")
    .select(
      `id, collection_date, state,
       properties (address_line1),
       service_tasks (id, task_type, status, completed_at,
         service_photos (id, photo_type, taken_at),
         exceptions (id, exception_type, description, status, resolution, customer_visible))`,
    )
    .order("collection_date", { ascending: false })
    .limit(20);

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
                  {tasks.map((task) => {
                    const photos = (task.service_photos ?? []).filter((photo: { photo_type: string }) =>
                      ["rollout_proof", "return_proof", "exception"].includes(photo.photo_type),
                    );
                    const visibleExceptions = (task.exceptions ?? []).filter(
                      (exception: { customer_visible: boolean }) => exception.customer_visible,
                    );
                    return (
                      <li key={task.id} className="rounded-xl border border-border bg-surface-2 p-4">
                        <p className="text-lg font-semibold capitalize">
                          {task.task_type}{" "}
                          <span className="font-normal text-muted">
                            — {task.status.replace(/_/g, " ")}
                            {task.completed_at
                              ? ` at ${new Date(task.completed_at).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  timeZone: "America/Phoenix",
                                })}`
                              : ""}
                          </span>
                        </p>
                        {photos.length > 0 ? (
                          <p className="mt-2 text-base">
                            {photos.map((photo: { id: string; photo_type: string }, index: number) => (
                              <a
                                key={photo.id}
                                href={`/api/photos/${photo.id}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="mr-4 text-cyan underline"
                              >
                                View {photo.photo_type.replace(/_/g, " ")}
                                {photos.length > 1 ? ` ${index + 1}` : ""}
                              </a>
                            ))}
                          </p>
                        ) : null}
                        {visibleExceptions.map(
                          (exception: {
                            id: string;
                            exception_type: string;
                            description: string | null;
                            status: string;
                            resolution: string | null;
                          }) => (
                            <div
                              key={exception.id}
                              className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base"
                            >
                              <p>
                                <strong>{exception.exception_type.replace(/_/g, " ")}</strong>
                                {exception.description ? ` — ${exception.description}` : ""}
                              </p>
                              {exception.status === "resolved" && exception.resolution ? (
                                <p className="mt-1 text-muted">Resolution: {exception.resolution}</p>
                              ) : (
                                <p className="mt-1 text-muted">Our team is on it.</p>
                              )}
                            </div>
                          ),
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
