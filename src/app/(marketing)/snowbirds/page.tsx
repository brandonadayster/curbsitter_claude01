import type { Metadata } from "next";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Trash Service for Snowbirds & Second Homes",
  description:
    "Remote oversight for Prescott second homes: bins out, bins back, photo-confirmed — with easy pause and resume.",
};

export default function ForSnowbirdsPage() {
  return (
    <>
      <PageHero eyebrow="For snowbirds & travelers" title="Your Prescott home, handled while you're away.">
        <p>
          Bins left at the curb for days advertise an empty house and irritate the HOA. We keep
          your property looking lived-in and prove it with photos.
        </p>
      </PageHero>

      <Section title="Why remote owners use CurbSitter">
        <CheckList
          items={[
            "Timestamped photo proof of every rollout and return, viewable from anywhere",
            "Shorter curb exposure — bins don't sit out signaling an empty home",
            "Pause and resume online as your travel schedule changes",
            "Real-time exception alerts if a bin is missing, blocked, or uncollected",
            "Holiday schedule monitoring, so a shifted pickup day never catches you out",
          ]}
        />
      </Section>

      <Section title="Complete covers every collection day">
        <p className="text-lg text-muted">
          Second homes with separate trash and recycling days are what CurbSitter Complete is
          for: every regular collection day at the address is covered, with the same proof and
          alerts.
        </p>
      </Section>

      <CtaBand title="Check your Prescott address before your next trip." />
    </>
  );
}
