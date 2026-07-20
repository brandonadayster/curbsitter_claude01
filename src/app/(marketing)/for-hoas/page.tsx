import type { Metadata } from "next";
import Link from "next/link";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "For HOAs & Community Managers",
  description:
    "Pilot programs, resident opt-in, and contracted coverage that help Prescott communities keep bins off the street — with clear reporting.",
};

export default function ForHoasPage() {
  return (
    <>
      <PageHero eyebrow="For HOAs & communities" title="Fewer bins left out. Fewer complaints.">
        <p>
          CurbSitter helps residents meet set-out and storage timing rules — especially older and
          seasonal residents — and gives the board one clear report instead of a complaint
          thread.
        </p>
      </PageHero>

      <Section title="Ways to work together">
        <div className="space-y-4">
          {[
            {
              title: "60–90 day pilot",
              body: "Selected streets or residents, clearly measured: completed visits, exceptions, and curb-appearance outcomes.",
            },
            {
              title: "Preferred provider with resident opt-in",
              body: "The community endorses; residents subscribe individually at their own choice and cost.",
            },
            {
              title: "HOA-funded coverage",
              body: "Selected residents (for example, age- or need-based) or a community-wide contract under a custom proposal.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-lg text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="What the board gets">
        <CheckList
          items={[
            "Monthly completed-visit and exception reporting",
            "Missed-hauler-pickup documentation for follow-up with the collection provider",
            "Help for residents who physically struggle with bins",
            "A professional, insured, accountable local operator",
          ]}
        />
        <p className="mt-6 text-base text-muted">
          One honest note: we help residents comply with timing and storage rules — no vendor can
          guarantee zero violations, and we won&apos;t pretend otherwise.
        </p>
      </Section>

      <Section title="Start the conversation">
        <p className="text-lg text-muted">
          Tell us about your community through the{" "}
          <Link href="/contact" className="text-cyan underline">
            contact page
          </Link>{" "}
          and we&apos;ll respond with pilot options and a custom proposal.
        </p>
      </Section>

      <CtaBand title="Bring CurbSitter to your community." ctaLabel="Contact Us" ctaHref="/contact" />
    </>
  );
}
