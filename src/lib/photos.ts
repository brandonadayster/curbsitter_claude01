import "server-only";

import { STORAGE_POLICY } from "@/config/business";
import { getSessionInfo, type SessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Mint a short-lived signed URL for a proof photo after authorization (P1-04).
 * Non-staff authorization is proven by an RLS-scoped read of the photo record
 * (account members of the property or the assigned runner).
 */
export async function mintSignedPhotoUrl(
  photoId: string,
  session?: SessionInfo | null,
): Promise<{ url: string; expiresInSeconds: number } | null> {
  const resolvedSession = session ?? (await getSessionInfo());
  if (!resolvedSession) return null;

  let objectPath: string | null = null;
  if (["admin", "dispatcher", "support"].includes(resolvedSession.role)) {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("service_photos")
      .select("object_path")
      .eq("id", photoId)
      .maybeSingle();
    objectPath = data?.object_path ?? null;
  } else {
    const rlsClient = await createSupabaseServerClient();
    const { data } = await rlsClient
      .from("service_photos")
      .select("object_path")
      .eq("id", photoId)
      .maybeSingle();
    objectPath = data?.object_path ?? null;
  }
  if (!objectPath) return null;

  const admin = createSupabaseAdminClient();
  const { data: signed, error } = await admin.storage
    .from("proof-photos")
    .createSignedUrl(objectPath, STORAGE_POLICY.signedUrlTtlSeconds);
  if (error || !signed) {
    console.error("signed URL failed:", error?.message);
    return null;
  }
  return { url: signed.signedUrl, expiresInSeconds: STORAGE_POLICY.signedUrlTtlSeconds };
}
