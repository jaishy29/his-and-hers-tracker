// Sends your partner a notification about something you just posted
// (check-in, rest day, nudge, high five, milestone). The app calls this right after posting.
import { sideFromRequest, supabaseAdmin } from "@/lib/server/admin";
import { partnerAlert, type FeedRow } from "@/lib/server/messages";
import { pushToSide } from "@/lib/server/push";
import type { Who } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const side = await sideFromRequest(req);
    if (!side) return Response.json({ error: "Not logged in" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : null;
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    const db = supabaseAdmin();
    // Claim the post: only your own, only once. The text comes from the database, not the request.
    const { data: row } = await db.from("feed").update({ pushed: true })
      .eq("id", id).eq("who", side).eq("pushed", false)
      .select("*").maybeSingle<FeedRow>();
    if (!row) return Response.json({ sent: 0, skipped: "not found, not yours, or already sent" });
    if (Date.now() - Date.parse(row.at) > 15 * 60_000) return Response.json({ sent: 0, skipped: "too old" });

    const { data: people } = await db.from("people").select("side,name");
    const names = Object.fromEntries((people ?? []).map((p) => [p.side, p.name])) as Partial<Record<Who, string>>;
    const msg = partnerAlert(row, names);
    const sent = msg ? await pushToSide(row.to_side, msg) : 0;
    return Response.json({ sent });
  } catch (e) {
    console.error("notify failed", e);
    return Response.json({ error: "Could not send" }, { status: 500 });
  }
}
