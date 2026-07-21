/**
 * Deterministic fixed IDs for the E2E scenario. global-setup wipes and
 * recreates this data before each run so tests are reproducible. The dev user
 * IDs come from the committed seed (supabase/seed/seed.sql).
 */
export const DEV_USERS = {
  admin: {
    id: "d0000000-0000-4000-8000-000000000001",
    email: "admin@curbsitter.test",
  },
  runner: {
    id: "d0000000-0000-4000-8000-000000000002",
    email: "runner@curbsitter.test",
  },
  customer: {
    id: "d0000000-0000-4000-8000-000000000003",
    email: "customer@curbsitter.test",
  },
} as const;

export const DEV_PASSWORD = "devpassword123";

export const E2E = {
  accountId: "e2e00000-0000-4000-8000-000000000001",
  propertyId: "e2e00000-0000-4000-8000-000000000002",
  subscriptionId: "e2e00000-0000-4000-8000-000000000003",
  contactId: "e2e00000-0000-4000-8000-0000000000c1",
  scheduleId: "e2e00000-0000-4000-8000-0000000000d1",
  // Completed historical cycle (proof + resolved exception).
  historyCycleId: "e2e00000-0000-4000-8000-0000000000e1",
  rolloutTaskId: "e2e00000-0000-4000-8000-0000000000f1",
  returnTaskId: "e2e00000-0000-4000-8000-0000000000f2",
  rolloutPhotoId: "e2e00000-0000-4000-8000-0000000000a1",
  returnPhotoId: "e2e00000-0000-4000-8000-0000000000a2",
  exceptionId: "e2e00000-0000-4000-8000-0000000000c9",
  // Live cycle with an assigned rollout task the runner will complete.
  liveCycleId: "e2e00000-0000-4000-8000-0000000000e2",
  liveRolloutTaskId: "e2e00000-0000-4000-8000-0000000000f3",
  // Delayed cycle with an OPEN exception the admin resolves.
  openCycleId: "e2e00000-0000-4000-8000-0000000000e3",
  openExceptionTaskId: "e2e00000-0000-4000-8000-0000000000f4",
  openExceptionId: "e2e00000-0000-4000-8000-0000000000ca",
  // Separate assigned task for the mobile-viewport spec (kept independent of
  // the completion spec so run order can't interfere).
  mobileCycleId: "e2e00000-0000-4000-8000-0000000000e4",
  mobileTaskId: "e2e00000-0000-4000-8000-0000000000f5",
  address: "88 Playwright Way",
  city: "Prescott",
  postalCode: "86303",
} as const;
