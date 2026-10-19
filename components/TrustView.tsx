"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState } from "@/lib/types";
import { addDays, dayKeyAt, formatShort, parseKey } from "@/lib/dates";
import { lifetime, trustAsOf, trustSeries, whatMoved } from "@/lib/stats";
import { prefersReducedMotion, useCountUp } from "@/lib/hooks";

const RANGES = [7, 15, 30, 60, 90];

function TrustChart({ series }: { series: { date: string; score: number | null }[] }) {
  const W = 600, H = 190, L = 34, R = 14, T = 14, B = 26;
  const n = series.length;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (s: number) => T + (1 - s / 100) * (H - T - B);
  const pts = series.map((p, i) => (p.score == null ? null : { x: x(i), y: y(p.score) }));
  let d = "";
  let pen = false;
  let first: { x: number } | null = null;
  let last: { x: number; y: number } | null = null;
  pts.forEach((p) => {
    if (!p) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    if (!first) first = p;
    pen = true;
    last = p;
  });
  const area = d && first && last ? `${d}L${(last as { x: number }).x} ${H - B} L${(first as { x: number }).x} ${H - B} Z` : "";
  const lineRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    const el = lineRef.current;
    if (!el || prefersReducedMotion()) return;
    const len = el.getTotalLength?.() ?? 0;
    if (!len) return;
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)";
        el.style.strokeDashoffset = "0";
      }),
    );
  }, [d]);
  const labelIdx = [0, Math.floor((n - 1) / 2), n - 1];
  const scored = series.filter((p) => p.score != null);
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={
        scored.length
          ? `Self-trust over the last ${n} days, from ${scored[0].score} to ${scored[scored.length - 1].score}`
          : "Not enough check-ins for a chart yet"
      }
    >
      <defs>
        <linearGradient id="trustfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b9aecf" stopOpacity=".45" />
          <stop offset="1" stopColor="#b9aecf" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line className="chart-grid" x1={L} x2={W - R} y1={y(g)} y2={y(g)} />
          <text className="chart-label" x={L - 8} y={y(g) + 4} textAnchor="end">
            {g}
          </text>
        </g>
      ))}
      {labelIdx.map((i) => (
        <text key={i} className="chart-label" x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
          {formatShort(series[i].date).replace(/^\w+,?\s*/, "")}
        </text>
      ))}
      {area && <path className="chart-area" d={area} />}
      {d && <path ref={lineRef} className="chart-line" d={d} />}
      {last && (
        <>
          <circle className="chart-halo" cx={(last as { x: number }).x} cy={(last as { y: number }).y} r={10} />
          <circle className="chart-dot" cx={(last as { x: number }).x} cy={(last as { y: number }).y} r={5} />
        </>
      )}
    </svg>
  );
}

export default function TrustView({ state, today }: { state: AppState; today: string }) {
  const [range, setRange] = useState(30);
  const trust = trustAsOf(state.entries, today);
  const before = trustAsOf(state.entries, addDays(today, -7));
  const shown = useCountUp(trust, before);
  const series = useMemo(() => trustSeries(state.entries, today, range), [state.entries, today, range]);
  const moved = useMemo(() => whatMoved(state.entries, today, dayKeyAt, 7), [state.entries, today]);
  const life = useMemo(() => lifetime(state.entries), [state.entries]);
  const delta = trust != null && before != null ? trust - before : null;

  return (
    <>
      <header className="page-head">
        <h1 className="script-md">self-trust</h1>
        <p className="lede">How much your word to yourself has held up lately.</p>
      </header>

      <div className="two-col">
        <section className="card card-lg" style={{ display: "grid", gap: 16 }} aria-label="Self-trust score">
          <div className="trust-top">
            <div>
              <p className="headline">Self-trust</p>
              <p>
                <span className="score" aria-label={trust == null ? "Not calculated yet" : `${trust} out of 100`}>
                  {shown ?? "–"}
                </span>
                {trust != null && <span className="score-of">/ 100</span>}
              </p>
            </div>
            {delta != null && delta !== 0 && (
              <span className={`delta ${delta > 0 ? "delta-up" : "delta-down"}`}>
                {delta > 0 ? `↑ ${delta} from last week` : `Down ${-delta} from last week`}
              </span>
            )}
          </div>
          <div className="chips" role="group" aria-label="Range">
            {RANGES.map((r) => (
              <button key={r} className="chip chip-range" aria-pressed={range === r} onClick={() => setRange(r)}>
                {r} days
              </button>
            ))}
          </div>
          {trust == null ? (
            <p className="soft">Check in on two days and your score appears.</p>
          ) : (
            <TrustChart series={series} />
          )}
          <p className="soft body-sm">It moves with evidence and never resets to zero.</p>
        </section>

        <section className="card card-lg" aria-label="What moved it">
          <h2 className="headline">What moved it this week</h2>
          <p className="soft body-sm" style={{ margin: "4px 0 12px" }}>
            {moved.summary}
          </p>
          {moved.rows.length > 0 && (
            <ul className="moved">
              {moved.rows.map((r) => (
                <li key={r.date}>
                  <span className="d">{parseKey(r.date).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="r">{r.reason}</span>
                  <span className={`chg ${r.kind === "start" || r.delta > 0 ? "chg-up" : r.delta < 0 ? "chg-down" : "chg-zero"}`}>
                    {r.kind === "start" ? "New" : r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `−${-r.delta}` : "0"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ul className="ledger" aria-label="All time">
        <li>
          <span className="n num">{life.kept}</span>
          <span>promises kept</span>
        </li>
        <li>
          <span className="n num">{life.partial}</span>
          <span>partly kept</span>
        </li>
        <li>
          <span className="n num">{life.days}</span>
          <span>honest check-ins</span>
        </li>
      </ul>

      <section className="dash-box" aria-label="How the score works">
        <h2 className="headline" style={{ marginBottom: 6 }}>
          How the score works
        </h2>
        <p className="soft body-sm" style={{ maxWidth: "62ch" }}>
          It blends how many promises you kept (75%) with whether you checked in honestly (25%), weighted toward recent
          days. A missed day dents it. It never resets, so a rough week is a dip, not a zero.
        </p>
      </section>
    </>
  );
}
