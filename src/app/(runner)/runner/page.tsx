import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Runner — My Route" };
export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["assigned", "en_route", "arrived", "exception", "retry_required"];

function formatWindow(start: string | null, end: string | null): string {
  if (!start || !end) return "window not set";
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  };
  return `${new Date(start).toLocaleTimeString("en-US", options)} – ${new Date(end).toLocaleTimeString("en-US", options)}`;
}

export default async function RunnerHomePage() {
  const session = await requireRole(["runner", "admin", "dispatcher"]);
  const supabase = createSupabaseAdminClient();

  // Least-privilege projection: only what field work needs, minus secrets.
  const { data: tasks } = await supabase
    .from("service_tasks")
    .select(
      "id, task_type, status, sequence, window_start, window_end, properties(address_line1, city)",
    )
    .eq("assigned_runner_id", session.userId)
    .in("status", ACTIVE_STATUSES)
    .order("window_start")
    .order("sequence");

  const { data: recentDone } = await supabase
    .from("service_tasks")
    .select("id, task_type, completed_at, properties(address_line1)")
    .eq("assigned_runner_id", session.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My route</h1>
          <p className="mt-1 text-lg text-muted">{session.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-base text-muted underline hover:text-text">
            Sign out
          </button>
        </form>
      </div>

      {!tasks || tasks.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No assigned stops right now. Dispatch will publish your next route.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {tasks.map((task) => {
            const property = Array.isArray(task.properties) ? task.properties[0] : task.properties;
            return (
              <li key={task.id}>
                <Link
                  href={`/runner/tasks/${task.id}`}
                  className="block rounded-2xl border border-border bg-surface p-5 hover:border-cyan/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xl font-bold">
                      {task.sequence ? `#${task.sequence} · ` : ""}
                      {task.task_type === "rollout"
                        ? "Roll out"
                        : task.task_type === "recheck"
                          ? "Recheck"
                          : "Return"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-base font-medium ${
                        task.status === "exception"
                          ? "border-warning/60 text-warning"
                          : "border-cyan/50 text-cyan"
                      }`}
                    >
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-lg">
                    {property?.address_line1}, {property?.city}
                  </p>
                  <p className="mt-1 text-base text-muted">
                    Window: {formatWindow(task.window_start, task.window_end)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/runner/incidents/new"
        className="mt-8 block rounded-xl border border-warning/60 px-6 py-3.5 text-center text-lg font-semibold text-warning"
      >
        Report a safety incident
      </Link>

      {recentDone && recentDone.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Recently completed</h2>
          <ul className="mt-3 space-y-2">
            {recentDone.map((task) => {
              const property = Array.isArray(task.properties) ? task.properties[0] : task.properties;
              return (
                <li key={task.id} className="text-base text-muted">
                  ✓ {task.task_type} — {property?.address_line1}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
