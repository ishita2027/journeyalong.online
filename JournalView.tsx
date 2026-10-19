"use client";
import { useMemo, useState } from "react";
import type { AppState, DayEntry } from "@/lib/types";
import { blockerLabel } from "@/lib/types";
import { addDays, dayNum, formatShort, parseKey, weekdayIndex, WEEKDAYS, WEEKDAYS_LONG } from "@/lib/dates";
import { isCheckedIn } from "@/lib/stats";
import { Circle, STATUS_LABEL } from "./Circle";
import { Chevron } from "./Icons";

const WORDS = ["no", "one", "two", "three"];

function Marks({ e, past }: { e?: DayEntry; past: boolean }) {
  if (!e || e.promises.length === 0) return <span className="marks">{past && <i className="mk-rest" />}</span>;
  return (
    <span className="marks">
      {e.promises.map((p) => (
        <i key={p.id} className={`mk-${isCheckedIn(e) || p.status !== "pending" ? p.status : "pending"}`} />
      ))}
    </span>
  );
}

function dayLabel(k: string, e?: DayEntry) {
  const d = parseKey(k);
  const name = `${WEEKDAYS_LONG[weekdayIndex(k)]} ${d.getDate()}`;
  if (!e || e.promises.length === 0) return `${name}, rest day`;
  if (!isCheckedIn(e)) return `${name}, not checked in yet`;
  const c = (s: string) => e.promises.filter((p) => p.status === s).length;
  const bits = [];
  if (c("kept")) bits.push(`${WORDS[c("kept")]} kept`);
  if (c("partial")) bits.push(`${WORDS[c("partial")]} partly`);
  if (c("missed")) bits.push(`${WORDS[c("missed")]} didn't happen`);
  return `${name}, ${bits.join(", ")}`;
}

export default function JournalView({ state, today, onToday }: { state: AppState; today: string; onToday: () => void }) {
  const thisMonday = addDays(today, -weekdayIndex(today));
  const [monday, setMonday] = useState(thisMonday);
  const [selected, setSelected] = useState<string | null>(null);
  const entries = useMemo(
    () =>
      Object.values(state.entries)
        .filter((e) => e.promises.length > 0 && e.date <= today)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [state.entries, today],
  );
  const earliest = entries.length ? entries[entries.length - 1].date : today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  function pick(k: string) {
    setSelected(k);
    requestAnimationFrame(() => {
      const el = document.getElementById(`entry-${k}`);
      if (el) {
        (el as HTMLDetailsElement).open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  return (
    <>
      <header className="page-head">
        <h1 className="script-md">journal</h1>
        <p className="lede">Every promise you made, and what you wrote about it.</p>
      </header>

      <section className="strip-wrap" aria-label="Week">
        <div className="strip-nav">
          <button
            className="icon-btn"
            aria-label="Previous week"
            disabled={monday <= earliest}
            onClick={() => setMonday(addDays(monday, -7))}
          >
            <Chevron dir="left" />
          </button>
          <p className="caption soft">
            {formatShort(days[0]).replace(/^\w+,?\s*/, "")} to {formatShort(days[6]).replace(/^\w+,?\s*/, "")}
          </p>
          <button
            className="icon-btn"
            aria-label="Next week"
            disabled={monday >= thisMonday}
            onClick={() => setMonday(addDays(monday, 7))}
          >
            <Chevron dir="right" />
          </button>
        </div>
        <div className="strip" role="group" aria-label="Days this week">
          {days.map((k, i) => {
            const e = state.entries[k];
            const future = k > today;
            return (
              <button
                key={k}
                disabled={future || !e || e.promises.length === 0}
                aria-pressed={selected === k}
                aria-label={dayLabel(k, e)}
                onClick={() => pick(k)}
              >
                <span className="wd">{WEEKDAYS[i]}</span>
                <span className="n num">{dayNum(k)}</span>
                <Marks e={e} past={!future} />
              </button>
            );
          })}
        </div>
      </section>

      {entries.length === 0 ? (
        <section className="dash-box empty">
          <p className="headline">Your entries collect here.</p>
          <p className="soft">Make today&rsquo;s promises and check in tonight to write the first one.</p>
          <button className="btn btn-primary" onClick={onToday}>
            Go to today
          </button>
        </section>
      ) : (
        <ul className="entries">
          {entries.map((e) => (
            <li key={e.date}>
              <details id={`entry-${e.date}`} className={`entry ${selected === e.date ? "hl" : ""}`}>
                <summary>
                  <span className="e-date">
                    {formatShort(e.date)}
                    {e.demo ? <span className="muted caption"> (sample)</span> : null}
                  </span>
                  <span className="e-marks" aria-label={e.promises.map((p) => STATUS_LABEL[p.status]).join(", ")}>
                    {e.promises.map((p) => (
                      <Circle key={p.id} status={p.status} size={20} />
                    ))}
                  </span>
                  <span className="e-snip">
                    {isCheckedIn(e) ? e.journal.replace(/\s+/g, " ").slice(0, 120) : "Not checked in"}
                  </span>
                </summary>
                <div className="e-body">
                  <ul className="mini-list">
                    {e.promises.map((p) => (
                      <li key={p.id}>
                        <Circle status={p.status} size={24} />
                        <div>
                          <p className="t">{p.text}</p>
                          <p className="s">
                            {STATUS_LABEL[p.status]}
                            {p.blocker ? `: ${blockerLabel(p.blocker).toLowerCase()}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {e.journal && <p className="journal-text">{e.journal}</p>}
                  {e.reply && (
                    <div className="note note-lilac reply" style={{ marginTop: 8 }}>
                      <span className="tape tape-blush" aria-hidden="true" />
                      <div className="reply-who">
                        <span className="reply-av" aria-hidden="true" />
                        Your accountability partner
                      </div>
                      <p className="journal-text" style={{ fontSize: 17, lineHeight: "28px" }}>
                        {e.reply}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
