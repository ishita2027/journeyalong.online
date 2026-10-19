// Server-only helpers for calling the Anthropic API.

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;
export const MAIN_MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
export const FAST_MODEL = () => process.env.ANTHROPIC_FAST_MODEL || "claude-haiku-4-5-20251001";

export async function callClaude(opts: {
  system: string;
  user: string;
  maxTokens: number;
  model: string;
}): Promise<string> {
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
