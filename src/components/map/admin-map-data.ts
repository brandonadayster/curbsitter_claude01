import type { AdminPropertyStatus } from "@/lib/admin-map";

/** Property-status label — deliberately separate from route-cell `STATE_LABELS`. */
export const PROPERTY_STATUS_LABELS: Record<AdminPropertyStatus, string> = {
  pending_review: "Pending review",
  active: "Active",
  paused: "Paused",
  declined: "Declined",
  closed: "Closed",
};

/**
 * Property-pin color per status. Deliberately does not reuse route-cell
 * `STATE_COLORS` — both layers render together on the admin map, and sharing
 * a hue between "cell is active" and "property is active" would blur the
 * two legends together.
 */
export const PROPERTY_STATUS_COLORS: Record<AdminPropertyStatus, string> = {
  pending_review: "#d7a64a",
  active: "#12d8f4",
  paused: "#aab5c6",
  declined: "#f26464",
  closed: "#5c6577",
};

function normalize(query: string): string {
  return query.trim().toLowerCase();
}

export interface RouteCellSearchInput {
  name: string;
  slug: string;
}

/** Matches a route cell's own name or slug — cells have no owning account. */
export function matchesRouteCellSearch(cell: RouteCellSearchInput, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return cell.name.toLowerCase().includes(q) || cell.slug.toLowerCase().includes(q);
}

export interface PropertySearchInput {
  addressLine1: string;
  city: string;
  accountName: string;
}

/**
 * Matches a property's address, city, or owning account name. There is no
 * dedicated subdivision/HOA tag column on `properties` yet — an HOA search
 * works by matching the account's name (e.g. "Pinon Oaks HOA").
 */
export function matchesPropertySearch(pin: PropertySearchInput, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return (
    pin.addressLine1.toLowerCase().includes(q) ||
    pin.city.toLowerCase().includes(q) ||
    pin.accountName.toLowerCase().includes(q)
  );
}
