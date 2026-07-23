"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { processOutbox } from "@/lib/notifications";

export async function runOutboxNow(): Promise<void> {
  await assertRole(["admin", "dispatcher"]);
  await processOutbox();
  revalidatePath("/admin/notifications");
}
