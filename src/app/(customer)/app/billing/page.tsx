import { formatCents, getPlanPriceCents, PLANS, type PlanId } from "@/config/business";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { changeSubscription, openBillingPortal } from "./actions";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending_serviceability_review: "Pending property and route review",
  active: "Active",
  paused: "Paused",
  past_due: "Payment past due",
  cancelled: "Cancelled",
  declined: "Not serviceable",
};

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient();
  const billingConfigured = getStripe() !== null;

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "id, status, plan_id, billing_interval, cancel_at_period_end, current_period_end, account_id, properties(address_line1, city)",
    )
    .order("created_at");

  const accountId = subscriptions?.[0]?.account_id ?? null;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
      <p className="mt-2 text-base text-muted">
        Pause, resume, or cancel a future renewal anytime. Changes apply to your next unperformed
        service cycle and future renewals — never to service already completed.
      </p>

      {!subscriptions || subscriptions.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg text-muted">
          No subscriptions on file.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {subscriptions.map((subscription) => {
            const property = Array.isArray(subscription.properties)
              ? subscription.properties[0]
              : subscription.properties;
            const plan = PLANS[subscription.plan_id as PlanId];
            const priceCents = plan
              ? getPlanPriceCents(subscription.plan_id as PlanId, subscription.billing_interval)
              : null;
            return (
              <li key={subscription.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{plan?.publicName ?? subscription.plan_id}</h2>
                    <p className="mt-1 text-base text-muted">
                      {property?.address_line1}, {property?.city}
                    </p>
                    <p className="mt-2 text-lg">
                      {priceCents !== null ? formatCents(priceCents) : "—"}
                      <span className="text-base text-muted">
                        {subscription.billing_interval === "monthly"
                          ? "/month"
                          : "/quarter, prepaid (billed every 3 months)"}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-base text-muted">
                    {STATUS_LABELS[subscription.status] ?? subscription.status}
                    {subscription.cancel_at_period_end ? " · cancels at renewal" : ""}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  {subscription.status === "active" ? (
                    <form action={changeSubscription}>
                      <input type="hidden" name="subscriptionId" value={subscription.id} />
                      <input type="hidden" name="action" value="pause" />
                      <button type="submit" className="rounded-lg border border-border px-4 py-2 text-base font-semibold hover:border-cyan/60">
                        Pause service
                      </button>
                    </form>
                  ) : null}
                  {subscription.status === "paused" ? (
                    <form action={changeSubscription}>
                      <input type="hidden" name="subscriptionId" value={subscription.id} />
                      <input type="hidden" name="action" value="resume" />
                      <button type="submit" className="rounded-lg bg-cyan px-4 py-2 text-base font-semibold text-bg hover:bg-cyan-strong">
                        Resume service
                      </button>
                    </form>
                  ) : null}
                  {["active", "paused"].includes(subscription.status) ? (
                    subscription.cancel_at_period_end ? (
                      <form action={changeSubscription}>
                        <input type="hidden" name="subscriptionId" value={subscription.id} />
                        <input type="hidden" name="action" value="uncancel" />
                        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-base font-semibold hover:border-cyan/60">
                          Keep my service
                        </button>
                      </form>
                    ) : (
                      <form action={changeSubscription}>
                        <input type="hidden" name="subscriptionId" value={subscription.id} />
                        <input type="hidden" name="action" value="cancel" />
                        <button type="submit" className="rounded-lg border border-danger/50 px-4 py-2 text-base font-semibold text-danger hover:bg-danger/10">
                          Cancel at renewal
                        </button>
                      </form>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Payment method &amp; invoices</h2>
        {billingConfigured && accountId ? (
          <form action={openBillingPortal} className="mt-3">
            <input type="hidden" name="accountId" value={accountId} />
            <button type="submit" className="rounded-lg bg-cyan px-5 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong">
              Open billing portal
            </button>
          </form>
        ) : (
          <p className="mt-2 text-base text-muted">
            Card and invoice self-service opens once your billing profile is fully set up. In the
            meantime, reach us through support for any payment changes.
          </p>
        )}
      </section>
    </>
  );
}
