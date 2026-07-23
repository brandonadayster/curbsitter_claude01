import { PageHero, Section } from "@/components/site/sections";

/**
 * Shared shell for legal pages. All legal content is a working draft pending
 * owner/counsel review (OPEN_DECISIONS #10) and must be finalized before
 * production launch (TODO P7-05).
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} />
      <Section>
        <div className="max-w-3xl space-y-5 text-lg text-muted [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-text">
          <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base text-warning">
            Draft policy — under legal review prior to public launch. Not yet a binding
            agreement.
          </p>
          {children}
        </div>
      </Section>
    </>
  );
}
