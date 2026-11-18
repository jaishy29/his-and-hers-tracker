# His & Hers Tracker

A private workout and weight-loss tracker for two people. Each of you logs in on your own phone, checks in every day, logs your weight, and keeps your partner on track with high fives, nudges and push notifications.

The app installs on your phone's Home Screen like a regular app. It is a "Progressive Web App": a website that can be installed and can send notifications.

> **Status:** being built one milestone at a time. This README is updated as each piece is finished.
>
> - ✅ Milestone 0: project set up, private GitHub repository
> - ✅ Milestone 1: the full design and all five tabs, using pretend data saved on one device ("practice mode")
> - ⏳ Milestone 2: real logins and a shared database (Supabase)

## What it does

- **Today:** check in with a workout (type, minutes, how hard, optional note) or log a rest day. You can undo today's entry.
- **Partner card:** see whether your partner has checked in, see their streak, and send a high five or a nudge.
- **Activity feed:** check-ins, rest days, nudges, high fives and milestones.
- **Weight:** log your weight any day. Official weigh-ins are Saturdays starting Oct 24, 2026. A chart shows both of you, and a weekly table shows each week's change.
- **Calendar:** fill in missed days, starting Oct 15, 2026.
- **Progress:** pounds lost, progress bars, streaks, workout minutes per week, workout types, and a workout log.
- **Rewards:** a scratch-off ticket for every 5 lb lost, plus one for reaching your goal.
- **Notifications:** a daily reminder at your chosen time, alerts when your partner checks in or sends you something, and a 9 PM alert if your partner hasn't checked in yet. All times use New York time (America/New_York).

## What it's built with (all free)

| Piece | What it does |
|---|---|
| **Next.js** | The app itself: its screens and a small private server part |
| **Supabase** | Login by email link, the database, and live syncing between your two phones |
| **Vercel** | Puts the app on the internet and updates it automatically when new code is pushed to GitHub |
| **Web Push** | Phone notifications (iPhone needs iOS 16.4+ and the app added to the Home Screen) |

## Running it on your laptop

You need **Node.js** installed (the LTS version from https://nodejs.org).

1. Open Terminal in this folder.
2. Copy `.env.example` to `.env.local` and fill in the real values. Never share this file.
3. Install the app's building blocks (only needed the first time):
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000 in your browser.

## Deploying

The step-by-step guide will be added here once the app is ready to go live. In short: sign in to Vercel with GitHub, import this repository, paste in the values from `.env.local`, and click Deploy. After that, every update pushed to GitHub goes live automatically.

## Keeping secrets safe

Passwords and keys live only in `.env.local` (on your laptop) and in Vercel's settings (online). `.env.local` is listed in `.gitignore`, so it is never uploaded to GitHub. `.env.example` shows the names of the values with fake placeholders.

## Folder guide

- `app/`: the page layout, the install settings (`manifest.ts`) and the styles (`globals.css`).
- `components/`: one file per screen (`TodayTab.tsx`, `ProgressTab.tsx`, `CalendarTab.tsx`, `WeightTab.tsx`, `RewardsTab.tsx`) plus the scratch-off ticket.
- `lib/constants.ts`: start weights, goals, dates, workout types and nudge messages. Change them here.
- `lib/store.tsx`: where the app's data is kept and changed.
- `lib/demo.ts`: the pretend data used in practice mode.
- `public/`: app icons and `sw.js`, the small background helper that makes the app installable (and later receives notifications).
- `scripts/make-icons.mjs`: redraws the app icons (`node scripts/make-icons.mjs`).
- `reference/original-index.html`: the original single-file version of the app, kept as the design reference.
