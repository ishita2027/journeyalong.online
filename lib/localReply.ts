import type { DayEntry } from "./types";
import { blockerLabel } from "./types";

/** Offline fallback when no API key is set or the AI call fails. */
export function localReply(entry: DayEntry, name: string): string {
  const n = entry.promises.length;
  const kept = entry.promises.filter((p) => p.status === "kept").length;
  const missed = entry.promises.filter((p) => p.status === "missed");
  const partial = entry.promises.filter((p) => p.status === "partial");
  const who = name ? `${name}, ` : "";

  if (kept === n) {
    return `${who}${n} for ${n}. Before you close this, add one line about what made today easy: the time of day, where you were, how big the promises were. That line is what you'll reuse on a harder day.`;
  }
  const slipped = [...missed, ...partial][0];
  const why = slipped?.blocker ? blockerLabel(slipped.blocker).toLowerCase() : "";
  if (kept >= 2) {
    return `${who}${kept} kept, and you were straight about "${slipped?.text}"${why ? ` (${why})` : ""}. That honesty is what self-trust is built from. Tomorrow, try making that one promise half the size and see what changes.`;
  }
  const reasons = [...new Set([...missed, ...partial].map((p) => blockerLabel(p.blocker)).filter(Boolean))];
  return `${who}today didn't go to plan, and you still told the truth about it. ${
    reasons.length ? `What got in the way: ${reasons.join(", ").toLowerCase()}. ` : ""
  }Tomorrow, choose promises you're nearly certain you'll keep. Small wins rebuild trust faster than big plans.`;
}
