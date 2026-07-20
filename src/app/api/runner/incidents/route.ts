import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, zodFieldErrors } from "@/lib/api";
import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const incidentSchema = z.object({
  severity: z.enum(["normal", "high", "critical"]),
  description: z.string().trim().min(10, "Describe what happened.").max(4000),
  taskId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSessionInfo();
  if (!session || !["runner", "admin", "dispatcher"].includes(session.role)) {
    return apiError(403, "forbidden", "Only field staff can file incidents.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }
  const parsed = incidentSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("incidents")
      .insert({
        reporter_id: session.userId,
        severity: parsed.data.severity,
        description: parsed.data.description,
        task_id: parsed.data.taskId ?? null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message);
    return NextResponse.json({ incidentId: data.id });
  } catch (error) {
    console.error("incident report failed:", error instanceof Error ? error.message : error);
    return apiError(503, "incident_unavailable", "The report didn't save. If anyone is in danger, call dispatch or 911 first.", {
      retryable: true,
    });
  }
}
