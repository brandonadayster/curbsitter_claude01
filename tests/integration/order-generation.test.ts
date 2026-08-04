import { beforeAll, describe, expect, it } from "vitest";

import { phoenixWeekday } from "@/lib/cycles";
import { generateTasksForOrder, OrderSchedulingError, rescheduleOrder } from "@/lib/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Integration test (local Supabase) for PP-14: one-time onDemand order
 * scheduling and self-serve reschedule. The expensive failure paths are
 * generating a visit on the wrong weekday, and auto-approving a reschedule
 * after the route for the original date has already been built.
 */

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

  it("refuses to schedule a date that doesn't match the verified weekday", async () => {
    const orderId = await createRequestedOrder();
    await supabase
      .from("orders")
      .update({ status: "approved", requested_date: "2026-08-06" }) // Thursday, not Wednesday
      .eq("id", orderId);

    await expect(generateTasksForOrder(orderId)).rejects.toThrow(OrderSchedulingError);

    const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).single();
    expect(order?.status).toBe("approved"); // Not stranded "scheduled" with no tasks.
  });

  it("auto-approves a reschedule while the route hasn't been built", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    await generateTasksForOrder(orderId);

    const newDate = "2026-08-12"; // Next Wednesday
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

    const { data: route } = await supabase
      .from("routes")
      .insert({ route_date: requestedDate, task_type: "rollout", status: "published" })
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

    await expect(rescheduleOrder(orderId, "2026-08-19", accountId)).rejects.toMatchObject({
      code: "route_already_set",
    });

    const { data: order } = await supabase
      .from("orders")
      .select("requested_date")
      .eq("id", orderId)
      .single();
    expect(order?.requested_date).toBe(requestedDate); // Unchanged.
  });

  it("rejects a reschedule to a date not later than the current one", async () => {
    const orderId = await createRequestedOrder();
    await supabase.from("orders").update({ status: "approved" }).eq("id", orderId);
    await generateTasksForOrder(orderId);

    await expect(rescheduleOrder(orderId, requestedDate, accountId)).rejects.toMatchObject({
      code: "date_not_later",
    });
  });
});
