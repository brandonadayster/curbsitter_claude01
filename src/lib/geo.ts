/**
 * Minimal GeoJSON point-in-polygon (ray casting). Route-cell geometry is
 * stored as GeoJSON Polygon/MultiPolygon jsonb; vendor routing/PostGIS is
 * deliberately deferred (D-011).
 */

type Position = [number, number];

interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}

interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Position[][][];
}

export type CellGeometry = PolygonGeometry | MultiPolygonGeometry;

function pointInRing(point: Position, ring: Position[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: Position, polygon: Position[][]): boolean {
  if (polygon.length === 0 || !pointInRing(point, polygon[0])) return false;
  // Holes: inside a hole means outside the polygon.
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false;
  }
  return true;
}

export function pointInCellGeometry(
  longitude: number,
  latitude: number,
  geometry: unknown,
): boolean {
  const geo = geometry as CellGeometry | null;
  if (!geo || typeof geo !== "object" || !("type" in geo)) return false;
  const point: Position = [longitude, latitude];
  if (geo.type === "Polygon") return pointInPolygon(point, geo.coordinates);
  if (geo.type === "MultiPolygon")
    return geo.coordinates.some((polygon) => pointInPolygon(point, polygon));
  return false;
}
