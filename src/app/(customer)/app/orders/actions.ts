"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { getSessionInfo } from "@/lib/auth";
import { OrderSchedulingError, rescheduleOrder } from "@/lib/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Self-serve reschedule for a one-time CurbSitter onDemand order (PP-14).
 * Authorization mirrors src/app/(customer)/app/billing/actions.ts: an
 * RLS-scoped read confirms account membership, then the write goes through
 * the service role (src/lib/orders.ts) since customers have no direct write
 * policy on orders/service_tasks.
 */
const rescheduleSchema = z.object({
  orderId: z.string().uuid(),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
});

async function authorizeOrder(orderId: string, profileId: string) {
  const rlsClient = await createSupabaseServerClient();
  const { data: order } = await rlsClient
    .from("orders")
    .select("id, account_id, requested_date")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found.");

  const { data: membership } = await rlsClient
    .from("account_members")
    .select("role")
    .eq("account_id", order.account_id)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    throw new Error("Only account owners and managers can reschedule service.");
  }
  return order;
}

export async function requestReschedule(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");

  const parsed = rescheduleSchema.safeParse({
    orderId: formData.get("orderId"),
    newDate: formData.get("newDate"),
  });
  if (!parsed.success) throw new Error("Pick a valid date.");

  const order = await authorizeOrder(parsed.data.orderId, session.userId);

  try {
    await rescheduleOrder(order.id, parsed.data.newDate, session.userId);
  } catch (error) {
    if (error instanceof OrderSchedulingError) throw new Error(error.message);
    throw error;
  }

  await auditLog({
    actorId: session.userId,
    action: "orders.reschedule",
    entity: "orders",
    entityId: order.id,
    before: { requested_date: order.requested_date },
    after: { requested_date: parsed.data.newDate },
  });

  revalidatePath("/app");
}
