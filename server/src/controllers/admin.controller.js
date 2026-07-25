import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { asyncHandler } from '../utils/ApiError.js';
import { todayKey, addDays } from '../utils/date.js';

/**
 * Basic admin panel data (brief §08 deliverable "Admin / Backend Panel").
 * Read-only by design: it exists to see what's happening, not to edit other
 * people's habits.
 */

/** GET /api/admin/overview — headline platform numbers. */
export const getOverview = asyncHandler(async (_req, res) => {
  const today = todayKey('UTC');
  const weekAgo = addDays(today, -6);

  const [users, habits, checkIns, checkInsThisWeek, activeToday] = await Promise.all([
    User.countDocuments(),
    Habit.countDocuments(),
    CheckIn.countDocuments(),
    CheckIn.countDocuments({ date: { $gte: weekAgo, $lte: today } }),
    CheckIn.distinct('userId', { date: today }),
  ]);

  // Daily check-in volume for the last 14 days, for the activity chart.
  const activity = await CheckIn.aggregate([
    { $match: { date: { $gte: addDays(today, -13), $lte: today } } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    totals: { users, habits, checkIns },
    checkInsThisWeek,
    activeUsersToday: activeToday.length,
    activity: activity.map((entry) => ({ date: entry._id, count: entry.count })),
  });
});

/** GET /api/admin/users?search= — user list with per-user counts. */
export const listUsers = asyncHandler(async (req, res) => {
  const search = (req.query.search ?? '').trim();
  const filter = search
    ? {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const userIds = users.map((u) => u._id);

  // Two grouped queries instead of two per user.
  const [habitCounts, checkInCounts] = await Promise.all([
    Habit.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]),
    CheckIn.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]),
  ]);

  const habitsBy = new Map(habitCounts.map((h) => [h._id.toString(), h.count]));
  const checkInsBy = new Map(checkInCounts.map((c) => [c._id.toString(), c.count]));

  res.json({
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
      habits: habitsBy.get(user._id.toString()) ?? 0,
      checkIns: checkInsBy.get(user._id.toString()) ?? 0,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
    })),
  });
});

/** GET /api/admin/habits — recent habits across all accounts. */
export const listAllHabits = asyncHandler(async (_req, res) => {
  const habits = await Habit.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('userId', 'name email')
    .lean();

  res.json({
    habits: habits.map((habit) => ({
      id: habit._id.toString(),
      name: habit.name,
      category: habit.category,
      color: habit.color,
      frequency: habit.frequency,
      archived: habit.archived,
      createdAt: habit.createdAt,
      owner: habit.userId ? { name: habit.userId.name, email: habit.userId.email } : null,
    })),
  });
});

/** GET /api/admin/activity — the most recent check-ins platform-wide. */
export const listActivity = asyncHandler(async (_req, res) => {
  const checkIns = await CheckIn.find()
    .sort({ createdAt: -1 })
    .limit(60)
    .populate('habitId', 'name color')
    .populate('userId', 'name email')
    .lean();

  res.json({
    activity: checkIns.map((checkIn) => ({
      id: checkIn._id.toString(),
      date: checkIn.date,
      note: checkIn.note,
      mood: checkIn.mood,
      createdAt: checkIn.createdAt,
      habit: checkIn.habitId ? { name: checkIn.habitId.name, color: checkIn.habitId.color } : null,
      user: checkIn.userId ? { name: checkIn.userId.name, email: checkIn.userId.email } : null,
    })),
  });
});
