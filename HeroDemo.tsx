"use client";
import { useState } from "react";
import type { Status } from "@/lib/types";
import { Circle, NEXT_STATUS, STATUS_LABEL } from "./Circle";

const DEMO = [
  { text: "Write 150 words of the brief", meta: "Small, at my desk before 11" },
  { text: "Walk for 10 minutes", meta: "Tiny, after lunch" },
  { text: "Clear the inbox to 10 emails", meta: "Stretch" },
];

export default function HeroDemo() {
  const [s, setS] = useState<Status[]>(["pending", "pending", "pending"]);
  const kept = s.filter((x) => x === "kept").length;
  const part = s.filter((x) => x === "partial").length;
  const miss = s.filter((x) => x === "missed").length;
  return (
    <div className="demo" aria-label="Try it: today's three promises">
      <span className="tape tape-blush" aria-hidden="true" />
      <p className="script-md" style={{ fontSize: 32, lineHeight: "36px", marginBottom: 6 }}>
        today&rsquo;s promises
      </p>
      {DEMO.map((p, i) => (
        <div key={p.text} className={`demo-row st-${s[i]}`}>
          <Circle
            status={s[i]}
            size={38}
            onTap={() => setS((cur) => cur.map((v, j) => (j === i ? NEXT_STATUS[v] : v)))}
            label={`${p.text}. ${STATUS_LABEL[s[i]]}. Tap to change.`}
          />
          <div>
            <p className="pcard-text" style={{ fontSize: 17 }}>
              {p.text}
            </p>
            <p className="pcard-meta">{p.meta}</p>
          </div>
          <span className="pcard-state">{s[i] === "pending" ? "" : STATUS_LABEL[s[i]]}</span>
        </div>
      ))}
      <p className="demo-cap" aria-live="polite">
        {kept + part + miss === 0
          ? "Tap a circle to check in."
          : `${kept} kept, ${part} partly, ${miss} didn't happen. Each one is evidence about how you work. None of them resets anything.`}
      </p>
    </div>
  );
}
