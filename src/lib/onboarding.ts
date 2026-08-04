import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PLANS } from "@/config/business";
import { encryptAccessSecret } from "@/lib/access-secrets";
import {
  stage1Schema,
  stage2Schema,
  stage3Schema,
  type Stage1,
  type Stage2,
  type Stage3,
} from "@/lib/onboarding-schemas";
import { buildQuote } from "@/lib/pricing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Who the service is for → the paying-entity classification on `accounts`. */
function accountTypeFor(servingWho: Stage1["servingWho"]): string {
  if (servingWho === "hoa_community") return "hoa";
  if (servingWho === "tenants_or_guests") return "portfolio";
  if (servingWho === "family_member") return "household";
  return "individual";
}

export interface DraftRecord {
  id: string;
  client_token: string;
  eligibility_check_id: string | null;
  current_stage: number;
  stage1: Stage1 | null;
  stage2: Stage2 | null;
  stage3: Stage3 | null;
  access_secrets: { notes: string } | null;
  status: string;
  finalized_account_id: string | null;
  expires_at: string;
}

export async function loadDraftByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<DraftRecord | null> {
  const { data } = await supabase
    .from("onboarding_drafts")
    .select(
      "id, client_token, eligibility_check_id, current_stage, stage1, stage2, stage3, access_secrets, status, finalized_account_id, expires_at",
    )
    .eq("client_token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data as DraftRecord | null) ?? null;
}

/** Public projection of a draft: never includes access secrets. */
export function draftView(draft: DraftRecord) {
  return {
    token: draft.client_token,
    currentStage: draft.current_stage,
    stage1: draft.stage1,
    stage2: draft.stage2,
    stage3: draft.stage3 ? { ...draft.stage3, accessSecretNotes: undefined } : null,
    hasAccessSecrets: Boolean(draft.access_secrets?.notes),
    status: draft.status,
    quote: draft.stage3 ? buildQuote(stage3Schema.parse(draft.stage3)) : null,
  };
}

/**
 * Finalize a paid draft into real records. Idempotent: safe under duplicate
 * webhook delivery. Successful payment creates `pending_serviceability_review`
 * — never active service (PRD.md).
 */
export async function finalizeOnboardingDraft(options: {
  draftId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}): Promise<{ accountId: string; alreadyFinalized: boolean }> {
  const supabase = createSupabaseAdminClient();

  const { data: draftRow, error: draftError } = await supabase
    .from("onboarding_drafts")
    .select("*")
    .eq("id", options.draftId)
    .maybeSingle();
  if (draftError || !draftRow) {
    throw new Error(`Draft ${options.draftId} not found: ${draftError?.message ?? "no row"}`);
  }
  const draft = draftRow as DraftRecord;

  if (draft.status === "finalized" && draft.finalized_account_id) {
    return { accountId: draft.finalized_account_id, alreadyFinalized: true };
  }

  const stage1 = stage1Schema.parse(draft.stage1);
  const stage2 = stage2Schema.parse(draft.stage2);
  const stage3 = stage3Schema.parse(draft.stage3);
  const quote = buildQuote(stage3);

  const payerEmail = stage2.payer.email.toLowerCase();

  // 1. Ensure the payer has an auth user + profile so magic-link sign-in works.
  let userId: string | null = null;
  const { data: existingUserId } = await supabase.rpc("get_user_id_by_email", {
    target_email: payerEmail,
  });
  if (existingUserId) {
    userId = existingUserId as string;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: payerEmail,
      email_confirm: true,
      user_metadata: { full_name: stage2.payer.fullName },
    });
    if (createError || !created.user) {
      throw new Error(`Could not create auth user: ${createError?.message}`);
    }
    userId = created.user.id;
  }

  // 2. Account + membership.
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      name: stage2.payer.fullName,
      account_type: accountTypeFor(stage1.servingWho),
      stripe_customer_id: options.stripeCustomerId,
      created_by: userId,
    })
    .select("id")
    .single();
  if (accountError || !account) {
    throw new Error(`Account creation failed: ${accountError?.message}`);
  }

  await supabase
    .from("account_members")
    .upsert({ account_id: account.id, profile_id: userId, role: "owner" });

  // 3. Contacts.
  const contacts = [
    { kind: "payer", contact: stage2.payer },
    ...(stage2.serviceRecipient
      ? [{ kind: "service_recipient", contact: stage2.serviceRecipient }]
      : []),
  ];
  for (const entry of contacts) {
    const { error } = await supabase.from("contacts").insert({
      account_id: account.id,
      kind: entry.kind,
      full_name: entry.contact.fullName,
      email: entry.contact.email,
      phone: entry.contact.phone || null,
      sms_opt_in: stage2.smsOptIn,
    });
    if (error) throw new Error(`Contact creation failed: ${error.message}`);
  }

  // 4. Property, instructions, bins, schedule, hazards.
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert({
      account_id: account.id,
      address_line1: stage1.addressLine1,
      address_line2: stage1.unit || null,
      city: stage1.city,
      postal_code: stage1.postalCode,
      property_type: stage1.propertyType,
      status: "pending_review",
    })
    .select("id")
    .single();
  if (propertyError || !property) {
    throw new Error(`Property creation failed: ${propertyError?.message}`);
  }

  await supabase.from("property_instructions").insert({
    property_id: property.id,
    bin_storage_location: stage3.binStorageLocation,
    curb_placement_notes: stage3.curbPlacementNotes || null,
  });

  const binRows = [
    ...Array.from({ length: stage3.trashBinCount }, () => ({
      property_id: property.id,
      bin_type: "trash",
    })),
    ...Array.from({ length: stage3.recyclingBinCount }, () => ({
      property_id: property.id,
      bin_type: "recycling",
    })),
  ];
  await supabase.from("bins").insert(binRows);

  // One schedule row per *distinct* collection day. `generateCyclesForDate`
  // creates a cycle per matching row, so writing a second row for recycling
  // when it shares the trash day would double-book one real visit.
  const scheduleRows = [
    {
      property_id: property.id,
      provider: stage3.collectionProvider || null,
      waste_stream: "trash",
      weekday: stage3.collectionDayUnsure ? null : stage3.collectionDay,
      verification_status: stage3.collectionDayUnsure ? "needs_review" : "unverified",
    },
  ];

  // A separate recycling day is only *covered* by Complete, whose configured
  // collectionCoverage is every regular collection day (PROJECT_TRUTH.md).
  // Home covers one day, so it gets the trash row only — no silent upgrade.
  // A one-time visit is anchored to trash day and never gets a second row.
  const coversEveryCollectionDay =
    quote.serviceChoice !== "one_time_trash_day" &&
    PLANS[quote.serviceChoice].collectionCoverage === "all_regular_collection_days";
  if (
    stage3.hasBothBinTypes &&
    stage3.sameDayCollection === false &&
    coversEveryCollectionDay
  ) {
    scheduleRows.push({
      property_id: property.id,
      provider: stage3.collectionProvider || null,
      waste_stream: "recycling",
      weekday: stage3.recyclingCollectionDayUnsure ? null : stage3.recyclingCollectionDay,
      verification_status: stage3.recyclingCollectionDayUnsure ? "needs_review" : "unverified",
    });
  }

  await supabase.from("collection_schedules").insert(scheduleRows);

  if (stage3.hazards.length > 0) {
    await supabase.from("property_hazards").insert(
      stage3.hazards.map((hazard) => ({
        property_id: property.id,
        hazard_type: hazard,
        severity: "caution",
      })),
    );
  }

  // 5. Access secrets: encrypted, isolated table, never in ordinary notes.
  if (draft.access_secrets?.notes) {
    const { error } = await supabase.from("property_access_secrets").insert({
      property_id: property.id,
      encrypted_payload: encryptAccessSecret(draft.access_secrets.notes),
      secret_kinds: stage3.hazards.filter((hazard) => ["gate", "garage"].includes(hazard)),
      updated_by: userId,
    });
    if (error) throw new Error(`Access secret storage failed: ${error.message}`);
  }

  // 6. Subscription or one-time order — always pending review.
  if (quote.serviceChoice === "one_time_trash_day") {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        account_id: account.id,
        property_id: property.id,
        status: "requested",
      })
      .select("id")
      .single();
    if (error || !order) throw new Error(`Order creation failed: ${error?.message}`);
    await supabase.from("order_items").insert({
      order_id: order.id,
      service_id: "one_time_trash_day",
      quantity: 1,
      approved_price_cents: quote.amountDueCents,
    });
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      account_id: account.id,
      property_id: property.id,
      plan_id: quote.serviceChoice,
      billing_interval: quote.billingInterval,
      status: "pending_serviceability_review",
      stripe_subscription_id: options.stripeSubscriptionId,
    });
    if (error) throw new Error(`Subscription creation failed: ${error.message}`);
  }

  // 7. Referral attribution from the eligibility check (credits accrue only
  // after the qualifying completed paid cycle — D-014; nothing is paid here).
  if (draft.eligibility_check_id) {
    const { data: check } = await supabase
      .from("eligibility_checks")
      .select("referral_code")
      .eq("id", draft.eligibility_check_id)
      .maybeSingle();
    if (check?.referral_code) {
      const { data: code } = await supabase
        .from("referral_codes")
        .select("id, active")
        .eq("code", check.referral_code)
        .maybeSingle();
      if (code?.active) {
        await supabase
          .from("referrals")
          .upsert(
            { referral_code_id: code.id, referred_account_id: account.id },
            { onConflict: "referred_account_id", ignoreDuplicates: true },
          );
      }
    }
  }

  // 8. Convert a matching waitlist lead and queue the welcome email.
  await supabase
    .from("waitlist_leads")
    .update({ status: "converted" })
    .eq("email", payerEmail);

  await supabase.from("notification_outbox").insert({
    template_id: "welcome_pending_review",
    channel: "email",
    recipient: payerEmail,
    payload: { account_id: account.id, requires_access_review: quote.requiresAccessReview },
  });

  // 9. Mark the draft finalized (idempotency anchor).
  await supabase
    .from("onboarding_drafts")
    .update({ status: "finalized", finalized_account_id: account.id })
    .eq("id", draft.id);

  return { accountId: account.id, alreadyFinalized: false };
}
