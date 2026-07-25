/**
 * Habit scheduling rules.
 *
 * Three frequency types, each with different semantics for "was this habit
 * due today?":
 *
 *   daily   — due every day.
 *   custom  — due only on the chosen weekdays (e.g. Mon/Wed/Fri).
 *   weekly  — a flexible target ("3 times a week"). No specific day is
 *             mandatory, so any day counts toward the week's quota.
 *
 * Keeping these rules in one place means the Today view, the streak service,
 * and the stats service can never drift apart on what "due" means.
 */

import { dayOfWeek, rangeKeys, startOfWeek, addDays, daysBetween } from './date.js';

/** Is this habit scheduled on the given date key? */
export function isScheduledOn(habit, dateKey) {
  const type = habit.frequency?.type ?? 'daily';

  switch (type) {
    case 'daily':
      return true;

    case 'custom': {
      const days = habit.frequency?.daysOfWeek ?? [];
      // An empty day list would mean "never", which is never what a user
      // intends — treat it as daily rather than silently hiding the habit.
      if (days.length === 0) return true;
      return days.includes(dayOfWeek(dateKey));
    }

    case 'weekly':
      // Flexible target: every day is a valid opportunity to log one of the
      // week's required completions.
      return true;

    default:
      return true;
  }
}

/** Every scheduled date key in [startKey, endKey], inclusive. */
export function scheduledKeysBetween(habit, startKey, endKey) {
  if (daysBetween(startKey, endKey) < 0) return [];
  return rangeKeys(startKey, endKey).filter((key) => isScheduledOn(habit, key));
}

/**
 * Splits [startKey, endKey] into Monday-anchored weeks.
 * Each entry is { weekStart, keys } where `keys` are only the days that fall
 * inside the requested range — so the first and last weeks may be partial.
 */
export function weeksBetween(startKey, endKey) {
  if (daysBetween(startKey, endKey) < 0) return [];

  const weeks = [];
  let cursor = startOfWeek(startKey);

  while (daysBetween(cursor, endKey) >= 0) {
    const keys = rangeKeys(cursor, addDays(cursor, 6)).filter(
      (key) => daysBetween(startKey, key) >= 0 && daysBetween(key, endKey) >= 0,
    );
    weeks.push({ weekStart: cursor, keys });
    cursor = addDays(cursor, 7);
  }

  return weeks;
}

/**
 * How many completions a weekly habit needs in a given week.
 *
 * A full week needs the habit's `timesPerWeek`. A partial week — the week the
 * habit was created in, or the current week so far — is prorated, so a habit
 * created on a Saturday isn't marked failed for its first week.
 */
export function weeklyTargetFor(habit, daysAvailable) {
  const target = habit.frequency?.timesPerWeek ?? 3;
  return Math.max(1, Math.min(target, daysAvailable));
}
