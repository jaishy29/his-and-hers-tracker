# His & Hers Tracker

A private workout and weight-loss tracker for two people. Each of you logs in on your own phone, checks in every day, logs your weight, and keeps your partner on track with high fives, nudges and push notifications.

The app installs on your phone's Home Screen like a regular app. It is a "Progressive Web App": a website that can be installed and can send notifications.

**Live app:** https://his-and-hers-tracker.vercel.app

> **Status:** all milestones done.
>
> - ✅ Milestone 0: project set up, private GitHub repository
> - ✅ Milestone 1: the full design and all five tabs, using pretend data saved on one device ("practice mode")
> - ✅ Milestone 2: real logins (email + password), a shared database and live syncing (Supabase)
> - ✅ Milestone 3: Today screen on real data: Undo also removes the feed post, one high five per check-in, late check-in banner
> - ✅ Milestones 4–5: Weight, Calendar, Progress and Rewards checked on real data; "unlocked a scratch-off" is never announced twice
> - ✅ Milestone 6: push notifications (partner alerts, daily reminder, 9 PM missed check-in). Timed reminders switch on once the app is online.
> - ✅ Milestone 7: live on Vercel, updates deploy automatically from GitHub, reminder scheduler running every 5 minutes

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
| **Supabase** | Login (email + password), the database, live syncing between your two phones, and the reminder scheduler |
| **Vercel** | Puts the app on the internet and updates it automatically when new code is pushed to GitHub |
| **Web Push** | Phone notifications (iPhone needs iOS 16.4+ and the app added to the Home Screen) |

## Setting up the database (one time)

1. Create a free project at https://supabase.com.
2. **Authentication → Sign In / Providers:** turn **Email** on and **Confirm email** off. (Login uses email + password. No emails are ever sent.)
3. **SQL Editor → New query:** paste all of `supabase/schema.sql` and click **Run**. It's safe to run again after updates.
4. **Project Settings → API Keys:** copy the Project URL and the **publishable** key into `.env.local` (see `.env.example`).
5. Each person opens the app, creates an account, and picks **His** or **Hers**. A side can only be claimed once.
6. After both of you have joined, turn **Allow new users to sign up** off in Authentication → Sign In / Providers, so nobody else can make an account.

How the data is protected: logged-out visitors can't read anything. Only the two linked accounts can see the data, and each person can only change their own side. These rules live in the database itself (`supabase/schema.sql`), not just in the app.

Without the Supabase keys, the app runs in **practice mode** with pretend data saved only in that browser.

## How notifications work

- **Turning them on:** each person taps **Turn on notifications** on the Today screen, on each phone. On iPhone this only works after the app is added to the Home Screen and opened from there (iOS 16.4 or newer).
- **Partner alerts** (check-in, rest day, nudge, high five, scratch-off unlocked): sent instantly by the app's server (`app/api/notify`) right after the post is saved.
- **Timed reminders** (`app/api/cron/reminders`): a scheduler in Supabase calls this every 5 minutes. It sends your daily reminder once you're past your check-in time, and at 9 PM tells your partner if you still haven't checked in. Each is sent at most once a day (tracked in the `reminder_log` table). Its password is generated inside the database (Supabase Vault) and checked with `check_cron_secret()`; `CRON_SECRET` also works, for manual testing.
- **Keys:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` identify the app to Apple and Google's notification services (make new ones with `npx web-push generate-vapid-keys`). `SUPABASE_SECRET_KEY` lets the server look up whom to notify. Both private values stay in `.env.local` and in Vercel's settings, never on GitHub.

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

The app is hosted on **Vercel** (free Hobby plan) and connected to this GitHub repository. **Every change pushed to the `main` branch goes live automatically** in about a minute. To check on a deploy, open https://vercel.com → **his-and-hers-tracker → Deployments**.

Setting it up from scratch (already done, kept here for reference):

1. Go to https://vercel.com/new, choose **Continue with GitHub**, and pick the free **Hobby** plan.
2. Give Vercel access to **only** the `his-and-hers-tracker` repository, then click **Import**.
3. Add the private settings (Project → **Settings → Environment Variables**, Production): the 7 values from `.env.local`. The easy way from Terminal in this folder, after `npx vercel login` and `npx vercel link`:
   ```bash
   for NAME in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_PUBLIC_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT CRON_SECRET SUPABASE_SECRET_KEY; do grep "^$NAME=" .env.local | cut -d= -f2- | tr -d '\n' | npx vercel env add "$NAME" production --force; done
   ```
4. Deploy (push to GitHub, or click **Redeploy** in Vercel).
5. In Supabase **SQL Editor**, run the "Reminder scheduler" section at the end of `supabase/schema.sql`. If the app's address ever changes, update the `url` there and run it again.

**If you change a setting in Vercel,** it only takes effect after a new deploy (Deployments → ⋯ → **Redeploy**).

## Installing on your phones

**iPhone (iOS 16.4 or newer):**
1. Open https://his-and-hers-tracker.vercel.app in **Safari** (not Chrome; iPhone only installs apps from Safari).
2. Tap **Share** (the square with an arrow) → scroll down → **Add to Home Screen** → **Add**.
3. Open **His & Hers** from your Home Screen, log in, then on Today tap **Turn on notifications** → **Allow**.

**Android:**
1. Open the link in **Chrome** → tap **⋮** → **Add to Home screen** (or **Install app**).
2. Open it from the Home Screen, log in, tap **Turn on notifications** → **Allow**.

Each phone needs notifications turned on separately. Use **Send me a test** to check.

## Inviting your partner (checklist)

1. Send them the link: https://his-and-hers-tracker.vercel.app
2. They install it on their phone (see above) and open it from the Home Screen.
3. They tap **I'm new: create an account**, use their own email and a password (8+ characters), and pick the free side (**His** or **Hers**).
4. They set **My name** and **Daily check-in time** under My settings.
5. They tap **Turn on notifications** → **Allow**, then **Send me a test**.
6. Test together: one of you sends a nudge; the other's phone should buzz within seconds.
7. **Lock sign-ups:** in Supabase → Authentication → Sign In / Providers, turn **Allow new users to sign up** off and click **Save**. Logins keep working; nobody new can create an account.

**Forgot a password?** There's no "reset by email" (the app never sends emails). Save both passwords in a password manager. If one is lost, it can be reset with Supabase's admin tools using the secret key (ask Claude Code to help), and the account keeps its side and history.

## Keeping secrets safe

Passwords and keys live only in `.env.local` (on your laptop) and in Vercel's settings (online). `.env.local` is listed in `.gitignore`, so it is never uploaded to GitHub. `.env.example` shows the names of the values with fake placeholders.

## Folder guide

- `app/`: the page layout, the install settings (`manifest.ts`) and the styles (`globals.css`).
- `components/`: one file per screen (`TodayTab.tsx`, `ProgressTab.tsx`, `CalendarTab.tsx`, `WeightTab.tsx`, `RewardsTab.tsx`) plus the scratch-off ticket.
- `lib/constants.ts`: start weights, goals, dates, workout types and nudge messages. Change them here.
- `lib/store.tsx`: picks live mode (`lib/liveStore.tsx`, Supabase) or practice mode (`lib/demoStore.tsx`).
- `lib/supabase.ts`: the connection to Supabase.
- `supabase/schema.sql`: the database tables and security rules.
- `lib/demo.ts`: the pretend data used in practice mode.
- `public/`: app icons and `sw.js`, the small background helper that makes the app installable and shows notifications.
- `app/api/`: the server routes: `notify` (partner alerts), `push/test` ("Send me a test") and `cron/reminders` (timed reminders).
- `lib/server/`: server-only code for sending notifications. Uses the secret key.
- `components/NotificationsCard.tsx`: the "Turn on notifications" card.
- `scripts/make-icons.mjs`: redraws the app icons (`node scripts/make-icons.mjs`).
- `reference/original-index.html`: the original single-file version of the app, kept as the design reference.
