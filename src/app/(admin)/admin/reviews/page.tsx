import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { decideReview } from "./actions";

export const metadata = { title: "Admin — Serviceability Reviews" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ReviewsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: pending } = await supabase
    .from("subscriptions")
    .select(
      `id, plan_id, billing_interval, created_at,
       properties (id, address_line1, address_line2, city, postal_code,
         property_instructions (bin_storage_location, curb_placement_notes),
         property_hazards (hazard_type, severity),
         collection_schedules (weekday, provider, verification_status),
         bins (id)),
       accounts (name)`,
    )
    .eq("status", "pending_serviceability_review")
    .order("created_at");

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Serviceability reviews</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Every paid signup stays pending until this review confirms the address, schedule,
        access, and route fit (D-018). Declines trigger the prompt-refund policy.
      </p>

      {!pending || pending.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No signups are waiting for review.
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {pending.map((subscription) => {
            const property = Array.isArray(subscription.properties)
              ? subscription.properties[0]
              : subscription.properties;
            const account = Array.isArray(subscription.accounts)
              ? subscription.accounts[0]
              : subscription.accounts;
            const instructions = property?.property_instructions?.[0] ?? property?.property_instructions;
            const schedules = property?.collection_schedules ?? [];
            const hazards = property?.property_hazards ?? [];
            return (
              <li key={subscription.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      {property?.address_line1}
                      {property?.address_line2 ? `, ${property.address_line2}` : ""} —{" "}
                      {property?.city} {property?.postal_code}
                    </h2>
                    <p className="mt-1 text-base text-muted">
                      {account?.name} · {subscription.plan_id} · {subscription.billing_interval} ·{" "}
                      {property?.bins?.length ?? 0} bins
                    </p>
                    <p className="mt-2 text-base">
                      <span className="text-muted">Storage:</span>{" "}
                      {instructions?.bin_storage_location ?? "—"}
                      {instructions?.curb_placement_notes ? (
                        <>
                          {" · "}
                          <span className="text-muted">Curb:</span> {instructions.curb_placement_notes}
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 text-base">
                      <span className="text-muted">Schedule:</span>{" "}
                      {schedules.length > 0
                        ? schedules
                            .map(
                              (schedule: { weekday: number | null; provider: string | null; verification_status: string }) =>
                                `${schedule.weekday !== null ? WEEKDAYS[schedule.weekday] : "unknown day"}${
                                  schedule.provider ? ` (${schedule.provider})` : ""
                                } [${schedule.verification_status}]`,
                            )
                            .join(", ")
                        : "—"}
                    </p>
                    {hazards.length > 0 ? (
                      <p className="mt-1 text-base">
                        <span className="text-muted">Flags:</span>{" "}
                        {hazards
                          .map((hazard: { hazard_type: string }) => hazard.hazard_type.replace(/_/g, " "))
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <form action={decideReview} className="flex flex-col items-stretch gap-2">
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <label className="sr-only" htmlFor={`note-${subscription.id}`}>
                      Review note
                    </label>
                    <input
                      id={`note-${subscription.id}`}
                      name="note"
                      placeholder="Note to customer (optional)"
                      className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        name="decision"
                        value="approve"
                        className="flex-1 rounded-lg bg-success px-4 py-2.5 text-base font-semibold text-bg"
                      >
                        Approve
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="decline"
                        className="flex-1 rounded-lg border border-danger/60 px-4 py-2.5 text-base font-semibold text-danger"
                      >
                        Decline
                      </button>
                    </div>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
