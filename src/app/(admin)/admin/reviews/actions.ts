"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  subscriptionId: z.string().uuid(),
  decision: z.enum(["approve", "decline"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

/**
 * Serviceability review decision (D-018): approval activates the property and
 * subscription; decline marks both declined and the refund/alternative-quote
 * policy is handled through customer communication.
 */
export async function decideReview(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);

  const parsed = reviewSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) throw new Error("Invalid review decision.");

  const supabase = createSupabaseAdminClient();
  const { data: subscription, error: loadError } = await supabase
    .from("subscriptions")
    .select("id, status, property_id, account_id")
    .eq("id", parsed.data.subscriptionId)
    .single();
  if (loadError || !subscription) throw new Error("Subscription not found.");
  if (subscription.status !== "pending_serviceability_review") {
    throw new Error("This subscription is not awaiting review.");
  }

  const approved = parsed.data.decision === "approve";
  const subscriptionStatus = approved ? "active" : "declined";
  const propertyStatus = approved ? "active" : "declined";

  const { error: subError } = await supabase
    .from("subscriptions")
    .update({ status: subscriptionStatus })
    .eq("id", subscription.id)
    .eq("status", "pending_serviceability_review");
  if (subError) throw new Error(`Review update failed: ${subError.message}`);

  await supabase
    .from("properties")
    .update({ status: propertyStatus })
    .eq("id", subscription.property_id);

  // Notify the payer through the outbox.
  const { data: payer } = await supabase
    .from("contacts")
    .select("email")
    .eq("account_id", subscription.account_id)
    .eq("kind", "payer")
    .maybeSingle();
  if (payer?.email) {
    await supabase.from("notification_outbox").insert({
      template_id: approved ? "review_approved" : "payment_issue",
      channel: "email",
      recipient: payer.email,
      payload: {
        subscription_id: subscription.id,
        decision: parsed.data.decision,
        note: parsed.data.note || null,
      },
    });
  }

  await auditLog({
    actorId: session.userId,
    action: `serviceability_review.${parsed.data.decision}`,
    entity: "subscriptions",
    entityId: subscription.id,
    before: { status: "pending_serviceability_review" },
    after: { status: subscriptionStatus, note: parsed.data.note || null },
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}
