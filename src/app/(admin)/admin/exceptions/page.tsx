import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { resolveException, retryTask, scheduleRecheck } from "./actions";

export const metadata = { title: "Admin — Exceptions" };
export const dynamic = "force-dynamic";

const inputClasses = "rounded-lg border border-border bg-surface-2 px-3 py-2 text-base";

export default async function ExceptionsPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: exceptions }, { data: delayedCycles }, { data: runners }, { data: incidents }] =
    await Promise.all([
      supabase
        .from("exceptions")
        .select(
          `id, exception_type, severity, description, status, created_at, resolution,
           service_tasks (id, task_type, status, properties (address_line1, city))`,
        )
        .neq("status", "resolved")
        .order("created_at"),
      supabase
        .from("collection_cycles")
        .select("id, collection_date, properties(address_line1, city)")
        .eq("state", "delayed_by_hauler")
        .order("collection_date"),
      supabase.from("profiles").select("id, full_name").eq("platform_role", "runner"),
      supabase
        .from("incidents")
        .select("id, severity, description, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Exceptions &amp; incidents</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Every exception needs an owner, a customer message, and a closure rule. Credits are not
        automatic guilt; denials are not automatic defensiveness.
      </p>

      <section className="mt-6">
        <h2 className="text-xl font-bold">Open exceptions</h2>
        {!exceptions || exceptions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No open exceptions.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {exceptions.map((exception) => {
              const task = Array.isArray(exception.service_tasks)
                ? exception.service_tasks[0]
                : exception.service_tasks;
              const property = task
                ? Array.isArray(task.properties)
                  ? task.properties[0]
                  : task.properties
                : null;
              return (
                <li key={exception.id} className="rounded-2xl border border-warning/40 bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold">
                        {exception.exception_type.replace(/_/g, " ")}{" "}
                        <span className="font-normal text-muted">({exception.severity})</span>
                      </p>
                      {property ? (
                        <p className="mt-1 text-base">
                          {property.address_line1}, {property.city} — {task?.task_type} task,
                          currently {task?.status}
                        </p>
                      ) : null}
                      {exception.description ? (
                        <p className="mt-1 text-base text-muted">“{exception.description}”</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3">
                      {task?.status === "exception" ? (
                        <form action={retryTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-border px-4 py-2 text-base font-semibold hover:border-cyan/60"
                          >
                            Retry task (back to scheduled)
                          </button>
                        </form>
                      ) : null}
                      <form action={resolveException} className="flex gap-2">
                        <input type="hidden" name="exceptionId" value={exception.id} />
                        <label className="sr-only" htmlFor={`res-${exception.id}`}>
                          Resolution
                        </label>
                        <input
                          id={`res-${exception.id}`}
                          name="resolution"
                          placeholder="Resolution note"
                          className={inputClasses}
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-success px-4 py-2 text-base font-semibold text-bg"
                        >
                          Resolve
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
        <h2 className="text-xl font-bold">Cycles delayed by the hauler</h2>
        <p className="mt-1 text-base text-muted">
          Schedule a recheck: verify collection happened, then return the bins. The customer sees
          “collection delayed,” never a faked completed return.
        </p>
        {!delayedCycles || delayedCycles.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No delayed cycles.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {delayedCycles.map((cycle) => {
              const property = Array.isArray(cycle.properties) ? cycle.properties[0] : cycle.properties;
              return (
                <li key={cycle.id} className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-lg font-bold">
                    {property?.address_line1}, {property?.city}{" "}
                    <span className="font-normal text-muted">
                      — collection day {cycle.collection_date}
                    </span>
                  </p>
                  <form action={scheduleRecheck} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="cycleId" value={cycle.id} />
                    <div>
                      <label htmlFor={`recheck-date-${cycle.id}`} className="mb-1 block text-base font-medium">
                        Recheck date
                      </label>
                      <input
                        id={`recheck-date-${cycle.id}`}
                        name="recheckDate"
                        type="date"
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label htmlFor={`recheck-runner-${cycle.id}`} className="mb-1 block text-base font-medium">
                        Runner (optional)
                      </label>
                      <select id={`recheck-runner-${cycle.id}`} name="runnerId" className={inputClasses}>
                        <option value="">Route later</option>
                        {(runners ?? []).map((runner) => (
                          <option key={runner.id} value={runner.id}>
                            {runner.full_name ?? runner.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-cyan px-4 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong"
                    >
                      Schedule recheck
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Safety incidents</h2>
        {!incidents || incidents.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No incidents reported.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {incidents.map((incident) => {
              const reporter = Array.isArray(incident.profiles) ? incident.profiles[0] : incident.profiles;
              return (
                <li
                  key={incident.id}
                  className={`rounded-xl border px-4 py-3 text-base ${
                    incident.severity === "critical"
                      ? "border-danger/60 bg-danger/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <strong>{incident.severity}</strong> — {incident.description}{" "}
                  <span className="text-muted">
                    ({reporter?.full_name ?? "unknown"},{" "}
                    {new Date(incident.created_at).toLocaleString("en-US", {
                      timeZone: "America/Phoenix",
                    })}
                    )
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
