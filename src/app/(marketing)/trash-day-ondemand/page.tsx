import type { Metadata } from "next";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";
import { formatCents, ONE_TIME } from "@/config/business";

export const metadata: Metadata = {
  title: "One-Time Trash Day",
  description:
    "A single scheduled bin rollout and return for $39 — up to 3 bins, photo-confirmed, inside active CurbSitter routes.",
};

export default function OneTimeTrashDayPage() {
  return (
    <>
      <PageHero
        eyebrow="No subscription required"
        title={`One-Time Trash Day — ${formatCents(ONE_TIME.trashDayPriceCents)}`}
      >
        <p>
          Surgery week, a trip, a house between tenants — sometimes you just need one trash day
          handled properly.
        </p>
      </PageHero>

      <Section title="What's included">
        <CheckList
          items={[
            "One scheduled rollout during the evening-before window",
            "One post-collection return",
            `Up to ${ONE_TIME.trashDayIncludedBins} bins at one residential address`,
            "The same photo confirmation and exception reporting as subscriptions",
          ]}
        />
      </Section>

      <Section title="Availability">
        <p className="text-lg text-muted">
          One-Time Trash Day is available only inside active route areas and depends on
          scheduling capacity — it rides along with our regular routes, which is what keeps the
          price reasonable. Check your address to see whether your street is on an active route
          yet.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
