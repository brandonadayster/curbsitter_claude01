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
      <h1 className="text-3xl font-bold tracking-tight">Map</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
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
