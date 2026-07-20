import { getSessionInfo } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { updatePreferences } from "./actions";

export const metadata = { title: "Notification Preferences" };
export const dynamic = "force-dynamic";

/** Latest granted state for a channel+purpose from the append-only consent log. */
async function latestConsent(
  email: string,
  channel: string,
  purpose: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("consents")
    .select("granted")
    .eq("email", email.toLowerCase())
    .eq("channel", channel)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.granted ?? false;
}

export default async function NotificationsPage() {
  const session = (await getSessionInfo())!;
  const email = session.email ?? "";

  const [marketingEmail, smsTransactional] = await Promise.all([
    latestConsent(email, "email", "marketing"),
    latestConsent(email, "sms", "transactional"),
  ]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Notification preferences</h1>
      <p className="mt-2 text-base text-muted">
        Service emails — confirmations, exceptions, and schedule changes — are always on so you
        never miss trash day. These are the optional extras.
      </p>

      <form action={updatePreferences} className="mt-6 max-w-xl space-y-5 rounded-2xl border border-border bg-surface p-6">
        <label className="flex items-start gap-3 text-lg">
          <input
            type="checkbox"
            name="marketingEmail"
            defaultChecked={marketingEmail}
            className="mt-1 h-5 w-5 accent-[var(--color-cyan)]"
          />
          <span>
            Email me occasional CurbSitter news beyond service updates.
            <span className="mt-0.5 block text-base text-muted">Route openings, seasonal tips, referral news.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-lg">
          <input
            type="checkbox"
            name="smsTransactional"
            defaultChecked={smsTransactional}
            className="mt-1 h-5 w-5 accent-[var(--color-cyan)]"
          />
          <span>
            Text me service updates.
            <span className="mt-0.5 block text-base text-muted">
              Message and data rates may apply; reply STOP to opt out. SMS sending is being
              enabled — your preference is recorded now and honored as soon as it goes live.
            </span>
          </span>
        </label>

        <button
          type="submit"
          className="rounded-lg bg-cyan px-5 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong"
        >
          Save preferences
        </button>
      </form>

      <p className="mt-4 text-base text-muted">
        We record each preference change with a timestamp so your consent history is auditable.
        We never sell your information.
      </p>
    </>
  );
}
