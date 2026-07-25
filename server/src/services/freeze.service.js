/**
 * Streak freezes — the forgiveness mechanic.
 *
 * Without this, missing a single day of a 60-day streak drops it to zero, and
 * that is precisely the moment people abandon a habit app. A freeze absorbs one
 * bad day so the run survives, which paradoxically makes streaks *more*
 * motivating: you now have something to protect rather than something to
 * mourn.
 *
 * Balance is entirely DERIVED, never stored as a counter:
 *
 *     earned    = floor(activeDays / EARN_EVERY_DAYS)
 *     used      = number of StreakFreeze rows
 *     available = min(MAX_STORED, earned - used)
 *
 * Nothing to drift, nothing to double-spend on a retried request, and the earn
 * rate can be retuned later without a data migration.
 */

import { CheckIn } from '../models/CheckIn.js';
import { StreakFreeze } from '../models/StreakFreeze.js';
import { addDays, daysBetween, todayKey } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';

/** One freeze per week of showing up. */
export const EARN_EVERY_DAYS = 7;

/** Cap on the stockpile — a freeze should feel scarce enough to matter. */
export const MAX_STORED = 3;

/**
 * How far back reconciliation will reach. If someone has been gone a month,
 * a freeze should not silently rewrite that history — the streak is genuinely
 * over, and pretending otherwise would make the number meaningless.
 */
export const LOOKBACK_DAYS = 7;

/** Current freeze balance and progress toward the next one. */
export async function getFreezeBalance(userId) {
  const [activeDates, used] = await Promise.all([
    CheckIn.distinct('date', { userId }),
    StreakFreeze.countDocuments({ userId }),
  ]);

  const activeDays = activeDates.length;
  const earned = Math.floor(activeDays / EARN_EVERY_DAYS);
  const available = Math.max(0, Math.min(MAX_STORED, earned - used));

  return {
    available,
    used,
    earned,
    activeDays,
    max: MAX_STORED,
    // Progress toward the next freeze, for the "5/7" indicator.
    progress: activeDays % EARN_EVERY_DAYS,
    progressTarget: EARN_EVERY_DAYS,
    daysToNext: EARN_EVERY_DAYS - (activeDays % EARN_EVERY_DAYS),
  };
}

/** Every date this user has protected, as a Set for streak computation. */
export async function getFrozenDates(userId) {
  const freezes = await StreakFreeze.find({ userId }).select('date').lean();
  return new Set(freezes.map((freeze) => freeze.date));
}

/**
 * Spends freezes on any recently missed days, so streaks survive.
 *
 * Runs when the user opens the app. Only ever looks at days that are fully
 * over — today is still in progress and gets its normal grace period from the
 * streak service.
 *
 * Idempotent by construction: the unique (userId, date) index means a repeated
 * run cannot spend two freezes on the same day, and `lastReconciledDate` stops
 * it re-walking days it has already judged.
 *
 * @returns {Promise<Array>} freezes created by this call, for the UI notice
 */
export async function reconcileFreezes(user, habits, today = null) {
  const todayLocal = today ?? todayKey(user.timezone);
  const yesterday = addDays(todayLocal, -1);

  if (habits.length === 0) return [];

  // Never reach further back than the lookback window, and never re-judge a
  // day this user has already been reconciled through.
  const windowStart = addDays(todayLocal, -LOOKBACK_DAYS);
  const afterLast = user.lastReconciledDate ? addDays(user.lastReconciledDate, 1) : windowStart;
  const start = daysBetween(windowStart, afterLast) > 0 ? afterLast : windowStart;

  if (daysBetween(start, yesterday) < 0) return []; // nothing complete to judge

  let { available } = await getFreezeBalance(user._id);
  const created = [];

  for (let date = start; daysBetween(date, yesterday) >= 0; date = addDays(date, 1)) {
    if (available <= 0) break;

    const due = habits.filter(
      (habit) => daysBetween(habit.startDate, date) >= 0 && isScheduledOn(habit, date),
    );
    if (due.length === 0) continue; // a rest day needs no rescue

    const completed = await CheckIn.distinct('habitId', {
      userId: user._id,
      habitId: { $in: due.map((habit) => habit._id) },
      date,
    });

    const missed = due.length - completed.length;
    if (missed === 0) continue; // a perfect day protects itself

    try {
      const freeze = await StreakFreeze.create({
        userId: user._id,
        date,
        habitsProtected: missed,
      });
      created.push(freeze);
      available -= 1;
    } catch (error) {
      // Duplicate key: a concurrent request already protected this day. That
      // is the index doing its job, not a failure.
      if (error.code !== 11000) throw error;
    }
  }

  // Mark everything up to yesterday as judged, including days we could not
  // afford to protect — revisiting them later would spend a freeze on a
  // streak that has already visibly broken.
  user.lastReconciledDate = yesterday;
  await user.save();

  return created;
}

/**
 * Freezes the user has not yet been told about, so the notice appears exactly
 * once. Marks them seen as it reads.
 */
export async function claimUnseenFreezes(userId) {
  const unseen = await StreakFreeze.find({ userId, seenAt: null }).sort({ date: -1 }).lean();
  if (unseen.length === 0) return [];

  await StreakFreeze.updateMany(
    { _id: { $in: unseen.map((freeze) => freeze._id) } },
    { $set: { seenAt: new Date() } },
  );

  return unseen.map((freeze) => ({
    date: freeze.date,
    habitsProtected: freeze.habitsProtected,
  }));
}
