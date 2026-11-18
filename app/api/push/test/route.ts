// "Send me a test": sends a notification to your own devices so you can see it works.
import { sideFromRequest } from "@/lib/server/admin";
import { pushToSide } from "@/lib/server/push";

export async function POST(req: Request) {
  try {
    const side = await sideFromRequest(req);
    if (!side) return Response.json({ error: "Not logged in" }, { status: 401 });
    const sent = await pushToSide(side, {
      title: "Notifications are on ✅",
      body: "This is a test from His & Hers. You'll get alerts like this from your partner.",
      tag: "test",
    });
    return Response.json({ sent });
  } catch (e) {
    console.error("test push failed", e);
    return Response.json({ error: "Could not send" }, { status: 500 });
  }
}
