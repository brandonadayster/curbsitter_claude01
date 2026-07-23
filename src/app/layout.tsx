import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { BUSINESS } from "@/config/business";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} — ${BUSINESS.primaryTagline}`,
    template: `%s | ${BUSINESS.name}`,
  },
  description:
    "CurbSitter is Prescott's local trash-day concierge. We roll your bins to the curb before pickup, return them after collection, and photo-confirm every visit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
