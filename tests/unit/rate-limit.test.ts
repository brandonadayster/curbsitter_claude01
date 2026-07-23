import { describe, expect, it } from "vitest";

import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit (fixed window)", () => {
  it("allows up to the limit then blocks with a retry-after", () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 3, windowSeconds: 60 };
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    const blocked = rateLimit(key, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keeps separate counters per key", () => {
    const opts = { limit: 1, windowSeconds: 60 };
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(rateLimit(a, opts).ok).toBe(true);
    expect(rateLimit(a, opts).ok).toBe(false);
    // Different key is unaffected.
    expect(rateLimit(b, opts).ok).toBe(true);
  });
});
