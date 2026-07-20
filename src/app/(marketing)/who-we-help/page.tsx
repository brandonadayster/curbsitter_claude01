import type { Metadata } from "next";

import { CtaBand, InfoCard, PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Who We Help",
  description:
    "CurbSitter serves seniors, caregivers, snowbirds, vacation-rental owners, HOAs, and busy Prescott homeowners.",
};

export default function WhoWeHelpPage() {
  return (
    <>
      <PageHero eyebrow="One service, many reasons" title="Who CurbSitter helps">
        <p>One less recurring deadline — whatever your reason for wanting it gone.</p>
      </PageHero>
      <Section>
        <div className="grid gap-6 sm:grid-cols-2">
          <InfoCard title="Seniors & mobility-limited homeowners" href="/for-seniors">
            Keep your independence without the heavy, risky driveway trips. A family member can
            pay and receive proof while you stay in charge.
          </InfoCard>
          <InfoCard title="Snowbirds, travelers & second-home owners" href="/for-snowbirds">
            Remote control, pause and resume, shorter curb exposure, and photo proof from
            anywhere.
          </InfoCard>
          <InfoCard title="Vacation rentals & property managers" href="/for-vacation-rentals">
            Multi-property visibility, guest-turnover reliability, and one accountable local
            vendor for bin logistics.
          </InfoCard>
          <InfoCard title="HOAs & community managers" href="/for-hoas">
            Fewer bins left out, help for older and seasonal residents, cleaner curb appearance,
            and clear reports.
          </InfoCard>
          <InfoCard title="Busy homeowners">
            The simplest benefit of all: trash day stops being your job. Bins out, bins back,
            photo-confirmed.
          </InfoCard>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
