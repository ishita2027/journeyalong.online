"use client";
import { useEffect, useRef, useState } from "react";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Counts from `from` to `to` over `ms` with a gentle ease. */
export function useCountUp(to: number | null, from: number | null, ms = 1200) {
  const [v, setV] = useState<number | null>(to == null ? null : from ?? to);
  const raf = useRef(0);
  useEffect(() => {
    if (to == null) {
      setV(null);
      return;
    }
    const start = from ?? to;
    if (prefersReducedMotion() || start === to) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(start + (to - start) * ease(k)));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    setV(start);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [to, from, ms]);
  return v;
}

/** A short tap on Android phones. iPhones don't support web vibration, so nothing happens there. */
export function haptic(ms = 12) {
  try {
    if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}
