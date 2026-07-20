"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { getSessionInfo } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Pause / resume / cancel-at-renewal. Applies to future unperformed cycles and
 * renewals under the published cutoff rules — never to work already completed
 * (PRICING_SERVICE_MODEL.md). Authorization: the RLS-scoped client must see the
 * subscription as an account manager; the state write uses the service role.
 */
const actionSchema = z.object({
  subscriptionId: z.string().uuid(),
  action: z.enum(["pause", "resume", "cancel", "uncancel"]),
});

async function authorizeSubscription(subscriptionId: string, profileId: string) {
  const rlsClient = await createSupabaseServerClient();
  const { data: subscription } = await rlsClient
    .from("subscriptions")
    .select("id, status, account_id, cancel_at_period_end")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!subscription) throw new Error("Subscription not found.");

  const { data: membership } = await rlsClient
    .from("account_members")
    .select("role")
    .eq("account_id", subscription.account_id)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    throw new Error("Only account owners and managers can change billing.");
  }
  return subscription;
}

export async function changeSubscription(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");

  const parsed = actionSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    action: formData.get("action"),
  });
  if (!parsed.success) throw new Error("Invalid billing action.");

  const subscription = await authorizeSubscription(parsed.data.subscriptionId, session.userId);
  const admin = createSupabaseAdminClient();

  const update: Record<string, unknown> = {};
  switch (parsed.data.action) {
    case "pause":
      if (subscription.status !== "active") throw new Error("Only active service can be paused.");
      update.status = "paused";
      update.paused_at = new Date().toISOString();
      break;
    case "resume":
      if (subscription.status !== "paused") throw new Error("Only paused service can be resumed.");
      update.status = "active";
      update.paused_at = null;
      break;
    case "cancel":
      update.cancel_at_period_end = true;
      break;
    case "uncancel":
      update.cancel_at_period_end = false;
      break;
  }

  const { error } = await admin
    .from("subscriptions")
    .update(update)
    .eq("id", subscription.id);
  if (error) throw new Error(`Could not update billing: ${error.message}`);

  await auditLog({
    actorId: session.userId,
    action: `subscription.${parsed.data.action}`,
    entity: "subscriptions",
    entityId: subscription.id,
    before: { status: subscription.status, cancel_at_period_end: subscription.cancel_at_period_end },
    after: update,
  });

  revalidatePath("/app/billing");
  revalidatePath("/app");
}

/**
 * Open the Stripe Customer Portal for self-service card/invoice management when
 * billing is configured; otherwise the page shows an honest fallback.
 */
export async function openBillingPortal(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");
  const accountId = z.string().uuid().parse(formData.get("accountId"));

  const rlsClient = await createSupabaseServerClient();
  const { data: membership } = await rlsClient
    .from("account_members")
    .select("role")
    .eq("account_id", accountId)
    .eq("profile_id", session.userId)
    .maybeSingle();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    throw new Error("Only account owners and managers can manage billing.");
  }

  const stripe = getStripe();
  if (!stripe) throw new Error("billing_unconfigured");

  const admin = createSupabaseAdminClient();
  const { data: account } = await admin
    .from("accounts")
    .select("stripe_customer_id")
    .eq("id", accountId)
    .maybeSingle();
  if (!account?.stripe_customer_id) throw new Error("No billing profile on file yet.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${appUrl}/app/billing`,
  });

  const { redirect } = await import("next/navigation");
  redirect(portal.url);
}
