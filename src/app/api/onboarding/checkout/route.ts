import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, zodFieldErrors } from "@/lib/api";
import { loadDraftByToken } from "@/lib/onboarding";
import { stage2Schema, stage3Schema, stage4Schema } from "@/lib/onboarding-schemas";
import { buildQuote } from "@/lib/pricing";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONSENT_LANGUAGE_VERSION = "onboarding-2026-07-v1";

const checkoutSchema = z.object({
  token: z.string().min(10),
  stage4: stage4Schema,
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please accept the required consents to continue.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }

  const supabase = createSupabaseAdminClient();
  const draft = await loadDraftByToken(supabase, parsed.data.token);
  if (!draft) {
    return apiError(404, "draft_not_found", "This signup session has expired. Please start again.");
  }
  if (draft.status === "finalized") {
    return apiError(409, "draft_finalized", "This signup is already complete.");
  }

  // Cross-field/stage sync check: every stage must be complete and valid
  // server-side before payment (no stage skipping via the address bar).
  const stage2Check = stage2Schema.safeParse(draft.stage2);
  const stage3Check = stage3Schema.safeParse(draft.stage3);
  if (!draft.stage1 || !stage2Check.success || !stage3Check.success) {
    return apiError(409, "draft_incomplete", "Earlier steps are incomplete. Please review them before payment.");
  }
  const stage3 = stage3Check.data;
  const quote = buildQuote(stage3);
  if (!quote.binLimitOk) {
    return apiError(409, "bin_limit", "The bin count exceeds this plan's limit. Adjust the plan or bin count.");
  }

  // CurbSitter onDemand is only available inside an active route cell with
  // capacity (D-020). Subscriptions still go through admin serviceability
  // review, so this extra gate applies only to the immediate one-time service.
  if (quote.serviceChoice === "one_time_trash_day") {
    const { checkOneTimeCapacity } = await import("@/lib/capacity");
    const capacity = await checkOneTimeCapacity(draft.eligibility_check_id);
    if (!capacity.ok) {
      const message =
        capacity.reason === "at_capacity"
          ? "This route is at capacity for one-time service right now. Try a subscription or check back soon."
          : "CurbSitter onDemand is only available on active routes. Your address isn't on one yet — join the waitlist and we'll let you know when it opens.";
      return apiError(409, "one_time_unavailable", message);
    }
  }

  // Record consent before payment (SECURITY_PRIVACY.md).
  const payerEmail = stage2Check.data.payer.email.toLowerCase();
  const consentBase = {
    email: payerEmail,
    language_version: CONSENT_LANGUAGE_VERSION,
    source: "onboarding_stage4",
    granted: true,
  };
  await supabase.from("consents").insert([
    { ...consentBase, channel: "email", purpose: "terms" },
    { ...consentBase, channel: "email", purpose: "transactional" },
    { ...consentBase, channel: "email", purpose: "photo" },
    ...(stage2Check.data.smsOptIn
      ? [{ ...consentBase, channel: "sms", purpose: "transactional" }]
      : []),
  ]);

  const stripe = getStripe();
  if (!stripe) {
    return apiError(
      503,
      "billing_unconfigured",
      "Online payment isn't available in this environment yet. Your details are saved — we'll follow up by email to complete setup.",
      { retryable: false },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    // Server-calculated price only; the client never sends totals.
    const session = await stripe.checkout.sessions.create(
      quote.recurrence === "one_time"
        ? {
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  unit_amount: quote.amountDueCents,
                  product_data: { name: quote.description },
                },
                quantity: 1,
              },
            ],
            customer_email: payerEmail,
            metadata: { draft_id: draft.id },
            success_url: `${appUrl}/onboarding/success`,
            cancel_url: `${appUrl}/onboarding?token=${draft.client_token}`,
          }
        : {
            mode: "subscription",
            // Quarterly plans are prepaid and billed every 3 months; payable by
            // card or ACH (D-012, revised 2026-07-27). Monthly is card.
            payment_method_types:
              quote.recurrence === "quarterly" ? ["card", "us_bank_account"] : ["card"],
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  unit_amount: quote.amountDueCents,
                  recurring:
                    quote.recurrence === "quarterly"
                      ? { interval: "month", interval_count: 3 }
                      : { interval: "month" },
                  product_data: { name: quote.description },
                },
                quantity: 1,
              },
            ],
            customer_email: payerEmail,
            metadata: { draft_id: draft.id },
            subscription_data: { metadata: { draft_id: draft.id } },
            success_url: `${appUrl}/onboarding/success`,
            cancel_url: `${appUrl}/onboarding?token=${draft.client_token}`,
          },
      { idempotencyKey: `checkout-${draft.id}` },
    );

    await supabase
      .from("onboarding_drafts")
      .update({ status: "checkout_started", stripe_checkout_session_id: session.id })
      .eq("id", draft.id);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("checkout creation failed:", error instanceof Error ? error.message : error);
    return apiError(503, "checkout_unavailable", "We couldn't start the payment step just now. Please try again in a moment.", {
      retryable: true,
    });
  }
}
