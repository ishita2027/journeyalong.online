"use client";
import { useRef, useState } from "react";
import type { AppState, Reminders } from "@/lib/types";
import { PLANS } from "@/lib/brand";
import AuthPanel, { type SyncStatus } from "./AuthPanel";

export default function ProfileView({
  state,
  aiOn,
  onName,
  onReminders,
  onUpgrade,
  onDemo,
  onClearDemo,
  onExport,
  onImport,
  onReset,
  email,
  sync,
  onSignOut,
}: {
  state: AppState;
  aiOn: boolean;
  onName: (n: string) => void;
  onReminders: (r: Reminders) => void;
  onUpgrade: () => void;
  onDemo: () => void;
  onClearDemo: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  email: string | null;
  sync: SyncStatus;
  onSignOut: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const hasDemo = Object.values(state.entries).some((e) => e.demo);
  const plan = PLANS.find((p) => p.id === state.plan) ?? PLANS[0];
  const r = state.reminders;
  const initial = (state.name.trim()[0] || "J").toUpperCase();

  return (
    <>
      <header className="page-head">
        <h1 className="script-md">profile</h1>
      </header>

      <section className="card card-lg me-head" aria-label="You">
        <span className="avatar" aria-hidden="true">
          {initial}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input id="name" className="input" value={state.name} maxLength={40} onChange={(e) => onName(e.target.value)} />
        </div>
      </section>

      <section className="card card-lg" aria-label="Account">
        <AuthPanel email={email} status={sync} onSignOut={onSignOut} />
      </section>

      <section className="note note-peach" style={{ display: "grid", gap: 10 }} aria-label="Your plan">
        <span className="tape tape-lilac tape-left" aria-hidden="true" />
        <p className="tag" style={{ color: "var(--peach-700)" }}>
          Your plan
        </p>
        <div className="row-split">
          <div>
            <p className="title-2">{plan.name}</p>
            <p className="soft body-sm">{plan.id === "free" ? "Free forever. Upgrade any time." : `${plan.price} ${plan.per}`}</p>
          </div>
          <button className="btn btn-primary" onClick={onUpgrade}>
            See plans
          </button>
        </div>
      </section>

      <section className="card card-lg" aria-label="Reminders">
        <div className="rows">
          <div className="row-split">
            <div>
              <p className="headline">Reminders</p>
              <p className="soft body-sm">A nudge to make promises in the morning and to check in at night.</p>
            </div>
            <button
              className="switch"
              role="switch"
              aria-checked={r.on}
              aria-label="Reminders"
              onClick={() => onReminders({ ...r, on: !r.on })}
            />
          </div>
          <div className="row-split">
            <label htmlFor="rem-m">Morning promises</label>
            <input
              id="rem-m"
              type="time"
              className="input time-input"
              value={r.morning}
              disabled={!r.on}
              onChange={(e) => onReminders({ ...r, morning: e.target.value })}
            />
          </div>
          <div className="row-split">
            <label htmlFor="rem-e">Evening check-in</label>
            <input
              id="rem-e"
              type="time"
              className="input time-input"
              value={r.evening}
              disabled={!r.on}
              onChange={(e) => onReminders({ ...r, evening: e.target.value })}
            />
          </div>
          <p className="hint">Reminders are coming in the next update. Your times are saved and will be used then.</p>
        </div>
      </section>

      <section className="card card-lg" aria-label="AI coach">
        <p className="headline">
          <span className={`status-dot ${aiOn ? "on" : ""}`} aria-hidden="true" />
          AI coach {aiOn ? "connected" : "not connected"}
        </p>
        <p className="soft body-sm" style={{ marginTop: 4 }}>
          {aiOn
            ? "When you finish a check-in or read a Mirror, that entry's text is sent to Anthropic's API to write the reply."
            : "The app runs on built-in logic. Add ANTHROPIC_API_KEY on the server to turn on AI replies and the full Mind Mirror."}
        </p>
      </section>

      <section className="card card-lg" aria-label="Your data">
        <div className="rows">
          <div>
            <p className="headline">Your data</p>
            <p className="soft body-sm">
              Everything is saved in this browser only. Export a copy if you switch devices or clear your browser.
            </p>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn-soft" onClick={onExport}>
                Export as JSON
              </button>
              <button className="btn btn-soft" onClick={() => fileRef.current?.click()}>
                Import from JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div>
            <p className="headline">Sample data</p>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn btn-soft" onClick={onDemo}>
                Load two weeks of sample entries
              </button>
              {hasDemo && (
                <button className="btn btn-quiet" onClick={onClearDemo}>
                  Remove sample entries
                </button>
              )}
            </div>
          </div>
          <div>
            <p className="headline">Start over</p>
            {confirmReset ? (
              <div className="actions" style={{ marginTop: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onReset();
                    setConfirmReset(false);
                  }}
                >
                  Yes, delete everything
                </button>
                <button className="btn btn-quiet" onClick={() => setConfirmReset(false)}>
                  Keep my data
                </button>
              </div>
            ) : (
              <button className="btn btn-quiet" style={{ marginTop: 6 }} onClick={() => setConfirmReset(true)}>
                Delete all my data
              </button>
            )}
          </div>
        </div>
      </section>

      <p className="hint">Journey Along is a self-reflection tool, not therapy or medical advice.</p>
    </>
  );
}
