import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { finalizeOnboardingDraft } from "@/lib/onboarding";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook: signature-verified, idempotent via the webhook_events ledger
 * (unique provider+event_id). Duplicate deliveries are acknowledged without
 * reprocessing (Phase 3 exit criterion).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    console.error("stripe webhook: billing environment not configured");
    return new NextResponse("Webhook not configured", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new NextResponse("Signature verification failed", { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Idempotency ledger: first delivery inserts; duplicates conflict and stop.
  const { data: inserted, error: ledgerError } = await supabase
    .from("webhook_events")
    .upsert(
      {
        provider: "stripe",
        event_id: event.id,
        event_type: event.type,
        payload_hash: crypto.createHash("sha256").update(body).digest("hex"),
      },
      { onConflict: "provider,event_id", ignoreDuplicates: true },
    )
    .select("id");

  if (ledgerError) {
    console.error("stripe webhook: ledger write failed:", ledgerError.message);
    return new NextResponse("Ledger unavailable", { status: 500 });
  }
  let ledgerId: string;
  if (!inserted || inserted.length === 0) {
    // Duplicate delivery. Acknowledge if already processed; reprocess only a
    // previously failed event (finalize itself is idempotent).
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id, status")
      .eq("provider", "stripe")
      .eq("event_id", event.id)
      .single();
    if (!existing || existing.status !== "failed") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    ledgerId = existing.id;
  } else {
    ledgerId = inserted[0].id;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const draftId = session.metadata?.draft_id;
      if (draftId && session.payment_status === "paid") {
        await finalizeOnboardingDraft({
          draftId,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
        });
      }
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : null;
      if (subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId)
          .in("status", ["active", "past_due"]);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", subscription.id);
    }

    await supabase
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", ledgerId);

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`stripe webhook: processing failed for ${event.type}:`, message);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", error: message })
      .eq("id", ledgerId);
    // 500 asks Stripe to retry; the ledger row is updated, so retry reprocesses
    // only via explicit failed-state handling, not blind duplication.
    return new NextResponse("Processing failed", { status: 500 });
  }
}
