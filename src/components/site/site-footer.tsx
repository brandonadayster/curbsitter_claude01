import Link from "next/link";

import { BUSINESS } from "@/config/business";

const FOOTER_GROUPS = [
  {
    heading: "Service",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/trash-day-ondemand", label: "One-Time Trash Day" },
      { href: "/bulk-trash-pickup", label: "Bulk Pickup Coordination" },
      { href: "/service-areas", label: "Service Areas" },
    ],
  },
  {
    heading: "Who We Help",
    links: [
      { href: "/seniors", label: "Seniors & Caregivers" },
      { href: "/snowbirds", label: "Snowbirds & Travelers" },
      { href: "/vacation-rentals", label: "Vacation Rentals" },
      { href: "/hoa", label: "HOAs & Communities" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/waitlist", label: "Waitlist" },
      { href: "/login", label: "Sign In" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/sms-terms", label: "SMS Terms" },
      { href: "/accessibility", label: "Accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <p className="text-lg font-bold">
            Curb<span className="text-cyan">Sitter</span>
          </p>
          <p className="mt-2 text-base text-muted">
            {BUSINESS.primaryTagline} {BUSINESS.serviceLine}
          </p>
          <p className="mt-4 text-base text-muted">{BUSINESS.market}</p>
        </div>
        {FOOTER_GROUPS.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h2 className="text-base font-semibold">{group.heading}</h2>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-base text-muted hover:text-text">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border py-6">
        <p className="mx-auto max-w-6xl px-4 text-base text-muted sm:px-6">
          © {new Date().getFullYear()} {BUSINESS.name}. CurbSitter moves bins to and from the
          curb; it does not collect, transport, or dispose of waste.
        </p>
      </div>
    </footer>
  );
}
