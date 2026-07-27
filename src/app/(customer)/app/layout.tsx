import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionInfo } from "@/lib/auth";

const PORTAL_NAV = [
  { href: "/app", label: "Overview" },
  { href: "/app/history", label: "Service History" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/referrals", label: "Referrals" },
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
        <div className="mx-auto flex h-14 max-w-5xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5 overflow-x-auto">
            <Link href="/" className="shrink-0 font-bold">
              Curb<span className="text-cyan">Sitter</span>
            </Link>
            <nav aria-label="Account" className="flex items-center gap-4">
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
            <button type="submit" className="text-base text-muted underline hover:text-text">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
