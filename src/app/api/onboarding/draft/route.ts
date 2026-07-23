import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, zodFieldErrors } from "@/lib/api";
import { stage1Schema } from "@/lib/onboarding-schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const createDraftSchema = z.object({
  eligibilityCheckId: z.string().uuid().optional(),
  stage1: stage1Schema,
});

export async function POST(request: NextRequest) {
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
    const { data, error } = await supabase
      .from("onboarding_drafts")
      .insert({
        eligibility_check_id: parsed.data.eligibilityCheckId ?? null,
        stage1: parsed.data.stage1,
        current_stage: 2,
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
