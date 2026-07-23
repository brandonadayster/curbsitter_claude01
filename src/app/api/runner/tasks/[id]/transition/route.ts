import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api";
import { getSessionInfo } from "@/lib/auth";
import { applyTaskTransition, TaskTransitionError } from "@/lib/tasks";

const transitionSchema = z.object({
  to: z.enum(["en_route", "arrived", "completed", "exception"]),
  exceptionType: z
    .enum([
      "access_blocked",
      "bin_missing",
      "bin_blocked",
      "hauler_missed",
      "partial_collection",
      "unsafe_condition",
      "weather",
      "animal",
      "overweight_or_contaminated",
      "damage",
      "schedule_mismatch",
      "other",
    ])
    .optional(),
  exceptionDescription: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().trim().max(80).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionInfo();
  if (!session || !["runner", "admin", "dispatcher"].includes(session.role)) {
    return apiError(403, "forbidden", "You do not have access to this task.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }
  const parsed = transitionSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Invalid transition request.");
  }
  if (parsed.data.to === "exception" && !parsed.data.exceptionType) {
    return apiError(422, "validation_failed", "Pick an exception type.");
  }
  if (parsed.data.to === "completed" && !parsed.data.idempotencyKey) {
    return apiError(422, "validation_failed", "Completion requires an idempotency key.");
  }

  try {
    const result = await applyTaskTransition({
      taskId: id,
      to: parsed.data.to,
      actorId: session.userId,
      actorIsStaff: session.role !== "runner",
      exceptionType: parsed.data.exceptionType,
      exceptionDescription: parsed.data.exceptionDescription,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TaskTransitionError) {
      const status =
        error.code === "not_found" ? 404 : error.code === "not_assigned" ? 403 : 409;
      return apiError(status, error.code, error.message);
    }
    console.error("task transition failed:", error instanceof Error ? error.message : error);
    return apiError(503, "transition_unavailable", "We couldn't update the task. Try again.", {
      retryable: true,
    });
  }
}
