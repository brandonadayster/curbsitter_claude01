import type { Metadata } from "next";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Trash Service for Vacation Rentals",
  description:
    "Reliable bin rollout and return for Prescott short-term rentals and property managers, with photo proof and exception reporting.",
};

export default function ForVacationRentalsPage() {
  return (
    <>
      <PageHero eyebrow="For rentals & property managers" title="Trash day never turns over with the guests.">
        <p>
          Guests forget bins. Cleaners are busy with the house. CurbSitter is the one accountable
          local vendor whose only job is getting bins out and back — with proof.
        </p>
      </PageHero>

      <Section title="Built for rental operations">
        <CheckList
          items={[
            "Every covered collection day handled, regardless of guest turnover",
            "Photo proof and documented history for every visit",
            "Overflow, contamination, and missed-collection reporting the same day",
            "Multi-property dashboard visibility under one account",
            "Exception alerts routed to you or your manager — your choice",
          ]}
        />
      </Section>

      <Section title="What we are not">
        <p className="text-lg text-muted">
          CurbSitter doesn&apos;t replace your cleaners or property manager, and we don&apos;t
          haul trash. We make one recurring, easily-dropped task disappear and give you the
          documentation to prove it happened.
        </p>
      </Section>

      <CtaBand title="Put your rental addresses on a route." />
    </>
  );
}
