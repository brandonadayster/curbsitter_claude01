import type { Metadata } from "next";
import Link from "next/link";

import { AddressCheck } from "@/components/site/address-check";
import { CtaBand, PageHero, Section } from "@/components/site/sections";
import { RouteCellMap, type RouteCellMapCell } from "@/components/map/route-cell-map";
import { STATE_LABELS } from "@/lib/route-cell-labels";
import { createSupabaseAnonClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Service Areas",
  description:
    "CurbSitter opens route by route in the Prescott, Arizona area. Check your address or join the waitlist for your neighborhood.",
};

export const revalidate = 300;

async function getRouteCells(): Promise<RouteCellMapCell[]> {
  try {
    // RLS already grants public select on route_cells; the anon client keeps
    // this ISR-cacheable (unlike the cookie-bound server client).
    const supabase = createSupabaseAnonClient();
    const { data } = await supabase
      .from("route_cells")
      .select("id, name, slug, state, geometry, center_latitude, center_longitude")
      .neq("state", "closed")
      .order("name");
    return (data ?? []).map((cell) => ({
      id: cell.id,
      name: cell.name,
      slug: cell.slug,
      state: cell.state as RouteCellMapCell["state"],
      geometry: cell.geometry as RouteCellMapCell["geometry"],
      centerLatitude: cell.center_latitude,
      centerLongitude: cell.center_longitude,
    }));
  } catch {
    return [];
  }
}

export default async function ServiceAreasPage() {
  const cells = await getRouteCells();

  return (
    <>
      <PageHero eyebrow="Route-by-route coverage" title="Where CurbSitter serves">
        <p>
          We open service one route at a time so every stop is reliable. A neighborhood — even a
          single ZIP code — can hold open, waitlisted, and not-yet-served addresses at the same
          time, so the address check below is the source of truth.
        </p>
      </PageHero>

      <Section>
        <AddressCheck />
      </Section>

      <Section title="Route status by neighborhood">
        {cells.length === 0 ? (
          <p className="text-lg text-muted">
            Route research is underway across the Prescott area. Join the waitlist above and
            we&apos;ll contact you as your route opens.
          </p>
        ) : (
          <>
            <RouteCellMap cells={cells} className="mb-6 h-80 w-full overflow-hidden rounded-2xl" />
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {cells.map((cell) => (
                <li key={cell.slug} className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-lg">{cell.name}</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-base font-medium ${
                      cell.state === "active"
                        ? "border-success/50 text-success"
                        : cell.state === "opening"
                          ? "border-cyan/50 text-cyan"
                          : "border-border text-muted"
                    }`}
                  >
                    {STATE_LABELS[cell.state] ?? cell.state}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-base text-muted">
              “Researching” means we&apos;re evaluating schedules and demand — it is not a
              coverage promise. Waitlist signups directly influence which routes open first.
            </p>
          </>
        )}
      </Section>

      <Section title="Prescott and beyond">
        <p className="text-lg text-muted">
          Our launch market is{" "}
          <Link href="/service-areas/prescott" className="text-cyan underline">
            Prescott, Arizona
          </Link>
          . Prescott Valley, Chino Valley, and Dewey-Humboldt are expansion markets — join the
          waitlist and your interest helps us plan the next routes.
        </p>
      </Section>

      <CtaBand title="Want your street on the next route?" ctaLabel="Join the Waitlist" ctaHref="/waitlist" />
    </>
  );
}
