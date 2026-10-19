"use client";
import { useEffect, useRef, useState } from "react";
import { PLANS, type PlanId } from "@/lib/brand";

type Paid = { plan: PlanId; until: string };
type Step = "idle" | "loading" | "verifying" | "done" | "error";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function UpgradeSheet({
  current,
  until,
  name,
  getToken,
  onClose,
  onPaid,
  onSignIn,
}: {
  current: PlanId;
  until?: string;
  name: string;
  /** The signed-in user's access token, or null when signed out. */
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onPaid: (p: Paid) => void;
  onSignIn: () => void;
}) {
  const [picked, setPicked] = useState<PlanId>(current === "free" ? "plus" : current);
  const [step, setStep] = useState<Step>("idle");
  const [msg, setMsg] = useState("");
  const [needSignIn, setNeedSignIn] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = PLANS.find((p) => p.id === picked)!;
  const busy = step === "loading" || step === "verifying";

  async function pay() {
    if (picked === "free") return;
    setMsg("");
    setNeedSignIn(false);
    const token = await getToken();
    if (!token) {
      setNeedSignIn(true);
      return;
    }
    setStep("loading");
    const res = await fetch("/api/pay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: picked }),
    }).catch(() => null);
    const order = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setStep("error");
      if (res?.status === 401) setNeedSignIn(true);
      setMsg(
        res?.status === 503
          ? "Payments aren't switched on yet, so nothing was charged."
          : res?.status === 401
            ? ""
            : "We couldn't start the payment. Nothing was charged. Try again in a moment.",
      );
      return;
    }
    if (!(await loadCheckout()) || !window.Razorpay) {
      setStep("error");
      setMsg("Razorpay's checkout didn't load. Check your connection and try again.");
      return;
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Journey Along",
      description: `${pick.name} plan, 30 days`,
      prefill: { email: order.email, name },
      theme: { color: "#6c5890" },
      modal: { ondismiss: () => setStep("idle") },
      handler: async (r: Record<string, string>) => {
        setStep("verifying");
        const v = await fetch("/api/pay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(r),
        }).catch(() => null);
        const out = v ? await v.json().catch(() => ({})) : {};
        if (v?.ok && out.plan) {
          setStep("done");
          onPaid({ plan: out.plan, until: out.until });
        } else {
          setStep("error");
          setMsg(
            "Your payment went through, but we couldn't switch your plan on yet. Don't pay again. Write to us with your payment ID: " +
              (r.razorpay_payment_id || ""),
          );
        }
      },
    });
    rzp.on("payment.failed", () => {
      setStep("error");
      setMsg("The payment didn't go through, so nothing was charged. You can try again.");
    });
    rzp.open();
  }

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
                  setMsg("");
                  if (step !== "done") setStep("idle");
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
          {step === "done" ? (
            <>
              <p className="headline" role="status">
                You&rsquo;re on {pick.name}. Thank you.
              </p>
              <p className="hint">Your plan runs until {fmt(until)}. It&rsquo;s saved to your account.</p>
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" disabled={picked === "free" || busy} onClick={pay}>
                {step === "loading"
                  ? "Opening checkout…"
                  : step === "verifying"
                    ? "Confirming payment…"
                    : picked === "free"
                      ? current === "free"
                        ? "You're on Starter"
                        : "Starter is included"
                      : picked === current
                        ? `Add 30 days of ${pick.name} for ${pick.price}`
                        : `Pay ${pick.price} for ${pick.name}`}
              </button>
              {current !== "free" && until && (
                <p className="hint">
                  {PLANS.find((p) => p.id === current)?.name} runs until {fmt(until)}. Plans don&rsquo;t renew on their own.
                </p>
              )}
              {picked !== "free" && current === "free" && (
                <p className="hint">One payment covers 30 days. It doesn&rsquo;t renew on its own. Secure checkout by Razorpay (UPI, cards, netbanking).</p>
              )}
              {needSignIn && (
                <div className="banner" role="status" style={{ margin: 0 }}>
                  <p>Sign in first, so your plan is saved to your account and works on every device.</p>
                  <button className="btn btn-soft" onClick={onSignIn}>
                    Go to sign in
                  </button>
                </div>
              )}
              {msg && (
                <p className="hint" role="alert">
                  {msg}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
