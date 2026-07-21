import { formatCents } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { updateBulkOrder } from "./actions";

export const metadata = { title: "Admin — Bulk Orders" };
export const dynamic = "force-dynamic";

const STATUSES = ["requested", "quoted", "approved", "scheduled", "completed", "cancelled", "declined"] as const;
const inputClasses = "rounded-lg border border-border bg-surface-2 px-3 py-2 text-base";

export default async function AdminOrdersPage() {
  const supabase = createSupabaseAdminClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, requested_date, notes, created_at, accounts(name), properties(address_line1, city), order_items(service_id, scope, approved_price_cents)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const bulkOrders = (orders ?? []).filter((order) =>
    (order.order_items ?? []).some((item: { service_id: string }) => item.service_id === "bulk_pickup_coordination"),
  );

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Bulk pickup coordination</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Confirm eligibility, coordinate the provider, and record the coordination price. Physical
        placement is a separate quote — never implied, never auto-charged.
      </p>

      {bulkOrders.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No bulk coordination requests.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {bulkOrders.map((order) => {
            const account = Array.isArray(order.accounts) ? order.accounts[0] : order.accounts;
            const property = Array.isArray(order.properties) ? order.properties[0] : order.properties;
            const coordination = (order.order_items ?? []).find(
              (i: { service_id: string }) => i.service_id === "bulk_pickup_coordination",
            );
            const placement = (order.order_items ?? []).find(
              (i: { service_id: string }) => i.service_id === "bulk_physical_placement",
            );
            const wantsPlacement =
              coordination?.scope === "coordination_plus_placement_quote";
            return (
              <li key={order.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {property?.address_line1}, {property?.city}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {account?.name} ·{" "}
                      {new Date(order.created_at).toLocaleDateString("en-US", { timeZone: "America/Phoenix" })}
                      {order.requested_date ? ` · wants ${order.requested_date}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-base text-muted">
                    {order.status}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-base text-muted">{order.notes}</p>
                {wantsPlacement ? (
                  <p className="mt-2 text-base text-warm">Customer requested a physical-placement quote.</p>
                ) : null}
                <p className="mt-1 text-base">
                  Coordination: {coordination?.approved_price_cents ? formatCents(coordination.approved_price_cents) : "not quoted"}
                  {" · "}Placement: {placement?.approved_price_cents ? formatCents(placement.approved_price_cents) : "not quoted"}
                </p>

                <form action={updateBulkOrder} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <div>
                    <label htmlFor={`status-${order.id}`} className="mb-1 block text-sm font-medium">Status</label>
                    <select id={`status-${order.id}`} name="status" defaultValue={order.status} className={inputClasses}>
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`coord-${order.id}`} className="mb-1 block text-sm font-medium">Coordination $ (cents)</label>
                    <input id={`coord-${order.id}`} name="coordinationPriceCents" type="number" min={0} placeholder="4900" className={`${inputClasses} w-32`} />
                  </div>
                  <div>
                    <label htmlFor={`place-${order.id}`} className="mb-1 block text-sm font-medium">Placement $ (cents)</label>
                    <input id={`place-${order.id}`} name="placementQuoteCents" type="number" min={0} placeholder="0" className={`${inputClasses} w-32`} />
                  </div>
                  <div className="min-w-48 flex-1">
                    <label htmlFor={`note-${order.id}`} className="mb-1 block text-sm font-medium">Provider note</label>
                    <input id={`note-${order.id}`} name="providerNote" placeholder="Eligibility / provider details" className={`${inputClasses} w-full`} />
                  </div>
                  <button type="submit" className="rounded-lg bg-cyan px-4 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong">
                    Save
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
