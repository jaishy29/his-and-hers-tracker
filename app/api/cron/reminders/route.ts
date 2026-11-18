// Timed reminders. A scheduler in Supabase calls this every 5 minutes (set up when the app goes live).
//  - Daily reminder: if you haven't checked in by your check-in time, you get a notification.
//  - Missed check-in: if you still haven't checked in by 9 PM, your partner is told so they can nudge you.
// Each one is sent at most once per person per day. All times are New York time.
// For testing: add ?dry=1 to see what would be sent without sending, and ?now=21:05 to pretend it's a given time.
import { MISSED_CHECKIN_AT, OTHER, WHO, type Who } from "@/lib/constants";
import { nowHMNY, todayNY } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/server/admin";
import { dailyReminder, missedAlert, nameOf } from "@/lib/server/messages";
import { pushToSide, type PushMessage } from "@/lib/server/push";

/** Allowed callers: the Supabase scheduler (its secret lives in the database's Vault) or CRON_SECRET (for testing). */
async function isAllowed(given: string | undefined) {
  if (!given) return false;
  const envSecret = process.env.CRON_SECRET;
  if (envSecret && given === envSecret) return true;
  const { data } = await supabaseAdmin().rpc("check_cron_secret", { p: given });
  return data === true;
}

async function handle(req: Request) {
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!(await isAllowed(given))) return Response.json({ error: "Not allowed" }, { status: 401 });

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const nowParam = url.searchParams.get("now");
  const nowHM = nowParam && /^\d\d:\d\d$/.test(nowParam) ? nowParam : nowHMNY();
  const today = todayNY();

  const db = supabaseAdmin();
  const [{ data: people, error: pErr }, { data: days, error: dErr }] = await Promise.all([
    db.from("people").select("side,name,remind_at,user_id"),
    db.from("days").select("side").eq("day", today),
  ]);
  if (pErr || dErr) return Response.json({ error: "Database error" }, { status: 500 });

  const bySide = Object.fromEntries((people ?? []).map((p) => [p.side, p])) as Record<Who, { name: string; remind_at: string; user_id: string | null }>;
  const names = Object.fromEntries(WHO.map((w) => [w, bySide[w]?.name ?? ""])) as Record<Who, string>;
  const checkedIn = new Set((days ?? []).map((d) => d.side as Who));
  const actions: string[] = [];

  /** Records the reminder (once per day) and sends it. */
  const once = async (side: Who, kind: "remind" | "missed", to: Who, msg: PushMessage) => {
    if (dry) {
      const { data } = await db.from("reminder_log").select("side").eq("side", side).eq("day", today).eq("kind", kind).maybeSingle();
      actions.push(`${data ? "already sent" : "would send"} ${kind} for ${side} -> ${to}`);
      return;
    }
    const { data: inserted } = await db.from("reminder_log")
      .upsert({ side, day: today, kind }, { onConflict: "side,day,kind", ignoreDuplicates: true })
      .select("side");
    if (!inserted?.length) { actions.push(`already sent ${kind} for ${side}`); return; }
    const sent = await pushToSide(to, msg);
    actions.push(`sent ${kind} for ${side} -> ${to} (${sent} device${sent === 1 ? "" : "s"})`);
  };

  for (const side of WHO) {
    const p = bySide[side];
    if (!p?.user_id || checkedIn.has(side)) continue; // nobody linked yet, or already checked in
    if (nowHM >= (p.remind_at || "19:00")) await once(side, "remind", side, dailyReminder(p.remind_at));
    if (nowHM >= MISSED_CHECKIN_AT && bySide[OTHER[side]]?.user_id) {
      await once(side, "missed", OTHER[side], missedAlert(nameOf(names, side)));
    }
  }
  return Response.json({ today, nowHM, dry, actions });
}

export const GET = handle;
export const POST = handle;
