import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/hanken-grotesk";
import "./globals.css";
import { Tracker } from "@/components/analytics/tracker";
import { SITE_URL } from "@/lib/supabase/env";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Agental — a real agent, augmented by AI", template: "%s · Agental" },
  description:
    "Focus on your craft, we handle the rest. A real agent who represents you and an AI that watches castings 24/7. Free to join.",
  openGraph: { siteName: "Agental", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#17132e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
        <Tracker />
      </body>
    </html>
  );
}
