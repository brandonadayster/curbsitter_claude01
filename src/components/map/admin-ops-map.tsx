"use client";

import { useMemo, useState } from "react";
import type { ExpressionSpecification } from "mapbox-gl";
import { Layer, Marker, Popup, Source } from "react-map-gl/mapbox";

import { formatCents } from "@/config/business";
import type { CellGeometry } from "@/lib/geo";
import { STATE_COLORS, STATE_LABELS, type RouteCellState } from "@/lib/route-cell-labels";

import { PROPERTY_STATUS_COLORS, PROPERTY_STATUS_LABELS } from "./admin-map-data";
import { MapBase } from "./map-base";
import { DEFAULT_MAP_CENTER, pickRouteCellRenderMode } from "./route-cell-map-data";

export interface AdminOpsMapCell {
  id: string;
  name: string;
  slug: string;
  state: RouteCellState;
  geometry: CellGeometry | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  capacity: number | null;
  activeProperties: number;
  monthlyRecurringCents: number;
}

export interface AdminOpsMapPin {
  id: string;
  addressLine1: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  status: keyof typeof PROPERTY_STATUS_COLORS;
  accountName: string;
}

export interface AdminOpsMapProps {
  cells: AdminOpsMapCell[];
  properties: AdminOpsMapPin[];
  showCells: boolean;
  showProperties: boolean;
  className?: string;
}

const CELLS_FILL_LAYER_ID = "admin-route-cells-fill";

type Selection = { kind: "cell"; id: string } | { kind: "property"; id: string } | null;

/**
 * Staff-only combined map: route cells (colored by state) + property pins
 * (colored by status), each independently toggleable, with a click-to-popup
 * for the MRR/capacity/status detail that intentionally isn't baked into the
 * fill color. Always paired with an adjacent accessible table on the
 * consuming page — this component's own `fallback` stays a short pointer to
 * that table rather than a third copy of the same data.
 */
export function AdminOpsMap({ cells, properties, showCells, showProperties, className }: AdminOpsMapProps) {
  const [selection, setSelection] = useState<Selection>(null);

  const polygonFeatures = useMemo(
    () =>
      cells
        .filter((cell) => pickRouteCellRenderMode(cell) === "polygon")
        .map((cell) => ({
          type: "Feature" as const,
          geometry: cell.geometry as CellGeometry,
          properties: { id: cell.id, state: cell.state },
        })),
    [cells],
  );

  const markerCells = useMemo(() => cells.filter((cell) => pickRouteCellRenderMode(cell) === "marker"), [cells]);

  const locatedProperties = useMemo(
    () => properties.filter((p) => p.latitude !== null && p.longitude !== null),
    [properties],
  );

  const cellColorExpression = useMemo<ExpressionSpecification>(() => {
    const cases = Object.entries(STATE_COLORS).flatMap(([state, color]) => [state, color]);
    return ["match", ["get", "state"], ...cases, STATE_COLORS.research] as ExpressionSpecification;
  }, []);

  const cellsById = useMemo(() => new Map(cells.map((cell) => [cell.id, cell])), [cells]);
  const propertiesById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const selectedCell = selection?.kind === "cell" ? cellsById.get(selection.id) : undefined;
  const selectedProperty = selection?.kind === "property" ? propertiesById.get(selection.id) : undefined;

  return (
    <MapBase
      className={className}
      initialViewState={DEFAULT_MAP_CENTER}
      interactive
      interactiveLayerIds={showCells ? [CELLS_FILL_LAYER_ID] : []}
      onClick={(event) => {
        const feature = event.features?.[0];
        const cellId = feature?.properties?.id as string | undefined;
        setSelection(cellId ? { kind: "cell", id: cellId } : null);
      }}
      fallback={
        <div className="rounded-2xl border border-border bg-surface p-6 text-base text-muted">
          Map view unavailable — see the tables below.
        </div>
      }
    >
      {showCells && polygonFeatures.length > 0 ? (
        <Source
          id="admin-route-cells"
          type="geojson"
          data={{ type: "FeatureCollection", features: polygonFeatures }}
        >
          <Layer
            id={CELLS_FILL_LAYER_ID}
            type="fill"
            paint={{ "fill-color": cellColorExpression, "fill-opacity": 0.35 }}
          />
          <Layer
            id="admin-route-cells-outline"
            type="line"
            paint={{ "line-color": cellColorExpression, "line-width": 2 }}
          />
        </Source>
      ) : null}

      {showCells &&
        markerCells.map((cell) => (
          <Marker
            key={cell.id}
            longitude={cell.centerLongitude as number}
            latitude={cell.centerLatitude as number}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelection({ kind: "cell", id: cell.id });
            }}
          >
            <div
              title={`${cell.name} — ${STATE_LABELS[cell.state] ?? cell.state}`}
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "2px solid #0b1020",
                backgroundColor: STATE_COLORS[cell.state] ?? STATE_COLORS.research,
                cursor: "pointer",
              }}
            />
          </Marker>
        ))}

      {showProperties &&
        locatedProperties.map((pin) => (
          <Marker
            key={pin.id}
            longitude={pin.longitude as number}
            latitude={pin.latitude as number}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelection({ kind: "property", id: pin.id });
            }}
          >
            <div
              title={`${pin.addressLine1} — ${PROPERTY_STATUS_LABELS[pin.status] ?? pin.status}`}
              style={{
                width: 10,
                height: 10,
                border: "2px solid #0b1020",
                backgroundColor: PROPERTY_STATUS_COLORS[pin.status] ?? PROPERTY_STATUS_COLORS.active,
                cursor: "pointer",
              }}
            />
          </Marker>
        ))}

      {selectedCell && selectedCell.centerLatitude !== null && selectedCell.centerLongitude !== null ? (
        <Popup
          longitude={selectedCell.centerLongitude}
          latitude={selectedCell.centerLatitude}
          anchor="bottom"
          onClose={() => setSelection(null)}
        >
          <div className="text-sm text-bg">
            <p className="font-semibold">{selectedCell.name}</p>
            <p>{STATE_LABELS[selectedCell.state] ?? selectedCell.state}</p>
            <p>Capacity: {selectedCell.capacity ?? "—"}</p>
            <p>Active properties: {selectedCell.activeProperties}</p>
            <p>Monthly recurring: {formatCents(selectedCell.monthlyRecurringCents)}</p>
          </div>
        </Popup>
      ) : null}

      {selectedProperty && selectedProperty.latitude !== null && selectedProperty.longitude !== null ? (
        <Popup
          longitude={selectedProperty.longitude}
          latitude={selectedProperty.latitude}
          anchor="bottom"
          onClose={() => setSelection(null)}
        >
          <div className="text-sm text-bg">
            <p className="font-semibold">{selectedProperty.addressLine1}</p>
            <p>{selectedProperty.city}</p>
            <p>{selectedProperty.accountName}</p>
            <p>{PROPERTY_STATUS_LABELS[selectedProperty.status] ?? selectedProperty.status}</p>
          </div>
        </Popup>
      ) : null}
    </MapBase>
  );
}
