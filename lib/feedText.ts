import { TYPE_LABEL } from "./constants";
import { displayName } from "./derive";
import type { AppData, FeedItem } from "./types";

/** One line of text describing an activity-feed item. */
export function feedText(f: FeedItem, data: AppData) {
  const n = displayName(data.people[f.who], f.who);
  switch (f.kind) {
    case "checkin": return `${n} worked out: ${f.min} min ${(f.type && TYPE_LABEL[f.type]) || "workout"}${f.int ? ` (${f.int})` : ""}`;
    case "rest": return `${n} took a rest day`;
    case "nudge": return `${n}: “${f.msg}”`;
    case "cheer": return `${n} sent ${displayName(data.people[f.to], f.to)} a high five 🙌`;
    case "milestone": return f.goal ? `${n} reached goal weight! 🏆` : `${n} hit −${f.lost} lb and unlocked a scratch-off 🎉`;
  }
}
