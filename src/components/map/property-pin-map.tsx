"use client";

import { useMemo } from "react";
import { Marker } from "react-map-gl/mapbox";

import { MapBase } from "./map-base";
import { DEFAULT_MAP_CENTER } from "./route-cell-map-data";

export interface PropertyPin {
  id: string;
  addressLine1: string;
  latitude: number | null;
  longitude: number | null;
}

export interface PropertyPinMapProps {
  properties: PropertyPin[];
  className?: string;
}

/**
 * Customer-dashboard map of the signed-in customer's own properties. This is
 * the one map surface where showing an exact address+pin is appropriate —
 * authenticated, RLS-scoped to the customer's own data.
 */
export function PropertyPinMap({ properties, className }: PropertyPinMapProps) {
  const located = useMemo(
    () => properties.filter((property) => property.latitude !== null && property.longitude !== null),
    [properties],
  );

  const initialViewState = useMemo(() => {
    if (located.length === 0) return DEFAULT_MAP_CENTER;
    const first = located[0];
    return { longitude: first.longitude as number, latitude: first.latitude as number, zoom: 13 };
  }, [located]);

  if (located.length === 0) return null;

  return (
    <MapBase
      className={className}
      initialViewState={initialViewState}
      fallback={
        <div className="rounded-2xl border border-border bg-surface p-6 text-base text-muted">
          Map view unavailable — see your property addresses above.
        </div>
      }
    >
      {located.map((property) => (
        <Marker
          key={property.id}
          longitude={property.longitude as number}
          latitude={property.latitude as number}
          anchor="bottom"
        >
          <div
            title={property.addressLine1}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid #0b1020",
              backgroundColor: "#12d8f4",
            }}
          />
        </Marker>
      ))}
    </MapBase>
  );
}
