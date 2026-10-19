export type TabId = "today" | "trust" | "mirror" | "journal" | "profile";

const PATHS: Record<TabId, React.ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  trust: (
    <>
      <path d="M3 17c3-1 4-6 7-6s3 3 6 2 4-6 5-7" />
      <circle cx="21" cy="6" r="1" />
    </>
  ),
  mirror: (
    <>
      <ellipse cx="12" cy="9" rx="6" ry="7" />
      <path d="M12 16v6M9.5 22h5M9.5 6.5c.8-1 1.7-1.5 3-1.6" />
    </>
  ),
  journal: <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14" />,
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
};

export function TabIcon({ id }: { id: TabId }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[id]}
    </svg>
  );
}

export function Sparkle({ size = 34 }: { size?: number }) {
  return (
    <span className="doodle" aria-hidden="true">
      <svg width={size} height={size * 0.7} viewBox="0 0 40 28">
        <path d="M10 4 L11.6 10 L17 12 L11.6 14 L10 20 L8.4 14 L3 12 L8.4 10 Z" />
        <path d="M28 2 L28.9 5.6 L32 6.5 L28.9 7.4 L28 11 L27.1 7.4 L24 6.5 L27.1 5.6 Z" strokeWidth="1.3" />
      </svg>
    </span>
  );
}

export function Heart({ size = 16 }: { size?: number }) {
  return (
    <span className="doodle" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 13 12">
        <path d="M6.5 11 C2 7.6 .8 5.6 .8 3.6 A2.8 2.8 0 0 1 6.5 2.4 A2.8 2.8 0 0 1 12.2 3.6 C12.2 5.6 11 7.6 6.5 11Z" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

export function Moon({ size = 22 }: { size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20 }}>
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

export function Wordmark({ as = "span", href }: { as?: "span" | "a"; href?: string }) {
  const inner = (
    <>
      <span className="wordmark-dot" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2.6 6.2l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      journey along
    </>
  );
  if (as === "a") return <a className="wordmark" href={href} aria-label="Journey Along home">{inner}</a>;
  return <span className="wordmark">{inner}</span>;
}
