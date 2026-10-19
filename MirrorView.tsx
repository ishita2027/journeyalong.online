"use client";
import { useMemo, useState } from "react";
import type { AppState, Mirror } from "@/lib/types";
import { addDays, formatShort, isSunday, parseKey } from "@/lib/dates";
import { computePatterns, isCheckedIn, trustAsOf } from "@/lib/stats";
import { localMirror } from "@/lib/localMirror";
import { requestMirror } from "@/lib/client";

function nextSunday(k: string) {
  const d = parseKey(k);
  const add = (7 - d.getDay()) % 7;
  return addDays(k, add);
}

export function MirrorCard({ mirror }: { mirror: Mirror }) {
  return (
    <article className="mirror fade-in" aria-label={`Mind Mirror for the week ending ${formatShort(mirror.endDate)}`}>
      <div>
        <p className="script-md" style={{ color: "var(--dawn)" }}>
          mind mirror
        </p>
        <p className="m-meta">
          Week ending {formatShort(mirror.endDate)}
          {mirror.source === "local" ? ", built from counts only" : ""}
        </p>
      </div>
      <h2 className="m-head">{mirror.headline}</h2>
      {mirror.trustNote && <p className="m-note">{mirror.trustNote}</p>}
      <div className="m-cols">
        <section className="m-pane">
          <h3>Why you show up</h3>
          <ul className="hearts">
            {mirror.whyYouShowUp.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
        <section className="m-pane">
          <h3>Where it slips</h3>
          <ul className="hearts">
            {mirror.whereItSlips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      </div>
      {mirror.patterns.length > 0 && (
        <section>
          <h3>Patterns worth noticing</h3>
          <dl className="m-patterns">
            {mirror.patterns.map((p, i) => (
              <div key={i}>
                <dt>{p.title}</dt>
                <dd>{p.evidence}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {mirror.storyYouTell && (
        <section>
          <h3>The story you tell yourself</h3>
          <p className="m-story">{mirror.storyYouTell}</p>
        </section>
      )}
      <section className="m-exp" style={{ position: "relative" }}>
        <span className="tape tape-lilac tape-left" aria-hidden="true" />
        <p className="tag">Try this next week</p>
        <b>{mirror.experiment.title}</b>
        <p>{mirror.experiment.how}</p>
        <p>{mirror.experiment.why}</p>
      </section>
    </article>
  );
}

export default function MirrorView({
  state,
  today,
  aiOn,
  onSave,
  onLoadDemo,
}: {
  state: AppState;
  today: string;
  aiOn: boolean;
  onSave: (m: Mirror) => void;
  onLoadDemo: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const week = useMemo(() => computePatterns(state.entries, today, 7), [state.entries, today]);
  const long = useMemo(() => computePatterns(state.entries, today, 28), [state.entries, today]);
  const keys = Object.keys(state.mirrors).sort().reverse();
  const shownKey = viewing && state.mirrors[viewing] ? viewing : keys[0];
  const mirror = shownKey ? state.mirrors[shownKey] : null;
  const ready = week.daysCheckedIn >= 3;
  const sunday = isSunday(today);
  const haveThisWeek = !!state.mirrors[today];

  async function generate() {
    setBusy(true);
    const days = Array.from({ length: 7 }, (_, i) => state.entries[addDays(today, -(6 - i))]).filter(isCheckedIn);
    let m: Mirror | null = null;
    if (aiOn) {
      m = await requestMirror({
        name: state.name,
        endDate: today,
        days,
        week,
        long,
        trustNow: trustAsOf(state.entries, today),
        trustBefore: trustAsOf(state.entries, addDays(today, -7)),
      });
    }
    onSave(m ?? localMirror(state, today));
    setViewing(today);
    setBusy(false);
  }

  return (
    <>
      <header className="page-head">
        <h1 className="script-md">mind mirror</h1>
        <p className="lede">A weekly reading of why you follow through, and why you don&rsquo;t.</p>
      </header>

      {!ready ? (
        <section className="dash-box empty" aria-label="Not ready yet">
          <p className="headline">{week.daysCheckedIn} of 3 check-ins so far this week.</p>
          <p className="soft">
            The Mirror needs three days of check-ins in the last seven to say anything true. Keep going, or explore it
            now with two weeks of sample entries.
          </p>
          <button className="btn btn-soft" onClick={onLoadDemo}>
            Load sample entries
          </button>
        </section>
      ) : (
        <section className={`card card-lg ready ${sunday && !haveThisWeek ? "sunday" : ""}`} aria-label="This week's reading">
          {sunday && !haveThisWeek ? (
            <>
              <p className="headline">Your Mind Mirror is ready.</p>
              <p className="soft body-sm">It&rsquo;s Sunday. Read your week while it&rsquo;s fresh.</p>
              <button className="btn btn-primary btn-glow" onClick={generate} disabled={busy}>
                {busy ? "Reading your week…" : "Read this week's Mirror"}
              </button>
            </>
          ) : (
            <>
              <p className="headline">
                {haveThisWeek ? "This week's Mirror is below." : `Your next Mirror lights up on ${formatShort(nextSunday(today))}.`}
              </p>
              <p className="soft body-sm">
                {haveThisWeek
                  ? "You can read it again with anything you add today."
                  : "You have enough check-ins to read it early if you'd like."}
              </p>
              <button className="btn btn-soft" onClick={generate} disabled={busy}>
                {busy ? "Reading your week…" : haveThisWeek ? "Read it again" : "Read an early Mirror"}
              </button>
            </>
          )}
          {!aiOn && <p className="hint">Offline mode: counts only. Connect an API key and the Mirror reads your writing too.</p>}
        </section>
      )}

      {mirror && <MirrorCard key={mirror.endDate + mirror.generatedAt} mirror={mirror} />}

      {keys.length > 1 && (
        <section className="sec" aria-label="Past weeks">
          <h2 className="script-md">past weeks</h2>
          <div className="past">
            {keys.map((k) => (
              <button key={k} aria-pressed={k === shownKey} onClick={() => setViewing(k)}>
                <span className="caption muted">Week ending {formatShort(k)}</span>
                <span className="h">{state.mirrors[k].headline}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {week.daysCheckedIn > 0 && (
        <section className="card card-lg" style={{ display: "grid", gap: 14 }} aria-label="The numbers behind it">
          <h2 className="headline">The numbers behind it</h2>
          <p className="hint">Follow-through by weekday over the last four weeks (kept = 100%, partly = 50%).</p>
          <div className="weekbars">
            {long.byWeekday.map((d) => (
              <div key={d.label} className="wb">
                <span className="wb-p">{d.rate == null ? "" : `${Math.round(d.rate * 100)}%`}</span>
                <span className="wb-bar" aria-hidden="true">
                  <span style={{ height: `${Math.round((d.rate ?? 0) * 100)}%` }} />
                </span>
                <span className="wb-l">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="two-col" style={{ gap: 20 }}>
            <div>
              <p className="label">By promise size</p>
              <ul className="plain">
                {long.bySize
                  .filter((s) => s.n > 0)
                  .map((s) => (
                    <li key={s.size}>
                      <span>{s.size[0].toUpperCase() + s.size.slice(1)}</span>
                      <span className="num soft">
                        {Math.round((s.rate ?? 0) * 100)}% of {s.n}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="label">What gets in the way</p>
              {long.blockers.length === 0 ? (
                <p className="hint">Nothing tagged yet.</p>
              ) : (
                <ul className="plain">
                  {long.blockers.slice(0, 5).map((b) => (
                    <li key={b.id}>
                      <span>{b.label}</span>
                      <span className="num soft">{b.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
