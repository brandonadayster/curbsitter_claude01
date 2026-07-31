"use client";

import { usePhotoQueue } from "./use-photo-queue";

/**
 * Route-level answer to "did my work actually save?".
 *
 * Renders nothing when the queue is empty and the device is online — a
 * permanent "all synced" badge trains runners to ignore the row, which
 * defeats the point of showing it at all. It appears when there is something
 * to say.
 *
 * Counts come from the real IndexedDB queue, never from an optimistic
 * counter. If it says two photos are waiting, two photos are on the device.
 */
export function RouteSyncStatus() {
  const queue = usePhotoQueue();
  const count = queue.pending.length;

  if (count === 0 && queue.online) return null;

  return (
    <section
      aria-label="Sync status"
      className={`mt-6 rounded-2xl border p-5 ${
        count > 0 ? "border-warning/50 bg-warning/10" : "border-border bg-surface"
      }`}
    >
      {!queue.online ? (
        <p className="text-xl font-bold text-warning">No signal — keep going</p>
      ) : null}

      {count > 0 ? (
        <>
          <p className="mt-1 text-lg">
            {count === 1
              ? "1 photo saved on this device, waiting to upload"
              : `${count} photos saved on this device, waiting to upload`}
          </p>
          <p className="mt-1 text-base text-muted">
            {queue.online
              ? "Uploading when the connection allows."
              : "These upload automatically when signal returns. You can finish your route."}
          </p>
          <button
            type="button"
            disabled={queue.busy || !queue.online}
            onClick={() => void queue.retryNow()}
            className="mt-3 min-h-[44px] rounded-lg border border-border px-4 py-2 text-base font-semibold disabled:opacity-60"
          >
            {queue.busy ? "Uploading…" : "Retry now"}
          </button>
        </>
      ) : (
        <p className="mt-1 text-lg">
          Everything you&apos;ve captured is uploaded. New photos will queue until signal
          returns.
        </p>
      )}
    </section>
  );
}

/**
 * Per-stop badge for the route list. Only renders for stops that actually
 * have something pending, so a clean route list stays clean.
 */
export function StopSyncBadge({ taskId }: { taskId: string }) {
  const queue = usePhotoQueue();
  const count = queue.pending.filter((item) => item.taskId === taskId).length;
  if (count === 0) return null;

  return (
    <span className="mt-2 inline-block rounded-full border border-warning/60 px-3 py-1 text-base font-medium text-warning">
      {count === 1 ? "photo queued" : `${count} photos queued`}
    </span>
  );
}
