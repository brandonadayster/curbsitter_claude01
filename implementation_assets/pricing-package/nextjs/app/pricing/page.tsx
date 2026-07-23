import type { Metadata } from "next";
import Link from "next/link";
import PricingSection from "../../components/PricingSection";
import "../../styles/curbsitter-pricing.css";

export const metadata: Metadata = {
  title: "Pricing | CurbSitter",
  description:
    "Simple CurbSitter pricing for fully automated trash-bin rollout, return and photo-confirmed service in the Prescott area.",
};

const included = [
  "Rollout before collection",
  "Return after collection",
  "Photo confirmation every visit",
  "Real-time exception reporting",
  "Holiday schedule monitoring",
  "Normal property-specific HOA instructions",
  "Minor javelina and wind reset found during service",
  "Customer dashboard and service history",
  "Trash and recycling within covered days",
  "Blocked-access and uncollected-bin reporting",
  "No long-term service contract",
  "Pause or cancel future renewal online",
];

export default function PricingPage() {
  return (
    <main>
      <PricingSection />

      <section className="cs-subsection" aria-labelledby="included-title">
        <div className="cs-shell">
          <header className="cs-subsection-title">
            <h2 id="included-title">Everything important is already included.</h2>
            <p>No photo fee, holiday fee, recycling fee or nickel-and-dime dashboard surcharge.</p>
          </header>
          <div className="cs-included">
            <div className="cs-included-grid">
              {included.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cs-subsection" aria-labelledby="one-time-title">
        <div className="cs-shell">
          <header className="cs-subsection-title">
            <span className="cs-eyebrow">No subscription required</span>
            <h2 id="one-time-title">Occasional help, kept out of the main menu.</h2>
            <p>Useful when you travel, get injured or need help coordinating an approved bulk pickup.</p>
          </header>

          <div className="cs-service-grid">
            <article className="cs-service-card">
              <div className="cs-service-top">
                <h3>One-Time Trash Day</h3>
                <div className="cs-service-price">$39</div>
              </div>
              <p>
                One scheduled rollout and post-collection return for up to 3 bins. Available
                inside active route areas, subject to scheduling capacity.
              </p>
            </article>

            <article className="cs-service-card">
              <div className="cs-service-top">
                <h3>Bulk Pickup Coordination</h3>
                <div className="cs-service-price">from $49</div>
              </div>
              <p>
                We review item photos, coordinate the eligible municipal appointment, provide
                placement instructions and monitor the scheduled pickup. Physical curb placement
                is quoted separately.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="cs-subsection" aria-labelledby="guidelines-title">
        <div className="cs-shell">
          <header className="cs-subsection-title">
            <h2 id="guidelines-title">Straightforward service guidelines.</h2>
            <p>The necessary boundaries, consolidated in one place instead of scattered under every feature.</p>
          </header>

          <div className="cs-guidelines">
            <details className="cs-details" open>
              <summary>What counts as a covered collection day?</summary>
              <div className="cs-details-body">
                <p>
                  A covered collection day is a regular trash or recycling pickup scheduled for
                  the property. Home covers one regular collection day per week. Complete covers
                  all regular collection days at the address. Trash and recycling are included
                  when they fall within the plan’s covered days.
                </p>
              </div>
            </details>

            <details className="cs-details">
              <summary>Standard access and unusual properties</summary>
              <div className="cs-details-body">
                <p>
                  Published prices assume ordinary residential access and work that can be
                  completed safely during the scheduled route. Restricted entry, unusually long
                  access routes, extreme grades, shared-bin arrangements or conditions requiring
                  materially more labor may require an access review or custom quote.
                </p>
              </div>
            </details>

            <details className="cs-details">
              <summary>Javelina, wind and cleanup limits</summary>
              <div className="cs-details-body">
                <p>
                  If we discover an overturned bin or minor immediate spill during a scheduled
                  visit, we will upright the bin, recover the minor spill and document the corrected
                  condition. Widespread debris, hazardous materials, excessive cleanup or a separate
                  dispatch is outside standard service and may be quoted separately.
                </p>
              </div>
            </details>

            <details className="cs-details">
              <summary>Billing, pauses and cancellation</summary>
              <div className="cs-details-body">
                <p>
                  Monthly service renews monthly. Discounted quarterly pricing is prepaid by ACH
                  and renews every three months. There is no long-term service contract. Customers
                  may pause service or cancel a future renewal through their account; changes apply
                  to the next unperformed service cycle.
                </p>
              </div>
            </details>

            <details className="cs-details">
              <summary>What CurbSitter does not include</summary>
              <div className="cs-details-body">
                <p>
                  CurbSitter manages residential bin placement and related documentation. Standard
                  plans do not include transporting waste off the property, municipal collection
                  charges, junk hauling, hazardous-material handling, security monitoring or full
                  property-management services.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="cs-subsection">
        <div className="cs-shell">
          <div className="cs-cta">
            <div>
              <h2>Ready to stop thinking about trash day?</h2>
              <p>Check your address and see which plan matches the property’s collection schedule.</p>
            </div>
            <Link className="cs-button cs-button-primary" href="/signup">
              Check availability
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
