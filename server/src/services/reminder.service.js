/**
 * Reminder delivery (brief §03 feature 5).
 *
 * A cron job ticks once a minute, works out the local wall-clock time for each
 * user with reminders due, and pushes a notification for any habit that is
 * scheduled today, due right now, and not already ticked off.
 *
 * Push uses the Web Push protocol with self-generated VAPID keys — no external
 * service and no account required. If no keys are configured the job simply
 * does nothing, and the client falls back to in-page notifications.
 */

import cron from 'node-cron';
import webpush from 'web-push';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { todayKey, timeOfDayFor } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';
import { logger } from '../utils/logger.js';

let configured = false;

/** Wires the VAPID identity into web-push. Safe to call more than once. */
export function configureWebPush() {
  if (configured || !env.vapid.enabled) return env.vapid.enabled;
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
  configured = true;
  return true;
}

/**
 * Sends a payload to every browser the user has subscribed.
 * Subscriptions the push service reports as gone (404/410) are pruned, so a
 * cleared browser or uninstalled PWA doesn't accumulate dead rows forever.
 */
export async function sendToUser(userId, payload) {
  if (!configureWebPush()) return { sent: 0, skipped: true };

  const subscriptions = await PushSubscription.find({ userId });
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: subscription._id });
        } else {
          logger.warn('Push delivery failed', error.statusCode ?? error.message);
        }
      }
    }),
  );

  return { sent, skipped: false };
}

/**
 * Guards against sending the same reminder twice — for instance if a cron tick
 * runs long and overlaps the next one. Keyed by habit + date + time, and reset
 * whenever the date rolls over.
 */
const sentThisRun = { date: null, keys: new Set() };

function alreadySent(key, date) {
  if (sentThisRun.date !== date) {
    sentThisRun.date = date;
    sentThisRun.keys.clear();
  }
  if (sentThisRun.keys.has(key)) return true;
  sentThisRun.keys.add(key);
  return false;
}

/**
 * One reminder sweep. Exported separately from the schedule so it can be
 * triggered manually (and tested) without waiting for a cron tick.
 */
export async function dispatchDueReminders(now = new Date()) {
  if (!env.vapid.enabled) return { dispatched: 0 };

  // Only users who want notifications, and only habits with a live reminder.
  const habits = await Habit.find({ archived: false, 'reminder.enabled': true }).lean();
  if (habits.length === 0) return { dispatched: 0 };

  const userIds = [...new Set(habits.map((h) => h.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds }, notificationsEnabled: true }).lean();
  const usersById = new Map(users.map((u) => [u._id.toString(), u]));

  let dispatched = 0;

  for (const habit of habits) {
    const user = usersById.get(habit.userId.toString());
    if (!user) continue;

    const localDate = todayKey(user.timezone);
    const localTime = timeOfDayFor(now, user.timezone);

    if (habit.reminder.time !== localTime) continue;
    if (!isScheduledOn(habit, localDate)) continue;
    if (localDate < habit.startDate) continue;

    const dedupeKey = `${habit._id}:${localDate}:${localTime}`;
    if (alreadySent(dedupeKey, localDate)) continue;

    // Nothing more annoying than being nagged about something already done.
    const done = await CheckIn.exists({ habitId: habit._id, date: localDate });
    if (done) continue;

    await sendToUser(user._id, {
      title: habit.name,
      body: `Time for your habit — keep the streak going.`,
      habitId: habit._id.toString(),
      color: habit.color,
      url: '/today',
    });
    dispatched += 1;
  }

  return { dispatched };
}

/** Starts the once-a-minute sweep. Returns the task so callers can stop it. */
export function startReminderScheduler() {
  if (!env.vapid.enabled) {
    logger.warn(
      'Web Push disabled — no VAPID keys configured. ' +
        'Run `npm run generate:vapid --workspace=server` to enable background reminders.',
    );
    return null;
  }

  configureWebPush();

  const task = cron.schedule('* * * * *', async () => {
    try {
      const { dispatched } = await dispatchDueReminders();
      if (dispatched > 0) logger.info(`Reminders dispatched: ${dispatched}`);
    } catch (error) {
      logger.error('Reminder sweep failed', error.message);
    }
  });

  logger.info('Reminder scheduler started (every minute)');
  return task;
}
