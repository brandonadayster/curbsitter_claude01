"use client";

import { useEffect, useState } from "react";

import { formatCents } from "@/config/business";
import {
  stage1Schema,
  stage2Schema,
  stage3Schema,
  WEEKDAYS,
  type Stage1,
} from "@/lib/onboarding-schemas";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

interface Quote {
  description: string;
  amountDueCents: number;
  recurrence: "monthly" | "quarterly" | "one_time";
  requiresAccessReview: boolean;
  binLimitOk: boolean;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; fieldErrors?: Record<string, string> };
}

function Err({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-base font-medium text-danger">
      {message}
    </p>
  );
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base font-medium text-danger">
      {message}
    </p>
  );
}

function zodErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const STAGE_TITLES = [
  "Where is the service?",
  "Who should we contact?",
  "How does the property work?",
  "Review and activate",
];

export function OnboardingFlow({
  eligibilityCheckId,
  existingToken,
}: {
  eligibilityCheckId?: string;
  existingToken?: string;
}) {
  const [stage, setStage] = useState(1);
  const [token, setToken] = useState<string | null>(existingToken ?? null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [billingUnavailable, setBillingUnavailable] = useState(false);

  // Stage 1
  const [addressLine1, setAddressLine1] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("Prescott");
  const [postalCode, setPostalCode] = useState("");
  const [forSomeoneElse, setForSomeoneElse] = useState(false);

  // Stage 2
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Stage 3
  const [serviceChoice, setServiceChoice] = useState<"home" | "complete" | "one_time_trash_day">("home");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "quarterly">("monthly");
  const [binCount, setBinCount] = useState(2);
  const [binTypes, setBinTypes] = useState<string[]>(["trash", "recycling"]);
  const [collectionProvider, setCollectionProvider] = useState("");
  const [collectionDay, setCollectionDay] = useState<number | null>(null);
  const [collectionDayUnsure, setCollectionDayUnsure] = useState(false);
  const [binStorageLocation, setBinStorageLocation] = useState("");
  const [curbPlacementNotes, setCurbPlacementNotes] = useState("");
  const [hazards, setHazards] = useState<string[]>([]);
  const [accessSecretNotes, setAccessSecretNotes] = useState("");

  // Stage 4
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptElectronicComms, setAcceptElectronicComms] = useState(false);
  const [acceptPhotoConsent, setAcceptPhotoConsent] = useState(false);

  // Resume an existing draft.
  useEffect(() => {
    if (!existingToken) return;
    fetch(`/api/onboarding/draft/${existingToken}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((draft) => {
        if (!draft) return;
        if (draft.stage1) {
          const s1 = draft.stage1 as Stage1;
          setAddressLine1(s1.addressLine1);
          setUnit(s1.unit ?? "");
          setCity(s1.city);
          setPostalCode(s1.postalCode);
          setForSomeoneElse(s1.forSomeoneElse);
        }
        if (draft.quote) setQuote(draft.quote as Quote);
        setStage(Math.min(draft.currentStage ?? 1, 4));
      })
      .catch(() => {
        // Draft fetch is best-effort; the form still works from stage 1.
      });
  }, [existingToken]);

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function submitStage1(event: React.FormEvent) {
    event.preventDefault();
    const parsed = stage1Schema.safeParse({ addressLine1, unit, city, postalCode, forSomeoneElse });
    if (!parsed.success) {
      setFieldErrors(zodErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setPending(true);
    setFormError("");
    try {
      const response = await fetch("/api/onboarding/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eligibilityCheckId, stage1: parsed.data }),
      });
      const data = (await response.json()) as { token?: string } & ApiErrorBody;
      if (!response.ok || !data.token) {
        setFormError(data.error?.message ?? "We couldn't save your progress. Please try again.");
        return;
      }
      setToken(data.token);
      setStage(2);
    } catch {
      setFormError("We couldn't save your progress. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function patchDraft(stageNumber: 2 | 3, data: unknown, nextStage: number) {
    setPending(true);
    setFormError("");
    try {
      const response = await fetch(`/api/onboarding/draft/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stageNumber, data }),
      });
      const body = (await response.json()) as { quote?: Quote } & ApiErrorBody;
      if (!response.ok) {
        setFieldErrors(body.error?.fieldErrors ?? {});
        setFormError(body.error?.message ?? "We couldn't save your progress. Please try again.");
        return;
      }
      if (body.quote) setQuote(body.quote);
      setStage(nextStage);
    } catch {
      setFormError("We couldn't save your progress. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function submitStage2(event: React.FormEvent) {
    event.preventDefault();
    const data = {
      payer: { fullName: payerName, email: payerEmail, phone: payerPhone },
      serviceRecipient: forSomeoneElse
        ? { fullName: recipientName, email: recipientEmail, phone: recipientPhone }
        : undefined,
      additionalNotificationEmails: [],
      smsOptIn,
      marketingOptIn,
      forSomeoneElse,
    };
    const parsed = stage2Schema.safeParse(data);
    if (!parsed.success) {
      setFieldErrors(zodErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    void patchDraft(2, parsed.data, 3);
  }

  function submitStage3(event: React.FormEvent) {
    event.preventDefault();
    const data = {
      serviceChoice,
      billingInterval,
      binCount,
      binTypes,
      collectionProvider,
      collectionDay: collectionDayUnsure ? null : collectionDay,
      collectionDayUnsure,
      binStorageLocation,
      curbPlacementNotes,
      hazards,
      accessSecretNotes,
    };
    const parsed = stage3Schema.safeParse(data);
    if (!parsed.success) {
      setFieldErrors(zodErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    void patchDraft(3, parsed.data, 4);
  }

  async function submitStage4(event: React.FormEvent) {
    event.preventDefault();
    if (!acceptTerms || !acceptElectronicComms || !acceptPhotoConsent) {
      setFormError("Please accept the required consents to continue.");
      return;
    }
    setPending(true);
    setFormError("");
    try {
      const response = await fetch("/api/onboarding/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          stage4: { acceptTerms, acceptElectronicComms, acceptPhotoConsent },
        }),
      });
      const data = (await response.json()) as { checkoutUrl?: string } & ApiErrorBody;
      if (!response.ok) {
        if (data.error?.code === "billing_unconfigured") {
          setBillingUnavailable(true);
          return;
        }
        setFormError(data.error?.message ?? "We couldn't start the payment step. Please try again.");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setFormError("We couldn't start the payment step. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <nav aria-label="Signup progress" className="mb-8">
        <ol className="flex items-center gap-2">
          {STAGE_TITLES.map((title, index) => {
            const stepNumber = index + 1;
            const isCurrent = stage === stepNumber;
            const isDone = stage > stepNumber;
            return (
              <li key={title} className="flex-1">
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={`h-2 rounded-full ${
                    isDone ? "bg-success" : isCurrent ? "bg-cyan" : "bg-surface-2"
                  }`}
                />
                <span className="sr-only">
                  Step {stepNumber}: {title} {isDone ? "(complete)" : isCurrent ? "(current)" : ""}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-base text-muted">
          Step {stage} of 4 — {STAGE_TITLES[stage - 1]}
        </p>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight">{STAGE_TITLES[stage - 1]}</h1>

      {stage === 1 ? (
        <form onSubmit={submitStage1} noValidate className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="ob-address" className="mb-1 block text-base font-medium">
              Service street address
            </label>
            <input id="ob-address" autoComplete="street-address" className={inputClasses} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <Err message={fieldErrors.addressLine1} />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="sm:w-1/3">
              <label htmlFor="ob-unit" className="mb-1 block text-base font-medium">
                Unit <span className="text-muted">(optional)</span>
              </label>
              <input id="ob-unit" className={inputClasses} value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="sm:w-1/3">
              <label htmlFor="ob-city" className="mb-1 block text-base font-medium">
                City
              </label>
              <input id="ob-city" className={inputClasses} value={city} onChange={(e) => setCity(e.target.value)} />
              <Err message={fieldErrors.city} />
            </div>
            <div className="sm:w-1/3">
              <label htmlFor="ob-zip" className="mb-1 block text-base font-medium">
                ZIP code
              </label>
              <input id="ob-zip" inputMode="numeric" className={inputClasses} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              <Err message={fieldErrors.postalCode} />
            </div>
          </div>
          <fieldset className="rounded-lg border border-border p-4">
            <legend className="px-1 text-base font-medium">Who is the service for?</legend>
            <label className="flex items-center gap-3 py-1 text-lg">
              <input type="radio" name="forWhom" className="h-5 w-5" checked={!forSomeoneElse} onChange={() => setForSomeoneElse(false)} />
              Myself
            </label>
            <label className="flex items-center gap-3 py-1 text-lg">
              <input type="radio" name="forWhom" className="h-5 w-5" checked={forSomeoneElse} onChange={() => setForSomeoneElse(true)} />
              Someone else (a parent, tenant, or my rental property)
            </label>
          </fieldset>
          <FormError message={formError} />
          <button type="submit" disabled={pending} className="rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
            {pending ? "Saving…" : "Continue"}
          </button>
        </form>
      ) : null}

      {stage === 2 ? (
        <form onSubmit={submitStage2} noValidate className="mt-6 flex flex-col gap-4">
          <h2 className="text-xl font-bold">Account owner / payer</h2>
          <div>
            <label htmlFor="ob-payer-name" className="mb-1 block text-base font-medium">Name</label>
            <input id="ob-payer-name" autoComplete="name" className={inputClasses} value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            <Err message={fieldErrors["payer.fullName"]} />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="sm:w-1/2">
              <label htmlFor="ob-payer-email" className="mb-1 block text-base font-medium">Email</label>
              <input id="ob-payer-email" type="email" autoComplete="email" className={inputClasses} value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />
              <Err message={fieldErrors["payer.email"]} />
            </div>
            <div className="sm:w-1/2">
              <label htmlFor="ob-payer-phone" className="mb-1 block text-base font-medium">
                Mobile <span className="text-muted">(optional unless texting)</span>
              </label>
              <input id="ob-payer-phone" type="tel" autoComplete="tel" className={inputClasses} value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
              <Err message={fieldErrors["payer.phone"]} />
            </div>
          </div>

          {forSomeoneElse ? (
            <>
              <h2 className="mt-2 text-xl font-bold">Service recipient at the property</h2>
              <div>
                <label htmlFor="ob-rec-name" className="mb-1 block text-base font-medium">Name</label>
                <input id="ob-rec-name" className={inputClasses} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                <Err message={fieldErrors["serviceRecipient.fullName"]} />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="sm:w-1/2">
                  <label htmlFor="ob-rec-email" className="mb-1 block text-base font-medium">Email</label>
                  <input id="ob-rec-email" type="email" className={inputClasses} value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
                  <Err message={fieldErrors["serviceRecipient.email"]} />
                </div>
                <div className="sm:w-1/2">
                  <label htmlFor="ob-rec-phone" className="mb-1 block text-base font-medium">
                    Phone <span className="text-muted">(optional)</span>
                  </label>
                  <input id="ob-rec-phone" type="tel" className={inputClasses} value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
                </div>
              </div>
            </>
          ) : null}

          <label className="flex items-start gap-3 text-base">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
            <span>Text me service updates (optional). Message and data rates may apply; reply STOP to opt out.</span>
          </label>
          <label className="flex items-start gap-3 text-base">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            <span>Email me occasional CurbSitter news beyond service updates (optional).</span>
          </label>

          <FormError message={formError} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStage(1)} className="rounded-lg border border-border px-6 py-3.5 text-lg font-semibold">
              Back
            </button>
            <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
              {pending ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      ) : null}

      {stage === 3 ? (
        <form onSubmit={submitStage3} noValidate className="mt-6 flex flex-col gap-5">
          <fieldset className="rounded-lg border border-border p-4">
            <legend className="px-1 text-base font-medium">Service</legend>
            {[
              { id: "home", label: "CurbSitter Home — $59/month or $159/quarter (up to 3 bins, one collection day)" },
              { id: "complete", label: "CurbSitter Complete — $89/month or $240/quarter (up to 6 bins, every collection day)" },
              { id: "one_time_trash_day", label: "One-Time Trash Day — $39 (up to 3 bins, single visit)" },
            ].map((option) => (
              <label key={option.id} className="flex items-start gap-3 py-1.5 text-lg">
                <input
                  type="radio"
                  name="serviceChoice"
                  className="mt-1.5 h-5 w-5"
                  checked={serviceChoice === option.id}
                  onChange={() => setServiceChoice(option.id as typeof serviceChoice)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {serviceChoice !== "one_time_trash_day" ? (
            <fieldset className="rounded-lg border border-border p-4">
              <legend className="px-1 text-base font-medium">Billing</legend>
              <label className="flex items-center gap-3 py-1 text-lg">
                <input type="radio" name="interval" className="h-5 w-5" checked={billingInterval === "monthly"} onChange={() => setBillingInterval("monthly")} />
                Monthly
              </label>
              <label className="flex items-center gap-3 py-1 text-lg">
                <input type="radio" name="interval" className="h-5 w-5" checked={billingInterval === "quarterly"} onChange={() => setBillingInterval("quarterly")} />
                Quarterly — discounted, prepaid by bank account (ACH)
              </label>
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="sm:w-1/2">
              <label htmlFor="ob-bin-count" className="mb-1 block text-base font-medium">How many bins?</label>
              <input id="ob-bin-count" type="number" min={1} max={6} className={inputClasses} value={binCount} onChange={(e) => setBinCount(Number(e.target.value))} />
              <Err message={fieldErrors.binCount} />
            </div>
            <fieldset className="sm:w-1/2">
              <legend className="mb-1 block text-base font-medium">Bin types</legend>
              <div className="flex flex-wrap gap-3 pt-2">
                {["trash", "recycling", "organics", "other"].map((type) => (
                  <label key={type} className="flex items-center gap-2 text-lg capitalize">
                    <input type="checkbox" className="h-5 w-5" checked={binTypes.includes(type)} onChange={() => toggle(binTypes, type, setBinTypes)} />
                    {type}
                  </label>
                ))}
              </div>
              <Err message={fieldErrors.binTypes} />
            </fieldset>
          </div>

          <div>
            <label htmlFor="ob-provider" className="mb-1 block text-base font-medium">
              Collection provider <span className="text-muted">(optional)</span>
            </label>
            <input id="ob-provider" className={inputClasses} placeholder="e.g., City of Prescott, Patriot Disposal" value={collectionProvider} onChange={(e) => setCollectionProvider(e.target.value)} />
          </div>

          <div>
            <label htmlFor="ob-day" className="mb-1 block text-base font-medium">Collection day</label>
            <select
              id="ob-day"
              className={inputClasses}
              disabled={collectionDayUnsure}
              value={collectionDay ?? ""}
              onChange={(e) => setCollectionDay(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">Select a day…</option>
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
            <label className="mt-2 flex items-center gap-3 text-base">
              <input type="checkbox" className="h-5 w-5" checked={collectionDayUnsure} onChange={(e) => setCollectionDayUnsure(e.target.checked)} />
              I&apos;m not sure — please verify it for me
            </label>
            <Err message={fieldErrors.collectionDay} />
          </div>

          <div>
            <label htmlFor="ob-storage" className="mb-1 block text-base font-medium">Where do the bins live?</label>
            <input id="ob-storage" className={inputClasses} placeholder="e.g., left side yard behind the wooden gate" value={binStorageLocation} onChange={(e) => setBinStorageLocation(e.target.value)} />
            <Err message={fieldErrors.binStorageLocation} />
          </div>

          <div>
            <label htmlFor="ob-curb" className="mb-1 block text-base font-medium">
              Curb placement notes <span className="text-muted">(optional)</span>
            </label>
            <input id="ob-curb" className={inputClasses} placeholder="e.g., right of the driveway, away from the mailbox" value={curbPlacementNotes} onChange={(e) => setCurbPlacementNotes(e.target.value)} />
          </div>

          <fieldset className="rounded-lg border border-border p-4">
            <legend className="px-1 text-base font-medium">Anything we should plan for?</legend>
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              {[
                ["long_driveway", "Long driveway"],
                ["steep_grade", "Steep grade"],
                ["stairs", "Stairs"],
                ["gate", "Gate"],
                ["garage", "Bins in garage"],
                ["animal", "Dog or other animals"],
                ["poor_lighting", "Poor lighting"],
                ["ice", "Winter ice"],
                ["access_restriction", "Restricted entry"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 text-lg">
                  <input type="checkbox" className="h-5 w-5" checked={hazards.includes(value)} onChange={() => toggle(hazards, value, setHazards)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="ob-access" className="mb-1 block text-base font-medium">
              Gate/garage access details <span className="text-muted">(optional)</span>
            </label>
            <textarea id="ob-access" rows={3} className={inputClasses} placeholder="Codes or key details needed to reach the bins" value={accessSecretNotes} onChange={(e) => setAccessSecretNotes(e.target.value)} />
            <p className="mt-1 text-base text-muted">
              Stored encrypted and shown only to your assigned runner during the service window —
              never in emails or texts.
            </p>
          </div>

          <FormError message={formError} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setStage(2)} className="rounded-lg border border-border px-6 py-3.5 text-lg font-semibold">
              Back
            </button>
            <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
              {pending ? "Saving…" : "Review"}
            </button>
          </div>
        </form>
      ) : null}

      {stage === 4 ? (
        billingUnavailable ? (
          <div aria-live="polite" className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-6">
            <h2 className="text-2xl font-bold">Almost there — we&apos;ll finish by email</h2>
            <p className="mt-2 text-lg text-muted">
              Online payment isn&apos;t available in this environment yet. Your details are
              saved, and we&apos;ll follow up at your email address to complete setup and
              payment. Nothing is charged until then.
            </p>
          </div>
        ) : (
          <form onSubmit={submitStage4} noValidate className="mt-6 flex flex-col gap-5">
            {quote ? (
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h2 className="text-xl font-bold">Your order</h2>
                <p className="mt-2 text-lg">{quote.description}</p>
                <p className="mt-1 text-3xl font-bold">
                  {formatCents(quote.amountDueCents)}
                  <span className="text-lg font-normal text-muted">
                    {quote.recurrence === "one_time"
                      ? " one-time"
                      : quote.recurrence === "monthly"
                        ? "/month, renews monthly"
                        : "/quarter, prepaid by ACH, renews every 3 months"}
                  </span>
                </p>
                {!quote.binLimitOk ? (
                  <p role="alert" className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-base font-medium text-danger">
                    Your bin count exceeds this plan&apos;s limit — go back and adjust the plan
                    or bin count.
                  </p>
                ) : null}
                {quote.requiresAccessReview ? (
                  <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base text-warning">
                    Your property access needs a quick review before first service. If anything
                    changes the price, we&apos;ll show you first — no surprise charges.
                  </p>
                ) : null}
                <p className="mt-3 text-base text-muted">
                  Rollout the evening before collection (5–10 p.m.), return after collection.
                  After payment your account is <strong>pending property and route review</strong>{" "}
                  before the first service is scheduled.
                </p>
              </div>
            ) : null}

            <label className="flex items-start gap-3 text-base">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
              <span>
                I agree to the <a href="/terms" className="underline" target="_blank">Terms of Service</a> and{" "}
                <a href="/privacy" className="underline" target="_blank">Privacy Policy</a>.
              </span>
            </label>
            <label className="flex items-start gap-3 text-base">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={acceptElectronicComms} onChange={(e) => setAcceptElectronicComms(e.target.checked)} />
              <span>I agree to receive service communications electronically.</span>
            </label>
            <label className="flex items-start gap-3 text-base">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={acceptPhotoConsent} onChange={(e) => setAcceptPhotoConsent(e.target.checked)} />
              <span>
                I consent to service-verification photos of my bins and their placement (stored
                privately).
              </span>
            </label>

            <FormError message={formError} />
            <div className="flex gap-3">
              <button type="button" onClick={() => setStage(3)} className="rounded-lg border border-border px-6 py-3.5 text-lg font-semibold">
                Back
              </button>
              <button type="submit" disabled={pending || (quote !== null && !quote.binLimitOk)} className="flex-1 rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
                {pending ? "Starting payment…" : "Continue to Payment"}
              </button>
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}
