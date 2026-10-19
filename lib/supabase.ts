"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// These two values are public by design (they ship to every browser).
// Row Level Security in the database keeps each user's data private.
// Override them in Vercel → Settings → Environment Variables if the project ever changes.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lqsbicrnveqxjxnznfhk.supabase.co";
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_LGdp3PPcc0MI5Gge04iX3A_MQ4R9iEY";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (typeof window === "undefined" || !URL || !KEY) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
    });
  }
  return client;
}
