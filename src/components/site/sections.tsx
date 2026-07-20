import Link from "next/link";

export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        {eyebrow ? (
          <p className="text-base font-semibold uppercase tracking-wide text-cyan">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {children ? <div className="mt-5 max-w-2xl text-xl text-muted">{children}</div> : null}
      </div>
    </section>
  );
}

export function Section({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto max-w-4xl px-4 py-12 sm:px-6 ${className}`}>
      {title ? <h2 className="text-3xl font-bold tracking-tight">{title}</h2> : null}
      <div className={title ? "mt-6" : ""}>{children}</div>
    </section>
  );
}

export function CtaBand({
  title = "Never miss trash day again.",
  ctaLabel = "Check My Address",
  ctaHref = "/#address-check",
}: {
  title?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-5 px-4 py-14 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        <Link
          href={ctaHref}
          className="rounded-lg bg-cyan px-6 py-3.5 text-lg font-semibold text-bg transition-colors hover:bg-cyan-strong"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-lg">
          <svg
            className="mt-1.5 h-5 w-5 shrink-0 text-success"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function InfoCard({
  title,
  children,
  href,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="h-full rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-cyan/50">
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="mt-2 text-base text-muted">{children}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
