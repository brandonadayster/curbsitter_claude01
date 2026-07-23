/**
 * Explicit task/cycle state machine (PRD.md service state model). Pure
 * transition rules live here so they are unit-testable; persistence and
 * task_events appends happen in src/lib/tasks.ts.
 */

export type TaskStatus =
  | "draft"
  | "scheduled"
  | "assigned"
  | "en_route"
  | "arrived"
  | "completed"
  | "exception"
  | "retry_required"
  | "cancelled";

export type CycleState =
  | "planned"
  | "rollout_scheduled"
  | "rolled_out"
  | "collection_pending"
  | "return_scheduled"
  | "completed"
  | "completed_with_exception"
  | "delayed_by_hauler"
  | "blocked"
  | "cancelled";

export type TaskType = "rollout" | "return" | "recheck" | "home_watch" | "bulk_setout";

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["assigned", "cancelled"],
  assigned: ["en_route", "arrived", "exception", "cancelled"],
  en_route: ["arrived", "exception", "cancelled"],
  arrived: ["completed", "exception"],
  exception: ["retry_required", "completed", "cancelled"],
  retry_required: ["scheduled", "assigned", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

export type ExceptionType =
  | "access_blocked"
  | "bin_missing"
  | "bin_blocked"
  | "hauler_missed"
  | "partial_collection"
  | "unsafe_condition"
  | "weather"
  | "animal"
  | "overweight_or_contaminated"
  | "damage"
  | "schedule_mismatch"
  | "other";

/**
 * Cycle state that should follow a task event. Returns null when the cycle
 * state is unchanged.
 */
export function cycleStateAfterTaskEvent(options: {
  taskType: TaskType;
  taskStatus: TaskStatus;
  exceptionType?: ExceptionType;
}): CycleState | null {
  const { taskType, taskStatus, exceptionType } = options;

  if (taskStatus === "completed") {
    if (taskType === "rollout") return "collection_pending";
    if (taskType === "return") return "completed";
    if (taskType === "recheck") return "completed";
    return null;
  }

  if (taskStatus === "exception") {
    // The hauler not collecting is a delay, not a service failure; the return
    // is rescheduled under the recheck policy (OPERATIONS_PLAYBOOK.md).
    if (exceptionType === "hauler_missed" || exceptionType === "partial_collection") {
      return "delayed_by_hauler";
    }
    if (exceptionType === "access_blocked" || exceptionType === "bin_missing") {
      return "blocked";
    }
    return "completed_with_exception";
  }

  if (taskStatus === "cancelled") return "cancelled";
  if (taskStatus === "assigned" && taskType === "rollout") return "rollout_scheduled";
  if (taskStatus === "assigned" && taskType === "return") return "return_scheduled";

  return null;
}

/** Proof photo requirement: normal rollout/return completion requires one. */
export function completionRequiresPhoto(taskType: TaskType): boolean {
  return taskType === "rollout" || taskType === "return";
}
