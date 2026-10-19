import { NextRequest, NextResponse } from "next/server";
import { aiEnabled, callClaude, FAST_MODEL, MAIN_MODEL, rateLimited } from "@/lib/ai";
import {
  buildMirror,
  buildReflect,
  buildSharpen,
  MIRROR_SYSTEM,
  parseMirror,
  parseSharpen,
  REFLECT_SYSTEM,
  SHARPEN_SYSTEM,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ enabled: aiEnabled() });
}

export async function POST(req: NextRequest) {
  if (!aiEnabled()) {
    return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > 60_000) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  try {
    switch (body?.kind) {
      case "sharpen": {
        const count = Math.min(Array.isArray(body.promises) ? body.promises.length : 0, 3);
        if (!count) return NextResponse.json({ error: "no_promises" }, { status: 400 });
        const text = await callClaude({
          model: FAST_MODEL(),
          system: SHARPEN_SYSTEM,
          user: buildSharpen(body),
          maxTokens: 600,
        });
        const feedback = parseSharpen(text, count);
        if (!feedback) return NextResponse.json({ error: "bad_model_output" }, { status: 502 });
        return NextResponse.json({ feedback });
      }
      case "reflect": {
        if (!body.entry) return NextResponse.json({ error: "no_entry" }, { status: 400 });
        const reply = await callClaude({
          model: MAIN_MODEL(),
          system: REFLECT_SYSTEM,
          user: buildReflect(body),
          maxTokens: 500,
        });
        if (!reply) return NextResponse.json({ error: "empty" }, { status: 502 });
        return NextResponse.json({ reply });
      }
      case "mirror": {
        const endDate = typeof body.endDate === "string" ? body.endDate.slice(0, 10) : "";
        if (!endDate || !Array.isArray(body.days) || body.days.length === 0) {
          return NextResponse.json({ error: "no_days" }, { status: 400 });
        }
        const text = await callClaude({
          model: MAIN_MODEL(),
          system: MIRROR_SYSTEM,
          user: buildMirror(body),
          maxTokens: 1600,
        });
        const mirror = parseMirror(text, endDate);
        if (!mirror) return NextResponse.json({ error: "bad_model_output" }, { status: 502 });
        return NextResponse.json({ mirror });
      }
      default:
        return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
    }
  } catch (err) {
    console.error("[api/ai]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }
}
