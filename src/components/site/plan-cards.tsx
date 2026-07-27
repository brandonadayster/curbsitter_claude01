"use client";

import Link from "next/link";
import { useState } from "react";

import {
  formatCents,
  ONE_TIME,
  PLANS,
  quarterlyMonthlyEquivalentCents,
  type BillingInterval,
  type PlanId,
} from "@/config/business";

const PLAN_FEATURES: Record<PlanId, string[]> = {
  home: [
    "Up to 3 bins at one residential address",
    "One regular collection day each week",
    "Trash and recycling on your covered day",
    "Evening-before rollout, post-collection return",
    "Timestamped photo confirmation every visit",
    "Exception alerts and holiday monitoring",
  ],
  complete: [
    "Up to 6 bins at one residential address",
    "Every regular trash and recycling collection day",
    "All Home standards, proof, and monitoring",
    "Best for separate trash/recycling days",
    "Great for second homes and vacation rentals",
  ],
};

const RECURRING_PLANS: PlanId[] = ["home", "complete"];

export function PlanCards() {
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const quarterly = billing === "quarterly";

  return (
    <div>
      <BillingToggle billing={billing} onChange={setBilling} />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {RECURRING_PLANS.map((planId) => {
          const plan = PLANS[planId];
          const recommended = planId === "home";
          const perMonthCents = quarterly
            ? quarterlyMonthlyEquivalentCents(planId)
            : plan.monthlyPriceCents;
          const savingsCents = plan.monthlyPriceCents - quarterlyMonthlyEquivalentCents(planId);
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                recommended ? "border-cyan/60 bg-surface-2" : "border-border bg-surface"
              }`}
            >
              {recommended ? (
                <p className="mb-2 text-base font-semibold text-cyan">Most popular</p>
              ) : (
                <p className="mb-2 text-base font-semibold text-transparent" aria-hidden="true">
                  &nbsp;
                </p>
              )}
              <h3 className="text-2xl font-bold">{plan.publicName}</h3>
              <p className="mt-3 text-4xl font-bold">
                {formatCents(perMonthCents)}
                <span className="text-lg font-normal text-muted">/month</span>
              </p>
              {quarterly ? (
                <p className="mt-1 text-base text-muted">
                  Billed {formatCents(plan.quarterlyPriceCents)} every 3 months
                  {savingsCents > 0 ? (
                    <span className="text-success"> · save {formatCents(savingsCents)}/mo</span>
                  ) : null}
                </p>
              ) : (
                <p className="mt-1 text-base text-muted">Billed monthly · cancel anytime</p>
              )}
              <ul className="mt-5 flex-1 space-y-2.5">
                {PLAN_FEATURES[plan.id].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-base">
                    <span aria-hidden="true" className="mt-1 text-success">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/#address-check"
                className={`mt-6 rounded-lg px-5 py-3 text-center text-lg font-semibold transition-colors ${
                  recommended
                    ? "bg-cyan text-bg hover:bg-cyan-strong"
                    : "border border-border hover:border-cyan/60"
                }`}
              >
                Check My Address
              </Link>
            </div>
          );
        })}

        <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
          <p className="mb-2 text-base font-semibold text-transparent" aria-hidden="true">
            &nbsp;
          </p>
          <h3 className="text-2xl font-bold">CurbSitter Enterprise</h3>
          <p className="mt-3 text-4xl font-bold">Custom</p>
          <p className="mt-1 text-base text-muted">Proposal-based route pricing</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {[
              "HOAs, condo associations, and property managers",
              "Centralized account controls and reporting",
              "Resident opt-in or contracted coverage",
              "Completed-visit and exception reports",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-base">
                <span aria-hidden="true" className="mt-1 text-success">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/hoa"
            className="mt-6 rounded-lg border border-border px-5 py-3 text-center text-lg font-semibold transition-colors hover:border-cyan/60"
          >
            Request a Proposal
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-xl font-bold">{ONE_TIME.trashDayPublicName}</h3>
          <p className="mt-2 text-3xl font-bold">
            {formatCents(ONE_TIME.trashDayPriceCents)}
            <span className="text-base font-normal text-muted"> / service</span>
          </p>
          <p className="mt-2 max-w-2xl text-base text-muted">
            One scheduled rollout and post-collection return for up to{" "}
            {ONE_TIME.trashDayIncludedBins} bins, photo-confirmed. Available only inside active route
            areas with scheduling capacity. No subscription required.
          </p>
        </div>
      </div>
    </div>
  );
}

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  const quarterly = billing === "quarterly";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`text-base font-medium ${quarterly ? "text-muted" : "text-text"}`}>
        Monthly
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={quarterly}
        aria-label="Show quarterly pricing (billed every 3 months)"
        onClick={() => onChange(quarterly ? "monthly" : "quarterly")}
        className="relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border border-border bg-surface-2 px-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className={`inline-block h-8 w-8 rounded-full bg-cyan transition-transform motion-reduce:transition-none ${
            quarterly ? "translate-x-9" : "translate-x-0"
          }`}
        />
      </button>
      <span className={`text-base font-medium ${quarterly ? "text-text" : "text-muted"}`}>
        Quarterly
      </span>
      <span className="rounded-full border border-success/40 bg-success/10 px-3 py-1 text-sm font-semibold text-success">
        Save up to 15%
      </span>
    </div>
  );
}
