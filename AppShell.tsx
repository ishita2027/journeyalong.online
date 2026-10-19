"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, DayEntry, Mirror, PromiseItem } from "@/lib/types";
import { PLANS } from "@/lib/brand";
import { addDays, dayKeyAt, phaseAt, type Phase } from "@/lib/dates";
import { emptyState, loadState, saveState, validateImport } from "@/lib/storage";
import { checkAiEnabled } from "@/lib/client";
import { makeDemoEntries } from "@/lib/demo";
import { Circle } from "./Circle";
import { TabIcon, Wordmark, type TabId } from "./Icons";
import Onboarding from "./Onboarding";
import TodayView from "./TodayView";
import TrustView from "./TrustView";
import MirrorView from "./MirrorView";
import JournalView from "./JournalView";
import ProfileView from "./ProfileView";
import UpgradeSheet from "./UpgradeSheet";

const TABS: { id: TabId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "trust", label: "Self-Trust" },
  { id: "mirror", label: "Mind Mirror" },
  { id: "journal", label: "Journal" },
  { id: "profile", label: "Profile" },
];

/** Preview a phase with ?time=morning|afternoon|evening (useful for demos). */
function phaseOverride(): Phase | null {
  try {
    const t = new URLSearchParams(window.location.search).get("time");
    return t === "morning" || t === "afternoon" || t === "evening" ? t : null;
  } catch {
    return null;
  }
}

export default function AppShell() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<TabId>("today");
  const [now, setNow] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState(false);
  const [toast, setToast] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    setState(loadState());
    setNow(new Date());
    loaded.current = true;
    checkAiEnabled().then(setAiOn);
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  useEffect(() => {
    if (state && loaded.current) saveState(state);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    window.scrollTo?.({ top: 0 });
  }, [tab]);

  const patch = useCallback((fn: (s: AppState) => AppState) => setState((p) => (p ? fn(p) : p)), []);

  const setEntry = useCallback(
    (date: string, fn: (e: DayEntry) => DayEntry) =>
      patch((s) => {
        const cur = s.entries[date];
        return cur ? { ...s, entries: { ...s.entries, [date]: fn(cur) } } : s;
      }),
    [patch],
  );

  const createEntry = useCallback(
    (date: string, promises: PromiseItem[]) =>
      patch((s) => ({ ...s, entries: { ...s.entries, [date]: { date, promises, journal: "" } } })),
    [patch],
  );

  const addDemo = useCallback(
    (name?: string) =>
      patch((s) => {
        const demo = makeDemoEntries(dayKeyAt(new Date()), name ?? s.name);
        return { ...s, entries: { ...demo, ...s.entries } };
      }),
    [patch],
  );

  if (!state || !now) {
    return (
      <div className="boot" role="status" aria-live="polite">
        <Circle status="partial" size={36} />
        <span>Opening your journal…</span>
      </div>
    );
  }

  if (!state.onboarded) {
    return (
      <Onboarding
        onStart={(name) => patch((s) => ({ ...s, name, onboarded: true }))}
        onDemo={(name) => {
          patch((s) => ({ ...s, name, onboarded: true }));
          addDemo(name);
          setTab("mirror");
        }}
      />
    );
  }

  const today = dayKeyAt(now);
  const phase = phaseOverride() ?? phaseAt(now);
  const yesterday = addDays(today, -1);
  const y = state.entries[yesterday];
  const yesterdayOpen = !!y && y.promises.length > 0 && !y.checkedInAt;
  const activeDate = viewDate ?? today;
  const plan = PLANS.find((p) => p.id === state.plan) ?? PLANS[0];

  const go = (t: TabId) => {
    setTab(t);
    if (t !== "today") setViewDate(null);
  };

  const wide = tab === "trust" || tab === "mirror";

  return (
    <div className="shell" data-clarity-mask="True">
      <aside className="side" aria-label="Journey Along">
        <Wordmark as="a" href="/" />
        <nav aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
              <TabIcon id={t.id} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="plan-pill" onClick={() => setUpgrade(true)}>
            {plan.name} plan
          </button>
        </div>
      </aside>

      <div className="mobile-top">
        <Wordmark as="a" href="/" />
        <button className="plan-pill" onClick={() => setUpgrade(true)}>
          {plan.id === "free" ? "See plans" : plan.name}
        </button>
      </div>

      <main className={`page ${wide ? "page-wide" : ""}`}>
        {tab === "today" && yesterdayOpen && !viewDate && (
          <div className="banner" role="status">
            <p>Yesterday&rsquo;s promises weren&rsquo;t checked in. A late honest check-in still counts.</p>
            <button className="btn btn-soft" onClick={() => setViewDate(yesterday)}>
              Check in on yesterday
            </button>
          </div>
        )}

        {tab === "today" && (
          <TodayView
            key={activeDate}
            state={state}
            date={activeDate}
            isToday={activeDate === today}
            phase={phase}
            aiOn={aiOn}
            createEntry={createEntry}
            setEntry={setEntry}
            onBackToToday={() => setViewDate(null)}
          />
        )}
        {tab === "trust" && <TrustView state={state} today={today} />}
        {tab === "mirror" && (
          <MirrorView
            state={state}
            today={today}
            aiOn={aiOn}
            onSave={(m: Mirror) => patch((s) => ({ ...s, mirrors: { ...s.mirrors, [m.endDate]: m } }))}
            onLoadDemo={() => {
              addDemo();
              setToast("Sample entries added. Remove them any time from Profile.");
            }}
          />
        )}
        {tab === "journal" && <JournalView state={state} today={today} onToday={() => go("today")} />}
        {tab === "profile" && (
          <ProfileView
            state={state}
            aiOn={aiOn}
            onName={(name) => patch((s) => ({ ...s, name }))}
            onReminders={(reminders) => patch((s) => ({ ...s, reminders }))}
            onUpgrade={() => setUpgrade(true)}
            onDemo={() => {
              addDemo();
              setToast("Sample entries added.");
            }}
            onClearDemo={() =>
              patch((s) => ({
                ...s,
                entries: Object.fromEntries(Object.entries(s.entries).filter(([, e]) => !e.demo)),
                mirrors: {},
              }))
            }
            onExport={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `journey-along-${today}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            onImport={async (file) => {
              try {
                const parsed = validateImport(JSON.parse(await file.text()));
                if (!parsed) throw new Error("bad");
                setState(parsed);
                setToast("Imported.");
              } catch {
                setToast("That file isn't a Journey Along export.");
              }
            }}
            onReset={() => {
              setState({ ...emptyState() });
              setViewDate(null);
              setTab("today");
            }}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
            <TabIcon id={t.id} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {upgrade && <UpgradeSheet current={state.plan} onClose={() => setUpgrade(false)} />}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
