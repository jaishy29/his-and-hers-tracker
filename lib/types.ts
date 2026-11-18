import type { Who, WorkoutType, Intensity } from "./constants";

export type DayMark = "done" | "rest";

export interface WorkoutLog {
  type: WorkoutType;
  min: number;
  int: Intensity;
  note: string;
  at: number;
}

export interface PersonState {
  name: string;
  remindAt: string;
  workouts: Record<string, DayMark>;
  logs: Record<string, WorkoutLog>;
  weights: Record<string, number>;
  scratched: Record<number, true>;
}

export type FeedKind = "checkin" | "rest" | "nudge" | "cheer" | "milestone";

export interface FeedItem {
  id: string;
  who: Who;
  to: Who;
  kind: FeedKind;
  at: number;
  seen: boolean;
  type?: WorkoutType;
  min?: number;
  int?: Intensity;
  msg?: string;
  lost?: number;
  goal?: boolean;
}

export interface AppData {
  people: Record<Who, PersonState>;
  feed: FeedItem[];
}

export interface Milestone {
  target: number;
  lost: number;
  goal: boolean;
}
