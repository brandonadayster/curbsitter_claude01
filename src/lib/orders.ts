import "server-only";

import {
  nextOccurrenceOfWeekday,
  phoenixTimestamp,
  phoenixToday,
  phoenixWeekday,
  previousDay,
} from "@/lib/phoenix-date";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * One-time "CurbSitter onDemand" order scheduling (finishes P6-02, powers
 * PP-14 self-serve reschedule). Mirrors the shape of src/lib/cycles.ts, but
 * for a single order rather than a batch of properties on one date.
 */

export class OrderSchedulingError extends Error {
  constructor(
    public code:
      | "not_found"
      | "weekday_mismatch"
      | "not_scheduled"
      | "route_already_set"
      | "date_not_later"
      | "write_failed",
    message: string,
  ) {
    super(message);
  }
}

interface OrderRow {
  id: string;
  status: string;
  property_id: string | null;
  requested_date: string | null;
}

async function loadOrder(orderId: string): Promise<OrderRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, property_id, requested_date")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) throw new OrderSchedulingError("not_found", "Order not found.");
  return data as OrderRow;
}

/**
 * The property's trash collection weekday, or null if unverified/unset. A
 * property can have a second `recycling` row on its own day (Complete plans),
 * so this is explicitly scoped to the trash stream — a one-time visit is
 * always anchored to trash day.
 */
async function trashWeekdayForProperty(propertyId: string): Promise<number | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("collection_schedules")
    .select("weekday")
    .eq("property_id", propertyId)
    .eq("waste_stream", "trash")
    .maybeSingle();
  return data?.weekday ?? null;
}

function assertWeekdayMatch(weekday: number | null, date: string): void {
  if (weekday === null || phoenixWeekday(date) !== weekday) {
    throw new OrderSchedulingError(
      "weekday_mismatch",
      "That date doesn't match this property's verified collection day.",
    );
  }
}

async function insertOrderTasks(
  orderId: string,
  propertyId: string,
  collectionDate: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const rolloutDate = previousDay(collectionDate);
  const { error } = await supabase.from("service_tasks").insert([
    {
      property_id: propertyId,
      order_id: orderId,
      task_type: "rollout",
      status: "scheduled",
      window_start: phoenixTimestamp(rolloutDate, "17:00"),
      window_end: phoenixTimestamp(rolloutDate, "22:00"),
    },
    {
      property_id: propertyId,
      order_id: orderId,
      task_type: "return",
      status: "scheduled",
      window_start: phoenixTimestamp(collectionDate, "12:00"),
      window_end: phoenixTimestamp(collectionDate, "21:00"),
    },
  ]);
  if (error) {
    throw new OrderSchedulingError("write_failed", `Task creation failed: ${error.message}`);
  }
}

/**
 * Generate the rollout/return service_tasks for a freshly admin-approved
 * one-time order. Unlike cycle generation (a manual, batched, multi-property
 * admin action), a one-time order is a single visit, so approval synchronously
 * creates its own tasks — no separate "generate" step. Idempotent: the
 * approved -> scheduled status transition is the gate, since a single order
 * has at most one active task pair.
 *
 * The visit date is *derived*, never customer-supplied: the next occurrence of
 * the property's trash collection day after approval. Signup only ever asks
 * which day of the week their trash runs; picking the actual date (and rolling
 * out the evening before) is ours to know.
 */
export async function generateTasksForOrder(orderId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const order = await loadOrder(orderId);
  if (order.status !== "approved") return; // Not awaiting generation.
  if (!order.property_id) {
    throw new OrderSchedulingError("not_found", "Order is missing a property.");
  }

  const weekday = await trashWeekdayForProperty(order.property_id);
  if (weekday === null) {
    throw new OrderSchedulingError(
      "weekday_mismatch",
      "This property has no verified collection day yet, so a visit can't be scheduled.",
    );
  }
  const collectionDate = nextOccurrenceOfWeekday(weekday, phoenixToday());

  // Claim the generation slot before writing tasks, so a duplicate call is a no-op.
  const { data: claimed, error: claimError } = await supabase
    .from("orders")
    .update({ status: "scheduled", requested_date: collectionDate })
    .eq("id", order.id)
    .eq("status", "approved")
    .select("id")
    .maybeSingle();
  if (claimError) {
    throw new OrderSchedulingError("write_failed", `Order update failed: ${claimError.message}`);
  }
  if (!claimed) return; // Another call already generated this order's tasks.

  try {
    await insertOrderTasks(order.id, order.property_id, collectionDate);
  } catch (error) {
    // Best-effort rollback so the order can be retried rather than stranded
    // "scheduled" with no tasks.
    await supabase
      .from("orders")
      .update({ status: "approved", requested_date: null })
      .eq("id", order.id)
      .eq("status", "scheduled");
    throw error;
  }
}

/**
 * Customer self-serve reschedule (PP-14), one-time orders only. Auto-approves
 * only while the order's route hasn't been built yet for its current date —
 * the technical equivalent of the owner's "24 hours or more advance notice,
 * unless tomorrow's route isn't set yet" rule: once a task is assigned to a
 * route, `buildAndAssignRoute` never re-checks it, so self-serve must stop
 * before that point rather than try to unwind a published route.
 */
export async function rescheduleOrder(
  orderId: string,
  newDate: string,
  actorId: string,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const order = await loadOrder(orderId);
  if (order.status !== "scheduled" || !order.property_id || !order.requested_date) {
    throw new OrderSchedulingError("not_scheduled", "This order isn't scheduled yet.");
  }
  if (newDate <= order.requested_date) {
    throw new OrderSchedulingError(
      "date_not_later",
      "Pick a date after your current scheduled date.",
    );
  }

  assertWeekdayMatch(await trashWeekdayForProperty(order.property_id), newDate);

  const { data: tasks, error: tasksError } = await supabase
    .from("service_tasks")
    .select("id, status, route_id")
    .eq("order_id", order.id)
    .neq("status", "cancelled");
  if (tasksError) {
    throw new OrderSchedulingError("write_failed", `Task lookup failed: ${tasksError.message}`);
  }
  if (!tasks || tasks.length === 0) {
    throw new OrderSchedulingError("not_scheduled", "No active visit found to reschedule.");
  }
  const routeAlreadySet = tasks.some((task) => task.route_id !== null || task.status !== "scheduled");
  if (routeAlreadySet) {
    throw new OrderSchedulingError(
      "route_already_set",
      "We're sorry — your route for this service date has already been finalized. We require " +
        "24 hours or more advance notice for schedule changes.",
    );
  }

  for (const task of tasks) {
    const { error: cancelError } = await supabase
      .from("service_tasks")
      .update({ status: "cancelled" })
      .eq("id", task.id)
      .eq("status", "scheduled"); // Optimistic guard against a concurrent move.
    if (cancelError) {
      throw new OrderSchedulingError("write_failed", `Task cancellation failed: ${cancelError.message}`);
    }
    await supabase.from("task_events").insert({
      task_id: task.id,
      event_type: "status:cancelled",
      from_status: "scheduled",
      to_status: "cancelled",
      actor_id: actorId,
      payload: { reason: "customer_reschedule" },
    });
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({ requested_date: newDate })
    .eq("id", order.id);
  if (orderError) {
    throw new OrderSchedulingError("write_failed", `Order update failed: ${orderError.message}`);
  }

  await insertOrderTasks(order.id, order.property_id, newDate);
}
