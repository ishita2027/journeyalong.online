"use client";
import { useState } from "react";
import { Circle } from "./Circle";
import { Sparkle, Wordmark } from "./Icons";

export default function Onboarding({ onStart, onDemo }: { onStart: (name: string) => void; onDemo: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <main className="welcome" data-clarity-mask="True">
      <Wordmark />
      <div style={{ display: "flex", gap: 10 }} aria-hidden="true">
        <Circle status="kept" size={38} />
        <Circle status="partial" size={38} />
        <Circle status="missed" size={38} />
      </div>
      <h1 className="script-xl" style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span>welcome</span>
        <Sparkle />
      </h1>
      <p className="lede">
        Each morning you make three small promises. Each evening you check in and write about what happened. On Sunday,
        the Mind Mirror shows you why you follow through and why you don&rsquo;t.
      </p>
      <p className="lede">Nothing here counts streaks. The goal is that you start to believe your own word.</p>
      <div className="card card-lg" style={{ display: "grid", gap: 14 }}>
        <label className="label" htmlFor="welcome-name">
          What should I call you?
        </label>
        <input
          id="welcome-name"
          className="input input-promise"
          value={name}
          maxLength={40}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onStart(name.trim())}
          placeholder="Your first name"
        />
        <div className="actions">
          <button className="btn btn-primary" onClick={() => onStart(name.trim())}>
            Make my first promises
          </button>
          <button className="btn btn-quiet" onClick={() => onDemo(name.trim())}>
            Explore with sample entries
          </button>
        </div>
      </div>
      <p className="hint">Your entries stay in this browser. Only the text of a check-in you finish is sent to the AI coach.</p>
    </main>
  );
}
