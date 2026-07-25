# Database Schema

MongoDB (Mongoose). Four collections. Brief §08 deliverable.

---

## `users`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `email` | String | **unique**, lowercased, trimmed |
| `passwordHash` | String | bcrypt, 12 rounds. `select: false` — never returned unless explicitly requested |
| `name` | String | max 80 |
| `timezone` | String | IANA name, e.g. `Asia/Kolkata`. Drives every "what day is it" decision |
| `theme` | String | `light` \| `dark` \| `system` |
| `role` | String | `user` \| `admin` |
| `notificationsEnabled` | Boolean | Master switch; pauses all reminders without clearing individual times |
| `onboardingComplete` | Boolean | |
| `lastActiveAt` | Date | |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

**Indexes:** `email` (unique)

The password is never stored or logged in any form other than the bcrypt hash
(brief §10.3). `toPublicJSON()` is the only shape sent to clients and cannot
include the hash.

---

## `habits`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId → `users` | |
| `name` | String | max 60 |
| `description` | String | max 240, optional |
| `icon` | String | Phosphor icon name, e.g. `Barbell` |
| `color` | String | 6-digit hex, validated |
| `category` | String | `morning-routine` \| `health` \| `learning` \| `personal` \| `work` \| `custom` |
| `frequency.type` | String | `daily` \| `weekly` \| `custom` |
| `frequency.daysOfWeek` | [Number] | 0=Sun … 6=Sat. Used when type is `custom` |
| `frequency.timesPerWeek` | Number | 1–7. Used when type is `weekly` |
| `reminder.enabled` | Boolean | |
| `reminder.time` | String | `HH:mm`, local to the user's timezone |
| `archived` | Boolean | Keeps history, drops off the Today view |
| `order` | Number | Manual sort position |
| `startDate` | String | `YYYY-MM-DD`. Streaks never look further back than this |
| `createdAt` / `updatedAt` | Date | |

**Indexes:** `userId`, and compound `(userId, archived, order)` backing the
Today view's primary query.

`startDate` exists so a habit created today does not read as "missed" for all
of history.

---

## `checkins`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId → `users` | |
| `habitId` | ObjectId → `habits` | |
| `date` | String | **`YYYY-MM-DD`**, resolved in the user's timezone |
| `note` | String | max 500, optional |
| `mood` | String \| null | `great` \| `good` \| `okay` \| `low` \| `tough` |
| `createdAt` / `updatedAt` | Date | |

**Indexes:**
- `(habitId, date)` — **unique**
- `(userId, date)` — backs heatmap and dashboard range queries
- `userId`, `habitId`

### Why `date` is a string

"Today" depends on the user's timezone, not the server's. A user in
`Asia/Kolkata` checking in at 23:30 local time would be recorded as *tomorrow*
by a UTC server, silently breaking their streak. Resolving the local calendar
date once at write time removes that entire class of bug, and makes the heatmap
an indexed string range scan (`date: { $gte, $lte }`) rather than a date-math
aggregation.

### Why the unique index matters

It is what makes the one-tap check-in idempotent. A double-tap, an impatient
retry, or a duplicated request updates the existing row instead of inserting a
second one and inflating the streak.

---

## `pushsubscriptions`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | |
| `userId` | ObjectId → `users` | |
| `endpoint` | String | **unique** — the push service URL, one per browser/device |
| `keys.p256dh` | String | Client public key |
| `keys.auth` | String | Client auth secret |
| `userAgent` | String | For identifying devices in support |
| `createdAt` / `updatedAt` | Date | |

**Indexes:** `endpoint` (unique), `userId`

One row per browser that granted permission, so a user with the app open on a
laptop and a phone gets reminders on both. Subscriptions the push service
reports as gone (HTTP 404/410) are pruned automatically on the next send.

---

## Relationships

```
users 1 ──< habits 1 ──< checkins
      1 ──< pushsubscriptions
      1 ──< checkins            (denormalised userId, so dashboard range
                                 queries never need a join through habits)
```

Deleting a habit deletes its check-ins in the same operation — orphaned
check-ins would quietly skew every dashboard aggregate afterwards.
