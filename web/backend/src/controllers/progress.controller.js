import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { asyncHandler } from '../utils/ApiError.js';
import { buildProgress } from '../services/progress.service.js';
import { getFrozenDates } from '../services/freeze.service.js';
import { buildInsights, summariseInsights } from '../services/insights.service.js';
import { todayKey, startOfWeek, addDays, daysBetween } from '../utils/date.js';
import { findPerfectDays } from '../services/gamification.service.js';

/** GET /api/me/progress — XP, level, freezes and the achievement catalogue. */
export const getProgress = asyncHandler(async (req, res) => {
  res.json(await buildProgress(req.user, { persist: true }));
});

/** GET /api/me/insights — personal patterns over all history. */
export const getInsights = asyncHandler(async (req, res) => {
  const today = todayKey(req.user.timezone);

  const [habits, checkIns, frozenDates] = await Promise.all([
    Habit.find({ userId: req.user._id, archived: false }).lean(),
    CheckIn.find({ userId: req.user._id }).select('habitId date createdAt').lean(),
    getFrozenDates(req.user._id),
  ]);

  const data = buildInsights({ habits, checkIns, user: req.user, frozenDates, today });
  res.json({ ...data, insights: summariseInsights(data) });
});

/**
 * GET /api/me/recap — last week in review.
 *
 * Reports the week that has finished, not the one in progress: a recap of a
 * Tuesday is not a recap.
 */
export const getRecap = asyncHandler(async (req, res) => {
  const today = todayKey(req.user.timezone);
  const thisWeekStart = startOfWeek(today);
  const weekStart = addDays(thisWeekStart, -7);
  const weekEnd = addDays(thisWeekStart, -1);

  const [habits, weekCheckIns, allCheckIns] = await Promise.all([
    Habit.find({ userId: req.user._id }).lean(),
    CheckIn.find({
      userId: req.user._id,
      date: { $gte: weekStart, $lte: weekEnd },
    })
      .populate('habitId', 'name color icon')
      .lean(),
    CheckIn.find({ userId: req.user._id }).select('habitId date').lean(),
  ]);

  // Per-day totals across the week, for the recap's little bar chart.
  const byDate = new Map();
  for (const checkIn of weekCheckIns) {
    byDate.set(checkIn.date, (byDate.get(checkIn.date) ?? 0) + 1);
  }

  const days = [];
  for (let date = weekStart; daysBetween(date, weekEnd) >= 0; date = addDays(date, 1)) {
    const scheduled = habits.filter(
      (habit) => daysBetween(habit.startDate, date) >= 0 && isDue(habit, date),
    ).length;
    days.push({ date, completed: byDate.get(date) ?? 0, scheduled });
  }

  const perfectDays = findPerfectDays(habits, allCheckIns).filter(
    (date) => date >= weekStart && date <= weekEnd,
  );

  const busiest = [...days].sort((a, b) => b.completed - a.completed)[0] ?? null;

  // Which habit carried the week.
  const perHabit = new Map();
  for (const checkIn of weekCheckIns) {
    const name = checkIn.habitId?.name;
    if (!name) continue;
    const entry = perHabit.get(name) ?? { name, color: checkIn.habitId.color, icon: checkIn.habitId.icon, count: 0 };
    entry.count += 1;
    perHabit.set(name, entry);
  }
  const topHabit = [...perHabit.values()].sort((a, b) => b.count - a.count)[0] ?? null;

  const totalScheduled = days.reduce((sum, day) => sum + day.scheduled, 0);
  const totalCompleted = days.reduce((sum, day) => sum + day.completed, 0);

  res.json({
    week: { start: weekStart, end: weekEnd },
    // The client uses this to decide whether the banner has already been seen.
    seen: req.user.lastRecapSeen === weekStart,
    hasData: totalCompleted > 0,
    totals: {
      checkIns: totalCompleted,
      scheduled: totalScheduled,
      completionRate: totalScheduled === 0 ? 0 : Math.min(1, totalCompleted / totalScheduled),
      perfectDays: perfectDays.length,
      notesWritten: weekCheckIns.filter((c) => c.note).length,
    },
    days,
    busiestDay: busiest,
    topHabit,
  });
});

/** POST /api/me/recap/seen — dismisses the recap banner for this week. */
export const markRecapSeen = asyncHandler(async (req, res) => {
  const today = todayKey(req.user.timezone);
  req.user.lastRecapSeen = addDays(startOfWeek(today), -7);
  await req.user.save();
  res.json({ success: true });
});

/** Local copy of the scheduling rule to avoid a circular import. */
function isDue(habit, date) {
  const { type, daysOfWeek = [] } = habit.frequency ?? {};
  if (type === 'custom' && daysOfWeek.length > 0) {
    return daysOfWeek.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay());
  }
  return true;
}
