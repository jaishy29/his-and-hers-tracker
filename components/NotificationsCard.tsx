"use client";
// "Turn on notifications" for this phone or computer.
import { useCallback, useEffect, useState } from "react";
import { fmtTime } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useToast } from "./Toast";

type State = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "working";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export default function NotificationsCard() {
  const { mode, me, data } = useStore();
  const toast = useToast();
  const [state, setState] = useState<State>("checking");
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState(isIOS() && !isInstalled() ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setState(sub && Notification.permission === "granted" ? "on" : "off");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only check
  useEffect(() => { refresh().catch(() => setState("unsupported")); }, [refresh]);

  if (mode !== "live" || !me || !vapid) return null;

  const turnOn = async () => {
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapid) }));
      const j = sub.toJSON();
      const sb = supabase();
      await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      const { error } = await sb.from("push_subscriptions").insert({ endpoint: sub.endpoint, side: me, p256dh: j.keys?.p256dh, auth: j.keys?.auth });
      if (error) throw error;
      setState("on");
      toast("Notifications are on for this device");
    } catch (e) {
      console.error(e);
      toast("Couldn't turn on notifications. Try again.");
      await refresh();
    }
  };

  const turnOff = async () => {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      toast("Notifications are off for this device");
    } finally {
      await refresh();
    }
  };

  const test = async () => {
    const { data: s } = await supabase().auth.getSession();
    const r = await fetch("/api/push/test", { method: "POST", headers: { Authorization: `Bearer ${s.session?.access_token ?? ""}` } });
    const j = await r.json().catch(() => ({}));
    toast(r.ok && j.sent ? "Test sent. It should pop up in a few seconds." : "The test didn't go through. Try turning notifications off and on.");
  };

  return (
    <div className="card">
      <h3>Notifications</h3>
      {state === "on" ? (
        <>
          <p className="hint">✅ On for this device. You&apos;ll get a reminder at {fmtTime(data.people[me].remindAt)} if you haven&apos;t checked in, plus alerts when your partner checks in, nudges you or sends a high five.</p>
          <div className="row">
            <button className="btn small" onClick={test}>Send me a test</button>
            <button className="btn ghost small" onClick={turnOff}>Turn off on this device</button>
          </div>
        </>
      ) : state === "ios-install" ? (
        <p className="hint">On iPhone, notifications work once the app is on your Home Screen: tap <b>Share</b> → <b>Add to Home Screen</b>, then open it from there and come back here.</p>
      ) : state === "unsupported" ? (
        <p className="hint">This browser can&apos;t show notifications. On a phone, use the app from your Home Screen (iPhone) or Chrome (Android).</p>
      ) : state === "denied" ? (
        <p className="hint">Notifications are blocked for this app. Turn them on in your phone&apos;s Settings → Notifications → His &amp; Hers (iPhone), or in your browser&apos;s site settings, then reopen the app.</p>
      ) : (
        <>
          <p className="hint">Get a nudge at your check-in time, and know right away when your partner checks in or sends you something. Turn this on separately on each phone.</p>
          <div className="row">
            <button className="btn" onClick={turnOn} disabled={state === "working" || state === "checking"}>
              {state === "working" ? "One moment…" : "Turn on notifications"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
