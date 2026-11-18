"use client";
import { useEffect, useState } from "react";
import { DataProvider, ls, useStore } from "@/lib/store";
import { ToastProvider } from "./Toast";
import TodayTab from "./TodayTab";
import ProgressTab from "./ProgressTab";
import CalendarTab from "./CalendarTab";
import WeightTab from "./WeightTab";
import RewardsTab from "./RewardsTab";
import ServiceWorker from "./ServiceWorker";

const TABS = [
  { id: "today", label: "Today", icon: <path d="M20 6 9 17l-5-5" /> },
  { id: "progress", label: "Progress", icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /> },
  { id: "calendar", label: "Calendar", icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></> },
  { id: "weight", label: "Weight", icon: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a6 6 0 0 1 8 0l-3 4" /></> },
  { id: "rewards", label: "Rewards", icon: <path d="M3 8h18v4H3zM12 8v13M5 12v9h14v-9M12 8C9 8 7 3 10 3s2 5 2 5 0-5 3-5 1 5-3 5" /> },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <ServiceWorker />
        <Shell />
      </ToastProvider>
    </DataProvider>
  );
}

function Shell() {
  const { ready, me, syncLabel, resetDemo } = useStore();
  const [tab, setTab] = useState<TabId>("today");

  useEffect(() => {
    const saved = ls.get("hh-tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore last tab on first open
    if (TABS.some((t) => t.id === saved)) setTab(saved as TabId);
  }, []);

  useEffect(() => {
    if (me) document.body.dataset.me = me;
    else delete document.body.dataset.me;
  }, [me]);

  const show = (t: TabId) => {
    setTab(t);
    ls.set("hh-tab", t);
    window.scrollTo(0, 0);
  };

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="eyebrow">Accountability board · started Oct 15, 2026</div>
          <h1>His &amp; Hers</h1>
        </div>
        <div className="sync">{ready ? syncLabel : "Loading…"}</div>
      </header>

      <div className="offline demo">
        <p><b>Practice mode.</b> This is pretend data saved on this device only. Real accounts and syncing come next.</p>
        <button className="btn ghost small" onClick={() => { if (confirm("Reset the pretend data?")) resetDemo(); }}>Reset pretend data</button>
      </div>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => show(t.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{t.icon}</svg>
            {t.label}
          </button>
        ))}
      </nav>

      {!ready ? (
        <div className="loading">Loading…</div>
      ) : (
        <>
          {tab === "today" && <TodayTab />}
          {tab === "progress" && <ProgressTab />}
          {tab === "calendar" && <CalendarTab />}
          {tab === "weight" && <WeightTab />}
          {tab === "rewards" && <RewardsTab />}
        </>
      )}
    </div>
  );
}
