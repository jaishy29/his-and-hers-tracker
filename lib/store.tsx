"use client";
// The app's data and every action that changes it, shared by every screen.
// Two versions exist behind the same interface:
//  - Live mode (lib/liveStore.tsx): real logins, saved in Supabase, synced between both phones.
//  - Practice mode (lib/demoStore.tsx): pretend data in this browser only. Used when Supabase
//    isn't set up yet (no keys in .env.local).

import type { ReactNode } from "react";
import { supabaseConfigured } from "./supabase";
import { DemoProvider } from "./demoStore";
import { LiveProvider } from "./liveStore";

export * from "./storeCore";

export function DataProvider({ children }: { children: ReactNode }) {
  return supabaseConfigured ? <LiveProvider>{children}</LiveProvider> : <DemoProvider>{children}</DemoProvider>;
}
