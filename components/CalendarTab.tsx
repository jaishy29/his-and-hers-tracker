"use client";
import { useState } from "react";
import { WHO, WORKOUT_START, type Who } from "@/lib/constants";
import { fmt, iso, parse, WEIGH_DATES } from "@/lib/dates";
import { describe, displayName } from "@/lib/derive";
import { useStore } from "@/lib/store";

const FIRST = new Date(2026, 9, 1);
const LAST = new Date(2027, 9, 1);

export default function CalendarTab() {
  const { data, today, me, setDay } = useStore();
  const [view, setView] = useState(() => {
    const t = parse(today);
    let m = new Date(t.getFullYear(), t.getMonth(), 1);
    if (m < FIRST) m = FIRST;
    if (m > LAST) m = LAST;
    return m;
  });
  const lead = (view.getDay() + 6) % 7;
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  const cycle = (who: Who, d: string) => {
    const cur = data.people[who].workouts[d];
    setDay(who, d, !cur ? "done" : cur === "done" ? "rest" : null);
  };

  const cells = [];
  for (let n = 1; n <= days; n++) {
    const d = iso(new Date(view.getFullYear(), view.getMonth(), n));
    if (d < WORKOUT_START) {
      cells.push(<div key={d} className="day off"><div className="d"><span>{n}</span></div></div>);
      continue;
    }
    const future = d > today;
    cells.push(
      <div key={d} className={`day${d === today ? " today" : ""}`}>
        <div className="d"><span>{n}</span>{WEIGH_DATES.includes(d) && <em>Weigh-in</em>}</div>
        <div className="marks">
          {WHO.map((who) => {
            const p = data.people[who];
            const v = p.workouts[d] || "";
            const name = displayName(p, who);
            const mine = who === me;
            return (
              <button key={who} className={`mark ${who}`} data-v={v} disabled={future || !mine}
                title={`${name}: ${v === "done" ? describe(p.logs[d]) : v || "not logged"}${mine ? "" : " (only " + name + " can change this)"}`}
                aria-label={`${name} ${fmt(d)}: ${v || "not logged"}`}
                onClick={() => cycle(who, d)}>
                {name}{v === "done" ? " ✓" : v === "rest" ? " · z" : ""}
              </button>
            );
          })}
        </div>
      </div>,
    );
  }

  return (
    <section className="panel">
      <div className="panelhead">
        <p className="hint">Tap your own box to fill in a missed day: once for a workout, twice for a rest day, three times to clear. For workout details, use Today.</p>
        <div className="monthnav">
          <button aria-label="Previous month" disabled={view <= FIRST} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>‹</button>
          <strong>{view.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong>
          <button aria-label="Next month" disabled={view >= LAST} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>›</button>
        </div>
      </div>
      <div className="cal">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="dow">{d}</div>)}
        {[...Array(lead)].map((_, i) => <div key={"lead" + i} />)}
        {cells}
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--his)" }} />{displayName(data.people.his, "his")} workout</span>
        <span><i style={{ background: "var(--hers)" }} />{displayName(data.people.hers, "hers")} workout</span>
        <span><i style={{ background: "var(--rest)" }} />Rest day</span>
        <span><i style={{ border: "2px solid var(--gold)" }} />Today</span>
      </div>
    </section>
  );
}
