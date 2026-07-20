import "server-only";

import {
  canTransitionTask,
  completionRequiresPhoto,
  cycleStateAfterTaskEvent,
  type ExceptionType,
  type TaskStatus,
  type TaskType,
} from "@/lib/state-machine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface TaskRow {
  id: string;
  property_id: string;
  cycle_id: string | null;
  task_type: TaskType;
  status: TaskStatus;
  assigned_runner_id: string | null;
  completion_idempotency_key: string | null;
}

export class TaskTransitionError extends Error {
  constructor(
    public code:
      | "not_found"
      | "not_assigned"
      | "invalid_transition"
      | "proof_required"
      | "write_failed",
    message: string,
  ) {
    super(message);
  }
}

async function loadTask(taskId: string): Promise<TaskRow> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("service_tasks")
    .select("id, property_id, cycle_id, task_type, status, assigned_runner_id, completion_idempotency_key")
    .eq("id", taskId)
    .maybeSingle();
  if (error || !data) {
    throw new TaskTransitionError("not_found", "Task not found.");
  }
  return data as TaskRow;
}

/**
 * Apply a task state transition: authority check, transition-table check,
 * proof-photo check, persisted status, appended task_event, synced cycle
 * state, and (for exceptions) an exceptions row. Never overwrites history.
 */
export async function applyTaskTransition(options: {
  taskId: string;
  to: TaskStatus;
  actorId: string;
  actorIsStaff: boolean;
  exceptionType?: ExceptionType;
  exceptionDescription?: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}): Promise<{ status: TaskStatus; duplicate: boolean }> {
  const supabase = createSupabaseAdminClient();
  const task = await loadTask(options.taskId);

  if (!options.actorIsStaff && task.assigned_runner_id !== options.actorId) {
    throw new TaskTransitionError("not_assigned", "You are not assigned to this task.");
  }

  // Idempotent completion: same key on a completed task is a duplicate ack.
  if (
    options.to === "completed" &&
    task.status === "completed" &&
    options.idempotencyKey &&
    task.completion_idempotency_key === options.idempotencyKey
  ) {
    return { status: "completed", duplicate: true };
  }

  if (!canTransitionTask(task.status, options.to)) {
    throw new TaskTransitionError(
      "invalid_transition",
      `A ${task.status} task cannot move to ${options.to}.`,
    );
  }

  if (options.to === "completed" && completionRequiresPhoto(task.task_type)) {
    const proofType = task.task_type === "rollout" ? "rollout_proof" : "return_proof";
    const { count } = await supabase
      .from("service_photos")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task.id)
      .eq("photo_type", proofType);
    if (!count) {
      throw new TaskTransitionError(
        "proof_required",
        "A proof photo is required before completing this task.",
      );
    }
  }

  const { error: updateError } = await supabase
    .from("service_tasks")
    .update({
      status: options.to,
      completed_at: options.to === "completed" ? new Date().toISOString() : null,
      completion_idempotency_key:
        options.to === "completed" ? (options.idempotencyKey ?? null) : task.completion_idempotency_key,
    })
    .eq("id", task.id)
    .eq("status", task.status); // optimistic guard against concurrent moves
  if (updateError) {
    throw new TaskTransitionError("write_failed", updateError.message);
  }

  const { error: eventError } = await supabase.from("task_events").insert({
    task_id: task.id,
    event_type: options.exceptionType ? `exception:${options.exceptionType}` : `status:${options.to}`,
    from_status: task.status,
    to_status: options.to,
    actor_id: options.actorId,
    payload: options.payload ?? {},
  });
  if (eventError) {
    throw new TaskTransitionError("write_failed", eventError.message);
  }

  if (options.to === "exception" && options.exceptionType) {
    await supabase.from("exceptions").insert({
      task_id: task.id,
      cycle_id: task.cycle_id,
      exception_type: options.exceptionType,
      description: options.exceptionDescription ?? null,
      customer_visible: true,
    });
  }

  if (task.cycle_id) {
    const nextCycleState = cycleStateAfterTaskEvent({
      taskType: task.task_type,
      taskStatus: options.to,
      exceptionType: options.exceptionType,
    });
    if (nextCycleState) {
      await supabase
        .from("collection_cycles")
        .update({ state: nextCycleState })
        .eq("id", task.cycle_id);
    }
  }

  return { status: options.to, duplicate: false };
}
