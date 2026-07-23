"use client";

import { useState } from "react";
import Link from "next/link";

type Billing = "monthly" | "quarterly";

type PricingSectionProps = {
  compact?: boolean;
};

const plans = [
  {
    slug: "home",
    name: "CurbSitter Home",
    summary: "One weekly collection day for the typical Prescott household.",
    monthly: "$59",
    quarterly: "$159",
    note: "Up to 3 bins at one address.",
    features: [
      "One regular collection day each week",
      "Evening-before rollout and post-collection return",
      "Photo confirmation and exception alerts",
      "Trash and recycling on the covered collection day",
    ],
  },
  {
    slug: "complete",
    name: "CurbSitter Complete",
    summary: "Every regular collection day at one address—without keeping track of any of them.",
    monthly: "$89",
    quarterly: "$240",
    note: "Up to 6 bins at one address.",
    featured: true,
    features: [
      "Every regular trash and recycling collection day",
      "Evening-before rollout and post-collection return",
      "Photo confirmation and exception alerts",
      "Ideal for separate pickup days, second homes and rentals",
    ],
  },
] as const;

export default function PricingSection({ compact = false }: PricingSectionProps) {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section
      className={compact ? "cs-section" : "cs-page-hero"}
      id="pricing"
      aria-labelledby="pricing-title"
      data-pricing-scope
    >
      <div className="cs-shell">
        <header className="cs-section-heading">
          <span className="cs-eyebrow">
            {compact ? "Simple plans. Fully handled." : "Trash day, handled."}
          </span>
          {compact ? (
            <h2 id="pricing-title">Choose how often we handle trash day.</h2>
          ) : (
            <h1 id="pricing-title">
              Simple pricing.
              <br />
              No trash-day fine print maze.
            </h1>
          )}
          <p>
            {compact
              ? "Every visit is documented. Every exception is reported. Your bins go out, come back, and stop becoming your problem."
              : "Pick the plan that matches your collection schedule. CurbSitter handles the rollout, return, proof and exceptions."}
          </p>
        </header>

        <div className="cs-billing-toggle" aria-label="Billing frequency">
          <button
            type="button"
            aria-pressed={billing === "monthly"}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={billing === "quarterly"}
            onClick={() => setBilling("quarterly")}
          >
            Quarterly <small>Save 10%</small>
          </button>
        </div>

        <div className="cs-plan-grid">
          {plans.map((plan) => (
            <article
              className={`cs-card${plan.featured ? " cs-card-featured" : ""}`}
              key={plan.slug}
            >
              {plan.featured && <span className="cs-popular">Most complete</span>}
              <h3 className="cs-plan-name">{plan.name}</h3>
              <p className="cs-plan-summary">{plan.summary}</p>
              <div className="cs-price-line" aria-live="polite">
                <span className="cs-price">
                  {billing === "monthly" ? plan.monthly : plan.quarterly}
                </span>
                <span className="cs-price-suffix">
                  {billing === "monthly" ? "/ month" : "/ quarter"}
                </span>
              </div>
              <p className="cs-price-note">{plan.note}</p>
              <div className="cs-plan-rule" />
              <ul className="cs-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <Link
                className={`cs-button ${plan.featured ? "cs-button-primary" : "cs-button-secondary"} cs-button-block`}
                href={`/signup?plan=${plan.slug}`}
              >
                Check availability
              </Link>
            </article>
          ))}
        </div>

        <aside className="cs-community-card">
          <div>
            <h3>Community &amp; Portfolio</h3>
            <p>
              Custom route pricing, centralized reporting and account management for HOAs,
              property managers and multiple properties.
            </p>
          </div>
          <Link className="cs-button cs-button-secondary" href="/contact?interest=community">
            Request a proposal
          </Link>
        </aside>

        <div className="cs-included">
          <h3>Every subscription includes</h3>
          <div className="cs-included-grid">
            <span>Photo confirmation every visit</span>
            <span>Real-time exception reporting</span>
            <span>Holiday schedule monitoring</span>
            <span>Normal HOA timing instructions</span>
            <span>Minor javelina and wind reset</span>
            <span>Customer dashboard and service history</span>
            <span>No long-term contract</span>
            <span>Pause or cancel future renewal</span>
          </div>
        </div>

        {compact && (
          <p className="cs-note">
            Quarterly pricing is prepaid by ACH. Specialty access or unusual service conditions
            may require review. <Link href="/pricing">See full pricing and service guidelines.</Link>
          </p>
        )}
      </div>
    </section>
  );
}
