import { getAdminPropertyPins, getAdminRouteCellMapData } from "@/lib/admin-map";
import { AdminMapView } from "@/components/map/admin-map-view";

export const metadata = { title: "Admin — Map" };
export const dynamic = "force-dynamic";

export default async function AdminMapPage() {
  const [{ cells, unassignedMonthlyRecurringCents }, properties] = await Promise.all([
    getAdminRouteCellMapData(),
    getAdminPropertyPins(),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Map</h1>
      {/* Explanatory copy is desktop-only: on mobile the map is the page, and
          this would push it below the fold. The sheet states the same
          "internal decision inputs" caveat where the numbers actually are. */}
      <p className="mt-2 hidden max-w-2xl text-base text-muted sm:block">
        Route cells and properties on one searchable map — filter and toggle layers below. The
        tables carry the same data as the map, so this stays useful even without WebGL.
      </p>

      <AdminMapView
        cells={cells}
        properties={properties}
        unassignedMonthlyRecurringCents={unassignedMonthlyRecurringCents}
      />
    </>
  );
}
