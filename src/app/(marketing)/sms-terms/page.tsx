import type { Metadata } from "next";

import { LegalPage } from "../legal-layout";

export const metadata: Metadata = { title: "SMS Terms" };

export default function SmsTermsPage() {
  return (
    <LegalPage title="SMS Terms">
      <h2>Opt-in only</h2>
      <p>
        CurbSitter sends SMS only after you explicitly opt in. Transactional service messages
        (service confirmations, exceptions, schedule changes) and marketing messages require
        separate consent.
      </p>
      <h2>Frequency and rates</h2>
      <p>
        Message frequency varies with your service schedule. Message and data rates may apply.
      </p>
      <h2>Opting out</h2>
      <p>
        Reply STOP to cancel at any time, or HELP for help. You can also manage SMS preferences
        in your dashboard. Opting out of SMS does not affect required service emails.
      </p>
      <h2>Content limits</h2>
      <p>
        We never send gate codes or sensitive access instructions by SMS or email.
      </p>
    </LegalPage>
  );
}
