import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Append a privileged-action audit entry (SECURITY_PRIVACY.md). No secrets.
 * `actorId` is null for system-initiated actions with no human actor, such
 * as D-027's automatic activation of a clean signup.
 */
export async function auditLog(entry: {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("audit_log").insert({
    actor_id: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
  if (error) {
    // Audit failures must be loud in logs but not silently swallow the action.
    console.error(`audit_log write failed for ${entry.action}:`, error.message);
  }
}
