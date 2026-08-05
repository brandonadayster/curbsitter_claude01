import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, rateLimitedError, zodFieldErrors } from "@/lib/api";
import {
  combineDayCheck,
  lookupCityWeekday,
  type CityLookup,
  type CollectionDayCheck,
} from "@/lib/collection-day-verification";
import { geocode } from "@/lib/geocode";
import { loadDraftByToken, type DraftRecord } from "@/lib/onboarding";
import { limitPublic } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * D-025: combine the customer's stated trash-collection weekday with the
 * City route-day lookup already recorded at stage 1. POST runs the combine;
 * PATCH records that the customer reaffirmed their own answer over a City
 * mismatch (the "No, it's mine" resolution).
 *
 * Omitting `weekday` means "I'm not sure" — the City's day is then adopted
 * outright when one exists, and otherwise an admin resolves it by hand
 * before the property can be approved.
 *
 * finalizeOnboardingDraft only treats `match` and `city_resolved` as a
 * verified day; everything else — including a `mismatch` that was somehow
 * never resolved — defaults to human review.
 */

const postSchema = z.object({ weekday: z.number().int().min(0).max(6).optional() });
const patchSchema = z.object({ confirmed: z.literal(true) });

/**
 * Stage 1 records `city_lookup` for every draft, so this is normally just a
 * read. The live path covers drafts created before that column existed.
 */
async function resolveCityLookup(
  supabase: SupabaseClient,
  draft: DraftRecord,
  checkedAt: string,
): Promise<CityLookup> {
  if (draft.city_lookup) return draft.city_lookup;
  if (!draft.stage1) return { status: "geocode_failed", cityWeekday: null, checkedAt };

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

  if (latitude === null || longitude === null) {
    return { status: "geocode_failed", cityWeekday: null, checkedAt };
  }

  // Not caught on purpose — see the same note in the stage-1 draft route.
  const cityWeekday = await lookupCityWeekday(latitude, longitude);
  return cityWeekday === null
    ? { status: "not_found", cityWeekday: null, checkedAt }
    : { status: "found", cityWeekday, checkedAt };
}

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

  const checkedAt = new Date().toISOString();
  let cityLookup: CityLookup;
  try {
    cityLookup = await resolveCityLookup(supabase, draft, checkedAt);
  } catch (error) {
    console.error("city lookup failed:", error instanceof Error ? error.message : error);
    return apiError(503, "check_unavailable", "We couldn't check your collection day just now. Please try again.", {
      retryable: true,
    });
  }
  const check = combineDayCheck(cityLookup, parsed.data.weekday ?? null, checkedAt);

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

  const existing = draft.collection_day_check;
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
