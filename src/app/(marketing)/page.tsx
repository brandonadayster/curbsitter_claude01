import Link from "next/link";

import { AddressCheck } from "@/components/site/address-check";
import { PlanCards } from "@/components/site/plan-cards";
import { CtaBand, InfoCard, Section } from "@/components/site/sections";

const VALUE_PROPS = [
  {
    title: "Safer",
    body: "Fewer heavy-bin trips on steep, uneven, dark, wet, or icy driveways.",
  },
  {
    title: "Reliable",
    body: "No forgotten rollout and no bins stranded at the curb while you travel or manage a property remotely.",
  },
  {
    title: "HOA-friendly",
    body: "Fewer cans left out, shorter curb exposure, and fewer HOA headaches.",
  },
  {
    title: "Proven",
    body: "Timestamped photo confirmation after every rollout and return.",
  },
];

const HOW_IT_WORKS = [
  "Tell us where your bins live.",
  "We roll them out during the evening-before window.",
  "We return them after collection.",
  "You receive photo confirmation and any exception notes.",
];

const AUDIENCES = [
  {
    href: "/for-seniors",
    title: "Seniors & Caregivers",
    body: "Keep independence without the risky driveway trips. Family can pay and receive proof.",
  },
  {
    href: "/for-snowbirds",
    title: "Snowbirds & Travelers",
    body: "Remote oversight, pause and resume, and photo proof while you're away.",
  },
  {
    href: "/for-vacation-rentals",
    title: "Vacation Rentals & Managers",
    body: "Multi-property visibility, turnover reliability, and one accountable local vendor.",
  },
  {
    href: "/for-hoas",
    title: "HOAs & Communities",
    body: "Fewer bins left out, help for older and seasonal residents, and clear reports.",
  },
];

const FAQ_PREVIEW = [
  {
    question: "Do I need to be home?",
    answer:
      "No. Once your property details and access instructions are set up, we handle trash day whether you're home, away, or asleep.",
  },
  {
    question: "What if the truck is late or skips my street?",
    answer:
      "We mark your cycle as delayed, notify you, and follow our recheck policy instead of pretending the return happened.",
  },
  {
    question: "What if you can't access the bins?",
    answer:
      "We document the issue with a photo, alert you right away, and request updated access securely.",
  },
  {
    question: "Can I buy this for a parent or another property?",
    answer:
      "Yes. The payer, the service recipient, and the people who get notifications can all be different.",
  },
  {
    question: "Can I pause or cancel?",
    answer:
      "Yes — online, anytime, for a future renewal. There is no long-term contract.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-base font-semibold uppercase tracking-wide text-cyan">
              Local trash-day concierge in Prescott, Arizona
            </p>
            <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl">
              Trash day, handled.
            </h1>
            <p className="mt-5 max-w-xl text-xl text-muted">
              We roll your bins to the curb before pickup, bring them back after collection, and
              photo-confirm every visit.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <a
                href="#address-check"
                className="rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg transition-colors hover:bg-cyan-strong"
              >
                Check My Address
              </a>
              <Link
                href="/how-it-works"
                className="rounded-lg border border-border px-6 py-3.5 text-lg font-semibold transition-colors hover:border-cyan/60"
              >
                See How It Works
              </Link>
            </div>
            <p className="mt-6 text-lg font-medium">
              Bins out. Bins back. <span className="text-cyan">Photo-confirmed.</span>
            </p>
          </div>
          <div id="address-check" className="scroll-mt-24">
            <AddressCheck />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((prop) => (
            <InfoCard key={prop.title} title={prop.title}>
              {prop.body}
            </InfoCard>
          ))}
        </div>
      </Section>

      <Section title="How it works">
        <ol className="grid gap-6 sm:grid-cols-2">
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan text-lg font-bold text-bg"
              >
                {index + 1}
              </span>
              <p className="text-lg">{step}</p>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-6 inline-block text-lg text-cyan underline">
          The full service standard, windows, and proof →
        </Link>
      </Section>

      <Section title="Who we help">
        <div className="grid gap-6 sm:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <InfoCard key={audience.href} title={audience.title} href={audience.href}>
              {audience.body}
            </InfoCard>
          ))}
        </div>
      </Section>

      <Section title="Simple pricing">
        <PlanCards />
        <p className="mt-6 text-base text-muted">
          No surprise charges. Unusual access or terrain is reviewed and clearly quoted before
          activation — never invented in the field.{" "}
          <Link href="/pricing" className="text-cyan underline">
            Full pricing details
          </Link>
        </p>
      </Section>

      <Section title="Common questions">
        <dl className="space-y-5">
          {FAQ_PREVIEW.map((item) => (
            <div key={item.question} className="rounded-2xl border border-border bg-surface p-5">
              <dt className="text-xl font-bold">{item.question}</dt>
              <dd className="mt-2 text-lg text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
        <Link href="/faq" className="mt-6 inline-block text-lg text-cyan underline">
          More questions and policies →
        </Link>
      </Section>

      <CtaBand />
    </>
  );
}
