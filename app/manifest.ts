import type { MetadataRoute } from "next";

// Tells phones how to install the app on the Home Screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "His & Hers Tracker",
    short_name: "His & Hers",
    description: "A shared workout and weight-loss tracker for two.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F4F1",
    theme_color: "#F3F4F1",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
