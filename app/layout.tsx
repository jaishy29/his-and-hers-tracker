import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-bsd", subsets: ["latin"], weight: ["700", "900"] });
const body = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "His & Hers Weight Loss Tracker",
  description: "A shared workout and weight-loss tracker for two.",
  applicationName: "His & Hers",
  appleWebApp: { capable: true, title: "His & Hers", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#141917" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
