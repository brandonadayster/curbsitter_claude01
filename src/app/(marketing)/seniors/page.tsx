import type { Metadata } from "next";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Trash-Day Help for Seniors",
  description:
    "Safe, reliable trash bin rollout and return for Prescott seniors — with photo proof for family and caregivers.",
};

export default function ForSeniorsPage() {
  return (
    <>
      <PageHero eyebrow="For seniors & caregivers" title="Keep your independence. Skip the risky trips.">
        <p>
          Heavy bins on a steep, dark, or icy driveway are one of the most common ways a good
          week goes wrong. We take that chore off the list — you stay in charge.
        </p>
      </PageHero>

      <Section title="How it helps">
        <CheckList
          items={[
            "No more hauling heavy bins up and down the driveway in the dark, heat, or ice",
            "The same reliable window every week — nothing to remember",
            "Photo confirmation after every rollout and return",
            "Exception alerts if anything is off, so small problems never become surprises",
            "Clear, readable dashboard and simple billing with no long-term contract",
          ]}
        />
      </Section>

      <Section title="Buying for a parent?">
        <p className="text-lg text-muted">
          Adult children and caregivers can purchase and manage the service from anywhere. The
          payer, the service recipient, and the people who receive notifications can all be
          different — Mom keeps her routine, you get the proof it happened.
        </p>
      </Section>

      <CtaBand title="Set up trash day for yourself or a loved one." />
    </>
  );
}
