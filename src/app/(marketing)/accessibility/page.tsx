import type { Metadata } from "next";

import { LegalPage } from "../legal-layout";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility Statement">
      <h2>Our commitment</h2>
      <p>
        CurbSitter serves many older customers, and accessibility is a design requirement, not an
        afterthought. We build to WCAG 2.2 AA intent: readable type (16px minimum body text),
        strong contrast, visible focus indicators, keyboard operability, honest error messages,
        and reduced-motion support.
      </p>
      <h2>Known limitations</h2>
      <p>
        The product is in active development; some pages and flows are still being audited with
        assistive technology.
      </p>
      <h2>Feedback</h2>
      <p>
        If anything on this site is hard to use with your assistive technology, please tell us
        through the contact page — we treat accessibility reports as bugs, not suggestions.
      </p>
    </LegalPage>
  );
}
