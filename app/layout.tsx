import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsTracker } from "@/components/analytics-tracker";

export const metadata: Metadata = {
  applicationName: "RentWise Lite",
  title: { default: "RentWise Lite", template: "%s · RentWise Lite" },
  description: "Rental management app for owners, admins, and tenants.",
  manifest: "/manifest.json",
  icons: { icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "RentWise", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#14231D" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AnalyticsTracker />{children}</body>
    </html>
  );
}
