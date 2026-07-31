/**
 * Browser-only offline queue for runner proof photos.
 *
 * NOT server-safe — every export touches `indexedDB`. Import only from client
 * components.
 *
 * Why this exists: rural Prescott routes lose signal, and until now a failed
 * proof-photo upload dropped the captured file entirely while the UI told the
 * runner it had been saved. A proof photo that only exists in a `File` handle
 * is gone the moment the component unmounts, so the promise had to become
 * true rather than the message become vaguer.
 *
 * What is deliberately stored: the image blob, the task id, the photo type,
 * and retry bookkeeping. Nothing else. No addresses, no access codes, no
 * signed URLs — TECH_STACK.md forbids persisting those in browser storage,
 * and a queue that outlives a session is exactly the wrong place for them.
 *
 * Entries leave the queue on successful upload or explicit discard by the
 * runner — never on a silent timer. Auto-evicting a proof photo would
 * reintroduce the same lie in a quieter form.
 */

const DB_NAME = "curbsitter-runner";
const DB_VERSION = 1;
const STORE = "pending-photos";

export interface QueuedPhoto {
  /** Client-generated; also the IndexedDB key. */
  id: string;
  taskId: string;
  photoType: string;
  blob: Blob;
  capturedAt: number;
  attempts: number;
  lastError?: string;
}

/** Serializable view for UI/tests — the blob is intentionally omitted. */
export interface QueuedPhotoSummary {
  id: string;
  taskId: string;
  photoType: string;
  capturedAt: number;
  attempts: number;
  lastError?: string;
}

export function toSummary(item: QueuedPhoto): QueuedPhotoSummary {
  const { blob: _blob, ...summary } = item;
  void _blob;
  return summary;
}

/**
 * Backoff before a queued item is retried automatically. Manual retry ignores
 * this — a runner tapping "Retry now" has better information than a timer.
 */
const BACKOFF_MS = [0, 5_000, 30_000, 120_000, 600_000];

export function nextRetryAt(item: QueuedPhotoSummary): number {
  const step = Math.min(item.attempts, BACKOFF_MS.length - 1);
  return item.capturedAt + BACKOFF_MS[step];
}

/** Items due for an automatic retry. Pure — unit-tested without IndexedDB. */
export function selectRetryable(
  items: QueuedPhotoSummary[],
  now: number,
): QueuedPhotoSummary[] {
  return items.filter((item) => nextRetryAt(item) <= now);
}

export function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("taskId", "taskId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Queue write failed"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function enqueue(
  entry: Omit<QueuedPhoto, "id" | "capturedAt" | "attempts">,
): Promise<QueuedPhoto> {
  const item: QueuedPhoto = {
    ...entry,
    id: crypto.randomUUID(),
    capturedAt: Date.now(),
    attempts: 0,
  };
  await tx("readwrite", (store) => store.add(item));
  return item;
}

export async function listAll(): Promise<QueuedPhoto[]> {
  const items = await tx<QueuedPhoto[]>("readonly", (store) => store.getAll());
  return items.sort((a, b) => a.capturedAt - b.capturedAt);
}

export async function remove(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id));
}

export async function markAttempted(id: string, error: string): Promise<void> {
  const existing = await tx<QueuedPhoto | undefined>("readonly", (store) => store.get(id));
  if (!existing) return;
  await tx("readwrite", (store) =>
    store.put({ ...existing, attempts: existing.attempts + 1, lastError: error }),
  );
}
