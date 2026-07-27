import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, rateLimitedError, zodFieldErrors } from "@/lib/api";
import { limitPublic } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  topic: z.enum(["general", "service", "hoa", "portfolio"]),
  message: z.string().trim().min(10, "Tell us a little more so we can help.").max(4000),
});

export async function POST(request: NextRequest) {
  const limit = limitPublic(request, "contact", { limit: 5, windowSeconds: 60 });
  if (!limit.ok) return rateLimitedError(limit.retryAfterSeconds);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError(400, "invalid_json", "The request body could not be read.");
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error.issues),
    });
  }
  const input = parsed.data;

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("support_tickets").insert({
      subject: `[${input.topic}] Website contact from ${input.fullName}`,
      body: `From: ${input.fullName} <${input.email}>\n\n${input.message}`,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("contact submission failed:", error instanceof Error ? error.message : error);
    return apiError(503, "contact_unavailable", "We couldn't send your message just now. Please try again in a moment.", {
      retryable: true,
    });
  }
}
