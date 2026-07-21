"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { FEATURES } from "@/config/features";
import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bulkSchema = z.object({
  propertyId: z.string().uuid(),
  itemDescription: z.string().trim().min(10, "Describe the items so we can check eligibility.").max(2000),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").optional().or(z.literal("")),
  requestPlacement: z.coerce.boolean().optional(),
  authorizeCoordination: z.literal(true, {
    message: "Please authorize us to coordinate on your behalf.",
  }),
});

/**
 * Customer request for Bulk Pickup Coordination. Creates a `requested` order —
 * never a promise the provider will accept. Physical placement, if requested,
 * is flagged for a separate admin quote; nothing is priced or scheduled here.
 */
export async function requestBulkPickup(formData: FormData): Promise<void> {
  if (!FEATURES.bulkPickupCoordination) throw new Error("This service isn't available.");

  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");

  const parsed = bulkSchema.safeParse({
    propertyId: formData.get("propertyId"),
    itemDescription: formData.get("itemDescription"),
    requestedDate: formData.get("requestedDate"),
    requestPlacement: formData.get("requestPlacement") === "on",
    authorizeCoordination: formData.get("authorizeCoordination") === "on",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid request.");

  // Authorize: the RLS-scoped client must see the property as a member.
  const rls = await createSupabaseServerClient();
  const { data: property } = await rls
    .from("properties")
    .select("id, account_id")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (!property) throw new Error("Property not found.");

  const admin = createSupabaseAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      account_id: property.account_id,
      property_id: property.id,
      status: "requested",
      requested_date: parsed.data.requestedDate || null,
      notes: `Bulk pickup coordination request.\nItems: ${parsed.data.itemDescription}${
        parsed.data.requestPlacement ? "\nCustomer also requests physical placement (separate quote)." : ""
      }`,
    })
    .select("id")
    .single();
  if (orderError || !order) throw new Error(`Could not submit request: ${orderError?.message}`);

  const { error: itemError } = await admin.from("order_items").insert({
    order_id: order.id,
    service_id: "bulk_pickup_coordination",
    quantity: 1,
    scope: parsed.data.requestPlacement ? "coordination_plus_placement_quote" : "coordination_only",
  });
  if (itemError) throw new Error(`Could not submit request: ${itemError.message}`);

  revalidatePath("/app/bulk-pickup");
}
