export type RouteCellState =
  | "research"
  | "waitlist"
  | "opening"
  | "active"
  | "capacity_full"
  | "premium_review"
  | "closed";

/** Public-facing label per route-cell state — shared by the text list and the map legend. */
export const STATE_LABELS: Record<string, string> = {
  research: "Researching",
  waitlist: "Waitlist open",
  opening: "Opening soon",
  active: "Active",
  capacity_full: "At capacity",
  premium_review: "By review",
  closed: "Closed",
};

/** Map marker/polygon fill color per state — matches design tokens in globals.css. */
export const STATE_COLORS: Record<string, string> = {
  research: "#aab5c6", // --color-muted
  waitlist: "#d7a64a", // --color-warm
  opening: "#12d8f4", // --color-cyan
  active: "#2ccb7f", // --color-success
  capacity_full: "#f26464", // --color-danger
  premium_review: "#aab5c6", // --color-muted
  closed: "#5c6577",
};
