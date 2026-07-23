import { notFound, redirect } from "next/navigation";

import { TaskRunner } from "@/components/runner/task-runner";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Runner — Task" };
export const dynamic = "force-dynamic";

export default async function RunnerTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole(["runner", "admin", "dispatcher"]);
  const supabase = createSupabaseAdminClient();

  const { data: task } = await supabase
    .from("service_tasks")
    .select(
      `id, task_type, status, window_start, window_end, assigned_runner_id,
       properties (address_line1, address_line2, city, postal_code,
         property_instructions (bin_storage_location, curb_placement_notes, general_notes),
         property_hazards (hazard_type, severity, notes),
         bins (bin_type, identifier)),
       service_photos (id, photo_type)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!task) notFound();
  if (task.assigned_runner_id !== session.userId && session.role === "runner") {
    redirect("/runner");
  }

  const property = Array.isArray(task.properties) ? task.properties[0] : task.properties;
  const instructions = property?.property_instructions?.[0] ?? property?.property_instructions ?? null;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <TaskRunner
        task={{
          id: task.id,
          taskType: task.task_type,
          status: task.status,
          address: `${property?.address_line1 ?? ""}${property?.address_line2 ? `, ${property.address_line2}` : ""}, ${property?.city ?? ""} ${property?.postal_code ?? ""}`,
          storageLocation: instructions?.bin_storage_location ?? null,
          curbNotes: instructions?.curb_placement_notes ?? null,
          generalNotes: instructions?.general_notes ?? null,
          hazards: (property?.property_hazards ?? []).map(
            (hazard: { hazard_type: string; severity: string; notes: string | null }) => ({
              type: hazard.hazard_type,
              severity: hazard.severity,
              notes: hazard.notes,
            }),
          ),
          bins: (property?.bins ?? []).map(
            (bin: { bin_type: string; identifier: string | null }) =>
              `${bin.bin_type}${bin.identifier ? ` (${bin.identifier})` : ""}`,
          ),
          photos: (task.service_photos ?? []).map((photo: { id: string; photo_type: string }) => ({
            id: photo.id,
            type: photo.photo_type,
          })),
        }}
      />
    </main>
  );
}
