/**
 * Feature flags. Experimental property-concierge services stay OFF for the
 * public launch (Decision D-006, hard boundary). They may only be turned on by
 * a later owner ADR — never by an agent.
 */
export const FEATURES = {
  homeWatch: false,
  hostShield: false,
  bulkPickupCoordination: true,
  bulkPhysicalPlacement: true, // request allowed; every placement is admin-quoted
} as const;
