import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Your Account" };

export default async function CustomerHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("account_members")
    .select("account_id, role, accounts(name)")
    .eq("profile_id", user.id);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, status, plan_id, billing_interval, properties(address_line1, city)");

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Your account</h1>
      <p className="mt-2 text-lg text-muted">{user.email}</p>

      <section className="mt-8">
        <h2 className="text-2xl font-bold">Service status</h2>
        {subscriptions && subscriptions.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {subscriptions.map((subscription) => {
              const property = Array.isArray(subscription.properties)
                ? subscription.properties[0]
                : subscription.properties;
              return (
                <li key={subscription.id} className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-lg font-semibold">
                    {property ? `${property.address_line1}, ${property.city}` : "Property pending"}
                  </p>
                  <p className="mt-1 text-base text-muted">
                    {subscription.plan_id === "home" ? "CurbSitter Home" : "CurbSitter Complete"} ·{" "}
                    {subscription.billing_interval} ·{" "}
                    {subscription.status === "pending_serviceability_review"
                      ? "Pending property and route review"
                      : subscription.status}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
            <p className="text-lg text-muted">
              No service is set up yet.{" "}
              <Link href="/#address-check" className="text-cyan underline">
                Check your address
              </Link>{" "}
              to get started.
            </p>
          </div>
        )}
      </section>

      {memberships && memberships.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-2xl font-bold">Accounts</h2>
          <ul className="mt-4 space-y-2">
            {memberships.map((membership) => {
              const account = Array.isArray(membership.accounts)
                ? membership.accounts[0]
                : membership.accounts;
              return (
                <li key={membership.account_id} className="text-lg text-muted">
                  {account?.name ?? "Account"} — {membership.role}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-base text-muted">
        Service history, proof photos, billing management, and instruction updates arrive here as
        the customer portal build-out continues (Phase 5).
      </p>
    </main>
  );
}
