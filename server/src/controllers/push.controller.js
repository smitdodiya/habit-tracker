import { z } from 'zod';
import { env } from '../config/env.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { Habit } from '../models/Habit.js';
import { asyncHandler, ApiError } from '../utils/ApiError.js';
import { sendToUser } from '../services/reminder.service.js';

export const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * GET /api/push/public-key
 * The browser needs the VAPID public key to create a subscription. An empty
 * key tells the client push is unavailable so it can fall back gracefully.
 */
export const getPublicKey = asyncHandler(async (_req, res) => {
  res.json({ publicKey: env.vapid.publicKey, enabled: env.vapid.enabled });
});

/** POST /api/push/subscribe — registers this browser for reminders. */
export const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;

  // Upsert on endpoint: re-subscribing the same browser (or a browser that
  // moved to a different account) updates the row rather than duplicating it.
  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        userId: req.user._id,
        keys,
        userAgent: req.headers['user-agent'] ?? '',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({ success: true, id: subscription._id.toString() });
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
