import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { getSessionInfo } from "@/lib/auth";
import { STORAGE_POLICY } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["rollout_proof", "return_proof", "exception", "reference"] as const;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Proof-photo upload: assigned runner only, private bucket, metadata row in
 * service_photos with a retention deadline. Reads happen exclusively through
 * short-lived signed URLs minted after authorization.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionInfo();
  if (!session) return apiError(401, "unauthenticated", "Sign in to continue.");

  const supabase = createSupabaseAdminClient();
  const { data: task } = await supabase
    .from("service_tasks")
    .select("id, assigned_runner_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!task) return apiError(404, "not_found", "Task not found.");
  if (task.assigned_runner_id !== session.userId && !["admin", "dispatcher"].includes(session.role)) {
    return apiError(403, "not_assigned", "You are not assigned to this task.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, "invalid_form", "The upload could not be read.");
  }

  const photoType = String(form.get("photoType") ?? "");
  const file = form.get("file");
  if (!ALLOWED_TYPES.includes(photoType as (typeof ALLOWED_TYPES)[number])) {
    return apiError(422, "validation_failed", "Unknown photo type.");
  }
  if (!(file instanceof File) || file.size === 0) {
    return apiError(422, "validation_failed", "Attach a photo file.");
  }
  if (file.size > MAX_BYTES) {
    return apiError(413, "too_large", "Photos must be under 10 MB.");
  }
  if (!file.type.startsWith("image/")) {
    return apiError(422, "validation_failed", "Only image uploads are accepted.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectPath = `tasks/${task.id}/${photoType}-${Date.now()}.${extension}`;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("proof-photos")
      .upload(objectPath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const retention = new Date();
    retention.setDate(retention.getDate() + STORAGE_POLICY.defaultPhotoRetentionDays);

    const { data: photo, error: insertError } = await supabase
      .from("service_photos")
      .insert({
        task_id: task.id,
        photo_type: photoType,
        object_path: objectPath,
        taken_at: new Date().toISOString(),
        uploaded_by: session.userId,
        retention_expires_at: retention.toISOString(),
        metadata: { content_type: file.type, size_bytes: file.size },
      })
      .select("id")
      .single();
    if (insertError || !photo) throw new Error(insertError?.message);

    return NextResponse.json({ photoId: photo.id });
  } catch (error) {
    console.error("photo upload failed:", error instanceof Error ? error.message : error);
    return apiError(503, "upload_failed", "The photo didn't upload. It's saved on your device — try again.", {
      retryable: true,
    });
  }
}
