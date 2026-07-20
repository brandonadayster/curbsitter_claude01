import type { Metadata } from "next";

import { LoginForm } from "@/components/site/login-form";
import { PageHero, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your CurbSitter account.",
};

export default function LoginPage() {
  return (
    <>
      <PageHero eyebrow="Customers, runners & staff" title="Sign in">
        <p>We&apos;ll email you a secure sign-in link — no password to remember.</p>
      </PageHero>
      <Section>
        <LoginForm />
      </Section>
    </>
  );
}
