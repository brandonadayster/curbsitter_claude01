"use client";

import { useMemo, useState } from "react";

import { formatCents } from "@/config/business";
import type { AdminPropertyPin, AdminRouteCellMapRow } from "@/lib/admin-map";
import { STATE_COLORS, STATE_LABELS } from "@/lib/route-cell-labels";

import { AdminOpsMap } from "./admin-ops-map";
import {
  matchesPropertySearch,
  matchesRouteCellSearch,
  PROPERTY_STATUS_COLORS,
  PROPERTY_STATUS_LABELS,
} from "./admin-map-data";

export interface AdminMapViewProps {
  cells: AdminRouteCellMapRow[];
  properties: AdminPropertyPin[];
  unassignedMonthlyRecurringCents: number;
}

export function AdminMapView({ cells, properties, unassignedMonthlyRecurringCents }: AdminMapViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCells, setShowCells] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  const filteredCells = useMemo(
    () => cells.filter((cell) => matchesRouteCellSearch(cell, searchQuery)),
    [cells, searchQuery],
  );
  const filteredProperties = useMemo(
    () => properties.filter((pin) => matchesPropertySearch(pin, searchQuery)),
    [properties, searchQuery],
  );

  const cellNameById = useMemo(() => new Map(cells.map((cell) => [cell.id, cell.name])), [cells]);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="admin-map-search" className="text-base font-medium">
            Search
          </label>
          <input
            id="admin-map-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cell name, address, city, or account name"
            className="h-11 w-72 rounded-lg border border-border bg-surface-2 px-3 text-base"
          />
        </div>

        <label className="flex items-center gap-2 text-base">
          <input
            type="checkbox"
            checked={showCells}
            onChange={(e) => setShowCells(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-cyan)]"
          />
          Route cells
        </label>

        <label className="flex items-center gap-2 text-base">
          <input
            type="checkbox"
            checked={showProperties}
            onChange={(e) => setShowProperties(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-cyan)]"
          />
          Properties
        </label>
      </div>

      <p className="mt-3 text-base text-muted">
        Internal decision inputs — not public metrics. Unassigned monthly recurring:{" "}
        <strong className="text-text">{formatCents(unassignedMonthlyRecurringCents)}</strong>.
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-base">
        {Object.entries(STATE_LABELS).map(([state, label]) => (
          <span key={state} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: STATE_COLORS[state] }}
            />
            {label}
          </span>
        ))}
        {Object.entries(PROPERTY_STATUS_LABELS).map(([status, label]) => (
          <span key={status} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3"
              style={{ backgroundColor: PROPERTY_STATUS_COLORS[status as keyof typeof PROPERTY_STATUS_COLORS] }}
            />
            {label} (property)
          </span>
        ))}
      </div>

      <AdminOpsMap
        cells={filteredCells}
        properties={filteredProperties}
        showCells={showCells}
        showProperties={showProperties}
        className="mt-4 h-96 w-full overflow-hidden rounded-2xl"
      />

      {showCells ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Route cells</h2>
          {filteredCells.length === 0 ? (
            <p className="mt-3 text-base text-muted">No matching route cells.</p>
          ) : (
            <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-base font-semibold">Cell</th>
                  <th className="px-4 py-3 text-base font-semibold">State</th>
                  <th className="px-4 py-3 text-base font-semibold">Capacity</th>
                  <th className="px-4 py-3 text-base font-semibold">Active properties</th>
                  <th className="px-4 py-3 text-base font-semibold">Monthly recurring</th>
                </tr>
              </thead>
              <tbody>
                {filteredCells.map((cell) => (
                  <tr key={cell.id}>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {cell.name}
                      <span className="block text-sm text-muted">{cell.slug}</span>
                    </td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {STATE_LABELS[cell.state] ?? cell.state}
                    </td>
                    <td className="border-t border-border px-4 py-3 text-base">{cell.capacity ?? "—"}</td>
                    <td className="border-t border-border px-4 py-3 text-base">{cell.activeProperties}</td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {formatCents(cell.monthlyRecurringCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {showProperties ? (
        <section className="mt-8">
          <h2 className="text-xl font-bold">Properties</h2>
          {filteredProperties.length === 0 ? (
            <p className="mt-3 text-base text-muted">No matching properties.</p>
          ) : (
            <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-3 text-base font-semibold">Address</th>
                  <th className="px-4 py-3 text-base font-semibold">City</th>
                  <th className="px-4 py-3 text-base font-semibold">Account</th>
                  <th className="px-4 py-3 text-base font-semibold">Status</th>
                  <th className="px-4 py-3 text-base font-semibold">Route cell</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((pin) => (
                  <tr key={pin.id}>
                    <td className="border-t border-border px-4 py-3 text-base">{pin.addressLine1}</td>
                    <td className="border-t border-border px-4 py-3 text-base">{pin.city}</td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {pin.accountName}
                      <span className="block text-sm text-muted">{pin.accountType}</span>
                    </td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {PROPERTY_STATUS_LABELS[pin.status] ?? pin.status}
                    </td>
                    <td className="border-t border-border px-4 py-3 text-base">
                      {pin.routeCellId ? (cellNameById.get(pin.routeCellId) ?? "—") : "Unassigned"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </>
  );
}
