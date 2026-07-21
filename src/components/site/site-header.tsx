"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/service-areas", label: "Service Areas" },
  { href: "/who-we-help", label: "Who We Help" },
  { href: "/hoa", label: "For HOAs" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Curb<span className="text-cyan">Sitter</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base text-muted transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-base text-muted hover:text-text">
            Sign In
          </Link>
          <Link
            href="/#address-check"
            className="rounded-lg bg-cyan px-4 py-2.5 text-base font-semibold text-bg transition-colors hover:bg-cyan-strong"
          >
            Check My Address
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-border p-2.5 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-border bg-surface px-4 py-4 lg:hidden">
          <ul className="flex flex-col gap-1">
            {[...NAV_LINKS, { href: "/login", label: "Sign In" }].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-3 text-lg hover:bg-surface-2"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/#address-check"
                className="block rounded-lg bg-cyan px-4 py-3 text-center text-lg font-semibold text-bg"
                onClick={() => setOpen(false)}
              >
                Check My Address
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
