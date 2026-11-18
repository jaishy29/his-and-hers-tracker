"use client";
// Practice mode: pretend data saved in this browser only (no login, no syncing).

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_REMIND_AT, OTHER, type Who } from "./constants";
import { todayNY } from "./dates";
import { newMilestone } from "./derive";
import { emptyPerson, makeDemoData } from "./demo";
import { ls, StoreCtx, useClock, type Store } from "./storeCore";
import type { AppData, FeedItem } from "./types";

const DATA_KEY = "hh-demo-v1";
const ME_KEY = "hh-me";

export function DemoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(() => ({ people: { his: emptyPerson(), hers: emptyPerson() }, feed: [] }));
  const [me, setMeState] = useState<Who | null>(null);
  const { today, nowHM, nowMs } = useClock();

  useEffect(() => {
    let d: AppData | null = null;
    try { d = JSON.parse(ls.get(DATA_KEY) || "null"); } catch { d = null; }
    if (!d?.people?.his) {
      d = makeDemoData(todayNY());
      ls.set(DATA_KEY, JSON.stringify(d));
    }
    const m = ls.get(ME_KEY);
    /* eslint-disable react-hooks/set-state-in-effect -- loading saved data once on first open */
    setData(d);
    setMeState(m === "his" || m === "hers" ? m : null);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const commit = useCallback((fn: (d: AppData) => void) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      ls.set(DATA_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const store = useMemo<Store>(() => {
    const need = () => {
      if (!me) throw new Error("Pick who you are first");
      return me;
    };
    const post = (d: AppData, o: Omit<FeedItem, "id" | "seen" | "at">) => {
      const at = Date.now();
      d.feed.unshift({ id: `${at}-${o.who}-${Math.random().toString(36).slice(2, 6)}`, seen: false, at, ...o });
      d.feed = d.feed.slice(0, 100);
    };
    const setMe = (who: Who | null) => {
      setMeState(who);
      if (who) ls.set(ME_KEY, who); else ls.del(ME_KEY);
    };
    return {
      mode: "demo",
      ready, data, me, today, nowHM, nowMs,
      syncLabel: "Practice mode · saved on this device",
      auth: {
        status: !ready ? "loading" : me ? "ready" : "needsSide",
        email: null,
        freeSides: ["his", "hers"],
        signIn: async () => null,
        signUp: async () => null,
        claimSide: async (who) => { setMe(who); return null; },
        signOut: async () => setMe(null),
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
            post(d, kind === "done" && log
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
        const hit = newMilestone(data.people[who], who, day, value);
        commit((d) => {
          if (value == null) delete d.people[who].weights[day];
          else d.people[who].weights[day] = value;
          if (hit) post(d, { kind: "milestone", who, to: OTHER[who], lost: hit.lost, goal: hit.goal });
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
        commit((d) => post(d, { kind: "nudge", who, to: OTHER[who], msg: msg.slice(0, 120) }));
      },
      sendCheer() {
        const who = need();
        commit((d) => post(d, { kind: "cheer", who, to: OTHER[who] }));
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

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}
