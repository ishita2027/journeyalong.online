export const BRAND = {
  name: "Journey Along",
  script: "journey along",
  tagline: "Three promises a day. Self-trust, not streaks.",
};

export const PLANS = [
  {
    id: "free" as const,
    name: "Starter",
    price: "Free",
    per: "",
    note: "Try the habit",
    points: [
      "Three promises a day and evening check-ins",
      "Journal and self-trust score",
      "One Mind Mirror a month",
    ],
  },
  {
    id: "plus" as const,
    name: "Plus",
    price: "₹199",
    per: "a month",
    note: "For most people",
    points: [
      "A partner reply to every entry",
      "The weekly Mind Mirror",
      "Promise sharpening and full history",
    ],
  },
  {
    id: "deep" as const,
    name: "Deep",
    price: "₹499",
    per: "a month",
    note: "For serious change",
    points: [
      "Everything in Plus",
      "A monthly pattern review across your history",
      "Priority access to challenges",
    ],
  },
];
export type PlanId = (typeof PLANS)[number]["id"];
