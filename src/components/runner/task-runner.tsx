"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskView {
  id: string;
  taskType: string;
  status: string;
  address: string;
  storageLocation: string | null;
  curbNotes: string | null;
  generalNotes: string | null;
  hazards: Array<{ type: string; severity: string; notes: string | null }>;
  bins: string[];
  photos: Array<{ id: string; type: string }>;
}

const EXCEPTION_TYPES = [
  ["access_blocked", "Access blocked"],
  ["bin_missing", "Bin missing / not found"],
  ["bin_blocked", "Bin blocked"],
  ["hauler_missed", "Hauler didn't collect"],
  ["partial_collection", "Partial collection"],
  ["unsafe_condition", "Unsafe condition"],
  ["weather", "Weather"],
  ["animal", "Animal hazard"],
  ["overweight_or_contaminated", "Overweight / contaminated"],
  ["damage", "Damage found"],
  ["schedule_mismatch", "Address or schedule mismatch"],
  ["other", "Other"],
] as const;

export function TaskRunner({ task }: { task: TaskView }) {
  const router = useRouter();
  const [status, setStatus] = useState(task.status);
  const [photos, setPhotos] = useState(task.photos);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<string | null>(null);
  const [accessShown, setAccessShown] = useState(false);
  const [showException, setShowException] = useState(false);
  const [exceptionType, setExceptionType] = useState("access_blocked");
  const [exceptionNote, setExceptionNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  const proofType = task.taskType === "rollout" ? "rollout_proof" : "return_proof";
  const requiresProof = task.taskType === "rollout" || task.taskType === "return";
  const hasProof = photos.some((photo) => photo.type === proofType);
  const terminal = status === "completed" || status === "cancelled" || status === "exception";

  async function transition(
    to: string,
    extra: Record<string, unknown> = {},
  ): Promise<boolean> {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/runner/tasks/${task.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, ...extra }),
      });
      const data = (await response.json()) as {
        status?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(data.error?.message ?? "Couldn't update the task. Try again.");
        return false;
      }
      setStatus(data.status ?? to);
      return true;
    } catch {
      setError("No connection. Your work is safe — try again when signal returns.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("photoType", proofType);
      form.set("file", file);
      const response = await fetch(`/api/runner/tasks/${task.id}/photo`, {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { photoId?: string; error?: { message?: string } };
      if (!response.ok || !data.photoId) {
        setError(data.error?.message ?? "The photo didn't upload. Try again.");
        return;
      }
      setPhotos((current) => [...current, { id: data.photoId!, type: proofType }]);
    } catch {
      setError("No connection. The photo stays on your device — try again when signal returns.");
    } finally {
      setUploading(false);
    }
  }

  async function revealAccess() {
    setError("");
    try {
      const response = await fetch(`/api/runner/tasks/${task.id}/access`, { method: "POST" });
      const data = (await response.json()) as { access?: string | null; error?: { message?: string } };
      if (!response.ok) {
        setError(data.error?.message ?? "Access details unavailable.");
        return;
      }
      setAccess(data.access ?? null);
      setAccessShown(true);
    } catch {
      setError("No connection — access details unavailable.");
    }
  }

  return (
    <div>
      <Link href="/runner" className="text-base text-muted underline">
        ← My route
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        {task.taskType === "rollout"
          ? "Roll out bins"
          : task.taskType === "recheck"
            ? "Recheck: collection & return"
            : "Return bins"}
      </h1>
      <p className="mt-1 text-xl">{task.address}</p>
      <p className="mt-2 text-lg">
        <span
          className={`rounded-full border px-3 py-1 font-medium ${
            status === "completed"
              ? "border-success/60 text-success"
              : status === "exception"
                ? "border-warning/60 text-warning"
                : "border-cyan/50 text-cyan"
          }`}
        >
          {status.replace(/_/g, " ")}
        </span>
      </p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-bold">Property notes</h2>
        <dl className="mt-2 space-y-1 text-lg">
          <div>
            <dt className="inline text-muted">Bins: </dt>
            <dd className="inline">{task.bins.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Storage: </dt>
            <dd className="inline">{task.storageLocation ?? "—"}</dd>
          </div>
          <div>
            <dt className="inline text-muted">Curb placement: </dt>
            <dd className="inline">{task.curbNotes ?? "standard placement"}</dd>
          </div>
          {task.generalNotes ? (
            <div>
              <dt className="inline text-muted">Notes: </dt>
              <dd className="inline">{task.generalNotes}</dd>
            </div>
          ) : null}
        </dl>
        {task.hazards.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {task.hazards.map((hazard) => (
              <li key={hazard.type} className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-base">
                ⚠ {hazard.type.replace(/_/g, " ")}
                {hazard.notes ? ` — ${hazard.notes}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {!accessShown ? (
          <button
            type="button"
            onClick={revealAccess}
            className="mt-4 rounded-lg border border-border px-4 py-2.5 text-base font-semibold hover:border-cyan/60"
          >
            Reveal access details
          </button>
        ) : (
          <p className="mt-4 rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-lg">
            {access ?? "No access details on file for this property."}
          </p>
        )}
      </section>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-lg font-medium text-danger">
          {error}
        </p>
      ) : null}

      {!terminal ? (
        <div className="mt-6 flex flex-col gap-3">
          {status === "assigned" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => transition("en_route")}
              className="rounded-xl bg-cyan px-6 py-4 text-xl font-bold text-bg disabled:opacity-60"
            >
              Start driving
            </button>
          ) : null}
          {(status === "assigned" || status === "en_route") ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => transition("arrived")}
              className="rounded-xl bg-cyan px-6 py-4 text-xl font-bold text-bg disabled:opacity-60"
            >
              I&apos;ve arrived
            </button>
          ) : null}

          {status === "arrived" ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border-2 border-cyan px-6 py-4 text-xl font-bold text-cyan disabled:opacity-60"
              >
                {uploading ? "Uploading…" : hasProof ? "Add another photo" : "Take proof photo"}
              </button>
              {hasProof ? (
                <p className="text-lg text-success">✓ Proof photo uploaded</p>
              ) : requiresProof ? (
                <p className="text-base text-muted">
                  A proof photo is required before you can complete this stop.
                </p>
              ) : (
                <p className="text-base text-muted">
                  Photos are optional for this check — add one if it helps document the outcome.
                </p>
              )}
              <button
                type="button"
                disabled={pending || (requiresProof && !hasProof)}
                onClick={async () => {
                  const ok = await transition("completed", { idempotencyKey });
                  if (ok) router.push("/runner");
                }}
                className="rounded-xl bg-success px-6 py-4 text-xl font-bold text-bg disabled:opacity-50"
              >
                Complete stop
              </button>
            </>
          ) : null}

          {!showException ? (
            <button
              type="button"
              onClick={() => setShowException(true)}
              className="rounded-xl border border-warning/60 px-6 py-3.5 text-lg font-semibold text-warning"
            >
              Report a problem
            </button>
          ) : (
            <div className="rounded-2xl border border-warning/40 bg-surface p-5">
              <h2 className="text-lg font-bold">What&apos;s wrong?</h2>
              <label htmlFor="exception-type" className="sr-only">
                Exception type
              </label>
              <select
                id="exception-type"
                className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-3 text-lg"
                value={exceptionType}
                onChange={(event) => setExceptionType(event.target.value)}
              >
                {EXCEPTION_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label htmlFor="exception-note" className="sr-only">
                Details
              </label>
              <textarea
                id="exception-note"
                rows={3}
                placeholder="What happened? (customer will see this)"
                className="mt-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-3 text-lg"
                value={exceptionNote}
                onChange={(event) => setExceptionNote(event.target.value)}
              />
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowException(false)}
                  className="rounded-lg border border-border px-5 py-3 text-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={async () => {
                    const ok = await transition("exception", {
                      exceptionType,
                      exceptionDescription: exceptionNote,
                    });
                    if (ok) router.push("/runner");
                  }}
                  className="flex-1 rounded-lg bg-warning px-5 py-3 text-lg font-bold text-bg disabled:opacity-60"
                >
                  Submit exception
                </button>
              </div>
              <p className="mt-3 text-base text-muted">
                Unsafe conditions? Stop work. Safety outranks the route clock — no metric
                penalizes a good-faith safety stop.
              </p>
            </div>
          )}
        </div>
      ) : status === "completed" ? (
        <p className="mt-6 rounded-2xl border border-success/40 bg-success/10 p-5 text-xl">
          ✓ Stop complete. Nice work.
        </p>
      ) : (
        <p className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-5 text-xl">
          Exception recorded — dispatch will follow up.
        </p>
      )}
    </div>
  );
}
