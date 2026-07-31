"use client";

import { useMemo, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, MapLayerMouseEvent } from "mapbox-gl";
import { Layer, Marker, Popup, Source, useMap } from "react-map-gl/mapbox";

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
const PROPERTIES_SOURCE_ID = "admin-properties";
const PROPERTIES_CLUSTERS_LAYER_ID = "admin-properties-clusters";
const PROPERTIES_CLUSTER_COUNT_LAYER_ID = "admin-properties-cluster-count";
const PROPERTIES_UNCLUSTERED_LAYER_ID = "admin-properties-unclustered";

type Selection = { kind: "cell"; id: string } | { kind: "property"; id: string } | null;

/**
 * Staff-only combined map: route cells (colored by state) + property pins
 * (colored by status), each independently toggleable, with a click-to-popup
 * for the MRR/capacity/status detail that intentionally isn't baked into the
 * fill color. Always paired with an adjacent accessible table on the
 * consuming page — this component's own `fallback` stays a short pointer to
 * that table rather than a third copy of the same data.
 *
 * Properties render through Mapbox GL's native `cluster` source option
 * rather than one DOM `Marker` per property: at pilot scale a per-property
 * marker is fine, but it degrades badly past a few hundred properties.
 * Clustering keeps this on a GPU-composited layer with no added dependency
 * (deliberately not deck.gl — see docs/adr/0002 — which would add a
 * dependency and inherit its documented iOS-Safari heatmap float-texture
 * limitation to solve a problem the native `cluster` option already
 * handles). A cluster circle intentionally doesn't carry per-status color;
 * the always-adjacent property table still has exact status for every row,
 * so no information is lost, only summarized on the map.
 */
export function AdminOpsMap({ cells, properties, showCells, showProperties, className }: AdminOpsMapProps) {
  const [selection, setSelection] = useState<Selection>(null);
  const { current: map } = useMap();

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

  const propertyFeatures = useMemo(
    () =>
      locatedProperties.map((pin) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [pin.longitude as number, pin.latitude as number] },
        properties: { id: pin.id, status: pin.status },
      })),
    [locatedProperties],
  );

  const cellColorExpression = useMemo<ExpressionSpecification>(() => {
    const cases = Object.entries(STATE_COLORS).flatMap(([state, color]) => [state, color]);
    return ["match", ["get", "state"], ...cases, STATE_COLORS.research] as ExpressionSpecification;
  }, []);

  const propertyColorExpression = useMemo<ExpressionSpecification>(() => {
    const cases = Object.entries(PROPERTY_STATUS_COLORS).flatMap(([status, color]) => [status, color]);
    return ["match", ["get", "status"], ...cases, PROPERTY_STATUS_COLORS.active] as ExpressionSpecification;
  }, []);

  const cellsById = useMemo(() => new Map(cells.map((cell) => [cell.id, cell])), [cells]);
  const propertiesById = useMemo(() => new Map(properties.map((p) => [p.id, p])), [properties]);

  const selectedCell = selection?.kind === "cell" ? cellsById.get(selection.id) : undefined;
  const selectedProperty = selection?.kind === "property" ? propertiesById.get(selection.id) : undefined;

  const interactiveLayerIds = [
    ...(showCells ? [CELLS_FILL_LAYER_ID] : []),
    ...(showProperties ? [PROPERTIES_CLUSTERS_LAYER_ID, PROPERTIES_UNCLUSTERED_LAYER_ID] : []),
  ];

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const layerId = feature?.layer?.id;

    if (layerId === PROPERTIES_UNCLUSTERED_LAYER_ID) {
      const propertyId = feature?.properties?.id as string | undefined;
      setSelection(propertyId ? { kind: "property", id: propertyId } : null);
      return;
    }

    if (layerId === PROPERTIES_CLUSTERS_LAYER_ID) {
      setSelection(null);
      const clusterId = feature?.properties?.cluster_id as number | undefined;
      const source = map?.getSource(PROPERTIES_SOURCE_ID) as GeoJSONSource | undefined;
      if (clusterId === undefined || !source || feature?.geometry.type !== "Point") return;
      // Instant re-center/zoom (no flyTo/easeTo animation), consistent with
      // this map never triggering camera animation elsewhere.
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null || !map) return;
        const [lng, lat] = feature.geometry.type === "Point" ? feature.geometry.coordinates : [0, 0];
        map.jumpTo({ center: [lng, lat], zoom });
      });
      return;
    }

    if (layerId === CELLS_FILL_LAYER_ID) {
      const cellId = feature?.properties?.id as string | undefined;
      setSelection(cellId ? { kind: "cell", id: cellId } : null);
      return;
    }

    setSelection(null);
  }

  return (
    <MapBase
      className={className}
      initialViewState={DEFAULT_MAP_CENTER}
      interactive
      interactiveLayerIds={interactiveLayerIds}
      onClick={handleClick}
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

      {showProperties && propertyFeatures.length > 0 ? (
        <Source
          id={PROPERTIES_SOURCE_ID}
          type="geojson"
          data={{ type: "FeatureCollection", features: propertyFeatures }}
          cluster
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer
            id={PROPERTIES_CLUSTERS_LAYER_ID}
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": "#12d8f4",
              "circle-opacity": 0.75,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#0b1020",
              // Step radius up with cluster size so dense areas read as denser.
              "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 24],
            }}
          />
          <Layer
            id={PROPERTIES_CLUSTER_COUNT_LAYER_ID}
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            }}
            paint={{ "text-color": "#0b1020" }}
          />
          <Layer
            id={PROPERTIES_UNCLUSTERED_LAYER_ID}
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": propertyColorExpression,
              "circle-radius": 6,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#0b1020",
            }}
          />
        </Source>
      ) : null}

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
