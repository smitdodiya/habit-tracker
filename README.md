# Habit Tracker — Daily Routine & Reminder App

Web application built to the Asense Branding project brief (v1.0, June 2025).
React + Vite front end, Node.js + Express + MongoDB API, sharing one backend so
a React Native app can be added later without duplicating any logic.

---

## Quick start

Two ways to run MongoDB. **Docker is the primary path**; the local-binary
script is there because Docker needs your user to be in the `docker` group,
which requires `sudo` and a re-login.

```bash
# 1. Start MongoDB — either of these
npm run db:up            # Docker (needs your user in the `docker` group)
npm run db:local         # No Docker, no root: downloads MongoDB to ./.mongodb

# 2. Install and seed
npm install
cp server/.env.example server/.env
npm run seed             # demo account + 60 days of history

# 3. Run
npm run dev              # API on :5000, web on :5173
```

Open <http://localhost:5173>.

| Account | Email | Password |
| --- | --- | --- |
| Demo user | `demo@asensebranding.com` | `Password123` |
| Admin | `admin@asensebranding.com` | `Password123` |

### Optional: background reminders

Reminder times are saved and work without this, but delivery to a closed tab
needs Web Push keys. They are self-issued — no account, no third-party service:

```bash
npm run generate:vapid --workspace=server   # paste the output into server/.env
```

### Testing on a phone

`npm run dev` listens on all interfaces, so `http://<your-lan-ip>:5173` works
from a device on the same network. Note that **service workers and push
notifications require HTTPS**, so for those you need a tunnel:

```bash
ngrok http 5173          # or: npx localtunnel --port 5173
```

Tunnel hostnames are pre-allowed in `web/vite.config.js`.

---

## Project structure

```
habit-tracker/
├── docker-compose.yml       MongoDB + mongo-express (DB viewer on :8081)
├── scripts/mongo-local.sh   No-Docker, no-root MongoDB fallback
├── docs/                    API reference, DB schema, Postman collection
│
├── server/                  Node.js + Express REST API
│   └── src/
│       ├── config/          env validation, DB connection
│       ├── models/          User, Habit, CheckIn, PushSubscription
│       ├── routes/          route tables only
│       ├── controllers/     thin request handlers
│       ├── services/        streak, stats, export, reminder logic
│       ├── middleware/      auth, validation, error handling
│       ├── validators/      zod request schemas
│       ├── utils/           date keys, frequency rules, logger
│       ├── scripts/         seed, VAPID key generation
│       └── tests/           streak service unit tests
│
└── web/                     React + Vite
    └── src/
        ├── api/             axios client + endpoint modules
        ├── store/           zustand: auth, habits, theme, toasts
        ├── components/      ui/ habit/ charts/ layout/ feedback/
        ├── pages/           one per screen in the brief
        ├── hooks/           notifications
        ├── lib/             formatting, dates, icon set
        └── styles/          design tokens (light + dark)
```

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API and web together, with reload |
| `npm run build` | Production build of the web app |
| `npm test` | Streak service unit tests |
| `npm run seed` | Rebuild the demo account and history |
| `npm run db:up` / `db:down` | MongoDB via Docker |
| `npm run db:local` / `db:local:stop` | MongoDB without Docker or root |

---

## Design decisions worth knowing

**Check-in dates are `'YYYY-MM-DD'` strings, not timestamps.** "Today" depends
on the *user's* timezone, not the server's. Storing a UTC timestamp means a
user in Asia/Kolkata checking in at 23:30 gets filed under tomorrow by a UTC
server and silently loses a streak. The date key, resolved once at write time
in the user's timezone, removes that whole class of bug — and makes the heatmap
an indexed string range scan. See `server/src/utils/date.js`.

**Streaks are frequency-aware and counted in the habit's own unit.** Daily and
custom-day habits streak in days; a flexible "3× per week" habit streaks in
*weeks*, because counting it in days would break the streak on every intended
off-day. The API returns a `unit` field so the UI always says the right noun.
An unfinished today never breaks a streak — the day isn't over yet. Rules are
documented and unit-tested in `server/src/services/streak.service.js`.

**Check-in is idempotent.** A unique index on `(habitId, date)` means a
double-tap or a retried request updates the existing row rather than inflating
the streak.

**Streak freezes forgive one bad day.** You earn one every 7 active days
(max 3), and it's spent automatically when a day is missed, so a 60-day streak
survives. This is the single most important retention feature in the app:
losing a long streak to one bad day is exactly when people quit, and a run you
can protect is more motivating than one you can only mourn. A frozen day is
neutral in the maths — it neither breaks nor extends the streak — except that
habits you *did* complete on a partially-missed day still earn their
increment. See `server/src/services/freeze.service.js`.

**XP and the freeze balance are derived, never stored as counters.** This is a
correctness decision, not tidiness. Because check-in is idempotent, a
double-tap updates the same row; an `$inc`-style XP counter would award it
twice. A formula over stored history — `xp = 10×checkIns + 5×perfectDays +
25×milestones` — cannot double-count, and the curve can be retuned without a
migration. Achievements *are* stored, since they need an `unlockedAt`, but are
evaluated idempotently so a badge is only ever celebrated once.

**Applying a freeze is written down, not computed on read.** Forgiving missed
days on the fly during streak calculation would mean two identical `GET`
requests could return different streaks. A `StreakFreeze` row makes it
deterministic, and its unique `(userId, date)` index makes the reconcile step
idempotent.

**The accent colour is split into three roles.** The brief specifies `#E94560`
*and* WCAG AA. That colour only reaches 3.5:1 on the off-white background and
3.85:1 behind white text — both below the 4.5:1 threshold for body text. So
`--accent` (`#E94560`) is used for fills, chips and chart marks where the 3:1
non-text threshold applies, and `--accent-strong` (`#D12B47`) wherever the
colour carries text (5.07:1 behind white, 4.61:1 on the background). They read
as the same colour. See `web/src/styles/tokens.css`.

**Dark mode is a second designed palette**, built from the navy family with the
accent lifted to `#FF6B84` for legibility — not an inversion.

**API responses are `no-store` with ETags disabled.** Express adds an ETag to
JSON by default, so a repeated GET answers `304` with an empty body — which a
client doing `const { x } = await api.get(...)` silently reads as `undefined`.
These responses are per-user and change on every check-in, so conditional
caching bought nothing and cost correctness.

---

## Testing

```bash
npm test                 # 51 unit tests: streak rules + gamification
```

The streak service has unit tests because it is the one place where a subtle
bug is invisible until it costs someone a streak they actually earned: the
grace period for an unfinished day, custom-day scheduling, weekly proration,
frozen days, and milestone detection are all pinned down. The gamification
tests pin the level curve and, importantly, that a duplicate check-in cannot
inflate XP or re-fire an achievement.

Beyond that, the app was driven end to end in a real browser: onboarding,
signup validation, habit CRUD, check-in/undo/idempotency, notes, reminders,
exports, admin gating, dark mode, session persistence, and layout at 375 /
768 / 1440 px. Push was verified through the full path — browser subscription,
server storage, FCM delivery — and the reminder cron was tested against five
selection cases (due now, deduplication, already-completed, wrong time, not
scheduled today).

---

## Deploying

**Web** — `npm run build` produces `web/dist`. On Vercel set the root to `web`,
build `npm run build`, output `dist`, and point `/api` at the API deployment.

**API** — any Node host. Set `MONGODB_URI` (a MongoDB Atlas connection string
is a drop-in replacement for the local one), strong `JWT_ACCESS_SECRET` and
`JWT_REFRESH_SECRET`, `CLIENT_ORIGIN`, and the VAPID keys. The server refuses
to boot in production on the placeholder development secrets.

Before shipping, remove the demo-credentials panel on the login screen
(`web/src/pages/Auth.jsx`, marked with a comment).

---

## Against the brief

| Brief requirement | Status |
| --- | --- |
| User auth — email | Done (JWT + bcrypt, 12 rounds) |
| User auth — Google / Apple | Not built (descoped; integration points noted) |
| Add habit — name, icon, colour, frequency | Done |
| Daily check-in — one tap | Done, idempotent |
| Streak counter + 7/30/100d milestones | Done, frequency-aware |
| Reminders / notifications | Done (Web Push + in-page fallback) |
| Progress dashboard — heatmap + completion % | Done |
| Habit categories | Done |
| Notes per habit | Done, with optional mood |
| Dark mode | Done (designed palette) |
| Cloud sync | Done (server-side state, any device) |
| Export PDF / CSV | Done |
| Onboarding — 3 steps | Done |
| All 9 screens | Done |
| Admin panel | Done (read-only) |
| API docs / Postman | `docs/` |
| Mobile apps (iOS / Android) | Not in scope for this build |

## Beyond the brief

Added to make the app one people actually return to:

| Feature | What it does |
| --- | --- |
| **Streak freezes** | Earn one per 7 active days (max 3); spent automatically to save a missed day |
| **XP & levels** | Derived from history, with title bands from Getting Started to Unstoppable |
| **14 achievements** | Including secret ones shown as "???" until earned |
| **Share cards** | 1080×1350 PNG generated on canvas, straight to WhatsApp/Instagram via the Web Share API |
| **Weekly recap** | Last week in review at `/recap`, with a once-per-week banner |
| **Habit templates** | 12 ready-made habits, so a new user never faces a blank form |
| **Record nudges** | "3 days from your best ever", shown only within 5 days of a record |
| **Insights** | Strongest weekday, peak time of day, most consistent habit — withheld below 14 check-ins |
