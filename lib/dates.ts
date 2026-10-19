export const pad = (n: number) => String(n).padStart(2, "0");
export const toKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => toKey(new Date());
export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAYS_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
/** Monday = 0 */
export const weekdayIndex = (k: string) => (parseKey(k).getDay() + 6) % 7;
export const formatLong = (k: string) =>
  parseKey(k).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
export const formatShort = (k: string) =>
  parseKey(k).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export type Phase = "morning" | "afternoon" | "evening";

/** The day a moment belongs to. The small hours (before 5am) still belong to the evening before. */
export const dayKeyAt = (d: Date) => {
  const x = new Date(d);
  if (x.getHours() < 5) x.setDate(x.getDate() - 1);
  return toKey(x);
};

/** Morning 5am–12pm, afternoon 12pm–6pm, evening 6pm until 5am. */
export const phaseAt = (d: Date): Phase => {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
};

export const isSunday = (k: string) => parseKey(k).getDay() === 0;
export const dayNum = (k: string) => parseKey(k).getDate();
export const monthShort = (k: string) => parseKey(k).toLocaleDateString("en-IN", { month: "short" });
