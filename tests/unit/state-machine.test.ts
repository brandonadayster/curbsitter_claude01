import { describe, expect, it } from "vitest";

import {
  canTransitionTask,
  completionRequiresPhoto,
  cycleStateAfterTaskEvent,
} from "@/lib/state-machine";

describe("task transitions", () => {
  it("follows the happy path scheduled → assigned → en_route → arrived → completed", () => {
    expect(canTransitionTask("draft", "scheduled")).toBe(true);
    expect(canTransitionTask("scheduled", "assigned")).toBe(true);
    expect(canTransitionTask("assigned", "en_route")).toBe(true);
    expect(canTransitionTask("en_route", "arrived")).toBe(true);
    expect(canTransitionTask("arrived", "completed")).toBe(true);
  });

  it("rejects skipping and rewinding", () => {
    expect(canTransitionTask("scheduled", "completed")).toBe(false);
    expect(canTransitionTask("completed", "scheduled")).toBe(false);
    expect(canTransitionTask("completed", "exception")).toBe(false);
    expect(canTransitionTask("cancelled", "assigned")).toBe(false);
    expect(canTransitionTask("draft", "arrived")).toBe(false);
  });

  it("routes failures through exception and retry", () => {
    expect(canTransitionTask("arrived", "exception")).toBe(true);
    expect(canTransitionTask("exception", "retry_required")).toBe(true);
    expect(canTransitionTask("retry_required", "scheduled")).toBe(true);
  });
});

describe("cycle synchronization", () => {
  it("rollout completion moves the cycle to collection_pending", () => {
    expect(cycleStateAfterTaskEvent({ taskType: "rollout", taskStatus: "completed" })).toBe(
      "collection_pending",
    );
  });

  it("return completion completes the cycle", () => {
    expect(cycleStateAfterTaskEvent({ taskType: "return", taskStatus: "completed" })).toBe(
      "completed",
    );
  });

  it("hauler miss is a delay, not a service failure", () => {
    expect(
      cycleStateAfterTaskEvent({
        taskType: "return",
        taskStatus: "exception",
        exceptionType: "hauler_missed",
      }),
    ).toBe("delayed_by_hauler");
  });

  it("blocked access blocks the cycle", () => {
    expect(
      cycleStateAfterTaskEvent({
        taskType: "rollout",
        taskStatus: "exception",
        exceptionType: "access_blocked",
      }),
    ).toBe("blocked");
  });

  it("other exceptions complete the cycle with exception", () => {
    expect(
      cycleStateAfterTaskEvent({
        taskType: "rollout",
        taskStatus: "exception",
        exceptionType: "animal",
      }),
    ).toBe("completed_with_exception");
  });

  it("ordinary progress events leave the cycle unchanged", () => {
    expect(cycleStateAfterTaskEvent({ taskType: "rollout", taskStatus: "en_route" })).toBeNull();
    expect(cycleStateAfterTaskEvent({ taskType: "rollout", taskStatus: "arrived" })).toBeNull();
  });
});

describe("proof requirements", () => {
  it("requires photos for rollout and return, not recheck", () => {
    expect(completionRequiresPhoto("rollout")).toBe(true);
    expect(completionRequiresPhoto("return")).toBe(true);
    expect(completionRequiresPhoto("recheck")).toBe(false);
  });
});
