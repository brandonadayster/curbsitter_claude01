import { formatCents, ONE_TIME } from "@/config/business";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { requestBulkPickup } from "./actions";

export const metadata = { title: "Bulk Pickup Coordination" };
export const dynamic = "force-dynamic";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested — we're checking eligibility",
  quoted: "Quoted — awaiting your go-ahead",
  approved: "Approved",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Not eligible",
};

export default async function BulkPickupPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: properties }, { data: orders }] = await Promise.all([
    supabase.from("properties").select("id, address_line1, city").order("created_at"),
    supabase
      .from("orders")
      .select("id, status, requested_date, notes, created_at, order_items(service_id, scope, approved_price_cents)")
      .order("created_at", { ascending: false }),
  ]);

  const bulkOrders = (orders ?? []).filter((order) =>
    (order.order_items ?? []).some((item: { service_id: string }) => item.service_id === "bulk_pickup_coordination"),
  );

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Bulk pickup coordination</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Tell us what you need gone. We review the items, confirm they fit an eligible hauler
        bulk-pickup program, coordinate the appointment, and monitor it — starting at{" "}
        {formatCents(ONE_TIME.bulkPickupCoordinationStartingCents)}. We never haul or dispose of
        items ourselves, and physical curb placement is a separate quote.
      </p>

      {!properties || properties.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          Add a property first to request coordination.
        </p>
      ) : (
        <section className="mt-6 max-w-xl rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">New request</h2>
          <form action={requestBulkPickup} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="bp-property" className="mb-1 block text-base font-medium">
                Property
              </label>
              <select id="bp-property" name="propertyId" className={inputClasses}>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.address_line1}, {property.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bp-items" className="mb-1 block text-base font-medium">
                What needs to go?
              </label>
              <textarea
                id="bp-items"
                name="itemDescription"
                rows={4}
                placeholder="e.g., one worn-out sofa and a broken microwave"
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="bp-date" className="mb-1 block text-base font-medium">
                Preferred date <span className="text-muted">(optional)</span>
              </label>
              <input id="bp-date" name="requestedDate" type="date" className={inputClasses} />
            </div>
            <label className="flex items-start gap-3 text-base">
              <input type="checkbox" name="requestPlacement" className="mt-1 h-5 w-5" />
              <span>I&apos;d also like a quote for physical placement of the items at the curb.</span>
            </label>
            <label className="flex items-start gap-3 text-base">
              <input type="checkbox" name="authorizeCoordination" className="mt-1 h-5 w-5" />
              <span>
                I authorize CurbSitter to coordinate an eligible bulk pickup on my behalf. I
                understand acceptance and collection are up to the provider.
              </span>
            </label>
            <button
              type="submit"
              className="self-start rounded-lg bg-cyan px-5 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong"
            >
              Submit request
            </button>
          </form>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Your requests</h2>
        {bulkOrders.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No bulk requests yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {bulkOrders.map((order) => {
              const item = (order.order_items ?? []).find(
                (i: { service_id: string }) => i.service_id === "bulk_pickup_coordination",
              );
              return (
                <li key={order.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-border px-3 py-1 text-base text-muted">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    {item?.approved_price_cents ? (
                      <span className="text-base font-semibold">{formatCents(item.approved_price_cents)}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-base text-muted">{order.notes}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
