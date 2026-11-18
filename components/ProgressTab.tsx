"use client";
import { useState } from "react";
import { PEOPLE, TYPES, WHO, WORKOUT_START, type Who, type WorkoutType } from "@/lib/constants";
import { addDays, fmt, iso, parse, weekStart } from "@/lib/dates";
import { countBetween, describe, displayName, latestWeight, minutesBetween, streak } from "@/lib/derive";
import { useStore } from "@/lib/store";

export default function ProgressTab() {
  const { data } = useStore();
  return (
    <section className="panel">
      <section className="players">
        {WHO.map((w) => <Player key={w} who={w} />)}
      </section>
      <div className="card">
        <div className="panelhead"><h3>Workout minutes per week</h3>
          <div className="legend">
            <span><i style={{ background: "var(--his)" }} />{displayName(data.people.his, "his")}</span>
            <span><i style={{ background: "var(--hers)" }} />{displayName(data.people.hers, "hers")}</span>
          </div>
        </div>
        <div className="chartbox" style={{ border: 0, padding: 0 }}><MinutesChart /></div>
      </div>
      <div className="grid2">
        <div className="card">
          <h3>What you&apos;ve been doing</h3>
          <p className="hint">Workout types, last 30 days.</p>
          <TypeBreakdown />
        </div>
        <WorkoutLogCard />
      </div>
    </section>
  );
}

function Player({ who }: { who: Who }) {
  const { data, today } = useStore();
  const p = data.people[who];
  const { start, goal } = PEOPLE[who];
  const cur = latestWeight(p);
  const lost = cur != null ? Math.max(0, +(start - cur).toFixed(1)) : 0;
  const pct = Math.min(100, Math.max(0, (lost / (start - goal)) * 100));
  const toGo = cur != null ? Math.max(0, +(cur - goal).toFixed(1)) : start - goal;
  const ws = weekStart(today);
  return (
    <article className={`player ${who}`}>
      <div className="name"><h3>{displayName(p, who)}</h3><span className="eyebrow">Goal {goal} lb</span></div>
      <div className="lost num">{lost}<small>lb lost</small></div>
      <div className="bar" role="img" aria-label={`${Math.round(pct)}% of goal`}><i style={{ width: `${pct}%` }} /></div>
      <div className="barlabels num"><span>{start}</span><span>{Math.round(pct)}%</span><span>{goal}</span></div>
      <div className="stats">
        <div className="stat"><b>{cur ?? "—"}</b><span>Current</span></div>
        <div className="stat"><b>{toGo}</b><span>To go</span></div>
        <div className="stat"><b>{countBetween(p, WORKOUT_START, today)}</b><span>Workouts</span></div>
        <div className="stat"><b>{streak(p, today)}</b><span>Streak</span></div>
      </div>
      <div className="wk">This week
        {[...Array(7)].map((_, i) => {
          const d = iso(addDays(parse(ws), i));
          const v = p.workouts[d];
          return <i key={d} className={`pip ${v === "done" ? "on" : v === "rest" ? "rest" : ""}`} title={fmt(d, { weekday: "short" })} />;
        })}
        <span>· {minutesBetween(p, ws, today)} min</span>
      </div>
    </article>
  );
}

function MinutesChart() {
  const { data, today } = useStore();
  const W = 860, H = 240, L = 40, R = 10, T = 14, B = 30, n = 8;
  const ws = weekStart(today);
  const weeks = [...Array(n)].map((_, i) => iso(addDays(parse(ws), -7 * (n - 1 - i))));
  const rows = weeks.map((w) => {
    const e = iso(addDays(parse(w), 6));
    return { w, his: minutesBetween(data.people.his, w, e), hers: minutesBetween(data.people.hers, w, e) };
  });
  const max = Math.max(150, ...rows.flatMap((d) => [d.his, d.hers]));
  const top = Math.ceil(max / 60) * 60;
  const gw = (W - L - R) / n, bw = Math.min(28, gw * 0.32);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const ticks = [0, 1, 2, 3, 4].map((k) => (top / 4) * k);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Workout minutes per week">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{ fontFamily: "var(--font-num)" }}>{v}</text>
        </g>
      ))}
      {rows.map((d, i) => {
        const cx = L + gw * i + gw / 2;
        return (
          <g key={d.w}>
            {(["his", "hers"] as Who[]).map((who) => {
              const v = d[who];
              const off = who === "his" ? -bw - 2 : 2;
              return v > 0 ? (
                <rect key={who} x={cx + off} y={y(v)} width={bw} height={y(0) - y(v)} rx="4" fill={`var(--${who})`}>
                  <title>{`${displayName(data.people[who], who)}: ${v} min`}</title>
                </rect>
              ) : null;
            })}
            <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{i === n - 1 ? "This wk" : fmt(d.w)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TypeBreakdown() {
  const { data, today } = useStore();
  const from = iso(addDays(parse(today), -29));
  const c: Record<Who, Partial<Record<WorkoutType, number>>> = { his: {}, hers: {} };
  for (const who of WHO)
    for (const [d, l] of Object.entries(data.people[who].logs))
      if (l && d >= from) c[who][l.type] = (c[who][l.type] || 0) + 1;
  const max = Math.max(1, ...Object.values(c.his), ...Object.values(c.hers));
  const used = TYPES.filter(([k]) => c.his[k] || c.hers[k]);
  if (!used.length) return <p className="muted" style={{ margin: 0 }}>Log a workout from Today to see your mix.</p>;
  return (
    <div className="types">
      {used.map(([k, v]) => (
        <div className="trow" key={k}><span>{v}</span>
          <div className="tbars">
            {WHO.map((who) => (
              <i key={who} className={who} style={{ width: `${((c[who][k] || 0) / max) * 100}%` }}
                title={`${displayName(data.people[who], who)}: ${c[who][k] || 0}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkoutLogCard() {
  const { data } = useStore();
  const [filter, setFilter] = useState<"all" | Who>("all");
  const rows = WHO.filter((w) => filter === "all" || filter === w).flatMap((who) =>
    Object.entries(data.people[who].workouts).map(([d, v]) => ({ d, who, v, l: data.people[who].logs[d] })),
  );
  rows.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  const opts: [typeof filter, string][] = [["all", "Both"], ["his", displayName(data.people.his, "his")], ["hers", displayName(data.people.hers, "hers")]];
  return (
    <div className="card">
      <div className="panelhead"><h3>Workout log</h3>
        <div className="chips">
          {opts.map(([k, v]) => <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{v}</button>)}
        </div>
      </div>
      <ul className="log">
        {rows.length ? rows.slice(0, 60).map((r) => (
          <li key={r.who + r.d} className={`c-${r.who}`}>
            <span className="who">{displayName(data.people[r.who], r.who)}</span>
            <span className="what">{r.v === "rest" ? "Rest day" : describe(r.l)}</span>
            <time>{fmt(r.d, { weekday: "short", month: "short", day: "numeric" })}</time>
            {r.l?.note && <span className="note">{r.l.note}</span>}
          </li>
        )) : <li className="muted">No workouts logged yet.</li>}
      </ul>
    </div>
  );
}
