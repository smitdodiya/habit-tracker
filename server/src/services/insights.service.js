/**
 * Personal insights — the "you're strongest on Tuesdays" layer.
 *
 * Deliberately computed over *all* history rather than the dashboard's
 * selected range: a pattern like "you rarely make it on Saturdays" only means
 * something across months, and would be noise across seven days.
 *
 * Every insight is withheld until there is enough data to support it. A
 * confident claim drawn from four check-ins is worse than no claim at all.
 */

import { dayOfWeek, timeOfDayFor, daysBetween } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';
import { groupDatesByHabit } from './stats.service.js';
import { computeStreak } from './streak.service.js';

/** Below this, patterns are coincidence rather than habit. */
const MIN_CHECKINS_FOR_INSIGHTS = 14;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_BANDS = [
  { key: 'early-morning', label: 'before 6am', from: 0, to: 6 },
  { key: 'morning', label: 'in the morning', from: 6, to: 12 },
  { key: 'afternoon', label: 'in the afternoon', from: 12, to: 18 },
  { key: 'evening', label: 'in the evening', from: 18, to: 22 },
  { key: 'night', label: 'late at night', from: 22, to: 24 },
];

export function buildInsights({ habits, checkIns, user, frozenDates, today }) {
  if (checkIns.length < MIN_CHECKINS_FOR_INSIGHTS) {
    return {
      ready: false,
      checkInsNeeded: MIN_CHECKINS_FOR_INSIGHTS - checkIns.length,
      insights: [],
    };
  }

  const timezone = user.timezone ?? 'UTC';

  return {
    ready: true,
    checkInsNeeded: 0,
    weekdays: weekdayBreakdown(habits, checkIns, today),
    timeOfDay: timeOfDayBreakdown(checkIns, timezone),
    bestHabit: bestPerformingHabit(habits, checkIns, frozenDates, today),
    insights: [], // filled in below
  };
}

/** Completion rate per weekday, plus the strongest and weakest. */
function weekdayBreakdown(habits, checkIns, today) {
  const doneByDate = new Map();
  for (const checkIn of checkIns) {
    if (!doneByDate.has(checkIn.date)) doneByDate.set(checkIn.date, new Set());
    doneByDate.get(checkIn.date).add(checkIn.habitId.toString());
  }

  const buckets = WEEKDAYS.map((label, index) => ({
    day: index,
    label,
    short: label.slice(0, 3),
    completed: 0,
    scheduled: 0,
  }));

  // Walk every date any habit was live, not just dates with check-ins —
  // otherwise a day you always skip would never appear in the denominator and
  // your worst weekday would look perfect.
  const earliest = habits.reduce(
    (min, habit) => (min === null || habit.startDate < min ? habit.startDate : min),
    null,
  );
  if (!earliest) return buckets;

  for (let date = earliest; daysBetween(date, today) >= 0; date = shiftDay(date)) {
    const bucket = buckets[dayOfWeek(date)];
    const done = doneByDate.get(date) ?? new Set();

    for (const habit of habits) {
      if (daysBetween(habit.startDate, date) < 0) continue;
      if (!isScheduledOn(habit, date)) continue;
      bucket.scheduled += 1;
      if (done.has(habit._id.toString())) bucket.completed += 1;
    }
  }

  return buckets.map((bucket) => ({
    ...bucket,
    rate: bucket.scheduled === 0 ? 0 : bucket.completed / bucket.scheduled,
  }));
}

/** When during the day check-ins actually happen. */
function timeOfDayBreakdown(checkIns, timezone) {
  const bands = TIME_BANDS.map((band) => ({ ...band, count: 0 }));
  let counted = 0;

  for (const checkIn of checkIns) {
    if (!checkIn.createdAt) continue;
    // Read in the user's own timezone — "morning" means their morning.
    const hour = Number(timeOfDayFor(checkIn.createdAt, timezone).slice(0, 2));
    const band = bands.find((b) => hour >= b.from && hour < b.to);
    if (band) {
      band.count += 1;
      counted += 1;
    }
  }

  return bands.map((band) => ({
    ...band,
    share: counted === 0 ? 0 : band.count / counted,
  }));
}

/** The habit with the best completion rate, among those with real history. */
function bestPerformingHabit(habits, checkIns, frozenDates, today) {
  const datesByHabit = groupDatesByHabit(checkIns);

  const scored = habits
    .filter((habit) => !habit.archived)
    .map((habit) => {
      const dates = datesByHabit.get(habit._id.toString()) ?? new Set();
      const stats = computeStreak(habit, dates, today, frozenDates);
      return {
        id: habit._id.toString(),
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        rate: stats.completionRate,
        total: stats.total,
      };
    })
    // A habit with three check-ins can show 100% and mean nothing.
    .filter((entry) => entry.total >= 5)
    .sort((a, b) => b.rate - a.rate);

  return scored[0] ?? null;
}

function shiftDay(key) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Turns the raw breakdowns into short sentences for the UI.
 * Only claims that clear a meaningfulness bar are returned — a "strongest day"
 * that beats the average by two percent is not an insight.
 */
export function summariseInsights(data) {
  if (!data.ready) return [];

  const lines = [];

  const ranked = [...(data.weekdays ?? [])].filter((d) => d.scheduled >= 4).sort((a, b) => b.rate - a.rate);
  if (ranked.length >= 3) {
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];

    if (best.rate - worst.rate >= 0.15) {
      lines.push({
        key: 'best-day',
        icon: 'CalendarCheck',
        text: `${best.label} is your strongest day — ${Math.round(best.rate * 100)}% completed.`,
      });
      lines.push({
        key: 'worst-day',
        icon: 'CalendarX',
        text: `${worst.label} is the one that slips, at ${Math.round(worst.rate * 100)}%.`,
      });
    }
  }

  const peak = [...(data.timeOfDay ?? [])].sort((a, b) => b.share - a.share)[0];
  if (peak && peak.share >= 0.4) {
    lines.push({
      key: 'peak-time',
      icon: 'Clock',
      // Phrased so every band reads naturally — "You check in in the morning"
      // is the kind of thing that makes an app feel unfinished.
      text: `Most of your check-ins happen ${peak.label} — ${Math.round(peak.share * 100)}% of them.`,
    });
  }

  if (data.bestHabit && data.bestHabit.rate >= 0.7) {
    lines.push({
      key: 'best-habit',
      icon: 'Star',
      text: `${data.bestHabit.name} is your most consistent habit at ${Math.round(data.bestHabit.rate * 100)}%.`,
    });
  }

  return lines;
}
