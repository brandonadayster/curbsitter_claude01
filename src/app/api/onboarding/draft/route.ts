import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, rateLimitedError, zodFieldErrors } from "@/lib/api";
import { lookupCityWeekday, type CityLookup } from "@/lib/collection-day-verification";
import { geocode } from "@/lib/geocode";
import { limitPublic } from "@/lib/rate-limit";
import { stage1Schema } from "@/lib/onboarding-schemas";
import { checkPropertyUsage, type CommercialCheck } from "@/lib/property-usage-check";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const createDraftSchema = z.object({
  eligibilityCheckId: z.string().uuid().optional(),
  stage1: stage1Schema,
});

type Stage1Input = z.infer<typeof createDraftSchema>["stage1"];

/**
 * D-025/D-027: both address checks run here, at stage 1, because neither
 * depends on a later answer — the City route-day lookup (so an "I'm not
 * sure" day answer can be resolved from data we already hold) and the
 * residential/commercial parcel check (which decides whether the signup can
 * skip admin review at all).
 *
 * Neither can block: a draft must always be creatable. Both fail safe —
 * `geocode_failed`/`check_failed` route the signup to human review rather
 * than silently assuming anything.
 */
async function runAddressChecks(
  supabase: SupabaseClient,
  stage1: Stage1Input,
  eligibilityCheckId: string | undefined,
): Promise<{ cityLookup: CityLookup; commercialCheck: CommercialCheck }> {
  const checkedAt = new Date().toISOString();

  // Prefer the coordinates already captured at address-check time (avoids a
  // redundant Mapbox call); fall back to a fresh geocode otherwise.
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (eligibilityCheckId) {
    const { data: check } = await supabase
      .from("eligibility_checks")
      .select("latitude, longitude")
      .eq("id", eligibilityCheckId)
      .maybeSingle();
    if (check?.latitude != null && check?.longitude != null) {
      latitude = check.latitude;
      longitude = check.longitude;
    }
  }
  if (latitude === null || longitude === null) {
    const geocoded = await geocode({
      addressLine1: stage1.addressLine1,
      postalCode: stage1.postalCode,
    });
    if (geocoded) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }
  }

  if (latitude === null || longitude === null) {
    return {
      cityLookup: { status: "geocode_failed", cityWeekday: null, checkedAt },
      commercialCheck: { status: "check_failed", usageType: null, usageDesc: null, checkedAt },
    };
  }

  // A failed zone lookup deliberately isn't caught: "our cache errored" must
  // never be recorded as "the City has no record here", which is an
  // auto-approve-eligible outcome. It surfaces as the route's retryable 503.
  const [cityWeekday, commercialCheck] = await Promise.all([
    lookupCityWeekday(latitude, longitude),
    checkPropertyUsage(latitude, longitude),
  ]);

  return {
    cityLookup:
      cityWeekday === null
        ? { status: "not_found", cityWeekday: null, checkedAt }
        : { status: "found", cityWeekday, checkedAt },
    commercialCheck,
  };
}

export async function POST(request: NextRequest) {
  const limit = limitPublic(request, "onboarding-draft", { limit: 15, windowSeconds: 60 });
  if (!limit.ok) return rateLimitedError(limit.retryAfterSeconds);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }

  const parsed = createDraftSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { cityLookup, commercialCheck } = await runAddressChecks(
      supabase,
      parsed.data.stage1,
      parsed.data.eligibilityCheckId,
    );
    const { data, error } = await supabase
      .from("onboarding_drafts")
      .insert({
        eligibility_check_id: parsed.data.eligibilityCheckId ?? null,
        stage1: parsed.data.stage1,
        current_stage: 2,
        city_lookup: cityLookup,
        commercial_check: commercialCheck,
      })
      .select("client_token")
      .single();
    if (error || !data) throw new Error(error?.message);
    return NextResponse.json({ token: data.client_token });
  } catch (error) {
    console.error("draft creation failed:", error instanceof Error ? error.message : error);
    return apiError(503, "draft_unavailable", "We couldn't save your progress just now. Please try again.", {
      retryable: true,
    });
  }
}
