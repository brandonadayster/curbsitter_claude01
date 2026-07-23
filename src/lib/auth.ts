import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformRole = "customer" | "runner" | "dispatcher" | "admin" | "support";

export interface SessionInfo {
  userId: string;
  email: string | null;
  role: PlatformRole;
}

/**
 * Resolve the signed-in user's platform role via their own RLS-scoped profile
 * row. Server-side authorization only — UI hiding is not access control.
 */
export async function getSessionInfo(): Promise<SessionInfo | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    role: (profile?.platform_role as PlatformRole | undefined) ?? "customer",
  };
}

const STAFF_ROLES: PlatformRole[] = ["admin", "dispatcher", "support"];

/** For server components: redirect away unless the user holds an allowed role. */
export async function requireRole(allowed: PlatformRole[]): Promise<SessionInfo> {
  const session = await getSessionInfo();
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect("/app");
  return session;
}

export async function requireStaff(): Promise<SessionInfo> {
  return requireRole(STAFF_ROLES);
}

/** For route handlers/server actions: throw instead of redirecting. */
export async function assertRole(allowed: PlatformRole[]): Promise<SessionInfo> {
  const session = await getSessionInfo();
  if (!session || !allowed.includes(session.role)) {
    throw new Error("forbidden");
  }
  return session;
}
