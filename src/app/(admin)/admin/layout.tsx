import Link from "next/link";

import { requireStaff } from "@/lib/auth";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/route-cells", label: "Route Cells" },
  { href: "/admin/map", label: "Map" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/cycles", label: "Cycles & Routes" },
  { href: "/admin/exceptions", label: "Exceptions" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/notifications", label: "Outbox" },
  { href: "/admin/support", label: "Support" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaff();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
  <Link href="/admin" className="shrink-0 font-bold">
    Curb<span className="text-cyan">Sitter</span>{" "}
    <span className="text-muted">Ops</span>
  </Link>
  <nav aria-label="Admin" className="flex min-w-0 items-center gap-4 overflow-x-auto">
    {ADMIN_NAV.map((item) => (
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
<form action="/auth/signout" method="post" className="flex shrink-0 items-center gap-3">
  <p className="hidden text-base text-muted sm:block">{session.email}</p>
            <button type="submit" className="text-base text-muted underline hover:text-text">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
