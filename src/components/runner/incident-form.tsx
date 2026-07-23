"use client";

import { useState } from "react";
import Link from "next/link";

export function IncidentForm() {
  const [severity, setSeverity] = useState("normal");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/runner/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity, description }),
      });
      const data = (await response.json()) as { incidentId?: string; error?: { message?: string } };
      if (!response.ok) {
        setError(data.error?.message ?? "The report didn't save. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("No connection. If anyone is in danger, call dispatch or 911 first.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div aria-live="polite" className="rounded-2xl border border-success/40 bg-success/10 p-6">
        <h1 className="text-2xl font-bold">Incident reported</h1>
        <p className="mt-2 text-lg text-muted">
          Dispatch can see it now. Thank you for stopping and reporting — safety outranks the
          route clock, always.
        </p>
        <Link href="/runner" className="mt-4 inline-block text-lg text-cyan underline">
          Back to my route
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Link href="/runner" className="text-base text-muted underline">
        ← My route
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Report a safety incident</h1>
      <p className="mt-2 text-lg text-muted">
        Injury, property damage, aggressive animal, unsafe conditions — anything dispatch should
        know about. If anyone is in immediate danger, call 911 first.
      </p>

      <fieldset className="mt-6 rounded-lg border border-border p-4">
        <legend className="px-1 text-base font-medium">How serious?</legend>
        {[
          ["normal", "Worth knowing — no one hurt, nothing damaged"],
          ["high", "Serious — near miss, damage, or hazard that will recur"],
          ["critical", "Critical — injury, major damage, or active danger"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-start gap-3 py-1.5 text-lg">
            <input
              type="radio"
              name="severity"
              className="mt-1.5 h-5 w-5"
              checked={severity === value}
              onChange={() => setSeverity(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <label htmlFor="incident-description" className="mt-5 block text-base font-medium">
        What happened?
      </label>
      <textarea
        id="incident-description"
        rows={5}
        className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-lg font-medium text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-xl bg-warning px-6 py-4 text-xl font-bold text-bg disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
