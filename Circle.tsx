"use client";
import { useEffect, useRef, useState } from "react";
import type { Status } from "@/lib/types";
import { haptic, prefersReducedMotion } from "@/lib/hooks";

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Not checked in",
  kept: "Kept",
  partial: "Partly",
  missed: "Didn't happen",
};

/** The promise circle. Kept fills with a bloom and a small burst; partly half-fills; didn't happen is a dashed ring. */
export function Circle({
  status,
  size = 36,
  onTap,
  label,
}: {
  status: Status;
  size?: number;
  onTap?: () => void;
  label?: string;
}) {
  const prev = useRef(status);
  const mounted = useRef(false);
  const [burst, setBurst] = useState<{ n: number; kind: "kept" | "partial" } | null>(null);
  const [parts, setParts] = useState<{ id: number; x: number; y: number; c: string }[]>([]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = status;
      return;
    }
    if (prev.current !== status && (status === "kept" || status === "partial")) {
      if (status === "kept") haptic(14);
      if (!prefersReducedMotion()) {
        setBurst((b) => ({ n: (b?.n ?? 0) + 1, kind: status }));
        if (status === "kept") {
          const r = size * 0.75;
          const list = Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * Math.PI * 2 + Math.random() * 0.4;
            const d = r + Math.random() * 10;
            return { id: Date.now() + k, x: Math.cos(a) * d, y: Math.sin(a) * d, c: k % 2 ? "var(--lilac-400)" : "var(--peach-400)" };
          });
          setParts(list);
          const t = setTimeout(() => setParts([]), 760);
          prev.current = status;
          return () => clearTimeout(t);
        }
      }
    }
    prev.current = status;
  }, [status, size]);

  const s = size;
  const c = s / 2;
  const r = s / 2 - 2;
  const ring =
    status === "kept" ? "var(--plum-600)" : status === "partial" ? "var(--peach-600)" : status === "missed" ? "var(--missed-ring)" : "var(--lilac-400)";
  const svg = (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true" focusable="false">
      <circle
        cx={c}
        cy={c}
        r={r}
        fill={status === "pending" ? "var(--surface)" : "none"}
        stroke={ring}
        strokeWidth={status === "pending" ? 1.75 : 2}
        strokeDasharray={status === "missed" ? "3.5 4" : undefined}
      />
      <circle className="fill" cx={c} cy={c} r={r} fill="var(--plum-600)" style={{ transform: `scale(${status === "kept" ? 1 : 0})` }} />
      <path
        className="fill"
        d={`M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r} Z`}
        fill="var(--peach-200)"
        style={{ opacity: status === "partial" ? 1 : 0 }}
      />
      <path
        className="tick"
        d={`M${s * 0.31} ${s * 0.51} l${s * 0.13} ${s * 0.13} l${s * 0.25} -${s * 0.27}`}
        fill="none"
        stroke="var(--on-plum)"
        strokeWidth={Math.max(2, s / 15)}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: status === "kept" ? 1 : 0 }}
      />
    </svg>
  );
  const fx = (
    <>
      {burst && <span key={burst.n} className={`halo go-${burst.kind}`} />}
      {parts.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{ background: p.c, ["--x" as string]: `${p.x}px`, ["--y" as string]: `${p.y}px` }}
        />
      ))}
    </>
  );
  if (onTap) {
    return (
      <button type="button" className="circle" onClick={onTap} aria-label={label} style={{ width: s, height: s }}>
        {svg}
        {fx}
      </button>
    );
  }
  return (
    <span className="circle" style={{ width: s, height: s }} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>
      {svg}
      {fx}
    </span>
  );
}

export const NEXT_STATUS: Record<Status, Status> = {
  pending: "kept",
  kept: "partial",
  partial: "missed",
  missed: "pending",
};
