import type { PersonaContent } from "@/lib/personas";

/**
 * Benefits and FAQs matched to the visitor's persona, shown alongside the
 * signup questions so an unanswered doubt doesn't become an abandoned signup.
 *
 * Purely presentational — it never gates or branches the form. Content comes
 * from `src/lib/personas.ts`, which sources only already-approved public copy;
 * there are deliberately no testimonials or counts here (AGENTS.md bans
 * fabricated social proof, and CurbSitter is pre-launch).
 */
export function PersonaPanel({ persona }: { persona: PersonaContent }) {
  return (
    <aside aria-label="What this means for you" className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-bold">{persona.headline}</h2>

      <ul className="mt-4 space-y-2">
        {persona.benefits.map((benefit) => (
          <li key={benefit} className="flex gap-2 text-base text-muted">
            <span aria-hidden="true" className="mt-0.5 text-success">
              ✓
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-base font-semibold">Common questions</h3>
      <dl className="mt-2 space-y-3">
        {persona.faqs.map((faq) => (
          <div key={faq.q}>
            <dt className="text-base font-medium">{faq.q}</dt>
            <dd className="mt-1 text-base text-muted">{faq.a}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
