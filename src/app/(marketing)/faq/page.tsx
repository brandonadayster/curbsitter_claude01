import type { Metadata } from "next";

import { CtaBand, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about CurbSitter service windows, proof photos, exceptions, billing, and policies.",
};

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "What exactly does CurbSitter do?",
    a: "We move your household trash and recycling bins from their storage spot to the curb before collection, return them after collection, and photo-confirm every visit. We do not collect, transport, or dispose of trash, and we don't replace your hauler.",
  },
  {
    q: "Do I need to be home?",
    a: "No. Once your property details and any access instructions are set up, we handle trash day whether you're home or away.",
  },
  {
    q: "When exactly will you arrive?",
    a: "We sell a completion window, not an appointment time. Rollout happens during the evening-before window (typically 5–10 p.m.), and return happens after we confirm collection. Exact-time promises break routing, so we don't make them.",
  },
  {
    q: "What if the truck comes early, late, or skips my street?",
    a: "Our rollout window and local schedule intelligence minimize early-truck risk. If the hauler is late or misses your street, we mark the cycle delayed, notify you honestly, and recheck under our published policy.",
  },
  {
    q: "What if you can't reach my bins?",
    a: "We record the issue with a photo — without exposing any access codes — alert you, and request updated access securely. Blocked access never silently disappears.",
  },
  {
    q: "What about javelina or wind knocking bins over?",
    a: "A minor reset discovered during a scheduled visit is included: we upright the bin, recover a minor immediate spill, and document it. Widespread debris, hazards, or separate dispatches are reviewed and quoted first.",
  },
  {
    q: "Can I buy this for a parent or a rental property?",
    a: "Yes. The payer, the service recipient, and the people receiving notifications can all be different, and one account can manage multiple properties.",
  },
  {
    q: "How does billing work?",
    a: "Monthly plans renew monthly by card. Discounted quarterly plans are prepaid — payable by card or ACH — and renew every three months. You can view the quarterly rate as a per-month price using the toggle on the pricing page. There's no long-term contract.",
  },
  {
    q: "How do I pause or cancel?",
    a: "Online, anytime. Pauses and cancellations apply to the next unperformed service cycle and future renewals under our published cutoff rules.",
  },
  {
    q: "Are my photos and access details safe?",
    a: "Proof photos are stored privately and shown to you through short-lived secure links — there is no public gallery. Gate and garage details are stored separately, encrypted, and never included in texts, emails, or logs.",
  },
  {
    q: "Why isn't my address available yet?",
    a: "We open service route by route so every stop stays reliable. If your street isn't on an active route, the waitlist is genuinely how routes open — we contact neighborhoods in order of route readiness.",
  },
  {
    q: "Is my payment taken before you confirm you can serve my property?",
    a: "Payment sets up your account, but every property goes through a serviceability review before the first service. If we can't serve your property, our policy is a prompt refund or an alternative quote.",
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="Questions & policies" title="Frequently asked questions" />
      <Section>
        <dl className="space-y-5">
          {FAQS.map((item) => (
            <div key={item.q} className="rounded-2xl border border-border bg-surface p-6">
              <dt className="text-xl font-bold">{item.q}</dt>
              <dd className="mt-2 text-lg text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <CtaBand />
    </>
  );
}
