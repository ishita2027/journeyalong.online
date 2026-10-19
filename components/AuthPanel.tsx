"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export type SyncStatus = "off" | "syncing" | "saved" | "error";

/** Email magic-link sign in. When signed in, shows the account and a sign-out button. */
export default function AuthPanel({
  email,
  status,
  onSignOut,
  compact = false,
}: {
  email: string | null;
  status: SyncStatus;
  onSignOut?: () => void;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const [confirmOut, setConfirmOut] = useState(false);

  async function send() {
    const sb = supabase();
    const addr = value.trim();
    if (!sb || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setState("error");
      setErr("Enter a valid email address.");
      return;
    }
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: `${window.location.origin}/app`, shouldCreateUser: true },
    });
    if (error) {
      setState("error");
      setErr(
        /rate|limit|too many/i.test(error.message)
          ? "Too many sign-in emails were sent recently. Try again in an hour."
          : /not authori[sz]ed/i.test(error.message)
            ? "Sign-in emails can't be sent to this address yet. Ask the Journey Along team to finish email setup."
            : "The sign-in email couldn't be sent. Check the address and try again.",
      );
      return;
    }
    setState("sent");
  }

  if (email) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div className="row-split">
          <div style={{ minWidth: 0 }}>
            <p className="headline">Signed in</p>
            <p className="soft body-sm" style={{ overflowWrap: "anywhere" }}>
              {email}
            </p>
          </div>
          <span className="caption muted" role="status">
            <span className={`status-dot ${status === "saved" ? "on" : ""}`} aria-hidden="true" />
            {status === "syncing" ? "Saving…" : status === "error" ? "Couldn't save. Will retry" : "Saved to your account"}
          </span>
        </div>
        <p className="hint">Your journal is saved to your account, so it's the same on every device you sign in on.</p>
        {onSignOut &&
          (confirmOut ? (
            <div className="actions">
              <button className="btn btn-primary" onClick={onSignOut}>
                Sign out of this device
              </button>
              <button className="btn btn-quiet" onClick={() => setConfirmOut(false)}>
                Stay signed in
              </button>
              <p className="hint">Signing out removes your journal from this device. It stays safe in your account.</p>
            </div>
          ) : (
            <div>
              <button className="btn btn-quiet" onClick={() => setConfirmOut(true)}>
                Sign out
              </button>
            </div>
          ))}
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div style={{ display: "grid", gap: 8 }} role="status">
        <p className="headline">Check your email</p>
        <p className="soft body-sm">
          We sent a sign-in link to <b>{value.trim()}</b>. Open it on this device to finish signing in. It can take a minute,
          and sometimes lands in spam.
        </p>
        <div>
          <button
            className="btn btn-quiet"
            onClick={() => {
              setState("idle");
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {!compact && (
        <div>
          <p className="headline">Save your journal to an account</p>
          <p className="soft body-sm">
            Sign in with your email to keep your entries safe and use Journey Along on any device. No password needed.
          </p>
        </div>
      )}
      <label className="label" htmlFor="auth-email" style={{ marginBottom: 0 }}>
        Email
      </label>
      <div className="pform-row">
        <input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state === "error") setState("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn btn-primary" onClick={send} disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </div>
      {state === "error" && (
        <p className="hint" role="alert" style={{ color: "var(--peach-700)" }}>
          {err}
        </p>
      )}
    </div>
  );
}
