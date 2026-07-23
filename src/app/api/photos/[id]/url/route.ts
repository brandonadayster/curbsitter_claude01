import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api";
import { getSessionInfo } from "@/lib/auth";
import { mintSignedPhotoUrl } from "@/lib/photos";

/** JSON variant: returns a short-lived signed URL for an authorized photo. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionInfo();
  if (!session) return apiError(401, "unauthenticated", "Sign in to continue.");

  const signed = await mintSignedPhotoUrl(id, session);
  if (!signed) return apiError(404, "not_found", "Photo not found.");
  return NextResponse.json(signed);
}
