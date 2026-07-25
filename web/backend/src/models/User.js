import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Never the password itself — bcrypt only, per brief §10.3.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 80 },

    // Drives every "what day is it for this user" decision: check-in dates,
    // streak boundaries, and reminder firing times.
    timezone: { type: String, default: 'UTC' },

    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    notificationsEnabled: { type: Boolean, default: true },
    onboardingComplete: { type: Boolean, default: false },

    /**
     * Earned achievements. Stored rather than derived because they need an
     * `unlockedAt` to drive the "new!" state and to be celebrated exactly once.
     * Evaluation stays idempotent — see gamification.service.js.
     *
     * XP and freeze balance are deliberately NOT stored here: both are derived
     * from check-in history, so an idempotent double check-in cannot inflate
     * them.
     */
    achievements: {
      type: [
        {
          _id: false,
          key: { type: String, required: true },
          unlockedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Last day the freeze reconciler has judged, so it never re-walks days it
    // has already settled. 'YYYY-MM-DD' in the user's timezone.
    lastReconciledDate: { type: String, default: null },

    // Last weekly recap the user dismissed, keyed by the week's Monday.
    lastRecapSeen: { type: String, default: null },

    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

/** Hashes `password` and stores it. Callers never touch passwordHash directly. */
userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
};

/** Constant-time comparison against the stored hash. */
userSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

/** The shape sent to clients — never includes the hash. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    timezone: this.timezone,
    theme: this.theme,
    role: this.role,
    notificationsEnabled: this.notificationsEnabled,
    onboardingComplete: this.onboardingComplete,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
