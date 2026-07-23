import type { Metadata } from "next";

import { WaitlistJoinForm } from "@/components/site/address-check";
import { PageHero, Section } from "@/components/site/sections";
import { REFERRALS, formatCents } from "@/config/business";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "CurbSitter opens Prescott routes as neighborhoods fill. Join the waitlist and share your personal link to help your route open sooner.",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <>
      <PageHero eyebrow="Routes open by demand" title="Get your street on the map">
        <p>
          We launch route by route so every stop is reliable. Waitlist signups are exactly how we
          decide which routes open next — no fake counters, just real neighborhood demand.
        </p>
      </PageHero>

      <Section>
        <div className="max-w-2xl rounded-2xl border border-border bg-surface p-6 sm:p-8">
          {ref ? (
            <p className="mb-4 rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-3 text-base">
              A neighbor invited you — you&apos;re both eligible for the{" "}
              {formatCents(REFERRALS.advocateCreditCents)} referral credit once your first paid
              service cycle completes.
            </p>
          ) : null}
          <h2 className="text-2xl font-bold">Join the waitlist</h2>
          <WaitlistJoinForm referralCode={ref} />
        </div>
      </Section>

      <Section title="How the referral credit works">
        <p className="max-w-2xl text-lg text-muted">
          Give {formatCents(REFERRALS.referredCustomerCreditCents)}, get{" "}
          {formatCents(REFERRALS.advocateCreditCents)}: when someone joins from your link and
          completes their first paid service cycle, you both receive an account credit. Credits
          aren&apos;t cash, aren&apos;t transferable, and referrals are reviewed for abuse —
          fair&apos;s fair.
        </p>
      </Section>
    </>
  );
}
