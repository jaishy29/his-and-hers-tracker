"use client";
import { useEffect, useState } from "react";
import { PEOPLE, WHO, WORKOUT_START, type Who } from "@/lib/constants";
import { addDays, fmt, iso, parse, WEIGH_DATES } from "@/lib/dates";
import { displayName, weightEntries } from "@/lib/derive";
import { useStore } from "@/lib/store";
import { useToast } from "./Toast";

export default function WeightTab() {
  const { data, today } = useStore();
  const nextIdx = WEIGH_DATES.findIndex((d) => d >= today);
  return (
    <section className="panel">
      <p className="hint">Log your weight any day from Today. Saturdays are the official weigh-ins, starting October 24: same scale, same time, before breakfast.</p>
      <div className="chartbox"><WeightChart /></div>
      <div className="tablebox">
        <table>
          <thead>
            <tr>
              <th>Week</th><th>Saturday</th>
              <th>{displayName(data.people.his, "his")} weight</th><th>Change</th>
              <th>{displayName(data.people.hers, "hers")} weight</th><th>Change</th>
            </tr>
          </thead>
          <tbody>
            <DeltaRows nextIdx={nextIdx} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DeltaRows({ nextIdx }: { nextIdx: number }) {
  const { data } = useStore();
  const prev: Record<Who, number> = { his: PEOPLE.his.start, hers: PEOPLE.hers.start };
  return (
    <>
      {WEIGH_DATES.map((d, i) => {
        const cells = WHO.map((who) => {
          const v = data.people[who].weights[d];
          let delta: { text: string; down: boolean } | null = null;
          if (typeof v === "number") {
            const ch = +(v - prev[who]).toFixed(1);
            delta = { text: `${ch > 0 ? "+" : ""}${ch} lb`, down: ch <= 0 };
            prev[who] = v;
          }
          return { who, v, delta };
        });
        return (
          <tr key={d} className={i === nextIdx ? "next" : undefined}>
            <td className="wkno">{i + 1}</td>
            <td>{fmt(d)}{d.slice(0, 4) !== "2026" ? " " + d.slice(0, 4) : ""}</td>
            {cells.map(({ who, v, delta }) => [
              <td key={who + "w"}><WeightCell who={who} day={d} value={v} /></td>,
              <td key={who + "d"}>{delta && <span className={`delta${who === "hers" ? " hersd" : ""} ${delta.down ? "down" : "up"}`}>{delta.text}</span>}</td>,
            ])}
          </tr>
        );
      })}
    </>
  );
}

function WeightCell({ who, day, value }: { who: Who; day: string; value?: number }) {
  const { data, me, today, logWeight } = useStore();
  const toast = useToast();
  const [text, setText] = useState(value != null ? String(value) : "");
  useEffect(() => { setText(value != null ? String(value) : ""); }, [value]); // eslint-disable-line react-hooks/set-state-in-effect
  const mine = who === me;
  const name = displayName(data.people[who], who);
  const commit = () => {
    const raw = text.trim();
    if (raw === "") { if (value != null) logWeight(who, day, null); return; }
    const n = parseFloat(raw.replace(",", "."));
    if (!(n > 50 && n < 600)) { setText(value != null ? String(value) : ""); toast("Enter a weight in pounds"); return; }
    const r = Math.round(n * 10) / 10;
    if (r === value) return;
    const hit = logWeight(who, day, r);
    if (hit) toast(hit.goal ? "GOAL WEIGHT! Go scratch your goal ticket 🎉" : `New scratch-off unlocked: −${hit.lost} lb! 🎉`);
  };
  return (
    <input className={`${who} num`} inputMode="decimal" placeholder="lb" aria-label={`${name} weight ${fmt(day)}`}
      value={text} disabled={!mine || day > today} title={mine ? undefined : `Only ${name} can change this`}
      onChange={(e) => setText(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
  );
}

function WeightChart() {
  const { data, today } = useStore();
  const W = 900, H = 300, L = 44, R = 16, T = 16, B = 34, y0 = 170, y1 = 280;
  const start = parse(WORKOUT_START);
  const all = WHO.flatMap((w) => weightEntries(data.people[w]).map((e) => e[0])).sort();
  const lastD = all.length ? all[all.length - 1] : today;
  const span = Math.max(56, (parse(lastD > today ? lastD : today).getTime() - start.getTime()) / 864e5 + 14);
  const x = (d: string) => L + (W - L - R) * ((parse(d).getTime() - start.getTime()) / 864e5 / span);
  const y = (v: number) => T + (H - T - B) * (1 - (Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0));
  const stepDays = span > 200 ? 56 : span > 100 ? 28 : 14;
  const grid = [];
  for (let v = y0; v <= y1; v += 10) grid.push(v);
  const xticks = [];
  for (let k = 0; k <= span; k += stepDays) xticks.push(iso(addDays(start, k)));
  const tx = x(today);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Weight chart">
      {grid.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" style={{ fontFamily: "var(--font-num)" }}>{v}</text>
        </g>
      ))}
      {xticks.map((d) => <text key={d} x={x(d)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{fmt(d)}</text>)}
      <line x1={tx} x2={tx} y1={T} y2={H - B} stroke="var(--gold)" strokeDasharray="3 4" />
      {WHO.map((who) => {
        const c = `var(--${who})`;
        const g = PEOPLE[who].goal;
        const pts: [string, number][] = [[WORKOUT_START, PEOPLE[who].start], ...weightEntries(data.people[who])];
        return (
          <g key={who}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke={c} strokeDasharray="5 5" strokeWidth="1.5" opacity=".7" />
            <text x={W - R} y={y(g) - 6} textAnchor="end" fontSize="11" fill={c} fontWeight="700">{displayName(data.people[who], who)} goal {g}</text>
            <polyline fill="none" stroke={c} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
              points={pts.map((p) => `${x(p[0])},${y(p[1])}`).join(" ")} />
            {pts.map((p, k) => (
              <circle key={p[0]} cx={x(p[0])} cy={y(p[1])} r={k === pts.length - 1 ? 5.5 : 3.5}
                fill={k === pts.length - 1 ? c : "var(--surface)"} stroke={c} strokeWidth="2">
                <title>{`${fmt(p[0])}: ${p[1]} lb`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
