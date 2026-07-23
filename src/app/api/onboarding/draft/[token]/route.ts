import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, zodFieldErrors } from "@/lib/api";
import { draftView, loadDraftByToken } from "@/lib/onboarding";
import { stage2Schema, stage3Schema } from "@/lib/onboarding-schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.discriminatedUnion("stage", [
  z.object({ stage: z.literal(2), data: stage2Schema }),
  z.object({ stage: z.literal(3), data: stage3Schema }),
]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createSupabaseAdminClient();
  const draft = await loadDraftByToken(supabase, token);
  if (!draft) {
    return apiError(404, "draft_not_found", "This signup session has expired. Please start again.");
  }
  return NextResponse.json(draftView(draft));
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

  try {
    const update: Record<string, unknown> = {};
    if (parsed.data.stage === 2) {
      update.stage2 = parsed.data.data;
      update.current_stage = 3;
    } else {
      // Split access secrets away from ordinary stage data before storage.
      const { accessSecretNotes, ...stage3Rest } = parsed.data.data;
      update.stage3 = { ...stage3Rest, accessSecretNotes: undefined };
      update.access_secrets = accessSecretNotes ? { notes: accessSecretNotes } : null;
      update.current_stage = 4;
    }

    const { error } = await supabase
      .from("onboarding_drafts")
      .update(update)
      .eq("id", draft.id);
    if (error) throw new Error(error.message);

    const updated = await loadDraftByToken(supabase, token);
    return NextResponse.json(draftView(updated!));
  } catch (error) {
    console.error("draft update failed:", error instanceof Error ? error.message : error);
    return apiError(503, "draft_unavailable", "We couldn't save your progress just now. Please try again.", {
      retryable: true,
    });
  }
}
