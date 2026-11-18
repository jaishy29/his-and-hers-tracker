import "server-only";
import { sendNotification, WebPushError } from "web-push";
import type { Who } from "../constants";
import { supabaseAdmin } from "./admin";

export interface PushMessage {
  title: string;
  body: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag?: string;
  url?: string;
}

/** Sends a notification to every device the person turned notifications on for. Returns how many got it. */
export async function pushToSide(side: Who, msg: PushMessage): Promise<number> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "https://his-and-hers-tracker.vercel.app";
  if (!publicKey || !privateKey) throw new Error("Push keys are missing from the settings");

  const db = supabaseAdmin();
  const { data: subs, error } = await db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("side", side);
  if (error) throw error;

  const payload = JSON.stringify({ url: "/", ...msg });
  let sent = 0;
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 6, urgency: "high" },
      );
      sent++;
    } catch (e) {
      // 404/410 = that phone turned notifications off or the app was removed: forget it.
      if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
        await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else {
        console.error("push failed", e instanceof WebPushError ? `${e.statusCode} ${e.body}` : e);
      }
    }
  }));
  return sent;
}
