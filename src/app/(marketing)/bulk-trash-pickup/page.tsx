import type { Metadata } from "next";
import Link from "next/link";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";
import { formatCents, ONE_TIME } from "@/config/business";

export const metadata: Metadata = {
  title: "Bulk Pickup Coordination",
  description:
    "We coordinate eligible municipal or hauler bulk-pickup appointments for Prescott homes, starting at $49. We never haul or dispose.",
};

export default function BulkPickupCoordinationPage() {
  return (
    <>
      <PageHero
        eyebrow="Coordination, not hauling"
        title={`Bulk Pickup Coordination — from ${formatCents(ONE_TIME.bulkPickupCoordinationStartingCents)}`}
      >
        <p>
          Old couch, broken appliance, yard-project debris? We handle the phone calls, rules, and
          scheduling for your hauler&apos;s bulk-pickup program.
        </p>
      </PageHero>

      <Section title="What we do">
        <CheckList
          items={[
            "Review your item photos and confirm the request fits an eligible municipal or hauler bulk-pickup program",
            "Coordinate the appointment when authorization and provider rules allow",
            "Provide placement instructions for the pickup",
            "Monitor the scheduled pickup and report the outcome",
          ]}
        />
      </Section>

      <Section title="What we don't do">
        <CheckList
          items={[
            "No transport, disposal, or junk hauling",
            "No demolition, hazardous-material, or refrigerant handling",
            "No guarantee the provider accepts or collects the items — we coordinate, the hauler decides",
          ]}
        />
        <p className="mt-6 text-lg text-muted">
          Physical curb placement of bulk items, where available, is quoted separately after we
          review the items, weight, access, and terrain. No surprise add-ons.
        </p>
      </Section>

      <Section title="Request coordination">
        <p className="text-lg text-muted">
          Reach out through the{" "}
          <Link href="/contact" className="text-cyan underline">
            contact page
          </Link>{" "}
          with photos of your items and your collection provider, and we&apos;ll confirm
          eligibility and pricing before anything is scheduled.
        </p>
      </Section>

      <CtaBand title="Have a pile that needs a plan?" ctaLabel="Contact Us" ctaHref="/contact" />
    </>
  );
}
