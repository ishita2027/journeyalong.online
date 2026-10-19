"use client";
import { useState } from "react";
import { PromiseItem, SIZES, SharpenFeedback, Size } from "@/lib/types";
import { uid } from "@/lib/dates";
import { sharpenLocal } from "@/lib/localSharpen";
import { requestSharpen } from "@/lib/client";

type Draft = { text: string; size: Size; when: string };
const PLACEHOLDERS = [
  "e.g. Write 100 words of the report",
  "e.g. Walk for 10 minutes after lunch",
  "e.g. Reply to the pending client email",
];
const SIZE_HINT: Record<Size, string> = { tiny: "2 min", small: "15 min", stretch: "1 hr+" };

export default function PromiseForm({
  aiOn,
  heading,
  submitLabel = "Make these promises",
  onCommit,
  onCancel,
}: {
  aiOn: boolean;
  heading?: React.ReactNode;
  submitLabel?: string;
  onCommit: (p: PromiseItem[]) => void;
  onCancel?: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(
    Array.from({ length: 3 }, () => ({ text: "", size: "small" as Size, when: "" })),
  );
  const [fb, setFb] = useState<(SharpenFeedback | null)[]>([null, null, null]);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<"ai" | "local" | null>(null);

  const ready = drafts.every((d) => d.text.trim().length >= 4);
  const set = (i: number, patch: Partial<Draft>) => {
    setDrafts((cur) => cur.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    if (patch.text !== undefined || patch.size !== undefined) {
      setFb((cur) => cur.map((f, j) => (j === i ? null : f)));
      setChecked(null);
    }
  };

  async function check() {
    setBusy(true);
    let res: SharpenFeedback[] | null = null;
    if (aiOn) res = await requestSharpen(drafts);
    setChecked(res ? "ai" : "local");
    setFb(res ?? drafts.map((d) => sharpenLocal(d.text, d.size)));
    setBusy(false);
  }

  function commit() {
    onCommit(
      drafts.map((d) => ({ id: uid(), text: d.text.trim(), size: d.size, when: d.when.trim(), status: "pending" as const })),
    );
  }

  return (
    <div className="pform">
      {heading ?? <h2 className="title-2">What three promises will you keep today?</h2>}
      <p className="lede">
        Aim for promises you&rsquo;re about 90% sure you&rsquo;ll keep. On a hard day, make them tiny. Keeping a small
        promise builds more trust than breaking a big one.
      </p>
      <ol className="pcards">
        {drafts.map((d, i) => (
          <li key={i} className="card pform-item">
            <label className="label" htmlFor={`promise-${i}`}>
              Promise {i + 1}
            </label>
            <input
              id={`promise-${i}`}
              className="input input-promise"
              value={d.text}
              maxLength={140}
              placeholder={PLACEHOLDERS[i]}
              onChange={(e) => set(i, { text: e.target.value })}
            />
            <div className="pform-row">
              <div className="chips" role="group" aria-label={`Size of promise ${i + 1}`}>
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="chip chip-size"
                    aria-pressed={d.size === s.id}
                    onClick={() => set(i, { size: s.id })}
                  >
                    {s.label}
                    <small>{SIZE_HINT[s.id]}</small>
                  </button>
                ))}
              </div>
              <input
                className="input"
                aria-label={`When or where for promise ${i + 1} (optional)`}
                value={d.when}
                maxLength={60}
                placeholder="When or where (optional)"
                onChange={(e) => set(i, { when: e.target.value })}
              />
            </div>
            {fb[i] && (
              <div className={`fb fb-${fb[i]!.verdict}`} role="status">
                <p>{fb[i]!.note}</p>
                {fb[i]!.suggestion && (
                  <button type="button" className="btn btn-quiet" onClick={() => set(i, { text: fb[i]!.suggestion })}>
                    Use: &ldquo;{fb[i]!.suggestion}&rdquo;
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={commit}>
          {submitLabel}
        </button>
        <button type="button" className="btn btn-soft" disabled={!ready || busy} onClick={check}>
          {busy ? "Checking…" : "Check my promises"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Not now
          </button>
        )}
      </div>
      {!ready && <p className="hint">Write all three promises to continue.</p>}
      {checked === "local" && (
        <p className="hint">Quick checks ran offline{aiOn ? " because the AI coach didn't respond" : ""}.</p>
      )}
    </div>
  );
}
