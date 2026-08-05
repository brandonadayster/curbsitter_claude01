import type { CommercialCheck } from "@/lib/property-usage-check";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { decideOrderReview, decideReview, setCollectionDay } from "./actions";

export const metadata = { title: "Admin — Serviceability Reviews" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ScheduleRow {
  weekday: number | null;
  provider: string | null;
  verification_status: string;
  needs_review_reason: string | null;
  city_weekday: number | null;
  waste_stream: string;
}

function trashSchedule(schedules: ScheduleRow[]): ScheduleRow | undefined {
  return schedules.find((schedule) => schedule.waste_stream === "trash");
}

/**
 * D-027: everything reaching this queue has a concrete reason. Name it, so
 * the reviewer knows what to check instead of re-deriving it per property.
 */
function ReviewReasons({
  schedules,
  commercialCheck,
}: {
  schedules: ScheduleRow[];
  commercialCheck: CommercialCheck | null;
}) {
  const trash = trashSchedule(schedules);
  const banners: string[] = [];

  if (trash?.needs_review_reason === "city_mismatch") {
    banners.push(
      `City records show ${trash.city_weekday !== null ? WEEKDAYS[trash.city_weekday] : "a different day"}; customer states ${
        trash.weekday !== null ? WEEKDAYS[trash.weekday] : "another day"
      }.`,
    );
  }
  if (trash?.needs_review_reason === "customer_unsure" && trash.weekday === null) {
    banners.push(
      "Customer doesn't know their collection day and City records don't cover this address. Look it up in the hauler's own schedule tool and set the day below.",
    );
  }
  if (commercialCheck?.status === "flagged" || commercialCheck?.status === "check_failed") {
    banners.push(
      "Parcel records suggest this may not be a residential property — verify before approving.",
    );
  }

  if (banners.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {banners.map((banner) => (
        <li
          key={banner}
          className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base"
        >
          {banner}
        </li>
      ))}
    </ul>
  );
}

/** Records a collection day an admin looked up manually (D-025 revision). */
function SetCollectionDayForm({ propertyId }: { propertyId: string }) {
  return (
    <form action={setCollectionDay} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <div>
        <label className="block text-base text-muted" htmlFor={`weekday-${propertyId}`}>
          Collection day
        </label>
        <select
          id={`weekday-${propertyId}`}
          name="weekday"
          defaultValue=""
          required
          className="mt-1 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
        >
          <option value="" disabled>
            Select a day
          </option>
          {WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-base text-muted" htmlFor={`provider-${propertyId}`}>
          Hauler (optional)
        </label>
        <input
          id={`provider-${propertyId}`}
          name="provider"
          placeholder="e.g. WM"
          className="mt-1 min-h-[44px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
        />
      </div>
      <button
        type="submit"
        className="min-h-[44px] rounded-lg bg-cyan px-5 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong"
      >
        Save day
      </button>
    </form>
  );
}

export default async function ReviewsPage() {
  const supabase = createSupabaseAdminClient();
  const [{ data: pending }, { data: pendingOrders }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        `id, plan_id, billing_interval, created_at, account_id,
         properties (id, address_line1, address_line2, city, postal_code,
           property_instructions (bin_storage_location, curb_placement_notes),
           property_hazards (hazard_type, severity),
           collection_schedules (weekday, provider, verification_status, needs_review_reason, city_weekday, waste_stream),
           bins (id)),
         accounts (name)`,
      )
      .eq("status", "pending_serviceability_review")
      .order("created_at"),
    supabase
      .from("orders")
      .select(
        `id, requested_date, created_at, account_id,
         properties (id, address_line1, address_line2, city, postal_code,
           property_instructions (bin_storage_location, curb_placement_notes),
           property_hazards (hazard_type, severity),
           collection_schedules (weekday, provider, verification_status, needs_review_reason, city_weekday, waste_stream),
           bins (id)),
         accounts (name)`,
      )
      .eq("status", "requested")
      .order("created_at"),
  ]);

  // The parcel check lives on the draft that produced the account; there's no
  // FK from subscriptions/orders to reach it, so it's joined here by account.
  const accountIds = [
    ...new Set(
      [...(pending ?? []), ...(pendingOrders ?? [])]
        .map((row) => row.account_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const commercialByAccount = new Map<string, CommercialCheck>();
  if (accountIds.length > 0) {
    const { data: drafts } = await supabase
      .from("onboarding_drafts")
      .select("finalized_account_id, commercial_check")
      .in("finalized_account_id", accountIds);
    for (const draft of drafts ?? []) {
      if (draft.finalized_account_id && draft.commercial_check) {
        commercialByAccount.set(draft.finalized_account_id, draft.commercial_check);
      }
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Serviceability reviews</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Signups that clear the automated collection-day and residential checks activate on
        their own (D-027). Everything below needs a human because one of those checks
        couldn&apos;t settle it — the reason is listed on each. Declines trigger the
        prompt-refund policy.
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
            const schedules = (property?.collection_schedules ?? []) as ScheduleRow[];
            const hazards = property?.property_hazards ?? [];
            const commercialCheck = subscription.account_id
              ? (commercialByAccount.get(subscription.account_id) ?? null)
              : null;
            const needsDay = trashSchedule(schedules)?.weekday == null;
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
                              (schedule: ScheduleRow) =>
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
                    <ReviewReasons schedules={schedules} commercialCheck={commercialCheck} />
                    {needsDay && property?.id ? (
                      <SetCollectionDayForm propertyId={property.id} />
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

      <h2 className="mt-12 text-2xl font-bold">One-time onDemand orders</h2>
      {!pendingOrders || pendingOrders.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No one-time orders are waiting for review.
        </p>
      ) : (
        <ul className="mt-4 space-y-6">
          {pendingOrders.map((order) => {
            const property = Array.isArray(order.properties) ? order.properties[0] : order.properties;
            const account = Array.isArray(order.accounts) ? order.accounts[0] : order.accounts;
            const instructions = property?.property_instructions?.[0] ?? property?.property_instructions;
            const schedules = (property?.collection_schedules ?? []) as ScheduleRow[];
            const hazards = property?.property_hazards ?? [];
            const commercialCheck = order.account_id
              ? (commercialByAccount.get(order.account_id) ?? null)
              : null;
            const needsDay = trashSchedule(schedules)?.weekday == null;
            return (
              <li key={order.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {property?.address_line1}
                      {property?.address_line2 ? `, ${property.address_line2}` : ""} —{" "}
                      {property?.city} {property?.postal_code}
                    </h3>
                    <p className="mt-1 text-base text-muted">
                      {account?.name} · CurbSitter onDemand · {property?.bins?.length ?? 0} bins
                    </p>
                    <p className="mt-1 text-base text-muted">
                      Approving schedules the next collection day below.
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
                              (schedule: ScheduleRow) =>
                                `${schedule.weekday !== null ? WEEKDAYS[schedule.weekday] : "unknown day"}${
                                  schedule.provider ? ` (${schedule.provider})` : ""
                                } [${schedule.verification_status}]`,
                            )
                            .join(", ")
                        : "—"}
                    </p>
                    {needsDay ? (
                      <p className="mt-1 text-base text-danger">
                        No verified collection day — approving will fail until the day is set below.
                      </p>
                    ) : null}
                    {hazards.length > 0 ? (
                      <p className="mt-1 text-base">
                        <span className="text-muted">Flags:</span>{" "}
                        {hazards
                          .map((hazard: { hazard_type: string }) => hazard.hazard_type.replace(/_/g, " "))
                          .join(", ")}
                      </p>
                    ) : null}
                    <ReviewReasons schedules={schedules} commercialCheck={commercialCheck} />
                    {needsDay && property?.id ? (
                      <SetCollectionDayForm propertyId={property.id} />
                    ) : null}
                  </div>
                  <form action={decideOrderReview} className="flex flex-col items-stretch gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <label className="sr-only" htmlFor={`order-note-${order.id}`}>
                      Review note
                    </label>
                    <input
                      id={`order-note-${order.id}`}
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
