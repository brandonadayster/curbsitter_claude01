"use client";

import { useMemo, useState } from "react";

import { formatCents } from "@/config/business";
import type { AdminPropertyPin, AdminRouteCellMapRow } from "@/lib/admin-map";
import { STATE_COLORS, STATE_LABELS } from "@/lib/route-cell-labels";

import { AdminMapSheet } from "./admin-map-sheet";
import { AdminOpsMap } from "./admin-ops-map";
import {
  matchesPropertySearch,
  matchesRouteCellSearch,
  PROPERTY_STATUS_COLORS,
  PROPERTY_STATUS_LABELS,
} from "./admin-map-data";
import { MapLayerToggle } from "./map-layer-toggle";

export interface AdminMapViewProps {
  cells: AdminRouteCellMapRow[];
  properties: AdminPropertyPin[];
  unassignedMonthlyRecurringCents: number;
}

/**
 * Responsive admin ops map.
 *
 * Below `sm` the map is the page and everything else lives in a drag-up
 * sheet, with layers collapsed behind a single floating control. From `sm`
 * up the previous stacked layout is unchanged: controls, legend, map, then
 * full tables.
 *
 * Both layouts render the same filtered data. Exactly one is in the DOM's
 * accessibility tree at a time — Tailwind's `hidden` / `sm:hidden` compile to
 * `display: none`, which removes the other from both the tab order and the
 * screen-reader tree, so the map's required text alternative is never
 * duplicated or absent.
 *
 * Metrics shown are only those actually computed from real data (MRR, counts).
 * Churn and LTV/CAC are deliberately absent — they have no source yet, and a
 * dashboard that invents them is worse than one that omits them.
 */
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

  const matchingMrrCents = useMemo(
    () => filteredCells.reduce((sum, cell) => sum + cell.monthlyRecurringCents, 0),
    [filteredCells],
  );

  const searchInput = (
    <input
      id="admin-map-search-mobile"
      type="search"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Cell name, address, city, or account name"
      className="h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-base"
    />
  );

  /** Real, computed figures only — each reflects the current search. */
  const metricChips = (
    <dl className="mt-3 grid grid-cols-3 gap-2">
      {[
        { label: "MRR", value: formatCents(matchingMrrCents) },
        { label: "Route cells", value: String(filteredCells.length) },
        { label: "Properties", value: String(filteredProperties.length) },
      ].map((chip) => (
        <div key={chip.label} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
          <dt className="text-sm text-muted">{chip.label}</dt>
          <dd className="text-lg font-bold">{chip.value}</dd>
        </div>
      ))}
    </dl>
  );

  const legend = (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
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
  );

  /** Card list — the map's text alternative in the mobile sheet. */
  const cellCards = (
    <section>
      <h2 className="text-lg font-bold">Route cells</h2>
      {filteredCells.length === 0 ? (
        <p className="mt-2 text-base text-muted">No matching route cells.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {filteredCells.map((cell) => (
            <li key={cell.id} className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-base font-semibold">{cell.name}</p>
              <p className="text-sm text-muted">{cell.slug}</p>
              <p className="mt-1 text-base">
                {STATE_LABELS[cell.state] ?? cell.state} · {cell.activeProperties} active ·{" "}
                {formatCents(cell.monthlyRecurringCents)}
                {cell.capacity !== null ? ` · capacity ${cell.capacity}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const propertyCards = (
    <section className="mt-5">
      <h2 className="text-lg font-bold">Properties</h2>
      {filteredProperties.length === 0 ? (
        <p className="mt-2 text-base text-muted">No matching properties.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {filteredProperties.map((pin) => (
            <li key={pin.id} className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-base font-semibold">{pin.addressLine1}</p>
              <p className="text-sm text-muted">{pin.city}</p>
              <p className="mt-1 text-base">
                {PROPERTY_STATUS_LABELS[pin.status] ?? pin.status} · {pin.accountName} ·{" "}
                {pin.routeCellId ? (cellNameById.get(pin.routeCellId) ?? "—") : "Unassigned"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <>
      {/* ---------------- Mobile: map is the page ----------------
          `data-testid` scopes e2e locators to one layout. Both layouts render
          the same data, so accessible-name locators ("Properties" heading,
          the layer checkboxes) match twice and trip Playwright strict mode.
          A test id is a11y-neutral; inventing landmark regions purely to give
          tests something to scope to would pollute the accessibility tree. */}
      <div data-testid="admin-map-mobile" className="sm:hidden">
        {/* Inset rather than full-bleed: MapBase hardcodes a 1rem corner
            radius, which reads as a mistake when the map runs to the screen
            edge. Keeping the page gutter costs ~32px of width and stays
            consistent with every other surface. */}
        <div className="relative mt-4">
          <AdminOpsMap
            cells={filteredCells}
            properties={filteredProperties}
            showCells={showCells}
            showProperties={showProperties}
            className="h-[58svh] w-full overflow-hidden rounded-2xl"
          />
          <MapLayerToggle
            showCells={showCells}
            showProperties={showProperties}
            onChangeCells={setShowCells}
            onChangeProperties={setShowProperties}
            className="absolute right-4 top-4 z-10 w-44"
          />
        </div>

        {/* Clears the collapsed sheet so the last content is never covered. */}
        <div aria-hidden="true" className="h-44" />

        <AdminMapSheet
          peek={
            <>
              <label htmlFor="admin-map-search-mobile" className="sr-only">
                Search cells and properties
              </label>
              {searchInput}
              {metricChips}
            </>
          }
        >
          <p className="text-base text-muted">
            Internal decision inputs — not public metrics. Unassigned monthly recurring:{" "}
            <strong className="text-text">{formatCents(unassignedMonthlyRecurringCents)}</strong>.
          </p>
          <div className="mt-4">{legend}</div>
          {/* Mirrors the desktop tables: a layer that is off is absent from
              the list too, so the sheet never contradicts the map. */}
          {showCells ? <div className="mt-5">{cellCards}</div> : null}
          {showProperties ? propertyCards : null}
        </AdminMapSheet>
      </div>

      {/* ---------------- sm and up: unchanged stacked layout ---------------- */}
      <div data-testid="admin-map-desktop" className="hidden sm:block">
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

        <div className="mt-4">{legend}</div>

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
      </div>
    </>
  );
}
