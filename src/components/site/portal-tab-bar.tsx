"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Gift, House, Images } from "lucide-react";

/**
 * Mobile-only bottom tab bar for the customer portal.
 *
 * The portal's primary audience skews senior and mobile-first, so the four
 * most-used destinations get permanent, thumb-reachable, icon-plus-label
 * targets rather than a horizontally-scrolling row of text links (which
 * required sideways scrolling to reach later items and gave link-sized hit
 * areas below the 44x44px rule in FRONTEND_GUIDELINES.md).
 *
 * Deliberately no hamburger or hidden drawer: every primary destination is
 * visible at all times. Secondary destinations (notifications, support) stay
 * as visible in-page links rather than hiding behind a "More" menu.
 *
 * Hidden at `sm` and up, where the header nav is already comfortable.
 */

const TABS = [
  { href: "/app", label: "Home", Icon: House },
  { href: "/app/history", label: "History", Icon: Images },
  { href: "/app/billing", label: "Billing", Icon: CreditCard },
  { href: "/app/referrals", label: "Refer", Icon: Gift },
] as const;

function isActive(pathname: string, href: string): boolean {
  // "/app" must not light up for every nested route.
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="flex">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-sm font-medium ${
                  active ? "text-cyan" : "text-muted"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  size={24}
                  strokeWidth={active ? 2.5 : 2}
                  className="shrink-0"
                />
                {label}
                {/* Active state is not carried by color alone (WCAG 1.4.1 /
                    FRONTEND_GUIDELINES "do not rely on color alone"): the
                    label weight, icon stroke, and this underline all shift,
                    and aria-current exposes it non-visually. */}
                <span
                  aria-hidden="true"
                  className={`block h-0.5 w-6 rounded-full ${active ? "bg-cyan" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
