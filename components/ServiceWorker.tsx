"use client";
import { useEffect } from "react";

/** Registers the background helper that makes the app installable (and, later, receives notifications). */
export default function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
  }, []);
  return null;
}
