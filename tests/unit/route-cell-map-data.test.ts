import { describe, expect, it } from "vitest";

import { pickRouteCellRenderMode, type RouteCellGeoInput } from "@/components/map/route-cell-map-data";

const polygon: RouteCellGeoInput["geometry"] = {
  type: "Polygon",
  coordinates: [
    [
      [-112.5, 34.5],
      [-112.4, 34.5],
      [-112.4, 34.6],
      [-112.5, 34.6],
      [-112.5, 34.5],
    ],
  ],
};

describe("pickRouteCellRenderMode", () => {
  it("renders a polygon when geometry is present, even without a center point", () => {
    const cell: RouteCellGeoInput = { geometry: polygon, centerLatitude: null, centerLongitude: null };
    expect(pickRouteCellRenderMode(cell)).toBe("polygon");
  });

  it("prefers polygon over a center point when both are present", () => {
    const cell: RouteCellGeoInput = { geometry: polygon, centerLatitude: 34.55, centerLongitude: -112.45 };
    expect(pickRouteCellRenderMode(cell)).toBe("polygon");
  });

  it("falls back to a marker when only a center point is set", () => {
    const cell: RouteCellGeoInput = { geometry: null, centerLatitude: 34.55, centerLongitude: -112.45 };
    expect(pickRouteCellRenderMode(cell)).toBe("marker");
  });

  it("omits the cell when neither geometry nor a center point is set", () => {
    const cell: RouteCellGeoInput = { geometry: null, centerLatitude: null, centerLongitude: null };
    expect(pickRouteCellRenderMode(cell)).toBe("omit");
  });

  it("omits the cell when only one of centerLatitude/centerLongitude is set", () => {
    expect(
      pickRouteCellRenderMode({ geometry: null, centerLatitude: 34.55, centerLongitude: null }),
    ).toBe("omit");
    expect(
      pickRouteCellRenderMode({ geometry: null, centerLatitude: null, centerLongitude: -112.45 }),
    ).toBe("omit");
  });
});
