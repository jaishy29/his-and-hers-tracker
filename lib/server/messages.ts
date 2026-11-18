import "server-only";
import { PEOPLE, TYPE_LABEL, type Who, type WorkoutType } from "../constants";
import { fmtTime } from "../dates";
import type { PushMessage } from "./push";

export interface FeedRow {
  id: string; who: Who; to_side: Who; kind: string; at: string; pushed: boolean;
  type: WorkoutType | null; minutes: number | null; intensity: string | null;
  msg: string | null; lost: number | null; goal: boolean | null;
}

export const nameOf = (names: Partial<Record<Who, string>>, who: Who) => names[who] || PEOPLE[who].dflt;

/** The notification your partner gets for something you did. */
export function partnerAlert(f: FeedRow, names: Partial<Record<Who, string>>): PushMessage | null {
  const n = nameOf(names, f.who);
  switch (f.kind) {
    case "checkin":
      return {
        title: `${n} checked in 💪`,
        body: `${f.minutes} min ${(f.type && TYPE_LABEL[f.type]) || "workout"}${f.intensity ? ` (${f.intensity})` : ""}. Send a high five?`,
        tag: `day-${f.who}`,
      };
    case "rest":
      return { title: `${n} logged a rest day`, body: "Recovery counts. Streak is safe.", tag: `day-${f.who}` };
    case "nudge":
      return { title: `Nudge from ${n}`, body: f.msg || "Time to move!", tag: `nudge-${f.id}` };
    case "cheer":
      return { title: `${n} sent you a high five 🙌`, body: "Keep it going!", tag: `cheer-${f.id}` };
    case "milestone":
      return f.goal
        ? { title: `${n} reached goal weight! 🏆`, body: "Go celebrate together.", tag: `ms-${f.id}` }
        : { title: `${n} unlocked a scratch-off 🎉`, body: `Down ${f.lost} lb so far!`, tag: `ms-${f.id}` };
  }
  return null;
}

export const dailyReminder = (remindAt: string): PushMessage => ({
  title: "Time to check in 👟",
  body: `It's past your ${fmtTime(remindAt)} check-in time. Even a short walk counts.`,
  tag: "daily-reminder",
});

export const missedAlert = (partnerName: string): PushMessage => ({
  title: `${partnerName} hasn't checked in yet`,
  body: "It's 9 PM. Send a nudge to keep the streak alive?",
  tag: "missed-checkin",
});
