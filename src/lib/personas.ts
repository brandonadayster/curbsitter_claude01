/**
 * Onboarding persona resolution and supporting content.
 *
 * Signup asks who the service is for and what kind of property it is; this
 * turns that pair into a persona so the form can show matched benefits and
 * FAQs alongside the questions (reducing abandonment from unanswered doubts).
 *
 * Every string here is lifted from already-approved public copy — the
 * `/seniors`, `/snowbirds`, `/vacation-rentals`, and `/hoa` pages and the
 * `/faq` bank. Nothing new is claimed, and there are deliberately no
 * testimonials or review counts: CurbSitter is pre-launch, and fabricated
 * social proof is banned outright (AGENTS.md, D-015).
 *
 * Pure and dependency-free so it can be imported from the client bundle.
 */

export type ServingWho = "myself" | "family_member" | "tenants_or_guests" | "hoa_community";

export type PropertyType =
  | "single_family"
  | "condo_townhome"
  | "vacation_rental"
  | "second_home"
  | "hoa_community";

export type PersonaId = "resident" | "caregiver" | "rental_operator" | "remote_owner" | "hoa_board";

export interface PersonaContent {
  id: PersonaId;
  /** Short reassurance headline shown above the benefits. */
  headline: string;
  benefits: string[];
  faqs: Array<{ q: string; a: string }>;
}

export const SERVING_WHO_OPTIONS: Array<{ value: ServingWho; label: string }> = [
  { value: "myself", label: "Myself" },
  { value: "family_member", label: "A parent or family member" },
  { value: "tenants_or_guests", label: "My tenants or guests" },
  { value: "hoa_community", label: "My HOA or community" },
];

export const PROPERTY_TYPE_OPTIONS: Array<{ value: PropertyType; label: string }> = [
  { value: "single_family", label: "Single-family home" },
  { value: "condo_townhome", label: "Condo or townhome" },
  { value: "vacation_rental", label: "Vacation rental" },
  { value: "second_home", label: "Second home" },
  { value: "hoa_community", label: "HOA community" },
];

/** Shared answers that apply no matter who is signing up. */
const UNIVERSAL_FAQS = {
  arrival: {
    q: "When exactly will you arrive?",
    a: "We sell a completion window, not an appointment time. Rollout happens during the evening-before window (typically 5–10 p.m.), and return happens after we confirm collection.",
  },
  proof: {
    q: "Are my photos and access details safe?",
    a: "Proof photos are stored privately and shown to you through short-lived secure links — there is no public gallery. Gate and garage details are stored separately, encrypted, and never included in texts, emails, or logs.",
  },
  review: {
    q: "Is my payment taken before you confirm you can serve my property?",
    a: "Payment sets up your account, but every property goes through a serviceability review before the first service. If we can't serve your property, our policy is a prompt refund or an alternative quote.",
  },
  missed: {
    q: "What if the truck comes early, late, or skips my street?",
    a: "If the hauler is late or misses your street, we mark the cycle delayed, notify you honestly, and recheck under our published policy.",
  },
} as const;

const PERSONAS: Record<PersonaId, PersonaContent> = {
  resident: {
    id: "resident",
    headline: "Trash day, handled — you stay in charge.",
    benefits: [
      "No more hauling heavy bins up and down the driveway in the dark, heat, or ice",
      "The same reliable window every week — nothing to remember",
      "Photo confirmation after every rollout and return",
      "Exception alerts if anything is off, so small problems never become surprises",
      "No long-term contract — pause or cancel online anytime",
    ],
    faqs: [
      {
        q: "Do I need to be home?",
        a: "No. Once your property details and any access instructions are set up, we handle trash day whether you're home or away.",
      },
      UNIVERSAL_FAQS.arrival,
      UNIVERSAL_FAQS.missed,
      UNIVERSAL_FAQS.review,
    ],
  },
  caregiver: {
    id: "caregiver",
    headline: "They keep their routine. You get the proof it happened.",
    benefits: [
      "Takes away one of the most common ways a good week goes wrong: heavy bins on a steep, dark, or icy driveway",
      "Buy and manage the service from anywhere — you don't have to live nearby",
      "The payer, the service recipient, and who gets notified can all be different people",
      "Timestamped photo confirmation of every rollout and return",
      "Exception alerts if a bin is missing, blocked, or uncollected",
    ],
    faqs: [
      {
        q: "Can I buy this for a parent?",
        a: "Yes. The payer, the service recipient, and the people receiving notifications can all be different, and one account can manage multiple properties.",
      },
      {
        q: "Do they need to be home?",
        a: "No. Once the property details and any access instructions are set up, we handle trash day whether anyone is home or away.",
      },
      UNIVERSAL_FAQS.proof,
      UNIVERSAL_FAQS.review,
    ],
  },
  rental_operator: {
    id: "rental_operator",
    headline: "Trash day never turns over with the guests.",
    benefits: [
      "Every covered collection day handled, regardless of guest turnover",
      "Photo proof and documented history for every visit",
      "Overflow, contamination, and missed-collection reporting the same day",
      "Multi-property dashboard visibility under one account",
      "Exception alerts routed to you or your manager — your choice",
    ],
    faqs: [
      {
        q: "Does this replace my cleaners or property manager?",
        a: "No. CurbSitter doesn't replace your cleaners or property manager, and we don't haul trash. We make one recurring, easily-dropped task disappear and give you the documentation to prove it happened.",
      },
      {
        q: "Can one account cover several rentals?",
        a: "Yes. One account can manage multiple properties, and notification recipients can be set separately from the payer.",
      },
      UNIVERSAL_FAQS.missed,
      UNIVERSAL_FAQS.review,
    ],
  },
  remote_owner: {
    id: "remote_owner",
    headline: "Your Prescott home, handled while you're away.",
    benefits: [
      "Timestamped photo proof of every rollout and return, viewable from anywhere",
      "Shorter curb exposure — bins don't sit out signaling an empty home",
      "Pause and resume online as your travel schedule changes",
      "Real-time exception alerts if a bin is missing, blocked, or uncollected",
      "Holiday schedule monitoring, so a shifted pickup day never catches you out",
    ],
    faqs: [
      {
        q: "What if my trash and recycling are on different days?",
        a: "That's what CurbSitter Complete is for: every regular collection day at the address is covered, with the same proof and alerts.",
      },
      {
        q: "Can I pause while I'm out of town for the season?",
        a: "Yes — pause and resume online, anytime. Pauses apply to the next unperformed service cycle and future renewals under our published cutoff rules.",
      },
      UNIVERSAL_FAQS.proof,
      UNIVERSAL_FAQS.review,
    ],
  },
  hoa_board: {
    id: "hoa_board",
    headline: "Fewer bins left out. Fewer complaints.",
    benefits: [
      "Helps residents meet set-out and storage timing rules — especially older and seasonal residents",
      "Monthly completed-visit and exception reporting for the board",
      "Missed-hauler-pickup documentation for follow-up with the collection provider",
      "A professional, insured, accountable local operator",
      "Pilot, resident opt-in, or HOA-funded coverage — your choice of structure",
    ],
    faqs: [
      {
        q: "Can you guarantee zero violations?",
        a: "No, and we won't pretend otherwise. We help residents comply with timing and storage rules, but no vendor can guarantee zero violations.",
      },
      {
        q: "How do communities usually start?",
        a: "Most start with a 60–90 day pilot on selected streets or residents, clearly measured: completed visits, exceptions, and curb-appearance outcomes.",
      },
      UNIVERSAL_FAQS.missed,
      UNIVERSAL_FAQS.review,
    ],
  },
};

/**
 * Resolve the persona from the two signup answers. Who the service is for wins
 * over property type — a caregiver buying for a parent in a condo is still a
 * caregiver — except that "myself" is refined by the property, since an owner
 * signing up for their own vacation rental or second home has quite different
 * concerns from one signing up for the house they live in.
 */
export function resolvePersona(
  servingWho: ServingWho | null,
  propertyType: PropertyType | null,
): PersonaContent {
  if (servingWho === "hoa_community" || propertyType === "hoa_community") {
    return PERSONAS.hoa_board;
  }
  if (servingWho === "family_member") return PERSONAS.caregiver;
  if (servingWho === "tenants_or_guests") return PERSONAS.rental_operator;

  if (propertyType === "vacation_rental") return PERSONAS.rental_operator;
  if (propertyType === "second_home") return PERSONAS.remote_owner;

  return PERSONAS.resident;
}
