import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentWise Lite",
  description: "Clear utility bill tracking for tenants and owners"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
