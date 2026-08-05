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
        Accounts that clear CurbSitter&apos;s automated checks — a confirmed collection day and
        an address that verifies as residential — are activated at signup. Accounts that do not
        clear those checks, including a disputed collection day, an unconfirmed collection day,
        or a property that does not verify as residential, are subject to property and route
        review before first service, even after successful payment. If CurbSitter cannot serve a
        property, the customer receives a prompt refund of unused charges or an alternative
        quote.
      </p>
      <h2>Collection schedule accuracy</h2>
      <p>
        CurbSitter checks the collection day a customer provides against the City of Prescott&apos;s
        published route records where those records cover the address. No public source lists
        the hauler and collection day for every residential address in Prescott or elsewhere in
        Yavapai County, so CurbSitter relies on the property information the customer supplies.
        CurbSitter is not responsible for a missed collection resulting from inaccurate hauler,
        collection-day, or property information provided by the customer. Customers can correct
        their collection day at any time by contacting support.
      </p>
      <h2>Billing</h2>
      <p>
        Monthly plans renew monthly. Quarterly plans are prepaid — payable by card or ACH — and
        renew every three months. There is no long-term contract. Pauses and cancellations apply to future
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
