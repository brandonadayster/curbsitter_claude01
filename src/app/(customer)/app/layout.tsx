import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalTabBar } from "@/components/site/portal-tab-bar";
import { getSessionInfo } from "@/lib/auth";

const PORTAL_NAV = [
  { href: "/app", label: "Overview" },
  { href: "/app/history", label: "Service History" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/referrals", label: "Referrals" },
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/support", label: "Support" },
];

/**
 * Destinations the mobile tab bar doesn't carry. Shown as full-width,
 * touch-sized links at the end of the page on small screens so they stay
 * discoverable without a hidden "More" menu.
 */
const SECONDARY_NAV = [
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/support", label: "Support" },
];

export default async function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionInfo();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <Link href="/" className="shrink-0 font-bold">
              Curb<span className="text-cyan">Sitter</span>
            </Link>
            {/* Full nav from `sm` up; below that the bottom tab bar carries
                the primary destinations and SECONDARY_NAV carries the rest. */}
            <nav aria-label="Account" className="hidden items-center gap-4 sm:flex">
              {PORTAL_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="whitespace-nowrap text-base text-muted hover:text-text"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-[44px] items-center text-base text-muted underline hover:text-text"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Bottom padding on mobile keeps the fixed tab bar from covering the
          end of the page content. */}
      <main className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-6 sm:pb-8">
        {children}

        <nav aria-label="More" className="mt-10 border-t border-border pt-4 sm:hidden">
          <ul>
            {SECONDARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[44px] items-center text-base text-muted hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <PortalTabBar />
    </div>
  );
}
