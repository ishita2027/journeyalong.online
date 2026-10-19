import type { AppState } from "./types";

const KEY = "journeyalong:v1";
const OLD_KEY = "kept:v1";

export const emptyState = (): AppState => ({
  version: 1,
  name: "",
  onboarded: false,
  plan: "free",
  reminders: { on: false, morning: "08:00", evening: "21:00" },
  entries: {},
  mirrors: {},
});

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && parsed.entries) return { ...emptyState(), ...parsed };
  } catch {
    /* fall through */
  }
  return emptyState();
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

export function validateImport(obj: unknown): AppState | null {
  const o = obj as Partial<AppState> | null;
  if (!o || o.version !== 1 || typeof o.entries !== "object" || o.entries === null) return null;
  return { ...emptyState(), ...(o as AppState) };
}
