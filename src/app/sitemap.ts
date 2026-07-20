import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const PUBLIC_ROUTES = [
  "/",
  "/how-it-works",
  "/pricing",
  "/service-areas",
  "/service-areas/prescott-az",
  "/who-we-help",
  "/for-seniors",
  "/for-snowbirds",
  "/for-vacation-rentals",
  "/for-hoas",
  "/one-time-trash-day",
  "/bulk-pickup-coordination",
  "/faq",
  "/contact",
  "/waitlist",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
