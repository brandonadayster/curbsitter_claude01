import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { buildAndAssignRoute, generateCycles } from "./actions";

export const metadata = { title: "Admin — Cycles & Routes" };
export const dynamic = "force-dynamic";

const inputClasses = "rounded-lg border border-border bg-surface-2 px-3 py-2 text-base";

export default async function CyclesPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: runners }, { data: cycles }, { data: routes }, { data: exceptions }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("platform_role", "runner"),
      supabase
        .from("collection_cycles")
        .select(
          "id, collection_date, state, properties(address_line1, city), service_tasks(id, task_type, status, sequence, assigned_runner_id)",
        )
        .order("collection_date", { ascending: false })
        .limit(25),
      supabase
        .from("routes")
        .select("id, route_date, task_type, status, runner_id, profiles(full_name)")
        .order("route_date", { ascending: false })
        .limit(10),
      supabase
        .from("exceptions")
        .select("id, exception_type, severity, description, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Cycles &amp; routes</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">1 · Generate cycles for a collection date</h2>
          <p className="mt-1 text-base text-muted">
            Creates a cycle plus rollout/return tasks for every active property whose verified
            schedule matches that weekday. Safe to re-run — existing cycles are skipped.
          </p>
          <form action={generateCycles} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="gen-date" className="mb-1 block text-base font-medium">
                Collection date
              </label>
              <input id="gen-date" name="collectionDate" type="date" required className={inputClasses} />
            </div>
            <button type="submit" className="rounded-lg bg-cyan px-4 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong">
              Generate
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">2 · Build &amp; assign a route</h2>
          <p className="mt-1 text-base text-muted">
            Attaches all unassigned scheduled tasks of one type on a date to a new published
            route, ordered by address, and assigns the runner.
          </p>
          <form action={buildAndAssignRoute} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="route-date" className="mb-1 block text-base font-medium">
                Route date
              </label>
              <input id="route-date" name="routeDate" type="date" required className={inputClasses} />
            </div>
            <div>
              <label htmlFor="route-type" className="mb-1 block text-base font-medium">
                Task type
              </label>
              <select id="route-type" name="taskType" className={inputClasses}>
                <option value="rollout">rollout</option>
                <option value="return">return</option>
              </select>
            </div>
            <div>
              <label htmlFor="route-runner" className="mb-1 block text-base font-medium">
                Runner
              </label>
              <select id="route-runner" name="runnerId" className={inputClasses}>
                {(runners ?? []).map((runner) => (
                  <option key={runner.id} value={runner.id}>
                    {runner.full_name ?? runner.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-cyan px-4 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong">
              Build route
            </button>
          </form>
        </section>
      </div>

      {exceptions && exceptions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Open exceptions</h2>
          <ul className="mt-3 space-y-2">
            {exceptions.map((exception) => (
              <li key={exception.id} className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-base">
                <strong>{exception.exception_type.replace(/_/g, " ")}</strong>
                {exception.description ? ` — ${exception.description}` : ""}{" "}
                <span className="text-muted">({exception.severity})</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Recent routes</h2>
        {!routes || routes.length === 0 ? (
          <p className="mt-3 text-base text-muted">No routes yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {routes.map((route) => {
              const runner = Array.isArray(route.profiles) ? route.profiles[0] : route.profiles;
              return (
                <li key={route.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-base">
                  {route.route_date} · {route.task_type} · {route.status} ·{" "}
                  {runner?.full_name ?? "unassigned"}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Recent cycles</h2>
        {!cycles || cycles.length === 0 ? (
          <p className="mt-3 text-base text-muted">
            No cycles yet — approve a review, then generate cycles for its collection day.
          </p>
        ) : (
          <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-base font-semibold">Date</th>
                <th className="px-4 py-3 text-base font-semibold">Property</th>
                <th className="px-4 py-3 text-base font-semibold">Cycle state</th>
                <th className="px-4 py-3 text-base font-semibold">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => {
                const property = Array.isArray(cycle.properties) ? cycle.properties[0] : cycle.properties;
                return (
                  <tr key={cycle.id}>
                    <td className="border-t border-border px-4 py-3 text-base">{cycle.collection_date}</td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {property?.address_line1}, {property?.city}
                    </td>
                    <td className="border-t border-border px-4 py-3 text-base">{cycle.state}</td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {(cycle.service_tasks ?? [])
                        .map((task: { task_type: string; status: string }) => `${task.task_type}:${task.status}`)
                        .join(" · ")}
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
