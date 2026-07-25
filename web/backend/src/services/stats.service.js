/**
 * Aggregations for the Progress Dashboard and the Habit Detail page.
 *
 * Everything here is derived from two inputs — the user's habits and their
 * check-ins over a date range — so a single round trip to Mongo can answer the
 * whole dashboard rather than one query per widget.
 */

import { rangeKeys, addDays, daysBetween, startOfWeek, keyToDate } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';
import { computeStreak } from './streak.service.js';

/**
 * Per-day completion across all habits — the data behind the heatmap calendar.
 *
 * `scheduled` counts only habits that were both live and due on that day, so a
 * habit created last week doesn't make the whole month before it look failed.
 */
export function buildHeatmap(habits, checkInsByDate, startKey, endKey) {
  return rangeKeys(startKey, endKey).map((date) => {
    const scheduled = habits.filter(
      (habit) => daysBetween(habit.startDate, date) >= 0 && isScheduledOn(habit, date),
    ).length;
    const completed = checkInsByDate.get(date)?.size ?? 0;

    return {
      date,
      completed,
      scheduled,
      // Clamped because a user can complete an unscheduled habit (ticking a
      // Mon/Wed/Fri habit on a Sunday is allowed — it just isn't required).
      rate: scheduled === 0 ? 0 : Math.min(1, completed / scheduled),
    };
  });
}

/** Week-by-week totals — the data behind the weekly bar chart. */
export function buildWeeklySeries(habits, checkInsByDate, startKey, endKey) {
  const weeks = [];
  let cursor = startOfWeek(startKey);

  while (daysBetween(cursor, endKey) >= 0) {
    const weekEnd = addDays(cursor, 6);
    const days = rangeKeys(cursor, weekEnd).filter(
      (key) => daysBetween(startKey, key) >= 0 && daysBetween(key, endKey) >= 0,
    );

    let completed = 0;
    let scheduled = 0;

    for (const date of days) {
      completed += checkInsByDate.get(date)?.size ?? 0;
      scheduled += habits.filter(
        (habit) => daysBetween(habit.startDate, date) >= 0 && isScheduledOn(habit, date),
      ).length;
    }

    weeks.push({
      weekStart: cursor,
      weekEnd,
      label: formatWeekLabel(cursor),
      completed,
      scheduled,
      rate: scheduled === 0 ? 0 : Math.min(1, completed / scheduled),
    });

    cursor = addDays(cursor, 7);
  }

  return weeks;
}

/** Headline numbers for the dashboard summary cards. */
export function buildSummary(habits, checkIns, checkInsByDate, startKey, endKey, todayKey, frozenDates = null) {
  const completedByHabit = groupDatesByHabit(checkIns);

  const streaks = habits.map((habit) =>
    computeStreak(
      habit,
      completedByHabit.get(habit.id ?? habit._id.toString()) ?? new Set(),
      todayKey,
      frozenDates,
    ),
  );

  let scheduledTotal = 0;
  let completedTotal = 0;
  for (const day of buildHeatmap(habits, checkInsByDate, startKey, endKey)) {
    scheduledTotal += day.scheduled;
    completedTotal += day.completed;
  }

  const dueToday = habits.filter((habit) => isScheduledOn(habit, todayKey)).length;
  const doneToday = checkInsByDate.get(todayKey)?.size ?? 0;

  return {
    totalHabits: habits.length,
    dueToday,
    doneToday,
    checkInsInRange: completedTotal,
    // The headline "overall completion %" from brief §03 feature 6.
    completionRate: scheduledTotal === 0 ? 0 : Math.min(1, completedTotal / scheduledTotal),
    currentBestStreak: streaks.reduce((best, s) => Math.max(best, s.current), 0),
    longestStreak: streaks.reduce((best, s) => Math.max(best, s.longest), 0),
    activeStreaks: streaks.filter((s) => s.current > 0).length,
  };
}

/** Completion rate split by habit category, for the dashboard breakdown. */
export function buildCategoryBreakdown(habits, checkIns, startKey, endKey) {
  const datesByHabit = groupDatesByHabit(checkIns);
  const byCategory = new Map();

  for (const habit of habits) {
    const id = habit.id ?? habit._id.toString();
    const completedDates = datesByHabit.get(id) ?? new Set();

    const scheduled = rangeKeys(startKey, endKey).filter(
      (date) => daysBetween(habit.startDate, date) >= 0 && isScheduledOn(habit, date),
    );
    const completed = scheduled.filter((date) => completedDates.has(date)).length;

    const entry = byCategory.get(habit.category) ?? { category: habit.category, completed: 0, scheduled: 0, habits: 0 };
    entry.completed += completed;
    entry.scheduled += scheduled.length;
    entry.habits += 1;
    byCategory.set(habit.category, entry);
  }

  return [...byCategory.values()]
    .map((entry) => ({ ...entry, rate: entry.scheduled === 0 ? 0 : entry.completed / entry.scheduled }))
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Groups check-ins into `date → Set<habitId>`.
 * A Set rather than a count so callers can ask "was *this* habit done that
 * day?" without a second pass over the raw documents.
 */
export function indexCheckInsByDate(checkIns) {
  const byDate = new Map();
  for (const checkIn of checkIns) {
    const habitId = checkIn.habitId.toString();
    if (!byDate.has(checkIn.date)) byDate.set(checkIn.date, new Set());
    byDate.get(checkIn.date).add(habitId);
  }
  return byDate;
}

/** Groups check-ins into `habitId → Set<date>`, the shape computeStreak wants. */
export function groupDatesByHabit(checkIns) {
  const byHabit = new Map();
  for (const checkIn of checkIns) {
    const habitId = checkIn.habitId.toString();
    if (!byHabit.has(habitId)) byHabit.set(habitId, new Set());
    byHabit.get(habitId).add(checkIn.date);
  }
  return byHabit;
}

/** e.g. '2025-06-09' → '9 Jun'. */
function formatWeekLabel(weekStart) {
  const date = keyToDate(weekStart);
  return `${date.getUTCDate()} ${date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`;
}

/** Resolves a named range ('7d' | '30d' | '90d' | '365d') to date keys. */
export function resolveRange(range, todayKey) {
  const spans = { '7d': 6, '30d': 29, '90d': 89, '365d': 364 };
  const span = spans[range] ?? spans['30d'];
  return { startKey: addDays(todayKey, -span), endKey: todayKey };
}

