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
  forSomeoneElse: z.boolean(),
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
    binCount: z.number().int().min(1, "At least one bin.").max(6, "Maximum 6 bins."),
    binTypes: z.array(z.enum(["trash", "recycling", "organics", "other"])).min(1, "Select bin types."),
    collectionProvider: z.string().trim().max(120).optional().or(z.literal("")),
    collectionDay: z.number().int().min(0).max(6).nullable(),
    collectionDayUnsure: z.boolean().default(false),
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
        message: "Pick your collection day, or mark that you're not sure.",
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
