# Journey Along

An AI accountability journal for people who struggle with consistency and procrastination.
Three promises a day. Self-trust, not streaks.

- **Today** flows with the day. Morning (5am–12pm): make three promises. Afternoon (12pm–6pm): tap a circle
  whenever you finish one. Evening (6pm–5am): check in, write about the day, and hear from your accountability
  partner. After midnight and before 5am, Today still shows the evening before. In the evening you can make
  promises for tonight or for tomorrow (tomorrow is the default), and after checking in you can set tomorrow's
  promises.
- **Self-Trust**: the score (it eases up from last week's value), a trend for 7, 15, 30, 60 or 90 days, and
  "What moved it this week": a weekly summary on top and each day's reason below.
- **Mind Mirror**: the weekly reading. The button lights up on Sunday; you can read an early Mirror once you have
  three check-ins in a week. Past weeks are kept below.
- **Journal**: a week strip with each day's promise marks on top, every entry below.
- **Profile**: name, plan (Starter free, Plus ₹199/month, Deep ₹499/month), reminder times, AI coach status,
  export and import, sample data, and start over.

A fully missed day never shows a count like "0 of 3" on Today. There is no red or green anywhere.
On Android phones a kept promise gives a short vibration; there is no sound.

Next.js (App Router) + TypeScript. Optional accounts and sync with Supabase (email sign-in link).

## Deploy to Vercel

1. Unzip this folder.
2. Either push it to a GitHub repo and import it at vercel.com/new, or run `npx vercel` and then
   `npx vercel --prod` from inside the folder. Vercel detects Next.js automatically; no settings to change.
3. Optional but recommended: in **Project → Settings → Environment Variables**, add `ANTHROPIC_API_KEY`, then
   redeploy. This turns on the AI partner replies, promise sharpening, and the full Mind Mirror.

Without a key everything still works with built-in logic (replies are simpler and the Mirror uses counts only).

| Variable | Required | Default |
| --- | --- | --- |
| `GROQ_API_KEY` | Free AI option (used when no Anthropic key) | none |
| `GROQ_MODEL` / `GROQ_FAST_MODEL` | No | `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` |
| `ANTHROPIC_API_KEY` | For AI features (paid) | none |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-5` (replies and Mind Mirror) |
| `ANTHROPIC_FAST_MODEL` | No | `claude-haiku-4-5-20251001` (promise sharpening) |

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY if you have one
npm run dev                  # http://localhost:3000
```

**Previewing other times of day:** add `?time=morning`, `?time=afternoon` or `?time=evening` to the app URL,
for example `/app?time=evening`, to see the check-in without waiting for 6pm.

**Sample data:** Profile → "Load two weeks of sample entries", or "Explore with sample entries" on first launch.

## Where things live

| Path | What it does |
| --- | --- |
| `app/page.tsx` | Landing page and pricing |
| `app/app/page.tsx` → `components/AppShell.tsx` | The app: bottom tab bar on phones, side navigation from 768px |
| `components/TodayView.tsx` | The time-of-day Today screen |
| `components/Circle.tsx` | The promise circle and its kept animation |
| `components/TrustView.tsx`, `MirrorView.tsx`, `JournalView.tsx`, `ProfileView.tsx`, `UpgradeSheet.tsx` | The other tabs |
| `app/globals.css` | Design tokens and all styles |
| `app/api/ai/route.ts` | One endpoint: `sharpen`, `reflect`, `mirror` |
| `lib/prompts.ts` | The partner's voice and the Mind Mirror instructions |
| `lib/stats.ts` | Self-trust score, patterns, and "what moved it" |
| `lib/dates.ts` | Day boundary (5am) and phases |
| `lib/brand.ts` | Name, tagline, plans and prices |

**Self-trust score (0–100):** 75% recency-weighted follow-through (kept = 1, partly = 0.5, didn't happen = 0)
plus 25% recency-weighted honesty of reporting. 14-day window, rest days ignored, never resets to zero.

**Data:** stored in the user's browser (`localStorage`). Only the text of a finished check-in (or the last 7
days, for a Mirror) is sent to the Anthropic API.

## Not built yet

- **Renewals.** Plus and Deep are one-time Razorpay payments that each cover 30 days (`/api/pay/order`,
  `/api/pay/verify`). Needs `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `SUPABASE_SECRET_KEY` in Vercel.
  Automatic monthly renewal (Razorpay Subscriptions) and a `payment.captured` webhook are not built yet.
- **Reminders.** The times are saved in Profile, but no notifications are sent yet. Web push works on Android,
  and on iPhone only after the app is added to the home screen.
- **Per-user AI limits.** `/api/ai` has payload caps and a best-effort per-IP limiter only.
- The crisis-language handling in the partner prompt (it points to Tele-MANAS, 14416) should be reviewed
  before launch.
