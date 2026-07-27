import type { Metadata } from "next";

import { PlanCards } from "@/components/site/plan-cards";
import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "CurbSitter Home from $55/month. CurbSitter Complete from $75/month. Save with quarterly billing. CurbSitter onDemand $25 per service. No surprise charges.",
};

export default function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Simple, locked pricing" title="Two plans. No surprises.">
        <p>
          Home covers the common one-day schedule. Complete covers every regular collection day.
          That&apos;s the whole menu.
        </p>
      </PageHero>

      <Section>
        <PlanCards />
      </Section>

      <Section title="Included in every subscription">
        <CheckList
          items={[
            "Evening-before rollout and post-collection return for every covered collection day",
            "Timestamped photo confirmation every visit",
            "Real-time exception reporting",
            "Holiday and collection-schedule monitoring",
            "Normal property-specific HOA timing instructions",
            "Minor javelina/wind reset discovered during a scheduled visit",
            "Customer dashboard and service history",
            "Blocked-access and uncollected-bin reporting",
            "No long-term contract — pause or cancel a future renewal online",
            "No separate photo, holiday, recycling, or dashboard fee",
          ]}
        />
      </Section>

      <Section title="The no-surprise complexity policy">
        <p className="text-lg text-muted">
          Published prices assume ordinary residential access. Long or steep drives, garages,
          locked access, stairs, unusual placement, shared bins, or isolated addresses may
          require an access review or one clearly explained adjustment —{" "}
          <strong className="text-text">shown and approved before activation</strong>. There are
          no field-created surprise charges, ever.
        </p>
      </Section>

      <Section title="Billing and cancellation">
        <CheckList
          items={[
            "Monthly plans renew monthly.",
            "Discounted quarterly plans are prepaid — payable by card or ACH — and renew every three months.",
            "Pause or cancellation applies to the next unperformed service cycle and future renewals.",
            "Standard service never includes waste transport, municipal collection charges, junk hauling, or hazardous-material handling.",
          ]}
        />
      </Section>

      <CtaBand />
    </>
  );
}
