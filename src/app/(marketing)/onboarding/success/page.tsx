import type { Metadata } from "next";
import Link from "next/link";

import { PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = { title: "You're Almost Set" };

export default function OnboardingSuccessPage() {
  return (
    <>
      <PageHero eyebrow="Payment received" title="Pending property and route review">
        <p>
          Thanks — your payment went through and your signup is in. Before the first service is
          scheduled, we verify your address, collection schedule, access details, and route fit.
        </p>
      </PageHero>
      <Section title="What happens next">
        <ol className="list-decimal space-y-3 pl-6 text-lg text-muted">
          <li>We review your property details — usually within one business day.</li>
          <li>You get an email confirming your start date, or a question if anything needs clarifying.</li>
          <li>
            If we can&apos;t serve your property, we say so promptly and refund you — no
            surprises.
          </li>
        </ol>
        <p className="mt-6 text-lg text-muted">
          You can <Link href="/login" className="text-cyan underline">sign in</Link> anytime with
          your email to see your account status.
        </p>
      </Section>
    </>
  );
}
