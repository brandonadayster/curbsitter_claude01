import { z } from "zod";

/**
 * Stage schemas for the four-stage onboarding (APP_FLOW.md). Validated on the
 * client for immediate feedback and revalidated on the server at every save.
 */

export const stage1Schema = z.object({
  addressLine1: z.string().trim().min(4, "Enter the service street address."),
  unit: z.string().trim().max(40).optional().or(z.literal("")),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code."),
  city: z.string().trim().min(2, "Enter the city."),
  servingWho: z.enum(["myself", "family_member", "tenants_or_guests", "hoa_community"]),
  propertyType: z.enum([
    "single_family",
    "condo_townhome",
    "vacation_rental",
    "second_home",
    "hoa_community",
  ]),
});

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Enter a name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{10,15}$/, "Enter a valid phone number.")
    .optional()
    .or(z.literal("")),
});

export const stage2Schema = z
  .object({
    payer: contactSchema,
    /** Required when the service is for someone else. */
    serviceRecipient: contactSchema.optional(),
    additionalNotificationEmails: z
      .array(z.string().trim().email("Enter a valid email address."))
      .max(3)
      .default([]),
    smsOptIn: z.boolean().default(false),
    marketingOptIn: z.boolean().default(false),
    forSomeoneElse: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.forSomeoneElse && !value.serviceRecipient) {
      context.addIssue({
        code: "custom",
        path: ["serviceRecipient", "fullName"],
        message: "Add the service recipient's contact details.",
      });
    }
    if (value.smsOptIn && !value.payer.phone) {
      context.addIssue({
        code: "custom",
        path: ["payer", "phone"],
        message: "Add a mobile number to receive text updates.",
      });
    }
  });

/**
 * D-026: admin no longer reviews gate/garage access notes before first
 * service — nothing about them can be verified from a desk anyway, only a
 * site visit tells you if a code works. This is the replacement guardrail:
 * catch a blank or too-short note at signup, since that's the one thing
 * that actually is checkable before a runner ever shows up.
 */
export const ACCESS_SECRET_MIN_LENGTH = 10;

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const stage3Schema = z
  .object({
    serviceChoice: z.enum(["home", "complete", "one_time_trash_day"]),
    billingInterval: z.enum(["monthly", "quarterly"]).default("monthly"),
    /** Prescott's municipal program is trash + recycling only — no organics stream. */
    hasBothBinTypes: z.boolean(),
    trashBinCount: z.number().int().min(1, "At least one bin.").max(6, "Maximum 6 bins."),
    recyclingBinCount: z.number().int().min(0).max(6).default(0),
    /**
     * Who actually collects, asked before the collection day so a private
     * hauler's schedule is never cross-checked against City route data it
     * was never part of (D-025).
     */
    collectionProviderKind: z.enum(["city", "private", "unsure"]).nullable().default(null),
    /** Free-text hauler name; only collected when the provider is private. */
    collectionProvider: z.string().trim().max(120).optional().or(z.literal("")),
    /** Trash collection weekday. Rollout is always the evening before. */
    collectionDay: z.number().int().min(0).max(6).nullable(),
    collectionDayUnsure: z.boolean().default(false),
    /** Null until asked; only relevant when the property has both bin types. */
    sameDayCollection: z.boolean().nullable().default(null),
    recyclingCollectionDay: z.number().int().min(0).max(6).nullable().default(null),
    recyclingCollectionDayUnsure: z.boolean().default(false),
    binStorageLocation: z.string().trim().min(3, "Tell us where the bins live.").max(400),
    curbPlacementNotes: z.string().trim().max(400).optional().or(z.literal("")),
    hazards: z
      .array(
        z.enum([
          "animal",
          "steep_grade",
          "long_driveway",
          "stairs",
          "gate",
          "garage",
          "poor_lighting",
          "ice",
          "access_restriction",
        ]),
      )
      .default([]),
    /** Gate codes etc. — stored separately, never in ordinary notes. */
    accessSecretNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (!value.collectionDayUnsure && value.collectionDay === null) {
      context.addIssue({
        code: "custom",
        path: ["collectionDay"],
        message: "Pick your trash collection day, or mark that you're not sure.",
      });
    }
    if (value.hasBothBinTypes) {
      if (value.recyclingBinCount < 1) {
        context.addIssue({
          code: "custom",
          path: ["recyclingBinCount"],
          message: "Tell us how many recycling bins you have.",
        });
      }
      if (value.sameDayCollection === null) {
        context.addIssue({
          code: "custom",
          path: ["sameDayCollection"],
          message: "Let us know whether recycling is picked up on the same day.",
        });
      }
      if (
        value.sameDayCollection === false &&
        !value.recyclingCollectionDayUnsure &&
        value.recyclingCollectionDay === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["recyclingCollectionDay"],
          message: "Pick your recycling collection day, or mark that you're not sure.",
        });
      }
    }
    if (
      (value.hazards.includes("gate") || value.hazards.includes("garage")) &&
      (value.accessSecretNotes ?? "").trim().length < ACCESS_SECRET_MIN_LENGTH
    ) {
      context.addIssue({
        code: "custom",
        path: ["accessSecretNotes"],
        message: "Add gate or garage access details so your runner can reach the bins.",
      });
    }
  });

export const stage4Schema = z.object({
  acceptTerms: z.literal(true, { message: "Please accept the terms to continue." }),
  acceptElectronicComms: z.literal(true, {
    message: "Please accept electronic communications to continue.",
  }),
  acceptPhotoConsent: z.literal(true, {
    message: "Photo confirmation is part of the service — please accept to continue.",
  }),
});

export type Stage1 = z.infer<typeof stage1Schema>;
export type Stage2 = z.infer<typeof stage2Schema>;
export type Stage3 = z.infer<typeof stage3Schema>;
