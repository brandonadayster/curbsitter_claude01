import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Anon-key client for public, RLS-scoped reads from a Server Component. Unlike
 * `createSupabaseServerClient()` this never calls `cookies()`, so it doesn't
 * force the route into dynamic rendering — use it on pages that rely on
 * `revalidate`/ISR (e.g. `/service-areas`) and only read data RLS already
 * grants to `anon`. For anything account-scoped, use the cookie-bound server
 * client instead.
 */
export function createSupabaseAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase anon client is not configured (missing URL or anon key).");
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
