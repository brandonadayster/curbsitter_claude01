"use client";

import { useState } from "react";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

export function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, topic, message }),
      });
      const data = (await response.json()) as {
        error?: { message?: string; fieldErrors?: Record<string, string> };
      };
      if (!response.ok) {
        setFieldErrors(data.error?.fieldErrors ?? {});
        setFormError(
          data.error?.fieldErrors
            ? "Please correct the highlighted fields."
            : (data.error?.message ?? "We couldn't send your message just now. Please try again."),
        );
        return;
      }
      setSent(true);
    } catch {
      setFormError("We couldn't send your message just now. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div aria-live="polite" className="rounded-2xl border border-success/40 bg-success/10 p-6">
        <h2 className="text-2xl font-bold">Message received.</h2>
        <p className="mt-2 text-lg text-muted">
          Thanks — we&apos;ll reply to {email} as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-1/2">
          <label htmlFor="ct-name" className="mb-1 block text-base font-medium">
            Name
          </label>
          <input
            id="ct-name"
            autoComplete="name"
            className={inputClasses}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          {fieldErrors.fullName ? (
            <p role="alert" className="mt-1 text-base font-medium text-danger">
              {fieldErrors.fullName}
            </p>
          ) : null}
        </div>
        <div className="sm:w-1/2">
          <label htmlFor="ct-email" className="mb-1 block text-base font-medium">
            Email
          </label>
          <input
            id="ct-email"
            type="email"
            autoComplete="email"
            className={inputClasses}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldErrors.email ? (
            <p role="alert" className="mt-1 text-base font-medium text-danger">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <label htmlFor="ct-topic" className="mb-1 block text-base font-medium">
          Topic
        </label>
        <select
          id="ct-topic"
          className={inputClasses}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          <option value="general">General question</option>
          <option value="service">My service</option>
          <option value="hoa">HOA / community proposal</option>
          <option value="portfolio">Property manager / portfolio</option>
          <option value="bulk">Bulk pickup coordination</option>
        </select>
      </div>
      <div>
        <label htmlFor="ct-message" className="mb-1 block text-base font-medium">
          Message
        </label>
        <textarea
          id="ct-message"
          rows={5}
          className={inputClasses}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {fieldErrors.message ? (
          <p role="alert" className="mt-1 text-base font-medium text-danger">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>
      {formError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg transition-colors hover:bg-cyan-strong disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
