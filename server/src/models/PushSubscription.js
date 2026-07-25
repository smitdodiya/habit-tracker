import mongoose from 'mongoose';

/**
 * One row per browser that granted notification permission. A user with the
 * app open on a laptop and a phone browser has two subscriptions; reminders
 * fan out to all of them.
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The push service URL issued by the browser vendor — unique per device.
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
