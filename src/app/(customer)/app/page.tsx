import Link from "next/link";

import { PropertyPinMap } from "@/components/map/property-pin-map";
import { getSessionInfo } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { RescheduleForm } from "./reschedule-form";

export const metadata = { title: "Your Account" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ORDER_STATUS_LABELS: Record<string, string> = {
  requested: "Waiting on property and route review",
  quoted: "Awaiting your approval",
  approved: "Approved — scheduling your visit",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

const CYCLE_LABELS: Record<string, string> = {
  planned: "Planned",
  rollout_scheduled: "Rollout scheduled",
  rolled_out: "Bins out",
  collection_pending: "Bins out — awaiting collection",
  return_scheduled: "Return scheduled",
  completed: "Completed",
  completed_with_exception: "Completed with an exception",
  delayed_by_hauler: "Collection delayed by your hauler",
  blocked: "Needs your attention",
  cancelled: "Cancelled",
};

export default async function CustomerHomePage() {
  const session = (await getSessionInfo())!;
  const supabase = await createSupabaseServerClient();

  // All reads are RLS-scoped to the signed-in customer's accounts.
  const [{ data: properties }, { data: subscriptions }, { data: upcoming }, { data: orders }] =
    await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, address_line1, address_line2, city, postal_code, status, latitude, longitude, collection_schedules(weekday, verification_status)",
        )
        .order("created_at"),
      supabase
        .from("subscriptions")
        .select("id, status, plan_id, billing_interval, cancel_at_period_end, property_id"),
      supabase
        .from("collection_cycles")
        .select("id, collection_date, state, properties(address_line1)")
        .gte("collection_date", new Date().toISOString().slice(0, 10))
        .order("collection_date")
        .limit(5),
      supabase
        .from("orders")
        .select(
          `id, status, requested_date, properties(address_line1),
           service_tasks(id, status, route_id)`,
        )
        .not("status", "in", "(completed,cancelled,declined)")
        .order("created_at"),
    ]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
      <p className="mt-1 text-lg text-muted">{session.email}</p>

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Next service</h2>
        {!upcoming || upcoming.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            Nothing is scheduled yet. Once your property review is approved and your collection
            day arrives, service appears here automatically.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((cycle) => {
              const property = Array.isArray(cycle.properties) ? cycle.properties[0] : cycle.properties;
              return (
                <li key={cycle.id} className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-lg font-semibold">
                    {new Date(`${cycle.collection_date}T12:00:00-07:00`).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      timeZone: "America/Phoenix",
                    })}{" "}
                    — {property?.address_line1}
                  </p>
                  <p className="mt-1 text-base text-muted">
                    {CYCLE_LABELS[cycle.state] ?? cycle.state} · Rollout the evening before
                    (5–10 p.m.), return after collection.
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {orders && orders.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold">Your one-time service</h2>
          <ul className="mt-3 space-y-3">
            {orders.map((order) => {
              const property = Array.isArray(order.properties) ? order.properties[0] : order.properties;
              const tasks = order.service_tasks ?? [];
              const canReschedule =
                order.status === "scheduled" &&
                tasks.length > 0 &&
                tasks.every((task) => task.status === "scheduled" && task.route_id === null);
              return (
                <li key={order.id} className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-lg font-semibold">
                    {order.requested_date ?? "Date pending"} — {property?.address_line1}
                  </p>
                  <p className="mt-1 text-base text-muted">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </p>
                  {canReschedule ? (
                    <RescheduleForm orderId={order.id} currentDate={order.requested_date!} />
                  ) : order.status === "scheduled" ? (
                    <p className="mt-2 text-base text-muted">
                      Your route for this service date has already been finalized, so this visit
                      can no longer be rescheduled online.
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    We require 24 hours or more advance notice for schedule changes.
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Your properties</h2>
        {!properties || properties.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
            No properties yet.{" "}
            <Link href="/#address-check" className="text-cyan underline">
              Check your address
            </Link>{" "}
            to get started.
          </p>
        ) : (
          <>
            <PropertyPinMap
              properties={properties.map((property) => ({
                id: property.id,
                addressLine1: property.address_line1,
                latitude: property.latitude,
                longitude: property.longitude,
              }))}
              className="mt-3 h-56 w-full overflow-hidden rounded-2xl"
            />
            <ul className="mt-3 grid gap-4 sm:grid-cols-2">
              {properties.map((property) => {
                const subscription = (subscriptions ?? []).find(
                  (item) => item.property_id === property.id,
                );
                const schedule = property.collection_schedules?.[0];
                return (
                  <li key={property.id}>
                    <Link
                      href={`/app/properties/${property.id}`}
                      className="block h-full rounded-2xl border border-border bg-surface p-5 hover:border-cyan/60"
                    >
                      <p className="text-lg font-semibold">
                        {property.address_line1}
                        {property.address_line2 ? `, ${property.address_line2}` : ""}
                      </p>
                      <p className="text-base text-muted">
                        {property.city} {property.postal_code}
                      </p>
                      <p className="mt-2 text-base">
                        {subscription
                          ? subscription.status === "pending_serviceability_review"
                            ? "Pending property and route review"
                            : subscription.status === "active" && subscription.cancel_at_period_end
                              ? "Active — cancels at renewal"
                              : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
                          : "No subscription"}
                        {schedule?.weekday !== null && schedule?.weekday !== undefined
                          ? ` · ${WEEKDAYS[schedule.weekday]}s`
                          : ""}
                      </p>
                      <p className="mt-2 text-base text-cyan underline">Instructions &amp; access →</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
