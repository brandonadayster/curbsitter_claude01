"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["requested", "quoted", "approved", "scheduled", "completed", "cancelled", "declined"]),
  providerNote: z.string().trim().max(2000).optional().or(z.literal("")),
  coordinationPriceCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
  placementQuoteCents: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

/**
 * Admin update for a Bulk Pickup Coordination order: eligibility decision,
 * status, provider note, and the coordination / separately-quoted physical
 * placement prices. Prices are recorded on the order items; nothing is charged
 * automatically (a growth add-on can't create unapproved charges).
 */
export async function updateBulkOrder(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);

  const parsed = updateSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    providerNote: formData.get("providerNote"),
    coordinationPriceCents: formData.get("coordinationPriceCents") || undefined,
    placementQuoteCents: formData.get("placementQuoteCents") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid order update.");

  const supabase = createSupabaseAdminClient();

  const noteSuffix = parsed.data.providerNote
    ? `\n\n[admin] ${parsed.data.providerNote}`
    : "";
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("notes")
    .eq("id", parsed.data.orderId)
    .single();
  if (orderError || !order) throw new Error("Order not found.");

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: parsed.data.status,
      notes: parsed.data.providerNote ? `${order.notes ?? ""}${noteSuffix}` : order.notes,
    })
    .eq("id", parsed.data.orderId);
  if (updateError) throw new Error(`Order update failed: ${updateError.message}`);

  if (parsed.data.coordinationPriceCents !== undefined) {
    await supabase
      .from("order_items")
      .update({ approved_price_cents: parsed.data.coordinationPriceCents })
      .eq("order_id", parsed.data.orderId)
      .eq("service_id", "bulk_pickup_coordination");
  }

  // Physical placement is a separate, admin-approved line item (never implied).
  if (parsed.data.placementQuoteCents !== undefined && parsed.data.placementQuoteCents > 0) {
    const { data: existing } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", parsed.data.orderId)
      .eq("service_id", "bulk_physical_placement")
      .maybeSingle();
    if (existing) {
      await supabase
        .from("order_items")
        .update({ approved_price_cents: parsed.data.placementQuoteCents })
        .eq("id", existing.id);
    } else {
      await supabase.from("order_items").insert({
        order_id: parsed.data.orderId,
        service_id: "bulk_physical_placement",
        quantity: 1,
        approved_price_cents: parsed.data.placementQuoteCents,
        scope: "separately_quoted_physical_placement",
      });
    }
  }

  await auditLog({
    actorId: session.userId,
    action: "bulk_order.update",
    entity: "orders",
    entityId: parsed.data.orderId,
    after: {
      status: parsed.data.status,
      coordination_price_cents: parsed.data.coordinationPriceCents ?? null,
      placement_quote_cents: parsed.data.placementQuoteCents ?? null,
    },
  });

  revalidatePath("/admin/orders");
}
