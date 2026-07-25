import mongoose from 'mongoose';
import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { todayKey, addDays } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';
import { computeStreak } from '../services/streak.service.js';
import { groupDatesByHabit } from '../services/stats.service.js';

/**
 * Loads a habit that belongs to the requesting user.
 * Scoping by userId in the query (rather than fetching then comparing) means
 * an id belonging to someone else is indistinguishable from one that does not
 * exist — no probing for other people's habit ids.
 */
async function findOwnedHabit(habitId, userId) {
  if (!mongoose.isValidObjectId(habitId)) throw ApiError.notFound('Habit not found');
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw ApiError.notFound('Habit not found');
  return habit;
}

/** Attaches streak stats to each habit in one pass over their check-ins. */
async function withStreaks(habits, userId, today) {
  if (habits.length === 0) return [];

  const checkIns = await CheckIn.find({
    userId,
    habitId: { $in: habits.map((h) => h._id) },
  })
    .select('habitId date')
    .lean();

  const datesByHabit = groupDatesByHabit(checkIns);

  return habits.map((habit) => ({
    ...habit.toPublicJSON(),
    stats: computeStreak(habit, datesByHabit.get(habit._id.toString()) ?? new Set(), today),
  }));
}

/** GET /api/habits */
export const listHabits = asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const filter = { userId: req.user._id, ...(includeArchived ? {} : { archived: false }) };

  const habits = await Habit.find(filter).sort({ order: 1, createdAt: 1 });
  res.json({ habits: await withStreaks(habits, req.user._id, todayKey(req.user.timezone)) });
});

/**
 * GET /api/habits/today
 * The Today view: every live habit, flagged with whether it is due today and
 * whether it has already been ticked.
 */
export const listToday = asyncHandler(async (req, res) => {
  const today = todayKey(req.user.timezone);
  const habits = await Habit.find({ userId: req.user._id, archived: false }).sort({
    order: 1,
    createdAt: 1,
  });

  const enriched = await withStreaks(habits, req.user._id, today);

  // Today's check-ins carry the note and mood, which the streak summary omits.
  const todayCheckIns = await CheckIn.find({ userId: req.user._id, date: today }).lean();
  const byHabit = new Map(todayCheckIns.map((c) => [c.habitId.toString(), c]));

  const withToday = enriched.map((habit) => {
    const checkIn = byHabit.get(habit.id);
    return {
      ...habit,
      dueToday: isScheduledOn(habit, today),
      checkIn: checkIn
        ? { id: checkIn._id.toString(), date: checkIn.date, note: checkIn.note, mood: checkIn.mood }
        : null,
    };
  });

  const due = withToday.filter((h) => h.dueToday);

  res.json({
    date: today,
    habits: withToday,
    summary: {
      due: due.length,
      completed: due.filter((h) => h.checkIn).length,
      // Off-schedule habits can still be ticked; they just aren't required.
      extraCompleted: withToday.filter((h) => !h.dueToday && h.checkIn).length,
    },
  });
});

/** POST /api/habits */
export const createHabit = asyncHandler(async (req, res) => {
  const count = await Habit.countDocuments({ userId: req.user._id });

  const habit = await Habit.create({
    ...req.body,
    userId: req.user._id,
    startDate: req.body.startDate ?? todayKey(req.user.timezone),
    order: count,
  });

  res.status(201).json({ habit: { ...habit.toPublicJSON(), stats: computeStreak(habit, [], todayKey(req.user.timezone)) } });
});

/** GET /api/habits/:id — full detail for the Habit Detail page. */
export const getHabit = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  const today = todayKey(req.user.timezone);

  const checkIns = await CheckIn.find({ habitId: habit._id }).sort({ date: -1 }).lean();
  const stats = computeStreak(habit, checkIns.map((c) => c.date), today);

  res.json({
    habit: habit.toPublicJSON(),
    stats,
    checkIns: checkIns.map((c) => ({
      id: c._id.toString(),
      date: c.date,
      note: c.note,
      mood: c.mood,
      createdAt: c.createdAt,
    })),
    // Notes log — only the check-ins that actually carry a note.
    notes: checkIns
      .filter((c) => c.note)
      .map((c) => ({ id: c._id.toString(), date: c.date, note: c.note, mood: c.mood })),
  });
});

/** PATCH /api/habits/:id */
export const updateHabit = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  Object.assign(habit, req.body);
  await habit.save();

  const checkIns = await CheckIn.find({ habitId: habit._id }).select('date').lean();
  res.json({
    habit: {
      ...habit.toPublicJSON(),
      stats: computeStreak(habit, checkIns.map((c) => c.date), todayKey(req.user.timezone)),
    },
  });
});

/**
 * DELETE /api/habits/:id
 * Deletes the habit and its history together — leaving orphaned check-ins
 * would quietly skew every dashboard aggregate afterwards.
 */
export const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);

  await CheckIn.deleteMany({ habitId: habit._id });
  await habit.deleteOne();

  res.json({ success: true });
});

/** PATCH /api/habits/reorder — persists drag-and-drop ordering. */
export const reorderHabits = asyncHandler(async (req, res) => {
  const { order } = req.body;

  const operations = order.map((habitId, index) => ({
    updateOne: {
      filter: { _id: habitId, userId: req.user._id },
      update: { $set: { order: index } },
    },
  }));
  await Habit.bulkWrite(operations);

  const habits = await Habit.find({ userId: req.user._id, archived: false }).sort({ order: 1 });
  res.json({ habits: await withStreaks(habits, req.user._id, todayKey(req.user.timezone)) });
});

/**
 * POST /api/habits/:id/checkin
 * The one-tap check-in. Idempotent by design: the unique (habitId, date) index
 * means a double-tap or a retried request updates the existing row instead of
 * inflating the streak.
 */
export const checkIn = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  const today = todayKey(req.user.timezone);
  const date = req.body.date ?? today;

  if (date > today) throw ApiError.badRequest('Cannot check in for a future date');
  if (date < habit.startDate) throw ApiError.badRequest('That date is before the habit started');

  const record = await CheckIn.findOneAndUpdate(
    { habitId: habit._id, date },
    {
      $set: { note: req.body.note, mood: req.body.mood },
      $setOnInsert: { userId: req.user._id, habitId: habit._id, date },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const dates = await CheckIn.find({ habitId: habit._id }).select('date').lean();
  const stats = computeStreak(habit, dates.map((c) => c.date), today);

  res.status(201).json({ checkIn: record.toPublicJSON(), stats });
});

/** DELETE /api/habits/:id/checkin?date=YYYY-MM-DD — undo a check-in. */
export const undoCheckIn = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  const date = req.query.date ?? todayKey(req.user.timezone);

  const deleted = await CheckIn.findOneAndDelete({ habitId: habit._id, date });
  if (!deleted) throw ApiError.notFound('No check-in on that date');

  const dates = await CheckIn.find({ habitId: habit._id }).select('date').lean();
  res.json({ success: true, stats: computeStreak(habit, dates.map((c) => c.date), todayKey(req.user.timezone)) });
});

/** GET /api/habits/:id/checkins?from&to */
export const listCheckIns = asyncHandler(async (req, res) => {
  const habit = await findOwnedHabit(req.params.id, req.user._id);
  const today = todayKey(req.user.timezone);
  const { from = addDays(today, -89), to = today } = req.validatedQuery ?? {};

  const checkIns = await CheckIn.find({ habitId: habit._id, date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .lean();

  res.json({
    from,
    to,
    checkIns: checkIns.map((c) => ({
      id: c._id.toString(),
      date: c.date,
      note: c.note,
      mood: c.mood,
    })),
  });
});
