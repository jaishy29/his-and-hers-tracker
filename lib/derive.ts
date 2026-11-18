// Numbers worked out from the saved data (streaks, totals, milestones...).
import { PEOPLE, TYPE_LABEL, WORKOUT_START, DEFAULT_REMIND_AT, type Who } from "./constants";
import { addDays, iso, parse } from "./dates";
import type { Milestone, PersonState, WorkoutLog } from "./types";

export const displayName = (p: PersonState, who: Who) => p.name || PEOPLE[who].dflt;

export function weightEntries(p: PersonState): [string, number][] {
  return Object.entries(p.weights)
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
export function latestWeight(p: PersonState) {
  const e = weightEntries(p);
  return e.length ? e[e.length - 1][1] : null;
}
export function bestWeight(p: PersonState) {
  const e = weightEntries(p);
  return e.length ? Math.min(...e.map((x) => x[1])) : null;
}

/** One ticket per 5 lb lost, plus the goal ticket. */
export function milestones(who: Who): Milestone[] {
  const { start, goal } = PEOPLE[who];
  const out: Milestone[] = [];
  for (let t = start - 5; t > goal; t -= 5) out.push({ target: t, lost: start - t, goal: false });
  out.push({ target: goal, lost: start - goal, goal: true });
  return out;
}

export function streak(p: PersonState, today: string) {
  let n = 0;
  let d = parse(today);
  if (!p.workouts[today]) d = addDays(d, -1);
  while (iso(d) >= WORKOUT_START) {
    const v = p.workouts[iso(d)];
    if (v === "done") n++;
    else if (v !== "rest") break;
    d = addDays(d, -1);
  }
  return n;
}

export function minutesBetween(p: PersonState, a: string, b: string) {
  let m = 0;
  for (const [d, l] of Object.entries(p.logs)) if (l && d >= a && d <= b) m += l.min || 0;
  return m;
}

export function countBetween(p: PersonState, a: string, b: string) {
  return Object.entries(p.workouts).filter(([d, v]) => v === "done" && d >= a && d <= b).length;
}

export function isLate(p: PersonState, today: string, nowHM: string) {
  return !p.workouts[today] && nowHM >= (p.remindAt || DEFAULT_REMIND_AT);
}

export function describe(l?: WorkoutLog | null) {
  return l ? `${l.min} min ${TYPE_LABEL[l.type] || "workout"}${l.int ? " · " + l.int : ""}` : "Workout";
}
