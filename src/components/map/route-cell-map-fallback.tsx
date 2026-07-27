import { STATE_LABELS } from "@/lib/route-cell-labels";
import type { RouteCellMapCell } from "./route-cell-map";

/** Shown when the map can't render — the same cell/state data as a plain accessible list. */
export function RouteCellMapFallback({ cells }: { cells: RouteCellMapCell[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-base text-muted">Map view unavailable — route status by neighborhood:</p>
      <ul className="mt-3 space-y-1.5">
        {cells.map((cell) => (
          <li key={cell.id} className="flex items-center justify-between gap-3 text-base">
            <span>{cell.name}</span>
            <span className="text-muted">{STATE_LABELS[cell.state] ?? cell.state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
