# API Reference

Base URL: `/api` · JSON throughout · JWT bearer auth.

## Authentication model

- **Access token** — short-lived (15 min), returned in the login/signup body,
  held in memory by the client and sent as `Authorization: Bearer <token>`.
  Never in localStorage, where any injected script could read it.
- **Refresh token** — 30 days, set as an `httpOnly` cookie on `/api/auth`,
  unreadable to JavaScript. Rotated on every use.

A `401` on any call means the access token expired; call `POST /auth/refresh`
and replay. The web client does this automatically.

## Errors

```jsonc
{ "error": { "message": "Validation failed",
             "details": [ { "field": "name", "message": "Habit name is required" } ] } }
```

`details` is present only for validation failures. Status codes: `400`
validation, `401` unauthenticated, `403` forbidden, `404` not found, `409`
conflict, `500` server error.

---

## Auth

### `POST /auth/signup`
```jsonc
{ "name": "Ada", "email": "ada@example.com", "password": "Password123",
  "timezone": "Asia/Kolkata" }   // timezone optional, defaults to UTC
```
`201` → `{ user, accessToken }`, sets the refresh cookie.
Password must be 8+ characters with at least one letter and one number.

### `POST /auth/login`
```jsonc
{ "email": "ada@example.com", "password": "Password123" }
```
`200` → `{ user, accessToken }`. Returns the same message for an unknown email
and a wrong password, so accounts cannot be enumerated.

### `POST /auth/refresh`
No body; uses the refresh cookie. `200` → `{ user, accessToken }`.

### `POST /auth/logout`
Clears the refresh cookie. `200` → `{ "success": true }`

### `GET /auth/me` 🔒
`200` → `{ user }`

### `PATCH /auth/me` 🔒
Any subset of `{ name, timezone, theme, notificationsEnabled, onboardingComplete }`.

### `POST /auth/change-password` 🔒
```jsonc
{ "currentPassword": "…", "newPassword": "…" }
```

---

## Habits 🔒

### `GET /habits?includeArchived=false`
`200` → `{ habits: [ { …habit, stats } ] }`

### `GET /habits/today`
The Today view in one call.
```jsonc
{
  "date": "2026-07-25",
  "habits": [ { "id": "…", "name": "Morning Meditation", "icon": "Sun",
                "color": "#E94560", "category": "morning-routine",
                "frequency": { "type": "daily", "daysOfWeek": [], "timesPerWeek": 3 },
                "reminder": { "enabled": true, "time": "07:00" },
                "dueToday": true,
                "checkIn": { "date": "2026-07-25", "note": "", "mood": null },
                "stats": { "current": 33, "longest": 33, "unit": "day",
                           "total": 52, "completionRate": 0.87,
                           "nextMilestone": 100, "milestoneReached": null,
                           "completedToday": true, "scheduledToday": true } } ],
  "summary": { "due": 4, "completed": 3, "extraCompleted": 0 }
}
```

**`stats.unit`** is `"day"` for daily and custom-day habits, `"week"` for
flexible weekly ones — render the noun the API gives you.
**`stats.milestoneReached`** is non-null only when the current streak lands
exactly on a milestone; that is the signal to fire the celebration.

### `POST /habits`
```jsonc
{ "name": "Evening walk", "description": "", "icon": "PersonSimpleRun",
  "color": "#27AE60", "category": "health",
  "frequency": { "type": "custom", "daysOfWeek": [1, 4] },
  "reminder": { "enabled": true, "time": "18:00" },
  "startDate": "2026-07-25" }   // optional, defaults to the user's today
```
`201` → `{ habit }`. `frequency.daysOfWeek` is required when type is `custom`.

### `GET /habits/:id`
`200` → `{ habit, stats, checkIns, notes }` — `notes` is the subset of
check-ins carrying a note, for the notes log.

### `PATCH /habits/:id`
Any subset of the create fields, plus `archived` and `order`.

### `DELETE /habits/:id`
Deletes the habit **and its check-in history**.

### `PATCH /habits/reorder`
```jsonc
{ "order": ["habitId1", "habitId2", "habitId3"] }
```

---

## Check-ins 🔒

### `POST /habits/:id/checkin`
```jsonc
{ "date": "2026-07-25",       // optional — omit for "today", the one-tap path
  "note": "Felt good",        // optional
  "mood": "good" }            // optional: great|good|okay|low|tough
```
`201` → `{ checkIn, stats }`

**Idempotent.** A unique index on `(habitId, date)` means calling this twice
for the same day updates the note and mood rather than adding a second
check-in. Safe to retry.

Rejects future dates and dates before the habit's `startDate`.

### `DELETE /habits/:id/checkin?date=YYYY-MM-DD`
Undo. Defaults to today. `200` → `{ success, stats }`

### `GET /habits/:id/checkins?from=&to=`
Defaults to the last 90 days.

---

## Stats 🔒

### `GET /stats/dashboard?range=7d|30d|90d|365d`
Answers the entire Progress Dashboard in one request.
```jsonc
{
  "range": { "key": "30d", "start": "2026-06-26", "end": "2026-07-25",
             "today": "2026-07-25" },
  "summary": { "totalHabits": 6, "dueToday": 4, "doneToday": 3,
               "checkInsInRange": 104, "completionRate": 0.675,
               "currentBestStreak": 33, "longestStreak": 33,
               "activeStreaks": 6 },
  "heatmap":  [ { "date": "2026-06-26", "completed": 4, "scheduled": 5, "rate": 0.8 } ],
  "weekly":   [ { "weekStart": "2026-07-20", "weekEnd": "2026-07-26",
                  "label": "20 Jul", "completed": 22, "scheduled": 32, "rate": 0.69 } ],
  "categories": [ { "category": "health", "completed": 41, "scheduled": 52,
                    "habits": 2, "rate": 0.79 } ]
}
```
Streak figures are lifetime; `completionRate` and the series are scoped to the
range. `scheduled` counts only habits that were both live and due that day, so
a habit created last week does not make the month before it look failed.

---

## Export 🔒

### `GET /export?format=csv|pdf&range=7d|30d|90d|365d`
Streams a file with `Content-Disposition: attachment`.
CSV is one row per check-in; PDF is a formatted report with per-habit streaks,
completion rates and the notes log.

The request needs the `Authorization` header, so a plain `<a href>` will not
work — fetch it as a blob.

---

## Push 🔒

### `GET /push/public-key`
`200` → `{ publicKey, enabled }`. `enabled: false` means the server has no
VAPID keys configured; fall back to in-page notifications.

### `POST /push/subscribe`
```jsonc
{ "endpoint": "https://fcm.googleapis.com/fcm/send/…",
  "keys": { "p256dh": "…", "auth": "…" } }
```
Upserts on `endpoint`, so re-subscribing the same browser is safe.

### `DELETE /push/subscribe`
```jsonc
{ "endpoint": "…" }
```

### `POST /push/test`
Sends a notification immediately, to confirm permissions work without waiting
for a real reminder.

### `GET /push/reminders`
`200` → `{ pushEnabled, subscribedDevices, reminders: [...] }` — every live
habit, in Today-view order, whether or not it has a reminder set.

---

## Admin 🔒 (role `admin`)

| Endpoint | Returns |
| --- | --- |
| `GET /admin/overview` | Totals, active users today, 14-day check-in series |
| `GET /admin/users?search=` | Up to 100 users with habit and check-in counts |
| `GET /admin/habits` | 100 most recent habits with owners |
| `GET /admin/activity` | 60 most recent check-ins |

Read-only by design. Non-admins get `403`.

---

## Health

### `GET /health`
`200` → `{ status, database, timestamp }`. No auth.

---

## Caching

All `/api` responses send `Cache-Control: no-store` and ETags are disabled.
These responses are per-user and change on every check-in, and a `304` with an
empty body would silently deserialise to `undefined` in the client.
