import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { getSessionInfo } from "@/lib/auth";
import { STORAGE_POLICY } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Short-lived signed URL for a proof photo (P1-04). Authorization is proven by
 * an RLS-scoped read of the photo record: account members of the property,
 * the assigned runner, or staff. Only then does the service role sign the URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionInfo();
  if (!session) return apiError(401, "unauthenticated", "Sign in to continue.");

  let objectPath: string | null = null;

  if (["admin", "dispatcher", "support"].includes(session.role)) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("service_photos").select("object_path").eq("id", id).maybeSingle();
    objectPath = data?.object_path ?? null;
  } else {
    // RLS does the authorization: this read succeeds only for the property's
    // account members or the task's assigned runner.
    const rlsClient = await createSupabaseServerClient();
    const { data } = await rlsClient.from("service_photos").select("object_path").eq("id", id).maybeSingle();
    objectPath = data?.object_path ?? null;
  }

  if (!objectPath) return apiError(404, "not_found", "Photo not found.");

  const admin = createSupabaseAdminClient();
  const { data: signed, error } = await admin.storage
    .from("proof-photos")
    .createSignedUrl(objectPath, STORAGE_POLICY.signedUrlTtlSeconds);
  if (error || !signed) {
    console.error("signed URL failed:", error?.message);
    return apiError(503, "sign_failed", "The photo is temporarily unavailable.", { retryable: true });
  }

  return NextResponse.json({ url: signed.signedUrl, expiresInSeconds: STORAGE_POLICY.signedUrlTtlSeconds });
}
