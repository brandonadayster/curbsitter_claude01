import type { Metadata } from "next";

import { ContactForm } from "@/components/site/contact-form";
import { PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about service, HOA pilots, or bulk pickup coordination? Reach the CurbSitter team.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Sales & support" title="Talk to CurbSitter">
        <p>
          Questions about service, HOA and portfolio proposals, or bulk pickup coordination —
          send a note and we&apos;ll get back to you promptly.
        </p>
      </PageHero>
      <Section>
        <ContactForm />
      </Section>
    </>
  );
}
