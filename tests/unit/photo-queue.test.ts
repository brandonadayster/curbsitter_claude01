import { describe, expect, it } from "vitest";

import { nextRetryAt, selectRetryable, type QueuedPhotoSummary } from "@/lib/photo-queue";

/**
 * Retry scheduling for the runner's offline proof-photo queue. The IndexedDB
 * binding is a thin wrapper; the decision of *what* to retry and *when* is
 * pure, so it is tested directly rather than through a fake IndexedDB.
 */

function item(overrides: Partial<QueuedPhotoSummary> = {}): QueuedPhotoSummary {
  return {
    id: "photo-1",
    taskId: "task-1",
    photoType: "rollout_proof",
    capturedAt: 1_000_000,
    attempts: 0,
    ...overrides,
  };
}

describe("photo queue retry scheduling", () => {
  it("makes a fresh capture eligible immediately", () => {
    const fresh = item({ attempts: 0 });
    expect(nextRetryAt(fresh)).toBe(fresh.capturedAt);
    expect(selectRetryable([fresh], fresh.capturedAt)).toHaveLength(1);
  });

  it("backs off further on each failed attempt", () => {
    const one = nextRetryAt(item({ attempts: 1 }));
    const two = nextRetryAt(item({ attempts: 2 }));
    const three = nextRetryAt(item({ attempts: 3 }));

    expect(one).toBeGreaterThan(nextRetryAt(item({ attempts: 0 })));
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
  });

  it("holds an item back until its backoff has elapsed", () => {
    const queued = item({ attempts: 2 });
    const due = nextRetryAt(queued);

    expect(selectRetryable([queued], due - 1)).toHaveLength(0);
    expect(selectRetryable([queued], due)).toHaveLength(1);
  });

  it("caps the backoff so a long-queued photo never stops being retried", () => {
    // A runner offline for hours must still drain when signal returns, so the
    // schedule has to plateau rather than grow without bound.
    const capped = nextRetryAt(item({ attempts: 99 }));
    const atCap = nextRetryAt(item({ attempts: 4 }));
    expect(capped).toBe(atCap);
  });

  it("selects only the items that are due, leaving the rest queued", () => {
    const ready = item({ id: "ready", attempts: 0 });
    const waiting = item({ id: "waiting", attempts: 3 });

    const due = selectRetryable([ready, waiting], ready.capturedAt);
    expect(due.map((entry) => entry.id)).toEqual(["ready"]);
  });
});
