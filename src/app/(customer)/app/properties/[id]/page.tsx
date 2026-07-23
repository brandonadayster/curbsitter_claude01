import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateAccessSecret, updateInstructions } from "./actions";

export const metadata = { title: "Property Details" };
export const dynamic = "force-dynamic";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-lg text-text placeholder:text-muted focus:border-cyan";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // RLS scopes this read; a foreign property simply comes back empty.
  const { data: property } = await supabase
    .from("properties")
    .select(
      `id, address_line1, address_line2, city, postal_code, status,
       property_instructions (bin_storage_location, curb_placement_notes, general_notes),
       property_hazards (hazard_type, severity),
       bins (id, bin_type, identifier, active),
       collection_schedules (weekday, provider, verification_status)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!property) notFound();

  const instructions = Array.isArray(property.property_instructions)
    ? property.property_instructions[0]
    : property.property_instructions;

  // Existence check only — the secret value itself is never sent to the page.
  const admin = createSupabaseAdminClient();
  const { count: secretCount } = await admin
    .from("property_access_secrets")
    .select("id", { count: "exact", head: true })
    .eq("property_id", property.id);
  const hasAccessSecret = (secretCount ?? 0) > 0;

  return (
    <>
      <Link href="/app" className="text-base text-muted underline">
        ← Overview
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        {property.address_line1}
        {property.address_line2 ? `, ${property.address_line2}` : ""}
      </h1>
      <p className="mt-1 text-lg text-muted">
        {property.city} {property.postal_code} · status: {property.status.replace(/_/g, " ")}
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Bins &amp; schedule</h2>
        <p className="mt-2 text-lg">
          {(property.bins ?? [])
            .filter((bin) => bin.active)
            .map((bin) => `${bin.bin_type}${bin.identifier ? ` (${bin.identifier})` : ""}`)
            .join(", ") || "No bins on file"}
        </p>
        <p className="mt-1 text-base text-muted">
          {(property.collection_schedules ?? [])
            .map(
              (schedule) =>
                `${
                  schedule.weekday !== null
                    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][schedule.weekday] + "s"
                    : "Day being verified"
                }${schedule.provider ? ` · ${schedule.provider}` : ""} (${schedule.verification_status.replace(/_/g, " ")})`,
            )
            .join("; ") || "Schedule pending verification"}
        </p>
        <p className="mt-2 text-base text-muted">
          Need to change bins or your collection day? Contact us through{" "}
          <Link href="/app/support" className="text-cyan underline">
            support
          </Link>{" "}
          so we can keep your route accurate.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Runner instructions</h2>
        <form action={updateInstructions} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="propertyId" value={property.id} />
          <div>
            <label htmlFor="pi-storage" className="mb-1 block text-base font-medium">
              Where do the bins live?
            </label>
            <input
              id="pi-storage"
              name="binStorageLocation"
              defaultValue={instructions?.bin_storage_location ?? ""}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="pi-curb" className="mb-1 block text-base font-medium">
              Curb placement notes <span className="text-muted">(optional)</span>
            </label>
            <input
              id="pi-curb"
              name="curbPlacementNotes"
              defaultValue={instructions?.curb_placement_notes ?? ""}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="pi-notes" className="mb-1 block text-base font-medium">
              Anything else the runner should know? <span className="text-muted">(optional)</span>
            </label>
            <textarea
              id="pi-notes"
              name="generalNotes"
              rows={3}
              defaultValue={instructions?.general_notes ?? ""}
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg bg-cyan px-5 py-2.5 text-base font-semibold text-bg hover:bg-cyan-strong"
          >
            Save instructions
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Gate &amp; access details</h2>
        <p className="mt-2 text-base text-muted">
          {hasAccessSecret
            ? "Access details are on file, stored encrypted. For your security they are never displayed here — submitting the form below replaces them entirely."
            : "No access details on file. Add them if the runner needs a code or key instructions to reach your bins."}{" "}
          They are shown only to your assigned runner during the service window.
        </p>
        <form action={updateAccessSecret} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="propertyId" value={property.id} />
          <div>
            <label htmlFor="pa-notes" className="mb-1 block text-base font-medium">
              {hasAccessSecret ? "Replace access details" : "Access details"}
            </label>
            <textarea
              id="pa-notes"
              name="accessNotes"
              rows={3}
              placeholder="e.g., Gate keypad 1234#, side door key under the planter"
              className={inputClasses}
            />
          </div>
          <button
            type="submit"
            className="self-start rounded-lg border border-border px-5 py-2.5 text-base font-semibold hover:border-cyan/60"
          >
            {hasAccessSecret ? "Replace access details" : "Save access details"}
          </button>
        </form>
      </section>

      {(property.property_hazards ?? []).length > 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-xl font-bold">Property flags</h2>
          <p className="mt-2 text-lg">
            {(property.property_hazards ?? [])
              .map((hazard) => hazard.hazard_type.replace(/_/g, " "))
              .join(", ")}
          </p>
          <p className="mt-1 text-base text-muted">
            These help runners plan safely. Contact support to change them.
          </p>
        </section>
      ) : null}
    </>
  );
}
