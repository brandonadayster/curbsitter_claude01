import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, rateLimitedError, zodFieldErrors } from "@/lib/api";
import { limitPublic } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONSENT_LANGUAGE_VERSION = "waitlist-2026-07-v1";

const waitlistJoinSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{10,15}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Enter a 5-digit ZIP code.")
    .optional(),
  eligibilityCheckId: z.string().uuid().optional(),
  smsOptIn: z.boolean().default(false),
  marketingOptIn: z.boolean().default(false),
  referralCode: z.string().trim().max(24).optional(),
});

export async function POST(request: NextRequest) {
  const limit = limitPublic(request, "waitlist", { limit: 10, windowSeconds: 60 });
  if (!limit.ok) return rateLimitedError(limit.retryAfterSeconds);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }

  const parsed = waitlistJoinSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }
  const input = parsed.data;

  // SMS consent requires a phone number to consent for.
  if (input.smsOptIn && !input.phone) {
    return apiError(422, "validation_failed", "Add a mobile number to receive text updates.", {
      fieldErrors: { phone: "Add a mobile number to receive text updates." },
    });
  }

  const supabase = createSupabaseAdminClient();

  try {
    // Attach route cell / zip context from the eligibility check when present.
    let routeCellId: string | null = null;
    let postalCode = input.postalCode ?? null;
    if (input.eligibilityCheckId) {
      const { data: check } = await supabase
        .from("eligibility_checks")
        .select("route_cell_id, postal_code")
        .eq("id", input.eligibilityCheckId)
        .maybeSingle();
      routeCellId = check?.route_cell_id ?? null;
      postalCode = postalCode ?? check?.postal_code ?? null;
    }

    const { data: lead, error: leadError } = await supabase
      .from("waitlist_leads")
      .upsert(
        {
          email: input.email.toLowerCase(),
          full_name: input.fullName,
          phone: input.phone || null,
          postal_code: postalCode,
          route_cell_id: routeCellId,
          eligibility_check_id: input.eligibilityCheckId ?? null,
          sms_opt_in: input.smsOptIn,
          marketing_opt_in: input.marketingOptIn,
          referral_code_used: input.referralCode ?? null,
        },
        { onConflict: "email" },
      )
      .select("id, share_code")
      .single();

    if (leadError || !lead) {
      throw new Error(leadError?.message ?? "lead upsert returned no row");
    }

    // Record exact consent state (SECURITY_PRIVACY.md: language version, source).
    const consentRows = [
      {
        email: input.email.toLowerCase(),
        channel: "email",
        purpose: "transactional",
        language_version: CONSENT_LANGUAGE_VERSION,
        source: "waitlist_form",
        granted: true,
      },
      {
        email: input.email.toLowerCase(),
        channel: "email",
        purpose: "marketing",
        language_version: CONSENT_LANGUAGE_VERSION,
        source: "waitlist_form",
        granted: input.marketingOptIn,
      },
      ...(input.phone
        ? [
            {
              email: input.email.toLowerCase(),
              channel: "sms",
              purpose: "transactional",
              language_version: CONSENT_LANGUAGE_VERSION,
              source: "waitlist_form",
              granted: input.smsOptIn,
            },
          ]
        : []),
    ];
    const { error: consentError } = await supabase.from("consents").insert(consentRows);
    if (consentError) {
      throw new Error(`consent insert failed: ${consentError.message}`);
    }

    // Give the lead a personal referral code (share_code doubles as the code).
    const { error: codeError } = await supabase
      .from("referral_codes")
      .upsert({ code: lead.share_code, advocate_lead_id: lead.id }, { onConflict: "code" });
    if (codeError) {
      throw new Error(`referral code upsert failed: ${codeError.message}`);
    }

    // Attribute the referral if a valid code was used (fraud review happens
    // later; credits only accrue after the qualifying paid cycle, D-014).
    if (input.referralCode && input.referralCode !== lead.share_code) {
      const { data: code } = await supabase
        .from("referral_codes")
        .select("id, active")
        .eq("code", input.referralCode)
        .maybeSingle();
      if (code?.active) {
        await supabase
          .from("referrals")
          .insert({ referral_code_id: code.id, referred_lead_id: lead.id });
      }
    }

    // Queue the confirmation email through the outbox (worker sends it).
    await supabase.from("notification_outbox").insert({
      template_id: "waitlist_joined",
      channel: "email",
      recipient: input.email.toLowerCase(),
      payload: { share_code: lead.share_code },
    });

    return NextResponse.json({
      leadId: lead.id,
      shareCode: lead.share_code,
    });
  } catch (error) {
    console.error("waitlist join failed:", error instanceof Error ? error.message : error);
    return apiError(503, "waitlist_unavailable", "We couldn't save your spot just now. Please try again in a moment.", {
      retryable: true,
    });
  }
}
