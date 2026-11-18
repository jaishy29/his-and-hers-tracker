// Pretend data for practice mode (Milestone 1). Replaced by the real database in Milestone 2.
import { DEFAULT_REMIND_AT, INTS, MINS, WORKOUT_START, type Who } from "./constants";
import { addDays, iso, parse, WEIGH_DATES } from "./dates";
import type { AppData, FeedItem, PersonState, WorkoutLog } from "./types";

export const emptyPerson = (): PersonState => ({
  name: "",
  remindAt: DEFAULT_REMIND_AT,
  workouts: {},
  logs: {},
  weights: {},
  scratched: {},
});

/** Small repeatable random number generator so the pretend data is the same every time. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLAN: Record<Who, { types: WorkoutLog["type"][]; perWeek: number[]; seed: number; name: string }> = {
  his: { types: ["strength", "strength", "walk", "cycle", "hiit", "run"], perWeek: [-2.6, -2.6, -2.6, -2.6, -2.2, -2.0], seed: 7, name: "" },
  hers: { types: ["walk", "yoga", "cardio", "strength", "walk", "swim"], perWeek: [-2.0, -1.8, -0.8, -0.8, -1.0, -0.9], seed: 11, name: "" },
};

export function makeDemoData(today: string): AppData {
  const people = { his: emptyPerson(), hers: emptyPerson() };
  const start = { his: 276, hers: 218 };
  const feed: FeedItem[] = [];
  const now = Date.now();

  for (const who of ["his", "hers"] as Who[]) {
    const r = rng(PLAN[who].seed);
    const p = people[who];
    for (let d = parse(WORKOUT_START); iso(d) < today; d = addDays(d, 1)) {
      const day = iso(d);
      const x = r();
      if (x < 0.68) {
        p.workouts[day] = "done";
        p.logs[day] = {
          type: PLAN[who].types[Math.floor(r() * PLAN[who].types.length)],
          min: MINS[Math.floor(r() * MINS.length)],
          int: INTS[Math.floor(r() * INTS.length)][0],
          note: r() < 0.2 ? (who === "his" ? "Leg day" : "Morning loop") : "",
          at: d.getTime() + 18 * 3600e3,
        };
      } else if (x < 0.84) {
        p.workouts[day] = "rest";
      }
    }
    let w = start[who];
    WEIGH_DATES.filter((d) => d <= today).forEach((d, i) => {
      w = Math.round((w + (PLAN[who].perWeek[i] ?? -1)) * 10) / 10;
      p.weights[d] = w;
    });
  }

  // Hers already checked in today so the partner card has something to show.
  people.hers.workouts[today] = "done";
  people.hers.logs[today] = { type: "walk", min: 30, int: "moderate", note: "Lunch walk", at: now - 3 * 3600e3 };
  people.his.scratched[271] = true;

  const item = (o: Omit<FeedItem, "id" | "seen"> & { seen?: boolean }): FeedItem => ({
    id: `${o.at}-${o.who}-demo`,
    seen: true,
    ...o,
  });
  feed.push(
    item({ kind: "nudge", who: "hers", to: "his", at: now - 25 * 60e3, msg: "I already did mine. Your turn! 💪", seen: false }),
    item({ kind: "checkin", who: "hers", to: "his", at: now - 3 * 3600e3, type: "walk", min: 30, int: "moderate" }),
    item({ kind: "cheer", who: "his", to: "hers", at: now - 26 * 3600e3 }),
    item({ kind: "milestone", who: "his", to: "hers", at: now - 4 * 86400e3, lost: 10, goal: false }),
    item({ kind: "rest", who: "hers", to: "his", at: now - 5 * 86400e3 }),
  );

  return { people, feed };
}
