"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { REFERRALS } from "@/config/business";
import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { earnedReferralCentsThisMonth } from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const decideSchema = z.object({
  referralId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

/**
 * Approve or reject a qualified referral's pending credits. Approval moves
 * pending → earned (spendable), enforcing the monthly cap when one is
 * configured; rejection reverses the credits and marks the referral as fraud.
 */
export async function decideReferral(formData: FormData): Promise<void> {
  const session = await assertRole(["admin"]);

  const parsed = decideSchema.safeParse({
    referralId: formData.get("referralId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) throw new Error("Invalid referral decision.");

  const supabase = createSupabaseAdminClient();
  const { data: credits } = await supabase
    .from("credits")
    .select("id, account_id, amount_cents, status")
    .eq("source_referral_id", parsed.data.referralId)
    .eq("kind", "referral");

  if (parsed.data.decision === "reject") {
    await supabase
      .from("credits")
      .update({ status: "reversed" })
      .eq("source_referral_id", parsed.data.referralId)
      .eq("status", "pending");
    await supabase
      .from("referrals")
      .update({ fraud_status: "confirmed_fraud", qualifying_status: "reversed" })
      .eq("id", parsed.data.referralId);
  } else {
    // Approve each pending credit, applying the monthly cap when set.
    const cap = REFERRALS.monthlyCreditCapCents; // null = unconfirmed, no cap yet
    for (const credit of (credits ?? []).filter((c) => c.status === "pending")) {
      if (cap !== null) {
        const already = await earnedReferralCentsThisMonth(credit.account_id);
        if (already + credit.amount_cents > cap) {
          // Over cap this month — leave pending for a later cycle/manual release.
          continue;
        }
      }
      await supabase.from("credits").update({ status: "earned" }).eq("id", credit.id);
    }
    await supabase
      .from("referrals")
      .update({ fraud_status: "none" })
      .eq("id", parsed.data.referralId);
  }

  await auditLog({
    actorId: session.userId,
    action: `referral.${parsed.data.decision}`,
    entity: "referrals",
    entityId: parsed.data.referralId,
  });

  revalidatePath("/admin/referrals");
}
