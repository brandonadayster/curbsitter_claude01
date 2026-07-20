'use client';

import { useState, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function AdminHeatmap() {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Fetch the boundary GeoJSON when the dashboard loads
    async function loadBoundaries() {
      const response = await fetch('/api/boundaries');
      const data = await response.json();
      setGeoData(data);
    }
    loadBoundaries();
  }, []);

  return (
    <div className="w-full h-screen bg-[#0A0F1D] flex flex-col">
      <div className="p-6 bg-[#0A0F1D] border-b border-white/10 z-10">
        <h1 className="text-2xl font-bold text-white tracking-tight">Waitlist & Route Density</h1>
        <p className="text-slate-400 text-sm mt-1">Live territory acquisition monitoring.</p>
      </div>

      <div className="flex-grow relative">
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{
            longitude: -112.4683, // Centered on Prescott, AZ
            latitude: 34.5400,
            zoom: 11
          }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        >
          {/* Only render the polygons if the data has successfully loaded */}
          {geoData && (
            <Source type="geojson" data={geoData}>
              <Layer
  id="hoa-boundaries"
  type="fill"
  paint={{
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'waitlist_count'],
      0, '#0A0F1D',    // 0 signups: Deep Onyx (Invisible)
      5, '#00E5FF',    // 5 signups: Electric Cyan (Warm)
      15, '#FF00AA'    // 15+ signups: Neon Pink (HOT!)
    ],
    'fill-opacity': 0.7,
    'fill-outline-color': '#ffffff'
  }}
/>
            </Source>
          )}
        </Map>
      </div>
    </div>
  );
}
<Layer
  id="hoa-boundaries"
  type="fill"
  paint={{
    // If the subdivision has 0 signups, it's nearly invisible blue.
    // If it hits 15 (our unlock threshold), it turns neon pink!
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'waitlist_count'], // This looks at the number from our API
      0, '#001a4d',     // 0 signups: Deep Dark Blue
      5, '#00E5FF',     // 5 signups: Electric Cyan
      10, '#b300ff',    // 10 signups: Purple
      15, '#ff00aa'     // 15+ signups: Neon Pink (Route Unlocked!)
    ],
    'fill-opacity': 0.6,
    'fill-outline-color': '#ffffff'
  }}
/>
