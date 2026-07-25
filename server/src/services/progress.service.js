/**
 * Assembles a user's full progress picture: XP, level, freezes, achievements.
 *
 * Kept in one place because the check-in response, the Today view and the
 * progress endpoint all need the same computation, and they must never
 * disagree — a level that changes depending on which screen you look at would
 * be worse than no level at all.
 */

import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { StreakFreeze } from '../models/StreakFreeze.js';
import { computeStreak } from './streak.service.js';
import { getFreezeBalance, getFrozenDates } from './freeze.service.js';
import {
  computeXp,
  levelFromXp,
  findPerfectDays,
  buildAchievementSnapshot,
  evaluateAchievements,
  listAchievements,
} from './gamification.service.js';
import { groupDatesByHabit } from './stats.service.js';
import { todayKey } from '../utils/date.js';

/**
 * Recomputes everything and persists any newly earned achievements.
 *
 * @param options.persist  when false, evaluates without saving (read paths)
 * @returns progress payload plus `newlyUnlocked` for celebration
 */
export async function buildProgress(user, { persist = false } = {}) {
  const today = todayKey(user.timezone);

  const [habits, checkIns, freezesUsed, frozenDates, freezes] = await Promise.all([
    Habit.find({ userId: user._id }).lean(),
    CheckIn.find({ userId: user._id }).select('habitId date note createdAt').lean(),
    StreakFreeze.countDocuments({ userId: user._id }),
    getFrozenDates(user._id),
    getFreezeBalance(user._id),
  ]);

  const datesByHabit = groupDatesByHabit(checkIns);
  const streaks = habits.map((habit) =>
    computeStreak(habit, datesByHabit.get(habit._id.toString()) ?? new Set(), today, frozenDates),
  );

  const perfectDays = findPerfectDays(habits, checkIns);

  // Milestones already reached, across every habit — each was a moment worth
  // rewarding, so each is worth XP.
  const milestones = streaks.reduce((total, streak) => total + countMilestones(streak), 0);

  const xp = computeXp({
    checkIns: checkIns.length,
    perfectDays: perfectDays.length,
    milestones,
  });

  const snapshot = buildAchievementSnapshot({
    habits,
    checkIns,
    user,
    streaks,
    freezesUsed,
    perfectDays,
  });

  const { newlyUnlocked } = evaluateAchievements(user, snapshot);
  if (persist && newlyUnlocked.length > 0) await user.save();

  return {
    ...levelFromXp(xp),
    freezes,
    perfectDays: perfectDays.length,
    totalCheckIns: checkIns.length,
    achievements: listAchievements(user),
    unlockedCount: (user.achievements ?? []).length,
    newlyUnlocked,
  };
}

/**
 * How many milestone thresholds a streak has passed.
 * Uses `longest` rather than `current`, so XP already earned is never taken
 * away when a streak resets — losing a streak is punishment enough.
 */
function countMilestones(streak) {
  const thresholds = streak.unit === 'week' ? [4, 12, 26, 52] : [7, 30, 100, 365];
  return thresholds.filter((threshold) => streak.longest >= threshold).length;
}
