import Link from "next/link";
import HeroDemo from "@/components/HeroDemo";
import { Sparkle, Wordmark } from "@/components/Icons";
import { MirrorCard } from "@/components/MirrorView";
import { BRAND, PLANS } from "@/lib/brand";

const DAY = [
  {
    when: "morning",
    title: "Make three promises",
    body: "Small enough that you're nearly sure you'll keep them. Journey Along flags the ones that are vague or too big before you commit.",
  },
  {
    when: "during the day",
    title: "Tap a circle when it's done",
    body: "Mark a promise kept the moment you finish it. No pressure to report until the evening.",
  },
  {
    when: "evening",
    title: "Check in and write",
    body: "Mark each promise kept, partly, or didn't happen. Pick what got in the way. Then write what happened, and hear back from your partner.",
  },
  {
    when: "sunday",
    title: "Read your Mind Mirror",
    body: "A weekly reading of your week: when you show up, where it slips, the story you tell yourself, and one experiment to try.",
  },
];

const SAMPLE_MIRROR = {
  endDate: "2026-10-18",
  generatedAt: "2026-10-18T20:00:00.000Z",
  source: "ai" as const,
  headline: "You keep promises that have a time and a place attached.",
  trustNote: "Your self-trust is 72, up 8 from last week.",
  whyYouShowUp: [
    "Promises with a planned time were kept 81% of the time, against 47% without one.",
    "Tiny promises were kept nine times out of ten.",
  ],
  whereItSlips: [
    "Your third promise slips on Fridays, and the reason you give is “too tired” four weeks running.",
    "After one missed promise, you often drop the other two.",
  ],
  patterns: [],
  storyYouTell:
    "“I’ll do it once I’ve got a clear hour.” You’ve written a version of that in five entries. The hour hasn’t come yet.",
  experiment: {
    title: "Make the third promise two minutes long",
    how: "Do it before lunch for the next seven days.",
    why: "Fridays and tiredness keep showing up together. A smaller, earlier promise avoids both.",
  },
};

export default function Landing() {
  return (
    <div className="land">
      <header className="land-wrap land-nav">
        <Wordmark />
        <Link className="btn btn-soft" href="/app">
          Open the journal
        </Link>
      </header>

      <main>
        <section className="land-wrap land-hero">
          <div>
            <p className="accent">
              <span className="script-md">self-trust, not streaks</span>
              <Sparkle size={30} />
            </p>
            <h1 className="display">Stop counting streaks. Start trusting yourself.</h1>
            <p className="land-sub">
              {BRAND.name} is an accountability journal for people who set big intentions and lose the thread. Make three
              small promises each morning, check in each evening, and read a weekly Mind Mirror that shows why you follow
              through and why you don&rsquo;t.
            </p>
            <div className="land-cta">
              <Link className="btn btn-primary" href="/app">
                Make today&rsquo;s three promises
              </Link>
              <p className="hint">Free to try. Your entries stay in your browser.</p>
            </div>
          </div>
          <HeroDemo />
        </section>

        <section className="land-wrap land-band">
          <h2 className="script-md">a day in {BRAND.script}</h2>
          <ol className="day-steps">
            {DAY.map((d) => (
              <li key={d.title}>
                <span className="when">{d.when}</span>
                <h3 className="headline">{d.title}</h3>
                <p>{d.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="land-wrap land-band split">
          <div>
            <h2 className="title-1">Streaks punish the wrong day.</h2>
            <p className="lede" style={{ marginTop: 14 }}>
              A streak drops to zero on your worst day, exactly when you need proof that you can recover. For people who
              already struggle with consistency, that reset is the reason they quit.
            </p>
            <p className="lede">
              Your self-trust score moves with evidence. Each kept promise adds to it. An honest miss teaches you
              something. A rough week dents the score without erasing it. The aim isn&rsquo;t a perfect record. It&rsquo;s that
              when you tell yourself you&rsquo;ll do something, you believe it.
            </p>
          </div>
          <figure className="cmp" aria-label="A streak counter resets to zero after one bad day, while a self-trust curve dips and recovers">
            <svg viewBox="0 0 300 250" aria-hidden="true">
              <text x="0" y="16" className="cmp-t">Streak counter</text>
              <polyline points="0,110 30,100 60,90 90,80 120,70 150,60 180,50 180,110 210,110 240,100 270,90" className="cmp-streak" />
              <text x="188" y="80" className="cmp-n">One bad day: back to 0</text>
              <g transform="translate(0,130)">
                <text x="0" y="16" className="cmp-t">Self-trust</text>
                <polyline points="0,100 30,92 60,84 90,76 120,66 150,62 180,80 210,74 240,64 270,54" className="cmp-trust" />
                <circle cx="270" cy="54" r="5" fill="var(--plum-600)" />
                <text x="150" y="112" className="cmp-n">Dips, then recovers</text>
              </g>
            </svg>
          </figure>
        </section>

        <section className="land-wrap land-mirror" aria-label="A sample Mind Mirror">
          <h2 className="script-md" style={{ marginBottom: 16 }}>
            a sample mind mirror
          </h2>
          <MirrorCard mirror={SAMPLE_MIRROR} />
        </section>

        <section className="land-wrap land-band" aria-label="Pricing">
          <h2 className="script-md">pricing</h2>
          <ul className="land-plans">
            {PLANS.map((p) => (
              <li key={p.id} className={`plan ${p.id === "plus" ? "pick" : ""}`}>
                <span className="headline">{p.name}</span>
                <span>
                  <span className="price">{p.price}</span>
                  {p.per && <span className="per">{p.per}</span>}
                </span>
                <span className="caption muted">{p.note}</span>
                <ul>
                  {p.points.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <ul className="soon">
            <li className="dash-box">
              <h3 className="headline">Challenges</h3>
              <p className="soft">
                Themed 21-day cohorts, such as a 7am start or a deep-work block, run alongside your daily promises. Coming
                soon.
              </p>
            </li>
            <li className="dash-box">
              <h3 className="headline">The {BRAND.name} journal</h3>
              <p className="soft">A physical, dated journal with the same daily layout for people who like paper. Coming later.</p>
            </li>
          </ul>
        </section>

        <section className="land-wrap land-final">
          <h2 className="title-1" style={{ maxWidth: "22ch" }}>
            Three small promises. Tonight, find out if you kept them.
          </h2>
          <Link className="btn btn-primary" href="/app">
            Start your first day
          </Link>
        </section>
      </main>

      <footer className="land-wrap land-foot">
        <p>{BRAND.name} is a self-reflection tool, not therapy or medical advice.</p>
      </footer>
    </div>
  );
}
