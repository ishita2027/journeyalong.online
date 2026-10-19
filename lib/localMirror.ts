import type { AppState, BlockerId, Mirror } from "./types";
import { computePatterns, trustAsOf } from "./stats";
import { addDays, WEEKDAYS_LONG } from "./dates";

const EXPERIMENTS: Record<BlockerId | "default", { title: string; how: string; why: string }> = {
  tired: {
    title: "Do promise one before noon",
    how: "For seven days, schedule your most important promise for the first half of the day.",
    why: "Tiredness was your most common blocker, so give the important promise your best hours.",
  },
  distracted: {
    title: "Fifteen minutes with your phone in another room",
    how: "Before each promise, put your phone out of reach and set a 15-minute timer.",
    why: "Distraction kept showing up as the reason. Removing the easiest escape route helps more than willpower.",
  },
  avoidance: {
    title: "Shrink the promise you avoid to two minutes",
    how: "Pick the promise you keep dodging and rewrite it so it takes two minutes. Then do only that.",
    why: "Avoidance usually means the start feels heavy. A tiny start lowers the cost of beginning.",
  },
  unclear: {
    title: "Write the first physical action",
    how: "For each promise, write the first thing you'll touch or open, such as 'open the doc and type the heading'.",
    why: "Unclear promises are easy to postpone. A concrete first action removes the decision.",
  },
  "too-big": {
    title: "No stretch promises for a week",
    how: "Make all three promises tiny or small for seven days.",
    why: "Promises that were too big kept breaking. A week of kept promises rebuilds the evidence.",
  },
  "low-mood": {
    title: "Make one promise a floor promise",
    how: "Each morning, make one promise so small you'd keep it even on your worst day.",
    why: "Low mood days are when trust drops fastest. A floor promise keeps the thread.",
  },
  external: {
    title: "Leave room for interruptions",
    how: "Keep one of the three promises flexible: 'any 15 minutes today' instead of a fixed time.",
    why: "Things come up. A flexible promise survives a busy day.",
  },
  forgot: {
    title: "Attach each promise to something you already do",
    how: "Tie each promise to an existing routine: after your morning tea, after lunch, before you shut the laptop.",
    why: "Forgetting means the promise has no anchor. Routines make good anchors.",
  },
  default: {
    title: "Give every promise a when and where",
    how: "Write a time or place next to each promise before you commit.",
    why: "Promises with a stated time and place are easier to start.",
  },
};

const pct = (r: number | null) => (r == null ? "" : `${Math.round(r * 100)}%`);

/** Offline Mind Mirror built only from counts. It can't read the journal text. */
export function localMirror(state: AppState, endDate: string): Mirror {
  const week = computePatterns(state.entries, endDate, 7);
  const long = computePatterns(state.entries, endDate, 28);
  const trustNow = trustAsOf(state.entries, endDate);
  const trustBefore = trustAsOf(state.entries, addDays(endDate, -7));

  const kr = week.keepRate ?? 0;
  const headline =
    week.total === 0
      ? "Not enough check-ins yet to reflect on."
      : kr >= 0.75
      ? "You did what you said you would this week."
      : kr >= 0.5
        ? "You kept about half, and the misses have a shape."
        : "A hard week, and it left clear clues.";

  let trustNote = "Not enough history to show a trend yet.";
  if (trustNow != null) {
    trustNote =
      trustBefore != null && trustNow !== trustBefore
        ? `Your self-trust is ${trustNow}, ${trustNow > trustBefore ? "up" : "down"} ${Math.abs(trustNow - trustBefore)} from last week.`
        : `Your self-trust is ${trustNow}.`;
    trustNote += ` This week you kept ${week.kept} of ${week.total} promises and were honest about the rest.`;
  }

  const show: string[] = [];
  const slip: string[] = [];
  const patterns: { title: string; evidence: string }[] = [];

  const wdRated = long.byWeekday.filter((d) => d.rate != null && d.n >= 2);
  if (wdRated.length >= 2) {
    const best = [...wdRated].sort((a, b) => (b.rate as number) - (a.rate as number))[0];
    const worst = [...wdRated].sort((a, b) => (a.rate as number) - (b.rate as number))[0];
    if (best.label !== worst.label && (best.rate as number) - (worst.rate as number) >= 0.2) {
      show.push(`You follow through best on ${WEEKDAYS_LONG[["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(best.label)]}s (${pct(best.rate)}).`);
      slip.push(`${WEEKDAYS_LONG[["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(worst.label)]}s are your hardest day (${pct(worst.rate)} kept).`);
      patterns.push({
        title: "Your week has a rhythm",
        evidence: `Over the last four weeks: ${best.label} ${pct(best.rate)}, ${worst.label} ${pct(worst.rate)}.`,
      });
    }
  }

  const sized = long.bySize.filter((s) => s.rate != null && s.n >= 3);
  const tiny = sized.find((s) => s.size === "tiny");
  const stretch = sized.find((s) => s.size === "stretch");
  if (tiny && stretch && (tiny.rate as number) - (stretch.rate as number) >= 0.2) {
    show.push(`Tiny promises are kept ${pct(tiny.rate)} of the time.`);
    slip.push(`Stretch promises are kept only ${pct(stretch.rate)} of the time.`);
    patterns.push({
      title: "Size predicts follow-through",
      evidence: `Tiny: ${pct(tiny.rate)} across ${tiny.n} promises. Stretch: ${pct(stretch.rate)} across ${stretch.n}.`,
    });
  }

  const { withWhen, withoutWhen } = long;
  if (withWhen.rate != null && withoutWhen.rate != null && withWhen.n >= 3 && withoutWhen.n >= 3 && withWhen.rate - withoutWhen.rate >= 0.15) {
    show.push(`Promises with a time or place were kept ${pct(withWhen.rate)}, versus ${pct(withoutWhen.rate)} without.`);
    patterns.push({
      title: "A when and where helps",
      evidence: `${withWhen.n} promises with a plan, ${withoutWhen.n} without.`,
    });
  }

  const slots = long.bySlot.filter((s) => s.rate != null && s.n >= 3);
  if (slots.length === 3) {
    const worstSlot = [...slots].sort((a, b) => (a.rate as number) - (b.rate as number))[0];
    const bestSlot = [...slots].sort((a, b) => (b.rate as number) - (a.rate as number))[0];
    if ((bestSlot.rate as number) - (worstSlot.rate as number) >= 0.25) {
      slip.push(`Your promise number ${worstSlot.slot} is where things slip (${pct(worstSlot.rate)}).`);
    }
  }

  const top = long.blockers[0];
  if (top && top.count >= 2) {
    slip.push(`The most common blocker was "${top.label.toLowerCase()}" (${top.count} times).`);
    patterns.push({
      title: `"${top.label}" keeps coming up`,
      evidence: long.blockers
        .slice(0, 3)
        .map((b) => `${b.label.toLowerCase()} ×${b.count}`)
        .join(", ") + " over the last four weeks.",
    });
  }

  if (long.moodGood != null && long.moodRough != null && long.moodGood - long.moodRough >= 0.8) {
    patterns.push({
      title: "Mood and follow-through move together",
      evidence: `Average mood was ${long.moodGood.toFixed(1)}/5 on strong days and ${long.moodRough.toFixed(1)}/5 on rough ones.`,
    });
  }

  if (!show.length) show.push(`You checked in on ${week.daysCheckedIn} of the last 7 days. Showing up to report is itself a pattern.`);
  if (!slip.length) slip.push("No single blocker stands out yet. Keep tagging what gets in the way.");
  if (!patterns.length) patterns.push({ title: "Still early", evidence: "There isn't enough data to say what drives your follow-through. Two more weeks will sharpen this." });

  return {
    endDate,
    generatedAt: new Date().toISOString(),
    source: "local",
    headline,
    trustNote,
    whyYouShowUp: show.slice(0, 3),
    whereItSlips: slip.slice(0, 3),
    patterns: patterns.slice(0, 4),
    storyYouTell:
      "The offline Mirror can count, but it can't read your writing. Re-read your last three entries and underline any sentence that starts with 'I should', 'I always' or 'I'll do it once'. That's usually the story.",
    experiment: EXPERIMENTS[top && top.count >= 2 ? top.id : "default"],
  };
}
