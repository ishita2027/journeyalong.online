export type Status = "pending" | "kept" | "partial" | "missed";
export type Size = "tiny" | "small" | "stretch";
export type BlockerId =
  | "tired"
  | "distracted"
  | "avoidance"
  | "unclear"
  | "too-big"
  | "low-mood"
  | "external"
  | "forgot";

export interface PromiseItem {
  id: string;
  text: string;
  size: Size;
  when: string;
  status: Status;
  blocker?: BlockerId;
  note?: string;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD, local time
  promises: PromiseItem[];
  journal: string;
  mood?: number; // 1-5
  energy?: number; // 1-5
  checkedInAt?: string;
  reply?: string;
  replySource?: "ai" | "local";
  demo?: boolean;
}

export interface Mirror {
  endDate: string;
  generatedAt: string;
  source: "ai" | "local";
  headline: string;
  trustNote: string;
  whyYouShowUp: string[];
  whereItSlips: string[];
  patterns: { title: string; evidence: string }[];
  storyYouTell: string;
  experiment: { title: string; how: string; why: string };
}

export interface Reminders {
  on: boolean;
  morning: string; // "HH:MM"
  evening: string;
}

export interface AppState {
  version: 1;
  name: string;
  onboarded: boolean;
  plan: "free" | "plus" | "deep";
  reminders: Reminders;
  entries: Record<string, DayEntry>;
  mirrors: Record<string, Mirror>;
}

export interface SharpenFeedback {
  verdict: "good" | "vague" | "too_big";
  note: string;
  suggestion: string;
}

export const SIZES: { id: Size; label: string; hint: string }[] = [
  { id: "tiny", label: "Tiny", hint: "about 2 minutes" },
  { id: "small", label: "Small", hint: "about 15 minutes" },
  { id: "stretch", label: "Stretch", hint: "an hour or more" },
];

export const BLOCKERS: { id: BlockerId; label: string }[] = [
  { id: "tired", label: "Too tired" },
  { id: "distracted", label: "Got distracted" },
  { id: "avoidance", label: "Avoided it" },
  { id: "unclear", label: "Wasn't clear what to do" },
  { id: "too-big", label: "Too big" },
  { id: "low-mood", label: "Low mood" },
  { id: "external", label: "Something came up" },
  { id: "forgot", label: "Forgot" },
];

export const blockerLabel = (id?: BlockerId) =>
  BLOCKERS.find((b) => b.id === id)?.label ?? "";
export const sizeLabel = (s: Size) => SIZES.find((x) => x.id === s)?.label ?? s;
