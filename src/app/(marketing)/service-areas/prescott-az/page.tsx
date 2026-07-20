import type { Metadata } from "next";
import Link from "next/link";

import { AddressCheck } from "@/components/site/address-check";
import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Trash Bin Rollout & Return Service in Prescott, AZ",
  description:
    "CurbSitter rolls trash and recycling bins to the curb before pickup and returns them after collection for Prescott homes — photo-confirmed every visit.",
};

export default function PrescottPage() {
  return (
    <>
      <PageHero eyebrow="Prescott, Arizona" title="Prescott's trash bin rollout and return service">
        <p>
          CurbSitter is a Prescott-local concierge that takes your bins to the curb before
          collection and brings them back after — we are not a trash hauler, and we don&apos;t
          replace your collection service.
        </p>
      </PageHero>

      <Section title="Built for Prescott properties">
        <CheckList
          items={[
            "Steep, long, and gravel driveways where hauling bins is a genuine fall risk",
            "Pine-country wind and javelina that tip and scatter bins — timing and secure storage matter",
            "HOA communities with strict set-out and storage timing rules",
            "Snowbird and second-home neighborhoods that need proof from afar",
            "Winter ice and dark early mornings that make trash day the worst chore of the week",
          ]}
        />
      </Section>

      <Section title="Check a Prescott address">
        <AddressCheck />
      </Section>

      <Section title="Learn more">
        <ul className="space-y-2 text-lg">
          <li>
            <Link href="/how-it-works" className="text-cyan underline">
              How the service windows and photo proof work
            </Link>
          </li>
          <li>
            <Link href="/pricing" className="text-cyan underline">
              Plans and pricing
            </Link>
          </li>
          <li>
            <Link href="/for-seniors" className="text-cyan underline">
              Trash-day help for Prescott seniors
            </Link>
          </li>
          <li>
            <Link href="/for-hoas" className="text-cyan underline">
              Options for Prescott HOAs and community managers
            </Link>
          </li>
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}
