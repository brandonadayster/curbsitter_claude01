"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditLog } from "@/lib/audit";
import { assertRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateCellSchema = z.object({
  cellId: z.string().uuid(),
  state: z.enum([
    "research",
    "waitlist",
    "opening",
    "active",
    "capacity_full",
    "premium_review",
    "closed",
  ]),
  capacity: z.number().int().min(0).max(10000).nullable(),
});

export async function updateRouteCell(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);

  const parsed = updateCellSchema.safeParse({
    cellId: formData.get("cellId"),
    state: formData.get("state"),
    capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
  });
  if (!parsed.success) throw new Error("Invalid route-cell update.");

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("route_cells")
    .select("state, capacity")
    .eq("id", parsed.data.cellId)
    .single();

  const { error } = await supabase
    .from("route_cells")
    .update({ state: parsed.data.state, capacity: parsed.data.capacity })
    .eq("id", parsed.data.cellId);
  if (error) throw new Error(`Route-cell update failed: ${error.message}`);

  await auditLog({
    actorId: session.userId,
    action: "route_cell.update",
    entity: "route_cells",
    entityId: parsed.data.cellId,
    before: before ?? undefined,
    after: { state: parsed.data.state, capacity: parsed.data.capacity },
  });

  revalidatePath("/admin/route-cells");
  revalidatePath("/service-areas");
}

const createCellSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, "Slug must be lowercase letters, numbers, and dashes."),
});

export async function createRouteCell(formData: FormData): Promise<void> {
  const session = await assertRole(["admin", "dispatcher"]);

  const parsed = createCellSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) throw new Error("Invalid route-cell details.");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("route_cells")
    .insert({ name: parsed.data.name, slug: parsed.data.slug, state: "research" })
    .select("id")
    .single();
  if (error) throw new Error(`Route-cell creation failed: ${error.message}`);

  await auditLog({
    actorId: session.userId,
    action: "route_cell.create",
    entity: "route_cells",
    entityId: data?.id,
    after: parsed.data,
  });

  revalidatePath("/admin/route-cells");
}
