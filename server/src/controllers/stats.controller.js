import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { asyncHandler } from '../utils/ApiError.js';
import { todayKey } from '../utils/date.js';
import {
  buildHeatmap,
  buildWeeklySeries,
  buildSummary,
  buildCategoryBreakdown,
  indexCheckInsByDate,
  resolveRange,
} from '../services/stats.service.js';
import { getFrozenDates } from '../services/freeze.service.js';

/**
 * GET /api/stats/dashboard?range=7d|30d|90d|365d
 *
 * One request answers the whole Progress Dashboard — heatmap, weekly chart,
 * summary cards and category breakdown — from a single pair of queries.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const today = todayKey(req.user.timezone);
  const { range } = req.validatedQuery ?? { range: '30d' };
  const { startKey, endKey } = resolveRange(range, today);

  const [habits, allCheckIns, frozenDates] = await Promise.all([
    Habit.find({ userId: req.user._id, archived: false }).lean(),
    // The full history is needed for lifetime streaks; the range only narrows
    // the heatmap and rate calculations.
    CheckIn.find({ userId: req.user._id }).select('habitId date').lean(),
    getFrozenDates(req.user._id),
  ]);

  const habitsWithId = habits.map((h) => ({ ...h, id: h._id.toString() }));
  const rangeCheckIns = allCheckIns.filter((c) => c.date >= startKey && c.date <= endKey);

  const byDate = indexCheckInsByDate(rangeCheckIns);

  res.json({
    range: { key: range, start: startKey, end: endKey, today },
    summary: buildSummary(habitsWithId, allCheckIns, byDate, startKey, endKey, today, frozenDates),
    heatmap: buildHeatmap(habitsWithId, byDate, startKey, endKey),
    weekly: buildWeeklySeries(habitsWithId, byDate, startKey, endKey),
    categories: buildCategoryBreakdown(habitsWithId, rangeCheckIns, startKey, endKey),
  });
});
