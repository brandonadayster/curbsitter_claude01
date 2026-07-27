"use client";

import { useMemo } from "react";
import type { ExpressionSpecification } from "mapbox-gl";
import { Layer, Marker, Source } from "react-map-gl/mapbox";

import type { CellGeometry } from "@/lib/geo";
import { STATE_COLORS, STATE_LABELS, type RouteCellState } from "@/lib/route-cell-labels";

import { MapBase } from "./map-base";
import { DEFAULT_MAP_CENTER, pickRouteCellRenderMode } from "./route-cell-map-data";
import { RouteCellMapFallback } from "./route-cell-map-fallback";

export interface RouteCellMapCell {
  id: string;
  name: string;
  slug: string;
  state: RouteCellState;
  geometry: CellGeometry | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
}

export interface RouteCellMapProps {
  cells: RouteCellMapCell[];
  className?: string;
}

/**
 * Public route-cell status map — colored/labeled by `state` only, never a
 * count. Renders a polygon when a cell has real boundary geometry, a marker
 * at its admin-set center point otherwise, and omits cells with neither
 * (they still appear in the page's adjacent text list).
 */
export function RouteCellMap({ cells, className }: RouteCellMapProps) {
  const polygonFeatures = useMemo(
    () =>
      cells
        .filter((cell) => pickRouteCellRenderMode(cell) === "polygon")
        .map((cell) => ({
          type: "Feature" as const,
          geometry: cell.geometry as CellGeometry,
          properties: { id: cell.id, name: cell.name, state: cell.state },
        })),
    [cells],
  );

  const markerCells = useMemo(
    () => cells.filter((cell) => pickRouteCellRenderMode(cell) === "marker"),
    [cells],
  );

  const colorMatchExpression = useMemo<ExpressionSpecification>(() => {
    const cases = Object.entries(STATE_COLORS).flatMap(([state, color]) => [state, color]);
    return ["match", ["get", "state"], ...cases, STATE_COLORS.research] as ExpressionSpecification;
  }, []);

  return (
    <MapBase
      className={className}
      initialViewState={DEFAULT_MAP_CENTER}
      fallback={<RouteCellMapFallback cells={cells} />}
    >
      {polygonFeatures.length > 0 ? (
        <Source
          id="route-cells"
          type="geojson"
          data={{ type: "FeatureCollection", features: polygonFeatures }}
        >
          <Layer
            id="route-cells-fill"
            type="fill"
            paint={{ "fill-color": colorMatchExpression, "fill-opacity": 0.35 }}
          />
          <Layer
            id="route-cells-outline"
            type="line"
            paint={{ "line-color": colorMatchExpression, "line-width": 2 }}
          />
        </Source>
      ) : null}

      {markerCells.map((cell) => (
        <Marker
          key={cell.id}
          longitude={cell.centerLongitude as number}
          latitude={cell.centerLatitude as number}
          anchor="bottom"
        >
          <div
            title={`${cell.name} — ${STATE_LABELS[cell.state] ?? cell.state}`}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid #0b1020",
              backgroundColor: STATE_COLORS[cell.state] ?? STATE_COLORS.research,
            }}
          />
        </Marker>
      ))}
    </MapBase>
  );
}
