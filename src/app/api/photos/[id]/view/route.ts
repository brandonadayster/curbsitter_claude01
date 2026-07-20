import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { getSessionInfo } from "@/lib/auth";
import { mintSignedPhotoUrl } from "@/lib/photos";

/**
 * Redirect variant for plain links in the portal: authorizes, mints a
 * short-lived signed URL, and 302s to it. The signed URL itself expires; the
 * portal link stays stable and re-authorizes on every view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionInfo();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const signed = await mintSignedPhotoUrl(id, session);
  if (!signed) return apiError(404, "not_found", "Photo not found.");
  return NextResponse.redirect(signed.url);
}
