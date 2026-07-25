/**
 * Streak and completion maths.
 *
 * This is the one place in the codebase where a subtle bug is invisible until
 * it costs a user a streak they actually earned, so the rules are spelled out
 * explicitly here and covered by unit tests in `tests/streak.test.js`.
 *
 * Units
 * -----
 * Daily and custom-day habits streak in DAYS: consecutive scheduled days
 * completed. Weekly habits ("3 times a week") streak in WEEKS, because no
 * individual day is mandatory — counting them in days would break the streak
 * every single off-day, which is the opposite of what the user asked for.
 * The returned `unit` tells the client which noun to render.
 *
 * Today's grace period
 * --------------------
 * An unfinished today never breaks a streak. Until the day is over the user
 * still has time, so a habit due today but not yet ticked keeps yesterday's
 * streak intact — it just doesn't add to it. The same applies to the current,
 * in-progress week for weekly habits.
 */

import { daysBetween } from '../utils/date.js';
import { isScheduledOn, scheduledKeysBetween, weeksBetween, weeklyTargetFor } from '../utils/frequency.js';

/** Milestones worth celebrating, per brief §03 feature 4. */
export const DAY_MILESTONES = [7, 30, 100, 365];
export const WEEK_MILESTONES = [4, 12, 26, 52];

/**
 * @param habit                  a Habit document (or plain object of the same shape)
 * @param completedKeys          iterable of 'YYYY-MM-DD' keys the habit was completed on
 * @param todayKey               today's date key in the user's timezone
 * @returns {{current:number, longest:number, unit:'day'|'week', total:number,
 *            completionRate:number, nextMilestone:number|null,
 *            milestoneReached:number|null, completedToday:boolean,
 *            scheduledToday:boolean}}
 */
export function computeStreak(habit, completedKeys, todayKey) {
  const done = completedKeys instanceof Set ? completedKeys : new Set(completedKeys);
  const startKey = habit.startDate;

  const scheduledToday = isScheduledOn(habit, todayKey);
  const completedToday = done.has(todayKey);

  // A habit whose start date is in the future has no history to measure yet.
  if (daysBetween(startKey, todayKey) < 0) {
    return emptyResult(habit, { scheduledToday, completedToday, total: done.size });
  }

  const isWeekly = (habit.frequency?.type ?? 'daily') === 'weekly';
  const result = isWeekly
    ? weeklyStreak(habit, done, startKey, todayKey)
    : dailyStreak(habit, done, startKey, todayKey);

  const milestones = isWeekly ? WEEK_MILESTONES : DAY_MILESTONES;

  return {
    ...result,
    unit: isWeekly ? 'week' : 'day',
    total: done.size,
    scheduledToday,
    completedToday,
    nextMilestone: milestones.find((m) => m > result.current) ?? null,
    // Non-null only when the current streak lands exactly on a milestone —
    // that's the signal the client uses to fire the celebration animation.
    milestoneReached: milestones.includes(result.current) ? result.current : null,
  };
}

/** Consecutive completed scheduled days, walking back from today. */
function dailyStreak(habit, done, startKey, todayKey) {
  const scheduled = scheduledKeysBetween(habit, startKey, todayKey);

  let longest = 0;
  let run = 0;
  let completedCount = 0;

  for (const key of scheduled) {
    if (done.has(key)) {
      run += 1;
      completedCount += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Walk backwards for the live streak, granting today its grace period.
  let index = scheduled.length - 1;
  if (index >= 0 && scheduled[index] === todayKey && !done.has(todayKey)) index -= 1;

  let current = 0;
  while (index >= 0 && done.has(scheduled[index])) {
    current += 1;
    index -= 1;
  }

  return {
    current,
    longest: Math.max(longest, current),
    completionRate: scheduled.length === 0 ? 0 : completedCount / scheduled.length,
  };
}

/** Consecutive weeks that met the habit's weekly quota. */
function weeklyStreak(habit, done, startKey, todayKey) {
  const weeks = weeksBetween(startKey, todayKey);
  const fullTarget = habit.frequency?.timesPerWeek ?? 3;

  let completedCount = 0;
  let expectedCount = 0;

  const satisfied = weeks.map((week, index) => {
    const isCurrentWeek = index === weeks.length - 1;
    const hits = week.keys.filter((key) => done.has(key)).length;

    completedCount += hits;

    // The current week is still running, so we judge it against the full
    // target only — never prorated, never counted as failed while in progress.
    // Past weeks (including a partial first week) use the prorated target.
    const target = isCurrentWeek ? fullTarget : weeklyTargetFor(habit, week.keys.length);
    expectedCount += target;

    return hits >= target;
  });

  let longest = 0;
  let run = 0;
  for (const ok of satisfied) {
    run = ok ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let index = satisfied.length - 1;
  if (index >= 0 && !satisfied[index]) index -= 1; // current week's grace period

  let current = 0;
  while (index >= 0 && satisfied[index]) {
    current += 1;
    index -= 1;
  }

  return {
    current,
    longest: Math.max(longest, current),
    completionRate: expectedCount === 0 ? 0 : Math.min(1, completedCount / expectedCount),
  };
}

function emptyResult(habit, { scheduledToday, completedToday, total }) {
  const isWeekly = (habit.frequency?.type ?? 'daily') === 'weekly';
  const milestones = isWeekly ? WEEK_MILESTONES : DAY_MILESTONES;
  return {
    current: 0,
    longest: 0,
    unit: isWeekly ? 'week' : 'day',
    total,
    completionRate: 0,
    scheduledToday,
    completedToday,
    nextMilestone: milestones[0],
    milestoneReached: null,
  };
}
