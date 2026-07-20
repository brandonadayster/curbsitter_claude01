"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CONSENT_LANGUAGE_VERSION = "preferences-2026-07-v1";

const prefsSchema = z.object({
  marketingEmail: z.coerce.boolean(),
  smsTransactional: z.coerce.boolean(),
});

/**
 * Update notification preferences by appending new consent rows (consent is an
 * immutable audit trail, not a mutable flag). Transactional email is always on
 * and is not user-toggleable.
 */
export async function updatePreferences(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session?.email) throw new Error("Sign in to continue.");

  const parsed = prefsSchema.safeParse({
    marketingEmail: formData.get("marketingEmail") === "on",
    smsTransactional: formData.get("smsTransactional") === "on",
  });
  if (!parsed.success) throw new Error("Invalid preferences.");

  const admin = createSupabaseAdminClient();
  const base = {
    profile_id: session.userId,
    email: session.email.toLowerCase(),
    language_version: CONSENT_LANGUAGE_VERSION,
    source: "portal_preferences",
  };

  const { error } = await admin.from("consents").insert([
    { ...base, channel: "email", purpose: "marketing", granted: parsed.data.marketingEmail },
    { ...base, channel: "sms", purpose: "transactional", granted: parsed.data.smsTransactional },
  ]);
  if (error) throw new Error(`Could not save preferences: ${error.message}`);

  revalidatePath("/app/notifications");
}
