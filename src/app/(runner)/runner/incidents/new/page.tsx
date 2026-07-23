import { requireRole } from "@/lib/auth";
import { IncidentForm } from "@/components/runner/incident-form";

export const metadata = { title: "Runner — Report Incident" };

export default async function NewIncidentPage() {
  await requireRole(["runner", "admin", "dispatcher"]);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <IncidentForm />
    </main>
  );
}
