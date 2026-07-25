/**
 * Reminder delivery (brief §03 feature 5).
 *
 * A cron job ticks once a minute, works out the local wall-clock time for each
 * user with reminders due, and pushes a notification for any habit that is
 * scheduled today, due right now, and not already ticked off.
 *
 * Two delivery transports sit behind one interface, because "notify this user"
 * should not care what they happen to be holding:
 *
 *   Browsers    Web Push, with self-generated VAPID keys — no external service
 *               and no account required.
 *   Native app  Expo Push, which relays to APNs and FCM on our behalf, so this
 *               server needs no Apple or Google credentials either.
 *
 * Either can be unavailable without affecting the other: missing VAPID keys
 * disable browser reminders only, and the native app keeps working.
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

/** Expo's public push relay. No credentials required for unsigned sends. */
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

let configured = false;

/** Wires the VAPID identity into web-push. Safe to call more than once. */
export function configureWebPush() {
  if (configured || !env.vapid.enabled) return env.vapid.enabled;
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
  configured = true;
  return true;
}

/**
 * Sends a payload to every device the user has registered, across both
 * transports — browsers via Web Push, the native app via Expo Push.
 *
 * Dead registrations are pruned as they are discovered (a browser that cleared
 * its data, an uninstalled app), so the collection doesn't silently fill with
 * endpoints that will never deliver again.
 *
 * The two transports are attempted independently: a misconfigured VAPID key
 * must not stop native reminders, and vice versa.
 */
export async function sendToUser(userId, payload) {
  const subscriptions = await PushSubscription.find({ userId });
  if (subscriptions.length === 0) return { sent: 0, skipped: false };

  const web = subscriptions.filter((s) => s.platform !== 'expo');
  const expo = subscriptions.filter((s) => s.platform === 'expo');

  const [webSent, expoSent] = await Promise.all([
    sendWebPush(web, payload),
    sendExpoPush(expo, payload),
  ]);

  const sent = webSent + expoSent;
  // "Skipped" means there was nothing we could even attempt — used by the
  // test-notification endpoint to explain itself rather than fail silently.
  const skipped = sent === 0 && web.length > 0 && !env.vapid.enabled && expo.length === 0;

  return { sent, skipped, web: webSent, expo: expoSent };
}

/** Web Push — browsers, encrypted with our self-issued VAPID identity. */
async function sendWebPush(subscriptions, payload) {
  if (subscriptions.length === 0 || !configureWebPush()) return 0;

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
          logger.warn('Web push delivery failed', error.statusCode ?? error.message);
        }
      }
    }),
  );
  return sent;
}

/**
 * Expo Push — the native app. Expo relays to APNs and FCM on our behalf, so
 * this needs no Apple or Google credentials of its own.
 *
 * Posted directly rather than through the Expo SDK: it is one documented HTTP
 * endpoint, and a dependency for a single fetch would be hard to justify.
 */
async function sendExpoPush(subscriptions, payload) {
  if (subscriptions.length === 0) return 0;

  // Expo accepts up to 100 messages per request.
  const messages = subscriptions.map((subscription) => ({
    to: subscription.endpoint,
    title: payload.title ?? 'Habit Tracker',
    body: payload.body ?? 'Time for your habit.',
    sound: 'default',
    priority: 'high',
    // Carried through to the app so tapping the notification can deep-link
    // straight to the habit rather than dumping the user on the home screen.
    data: { habitId: payload.habitId, url: payload.url ?? '/today' },
    channelId: 'reminders',
  }));

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      logger.warn('Expo push request failed', response.status);
      return 0;
    }

    const { data = [] } = await response.json();
    let sent = 0;

    for (const [index, ticket] of data.entries()) {
      if (ticket.status === 'ok') {
        sent += 1;
        continue;
      }
      // DeviceNotRegistered is Expo's "this install is gone" — prune it, the
      // same as a 410 from a browser push service.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await PushSubscription.deleteOne({ _id: subscriptions[index]._id });
      } else {
        logger.warn('Expo push rejected', ticket.message ?? ticket.details?.error);
      }
    }

    return sent;
  } catch (error) {
    logger.warn('Expo push delivery failed', error.message);
    return 0;
  }
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
  // Note: no VAPID check here. Web Push needs VAPID keys, but Expo Push does
  // not — gating the whole sweep on VAPID would silently disable reminders for
  // every native device whenever the browser keys happened to be unset.

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
    // Not fatal: native reminders still work, so the scheduler still runs.
    logger.warn(
      'Web Push disabled — no VAPID keys configured. Browser reminders are off; ' +
        'native (Expo) reminders are unaffected. ' +
        'Run `npm run generate:vapid --workspace=backend` to enable browser push.',
    );
  } else {
    configureWebPush();
  }

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
