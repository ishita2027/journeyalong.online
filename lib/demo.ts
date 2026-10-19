import type { BlockerId, DayEntry, PromiseItem, Size, Status } from "./types";
import { addDays, uid, weekdayIndex } from "./dates";
import { localReply } from "./localReply";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tpl = { text: string; size: Size; when: string };
const SETS: Tpl[][] = [
  [
    { text: "Write 150 words of the project brief", size: "small", when: "at my desk, before 11am" },
    { text: "Walk for 10 minutes", size: "tiny", when: "after lunch" },
    { text: "Clear the inbox down to 10 emails", size: "stretch", when: "" },
  ],
  [
    { text: "Open the report and write the first heading", size: "tiny", when: "right after tea" },
    { text: "Revise one section of my CV", size: "small", when: "" },
    { text: "Finish the whole slide deck", size: "stretch", when: "" },
  ],
  [
    { text: "Reply to the pending client email", size: "small", when: "before lunch" },
    { text: "Stretch for 5 minutes", size: "tiny", when: "before shower" },
    { text: "Study statistics for an hour", size: "stretch", when: "evening" },
  ],
];

const JOURNAL: Record<"high" | "mid" | "low", string[]> = {
  high: [
    "Sat down before I felt ready and it worked. The trick was starting first thing, before checking my phone. Once I was ten minutes in, the rest felt easy.",
    "Good day. I kept the promises small and told my sister what I was doing, so skipping felt awkward. Weird how that helps.",
    "Did all three. One of them was annoying but I set a 25 minute timer and just stopped when it rang. No drama.",
  ],
  mid: [
    "Got the first two done. The third kept sliding. Every time I looked at it I thought 'I'll do it once I've got a clear hour', and the hour never came.",
    "Did the small ones. Around 3pm I got tired and started scrolling. Not a disaster, but I noticed it happens at the same time every day.",
    "Mixed. I started strong, then a call ran over and I told myself the rest of the day was ruined, so I stopped. That 'ruined' thought shows up a lot.",
  ],
  low: [
    "Didn't really do what I said I would. Woke up late, felt behind already, and decided to 'start fresh tomorrow'. I keep doing that.",
    "Rough one. I looked at the list and felt heavy. Ended up reorganising my notes instead, which felt productive but wasn't the promise.",
    "Avoided the hard one all day. It's not that difficult, I just didn't want to face it. Told myself I'd do it when I was in a better mood.",
  ],
};

const P_BY_DAY = [0.55, 0.8, 0.8, 0.75, 0.5, 0.45, 0.4]; // Mon..Sun

export function makeDemoEntries(endDate: string, name: string, days = 14): Record<string, DayEntry> {
  const rand = rng(7);
  const out: Record<string, DayEntry> = {};
  for (let i = days; i >= 1; i--) {
    const date = addDays(endDate, -i);
    if (rand() < 0.08) continue; // rest day
    const set = SETS[(days - i) % SETS.length];
    const wd = weekdayIndex(date);
    const promises: PromiseItem[] = set.map((t, idx) => {
      let p = P_BY_DAY[wd];
      p += t.size === "tiny" ? 0.12 : t.size === "stretch" ? -0.22 : 0;
      p += t.when ? 0.1 : -0.03;
      p -= idx === 2 ? 0.05 : 0;
      const r = rand();
      const status: Status = r < p ? "kept" : r < p + 0.15 ? "partial" : "missed";
      let blocker: BlockerId | undefined;
      if (status !== "kept") {
        const b = rand();
        if (t.size === "stretch") blocker = b < 0.5 ? "too-big" : "tired";
        else if (t.size === "tiny") blocker = b < 0.5 ? "forgot" : "distracted";
        else blocker = b < 0.4 ? "avoidance" : b < 0.75 ? "tired" : "distracted";
        if ((wd === 4 || wd === 6) && b > 0.85) blocker = "low-mood";
      }
      return { id: uid(), text: t.text, size: t.size, when: t.when, status, blocker };
    });
    const score = promises.reduce((a, p) => a + (p.status === "kept" ? 1 : p.status === "partial" ? 0.5 : 0), 0) / 3;
    const band = score >= 0.83 ? "high" : score >= 0.4 ? "mid" : "low";
    const list = JOURNAL[band];
    const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
    const entry: DayEntry = {
      date,
      promises,
      journal: list[Math.floor(rand() * list.length)],
      mood: clamp(2 + score * 2.2 + rand()),
      energy: clamp(2 + score * 2 + rand() * 1.2),
      checkedInAt: new Date(`${date}T21:00:00`).toISOString(),
      demo: true,
    };
    entry.reply = localReply(entry, name);
    entry.replySource = "local";
    out[date] = entry;
  }
  return out;
}
