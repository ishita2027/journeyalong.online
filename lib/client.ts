import type { DayEntry, Mirror, SharpenFeedback, Size } from "./types";
import type { Patterns } from "./stats";

async function post<T>(body: unknown, ms = 55000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function checkAiEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/ai", { cache: "no-store" });
    if (!res.ok) return false;
    return !!(await res.json()).enabled;
  } catch {
    return false;
  }
}

export async function requestSharpen(
  promises: { text: string; size: Size; when: string }[],
): Promise<SharpenFeedback[] | null> {
  const r = await post<{ feedback: SharpenFeedback[] }>({ kind: "sharpen", promises });
  return r?.feedback ?? null;
}

export async function requestReflection(args: {
  name: string;
  entry: DayEntry;
  recent: { date: string; kept: number; partial: number; missed: number; journal: string }[];
  trust: number | null;
}): Promise<string | null> {
  const r = await post<{ reply: string }>({ kind: "reflect", ...args });
  return r?.reply ?? null;
}

export async function requestMirror(args: {
  name: string;
  endDate: string;
  days: DayEntry[];
  week: Patterns;
  long: Patterns;
  trustNow: number | null;
  trustBefore: number | null;
}): Promise<Mirror | null> {
  const r = await post<{ mirror: Mirror }>({ kind: "mirror", ...args });
  return r?.mirror ?? null;
}
