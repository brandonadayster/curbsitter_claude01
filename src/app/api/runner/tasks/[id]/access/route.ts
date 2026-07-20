import { NextRequest, NextResponse } from "next/server";

import { decryptAccessSecret } from "@/lib/access-secrets";
import { apiError } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Least-privilege access reveal: only the assigned runner, only while the task
 * is in an active working state, and every reveal is audited. The secret is
 * returned once for display — never cached, logged, or included in lists.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionInfo();
  if (!session) return apiError(401, "unauthenticated", "Sign in to continue.");

  const supabase = createSupabaseAdminClient();
  const { data: task } = await supabase
    .from("service_tasks")
    .select("id, property_id, assigned_runner_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!task) return apiError(404, "not_found", "Task not found.");
  if (task.assigned_runner_id !== session.userId) {
    return apiError(403, "not_assigned", "You are not assigned to this task.");
  }
  if (!["assigned", "en_route", "arrived", "exception"].includes(task.status)) {
    return apiError(409, "not_active", "Access details are only available during active service.");
  }

  const { data: secret } = await supabase
    .from("property_access_secrets")
    .select("encrypted_payload")
    .eq("property_id", task.property_id)
    .maybeSingle();
  if (!secret) {
    return NextResponse.json({ access: null });
  }

  try {
    const plaintext = decryptAccessSecret(secret.encrypted_payload);
    await auditLog({
      actorId: session.userId,
      action: "access_secret.reveal",
      entity: "property_access_secrets",
      entityId: task.property_id,
      after: { task_id: task.id },
    });
    return NextResponse.json({ access: plaintext });
  } catch (error) {
    console.error("access reveal failed:", error instanceof Error ? error.message : error);
    return apiError(503, "reveal_failed", "Access details are temporarily unavailable. Contact dispatch.", {
      retryable: true,
    });
  }
}
