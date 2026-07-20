import "server-only";

import Stripe from "stripe";

/**
 * Stripe client for test/dev keys. Returns null when billing is not configured
 * so callers can present an honest "billing unavailable" state instead of
 * crashing (Silent Failure Prevention).
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}
