// Date helpers. Days are stored as "YYYY-MM-DD" strings.
import { TIME_ZONE, WEIGH_START, WEEKS, DEFAULT_REMIND_AT } from "./constants";

export const pad = (n: number) => String(n).padStart(2, "0");

/** Date object -> "YYYY-MM-DD" (calendar arithmetic only, no time zone math). */
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" -> Date at local midnight. */
export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const fmt = (s: string, o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  parse(s).toLocaleDateString("en-US", o);

/** Monday of the week containing day s. */
export const weekStart = (s: string) => {
  const x = parse(s);
  return iso(addDays(x, -((x.getDay() + 6) % 7)));
};

const nyParts = (t: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(t);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hm: `${get("hour")}:${get("minute")}` };
};

/** Today's date in New York, e.g. "2026-11-18". */
export const todayNY = (t = new Date()) => nyParts(t).day;
/** Current New York time, e.g. "19:05". */
export const nowHMNY = (t = new Date()) => nyParts(t).hm;

/** "19:00" -> "7:00 PM" */
export const fmtTime = (hm?: string) => {
  const [h, m] = (hm || DEFAULT_REMIND_AT).split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${pad(m)} ${ampm}`;
};

export const ago = (t: number, now = Date.now()) => {
  const s = (now - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** Every official Saturday weigh-in date. */
export const WEIGH_DATES = [...Array(WEEKS)].map((_, i) => iso(addDays(parse(WEIGH_START), 7 * i)));
