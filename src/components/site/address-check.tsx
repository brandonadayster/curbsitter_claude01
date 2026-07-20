"use client";

import { useState } from "react";
import Link from "next/link";

interface EligibilityOutcome {
  checkId: string;
  result:
    | "active_available"
    | "active_review_required"
    | "waitlist"
    | "capacity_full"
    | "unavailable";
  message: string;
  routeCell: { name: string; slug: string; state: string } | null;
}

interface ApiErrorBody {
  error?: { message?: string; fieldErrors?: Record<string, string> };
}

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-base font-medium text-danger">
      {message}
    </p>
  );
}

export function AddressCheck({ referralCode }: { referralCode?: string }) {
  const [addressLine1, setAddressLine1] = useState("");
  const [unit, setUnit] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [outcome, setOutcome] = useState<EligibilityOutcome | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/eligibility/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressLine1,
          unit: unit || undefined,
          postalCode,
          referralCode: referralCode || undefined,
        }),
      });
      const data = (await response.json()) as EligibilityOutcome & ApiErrorBody;
      if (!response.ok) {
        setFieldErrors(data.error?.fieldErrors ?? {});
        setFormError(
          data.error?.fieldErrors
            ? "Please correct the highlighted fields."
            : (data.error?.message ?? "We couldn't check availability just now. Please try again."),
        );
        return;
      }
      setOutcome(data);
    } catch {
      setFormError("We couldn't check availability just now. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (outcome) {
    return (
      <div
        aria-live="polite"
        className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <h3 className="text-2xl font-bold">
          {outcome.result === "active_available"
            ? "Your address is on an active route"
            : outcome.result === "capacity_full"
              ? "Your route is at capacity"
              : outcome.result === "unavailable"
                ? "Not in our service area yet"
                : "Your route hasn't opened yet"}
        </h3>
        <p className="mt-3 text-lg text-muted">{outcome.message}</p>
        {outcome.result === "active_available" ? (
          <Link
            href={`/onboarding?check=${outcome.checkId}`}
            className="mt-6 inline-block rounded-lg bg-cyan px-6 py-3 text-lg font-semibold text-bg hover:bg-cyan-strong"
          >
            Continue to plans
          </Link>
        ) : (
          <WaitlistJoinForm
            eligibilityCheckId={outcome.checkId}
            referralCode={referralCode}
          />
        )}
        <button
          type="button"
          className="mt-4 block text-base text-muted underline hover:text-text"
          onClick={() => setOutcome(null)}
        >
          Check a different address
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
    >
      <h3 className="text-2xl font-bold">Is your address on a route?</h3>
      <p className="mt-2 text-base text-muted">
        We serve selected Prescott-area routes and open new ones as neighborhoods fill.
      </p>
      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="address-line1" className="mb-1 block text-base font-medium">
            Street address
          </label>
          <input
            id="address-line1"
            name="addressLine1"
            autoComplete="street-address"
            className={inputClasses}
            placeholder="123 Example Dr"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
          />
          <FieldError message={fieldErrors.addressLine1} />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="sm:w-1/2">
            <label htmlFor="address-unit" className="mb-1 block text-base font-medium">
              Unit <span className="text-muted">(optional)</span>
            </label>
            <input
              id="address-unit"
              name="unit"
              className={inputClasses}
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            />
          </div>
          <div className="sm:w-1/2">
            <label htmlFor="address-zip" className="mb-1 block text-base font-medium">
              ZIP code
            </label>
            <input
              id="address-zip"
              name="postalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              className={inputClasses}
              placeholder="86301"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
            <FieldError message={fieldErrors.postalCode} />
          </div>
        </div>
        {formError ? (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base font-medium text-danger">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg transition-colors hover:bg-cyan-strong disabled:opacity-60"
        >
          {pending ? "Checking…" : "Check My Address"}
        </button>
      </div>
    </form>
  );
}

export function WaitlistJoinForm({
  eligibilityCheckId,
  referralCode,
}: {
  eligibilityCheckId?: string;
  referralCode?: string;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [shareCode, setShareCode] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    setFieldErrors({});
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || undefined,
          postalCode: eligibilityCheckId ? undefined : postalCode || undefined,
          eligibilityCheckId,
          smsOptIn,
          marketingOptIn,
          referralCode: referralCode || undefined,
        }),
      });
      const data = (await response.json()) as { shareCode?: string } & ApiErrorBody;
      if (!response.ok) {
        setFieldErrors(data.error?.fieldErrors ?? {});
        setFormError(
          data.error?.fieldErrors
            ? "Please correct the highlighted fields."
            : (data.error?.message ?? "We couldn't save your spot just now. Please try again."),
        );
        return;
      }
      setShareCode(data.shareCode ?? null);
    } catch {
      setFormError("We couldn't save your spot just now. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (shareCode) {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/waitlist?ref=${shareCode}`;
    return (
      <div aria-live="polite" className="mt-6 rounded-xl border border-success/40 bg-success/10 p-5">
        <h4 className="text-xl font-bold">You&apos;re on the list.</h4>
        <p className="mt-2 text-base text-muted">
          We&apos;ll email you as your route opens. Neighbors joining on the same route help it
          open sooner — share your personal link:
        </p>
        <p className="mt-3 break-all rounded-lg bg-surface-2 px-4 py-3 font-mono text-base">{shareUrl}</p>
        <p className="mt-3 text-base text-muted">
          Referrals earn a $20 credit for you and your neighbor after their first paid service
          cycle is completed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-1/2">
          <label htmlFor="wl-name" className="mb-1 block text-base font-medium">
            Name
          </label>
          <input
            id="wl-name"
            autoComplete="name"
            className={inputClasses}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <FieldError message={fieldErrors.fullName} />
        </div>
        <div className="sm:w-1/2">
          <label htmlFor="wl-email" className="mb-1 block text-base font-medium">
            Email
          </label>
          <input
            id="wl-email"
            type="email"
            autoComplete="email"
            className={inputClasses}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-1/2">
          <label htmlFor="wl-phone" className="mb-1 block text-base font-medium">
            Mobile <span className="text-muted">(optional)</span>
          </label>
          <input
            id="wl-phone"
            type="tel"
            autoComplete="tel"
            className={inputClasses}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        {!eligibilityCheckId ? (
          <div className="sm:w-1/2">
            <label htmlFor="wl-zip" className="mb-1 block text-base font-medium">
              ZIP code
            </label>
            <input
              id="wl-zip"
              inputMode="numeric"
              autoComplete="postal-code"
              className={inputClasses}
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
            <FieldError message={fieldErrors.postalCode} />
          </div>
        ) : null}
      </div>
      <label className="flex items-start gap-3 text-base">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[var(--color-cyan)]"
          checked={smsOptIn}
          onChange={(event) => setSmsOptIn(event.target.checked)}
        />
        <span>
          Text me route updates. Message and data rates may apply; reply STOP to opt out. See{" "}
          <Link href="/sms-terms" className="underline">
            SMS terms
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-3 text-base">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[var(--color-cyan)]"
          checked={marketingOptIn}
          onChange={(event) => setMarketingOptIn(event.target.checked)}
        />
        <span>Email me occasional CurbSitter news beyond route updates.</span>
      </label>
      {formError ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base font-medium text-danger">
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg transition-colors hover:bg-cyan-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Join the Waitlist"}
      </button>
      <p className="text-base text-muted">
        By joining you agree to receive route-status emails. We never sell your information.
      </p>
    </form>
  );
}
