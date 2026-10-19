import "server-only";
import { createClient } from "@supabase/supabase-js";

// Prices live on the server so nobody can change what they pay from the browser. Amounts are in paise.
export const PRICE_PAISE = { plus: 19900, deep: 49900 } as const;
export type PaidPlan = keyof typeof PRICE_PAISE;
export const PERIOD_DAYS = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lqsbicrnveqxjxnznfhk.supabase.co";

export function config() {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const sbSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return keyId && keySecret && sbSecret ? { keyId, keySecret, sbSecret } : null;
}

export function admin(sbSecret: string) {
  return createClient(SUPABASE_URL, sbSecret, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** The signed-in user behind the request's "Authorization: Bearer <token>", or null. */
export async function userFrom(req: Request, sbSecret: string) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin(sbSecret).auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function razorpay(path: string, keyId: string, keySecret: string, body?: unknown) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.description || `Razorpay ${res.status}`);
  return json;
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
