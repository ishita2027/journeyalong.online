"use client";
import { useEffect, useRef, useState } from "react";
import { PLANS, type PlanId } from "@/lib/brand";

// Razorpay Payment Page links, set in Vercel → Settings → Environment Variables, then redeploy.
// Only real Razorpay links are used; anything else is ignored.
const safe = (u?: string) => (u && /^https:\/\/([a-z0-9-]+\.)*(razorpay\.com|rzp\.io)\//i.test(u) ? u : "");
const PAY_LINKS: Partial<Record<PlanId, string>> = {
  plus: safe(process.env.NEXT_PUBLIC_PAY_PLUS_URL),
  deep: safe(process.env.NEXT_PUBLIC_PAY_DEEP_URL),
};

export default function UpgradeSheet({ current, onClose }: { current: PlanId; onClose: () => void }) {
  const [picked, setPicked] = useState<PlanId>(current === "free" ? "plus" : current);
  const [asked, setAsked] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = PLANS.find((p) => p.id === picked)!;
  const payUrl = PAY_LINKS[picked];

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row-split">
          <h2 id="upgrade-title" className="script-md">
            choose your plan
          </h2>
          <button ref={closeRef} className="btn btn-quiet" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="lede">Every plan keeps your promises, check-ins and self-trust score. Paid plans add the AI partner and the weekly Mind Mirror.</p>
        <ul className="plans">
          {PLANS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`plan ${picked === p.id ? "pick" : ""}`}
                aria-pressed={picked === p.id}
                onClick={() => {
                  setPicked(p.id);
                  setAsked(false);
                }}
                style={{ width: "100%", textAlign: "left", border: 0 }}
              >
                {p.id === current && (
                  <span className="badge chip" style={{ minHeight: 0, padding: "4px 10px", fontSize: 12 }}>
                    Current
                  </span>
                )}
                <span className="headline">{p.name}</span>
                <span>
                  <span className="price">{p.price}</span>
                  {p.per && <span className="per">{p.per}</span>}
                </span>
                <span className="caption muted">{p.note}</span>
                <span className="pts">
                  {p.points.map((t) => (
                    <span key={t} className="pt">
                      {t}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="actions">
          {payUrl && picked !== current ? (
            <a className="btn btn-primary" href={payUrl} target="_blank" rel="noopener noreferrer">
              Pay for {pick.name} with Razorpay
            </a>
          ) : (
            <button className="btn btn-primary" disabled={picked === current} onClick={() => setAsked(true)}>
              {picked === "free" ? "Stay on Starter" : `Choose ${pick.name}`}
            </button>
          )}
          {payUrl && picked !== current && (
            <p className="hint">
              Opens Razorpay&rsquo;s secure checkout in a new tab. You&rsquo;re joining as a founding member: we&rsquo;ll email you
              when {pick.name} features switch on for your account.
            </p>
          )}
          {asked && !payUrl && (
            <p className="hint" role="status">
              Payments aren&rsquo;t switched on yet, so nothing was charged. {pick.name} opens soon.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
