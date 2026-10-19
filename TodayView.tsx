"use client";
import { useState } from "react";
import type { AppState, BlockerId, DayEntry, PromiseItem, Status } from "@/lib/types";
import { BLOCKERS, sizeLabel } from "@/lib/types";
import { addDays, formatLong, type Phase } from "@/lib/dates";
import { dayScore, isCheckedIn, trustAsOf } from "@/lib/stats";
import { localReply } from "@/lib/localReply";
import { requestReflection } from "@/lib/client";
import { Circle, NEXT_STATUS, STATUS_LABEL } from "./Circle";
import { Moon, Sparkle } from "./Icons";
import PromiseForm from "./PromiseForm";

const PROMPTS = [
  "What did I tell myself before starting?",
  "What made the kept one easier?",
  "What would make tomorrow's version smaller?",
  "What did I do instead?",
];
const STATUSES: Status[] = ["kept", "partial", "missed"];
const WORDS = ["None", "One", "Two", "Three"];
const PHASE_WORD: Record<Phase, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

function TimeHero({ phase, name, tag, sub }: { phase: Phase; name: string; tag: string; sub?: string }) {
  return (
    <section className={`hero-band ${phase}`} aria-label="Today">
      <span className="sun" aria-hidden="true" />
      <p className="tag">{tag}</p>
      <h1 className="script-xl">
        <span>
          Good {PHASE_WORD[phase]}
          {name ? `, ${name}` : ""}
        </span>
        <Sparkle />
      </h1>
      {sub && <p className="sub">{sub}</p>}
    </section>
  );
}

export default function TodayView({
  state,
  date,
  isToday,
  phase,
  aiOn,
  createEntry,
  setEntry,
  onBackToToday,
}: {
  state: AppState;
  date: string;
  isToday: boolean;
  phase: Phase;
  aiOn: boolean;
  createEntry: (date: string, promises: PromiseItem[]) => void;
  setEntry: (date: string, fn: (e: DayEntry) => DayEntry) => void;
  onBackToToday: () => void;
}) {
  const entry = state.entries[date];
  const tomorrow = addDays(date, 1);
  const tomorrowEntry = state.entries[tomorrow];
  const [reflecting, setReflecting] = useState(false);
  const [target, setTarget] = useState<"tonight" | "tomorrow">("tomorrow");
  const [planTomorrow, setPlanTomorrow] = useState(false);

  const shownPhase: Phase = isToday ? phase : "evening";
  const unlocked = !isToday || phase === "evening";
  const tag = isToday ? formatLong(date) : `${formatLong(date)}, late check-in`;

  function updatePromise(id: string, patch: Partial<PromiseItem>) {
    setEntry(date, (e) => ({ ...e, promises: e.promises.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }
  function setStatus(p: PromiseItem, s: Status) {
    updatePromise(p.id, { status: s, blocker: s === "kept" || s === "pending" ? undefined : p.blocker });
  }

  async function finish() {
    if (!entry) return;
    const done: DayEntry = { ...entry, checkedInAt: new Date().toISOString() };
    setEntry(date, () => done);
    setReflecting(true);
    const recent = Array.from({ length: 5 }, (_, i) => addDays(date, -(5 - i)))
      .map((d) => state.entries[d])
      .filter(isCheckedIn)
      .map((e) => ({
        date: e.date,
        kept: e.promises.filter((p) => p.status === "kept").length,
        partial: e.promises.filter((p) => p.status === "partial").length,
        missed: e.promises.filter((p) => p.status === "missed").length,
        journal: e.journal,
      }));
    let reply: string | null = null;
    if (aiOn) {
      reply = await requestReflection({
        name: state.name,
        entry: done,
        recent,
        trust: trustAsOf({ ...state.entries, [date]: done }, date),
      });
    }
    setEntry(date, (e) => ({ ...e, reply: reply ?? localReply(done, state.name), replySource: reply ? "ai" : "local" }));
    setReflecting(false);
  }

  async function retryReply() {
    if (!entry) return;
    setReflecting(true);
    const reply = await requestReflection({ name: state.name, entry, recent: [], trust: trustAsOf(state.entries, date) });
    if (reply) setEntry(date, (e) => ({ ...e, reply, replySource: "ai" }));
    setReflecting(false);
  }

  const back = !isToday && (
    <div>
      <button className="btn btn-quiet" onClick={onBackToToday}>
        Back to today
      </button>
    </div>
  );

  /* ---------------- No promises yet ---------------- */
  if (!entry || entry.promises.length === 0) {
    if (isToday && phase === "evening") {
      if (tomorrowEntry && tomorrowEntry.promises.length) {
        return (
          <>
            <TimeHero phase="evening" name={state.name} tag={tag} sub="Tomorrow's promises are set. Rest well." />
            <TomorrowSet entry={tomorrowEntry} />
          </>
        );
      }
      return (
        <>
          <TimeHero phase="evening" name={state.name} tag={tag} sub="Make promises for tonight, or set up tomorrow." />
          <section className="sec" aria-label="Make promises">
            <div className="target" role="group" aria-label="Which day are these promises for?">
              <button aria-pressed={target === "tonight"} onClick={() => setTarget("tonight")}>
                Tonight
              </button>
              <button aria-pressed={target === "tomorrow"} onClick={() => setTarget("tomorrow")}>
                Tomorrow
              </button>
            </div>
            <PromiseForm
              key={target}
              aiOn={aiOn}
              heading={
                <h2 className="title-2">
                  {target === "tomorrow"
                    ? "What three promises will you keep tomorrow?"
                    : "What three promises will you keep tonight?"}
                </h2>
              }
              onCommit={(p) => createEntry(target === "tomorrow" ? tomorrow : date, p)}
            />
          </section>
        </>
      );
    }
    return (
      <>
        <TimeHero phase={shownPhase} name={state.name} tag={tag} sub="What three promises will you keep today?" />
        {back}
        <PromiseForm aiOn={aiOn} heading={<span className="script-md">your promises</span>} onCommit={(p) => createEntry(date, p)} />
      </>
    );
  }

  const open = entry.promises.filter((p) => p.status === "pending").length;
  const allMarked = open === 0;
  const wroteEnough = entry.journal.trim().length >= 15;

  /* ---------------- Checked in ---------------- */
  if (entry.checkedInAt) {
    const score = dayScore(entry) ?? 0;
    const hardDay = score === 0;
    return (
      <>
        <TimeHero phase={shownPhase} name={state.name} tag={tag} />
        {back}
        <section className="sec" aria-label="Today's promises">
          <div className="sec-head">
            <h2 className="script-md">today</h2>
          </div>
          <div className="card card-lg" style={{ display: "grid", gap: 16 }}>
            {hardDay ? (
              <div>
                <p className="headline">You checked in honestly.</p>
                <p className="soft body-sm">Locked in. Honest check-ins count for as much as kept promises.</p>
              </div>
            ) : (
              <p className="headline">
                {score >= 0.83
                  ? "Locked in for today. Trust grows from days like this."
                  : "Locked in. Honest check-ins count for as much as kept promises."}
              </p>
            )}
            <ul className="mini-list">
              {entry.promises.map((p) => (
                <li key={p.id}>
                  <Circle status={p.status} size={26} />
                  <div>
                    <p className="t">{p.text}</p>
                    <p className="s">
                      {STATUS_LABEL[p.status]}
                      {p.blocker ? `: ${BLOCKERS.find((b) => b.id === p.blocker)?.label.toLowerCase()}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec" aria-label="Your accountability partner">
          <div className="note note-lilac reply fade-in" aria-live="polite">
            <span className="tape tape-blush" aria-hidden="true" />
            <div className="reply-who">
              <span className="reply-av" aria-hidden="true" />
              Your accountability partner
            </div>
            {reflecting ? (
              <span className="typing" role="status" aria-label="Reading your entry">
                <i />
                <i />
                <i />
              </span>
            ) : entry.reply ? (
              <>
                <p className="journal-text fade-in">{entry.reply}</p>
                {entry.replySource === "local" && (
                  <p className="hint">
                    {aiOn ? (
                      <>
                        The AI coach didn&rsquo;t respond, so this is a built-in reply.{" "}
                        <button className="btn btn-quiet" onClick={retryReply}>
                          Try the AI coach again
                        </button>
                      </>
                    ) : (
                      "This is a built-in reply. Connect an API key to get replies that respond to what you wrote."
                    )}
                  </p>
                )}
              </>
            ) : null}
          </div>
        </section>

        {isToday && (
          <section className="sec" aria-label="Tomorrow">
            {tomorrowEntry && tomorrowEntry.promises.length ? (
              <TomorrowSet entry={tomorrowEntry} />
            ) : planTomorrow ? (
              <PromiseForm
                aiOn={aiOn}
                heading={<h2 className="title-2">What three promises will you keep tomorrow?</h2>}
                submitLabel="Set tomorrow's promises"
                onCommit={(p) => {
                  createEntry(tomorrow, p);
                  setPlanTomorrow(false);
                }}
                onCancel={() => setPlanTomorrow(false)}
              />
            ) : (
              <div className="dash-box empty">
                <p className="headline">Want to set tomorrow&rsquo;s promises now?</p>
                <p className="soft body-sm">Optional. Deciding tonight makes the morning lighter.</p>
                <button className="btn btn-soft" onClick={() => setPlanTomorrow(true)}>
                  Set tomorrow&rsquo;s promises
                </button>
              </div>
            )}
          </section>
        )}

        <details className="card">
          <summary className="headline" style={{ cursor: "pointer" }}>
            Your entry
          </summary>
          <p className="journal-text" style={{ marginTop: 12 }}>
            {entry.journal}
          </p>
        </details>
      </>
    );
  }

  /* ---------------- Promises made, not checked in ---------------- */
  const sub = unlocked
    ? "Time to check in on today's promises."
    : open > 0
      ? `${WORDS[open] ?? open} still open. Tap a circle when you finish one.`
      : "All three marked. Your check-in opens at 6pm.";

  return (
    <>
      <TimeHero phase={shownPhase} name={state.name} tag={tag} sub={sub} />
      {back}
      <section className="sec" aria-label={isToday ? "Today's promises" : "Promises to check in on"}>
        <div className="sec-head">
          <h2 className="script-md">your promises</h2>
          {!unlocked && <p className="hint">Tap again to change it.</p>}
        </div>
        <ol className="pcards">
          {entry.promises.map((p, i) => (
            <li key={p.id} className={`pcard st-${p.status}`}>
              <div className="pcard-row">
                <Circle
                  status={p.status}
                  size={40}
                  onTap={() => setStatus(p, NEXT_STATUS[p.status])}
                  label={`${p.text}. ${STATUS_LABEL[p.status]}. Tap to change.`}
                />
                <div>
                  <p className="pcard-text">{p.text}</p>
                  <p className="pcard-meta">
                    {sizeLabel(p.size)}
                    {p.when ? `, ${p.when}` : ""}
                  </p>
                </div>
                <span className="pcard-state" aria-hidden="true">
                  {p.status === "pending" ? "" : STATUS_LABEL[p.status]}
                </span>
              </div>
              {unlocked && (
                <>
                  <div className="seg" role="group" aria-label={`Status of promise ${i + 1}`}>
                    {STATUSES.map((s) => (
                      <button key={s} type="button" data-s={s} aria-pressed={p.status === s} onClick={() => setStatus(p, s)}>
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  {(p.status === "partial" || p.status === "missed") && (
                    <div className="blockers fade-in">
                      <p className="label">What got in the way?</p>
                      <div className="chips">
                        {BLOCKERS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            className="chip"
                            aria-pressed={p.blocker === b.id}
                            onClick={() => updatePromise(p.id, { blocker: p.blocker === b.id ? undefined : (b.id as BlockerId) })}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      {!unlocked ? (
        <section className="card card-lg locked" aria-label="Evening check-in">
          <span className="moon">
            <Moon />
          </span>
          <div>
            <p className="headline">Your check-in opens at 6pm.</p>
            <p className="soft body-sm">
              Tap a circle whenever you finish a promise. In the evening you&rsquo;ll write about the day and hear from
              your partner.
            </p>
          </div>
        </section>
      ) : (
        <section className="sec" aria-label="Write about the day">
          <div className="sec-head">
            <h2 className="script-md">tonight</h2>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <label htmlFor="journal" className="title-2">
              Write about the day
            </label>
            <p className="hint">
              Not a report. Just what happened and what you told yourself. Your writing is what lets the patterns show up.
            </p>
            <div className="chips">
              {PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="chip chip-prompt"
                  onClick={() => setEntry(date, (e) => ({ ...e, journal: e.journal + (e.journal ? "\n\n" : "") + q + " " }))}
                >
                  {q}
                </button>
              ))}
            </div>
            <textarea
              id="journal"
              className="textarea"
              rows={7}
              value={entry.journal}
              placeholder="Start anywhere…"
              onChange={(e) => setEntry(date, (x) => ({ ...x, journal: e.target.value }))}
            />
            <div className="scales">
              {(["mood", "energy"] as const).map((k) => (
                <div key={k}>
                  <p className="label" id={`scale-${k}`}>
                    {k === "mood" ? "Mood" : "Energy"} <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                  </p>
                  <div className="dots" role="group" aria-labelledby={`scale-${k}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={entry[k] === n}
                        aria-label={`${n} out of 5`}
                        onClick={() => setEntry(date, (e) => ({ ...e, [k]: e[k] === n ? undefined : n }))}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-primary" disabled={!allMarked || !wroteEnough} onClick={finish}>
                Finish check-in
              </button>
              <p className="hint">
                {!allMarked
                  ? "Mark each promise first."
                  : !wroteEnough
                    ? "Write at least a sentence."
                    : "Once you finish, today's promises are locked."}
              </p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function TomorrowSet({ entry }: { entry: DayEntry }) {
  return (
    <div className="note note-peach" style={{ display: "grid", gap: 12 }}>
      <span className="tape tape-sand tape-left" aria-hidden="true" />
      <p className="tag" style={{ color: "var(--peach-700)" }}>
        Tomorrow
      </p>
      <p className="headline">Tomorrow&rsquo;s promises are set.</p>
      <ul className="mini-list">
        {entry.promises.map((p) => (
          <li key={p.id}>
            <Circle status="pending" size={22} />
            <p className="t">{p.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
