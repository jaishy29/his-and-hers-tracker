"use client";
import { CHEERS, PEOPLE, WHO, type Who } from "@/lib/constants";
import { bestWeight, displayName, milestones } from "@/lib/derive";
import { useStore } from "@/lib/store";
import ScratchTicket from "./ScratchTicket";

export default function RewardsTab() {
  return (
    <section className="panel">
      <p className="hint">Every 5 pounds earns a ticket. A ticket unlocks when a logged weight reaches its number. Drag your finger across the foil to scratch it off.</p>
      {WHO.map((w) => <Tickets key={w} who={w} />)}
    </section>
  );
}

function Tickets({ who }: { who: Who }) {
  const { data, me, scratch } = useStore();
  const p = data.people[who];
  const low = bestWeight(p);
  const ms = milestones(who);
  const earned = ms.filter((m) => low != null && low <= m.target).length;
  const name = displayName(p, who);
  return (
    <div className={`tickets ${who}`}>
      <div className="panelhead">
        <h3>{name}: {PEOPLE[who].start} → {PEOPLE[who].goal}</h3>
        <span className="eyebrow num">{earned} of {ms.length} unlocked</span>
      </div>
      <div className="tgrid">
        {ms.map((m, i) => {
          const ready = low != null && low <= m.target;
          const done = !!p.scratched[m.target];
          const cheer = m.goal ? "GOAL WEIGHT! You did it." : CHEERS[i % CHEERS.length];
          const cls = `ticket${m.goal ? " goal" : ""}${ready ? (done ? " done" : " ready") : " locked"}`;
          if (!ready) {
            return (
              <div key={m.target} className={cls}>
                <span className="tag">Locked</span>
                <div className="prize"><b className="num">{m.target}</b><span>{m.goal ? "Goal weight" : `−${m.lost} lb`}</span><small>Unlocks at {m.target} lb</small></div>
              </div>
            );
          }
          return (
            <div key={m.target} className={cls}>
              <span className="tag">{done ? "Claimed" : "Scratch me"}</span>
              <div className="prize"><b className="num">−{m.lost}</b><span>{cheer}</span><small>Reached {m.target} lb</small></div>
              {!done && (who === me
                ? <ScratchTicket label={m.goal ? "GOAL TICKET" : "SCRATCH HERE"} sub={`${m.target} lb reached`} onDone={() => scratch(m.target)} />
                : <div className="wait"><b>{m.goal ? "GOAL TICKET" : "UNSCRATCHED"}</b>Waiting for {name} to scratch it</div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
