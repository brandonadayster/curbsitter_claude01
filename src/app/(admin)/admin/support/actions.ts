"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export async function updateTicketStatus(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher", "support"]);

  const parsed = updateSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
  });
  if (!parsed.success) throw new Error("Invalid ticket update.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("support_tickets")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.ticketId);
  if (error) throw new Error(`Ticket update failed: ${error.message}`);

  await auditLog({
    actorId: session.userId,
    action: "support_ticket.status",
    entity: "support_tickets",
    entityId: parsed.data.ticketId,
    after: { status: parsed.data.status },
  });

  revalidatePath("/admin/support");
}
