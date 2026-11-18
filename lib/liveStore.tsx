"use client";
// Live mode: real logins, data saved in Supabase, and live syncing between both phones.
// Every change shows on screen immediately, then saves in the background.
// If a save fails, the app says so and reloads the real data.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useToast } from "@/components/Toast";
import { DEFAULT_REMIND_AT, OTHER, type Intensity, type Who, type WorkoutType } from "./constants";
import { alreadyAnnounced, newMilestone, todaysDayPosts } from "./derive";
import { emptyPerson } from "./demo";
import { feedText } from "./feedText";
import { StoreCtx, useClock, type AuthStatus, type Store } from "./storeCore";
import { supabase } from "./supabase";
import type { AppData, DayMark, FeedItem, FeedKind } from "./types";

interface PeopleRow { side: Who; name: string; remind_at: string }
interface DayRow {
  side: Who; day: string; mark: DayMark; type: WorkoutType | null; minutes: number | null;
  intensity: Intensity | null; note: string; logged_at: string;
}
interface WeightRow { side: Who; day: string; lb: number }
interface ScratchRow { side: Who; target: number }
interface FeedRow {
  id: string; who: Who; to_side: Who; kind: FeedKind; at: string; seen: boolean;
  type: WorkoutType | null; minutes: number | null; intensity: Intensity | null;
  msg: string | null; lost: number | null; goal: boolean | null;
}

const emptyData = (): AppData => ({ people: { his: emptyPerson(), hers: emptyPerson() }, feed: [] });

function toAppData(people: PeopleRow[], days: DayRow[], weights: WeightRow[], scratched: ScratchRow[], feed: FeedRow[]): AppData {
  const d = emptyData();
  for (const p of people) {
    d.people[p.side].name = p.name;
    d.people[p.side].remindAt = p.remind_at || DEFAULT_REMIND_AT;
  }
  for (const r of days) {
    const p = d.people[r.side];
    p.workouts[r.day] = r.mark;
    if (r.mark === "done" && r.type) {
      p.logs[r.day] = { type: r.type, min: r.minutes ?? 0, int: r.intensity ?? "moderate", note: r.note ?? "", at: Date.parse(r.logged_at) };
    }
  }
  for (const w of weights) d.people[w.side].weights[w.day] = Number(w.lb);
  for (const s of scratched) d.people[s.side].scratched[s.target] = true;
  d.feed = feed.map((f) => ({
    id: f.id, who: f.who, to: f.to_side, kind: f.kind, at: Date.parse(f.at), seen: f.seen,
    type: f.type ?? undefined, min: f.minutes ?? undefined, int: f.intensity ?? undefined,
    msg: f.msg ?? undefined, lost: f.lost ?? undefined, goal: f.goal ?? undefined,
  }));
  return d;
}

/** Turns Supabase's error messages into plain English. */
function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match. Check them and try again.";
  if (/already registered|already exists/i.test(msg)) return "There's already an account with that email. Tap “I already have an account” to log in.";
  if (/password should be at least/i.test(msg)) return "Please use a password with at least 8 characters.";
  if (/email.*invalid|invalid.*email/i.test(msg)) return "That doesn't look like a valid email address.";
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  if (/fetch|network/i.test(msg)) return "Can't reach the server. Check your internet connection.";
  return msg;
}

type Result = { error: { message: string } | null };

export function LiveProvider({ children }: { children: ReactNode }) {
  const sb = useMemo(() => supabase(), []);
  const toast = useToast();
  const clock = useClock();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [me, setMe] = useState<Who | null>(null);
  const [sideChecked, setSideChecked] = useState(false);
  const [freeSides, setFreeSides] = useState<Who[]>([]);
  const [data, setData] = useState<AppData>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<"ok" | "saving" | "error" | "offline">("ok");
  const knownIds = useRef<Set<string> | null>(null);
  const meRef = useRef<Who | null>(null);
  useEffect(() => { meRef.current = me; }, [me]);

  // ---- Login state ----
  useEffect(() => {
    sb.auth.getSession().then(({ data: s }) => { setSession(s.session); setAuthLoaded(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const checkSide = useCallback(async () => {
    const { data: side } = await sb.rpc("my_side");
    if (side === "his" || side === "hers") {
      setMe(side);
      setFreeSides([]);
    } else {
      setMe(null);
      const { data: free } = await sb.rpc("free_sides");
      setFreeSides(((free as string[] | null) ?? []).filter((x): x is Who => x === "his" || x === "hers"));
    }
    setSideChecked(true);
  }, [sb]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- look up the side after login; reset everything after logout */
    if (userId) { checkSide(); return; }
    setMe(null);
    setSideChecked(false);
    setLoaded(false);
    setData(emptyData());
    knownIds.current = null;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userId, checkSide]);

  // ---- Loading and live syncing ----
  const load = useCallback(async () => {
    const [p, d, w, s, f] = await Promise.all([
      sb.from("people").select("side,name,remind_at"),
      sb.from("days").select("side,day,mark,type,minutes,intensity,note,logged_at"),
      sb.from("weights").select("side,day,lb"),
      sb.from("scratched").select("side,target"),
      sb.from("feed").select("*").order("at", { ascending: false }).limit(100),
    ]);
    if (p.error || d.error || w.error || s.error || f.error) {
      setSync(navigator.onLine ? "error" : "offline");
      return;
    }
    const next = toAppData(p.data as PeopleRow[], d.data as DayRow[], w.data as WeightRow[], s.data as ScratchRow[], f.data as FeedRow[]);
    const mine = meRef.current;
    if (knownIds.current && mine) {
      for (const item of next.feed) {
        if (!knownIds.current.has(item.id) && item.to === mine && item.who !== mine && Date.now() - item.at < 120_000) {
          toast(feedText(item, next));
        }
      }
    }
    knownIds.current = new Set(next.feed.map((x) => x.id));
    setData(next);
    setLoaded(true);
    setSync("ok");
  }, [sb, toast]);

  useEffect(() => {
    if (!me) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
    reload();
    const channel = sb
      .channel("hh-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, reload)
      .subscribe((status) => { if (status === "SUBSCRIBED") reload(); });
    const onVis = () => { if (document.visibilityState === "visible") reload(); };
    const onOffline = () => setSync("offline");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", reload);
    window.addEventListener("offline", onOffline);
    return () => {
      clearTimeout(timer);
      sb.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", reload);
      window.removeEventListener("offline", onOffline);
    };
  }, [me, sb, load]);

  /** Show a change right away, then save it. */
  const run = useCallback((local: (d: AppData) => void, remote: () => PromiseLike<Result>) => {
    setData((prev) => { const n = structuredClone(prev); local(n); return n; });
    setSync("saving");
    const fail = () => {
      setSync(navigator.onLine ? "error" : "offline");
      toast("Couldn't save. Check your connection and try again.");
      load();
    };
    Promise.resolve(remote()).then((r) => (r.error ? fail() : setSync("ok")), fail);
  }, [toast, load]);

  // ---- Everything the screens can do ----
  const store = useMemo<Store>(() => {
    const { today } = clock;
    const need = () => {
      if (!me) throw new Error("Not linked to a side yet");
      return me;
    };
    const tempItem = (o: Omit<FeedItem, "id" | "seen" | "at">): FeedItem =>
      ({ id: `temp-${Date.now()}-${Math.random()}`, seen: false, at: Date.now(), ...o });
    const feedRow = (f: FeedItem) => ({
      who: f.who, to_side: f.to, kind: f.kind, type: f.type ?? null, minutes: f.min ?? null,
      intensity: f.int ?? null, msg: f.msg ?? null, lost: f.lost ?? null, goal: f.goal ?? null,
    });
    /** Saves a feed post, then asks the server to notify your partner about it. */
    const postFeed = async (item: FeedItem): Promise<Result> => {
      const r = await sb.from("feed").insert(feedRow(item)).select("id").single();
      if (!r.error && r.data?.id && session?.access_token) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: r.data.id }),
          keepalive: true,
        }).catch(() => { /* a missed notification shouldn't block saving */ });
      }
      return r;
    };
    /** Removes feed posts (skips ones that only exist on this screen so far). */
    const deleteFeed = async (ids: string[]): Promise<Result> => {
      const real = ids.filter((id) => !id.startsWith("temp-"));
      return real.length ? sb.from("feed").delete().in("id", real) : { error: null };
    };

    const status: AuthStatus = !authLoaded ? "loading"
      : !session ? "signedOut"
      : !sideChecked ? "loading"
      : !me ? "needsSide"
      : !loaded ? "loading"
      : "ready";

    return {
      mode: "live",
      ready: status === "ready",
      data, me, ...clock,
      syncLabel: sync === "saving" ? "Saving…"
        : sync === "error" ? "Couldn't save. Check your connection."
        : sync === "offline" ? "Offline. Changes may not save."
        : "Synced with your partner",
      auth: {
        status,
        email: session?.user.email ?? null,
        freeSides,
        async signIn(email, password) {
          const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
          return error ? friendly(error.message) : null;
        },
        async signUp(email, password) {
          const { data: res, error } = await sb.auth.signUp({ email: email.trim(), password });
          if (error) return friendly(error.message);
          if (!res.session) return "Your account was created, but Supabase is asking for email confirmation. Turn off “Confirm email” in Supabase, then log in.";
          return null;
        },
        async claimSide(who) {
          const { error } = await sb.rpc("claim_side", { p_side: who });
          await checkSide();
          return error ? friendly(error.message) : null;
        },
        async signOut() {
          await sb.auth.signOut();
        },
      },

      checkIn(kind, log) {
        const who = need();
        const was = data.people[who].workouts[today];
        const withLog = kind === "done" && log;
        const item = was === kind ? null : tempItem(withLog
          ? { kind: "checkin", who, to: OTHER[who], type: log.type, min: log.min, int: log.int }
          : { kind: "rest", who, to: OTHER[who] });
        // Switching between workout and rest day replaces today's earlier post.
        const replaced = item && was ? todaysDayPosts(data.feed, who, today).map((f) => f.id) : [];
        run((d) => {
          const p = d.people[who];
          p.workouts[today] = kind;
          if (withLog) p.logs[today] = { ...log, at: Date.now() };
          else delete p.logs[today];
          d.feed = d.feed.filter((f) => !replaced.includes(f.id));
          if (item) d.feed.unshift(item);
        }, async () => {
          const del = await deleteFeed(replaced);
          if (del.error) return del;
          const r = await sb.from("days").upsert({
            side: who, day: today, mark: kind,
            type: withLog ? log.type : null, minutes: withLog ? log.min : null,
            intensity: withLog ? log.int : null, note: withLog ? log.note : "",
            logged_at: new Date().toISOString(),
          });
          return r.error || !item ? r : postFeed(item);
        });
        return { was };
      },

      clearToday() {
        const who = need();
        const posts = todaysDayPosts(data.feed, who, today).map((f) => f.id);
        run((d) => {
          delete d.people[who].workouts[today];
          delete d.people[who].logs[today];
          d.feed = d.feed.filter((f) => !posts.includes(f.id));
        }, async () => {
          const r = await sb.from("days").delete().eq("side", who).eq("day", today);
          return r.error ? r : deleteFeed(posts);
        });
      },

      setDay(who, day, mark) {
        run((d) => {
          const p = d.people[who];
          if (mark) p.workouts[day] = mark;
          else delete p.workouts[day];
          if (mark !== "done") delete p.logs[day];
        }, () => mark
          ? sb.from("days").upsert({ side: who, day, mark, type: null, minutes: null, intensity: null, note: "", logged_at: new Date().toISOString() })
          : sb.from("days").delete().eq("side", who).eq("day", day));
      },

      logWeight(who, day, value) {
        const hit = newMilestone(data.people[who], who, day, value);
        const item = hit && !alreadyAnnounced(data.feed, who, hit)
          ? tempItem({ kind: "milestone", who, to: OTHER[who], lost: hit.lost, goal: hit.goal }) : null;
        run((d) => {
          if (value == null) delete d.people[who].weights[day];
          else d.people[who].weights[day] = value;
          if (item) d.feed.unshift(item);
        }, async () => {
          const r = value == null
            ? await sb.from("weights").delete().eq("side", who).eq("day", day)
            : await sb.from("weights").upsert({ side: who, day, lb: value });
          return r.error || !item ? r : postFeed(item);
        });
        return hit;
      },

      setName(v) {
        const who = need();
        const name = v.trim().slice(0, 20);
        run((d) => { d.people[who].name = name; },
          () => sb.from("people").update({ name, updated_at: new Date().toISOString() }).eq("side", who));
      },

      setRemindAt(v) {
        const who = need();
        const t = v || DEFAULT_REMIND_AT;
        run((d) => { d.people[who].remindAt = t; },
          () => sb.from("people").update({ remind_at: t, updated_at: new Date().toISOString() }).eq("side", who));
      },

      sendNudge(msg) {
        const who = need();
        const item = tempItem({ kind: "nudge", who, to: OTHER[who], msg: msg.slice(0, 120) });
        run((d) => { d.feed.unshift(item); }, () => postFeed(item));
      },

      sendCheer() {
        const who = need();
        const item = tempItem({ kind: "cheer", who, to: OTHER[who] });
        run((d) => { d.feed.unshift(item); }, () => postFeed(item));
      },

      markSeen(id) {
        run((d) => {
          const f = d.feed.find((x) => x.id === id);
          if (f) f.seen = true;
        }, () => (id.startsWith("temp-") ? Promise.resolve({ error: null }) : sb.from("feed").update({ seen: true }).eq("id", id)));
      },

      scratch(target) {
        const who = need();
        run((d) => { d.people[who].scratched[target] = true; },
          () => sb.from("scratched").upsert({ side: who, target }));
      },

      resetDemo() { /* practice mode only */ },
    };
  }, [authLoaded, session, sideChecked, me, loaded, data, clock, sync, freeSides, sb, run, checkSide]);

  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>;
}
