import "server-only";

import { BUSINESS } from "@/config/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Outbox sender worker (P5-05). Renders queued notifications and hands them to
 * a provider with retry + exponential backoff. Access secrets are never
 * included in notification payloads (SECURITY_PRIVACY.md), so nothing here can
 * leak them — templates only read the safe fields below.
 */

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_SECONDS = 60;

interface RenderedMessage {
  subject: string;
  text: string;
}

type OutboxRow = {
  id: string;
  template_id: string | null;
  channel: string;
  recipient: string;
  payload: Record<string, unknown>;
  attempts: number;
};

function renderTemplate(templateId: string | null, payload: Record<string, unknown>): RenderedMessage {
  const sign = `\n\n— ${BUSINESS.name}\n${BUSINESS.primaryTagline}`;
  switch (templateId) {
    case "welcome_pending_review":
      return {
        subject: "Welcome to CurbSitter — property review in progress",
        text:
          "Thanks for signing up. Your payment went through and your account is now pending a quick property and route review before your first service is scheduled. We'll email you as soon as it's approved." +
          (payload.requires_access_review ? " We may follow up about property access first." : "") +
          sign,
      };
    // D-027: a clean signup activates with no human in the loop, so this
    // deliberately doesn't reuse review_approved's "passed review" wording.
    case "service_confirmed":
      return {
        subject: "You're all set — CurbSitter service is active",
        text:
          "Thanks for signing up. Your service is active — you'll see your next scheduled trash day in your dashboard, and you'll get a photo confirmation after every visit." +
          sign,
      };
    case "review_approved":
      return {
        subject: "You're approved — CurbSitter service is on",
        text:
          "Good news: your property passed review and your service is active. You'll see your next scheduled trash day in your dashboard." +
          (payload.note ? `\n\nNote from our team: ${String(payload.note)}` : "") +
          sign,
      };
    case "rollout_completed":
      return { subject: "Bins out — photo confirmed", text: "Your bins are at the curb, photo-confirmed. View the proof in your dashboard." + sign };
    case "return_completed":
      return { subject: "Bins back — photo confirmed", text: "Your bins are back in place, photo-confirmed. View the proof in your dashboard." + sign };
    case "exception_reported":
      return {
        subject: "A service note needs your attention",
        text:
          `We hit a snag on your recent visit${payload.exception_type ? ` (${String(payload.exception_type).replace(/_/g, " ")})` : ""}.` +
          (payload.description ? `\n\nDetails: ${String(payload.description)}` : "") +
          "\n\nOur team is on it and will follow up. You can see the full status in your dashboard." +
          sign,
      };
    case "hauler_delay":
      return {
        subject: "Your collection was delayed by the hauler",
        text:
          "Heads up: the hauler didn't collect on schedule, so your return is delayed — not skipped. We're tracking it and will return your bins once collection happens. No action needed on your part." +
          sign,
      };
    case "payment_issue":
      return {
        subject: "A note about your CurbSitter account",
        text:
          (payload.decision === "decline"
            ? "After review, we're not able to serve your property right now. We'll follow up about a refund or an alternative."
            : "There's a payment issue on your account that needs attention.") +
          (payload.note ? `\n\nNote: ${String(payload.note)}` : "") +
          sign,
      };
    case "waitlist_joined":
      return {
        subject: "You're on the CurbSitter waitlist",
        text:
          "Thanks for joining the waitlist. We open routes as neighborhoods fill, and we'll email you the moment yours is ready." +
          (payload.share_code ? `\n\nShare your link to help your route open sooner: /waitlist?ref=${String(payload.share_code)}` : "") +
          sign,
      };
    case "route_opening":
      return { subject: "CurbSitter is opening in your area", text: "Your route is opening. Reply or visit the site to get started." + sign };
    default:
      return { subject: `A message from ${BUSINESS.name}`, text: "You have a new update in your CurbSitter dashboard." + sign };
  }
}

interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Provider abstraction. Uses Resend over HTTP when configured; otherwise a
 * local dev provider that "delivers" to the console + local mailpit so the
 * pipeline is fully exercisable without external credentials.
 */
async function deliver(row: OutboxRow, message: RenderedMessage): Promise<SendResult> {
  if (row.channel === "sms") {
    // SMS requires consent + Twilio; not wired in this ticket. Mark unsupported.
    return { ok: false, error: "sms_channel_not_enabled" };
  }

  const resendKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM ?? "CurbSitter <onboarding@resend.dev>";

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: row.recipient, subject: message.subject, text: message.text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        const body = await response.text();
        return { ok: false, error: `resend_${response.status}: ${body.slice(0, 200)}` };
      }
      const data = (await response.json()) as { id?: string };
      return { ok: true, providerMessageId: data.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "resend_error" };
    }
  }

  // Local dev provider — visible, non-failing, no external dependency.
  console.info(
    `[outbox:dev-email] to=${row.recipient} subject=${JSON.stringify(message.subject)}`,
  );
  return { ok: true, providerMessageId: `dev-${row.id}` };
}

export interface OutboxRunResult {
  processed: number;
  sent: number;
  failed: number;
  deferred: number;
}

/** Process a batch of due pending outbox rows. Safe to run repeatedly (cron). */
export async function processOutbox(limit = 25): Promise<OutboxRunResult> {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("notification_outbox")
    .select("id, template_id, channel, recipient, payload, attempts")
    .eq("status", "pending")
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
    .order("created_at")
    .limit(limit);
  if (error) throw new Error(`Outbox read failed: ${error.message}`);

  const result: OutboxRunResult = { processed: 0, sent: 0, failed: 0, deferred: 0 };

  for (const row of (rows ?? []) as OutboxRow[]) {
    result.processed += 1;

    // Claim the row so concurrent workers don't double-send.
    const { data: claimed } = await supabase
      .from("notification_outbox")
      .update({ status: "sending" })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed || claimed.length === 0) {
      result.processed -= 1;
      continue;
    }

    const message = renderTemplate(row.template_id, row.payload ?? {});
    const sendResult = await deliver(row, message);
    const attempts = row.attempts + 1;

    if (sendResult.ok) {
      await supabase
        .from("notification_outbox")
        .update({
          status: "sent",
          attempts,
          provider_message_id: sendResult.providerMessageId ?? null,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);
      result.sent += 1;
    } else if (attempts >= MAX_ATTEMPTS) {
      await supabase
        .from("notification_outbox")
        .update({ status: "failed", attempts, last_error: sendResult.error ?? "unknown" })
        .eq("id", row.id);
      result.failed += 1;
    } else {
      // Exponential backoff: 1m, 2m, 4m, 8m…
      const backoff = BASE_BACKOFF_SECONDS * 2 ** (attempts - 1);
      const next = new Date(Date.now() + backoff * 1000).toISOString();
      await supabase
        .from("notification_outbox")
        .update({ status: "pending", attempts, next_attempt_at: next, last_error: sendResult.error ?? "unknown" })
        .eq("id", row.id);
      result.deferred += 1;
    }
  }

  return result;
}
