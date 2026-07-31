"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  enqueue,
  isSupported,
  listAll,
  markAttempted,
  remove,
  selectRetryable,
  toSummary,
  type QueuedPhotoSummary,
} from "@/lib/photo-queue";

/**
 * Owns the offline proof-photo queue: persists captures immediately, drains
 * them when possible, and reports real state to the UI.
 *
 * The ordering matters. A capture is written to IndexedDB *before* the upload
 * is attempted, so a request that dies mid-flight still leaves the photo
 * recoverable. Uploading first and only persisting on failure would lose
 * anything interrupted by the tab closing — precisely the failure this queue
 * exists to prevent.
 *
 * The queue is modelled as a module-level external store read through
 * `useSyncExternalStore`, not as component state synchronised by an effect.
 * IndexedDB genuinely is external state, and this way every mounted consumer
 * (the task screen and the route list) shares one snapshot with no custom
 * events, no prop drilling, and no cascading renders.
 */

interface QueueState {
  pending: QueuedPhotoSummary[];
  busy: boolean;
}

const EMPTY: QueueState = { pending: [], busy: false };

let state: QueueState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

/** Replaces the snapshot identity so `useSyncExternalStore` sees the change. */
function setState(next: Partial<QueueState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
/** Stable identity on the server; the queue is browser-only. */
const getServerSnapshot = () => EMPTY;

async function reload(): Promise<void> {
  if (!isSupported()) return;
  const items = await listAll().catch(() => []);
  setState({ pending: items.map(toSummary) });
}

/** Resolves to the server-assigned photo id. */
async function upload(taskId: string, photoType: string, blob: Blob): Promise<string> {
  const form = new FormData();
  form.set("photoType", photoType);
  form.set("file", new File([blob], "proof.jpg", { type: blob.type || "image/jpeg" }));
  const response = await fetch(`/api/runner/tasks/${taskId}/photo`, {
    method: "POST",
    body: form,
  });
  const data = (await response.json().catch(() => null)) as
    | { photoId?: string; error?: { message?: string } }
    | null;
  if (!response.ok || !data?.photoId) {
    throw new Error(data?.error?.message ?? "Upload failed.");
  }
  return data.photoId;
}

async function drain(force: boolean): Promise<void> {
  if (!isSupported() || !navigator.onLine) return;

  const items = await listAll().catch(() => []);
  const due = force
    ? items
    : items.filter((item) => selectRetryable([toSummary(item)], Date.now()).length > 0);
  if (due.length === 0) return;

  setState({ busy: true });
  try {
    for (const item of due) {
      try {
        await upload(item.taskId, item.photoType, item.blob);
        await remove(item.id);
      } catch (error) {
        await markAttempted(item.id, error instanceof Error ? error.message : "Upload failed.");
      }
    }
  } finally {
    setState({ busy: false });
    await reload();
  }
}

/**
 * Connectivity is external state too. `navigator.onLine` is optimistic — it
 * reports link status, not reachability — so an upload can still fail while
 * "online" and land the photo back in the queue.
 */
function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export interface PhotoQueueApi {
  pending: QueuedPhotoSummary[];
  online: boolean;
  busy: boolean;
  /**
   * Persist then attempt. Resolves to the server-assigned photo id when the
   * upload landed immediately, or `null` when it is queued on the device.
   */
  capture: (taskId: string, photoType: string, blob: Blob) => Promise<string | null>;
  retryNow: () => Promise<void>;
  discard: (id: string) => Promise<void>;
}

export function usePhotoQueue(): PhotoQueueApi {
  const { pending, busy } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const online = useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true, // SSR: assume online so the offline banner never flashes server-side.
  );

  // First mount in the document primes the store from IndexedDB. Neither call
  // touches React state — they update the external store, which is what
  // effects are for.
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    void reload();
  }, []);

  useEffect(() => {
    if (online) void drain(false);
  }, [online]);

  const capture = useCallback(
    async (taskId: string, photoType: string, blob: Blob): Promise<string | null> => {
      if (!isSupported()) {
        // No IndexedDB (locked-down browser, private mode in some engines):
        // upload directly and let the caller surface a plain failure. Never
        // claim the photo was stored when there is nowhere to store it.
        return await upload(taskId, photoType, blob);
      }

      const item = await enqueue({ taskId, photoType, blob });
      await reload();
      try {
        const photoId = await upload(taskId, photoType, blob);
        await remove(item.id);
        return photoId;
      } catch {
        await markAttempted(item.id, "Waiting for signal.");
        return null;
      } finally {
        await reload();
      }
    },
    [],
  );

  const retryNow = useCallback(() => drain(true), []);

  const discard = useCallback(async (id: string) => {
    await remove(id);
    await reload();
  }, []);

  return { pending, online, busy, capture, retryNow, discard };
}
