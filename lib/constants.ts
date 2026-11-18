// Fixed settings for the app. Change goals or start weights here.

export type Who = "his" | "hers";
export const WHO: Who[] = ["his", "hers"];
export const OTHER: Record<Who, Who> = { his: "hers", hers: "his" };

export const PEOPLE: Record<Who, { label: string; start: number; goal: number; dflt: string }> = {
  his: { label: "His", start: 276, goal: 200, dflt: "Him" },
  hers: { label: "Hers", start: 218, goal: 175, dflt: "Her" },
};

/** Everything runs on New York time. */
export const TIME_ZONE = "America/New_York";

export const WORKOUT_START = "2026-10-15";
export const WEIGH_START = "2026-10-24";
export const WEEKS = 52;
export const DEFAULT_REMIND_AT = "19:00";
/** If someone hasn't checked in by this time, their partner is told. */
export const MISSED_CHECKIN_AT = "21:00";

export const TYPES = [
  ["strength", "Strength"],
  ["walk", "Walk"],
  ["run", "Run"],
  ["cardio", "Cardio"],
  ["hiit", "HIIT"],
  ["cycle", "Cycling"],
  ["yoga", "Yoga / stretch"],
  ["swim", "Swim"],
  ["sports", "Sports"],
  ["other", "Other"],
] as const;
export type WorkoutType = (typeof TYPES)[number][0];
export const TYPE_LABEL = Object.fromEntries(TYPES) as Record<WorkoutType, string>;

export const MINS = [15, 20, 30, 45, 60];

export const INTS = [
  ["easy", "Easy"],
  ["moderate", "Moderate"],
  ["hard", "Hard"],
] as const;
export type Intensity = (typeof INTS)[number][0];

export const NUDGES = [
  "Your workout is waiting for you 👟",
  "I already did mine. Your turn! 💪",
  "Even 15 minutes counts today.",
  "Let's not break the streak!",
  "Want to work out together tonight?",
];

export const CHEERS = [
  "First five down!", "Momentum!", "Keep stacking wins", "Look at you go", "Halfway-ish hero",
  "Unstoppable", "New you incoming", "Crushing it", "Stronger every week", "Consistency pays",
  "On fire", "Almost legendary", "Keep pushing", "So close now", "One more push",
];
