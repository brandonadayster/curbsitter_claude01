import Link from "next/link";

import { formatCents, ONE_TIME, PLANS } from "@/config/business";

const PLAN_FEATURES: Record<string, string[]> = {
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

export function PlanCards() {
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3">
        {(["home", "complete"] as const).map((planId) => {
          const plan = PLANS[planId];
          const recommended = planId === "home";
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
                {formatCents(plan.monthlyPriceCents)}
                <span className="text-lg font-normal text-muted">/month</span>
              </p>
              <p className="mt-1 text-base text-muted">
                or {formatCents(plan.quarterlyPriceCents)}/quarter prepaid by ACH
              </p>
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
          <h3 className="text-2xl font-bold">Community &amp; Portfolio</h3>
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
            href="/for-hoas"
            className="mt-6 rounded-lg border border-border px-5 py-3 text-center text-lg font-semibold transition-colors hover:border-cyan/60"
          >
            Request a Proposal
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-xl font-bold">One-Time Trash Day</h3>
          <p className="mt-2 text-3xl font-bold">{formatCents(ONE_TIME.trashDayPriceCents)}</p>
          <p className="mt-2 text-base text-muted">
            One scheduled rollout and post-collection return for up to{" "}
            {ONE_TIME.trashDayIncludedBins} bins, photo-confirmed. Available only inside active
            route areas with scheduling capacity. No subscription required.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-xl font-bold">Bulk Pickup Coordination</h3>
          <p className="mt-2 text-3xl font-bold">
            from {formatCents(ONE_TIME.bulkPickupCoordinationStartingCents)}
          </p>
          <p className="mt-2 text-base text-muted">
            We review your items, coordinate an eligible hauler bulk-pickup appointment, and
            monitor the pickup. Physical curb placement is separately reviewed and quoted. We
            never haul or dispose of items.
          </p>
        </div>
      </div>
    </div>
  );
}
