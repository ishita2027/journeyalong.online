import type { BlockerId, DayEntry, Size, Status } from "./types";
import { BLOCKERS } from "./types";
import { addDays, weekdayIndex, WEEKDAYS } from "./dates";

type Entries = Record<string, DayEntry>;

export const STATUS_VALUE: Record<Status, number> = {
  kept: 1,
  partial: 0.5,
  missed: 0,
  pending: 0,
};

export function isCheckedIn(e?: DayEntry): e is DayEntry {
  return !!e && !!e.checkedInAt && e.promises.length > 0;
}

export function dayScore(e?: DayEntry): number | null {
  if (!isCheckedIn(e)) return null;
  const sum = e.promises.reduce((a, p) => a + STATUS_VALUE[p.status], 0);
  return sum / e.promises.length;
}

/**
 * Self-trust score (0-100), as of a given day.
 *
 * - 75%: recency-weighted follow-through (kept = 1, partly = 0.5, missed = 0)
 * - 25%: recency-weighted honesty of reporting (did you check in on days you
 *   made promises?)
 *
 * It looks back 14 days with a 0.9 decay per day, so one bad day dents the
 * score but never resets it. Days with no promises (rest days) are ignored.
 */
export function trustAsOf(entries: Entries, asOf: string, window = 14): number | null {
  let keepNum = 0,
    keepDen = 0,
    repNum = 0,
    repDen = 0,
    checked = 0;
  for (let age = 0; age < window; age++) {
    const date = addDays(asOf, -age);
    const e = entries[date];
    if (!e || e.promises.length === 0) continue;
    const w = Math.pow(0.9, age);
    const ci = isCheckedIn(e);
    if (ci) {
      keepNum += w * (dayScore(e) as number);
      keepDen += w;
      checked++;
    }
    if (ci || date < asOf) {
      repDen += w;
      if (ci) repNum += w;
    }
  }
  if (checked < 2) return null;
  const keep = keepNum / keepDen;
  const report = repDen ? repNum / repDen : 1;
  return Math.round(100 * (0.75 * keep + 0.25 * report));
}

export function trustSeries(entries: Entries, end: string, n = 30) {
  const out: { date: string; score: number | null }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    out.push({ date, score: trustAsOf(entries, date) });
  }
  return out;
}

export function lifetime(entries: Entries) {
  let kept = 0,
    partial = 0,
    missed = 0,
    days = 0;
  for (const e of Object.values(entries)) {
    if (!isCheckedIn(e)) continue;
    days++;
    for (const p of e.promises) {
      if (p.status === "kept") kept++;
      else if (p.status === "partial") partial++;
      else if (p.status === "missed") missed++;
    }
  }
  return { kept, partial, missed, days };
}

export interface Patterns {
  from: string;
  to: string;
  daysPlanned: number;
  daysCheckedIn: number;
  total: number;
  kept: number;
  partial: number;
  missed: number;
  keepRate: number | null;
  byWeekday: { label: string; rate: number | null; n: number }[];
  bySize: { size: Size; rate: number | null; n: number }[];
  bySlot: { slot: number; rate: number | null; n: number }[];
  blockers: { id: BlockerId; label: string; count: number }[];
  moodGood: number | null;
  moodRough: number | null;
  energyGood: number | null;
  energyRough: number | null;
  withWhen: { rate: number | null; n: number };
  withoutWhen: { rate: number | null; n: number };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const rate = (sum: number, n: number) => (n ? sum / n : null);

export function computePatterns(entries: Entries, to: string, days: number): Patterns {
  const from = addDays(to, -(days - 1));
  let daysPlanned = 0,
    daysCheckedIn = 0,
    total = 0,
    kept = 0,
    partial = 0,
    missed = 0;
  const wd = Array.from({ length: 7 }, () => ({ s: 0, n: 0 }));
  const sz: Record<Size, { s: number; n: number }> = {
    tiny: { s: 0, n: 0 },
    small: { s: 0, n: 0 },
    stretch: { s: 0, n: 0 },
  };
  const slot = Array.from({ length: 3 }, () => ({ s: 0, n: 0 }));
  const bl: Partial<Record<BlockerId, number>> = {};
  const good = { mood: [] as number[], energy: [] as number[] };
  const rough = { mood: [] as number[], energy: [] as number[] };
  const w = { s: 0, n: 0 },
    wo = { s: 0, n: 0 };

  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const e = entries[date];
    if (!e || e.promises.length === 0) continue;
    daysPlanned++;
    if (!isCheckedIn(e)) continue;
    daysCheckedIn++;
    const ds = dayScore(e) as number;
    if (e.mood) (ds >= 0.67 ? good : ds <= 0.34 ? rough : { mood: [], energy: [] }).mood.push(e.mood);
    if (e.energy) (ds >= 0.67 ? good : ds <= 0.34 ? rough : { mood: [], energy: [] }).energy.push(e.energy);
    e.promises.forEach((p, idx) => {
      const v = STATUS_VALUE[p.status];
      total++;
      if (p.status === "kept") kept++;
      else if (p.status === "partial") partial++;
      else if (p.status === "missed") missed++;
      const wi = weekdayIndex(date);
      wd[wi].s += v;
      wd[wi].n++;
      sz[p.size].s += v;
      sz[p.size].n++;
      if (idx < 3) {
        slot[idx].s += v;
        slot[idx].n++;
      }
      if (p.when.trim()) {
        w.s += v;
        w.n++;
      } else {
        wo.s += v;
        wo.n++;
      }
      if ((p.status === "missed" || p.status === "partial") && p.blocker) {
        bl[p.blocker] = (bl[p.blocker] || 0) + 1;
      }
    });
  }

  return {
    from,
    to,
    daysPlanned,
    daysCheckedIn,
    total,
    kept,
    partial,
    missed,
    keepRate: total ? (kept + partial * 0.5) / total : null,
    byWeekday: wd.map((x, i) => ({ label: WEEKDAYS[i], rate: rate(x.s, x.n), n: x.n })),
    bySize: (Object.keys(sz) as Size[]).map((k) => ({ size: k, rate: rate(sz[k].s, sz[k].n), n: sz[k].n })),
    bySlot: slot.map((x, i) => ({ slot: i + 1, rate: rate(x.s, x.n), n: x.n })),
    blockers: (Object.entries(bl) as [BlockerId, number][])
      .map(([id, count]) => ({ id, count, label: BLOCKERS.find((b) => b.id === id)?.label ?? id }))
      .sort((a, b) => b.count - a.count),
    moodGood: avg(good.mood),
    moodRough: avg(rough.mood),
    energyGood: avg(good.energy),
    energyRough: avg(rough.energy),
    withWhen: { rate: rate(w.s, w.n), n: w.n },
    withoutWhen: { rate: rate(wo.s, wo.n), n: wo.n },
  };
}

/* ------------------------------------------------------------------ */
/* What moved the score                                                */
/* ------------------------------------------------------------------ */

const WORD = ["None", "One", "Two", "Three"];

export interface MovedRow {
  date: string;
  delta: number;
  reason: string;
  kind: "kept" | "honest" | "slipped" | "unreported" | "rest" | "start";
}

function reasonFor(e: DayEntry | undefined, date: string, today: string, lateOf: (e: DayEntry) => boolean) {
  if (!e || e.promises.length === 0) {
    return { reason: "A rest day, so older days counted a little less", kind: "rest" as const };
  }
  if (!isCheckedIn(e)) {
    return date < today
      ? { reason: "Promises weren't checked in", kind: "unreported" as const }
      : null;
  }
  const n = e.promises.length;
  const k = e.promises.filter((p) => p.status === "kept").length;
  const pt = e.promises.filter((p) => p.status === "partial").length;
  const m = e.promises.filter((p) => p.status === "missed").length;
  const late = lateOf(e) ? " (late check-in)" : "";
  if (k === n) {
    const stretch = e.promises.some((p) => p.size === "stretch");
    return { reason: `Kept all ${WORD[n]?.toLowerCase() ?? n}${stretch ? ", including a stretch promise" : ""}${late}`, kind: "kept" as const };
  }
  if (k + pt === 0) return { reason: `Checked in honestly on a hard day${late}`, kind: "honest" as const };
  const bits: string[] = [];
  if (k) bits.push(`kept ${WORD[k]?.toLowerCase() ?? k}`);
  if (pt) bits.push(`partly kept ${WORD[pt]?.toLowerCase() ?? pt}`);
  if (m) bits.push(`${WORD[m]?.toLowerCase() ?? m} didn't happen`);
  const s = bits.join(", ");
  return { reason: s[0].toUpperCase() + s.slice(1) + late, kind: m ? ("slipped" as const) : ("kept" as const) };
}

export function whatMoved(
  entries: Record<string, DayEntry>,
  end: string,
  dayKeyOf: (d: Date) => string,
  days = 7,
): { rows: MovedRow[]; total: number; summary: string } {
  const rows: MovedRow[] = [];
  const lateOf = (e: DayEntry) => !!e.checkedInAt && dayKeyOf(new Date(e.checkedInAt)) > e.date;
  for (let i = 0; i < days; i++) {
    const date = addDays(end, -i);
    const cur = trustAsOf(entries, date);
    const prev = trustAsOf(entries, addDays(date, -1));
    if (cur == null) continue;
    if (prev == null) {
      rows.push({ date, delta: 0, reason: "Your score appeared after your second check-in", kind: "start" });
      continue;
    }
    const delta = cur - prev;
    const r = reasonFor(entries[date], date, end, lateOf);
    if (!r) continue;
    if (delta === 0 && r.kind === "rest") continue;
    rows.push({ date, delta, ...r });
  }
  const total = rows.reduce((a, r) => a + r.delta, 0);
  let summary = "Not enough check-ins yet to say what moved it.";
  if (rows.length) {
    if (total > 0) {
      const keptDays = rows.filter((r) => r.kind === "kept" && r.delta > 0).length;
      const honest = rows.filter((r) => r.kind === "honest" && r.delta >= 0).length;
      summary = `Up ${total} this week, mostly from ${keptDays >= honest ? "promises you kept" : "honest check-ins"}.`;
    } else if (total < 0) {
      summary = `Down ${-total} this week. A dip, not a reset.`;
    } else {
      summary = "Steady this week.";
    }
  }
  return { rows, total, summary };
}
