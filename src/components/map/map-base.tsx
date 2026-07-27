"use client";

import { useState, type ReactNode } from "react";
import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPS_TOKEN;

export interface MapBaseViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

export interface MapBaseProps {
  initialViewState: MapBaseViewState;
  /** Static, non-interactive by default — Phase A/B have no click-through UI yet. */
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
  /** Rendered instead of the map when the token is missing or the map fails to load. */
  fallback: ReactNode;
}

/**
 * Shared Mapbox mount/token/fallback plumbing. The map is always
 * supplementary to an adjacent accessible text list on the consuming page —
 * never the sole way to reach the same information. Deliberately NOT
 * `aria-hidden`: Mapbox's default attribution control renders a focusable
 * link, and `aria-hidden` on an ancestor of focusable content is itself a
 * WCAG violation. `role="group"` + `aria-label` describes it as a single
 * supplementary region instead. No camera animations (flyTo/easeTo) are
 * triggered anywhere Phase A/B uses this — Mapbox GL JS respects
 * `prefers-reduced-motion` for its own internal transitions.
 */
export function MapBase({ initialViewState, interactive = false, className, children, fallback }: MapBaseProps) {
  const [failed, setFailed] = useState(false);

  if (!MAPBOX_TOKEN || failed) {
    return <>{fallback}</>;
  }

  return (
    <div className={className} role="group" aria-label="Map (supplementary — see the list for the same information)">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%", borderRadius: "1rem" }}
        interactive={interactive}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        onError={() => setFailed(true)}
      >
        {children}
      </Map>
    </div>
  );
}
