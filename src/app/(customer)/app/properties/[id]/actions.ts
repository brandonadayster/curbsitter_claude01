"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { encryptAccessSecret } from "@/lib/access-secrets";
import { auditLog } from "@/lib/audit";
import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const instructionsSchema = z.object({
  propertyId: z.string().uuid(),
  binStorageLocation: z.string().trim().min(3, "Tell us where the bins live.").max(400),
  curbPlacementNotes: z.string().trim().max(400).optional().or(z.literal("")),
  generalNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

/** Ordinary instruction updates go through the customer's own RLS policies. */
export async function updateInstructions(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");

  const parsed = instructionsSchema.safeParse({
    propertyId: formData.get("propertyId"),
    binStorageLocation: formData.get("binStorageLocation"),
    curbPlacementNotes: formData.get("curbPlacementNotes"),
    generalNotes: formData.get("generalNotes"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid instructions.");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("property_instructions")
    .upsert(
      {
        property_id: parsed.data.propertyId,
        bin_storage_location: parsed.data.binStorageLocation,
        curb_placement_notes: parsed.data.curbPlacementNotes || null,
        general_notes: parsed.data.generalNotes || null,
        updated_by: session.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id" },
    );
  // RLS rejects non-managers; surface that as a clear error rather than silence.
  if (error) throw new Error(`Could not save instructions: ${error.message}`);

  revalidatePath(`/app/properties/${parsed.data.propertyId}`);
}

const accessSchema = z.object({
  propertyId: z.string().uuid(),
  accessNotes: z.string().trim().min(3, "Enter the new access details.").max(1000),
});

/**
 * Access details are write-only from the portal: customers can replace them,
 * but existing values are never displayed back (least exposure). A reveal flow
 * with step-up verification is deferred to a later ticket.
 */
export async function updateAccessSecret(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");

  const parsed = accessSchema.safeParse({
    propertyId: formData.get("propertyId"),
    accessNotes: formData.get("accessNotes"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid access details.");

  // Authorization: the RLS-scoped client must see the property as a manager;
  // the secret write itself uses the service role into the isolated table.
  const rlsClient = await createSupabaseServerClient();
  const { data: property } = await rlsClient
    .from("properties")
    .select("id, account_id")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();
  if (!property) throw new Error("Property not found.");

  const { data: membership } = await rlsClient
    .from("account_members")
    .select("role")
    .eq("account_id", property.account_id)
    .eq("profile_id", session.userId)
    .maybeSingle();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    throw new Error("Only account owners and managers can update access details.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("property_access_secrets").upsert(
    {
      property_id: parsed.data.propertyId,
      encrypted_payload: encryptAccessSecret(parsed.data.accessNotes),
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "property_id" },
  );
  if (error) throw new Error(`Could not save access details: ${error.message}`);

  await auditLog({
    actorId: session.userId,
    action: "access_secret.customer_update",
    entity: "property_access_secrets",
    entityId: parsed.data.propertyId,
  });

  revalidatePath(`/app/properties/${parsed.data.propertyId}`);
}
