import mongoose from 'mongoose';

/**
 * One row per device that granted notification permission — a laptop browser,
 * a phone browser and the native app are three separate rows, and reminders
 * fan out to all of them.
 *
 * Two transports live in this one collection because they are the same concept
 * with different plumbing:
 *
 *   platform: 'web'   Web Push. Needs the browser-issued endpoint URL and the
 *                     p256dh/auth key pair, encrypted with our VAPID identity.
 *   platform: 'expo'  Expo Push. VAPID is a browser protocol and does not
 *                     exist on native, so the device supplies an Expo push
 *                     token instead and Expo's service relays to APNs/FCM.
 *
 * The `endpoint` field is the natural key for both: for Expo rows it holds the
 * token itself, which keeps the unique index — and therefore the "one row per
 * device, re-registering updates rather than duplicates" behaviour — working
 * identically for both transports.
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    platform: { type: String, enum: ['web', 'expo'], default: 'web', index: true },

    // Web: the push service URL. Expo: the Expo push token. Unique either way.
    endpoint: { type: String, required: true, unique: true },

    // Web Push only — the encryption key pair. Absent on native rows.
    keys: {
      p256dh: { type: String },
      auth: { type: String },
    },

    // Expo only — helps target a build and is useful for debugging delivery.
    deviceName: { type: String, default: '' },

    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

/** Web Push rows are unusable without their key pair; native rows never have one. */
pushSubscriptionSchema.pre('validate', function requireKeysForWeb(next) {
  if (this.platform === 'web' && !(this.keys?.p256dh && this.keys?.auth)) {
    return next(new Error('Web push subscriptions require keys.p256dh and keys.auth'));
  }
  next();
});

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
