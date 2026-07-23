import { NextRequest, NextResponse } from "next/server";

import { apiError, zodFieldErrors } from "@/lib/api";
import { addressCheckSchema, checkAddressEligibility } from "@/lib/eligibility";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }

  const parsed = addressCheckSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }

  try {
    const outcome = await checkAddressEligibility(parsed.data);
    return NextResponse.json(outcome);
  } catch (error) {
    console.error("eligibility check failed:", error instanceof Error ? error.message : error);
    return apiError(503, "eligibility_unavailable", "We couldn't check availability just now. Please try again in a moment.", {
      retryable: true,
    });
  }
}
