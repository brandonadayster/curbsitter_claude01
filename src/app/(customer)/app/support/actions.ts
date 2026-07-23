"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionInfo } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ticketSchema = z.object({
  accountId: z.string().uuid().optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Add a short subject.").max(200),
  body: z.string().trim().min(10, "Tell us a little more so we can help.").max(4000),
});

export async function openSupportTicket(formData: FormData): Promise<void> {
  const session = await getSessionInfo();
  if (!session) throw new Error("Sign in to continue.");

  const parsed = ticketSchema.safeParse({
    accountId: formData.get("accountId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid ticket.");

  // Insert through the customer's own RLS policy (opened_by must equal them).
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("support_tickets").insert({
    account_id: parsed.data.accountId || null,
    opened_by: session.userId,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });
  if (error) throw new Error(`Could not open ticket: ${error.message}`);

  revalidatePath("/app/support");
}
