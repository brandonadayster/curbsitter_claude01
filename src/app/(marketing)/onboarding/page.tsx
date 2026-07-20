import type { Metadata } from "next";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Get Started",
  description: "Set up CurbSitter service in four short steps.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ check?: string; token?: string }>;
}) {
  const { check, token } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <OnboardingFlow eligibilityCheckId={check} existingToken={token} />
    </div>
  );
}
