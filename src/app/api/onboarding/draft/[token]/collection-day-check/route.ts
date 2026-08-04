import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, rateLimitedError, zodFieldErrors } from "@/lib/api";
import { verifyCollectionDay, type CollectionDayCheck } from "@/lib/collection-day-verification";
import { geocode } from "@/lib/geocode";
import { loadDraftByToken } from "@/lib/onboarding";
import { limitPublic } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * D-025: check a customer's stated trash-collection weekday against the
 * City of Prescott's cached route-day zones. POST runs the check; PATCH
 * records that the customer reaffirmed their own answer over a City
 * mismatch (the "No, it's mine" resolution) without re-checking.
 *
 * `mismatch` (pending — the customer hasn't picked a resolution yet) and
 * `mismatch_confirmed` (the customer kept their own answer) are distinct
 * statuses. Re-picking the City's day instead just calls POST again, which
 * naturally comes back `match`. finalizeOnboardingDraft only ever treats
 * `match` and `no_zone_data` as auto-approve-eligible — everything else,
 * including a `mismatch` that was somehow never resolved, defaults to
 * human review.
 */

const postSchema = z.object({ weekday: z.number().int().min(0).max(6) });
const patchSchema = z.object({ confirmed: z.literal(true) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const limit = limitPublic(request, "onboarding-collection-day-check", { limit: 20, windowSeconds: 60 });
  if (!limit.ok) return rateLimitedError(limit.retryAfterSeconds);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }

  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }

  const supabase = createSupabaseAdminClient();
  const draft = await loadDraftByToken(supabase, token);
  if (!draft) {
    return apiError(404, "draft_not_found", "This signup session has expired. Please start again.");
  }
  if (draft.status === "finalized") {
    return apiError(409, "draft_finalized", "This signup is already complete.");
  }
  if (!draft.stage1) {
    return apiError(409, "stage1_missing", "Please complete the address step first.");
  }

  // Prefer the coordinates already captured at address-check time (avoids a
  // redundant Mapbox call); fall back to a fresh geocode otherwise.
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (draft.eligibility_check_id) {
    const { data: check } = await supabase
      .from("eligibility_checks")
      .select("latitude, longitude")
      .eq("id", draft.eligibility_check_id)
      .maybeSingle();
    if (check?.latitude != null && check?.longitude != null) {
      latitude = check.latitude;
      longitude = check.longitude;
    }
  }
  if (latitude === null || longitude === null) {
    const geocoded = await geocode({
      addressLine1: draft.stage1.addressLine1,
      postalCode: draft.stage1.postalCode,
    });
    if (geocoded) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }
  }

  const checkedAt = new Date().toISOString();
  let check: CollectionDayCheck;

  if (latitude === null || longitude === null) {
    // Geocoding is treated as an unreliable external system (AGENTS.md) —
    // this is the one outcome that blocks, since there's no address to
    // verify anything against.
    check = { status: "geocode_failed", customerWeekday: parsed.data.weekday, cityWeekday: null, checkedAt };
  } else {
    const outcome = await verifyCollectionDay(latitude, longitude, parsed.data.weekday);
    if (outcome.status === "match") {
      check = { status: "match", customerWeekday: parsed.data.weekday, cityWeekday: outcome.cityWeekday, checkedAt };
    } else if (outcome.status === "mismatch") {
      check = { status: "mismatch", customerWeekday: parsed.data.weekday, cityWeekday: outcome.cityWeekday, checkedAt };
    } else {
      check = { status: "no_zone_data", customerWeekday: parsed.data.weekday, cityWeekday: null, checkedAt };
    }
  }

  const { error } = await supabase
    .from("onboarding_drafts")
    .update({ collection_day_check: check })
    .eq("id", draft.id);
  if (error) {
    return apiError(503, "draft_unavailable", "We couldn't save your progress just now. Please try again.", {
      retryable: true,
    });
  }

  return NextResponse.json({ outcome: check.status, cityWeekday: check.cityWeekday });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }

  const supabase = createSupabaseAdminClient();
  const draft = await loadDraftByToken(supabase, token);
  if (!draft) {
    return apiError(404, "draft_not_found", "This signup session has expired. Please start again.");
  }
  if (draft.status === "finalized") {
    return apiError(409, "draft_finalized", "This signup is already complete.");
  }

  const existing = draft.collection_day_check as CollectionDayCheck | null;
  if (!existing || existing.status !== "mismatch") {
    return apiError(409, "no_pending_mismatch", "There's no collection-day conflict to confirm.");
  }

  const confirmed: CollectionDayCheck = { ...existing, status: "mismatch_confirmed" };
  const { error } = await supabase
    .from("onboarding_drafts")
    .update({ collection_day_check: confirmed })
    .eq("id", draft.id);
  if (error) {
    return apiError(503, "draft_unavailable", "We couldn't save your progress just now. Please try again.", {
      retryable: true,
    });
  }

  return NextResponse.json({ outcome: "mismatch_confirmed" });
}
