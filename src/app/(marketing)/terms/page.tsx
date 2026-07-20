import type { Metadata } from "next";

import { LegalPage } from "../legal-layout";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <h2>The service</h2>
      <p>
        CurbSitter moves household trash and recycling bins between their storage location and
        the curb, returns them after collection, and provides photo confirmation of each visit.
        CurbSitter does not collect, transport, or dispose of waste; is not a waste hauler,
        property manager, security service, or emergency responder; and does not guarantee hauler
        collection.
      </p>
      <h2>Service windows</h2>
      <p>
        Service is performed within published completion windows, not at exact appointment times.
        Rollout occurs during the evening-before window; return occurs after confirmed
        collection, with a published fallback window when collection is delayed.
      </p>
      <h2>Serviceability review</h2>
      <p>
        All new accounts are subject to property and route review before first service, even
        after successful payment. If CurbSitter cannot serve a property, the customer receives a
        prompt refund of unused charges or an alternative quote.
      </p>
      <h2>Billing</h2>
      <p>
        Monthly plans renew monthly. Quarterly plans are prepaid by ACH and renew every three
        months. There is no long-term contract. Pauses and cancellations apply to future
        unperformed service cycles under the published cutoff rules.
      </p>
      <h2>Access and safety</h2>
      <p>
        Customers are responsible for accurate access information. Runners may decline or stop
        work when conditions are unsafe. Approved service adjustments for unusual access are
        communicated and accepted before activation; no field-created surcharges apply.
      </p>
    </LegalPage>
  );
}
