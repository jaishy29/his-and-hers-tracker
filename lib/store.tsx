"use client";
// The app's data and every action that changes it.
// Milestone 1: pretend data saved in this browser only.
// Milestone 2+: the same actions will save to Supabase and sync both phones.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_REMIND_AT, OTHER, type Who } from "./constants";
import { nowHMNY, todayNY } from "./dates";
import { bestWeight, milestones } from "./derive";
import { emptyPerson, makeDemoData } from "./demo";
import type { AppData, DayMark, FeedItem, Milestone, WorkoutLog } from "./types";

const DATA_KEY = "hh-demo-v1";
const ME_KEY = "hh-me";

const ls = {
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
export { ls };

interface Store {
  ready: boolean;
  data: AppData;
  me: Who | null;
  today: string;
  nowHM: string;
  /** Current time in ms, refreshed every 30 seconds (for "5m ago" labels). */
  nowMs: number;
  syncLabel: string;
  setMe(who: Who | null): void;
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

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be inside <DataProvider>");
  return s;
}

const blankData = (): AppData => ({ people: { his: emptyPerson(), hers: emptyPerson() }, feed: [] });

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(blankData);
  const [me, setMeState] = useState<Who | null>(null);
  const [today, setToday] = useState("2000-01-01");
  const [nowHM, setNowHM] = useState("00:00");
  const [nowMs, setNowMs] = useState(0);

  // Load once in the browser.
  useEffect(() => {
    const t = todayNY();
    let d: AppData | null = null;
    try { d = JSON.parse(ls.get(DATA_KEY) || "null"); } catch { d = null; }
    if (!d?.people?.his) {
      d = makeDemoData(t);
      ls.set(DATA_KEY, JSON.stringify(d));
    }
    const m = ls.get(ME_KEY);
    /* eslint-disable react-hooks/set-state-in-effect -- loading saved data once on first open */
    setData(d);
    setMeState(m === "his" || m === "hers" ? m : null);
    setToday(t);
    setNowHM(nowHMNY());
    setNowMs(Date.now());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Keep "today" and the clock fresh (for late check-ins and midnight rollover).
  useEffect(() => {
    const tick = () => { setToday(todayNY()); setNowHM(nowHMNY()); setNowMs(Date.now()); };
    const id = setInterval(tick, 30_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const commit = useCallback((fn: (d: AppData) => void) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      ls.set(DATA_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const postTo = (d: AppData, o: Omit<FeedItem, "id" | "seen" | "at">) => {
    const at = Date.now();
    d.feed.unshift({ id: `${at}-${o.who}-${Math.random().toString(36).slice(2, 6)}`, seen: false, at, ...o });
    d.feed = d.feed.slice(0, 100);
  };

  const store = useMemo<Store>(() => {
    const need = () => {
      if (!me) throw new Error("Pick who you are first");
      return me;
    };
    return {
      ready, data, me, today, nowHM, nowMs,
      syncLabel: "Practice mode · saved on this device",
      setMe(who) {
        setMeState(who);
        if (who) ls.set(ME_KEY, who); else ls.del(ME_KEY);
      },
      checkIn(kind, log) {
        const who = need();
        const was = data.people[who].workouts[today];
        commit((d) => {
          const p = d.people[who];
          p.workouts[today] = kind;
          if (kind === "done" && log) p.logs[today] = { ...log, at: Date.now() };
          else delete p.logs[today];
          if (was !== kind) {
            postTo(d, kind === "done" && log
              ? { kind: "checkin", who, to: OTHER[who], type: log.type, min: log.min, int: log.int }
              : { kind: "rest", who, to: OTHER[who] });
          }
        });
        return { was };
      },
      clearToday() {
        const who = need();
        commit((d) => {
          delete d.people[who].workouts[today];
          delete d.people[who].logs[today];
        });
      },
      setDay(who, day, mark) {
        commit((d) => {
          const p = d.people[who];
          if (mark) p.workouts[day] = mark;
          else delete p.workouts[day];
          if (mark !== "done") delete p.logs[day];
        });
      },
      logWeight(who, day, value) {
        const before = bestWeight(data.people[who]);
        const after = value == null
          ? null
          : Math.min(value, ...Object.entries(data.people[who].weights).filter(([k]) => k !== day).map(([, v]) => v));
        const newly = milestones(who).filter(
          (m) => after != null && after <= m.target && !(before != null && before <= m.target),
        );
        const hit = newly.length ? newly[newly.length - 1] : null;
        commit((d) => {
          if (value == null) delete d.people[who].weights[day];
          else d.people[who].weights[day] = value;
          if (hit) postTo(d, { kind: "milestone", who, to: OTHER[who], lost: hit.lost, goal: hit.goal });
        });
        return hit;
      },
      setName(v) {
        const who = need();
        commit((d) => { d.people[who].name = v.trim().slice(0, 20); });
      },
      setRemindAt(v) {
        const who = need();
        commit((d) => { d.people[who].remindAt = v || DEFAULT_REMIND_AT; });
      },
      sendNudge(msg) {
        const who = need();
        commit((d) => postTo(d, { kind: "nudge", who, to: OTHER[who], msg: msg.slice(0, 120) }));
      },
      sendCheer() {
        const who = need();
        commit((d) => postTo(d, { kind: "cheer", who, to: OTHER[who] }));
      },
      markSeen(id) {
        commit((d) => {
          const f = d.feed.find((x) => x.id === id);
          if (f) f.seen = true;
        });
      },
      scratch(target) {
        const who = need();
        commit((d) => { d.people[who].scratched[target] = true; });
      },
      resetDemo() {
        const fresh = makeDemoData(todayNY());
        ls.set(DATA_KEY, JSON.stringify(fresh));
        setData(fresh);
      },
    };
  }, [ready, data, me, today, nowHM, nowMs, commit]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
