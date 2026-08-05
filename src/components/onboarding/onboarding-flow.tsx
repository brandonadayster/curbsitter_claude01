"use client";

import { useEffect, useState } from "react";

import { PersonaPanel } from "@/components/onboarding/persona-panel";
import { formatCents, ONE_TIME, PLANS, quarterlyMonthlyEquivalentCents } from "@/config/business";
import {
  stage1Schema,
  stage2Schema,
  stage3Schema,
  WEEKDAYS,
  type Stage1,
} from "@/lib/onboarding-schemas";
import {
  PROPERTY_TYPE_OPTIONS,
  resolvePersona,
  SERVING_WHO_OPTIONS,
  type PropertyType,
  type ServingWho,
} from "@/lib/personas";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

/** Click-to-answer control. A real button: keyboard-operable, 44px+ target. */
function Choice({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-[44px] rounded-lg border px-4 py-3 text-left text-lg transition-colors ${
        selected ? "border-cyan bg-cyan/10 font-semibold" : "border-border bg-surface-2 hover:border-cyan/60"
      }`}
    >
      {children}
    </button>
  );
}

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

type ServiceChoice = "home" | "complete" | "one_time_trash_day";

/**
 * D-025 collection-day check state. `mismatch` holds the flow on the
 * trash-day question until the customer picks a resolution; `geocode_failed`
 * blocks entirely (no address to verify against). `no_zone_data` — the
 * property isn't on City service, most likely a private hauler — is the
 * common, unremarkable case and advances silently. `city_resolved` fills in
 * the day for a customer who didn't know it; `unsure_no_data` means nobody
 * knows it yet, so an admin confirms it before the first pickup.
 */
type DayCheckState =
  | "idle"
  | "checking"
  | "match"
  | "mismatch"
  | "no_zone_data"
  | "city_resolved"
  | "unsure_no_data"
  | "geocode_failed";

type ProviderKind = "city" | "private" | "unsure";

type Step3 =
  | "plan"
  | "billing"
  | "hasBoth"
  | "trashCount"
  | "recyclingCount"
  | "trashDay"
  | "sameDay"
  | "recyclingDay"
  | "provider"
  | "hazards"
  | "storage"
  | "curbNotes"
  | "access";

/**
 * The stage-3 question sequence for a given set of answers. Pure, and computed
 * from *next* answers inside click handlers, so advancing never races the
 * state update that just changed which questions apply.
 */
function buildStage3Steps(a: {
  serviceChoice: ServiceChoice;
  hasBothBinTypes: boolean | null;
  sameDayCollection: boolean | null;
  hazards: string[];
}): Step3[] {
  const steps: Step3[] = ["plan"];
  if (a.serviceChoice !== "one_time_trash_day") steps.push("billing");
  steps.push("hasBoth");
  steps.push("trashCount");
  if (a.hasBothBinTypes) steps.push("recyclingCount");
  // Provider comes before the day questions: knowing the hauler up front
  // lets a private-hauler property skip the City cross-check entirely
  // rather than be shown a conflict about a hauler that isn't theirs.
  steps.push("provider");
  steps.push("trashDay");
  if (a.hasBothBinTypes) steps.push("sameDay");
  if (a.hasBothBinTypes && a.sameDayCollection === false) steps.push("recyclingDay");
  steps.push("hazards", "storage", "curbNotes");
  if (a.hazards.includes("gate") || a.hazards.includes("garage")) steps.push("access");
  return steps;
}

/** Weekday picker shared by the trash and recycling day questions. */
function DayPicker({
  day,
  unsure,
  onPick,
  onUnsure,
}: {
  day: number | null;
  unsure: boolean;
  onPick: (value: number) => void;
  onUnsure: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {WEEKDAYS.map((label, index) => (
        <Choice key={label} selected={!unsure && day === index} onClick={() => onPick(index)}>
          {label}
        </Choice>
      ))}
      <Choice selected={unsure} onClick={onUnsure}>
        I&apos;m not sure — verify it for me
      </Choice>
    </div>
  );
}

function CountPicker({
  value,
  max,
  min,
  onPick,
}: {
  value: number;
  max: number;
  min: number;
  onPick: (n: number) => void;
}) {
  const options = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((n) => (
        <Choice key={n} selected={value === n} onClick={() => onPick(n)}>
          <span className="inline-block min-w-[2ch] text-center">{n}</span>
        </Choice>
      ))}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[44px] rounded-lg border border-border px-6 py-3 text-lg font-semibold"
    >
      Back
    </button>
  );
}

function ContinueBar({
  onBack,
  onContinue,
  pending,
  label = "Continue",
}: {
  onBack: () => void;
  onContinue: () => void;
  pending: boolean;
  label?: string;
}) {
  return (
    <div className="mt-6 flex gap-3">
      <BackButton onClick={onBack} />
      <button
        type="button"
        onClick={onContinue}
        disabled={pending}
        className="min-h-[44px] flex-1 rounded-lg bg-cyan px-6 py-3 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

const STORAGE_PRESETS = ["Side yard", "In the garage", "Behind the gate", "Next to the driveway"];

const HAZARD_OPTIONS: Array<[string, string]> = [
  ["long_driveway", "Long driveway"],
  ["steep_grade", "Steep grade"],
  ["stairs", "Stairs"],
  ["gate", "Gate"],
  ["garage", "Bins in garage"],
  ["animal", "Dog or other animals"],
  ["poor_lighting", "Poor lighting"],
  ["ice", "Winter ice"],
  ["access_restriction", "Restricted entry"],
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
  const [servingWho, setServingWho] = useState<ServingWho | null>(null);
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);

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
  const [stage3Step, setStage3Step] = useState<Step3>("plan");
  const [serviceChoice, setServiceChoice] = useState<ServiceChoice>("home");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "quarterly">("monthly");
  const [hasBothBinTypes, setHasBothBinTypes] = useState<boolean | null>(null);
  const [trashBinCount, setTrashBinCount] = useState(1);
  const [recyclingBinCount, setRecyclingBinCount] = useState(0);
  const [collectionProviderKind, setCollectionProviderKind] = useState<ProviderKind | null>(null);
  const [collectionProvider, setCollectionProvider] = useState("");
  const [collectionDay, setCollectionDay] = useState<number | null>(null);
  const [collectionDayUnsure, setCollectionDayUnsure] = useState(false);
  const [sameDayCollection, setSameDayCollection] = useState<boolean | null>(null);
  const [recyclingCollectionDay, setRecyclingCollectionDay] = useState<number | null>(null);
  const [recyclingCollectionDayUnsure, setRecyclingCollectionDayUnsure] = useState(false);
  const [binStorageLocation, setBinStorageLocation] = useState("");
  const [curbPlacementNotes, setCurbPlacementNotes] = useState("");
  const [hazards, setHazards] = useState<string[]>([]);
  const [accessSecretNotes, setAccessSecretNotes] = useState("");
  // D-025: City-of-Prescott collection-day cross-check.
  const [dayCheck, setDayCheck] = useState<DayCheckState>("idle");
  const [cityWeekday, setCityWeekday] = useState<number | null>(null);

  // Stage 4
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptElectronicComms, setAcceptElectronicComms] = useState(false);
  const [acceptPhotoConsent, setAcceptPhotoConsent] = useState(false);

  const forSomeoneElse = servingWho !== null && servingWho !== "myself";
  const persona = resolvePersona(servingWho, propertyType);
  const binCap =
    serviceChoice === "one_time_trash_day" ? ONE_TIME.trashDayIncludedBins : PLANS[serviceChoice].maxBins;

  const steps3 = buildStage3Steps({ serviceChoice, hasBothBinTypes, sameDayCollection, hazards });
  const step3Index = Math.max(0, steps3.indexOf(stage3Step));

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
          setServingWho(s1.servingWho);
          setPropertyType(s1.propertyType);
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

  /** Move to the question after `from`, given the answers as they now stand. */
  function advance(
    from: Step3,
    overrides: Partial<{
      serviceChoice: ServiceChoice;
      hasBothBinTypes: boolean | null;
      sameDayCollection: boolean | null;
      hazards: string[];
    }> = {},
  ) {
    const next = buildStage3Steps({
      serviceChoice,
      hasBothBinTypes,
      sameDayCollection,
      hazards,
      ...overrides,
    });
    const index = next.indexOf(from);
    setStage3Step(next[Math.min(index + 1, next.length - 1)]);
  }

  function back3() {
    const index = steps3.indexOf(stage3Step);
    if (index <= 0) {
      setStage(2);
      return;
    }
    setStage3Step(steps3[index - 1]);
  }

  /**
   * D-025: cross-check the picked trash day against the City's cached route
   * zones. Only a real conflict holds the flow — a property outside the
   * City's zones (private hauler) or an unreachable check advances the same
   * as before, since neither means the customer answered wrong.
   */
  async function runDayCheck(weekday: number) {
    // A private hauler sets its own schedule, which the City's route data
    // says nothing about — checking would only produce a conflict about a
    // hauler that isn't theirs.
    if (!token || collectionProviderKind === "private") {
      advance("trashDay");
      return;
    }
    setDayCheck("checking");
    try {
      const response = await fetch(`/api/onboarding/draft/${token}/collection-day-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekday }),
      });
      if (!response.ok) {
        setDayCheck("idle");
        advance("trashDay");
        return;
      }
      const data = (await response.json()) as { outcome: DayCheckState; cityWeekday: number | null };
      setCityWeekday(data.cityWeekday);
      setDayCheck(data.outcome);
      if (data.outcome === "mismatch" || data.outcome === "geocode_failed") return;
      advance("trashDay");
    } catch {
      // Verification is an enhancement, not a gate — a failed call must
      // never strand a paying customer mid-signup.
      setDayCheck("idle");
      advance("trashDay");
    }
  }

  /**
   * "I'm not sure" — ask the City rather than giving up on the answer. A
   * City record settles the day outright; without one, the signup still
   * proceeds and an admin confirms the day before the first pickup.
   */
  async function runUnsureCheck() {
    setCollectionDayUnsure(true);
    setCollectionDay(null);

    // A private hauler sets its own schedule, so City data can't answer this.
    if (!token || collectionProviderKind === "private") {
      setDayCheck("unsure_no_data");
      advance("trashDay");
      return;
    }

    setDayCheck("checking");
    try {
      const response = await fetch(`/api/onboarding/draft/${token}/collection-day-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setDayCheck("unsure_no_data");
        advance("trashDay");
        return;
      }
      const data = (await response.json()) as { outcome: DayCheckState; cityWeekday: number | null };
      setCityWeekday(data.cityWeekday);
      setDayCheck(data.outcome);
      if (data.outcome === "geocode_failed") return;
      if (data.outcome === "city_resolved" && data.cityWeekday !== null) {
        setCollectionDay(data.cityWeekday);
        setCollectionDayUnsure(false);
      }
      advance("trashDay");
    } catch {
      // Verification is an enhancement, not a gate.
      setDayCheck("unsure_no_data");
      advance("trashDay");
    }
  }

  /** "No, it's my day" — record the override, then continue. */
  async function confirmDayMismatch() {
    if (token) {
      try {
        await fetch(`/api/onboarding/draft/${token}/collection-day-check`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true }),
        });
      } catch {
        // Best-effort: the draft keeps the unresolved `mismatch`, which
        // finalize already treats as needing review.
      }
    }
    setDayCheck("idle");
    advance("trashDay");
  }

  async function submitStage1(event: React.FormEvent) {
    event.preventDefault();
    const parsed = stage1Schema.safeParse({
      addressLine1,
      unit,
      city,
      postalCode,
      servingWho,
      propertyType,
    });
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

  function submitStage3() {
    const data = {
      serviceChoice,
      billingInterval,
      hasBothBinTypes: hasBothBinTypes ?? false,
      trashBinCount,
      recyclingBinCount: hasBothBinTypes ? recyclingBinCount : 0,
      collectionProviderKind,
      collectionProvider,
      collectionDay: collectionDayUnsure ? null : collectionDay,
      collectionDayUnsure,
      sameDayCollection: hasBothBinTypes ? sameDayCollection : null,
      recyclingCollectionDay: recyclingCollectionDayUnsure ? null : recyclingCollectionDay,
      recyclingCollectionDayUnsure,
      binStorageLocation,
      curbPlacementNotes,
      hazards,
      accessSecretNotes,
    };
    const parsed = stage3Schema.safeParse(data);
    if (!parsed.success) {
      setFieldErrors(zodErrors(parsed.error.issues));
      setFormError("Please check your answers — something needed above is missing.");
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

  const stepNav = (
    <div className="mt-6 flex gap-3">
      <BackButton onClick={back3} />
    </div>
  );

  const isLastStep3 = steps3.indexOf(stage3Step) === steps3.length - 1;
  const continueOrSubmit = (from: Step3) => () => (isLastStep3 ? submitStage3() : advance(from));

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
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
          <form onSubmit={submitStage1} noValidate className="mt-6 flex flex-col gap-5">
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

            <fieldset>
              <legend className="mb-2 text-base font-medium">Who is this service for?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {SERVING_WHO_OPTIONS.map((option) => (
                  <Choice
                    key={option.value}
                    selected={servingWho === option.value}
                    onClick={() => setServingWho(option.value)}
                  >
                    {option.label}
                  </Choice>
                ))}
              </div>
              <Err message={fieldErrors.servingWho} />
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-base font-medium">What kind of property is it?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <Choice
                    key={option.value}
                    selected={propertyType === option.value}
                    onClick={() => setPropertyType(option.value)}
                  >
                    {option.label}
                  </Choice>
                ))}
              </div>
              <Err message={fieldErrors.propertyType} />
            </fieldset>

            <FormError message={formError} />
            <button type="submit" disabled={pending} className="min-h-[44px] rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
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
              <button type="button" onClick={() => setStage(1)} className="min-h-[44px] rounded-lg border border-border px-6 py-3.5 text-lg font-semibold">
                Back
              </button>
              <button type="submit" disabled={pending} className="min-h-[44px] flex-1 rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
                {pending ? "Saving…" : "Continue"}
              </button>
            </div>
          </form>
        ) : null}

        {stage === 3 ? (
          <div className="mt-6">
            <p aria-live="polite" className="text-base text-muted">
              Question {step3Index + 1} of {steps3.length}
            </p>

            {stage3Step === "plan" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Which service do you want?</h2>
                <div className="mt-4 grid gap-3">
                  {(
                    [
                      ["home", `${PLANS.home.publicName} — ${formatCents(PLANS.home.monthlyPriceCents)}/month, or ${formatCents(quarterlyMonthlyEquivalentCents("home"))}/month billed quarterly (up to ${PLANS.home.maxBins} bins, one collection day)`],
                      ["complete", `${PLANS.complete.publicName} — ${formatCents(PLANS.complete.monthlyPriceCents)}/month, or ${formatCents(quarterlyMonthlyEquivalentCents("complete"))}/month billed quarterly (up to ${PLANS.complete.maxBins} bins, every collection day)`],
                      ["one_time_trash_day", `${ONE_TIME.trashDayPublicName} — ${formatCents(ONE_TIME.trashDayPriceCents)} per service (up to ${ONE_TIME.trashDayIncludedBins} bins, single visit)`],
                    ] as Array<[ServiceChoice, string]>
                  ).map(([value, label]) => (
                    <Choice
                      key={value}
                      selected={serviceChoice === value}
                      onClick={() => {
                        setServiceChoice(value);
                        advance("plan", { serviceChoice: value });
                      }}
                    >
                      {label}
                    </Choice>
                  ))}
                </div>
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "billing" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">How would you like to be billed?</h2>
                <div className="mt-4 grid gap-3">
                  <Choice
                    selected={billingInterval === "monthly"}
                    onClick={() => {
                      setBillingInterval("monthly");
                      advance("billing");
                    }}
                  >
                    Monthly
                  </Choice>
                  <Choice
                    selected={billingInterval === "quarterly"}
                    onClick={() => {
                      setBillingInterval("quarterly");
                      advance("billing");
                    }}
                  >
                    Quarterly — discounted, prepaid every 3 months (card or bank/ACH)
                  </Choice>
                </div>
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "hasBoth" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Do you have both trash and recycling bins?</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Choice
                    selected={hasBothBinTypes === true}
                    onClick={() => {
                      setHasBothBinTypes(true);
                      if (recyclingBinCount === 0) setRecyclingBinCount(1);
                      advance("hasBoth", { hasBothBinTypes: true });
                    }}
                  >
                    Yes, both
                  </Choice>
                  <Choice
                    selected={hasBothBinTypes === false}
                    onClick={() => {
                      setHasBothBinTypes(false);
                      setRecyclingBinCount(0);
                      setSameDayCollection(null);
                      advance("hasBoth", { hasBothBinTypes: false });
                    }}
                  >
                    Trash only
                  </Choice>
                </div>
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "trashCount" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">How many trash bins?</h2>
                <div className="mt-4">
                  <CountPicker
                    value={trashBinCount}
                    min={1}
                    max={binCap}
                    onPick={(n) => {
                      setTrashBinCount(n);
                      advance("trashCount");
                    }}
                  />
                </div>
                <Err message={fieldErrors.trashBinCount} />
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "recyclingCount" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">How many recycling bins?</h2>
                <p className="mt-1 text-base text-muted">
                  Your plan covers up to {binCap} bins total, and {trashBinCount} of those are trash.
                </p>
                <div className="mt-4">
                  <CountPicker
                    value={recyclingBinCount}
                    min={1}
                    max={Math.max(1, binCap - trashBinCount)}
                    onPick={(n) => {
                      setRecyclingBinCount(n);
                      advance("recyclingCount");
                    }}
                  />
                </div>
                <Err message={fieldErrors.recyclingBinCount} />
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "trashDay" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">What day is your trash picked up?</h2>
                <p className="mt-1 text-base text-muted">
                  We roll your bins out the evening before and bring them back after collection.
                </p>

                {dayCheck === "geocode_failed" ? (
                  <div
                    aria-live="polite"
                    className="mt-4 rounded-2xl border border-border bg-surface p-6 sm:p-8"
                  >
                    <h3 className="text-xl font-bold">We couldn&apos;t locate that address</h3>
                    <p className="mt-3 text-lg text-muted">
                      We weren&apos;t able to match your address to a map location, so we can&apos;t
                      confirm your collection day yet. Get in touch and we&apos;ll sort it out with
                      you directly — it usually takes a minute.
                    </p>
                    <a
                      href="/contact"
                      className="mt-6 inline-block min-h-[44px] rounded-lg bg-cyan px-6 py-3 text-lg font-semibold text-bg hover:bg-cyan-strong"
                    >
                      Contact us
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setDayCheck("idle");
                        setStage(1);
                      }}
                      className="mt-4 block text-base text-muted underline hover:text-text"
                    >
                      Check a different address
                    </button>
                  </div>
                ) : dayCheck === "mismatch" && cityWeekday !== null ? (
                  <div
                    aria-live="polite"
                    className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-6"
                  >
                    <h3 className="text-xl font-bold">
                      The City lists a different day for your address
                    </h3>
                    <p className="mt-2 text-lg">
                      City of Prescott records show <strong>{WEEKDAYS[cityWeekday]}</strong> as the
                      collection day here, not {collectionDay !== null ? WEEKDAYS[collectionDay] : ""}.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Choice
                        onClick={() => {
                          setCollectionDay(cityWeekday);
                          setCollectionDayUnsure(false);
                          void runDayCheck(cityWeekday);
                        }}
                      >
                        Use {WEEKDAYS[cityWeekday]}
                      </Choice>
                      <Choice onClick={() => void confirmDayMismatch()}>
                        No, it&apos;s {collectionDay !== null ? WEEKDAYS[collectionDay] : "my day"}
                      </Choice>
                    </div>
                    <p className="mt-3 text-base text-muted">
                      If your street is on a private hauler rather than City service, your own answer
                      is probably right — we&apos;ll double-check before your first pickup.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-4">
                      <DayPicker
                        day={collectionDay}
                        unsure={collectionDayUnsure}
                        onPick={(value) => {
                          setCollectionDay(value);
                          setCollectionDayUnsure(false);
                          void runDayCheck(value);
                        }}
                        onUnsure={() => void runUnsureCheck()}
                      />
                    </div>
                    {dayCheck === "checking" ? (
                      <p aria-live="polite" className="mt-3 text-base text-muted">
                        Checking your collection day…
                      </p>
                    ) : null}
                    <Err message={fieldErrors.collectionDay} />
                    <p className="mt-4 text-base text-muted">
                      We check City of Prescott records where we can, but no public source
                      lists the hauler and collection day for every property in Prescott or
                      Yavapai County — so we rely on what you tell us. See our{" "}
                      <a href="/terms" className="underline hover:text-text">
                        Terms of Service
                      </a>
                      .
                    </p>
                    {stepNav}
                  </>
                )}
              </section>
            ) : null}

            {stage3Step === "sameDay" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Is recycling picked up the same day as trash?</h2>
                <p className="mt-1 text-base text-muted">
                  In most of Prescott they share a day — different trucks, same morning.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Choice
                    selected={sameDayCollection === true}
                    onClick={() => {
                      setSameDayCollection(true);
                      advance("sameDay", { sameDayCollection: true });
                    }}
                  >
                    Yes, same day
                  </Choice>
                  <Choice
                    selected={sameDayCollection === false}
                    onClick={() => {
                      setSameDayCollection(false);
                      advance("sameDay", { sameDayCollection: false });
                    }}
                  >
                    No, a different day
                  </Choice>
                </div>
                <Err message={fieldErrors.sameDayCollection} />
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "recyclingDay" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">What day is your recycling picked up?</h2>
                {serviceChoice === "home" ? (
                  <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base">
                    Heads up: {PLANS.home.publicName} covers one collection day each week, so only
                    your trash day would be serviced. {PLANS.complete.publicName} covers every
                    regular collection day at the address — you can go back and switch plans.
                  </p>
                ) : null}
                <div className="mt-4">
                  <DayPicker
                    day={recyclingCollectionDay}
                    unsure={recyclingCollectionDayUnsure}
                    onPick={(value) => {
                      setRecyclingCollectionDay(value);
                      setRecyclingCollectionDayUnsure(false);
                      advance("recyclingDay");
                    }}
                    onUnsure={() => {
                      setRecyclingCollectionDayUnsure(true);
                      setRecyclingCollectionDay(null);
                      advance("recyclingDay");
                    }}
                  />
                </div>
                <Err message={fieldErrors.recyclingCollectionDay} />
                {stepNav}
              </section>
            ) : null}

            {stage3Step === "provider" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Who collects your trash?</h2>
                <p className="mt-1 text-base text-muted">
                  This tells us whose pickup schedule your street runs on.
                </p>
                <div className="mt-4 grid gap-3">
                  <Choice
                    selected={collectionProviderKind === "city"}
                    onClick={() => {
                      setCollectionProviderKind("city");
                      setCollectionProvider("City of Prescott");
                      advance("provider");
                    }}
                  >
                    City of Prescott
                  </Choice>
                  <Choice
                    selected={collectionProviderKind === "private"}
                    onClick={() => {
                      setCollectionProviderKind("private");
                      setCollectionProvider("");
                    }}
                  >
                    A private hauler
                  </Choice>
                  <Choice
                    selected={collectionProviderKind === "unsure"}
                    onClick={() => {
                      setCollectionProviderKind("unsure");
                      setCollectionProvider("");
                      advance("provider");
                    }}
                  >
                    I&apos;m not sure
                  </Choice>
                </div>
                {collectionProviderKind === "private" ? (
                  <div className="mt-4">
                    <label htmlFor="ob-provider" className="mb-1 block text-base font-medium">
                      Who&apos;s the hauler? <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      id="ob-provider"
                      className={inputClasses}
                      placeholder="e.g., WM"
                      value={collectionProvider}
                      onChange={(e) => setCollectionProvider(e.target.value)}
                    />
                  </div>
                ) : null}
                {collectionProviderKind === "private" ? (
                  <ContinueBar onBack={back3} pending={pending} onContinue={continueOrSubmit("provider")} />
                ) : (
                  stepNav
                )}
              </section>
            ) : null}

            {stage3Step === "hazards" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Anything we should plan for?</h2>
                <p className="mt-1 text-base text-muted">
                  Select all that apply, or continue if none do.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {HAZARD_OPTIONS.map(([value, label]) => (
                    <Choice
                      key={value}
                      selected={hazards.includes(value)}
                      onClick={() => toggle(hazards, value, setHazards)}
                    >
                      {label}
                    </Choice>
                  ))}
                </div>
                <ContinueBar onBack={back3} pending={pending} onContinue={continueOrSubmit("hazards")} />
              </section>
            ) : null}

            {stage3Step === "storage" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Where do the bins live?</h2>
                <p className="mt-1 text-base text-muted">
                  So the runner knows where to find them and where to put them back.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {STORAGE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBinStorageLocation(preset)}
                      className="min-h-[44px] rounded-full border border-border px-4 py-2 text-base hover:border-cyan/60"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <label htmlFor="ob-storage" className="sr-only">
                  Where do the bins live?
                </label>
                <input id="ob-storage" className={`${inputClasses} mt-3`} placeholder="e.g., left side yard behind the wooden gate" value={binStorageLocation} onChange={(e) => setBinStorageLocation(e.target.value)} />
                <Err message={fieldErrors.binStorageLocation} />
                <ContinueBar onBack={back3} pending={pending} onContinue={continueOrSubmit("storage")} />
              </section>
            ) : null}

            {stage3Step === "curbNotes" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">Where should the bins go at the curb?</h2>
                <label htmlFor="ob-curb" className="mt-1 block text-base text-muted">
                  Optional — HOA rules, mailbox clearance, anything specific.
                </label>
                <input id="ob-curb" className={`${inputClasses} mt-3`} placeholder="e.g., right of the driveway, away from the mailbox" value={curbPlacementNotes} onChange={(e) => setCurbPlacementNotes(e.target.value)} />
                <ContinueBar onBack={back3} pending={pending} onContinue={continueOrSubmit("curbNotes")} label={isLastStep3 ? "Review" : "Continue"} />
              </section>
            ) : null}

            {stage3Step === "access" ? (
              <section className="mt-4">
                <h2 className="text-xl font-bold">How do we get to the bins?</h2>
                <label htmlFor="ob-access" className="mt-1 block text-base text-muted">
                  Gate or garage codes, or key details your runner needs to reach the bins.
                </label>
                <textarea id="ob-access" rows={3} className={`${inputClasses} mt-3`} placeholder="Codes or key details needed to reach the bins" value={accessSecretNotes} onChange={(e) => setAccessSecretNotes(e.target.value)} />
                <Err message={fieldErrors.accessSecretNotes} />
                <p className="mt-1 text-base text-muted">
                  Stored encrypted and shown only to your assigned runner during the service window —
                  never in emails or texts.
                </p>
                <ContinueBar onBack={back3} pending={pending} onContinue={continueOrSubmit("access")} label="Review" />
              </section>
            ) : null}

            <div className="mt-4">
              <FormError message={formError} />
            </div>
          </div>
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
                <div className="rounded-2xl border border-cyan/40 bg-cyan/10 p-6">
                  <h2 className="text-xl font-bold">Your order</h2>
                  <p className="mt-2 text-lg">{quote.description}</p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatCents(quote.amountDueCents)}
                    <span className="text-lg font-normal text-muted">
                      {quote.recurrence === "one_time"
                        ? " one-time"
                        : quote.recurrence === "monthly"
                          ? "/month, renews monthly"
                          : "/quarter, prepaid (card or ACH), renews every 3 months"}
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
                  {dayCheck === "unsure_no_data" ? (
                    <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base">
                      We don&apos;t have a collection day on file for your address yet. We&apos;ll
                      confirm it with your hauler before your first pickup and email you once
                      it&apos;s scheduled.
                    </p>
                  ) : null}
                  <p className="mt-3 text-base text-muted">
                    Rollout the evening before collection (5–10 p.m.), return after collection.
                    If your collection day is confirmed and your address checks out as
                    residential, your service starts right away. If anything needs a closer
                    look, we&apos;ll review it before scheduling your first service — either way
                    we&apos;ll email you.
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
                <button type="button" onClick={() => setStage(3)} className="min-h-[44px] rounded-lg border border-border px-6 py-3.5 text-lg font-semibold">
                  Back
                </button>
                <button type="submit" disabled={pending || (quote !== null && !quote.binLimitOk)} className="min-h-[44px] flex-1 rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg hover:bg-cyan-strong disabled:opacity-60">
                  {pending ? "Starting payment…" : "Continue to Payment"}
                </button>
              </div>
            </form>
          )
        ) : null}
      </div>

      <div className="mt-10 lg:mt-0">
        <PersonaPanel persona={persona} />
      </div>
    </div>
  );
}
