"use client";
import { useEffect, useState } from "react";
import { INTS, MINS, NUDGES, OTHER, PEOPLE, TYPES, TYPE_LABEL, type Intensity, type Who, type WorkoutType } from "@/lib/constants";
import { ago, fmtTime, parse } from "@/lib/dates";
import { describe, displayName, isLate, latestWeight, streak } from "@/lib/derive";
import { ls, useStore } from "@/lib/store";
import type { AppData, FeedItem } from "@/lib/types";
import { useToast } from "./Toast";

export function feedText(f: FeedItem, data: AppData) {
  const n = displayName(data.people[f.who], f.who);
  switch (f.kind) {
    case "checkin": return `${n} worked out: ${f.min} min ${TYPE_LABEL[f.type!] || "workout"}${f.int ? ` (${f.int})` : ""}`;
    case "rest": return `${n} took a rest day`;
    case "nudge": return `${n}: “${f.msg}”`;
    case "cheer": return `${n} sent ${displayName(data.people[f.to], f.to)} a high five 🙌`;
    case "milestone": return f.goal ? `${n} reached goal weight! 🏆` : `${n} hit −${f.lost} lb and unlocked a scratch-off 🎉`;
  }
}

export default function TodayTab() {
  const { me } = useStore();
  if (!me) return <Picker />;
  return <TodayMain me={me} />;
}

function Picker() {
  const { setMe } = useStore();
  return (
    <section className="panel">
      <div className="card">
        <h2>Who&apos;s using this phone?</h2>
        <p className="hint">Pick once. The app remembers you, so check-ins and nudges go to the right person. (In the next milestone this becomes a real login.)</p>
        <div className="pick">
          <button className="his" onClick={() => setMe("his")}>His</button>
          <button className="hers" onClick={() => setMe("hers")}>Hers</button>
        </div>
      </div>
    </section>
  );
}

function TodayMain({ me }: { me: Who }) {
  const { data, today } = useStore();
  const other = OTHER[me];
  const items = data.feed.filter((f) => f.to === me && f.who !== me && !f.seen).slice(0, 5);
  return (
    <section className="panel">
      {items.length > 0 && <Inbox items={items} />}
      <div className="grid2">
        <CheckInCard me={me} key={me + today} />
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <PartnerCard who={other} />
          <QuickWeight me={me} />
        </div>
      </div>
      <div className="grid2">
        <Feed />
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Settings me={me} />
          <InstallCard />
        </div>
      </div>
    </section>
  );
}

function CheckInCard({ me }: { me: Who }) {
  const { data, today, nowHM, checkIn, clearToday } = useStore();
  const toast = useToast();
  const p = data.people[me];
  const w = p.workouts[today];
  const log = p.logs[today];
  const [type, setType] = useState<WorkoutType>(log?.type ?? "strength");
  const [min, setMin] = useState<number>(log?.min ?? 30);
  const [minText, setMinText] = useState(log && !MINS.includes(log.min) ? String(log.min) : "");
  const [int, setInt] = useState<Intensity>(log?.int ?? "moderate");
  const [note, setNote] = useState(log?.note ?? "");
  const late = isLate(p, today, nowHM);

  const doLog = () => {
    const { was } = checkIn("done", { type, min: Math.max(1, Math.min(600, min | 0 || 30)), int, note: note.trim().slice(0, 140) });
    const s = streak({ ...p, workouts: { ...p.workouts, [today]: "done" } }, today);
    toast(was === "done" ? "Workout updated" : `Checked in! ${s}-day streak 🔥`);
  };
  const doRest = () => { checkIn("rest"); toast("Rest day logged"); };
  const doClear = () => { clearToday(); setNote(""); toast("Today cleared"); };

  return (
    <div className="card me">
      <div className="panelhead">
        <h2>Check in, {displayName(p, me)}</h2>
        <span className="eyebrow">{parse(today).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
      </div>
      {w === "done" ? (
        <div className="status done"><div className="badge">✓</div><div><b>Checked in!</b>
          <span>{describe(log)}{log?.note ? " · " + log.note : ""} · {streak(p, today)}-day streak</span></div></div>
      ) : w === "rest" ? (
        <div className="status done"><div className="badge">Z</div><div><b>Rest day logged</b><span>Recovery counts. Your streak is safe.</span></div></div>
      ) : (
        <div className={`status ${late ? "late" : ""}`}><div className="badge">{late ? "!" : "·"}</div><div>
          <b>{late ? "You're past your check-in time" : "Not checked in yet"}</b>
          <span>{late ? "Log anything, even a short walk." : "Check-in time: " + fmtTime(p.remindAt)}</span></div></div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        <div className="f"><span className="eyebrow">What did you do?</span>
          <div className="chips">
            {TYPES.map(([k, v]) => <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{v}</button>)}
          </div>
        </div>
        <div><span className="eyebrow">Minutes</span>
          <div className="row" style={{ marginTop: 6 }}>
            <div className="chips">
              {MINS.map((m) => <button key={m} className="chip" aria-pressed={min === m && !minText} onClick={() => { setMin(m); setMinText(""); }}>{m}</button>)}
            </div>
            <input className="t num" type="number" inputMode="numeric" min={1} max={600} placeholder="Other" style={{ width: 90 }}
              aria-label="Other number of minutes" value={minText}
              onChange={(e) => { setMinText(e.target.value); const v = parseInt(e.target.value); if (v > 0 && v <= 600) setMin(v); }} />
          </div>
        </div>
        <div><span className="eyebrow">How hard?</span>
          <div className="chips" style={{ marginTop: 6 }}>
            {INTS.map(([k, v]) => <button key={k} className="chip" aria-pressed={int === k} onClick={() => setInt(k)}>{v}</button>)}
          </div>
        </div>
        <label className="f">Note (optional)
          <input className="t" maxLength={140} placeholder="e.g. Leg day, 3 miles, new PR" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="row">
          <button className="btn" onClick={doLog}>{w === "done" ? "Update workout" : "Log workout"}</button>
          <button className="btn ghost" onClick={doRest}>Rest day</button>
          {w && <button className="btn ghost small" onClick={doClear}>Undo today</button>}
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ who }: { who: Who }) {
  const { data, today, nowHM, sendNudge, sendCheer } = useStore();
  const toast = useToast();
  const p = data.people[who];
  const pw = p.workouts[today];
  const pl = p.logs[today];
  const late = isLate(p, today, nowHM);
  const name = displayName(p, who);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [cheered, setCheered] = useState(false);
  const nudge = (msg: string) => {
    sendNudge(msg);
    toast(`Nudge sent to ${name}`);
    setOpen(false);
    setCustom("");
  };
  return (
    <div className={`card partner ${who}`}>
      <div className="panelhead"><h3 style={{ color: "var(--pc)" }}>{name}</h3><span className="eyebrow">{streak(p, today)}-day streak</span></div>
      {pw === "done" ? (
        <div className="status done"><div className="badge">✓</div><div><b>Checked in today</b><span>{describe(pl)}{pl?.note ? " · " + pl.note : ""}</span></div></div>
      ) : pw === "rest" ? (
        <div className="status done"><div className="badge">Z</div><div><b>Rest day</b><span>Taking a planned break.</span></div></div>
      ) : (
        <div className={`status ${late ? "late" : ""}`}><div className="badge">{late ? "!" : "·"}</div><div>
          <b>{late ? "Hasn't checked in yet" : "Not checked in yet"}</b>
          <span>Check-in time {fmtTime(p.remindAt)}{late ? " · a nudge might help" : ""}</span></div></div>
      )}
      <div className="row">
        {pw === "done" && (
          <button className="btn small" style={{ background: "var(--pc)" }} disabled={cheered}
            onClick={() => { sendCheer(); setCheered(true); toast(`High five sent to ${name}!`); }}>Send a high five 🙌</button>
        )}
        <button className={`btn small ${pw === "done" ? "ghost" : ""}`} style={pw === "done" ? undefined : { background: "var(--pc)" }}
          onClick={() => setOpen(!open)}>Send a nudge</button>
      </div>
      {open && (
        <div className="nudges">
          {NUDGES.map((n) => <button key={n} onClick={() => nudge(n)}>{n}</button>)}
          <div className="row">
            <input className="t" maxLength={120} placeholder="Or write your own…" style={{ flex: 1, minWidth: 160 }}
              value={custom} onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) nudge(custom.trim()); }} />
            <button className="btn small" style={{ background: "var(--pc)" }} onClick={() => custom.trim() && nudge(custom.trim())}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickWeight({ me }: { me: Who }) {
  const { data, today, logWeight } = useStore();
  const toast = useToast();
  const [v, setV] = useState("");
  const lw = latestWeight(data.people[me]);
  const save = () => {
    const n = parseFloat(v.replace(",", "."));
    if (!(n > 50 && n < 600)) { toast("Enter your weight in pounds"); return; }
    const r = Math.round(n * 10) / 10;
    const hit = logWeight(me, today, r);
    toast(hit ? (hit.goal ? "GOAL WEIGHT! Go scratch your goal ticket 🎉" : `New scratch-off unlocked: −${hit.lost} lb! 🎉`) : `Saved ${r} lb`);
    setV("");
  };
  return (
    <div className="card">
      <h3>Log my weight</h3>
      <div className="row">
        <input className="t num" inputMode="decimal" placeholder="lb" style={{ width: 120 }} aria-label="Weight in pounds"
          value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <button className="btn small" onClick={save}>Save</button>
      </div>
      <p className="hint">
        {lw != null ? `Last logged: ${lw} lb. Goal: ${PEOPLE[me].goal} lb.` : `Starting weight: ${PEOPLE[me].start} lb. Goal: ${PEOPLE[me].goal} lb.`}
      </p>
    </div>
  );
}

function Inbox({ items }: { items: FeedItem[] }) {
  const { data, nowMs: now, markSeen, sendCheer } = useStore();
  const toast = useToast();
  return (
    <div className="inbox">
      {items.map((f) => (
        <div className="msg" key={f.id}>
          <p>{feedText(f, data)}<small>{ago(f.at, now)}</small></p>
          <div className="row">
            {(f.kind === "checkin" || f.kind === "milestone") && (
              <button className="btn small" onClick={() => { sendCheer(); markSeen(f.id); toast("High five sent!"); }}>High five back 🙌</button>
            )}
            {f.kind === "nudge" && <button className="btn small" onClick={() => { markSeen(f.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>On it!</button>}
            <button className="btn ghost small" onClick={() => markSeen(f.id)}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Feed() {
  const { data, nowMs: now } = useStore();
  const items = data.feed.slice(0, 25);
  return (
    <div className="card">
      <h3>Activity</h3>
      <ul className="feed">
        {items.length ? items.map((f) => (
          <li key={f.id}><span className={`dot ${f.who}`} /><span>{feedText(f, data)}</span><time>{ago(f.at, now)}</time></li>
        )) : <li className="muted">No activity yet. Your first check-in shows up here for both of you.</li>}
      </ul>
    </div>
  );
}

function Settings({ me }: { me: Who }) {
  const { data, setName, setRemindAt, setMe } = useStore();
  const toast = useToast();
  const p = data.people[me];
  const [name, setNameText] = useState(p.name);
  const [time, setTime] = useState(p.remindAt);
  useEffect(() => { setNameText(p.name); }, [p.name]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setTime(p.remindAt); }, [p.remindAt]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <div className="card">
      <h3>My settings</h3>
      <label className="f">My name
        <input className="t" maxLength={20} placeholder={PEOPLE[me].dflt} value={name}
          onChange={(e) => setNameText(e.target.value)} onBlur={() => name !== p.name && setName(name)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      </label>
      <label className="f">Daily check-in time
        <input className="t" type="time" value={time} onChange={(e) => setTime(e.target.value)}
          onBlur={() => { if (time && time !== p.remindAt) { setRemindAt(time); toast("Check-in time set to " + fmtTime(time)); } }} />
      </label>
      <p className="hint">If you haven&apos;t checked in by this time (New York time), you&apos;ll get a reminder and the app marks you as running late.</p>
      <div className="row"><button className="btn ghost small" onClick={() => setMe(null)}>Switch person</button></div>
    </div>
  );
}

function InstallCard() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only check
    setHidden(!!standalone || ls.get("hh-install") === "1");
  }, []);
  if (hidden) return null;
  return (
    <div className="card install">
      <h3>Put it on your home screen</h3>
      <ol>
        <li>Open this page in Safari (iPhone) or Chrome (Android).</li>
        <li>Tap Share (iPhone) or the ⋮ menu (Android).</li>
        <li>Choose <b>Add to Home Screen</b>.</li>
      </ol>
      <div className="row"><button className="btn ghost small" onClick={() => { ls.set("hh-install", "1"); setHidden(true); }}>Got it</button></div>
    </div>
  );
}
