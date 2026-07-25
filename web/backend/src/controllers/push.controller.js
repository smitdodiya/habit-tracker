import { z } from 'zod';
import { env } from '../config/env.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { Habit } from '../models/Habit.js';
import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { sendToUser } from '../services/reminder.service.js';

/**
 * Registration payload for either transport.
 *
 * A browser sends an endpoint URL plus its encryption key pair. The native app
 * sends an Expo push token (`ExponentPushToken[…]`, not a URL) and no keys at
 * all, because Expo handles the encryption on the relay. The discriminated
 * union keeps both honest rather than making every field optional and hoping.
 */
export const subscriptionSchema = z.preprocess(
  // Browsers predate this field and don't send it, so absent means 'web'.
  // Defaulting here rather than inside a branch lets the discriminated union
  // pick the right shape and report only that shape's errors — a plain union
  // would blame the web branch for a perfectly valid Expo payload.
  (value) =>
    value && typeof value === 'object' && !('platform' in value)
      ? { ...value, platform: 'web' }
      : value,
  z.discriminatedUnion('platform', [
    z.object({
      platform: z.literal('web'),
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
      }),
    }),
    z.object({
      platform: z.literal('expo'),
      // Expo tokens look like ExponentPushToken[xxxxxxxx] — deliberately not a URL.
      endpoint: z.string().min(10),
      deviceName: z.string().max(120).optional(),
    }),
  ]),
);

/**
 * GET /api/push/public-key
 * The browser needs the VAPID public key to create a subscription. An empty
 * key tells the client push is unavailable so it can fall back gracefully.
 */
export const getPublicKey = asyncHandler(async (_req, res) => {
  res.json({ publicKey: env.vapid.publicKey, enabled: env.vapid.enabled });
});

/** POST /api/push/subscribe — registers this device (browser or native app). */
export const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys, platform = 'web', deviceName } = req.body;

  // Upsert on endpoint: re-registering the same device — or handing it to a
  // different account — updates the row rather than duplicating it, which is
  // what stops one phone from accumulating a reminder per login.
  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        userId: req.user._id,
        platform,
        ...(platform === 'expo' ? { deviceName: deviceName ?? '' } : { keys }),
        userAgent: req.headers['user-agent'] ?? '',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  res.status(201).json({ success: true, id: subscription._id.toString(), platform });
});

/** DELETE /api/push/subscribe — unregisters this browser. */
export const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) throw ApiError.badRequest('endpoint is required');

  await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
  res.json({ success: true });
});

/**
 * POST /api/push/test
 * Sends a notification immediately, so the user can confirm permissions are
 * working without waiting for a real reminder time.
 */
export const sendTest = asyncHandler(async (req, res) => {
  const result = await sendToUser(req.user._id, {
    title: 'Habit Tracker',
    body: 'Notifications are working. You will be reminded at your chosen times.',
    url: '/today',
  });

  if (result.skipped) throw ApiError.badRequest('Push notifications are not configured on the server');
  if (result.sent === 0) throw ApiError.badRequest('No subscribed devices found for this account');

  res.json({ success: true, sent: result.sent });
});

/**
 * GET /api/push/reminders
 * The Reminders settings screen: every habit that has a reminder configured,
 * plus the ones that don't, so they can be switched on from the same list.
 */
export const listReminders = asyncHandler(async (req, res) => {
  // Ordered the same way as the Today view, deliberately not by enabled-first:
  // sorting on the toggle means a row jumps position the moment you switch it
  // off, which makes turning several off in a row feel like the list is fighting
  // you. A stable order is also the one users have already learned.
  const habits = await Habit.find({ userId: req.user._id, archived: false })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const deviceCount = await PushSubscription.countDocuments({ userId: req.user._id });

  res.json({
    pushEnabled: env.vapid.enabled,
    subscribedDevices: deviceCount,
    reminders: habits.map((habit) => ({
      habitId: habit._id.toString(),
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      enabled: habit.reminder.enabled,
      time: habit.reminder.time,
    })),
  });
});
