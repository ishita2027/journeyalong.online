import type { SharpenFeedback, Size } from "./types";

const VAGUE = new Set([
  "work", "study", "gym", "exercise", "read", "focus", "workout", "clean",
  "be productive", "productive", "meditate", "write", "code", "practice",
]);
const BIG = /\b(finish|complete|entire|whole|everything|all of|every)\b/i;

export function sharpenLocal(text: string, size: Size): SharpenFeedback {
  const t = text.trim();
  const lower = t.toLowerCase().replace(/[.!]/g, "");
  const words = t.split(/\s+/).filter(Boolean);

  if (words.length <= 2 && (VAGUE.has(lower) || t.length < 10)) {
    return {
      verdict: "vague",
      note: "At 9pm, could you say for certain whether this happened?",
      suggestion: `${t || "Study"} for 20 minutes at my desk`,
    };
  }
  if (BIG.test(t) && size !== "stretch") {
    return {
      verdict: "too_big",
      note: "Words like finish, all and everything make promises easy to break.",
      suggestion: `Do the first 15 minutes of: ${t}`,
    };
  }
  if (!/\d/.test(t) && words.length < 4) {
    return {
      verdict: "vague",
      note: "Add a number, a place, or a time so it's clear when it's done.",
      suggestion: `${t}, for 15 minutes`,
    };
  }
  return { verdict: "good", note: "Clear and doable.", suggestion: "" };
}
