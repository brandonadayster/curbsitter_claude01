import { beforeAll, describe, expect, it } from "vitest";

import { phoenixWeekday } from "@/lib/cycles";
import { generateTasksForOrder, OrderSchedulingError, rescheduleOrder } from "@/lib/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Integration test (local Supabase) for PP-14: one-time onDemand order
 * scheduling and self-serve reschedule. The expensive failure paths are
 * generating a visit on the wrong weekday, and auto-approving a reschedule
 * after the route for the original date has already been built.
 *
 * generateTasksForOrder computes the visit date at approval time (the next
 * occurrence of the property's trash weekday from "today"), so it is not
 * deterministic relative to a fixed constant across test runs. Tests that
 * exercise rescheduleOrder read the actual scheduled date back from the DB
 * after generation and compute relative dates from it, rather than assuming
 * a fixed value.
 */

/** Add whole weeks to an ISO date string, staying on the same weekday. */
function addWeeks(date: string, weeks: number): string {
  const d = new Date(`${date}T12:00:00-07:00`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

const localStackAvailable =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!localStackAvailable)("order scheduling", () => {
  const runId = Date.now();
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  let accountId: string;
  let propertyId: string;
  const requestedDate = "2026-08-05"; // Wednesday
  const weekday = phoenixWeekday(requestedDate);

  async function createRequestedOrder() {
    const { data: order } = await supabase
      .from("orders")
      .insert({
        account_id: accountId,
        property_id: propertyId,
        status: "requested",
        requested_date: requestedDate,
      })
      .select("id")
      .single();
    return order!.id as string;
  }

  beforeAll(async () => {
    supabase = createSupabaseAdminClient();
    const { data: account } = await supabase
      .from("accounts")
      .insert({ name: `Order Test ${runId}` })
      .select("id")
      .single();
    accountId = account!.id;

    const { data: property } = await supabase
      .from("properties")
      .insert({
        account_id: accountId,
        address_line1: `${runId} Order Test Ln`,
        city: "Prescott",
        postal_code: "86303",
        status: "pending_review",
      })
      .select("id")
      .single();
    propertyId = property!.id;

    await supabase
      .from("collection_schedules")
      .insert({ property_id: propertyId, weekday, verification_status: "verified" });
  });

  it("generates rollout+return tasks and marks the order scheduled", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);

    await generateTasksForOrder(orderId);

    const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
    expect(order?.status).toBe("scheduled");

    const { data: tasks } = await supabase
      .from("service_tasks")
      .select("task_type, status, order_id, cycle_id")
      .eq("order_id", orderId);
    expect(tasks).toHaveLength(2);
    expect(tasks?.every((task) => task.status === "scheduled" && task.cycle_id === null)).toBe(true);
    expect(new Set(tasks?.map((task) => task.task_type))).toEqual(new Set(["rollout", "return"]));
  });

  it("is idempotent — calling it again does not duplicate tasks", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    await generateTasksForOrder(orderId);
    await generateTasksForOrder(orderId); // Already "scheduled" — should no-op.

    const { count } = await supabase
      .from("service_tasks")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId);
    expect(count).toBe(2);
  });

  it("computes the visit date from the trash weekday, ignoring any stored requested_date", async () => {
    const orderId = await createRequestedOrder();
    await supabase
      .from("orders")
      // A stale/customer-supplied date must never leak through — the date is
      // always derived from the property's verified trash weekday.
      .update({ status: "approved", requested_date: "2026-08-06" }) // Thursday, not Wednesday
      .eq("id", orderId);

    await generateTasksForOrder(orderId);

    const { data: order } = await supabase
      .from("orders")
      .select("status, requested_date")
      .eq("id", orderId)
      .single();
    expect(order?.status).toBe("scheduled");
    expect(phoenixWeekday(order!.requested_date!)).toBe(weekday);
  });

  it("refuses to schedule a property with no verified collection day", async () => {
    const { data: property } = await supabase
      .from("properties")
      .insert({
        account_id: accountId,
        address_line1: `${runId} No Schedule Ln`,
        city: "Prescott",
        postal_code: "86303",
        status: "pending_review",
      })
      .select("id")
      .single();

    const { data: order } = await supabase
      .from("orders")
      .insert({ account_id: accountId, property_id: property!.id, status: "approved" })
      .select("id")
      .single();

    await expect(generateTasksForOrder(order!.id)).rejects.toThrow(OrderSchedulingError);

    const { data: reloaded } = await supabase.from("orders").select("status").eq("id", order!.id).single();
    expect(reloaded?.status).toBe("approved"); // Not stranded "scheduled" with no tasks.
  });

  it("auto-approves a reschedule while the route hasn't been built", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    await generateTasksForOrder(orderId);

    const { data: scheduled } = await supabase
      .from("orders")
      .select("requested_date")
      .eq("id", orderId)
      .single();
    const newDate = addWeeks(scheduled!.requested_date!, 1);
    await rescheduleOrder(orderId, newDate, accountId);

    const { data: order } = await supabase
      .from("orders")
      .select("requested_date")
      .eq("id", orderId)
      .single();
    expect(order?.requested_date).toBe(newDate);

    const { data: tasks } = await supabase
      .from("service_tasks")
      .select("status, window_start")
      .eq("order_id", orderId)
      .neq("status", "cancelled");
    expect(tasks).toHaveLength(2);

    const { count: cancelledCount } = await supabase
      .from("service_tasks")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)
      .eq("status", "cancelled");
    expect(cancelledCount).toBe(2);
  });

  it("blocks a reschedule once the task is assigned to a route", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    await generateTasksForOrder(orderId);

    const { data: scheduled } = await supabase
      .from("orders")
      .select("requested_date")
      .eq("id", orderId)
      .single();
    const scheduledDate = scheduled!.requested_date!;

    const { data: route } = await supabase
      .from("routes")
      .insert({ route_date: scheduledDate, task_type: "rollout", status: "published" })
      .select("id")
      .single();

    const { data: tasks } = await supabase
      .from("service_tasks")
      .select("id")
      .eq("order_id", orderId)
      .eq("task_type", "rollout");
    await supabase
      .from("service_tasks")
      .update({ status: "assigned", route_id: route!.id })
      .eq("id", tasks![0].id);

    await expect(rescheduleOrder(orderId, addWeeks(scheduledDate, 2), accountId)).rejects.toMatchObject({
      code: "route_already_set",
    });

    const { data: order } = await supabase
      .from("orders")
      .select("requested_date")
      .eq("id", orderId)
      .single();
    expect(order?.requested_date).toBe(scheduledDate); // Unchanged.
  });

  it("rejects a reschedule to a date not later than the current one", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    await generateTasksForOrder(orderId);

    const { data: scheduled } = await supabase
      .from("orders")
      .select("requested_date")
      .eq("id", orderId)
      .single();

    await expect(
      rescheduleOrder(orderId, scheduled!.requested_date!, accountId),
    ).rejects.toMatchObject({
      code: "date_not_later",
    });
  });
});
