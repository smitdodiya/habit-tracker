import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { asyncHandler } from '../utils/ApiError.js';
import { todayKey } from '../utils/date.js';
import { buildCsv, buildPdf } from '../services/export.service.js';
import { buildSummary, indexCheckInsByDate, resolveRange } from '../services/stats.service.js';

/**
 * GET /api/export?format=csv|pdf&range=7d|30d|90d|365d
 * Streams the user's habit history as a downloadable file.
 */
export const exportData = asyncHandler(async (req, res) => {
  const { format, range: rangeKey } = req.validatedQuery ?? { format: 'csv', range: '30d' };
  const today = todayKey(req.user.timezone);
  const { startKey, endKey } = resolveRange(rangeKey, today);
  const range = { start: startKey, end: endKey };

  const habits = await Habit.find({ userId: req.user._id }).sort({ order: 1 });
  const checkIns = await CheckIn.find({
    userId: req.user._id,
    date: { $gte: startKey, $lte: endKey },
  }).lean();

  const filename = `habit-tracker-${startKey}-to-${endKey}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(buildCsv({ habits, checkIns, range }));
  }

  // Streaks in the PDF are lifetime figures, so they need the full history —
  // not just the exported window.
  const allCheckIns = await CheckIn.find({ userId: req.user._id }).select('habitId date').lean();
  const summary = buildSummary(
    habits.map((h) => ({ ...h.toObject(), id: h._id.toString() })),
    allCheckIns,
    indexCheckInsByDate(checkIns),
    startKey,
    endKey,
    today,
  );

  res.setHeader('Content-Type', 'application/pdf');
  await buildPdf({ user: req.user, habits, checkIns, range, summary }, res);
});
