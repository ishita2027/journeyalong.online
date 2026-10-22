// Server-only helpers for calling an AI model.
// Uses Anthropic (Claude) when ANTHROPIC_API_KEY is set, otherwise Groq's free tier when GROQ_API_KEY is set.

const useAnthropic = () => !!process.env.ANTHROPIC_API_KEY;
const useGroq = () => !useAnthropic() && !!process.env.GROQ_API_KEY;

export const aiEnabled = () => useAnthropic() || useGroq();
export const MAIN_MODEL = () =>
  useGroq()
    ? process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
    : process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
export const FAST_MODEL = () =>
  useGroq()
    ? process.env.GROQ_FAST_MODEL || "llama-3.1-8b-instant"
    : process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";

async function callGroq(opts: { system: string; user: string; maxTokens: number; model: string }): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Groq API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens: number;
  model: string;
}): Promise<string> {
  if (useGroq()) return callGroq(opts);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
    signal: AbortSignal.timeout(50_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const blocks: { type: string; text?: string }[] = data.content ?? [];
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}

// Best-effort, per-instance limiter. On serverless this is not a hard guarantee;
// add per-user limits once you have authentication.
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 40, windowMs = 10 * 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}
