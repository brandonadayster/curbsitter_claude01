import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { DEV_USERS, E2E } from "./ids";

/**
 * Service-role provisioning for E2E fixtures. Idempotent: deletes any prior
 * E2E data (by fixed IDs) and recreates a known scenario — an active customer
 * with history + proof, and a live assigned runner task.
 */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("E2E requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function daysAgoIso(days: number, hour = 12): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export async function teardownE2E(db: SupabaseClient): Promise<void> {
  // Own the dev customer's data completely: delete every account they belong to
  // (cascades to properties, subscriptions, cycles, tasks, photos, exceptions,
  // contacts, schedules) so runs are deterministic even on a dirty local DB.
  // Dev users only ever hold E2E-provisioned data.
  const { data: memberships } = await db
    .from("account_members")
    .select("account_id")
    .eq("profile_id", DEV_USERS.customer.id);
  const accountIds = [
    ...new Set([...(memberships ?? []).map((m) => m.account_id), E2E.accountId]),
  ];
  if (accountIds.length > 0) {
    await db.from("accounts").delete().in("id", accountIds);
  }
  // Support tickets survive account deletion (account_id ON DELETE SET NULL),
  // so clear the dev customer's tickets too.
  await db.from("support_tickets").delete().eq("opened_by", DEV_USERS.customer.id);
  // Any waitlist leads created by tests using the E2E marker email domain.
  await db.from("waitlist_leads").delete().ilike("email", "%@e2e.curbsitter.test");
}

export async function provisionE2E(db: SupabaseClient): Promise<void> {
  await teardownE2E(db);

  await db.from("accounts").insert({
    id: E2E.accountId,
    name: "Playwright Household",
    account_type: "individual",
    stripe_customer_id: "cus_e2e_playwright",
    created_by: DEV_USERS.customer.id,
  });

  await db.from("account_members").insert({
    account_id: E2E.accountId,
    profile_id: DEV_USERS.customer.id,
    role: "owner",
  });

  await db.from("contacts").insert({
    id: E2E.contactId,
    account_id: E2E.accountId,
    kind: "payer",
    full_name: "Playwright Customer",
    email: DEV_USERS.customer.email,
  });

  await db.from("properties").insert({
    id: E2E.propertyId,
    account_id: E2E.accountId,
    address_line1: E2E.address,
    city: E2E.city,
    postal_code: E2E.postalCode,
    status: "active",
  });

  await db.from("property_instructions").insert({
    property_id: E2E.propertyId,
    bin_storage_location: "Side gate, left of garage",
    curb_placement_notes: "Right of the driveway",
  });

  await db.from("bins").insert([
    { property_id: E2E.propertyId, bin_type: "trash" },
    { property_id: E2E.propertyId, bin_type: "recycling" },
  ]);

  await db.from("collection_schedules").insert({
    id: E2E.scheduleId,
    property_id: E2E.propertyId,
    provider: "City of Prescott",
    waste_stream: "trash",
    weekday: 3,
    verification_status: "verified",
  });

  await db.from("subscriptions").insert({
    id: E2E.subscriptionId,
    account_id: E2E.accountId,
    property_id: E2E.propertyId,
    plan_id: "home",
    billing_interval: "monthly",
    status: "active",
    stripe_subscription_id: "sub_e2e_playwright",
  });

  // Completed historical cycle with proof photos + a resolved exception.
  await db.from("collection_cycles").insert({
    id: E2E.historyCycleId,
    property_id: E2E.propertyId,
    schedule_id: E2E.scheduleId,
    collection_date: isoDate(-7),
    state: "completed_with_exception",
  });

  await db.from("service_tasks").insert([
    {
      id: E2E.rolloutTaskId,
      property_id: E2E.propertyId,
      cycle_id: E2E.historyCycleId,
      task_type: "rollout",
      status: "completed",
      completed_at: daysAgoIso(8, 19),
    },
    {
      id: E2E.returnTaskId,
      property_id: E2E.propertyId,
      cycle_id: E2E.historyCycleId,
      task_type: "return",
      status: "completed",
      completed_at: daysAgoIso(7, 16),
    },
  ]);

  const rolloutPath = `tasks/${E2E.rolloutTaskId}/rollout_proof-e2e.jpg`;
  const returnPath = `tasks/${E2E.returnTaskId}/return_proof-e2e.jpg`;

  // The proof objects must exist in storage so signed-URL minting succeeds.
  const jpeg = Buffer.from(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64",
  );
  for (const objectPath of [rolloutPath, returnPath]) {
    await db.storage.from("proof-photos").upload(objectPath, jpeg, {
      contentType: "image/jpeg",
      upsert: true,
    });
  }

  await db.from("service_photos").insert([
    {
      id: E2E.rolloutPhotoId,
      task_id: E2E.rolloutTaskId,
      photo_type: "rollout_proof",
      object_path: rolloutPath,
      taken_at: daysAgoIso(8, 19),
      uploaded_by: DEV_USERS.runner.id,
    },
    {
      id: E2E.returnPhotoId,
      task_id: E2E.returnTaskId,
      photo_type: "return_proof",
      object_path: returnPath,
      taken_at: daysAgoIso(7, 16),
      uploaded_by: DEV_USERS.runner.id,
    },
  ]);

  await db.from("exceptions").insert({
    id: E2E.exceptionId,
    task_id: E2E.returnTaskId,
    cycle_id: E2E.historyCycleId,
    exception_type: "bin_blocked",
    description: "A parked car was over the bin pad; placed bins at the nearest clear spot.",
    status: "resolved",
    resolution: "Confirmed with customer; noted alternate placement.",
    customer_visible: true,
    resolved_at: daysAgoIso(7, 17),
  });

  // Live cycle with an assigned rollout task the runner completes in a test.
  await db.from("collection_cycles").insert({
    id: E2E.liveCycleId,
    property_id: E2E.propertyId,
    schedule_id: E2E.scheduleId,
    collection_date: isoDate(1),
    state: "rollout_scheduled",
  });

  await db.from("service_tasks").insert({
    id: E2E.liveRolloutTaskId,
    property_id: E2E.propertyId,
    cycle_id: E2E.liveCycleId,
    task_type: "rollout",
    status: "assigned",
    assigned_runner_id: DEV_USERS.runner.id,
    window_start: `${isoDate(0)}T17:00:00-07:00`,
    window_end: `${isoDate(0)}T22:00:00-07:00`,
  });

  // Delayed cycle with an open exception for the admin resolution test.
  await db.from("collection_cycles").insert({
    id: E2E.openCycleId,
    property_id: E2E.propertyId,
    schedule_id: E2E.scheduleId,
    collection_date: isoDate(-1),
    state: "delayed_by_hauler",
  });

  await db.from("service_tasks").insert({
    id: E2E.openExceptionTaskId,
    property_id: E2E.propertyId,
    cycle_id: E2E.openCycleId,
    task_type: "return",
    status: "exception",
    assigned_runner_id: DEV_USERS.runner.id,
  });

  await db.from("exceptions").insert({
    id: E2E.openExceptionId,
    task_id: E2E.openExceptionTaskId,
    cycle_id: E2E.openCycleId,
    exception_type: "hauler_missed",
    description: "Truck never came down the street.",
    status: "open",
    customer_visible: true,
  });

  // Independent assigned task for the mobile-viewport spec.
  await db.from("collection_cycles").insert({
    id: E2E.mobileCycleId,
    property_id: E2E.propertyId,
    schedule_id: E2E.scheduleId,
    collection_date: isoDate(2),
    state: "rollout_scheduled",
  });

  await db.from("service_tasks").insert({
    id: E2E.mobileTaskId,
    property_id: E2E.propertyId,
    cycle_id: E2E.mobileCycleId,
    task_type: "rollout",
    status: "assigned",
    assigned_runner_id: DEV_USERS.runner.id,
    window_start: `${isoDate(1)}T17:00:00-07:00`,
    window_end: `${isoDate(1)}T22:00:00-07:00`,
  });
}
