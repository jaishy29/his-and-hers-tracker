"use client";
// Shared pieces of the data store (see lib/store.tsx).
// Two versions exist behind the same interface:
//  - Live mode (lib/liveStore.tsx): real logins, saved in Supabase, synced between both phones.
//  - Practice mode (lib/demoStore.tsx): pretend data in this browser only. Used when Supabase
//    isn't set up yet (no keys in .env.local).

import { createContext, useContext, useEffect, useState } from "react";
import type { Who } from "./constants";
import { nowHMNY, todayNY } from "./dates";
import type { AppData, DayMark, Milestone, WorkoutLog } from "./types";

export const ls = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* storage unavailable */ }
  },
  del(k: string) {
    try { localStorage.removeItem(k); } catch { /* storage unavailable */ }
  },
};

export type AuthStatus = "loading" | "signedOut" | "needsSide" | "ready";

export interface AuthApi {
  status: AuthStatus;
  email: string | null;
  freeSides: Who[];
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string): Promise<string | null>;
  claimSide(who: Who): Promise<string | null>;
  signOut(): Promise<void>;
}

export interface Store {
  mode: "demo" | "live";
  ready: boolean;
  data: AppData;
  me: Who | null;
  today: string;
  nowHM: string;
  /** Current time in ms, refreshed every 30 seconds (for "5m ago" labels). */
  nowMs: number;
  syncLabel: string;
  auth: AuthApi;
  checkIn(kind: DayMark, log?: Omit<WorkoutLog, "at">): { was: DayMark | undefined };
  clearToday(): void;
  setDay(who: Who, day: string, mark: DayMark | null): void;
  logWeight(who: Who, day: string, value: number | null): Milestone | null;
  setName(v: string): void;
  setRemindAt(v: string): void;
  sendNudge(msg: string): void;
  sendCheer(): void;
  markSeen(id: string): void;
  scratch(target: number): void;
  resetDemo(): void;
}

export const StoreCtx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore must be inside <DataProvider>");
  return s;
}

/** Keeps "today" and the clock fresh (for late check-ins and midnight rollover). */
export function useClock() {
  const [clock, setClock] = useState({ today: "2000-01-01", nowHM: "00:00", nowMs: 0 });
  useEffect(() => {
    const tick = () => setClock({ today: todayNY(), nowHM: nowHMNY(), nowMs: Date.now() });
    tick();
    const id = setInterval(tick, 30_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  return clock;
}
