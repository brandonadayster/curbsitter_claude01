import type { Metadata } from "next";

import { LegalPage } from "../legal-layout";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <h2>What we collect</h2>
      <p>
        Account and contact details, service addresses, property and access instructions, service
        photos, communication preferences and consent records, and billing metadata processed by
        our payment provider. We do not store card numbers.
      </p>
      <h2>How we protect it</h2>
      <p>
        Service photos are stored in private storage and shared only through short-lived signed
        links after authorization. Gate, garage, and lockbox details are stored separately from
        ordinary notes, encrypted, restricted to the assigned task at service time, and excluded
        from analytics, logs, and notifications.
      </p>
      <h2>What we never do</h2>
      <p>
        We do not sell personal information, publish property photos, run facial recognition, or
        send marketing SMS without separate explicit consent.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Proof photos are retained for a limited period (default 180 days) and access data for the
        life of the account plus a short closure window. Customers may request deletion subject
        to legal and operational requirements.
      </p>
    </LegalPage>
  );
}
