"use client";
import type { AppState, DayEntry, Mirror, Reminders } from "./types";
import { supabase } from "./supabase";

export interface Remote {
  name: string | null;
  reminders: Reminders | null;
  plan: AppState["plan"];
  entries: Record<string, DayEntry>;
  mirrors: Record<string, Mirror>;
}

export async function pullAll(userId: string): Promise<Remote> {
  const sb = supabase();
  if (!sb) throw new Error("no client");
  const [prof, ents, mirs, sub] = await Promise.all([
    sb.from("profiles").select("name, reminders").eq("id", userId).maybeSingle(),
    sb.from("entries").select("date, data, updated_at").eq("user_id", userId),
    sb.from("mirrors").select("end_date, data").eq("user_id", userId),
    sb.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle(),
  ]);
  for (const r of [prof, ents, mirs, sub]) if (r.error) throw r.error;
  const entries: Record<string, DayEntry> = {};
  for (const row of ents.data ?? []) {
    const e = row.data as DayEntry;
    if (e && Array.isArray(e.promises)) entries[row.date] = { ...e, date: row.date, updatedAt: e.updatedAt || row.updated_at };
  }
  const mirrors: Record<string, Mirror> = {};
  for (const row of mirs.data ?? []) mirrors[row.end_date] = row.data as Mirror;
  const plan = (sub.data?.plan as AppState["plan"]) || "free";
  return {
    name: prof.data?.name ?? null,
    reminders: (prof.data?.reminders as Reminders) ?? null,
    plan: plan === "plus" || plan === "deep" ? plan : "free",
    entries,
    mirrors,
  };
}

/** Newest copy of each day wins. Sample (demo) entries never leave the device. */
export function merge(local: AppState, remote: Remote): AppState {
  const entries: Record<string, DayEntry> = { ...remote.entries };
  for (const [date, e] of Object.entries(local.entries)) {
    const r = remote.entries[date];
    if (!r) entries[date] = e;
    else if ((e.updatedAt || "") > (r.updatedAt || "")) entries[date] = e;
  }
  return {
    ...local,
    onboarded: true,
    name: local.name || remote.name || "",
    reminders: remote.reminders ?? local.reminders,
    plan: remote.plan,
    entries,
    mirrors: { ...remote.mirrors, ...local.mirrors },
  };
}

export async function pushEntries(userId: string, entries: DayEntry[]) {
  const sb = supabase();
  if (!sb || !entries.length) return;
  const rows = entries.map((e) => ({
    user_id: userId,
    date: e.date,
    data: e,
    updated_at: e.updatedAt || new Date().toISOString(),
  }));
  const { error } = await sb.from("entries").upsert(rows, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function removeEntries(userId: string, dates: string[]) {
  const sb = supabase();
  if (!sb || !dates.length) return;
  const { error } = await sb.from("entries").delete().eq("user_id", userId).in("date", dates);
  if (error) throw error;
}

export async function pushMirrors(userId: string, mirrors: Mirror[]) {
  const sb = supabase();
  if (!sb || !mirrors.length) return;
  const { error } = await sb
    .from("mirrors")
    .upsert(mirrors.map((m) => ({ user_id: userId, end_date: m.endDate, data: m })), { onConflict: "user_id,end_date" });
  if (error) throw error;
}

export async function pushProfile(userId: string, name: string, reminders: Reminders) {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.from("profiles").upsert({ id: userId, name, reminders }, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAllRemote(userId: string) {
  const sb = supabase();
  if (!sb) return;
  await Promise.all([
    sb.from("entries").delete().eq("user_id", userId),
    sb.from("mirrors").delete().eq("user_id", userId),
  ]);
}
