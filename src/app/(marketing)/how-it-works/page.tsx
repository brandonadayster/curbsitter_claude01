import type { Metadata } from "next";

import { CheckList, CtaBand, PageHero, Section } from "@/components/site/sections";
import { SERVICE_WINDOWS } from "@/config/business";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Evening-before rollout, post-collection return, and photo confirmation on every visit — plus how exceptions and first-service review work.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="The service standard" title="How CurbSitter works">
        <p>
          We sell a completion window, not an appointment time — and we prove every visit with a
          timestamped photo.
        </p>
      </PageHero>

      <Section title="Service windows">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-xl font-bold">Rollout</h3>
            <p className="mt-2 text-lg text-muted">
              The evening before collection, between{" "}
              {SERVICE_WINDOWS.rolloutStartLocal.replace("17:00", "5:00 p.m.")} and{" "}
              {SERVICE_WINDOWS.rolloutEndLocal.replace("22:00", "10:00 p.m.")}, we move your
              approved bins from their storage spot to your approved curb placement, following
              hauler spacing rules and any HOA timing instructions.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-xl font-bold">Return</h3>
            <p className="mt-2 text-lg text-muted">
              After we confirm collection happened, we return bins to their storage spot —
              targeted by the end of pickup day. If the hauler runs late, we tell you the truth
              and follow a published next-day window instead of faking a completed return.
            </p>
          </div>
        </div>
        <p className="mt-6 text-base text-muted">
          We never promise an exact arrival time. Exact-time promises break routing and lead to
          disappointment — a clear window plus proof beats a guess.
        </p>
      </Section>

      <Section title="Photo proof on every visit">
        <CheckList
          items={[
            "A rollout photo and a return photo for every normal collection cycle.",
            "Photos are stored privately; you view them through secure, time-limited links in your dashboard.",
            "No public photo galleries — ever. Your property and travel patterns are not content.",
            "If something is off — blocked access, missing bin, uncollected trash — you get a documented exception, not silence.",
          ]}
        />
      </Section>

      <Section title="What happens when things go wrong">
        <div className="space-y-4">
          {[
            {
              title: "The hauler is late or skips your street",
              body: "Your cycle is marked delayed, you're notified, and we recheck under our published policy.",
            },
            {
              title: "A gate code fails",
              body: "We record the failure without exposing your code, request a secure update, and retry when operationally feasible.",
            },
            {
              title: "A bin is missing, blocked, or overweight",
              body: "We photograph and report it. We don't perform unapproved handling or invent charges in the field.",
            },
            {
              title: "Javelina or wind tipped a bin",
              body: "A minor reset found during a scheduled visit is included: we upright the bin, recover a minor immediate spill, and document it. Widespread debris or separate dispatches are reviewed and quoted.",
            },
            {
              title: "Weather or safety hazard",
              body: "Runners stop for ice, lightning, aggressive animals, or any credible hazard. Safety outranks the route clock; we communicate delays honestly.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-lg text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Your first service">
        <p className="text-lg text-muted">
          Every new signup — even after successful payment — goes through a quick property and
          route review before the first service is scheduled. We verify your address, collection
          schedule, access, and route fit so the service starts right. If we can&apos;t serve your
          property, you get a prompt refund or an alternative quote, not a surprise.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
