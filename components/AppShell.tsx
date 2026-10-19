"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, DayEntry, Mirror, PromiseItem } from "@/lib/types";
import { PLANS } from "@/lib/brand";
import { addDays, dayKeyAt, phaseAt, type Phase } from "@/lib/dates";
import { emptyState, loadState, saveState, validateImport } from "@/lib/storage";
import { checkAiEnabled } from "@/lib/client";
import { makeDemoEntries } from "@/lib/demo";
import { supabase } from "@/lib/supabase";
import { deleteAllRemote, merge, pullAll, pushEntries, pushMirrors, pushProfile, removeEntries } from "@/lib/sync";
import type { SyncStatus } from "./AuthPanel";
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
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [sync, setSync] = useState<SyncStatus>("off");
  const pulledFor = useRef<string | null>(null);
  const baseline = useRef<{ entries: Map<string, string>; mirrors: Map<string, string>; profile: string }>({
    entries: new Map(),
    mirrors: new Map(),
    profile: "",
  });
  const stateRef = useRef<AppState | null>(null);
  stateRef.current = state;

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

  // ---- Accounts: listen for sign in / sign out ----
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const toUser = (u: { id: string; email?: string } | null | undefined) => (u ? { id: u.id, email: u.email ?? "" } : null);
    sb.auth.getSession().then(({ data }) => setUser(toUser(data.session?.user)));
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  const snapshot = (s: AppState) => {
    const entries = new Map<string, string>();
    for (const [d, e] of Object.entries(s.entries)) if (!e.demo) entries.set(d, JSON.stringify(e));
    const mirrors = new Map<string, string>();
    for (const [d, m] of Object.entries(s.mirrors)) mirrors.set(d, JSON.stringify(m));
    return { entries, mirrors, profile: JSON.stringify([s.name, s.reminders]) };
  };

  // ---- Accounts: first load after sign in pulls the account and merges this device's entries into it ----
  useEffect(() => {
    if (!user) {
      pulledFor.current = null;
      setSync("off");
      return;
    }
    if (!stateRef.current || pulledFor.current === user.id) return;
    pulledFor.current = user.id;
    setSync("syncing");
    pullAll(user.id)
      .then((remote) => {
        const local = stateRef.current!;
        const merged = merge(local, remote);
        // Baseline = what the server has, so anything newer on this device gets uploaded next.
        baseline.current = snapshot({ ...merged, entries: remote.entries, mirrors: remote.mirrors, name: remote.name ?? "", reminders: remote.reminders ?? merged.reminders });
        setState(merged);
        setSync("saved");
      })
      .catch(() => {
        pulledFor.current = null;
        setSync("error");
        setToast("Couldn't reach your account. Your entries are safe on this device.");
      });
  }, [user, state === null]);

  // ---- Accounts: save changes to the account a moment after they happen ----
  useEffect(() => {
    if (!user || !state || pulledFor.current !== user.id) return;
    const t = setTimeout(async () => {
      const cur = snapshot(state);
      const base = baseline.current;
      const changed = [...cur.entries].filter(([d, j]) => base.entries.get(d) !== j).map(([d]) => state.entries[d]);
      const removed = [...base.entries.keys()].filter((d) => !cur.entries.has(d));
      const mirrors = [...cur.mirrors].filter(([d, j]) => base.mirrors.get(d) !== j).map(([d]) => state.mirrors[d]);
      const profileChanged = cur.profile !== base.profile;
      if (!changed.length && !removed.length && !mirrors.length && !profileChanged) return;
      setSync("syncing");
      try {
        await Promise.all([
          pushEntries(user.id, changed),
          removeEntries(user.id, removed),
          pushMirrors(user.id, mirrors),
          profileChanged ? pushProfile(user.id, state.name, state.reminders) : Promise.resolve(),
        ]);
        baseline.current = cur;
        setSync("saved");
      } catch {
        setSync("error");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [state, user]);

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut();
    baseline.current = { entries: new Map(), mirrors: new Map(), profile: "" };
    setState(emptyState());
    setTab("today");
    setViewDate(null);
    setToast("Signed out. Your journal is safe in your account.");
  }, []);

  const patch = useCallback((fn: (s: AppState) => AppState) => setState((p) => (p ? fn(p) : p)), []);

  const setEntry = useCallback(
    (date: string, fn: (e: DayEntry) => DayEntry) =>
      patch((s) => {
        const cur = s.entries[date];
        return cur ? { ...s, entries: { ...s.entries, [date]: { ...fn(cur), updatedAt: new Date().toISOString() } } } : s;
      }),
    [patch],
  );

  const createEntry = useCallback(
    (date: string, promises: PromiseItem[]) =>
      patch((s) => ({
        ...s,
        entries: { ...s.entries, [date]: { date, promises, journal: "", updatedAt: new Date().toISOString() } },
      })),
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
        signingIn={!!user && sync === "syncing"}
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
            email={user?.email ?? null}
            sync={sync}
            onSignOut={signOut}
            onReset={() => {
              if (user) {
                deleteAllRemote(user.id).catch(() => {});
                baseline.current = { entries: new Map(), mirrors: new Map(), profile: baseline.current.profile };
              }
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
