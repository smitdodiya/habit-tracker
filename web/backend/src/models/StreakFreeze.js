import mongoose from 'mongoose';

/**
 * A day that was protected by a streak freeze.
 *
 * Applying a freeze is a *persisted* act, never something recomputed at read
 * time. If freezes were applied lazily during streak calculation, two identical
 * GET requests could return different streaks — and a user's history would
 * quietly rewrite itself. Writing a row makes it deterministic and auditable:
 * the same question always gets the same answer, and support can see exactly
 * which days were covered.
 *
 * One row per protected day, covering every habit the user had due that day.
 * A bad Tuesday is one event; charging a freeze per habit would punish people
 * for having a full routine.
 */
const streakFreezeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // 'YYYY-MM-DD' in the user's timezone — the day being protected.
    date: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: 'date must be YYYY-MM-DD',
      },
    },

    // How many habits were rescued, kept for the "your streak is safe" copy.
    habitsProtected: { type: Number, default: 0 },

    // Cleared once the user has seen the notice, so it shows exactly once.
    seenAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One freeze per user per day. This is what makes the reconcile step
// idempotent: running it twice cannot spend two freezes on the same date.
streakFreezeSchema.index({ userId: 1, date: 1 }, { unique: true });

export const StreakFreeze = mongoose.model('StreakFreeze', streakFreezeSchema);
