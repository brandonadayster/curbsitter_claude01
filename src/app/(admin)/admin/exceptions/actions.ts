"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const resolveSchema = z.object({
  exceptionId: z.string().uuid(),
  resolution: z.string().trim().min(3, "Describe the resolution.").max(2000),
});

export async function resolveException(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher", "support"]);
  const parsed = resolveSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) throw new Error("Invalid resolution.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("exceptions")
    .update({
      status: "resolved",
      resolution: parsed.data.resolution,
      owner_id: session.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.exceptionId)
    .neq("status", "resolved");
  if (error) throw new Error(`Resolution failed: ${error.message}`);

  await auditLog({
    actorId: session.userId,
    action: "exception.resolve",
    entity: "exceptions",
    entityId: parsed.data.exceptionId,
    after: { resolution: parsed.data.resolution },
  });

  revalidatePath("/admin/exceptions");
  revalidatePath("/admin");
}

const retrySchema = z.object({ taskId: z.string().uuid() });

/**
 * Retry a task that hit an exception: exception → retry_required → scheduled,
 * clearing route assignment so it can be routed again.
 */
export async function retryTask(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);
  const parsed = retrySchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) throw new Error("Invalid retry request.");

  const supabase = createSupabaseAdminClient();
  const { data: task } = await supabase
    .from("service_tasks")
    .select("id, status")
    .eq("id", parsed.data.taskId)
    .maybeSingle();
  if (!task) throw new Error("Task not found.");
  if (task.status !== "exception") throw new Error("Only exception tasks can be retried.");

  const { error } = await supabase
    .from("service_tasks")
    .update({ status: "scheduled", route_id: null, sequence: null, assigned_runner_id: null })
    .eq("id", task.id)
    .eq("status", "exception");
  if (error) throw new Error(`Retry failed: ${error.message}`);

  // Record both hops of the explicit path exception → retry_required → scheduled.
  await supabase.from("task_events").insert([
    {
      task_id: task.id,
      event_type: "status:retry_required",
      from_status: "exception",
      to_status: "retry_required",
      actor_id: session.userId,
      payload: {},
    },
    {
      task_id: task.id,
      event_type: "status:scheduled",
      from_status: "retry_required",
      to_status: "scheduled",
      actor_id: session.userId,
      payload: { reason: "admin_retry" },
    },
  ]);

  await auditLog({
    actorId: session.userId,
    action: "task.retry",
    entity: "service_tasks",
    entityId: task.id,
  });

  revalidatePath("/admin/exceptions");
  revalidatePath("/admin/cycles");
}

const recheckSchema = z.object({
  cycleId: z.string().uuid(),
  recheckDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  runnerId: z.string().uuid().optional().or(z.literal("")),
});

/**
 * Hauler-delay recheck (OPERATIONS_PLAYBOOK.md): create a recheck task on the
 * delayed cycle — verify collection happened, then return the bins. Assigned
 * directly when a runner is chosen, otherwise left scheduled for the route
 * builder.
 */
export async function scheduleRecheck(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);
  const parsed = recheckSchema.safeParse({
    cycleId: formData.get("cycleId"),
    recheckDate: formData.get("recheckDate"),
    runnerId: formData.get("runnerId"),
  });
  if (!parsed.success) throw new Error("Invalid recheck request.");

  const supabase = createSupabaseAdminClient();
  const { data: cycle } = await supabase
    .from("collection_cycles")
    .select("id, property_id, state")
    .eq("id", parsed.data.cycleId)
    .maybeSingle();
  if (!cycle) throw new Error("Cycle not found.");
  if (cycle.state !== "delayed_by_hauler") {
    throw new Error("Rechecks are for cycles delayed by the hauler.");
  }

  const runnerId = parsed.data.runnerId || null;
  const { data: recheck, error } = await supabase
    .from("service_tasks")
    .insert({
      property_id: cycle.property_id,
      cycle_id: cycle.id,
      task_type: "recheck",
      status: runnerId ? "assigned" : "scheduled",
      assigned_runner_id: runnerId,
      window_start: `${parsed.data.recheckDate}T08:00:00-07:00`,
      window_end: `${parsed.data.recheckDate}T12:00:00-07:00`,
    })
    .select("id")
    .single();
  if (error || !recheck) throw new Error(`Recheck creation failed: ${error?.message}`);

  await supabase.from("task_events").insert({
    task_id: recheck.id,
    event_type: runnerId ? "status:assigned" : "status:scheduled",
    from_status: "draft",
    to_status: runnerId ? "assigned" : "scheduled",
    actor_id: session.userId,
    payload: { reason: "hauler_delay_recheck" },
  });

  await auditLog({
    actorId: session.userId,
    action: "cycle.schedule_recheck",
    entity: "collection_cycles",
    entityId: cycle.id,
    after: { recheck_task_id: recheck.id, recheck_date: parsed.data.recheckDate, runner_id: runnerId },
  });

  revalidatePath("/admin/exceptions");
  revalidatePath("/admin/cycles");
}
