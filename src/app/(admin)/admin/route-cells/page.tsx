import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { createRouteCell, updateRouteCell } from "./actions";

export const metadata = { title: "Admin — Route Cells" };
export const dynamic = "force-dynamic";

const CELL_STATES = [
  "research",
  "waitlist",
  "opening",
  "active",
  "capacity_full",
  "premium_review",
  "closed",
] as const;

export default async function RouteCellsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: cells } = await supabase
    .from("route_cells")
    .select("id, name, slug, state, capacity, center_latitude, center_longitude")
    .order("name");

  const { data: leadCounts } = await supabase
    .from("waitlist_leads")
    .select("route_cell_id")
    .eq("status", "waiting");
  const leadsByCell = new Map<string, number>();
  for (const lead of leadCounts ?? []) {
    if (lead.route_cell_id) {
      leadsByCell.set(lead.route_cell_id, (leadsByCell.get(lead.route_cell_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Route cells</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Activation is an operations decision backed by contribution and capacity data — the
        public site reflects whatever is set here, so keep it truthful.
      </p>

      <table className="mt-6 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
        <thead className="bg-surface">
          <tr>
            <th className="px-4 py-3 text-base font-semibold">Cell</th>
            <th className="px-4 py-3 text-base font-semibold">Waiting leads</th>
            <th className="px-4 py-3 text-base font-semibold">State</th>
            <th className="px-4 py-3 text-base font-semibold">Capacity</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {(cells ?? []).map((cell) => (
            <tr key={cell.id} className="border-t border-border">
              <td className="border-t border-border px-4 py-3">
                <p className="text-lg">{cell.name}</p>
                <p className="text-sm text-muted">{cell.slug}</p>
              </td>
              <td className="border-t border-border px-4 py-3 text-lg">
                {leadsByCell.get(cell.id) ?? 0}
              </td>
              <td className="border-t border-border px-4 py-3" colSpan={3}>
                <form action={updateRouteCell} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="cellId" value={cell.id} />
                  <label className="sr-only" htmlFor={`state-${cell.id}`}>
                    State for {cell.name}
                  </label>
                  <select
                    id={`state-${cell.id}`}
                    name="state"
                    defaultValue={cell.state}
                    className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
                  >
                    {CELL_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`capacity-${cell.id}`}>
                    Capacity for {cell.name}
                  </label>
                  <input
                    id={`capacity-${cell.id}`}
                    name="capacity"
                    type="number"
                    min={0}
                    defaultValue={cell.capacity ?? ""}
                    placeholder="capacity"
                    className="w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
                  />
                  <label className="sr-only" htmlFor={`center-lat-${cell.id}`}>
                    Center latitude for {cell.name}
                  </label>
                  <input
                    id={`center-lat-${cell.id}`}
                    name="centerLatitude"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    defaultValue={cell.center_latitude ?? ""}
                    placeholder="center lat"
                    className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
                  />
                  <label className="sr-only" htmlFor={`center-lng-${cell.id}`}>
                    Center longitude for {cell.name}
                  </label>
                  <input
                    id={`center-lng-${cell.id}`}
                    name="centerLongitude"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    defaultValue={cell.center_longitude ?? ""}
                    placeholder="center lng"
                    className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-cyan px-4 py-2 text-base font-semibold text-bg hover:bg-cyan-strong"
                  >
                    Save
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-10 max-w-md rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-bold">Add a route cell</h2>
        <form action={createRouteCell} className="mt-4 flex flex-col gap-3">
          <label htmlFor="new-cell-name" className="text-base font-medium">
            Name
          </label>
          <input
            id="new-cell-name"
            name="name"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
          />
          <label htmlFor="new-cell-slug" className="text-base font-medium">
            Slug
          </label>
          <input
            id="new-cell-slug"
            name="slug"
            placeholder="pinon-oaks"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
          />
          <button
            type="submit"
            className="mt-2 self-start rounded-lg bg-cyan px-4 py-2 text-base font-semibold text-bg hover:bg-cyan-strong"
          >
            Create (starts in research)
          </button>
        </form>
      </section>
    </>
  );
}
