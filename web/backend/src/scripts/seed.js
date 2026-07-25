/**
 * Seeds a demo account with two months of realistic history.
 *
 * The point is that every screen — heatmap, charts, streak badges, notes log,
 * admin panel — has something meaningful in it the first time you open the
 * app, instead of empty states everywhere.
 *
 *   npm run seed --workspace=backend
 *
 * Running it again wipes and rebuilds the demo accounts only. Any other user's
 * data is left untouched.
 */

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { Habit } from '../models/Habit.js';
import { CheckIn } from '../models/CheckIn.js';
import { StreakFreeze } from '../models/StreakFreeze.js';
import { todayKey, addDays, dayOfWeek, rangeKeys } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';
import { logger } from '../utils/logger.js';

const DEMO_EMAIL = 'demo@asensebranding.com';
const ADMIN_EMAIL = 'admin@asensebranding.com';
const PASSWORD = 'Password123';
const HISTORY_DAYS = 60;

/**
 * Deterministic pseudo-random generator (mulberry32), so every seed run
 * produces the same history and screenshots stay comparable between runs.
 */
function createRandom(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOTES = {
  meditation: ['Calmer than yesterday.', 'Mind wandered a lot today.', 'Ten minutes felt easy.', 'Best session this week.'],
  water: ['Hit the target before lunch.', 'Needed a reminder at 4pm.', 'Easy day.'],
  reading: ['Finished chapter 4.', 'Slow going but got there.', 'Could not put it down.', 'Read on the commute.'],
  gym: ['Legs day — brutal.', 'Added 5kg on the bench.', 'Short session, still counted.', 'Felt strong today.'],
  journal: ['Wrote about the week ahead.', 'Mostly venting, but it helped.', 'Three things I am grateful for.'],
  inbox: ['Cleared everything before standup.', 'Took twice as long as usual.'],
};

const MOODS = ['great', 'good', 'okay', 'low', 'tough'];

/**
 * Each habit gets a completion probability and an optional recent perfect run,
 * so the seeded data shows off streaks, near-misses and milestones rather than
 * uniform noise.
 */
const HABIT_BLUEPRINTS = [
  {
    key: 'meditation',
    name: 'Morning Meditation',
    description: '10 minutes before anything else.',
    icon: 'Sun',
    color: '#E94560',
    category: 'morning-routine',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '07:00' },
    probability: 0.72,
    perfectRunDays: 31, // pushes past the 30-day milestone
    noteChance: 0.3,
  },
  {
    key: 'water',
    name: 'Drink 2L Water',
    description: 'Two full bottles before 6pm.',
    icon: 'Drop',
    color: '#2D9CDB',
    category: 'health',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '13:00' },
    probability: 0.85,
    perfectRunDays: 9,
    noteChance: 0.12,
  },
  {
    key: 'reading',
    name: 'Read 20 Pages',
    description: 'Anything that is not a screen.',
    icon: 'BookOpen',
    color: '#9B51E0',
    category: 'learning',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: true, time: '21:30' },
    probability: 0.63,
    perfectRunDays: 4,
    noteChance: 0.35,
  },
  {
    key: 'gym',
    name: 'Gym Workout',
    description: 'Strength training, 45 minutes.',
    icon: 'Barbell',
    color: '#27AE60',
    category: 'health',
    frequency: { type: 'custom', daysOfWeek: [1, 3, 5], timesPerWeek: 3 },
    reminder: { enabled: true, time: '18:00' },
    probability: 0.78,
    perfectRunDays: 0,
    noteChance: 0.4,
  },
  {
    key: 'journal',
    name: 'Journal',
    description: 'A few lines, three times a week.',
    icon: 'NotePencil',
    color: '#F2994A',
    category: 'personal',
    frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 3 },
    reminder: { enabled: false, time: '20:00' },
    probability: 0.5,
    perfectRunDays: 0,
    noteChance: 0.6,
  },
  {
    key: 'inbox',
    name: 'Inbox Zero',
    description: 'Clear the inbox before logging off.',
    icon: 'Tray',
    color: '#1A1A2E',
    category: 'work',
    frequency: { type: 'custom', daysOfWeek: [1, 2, 3, 4, 5], timesPerWeek: 5 },
    reminder: { enabled: true, time: '17:30' },
    probability: 0.66,
    perfectRunDays: 0,
    noteChance: 0.15,
  },
];

async function seedUser({ email, name, role, timezone }) {
  await User.deleteOne({ email });

  const user = new User({
    email,
    name,
    role,
    timezone,
    theme: 'system',
    onboardingComplete: true,
    notificationsEnabled: true,
  });
  await user.setPassword(PASSWORD);
  await user.save();

  return user;
}

async function seedHabitsFor(user, today) {
  const startDate = addDays(today, -(HISTORY_DAYS - 1));
  const random = createRandom(20250615);

  const habits = [];
  const checkIns = [];

  for (const [index, blueprint] of HABIT_BLUEPRINTS.entries()) {
    const habit = await Habit.create({
      userId: user._id,
      name: blueprint.name,
      description: blueprint.description,
      icon: blueprint.icon,
      color: blueprint.color,
      category: blueprint.category,
      frequency: blueprint.frequency,
      reminder: blueprint.reminder,
      order: index,
      startDate,
    });
    habits.push(habit);

    const perfectFrom = blueprint.perfectRunDays > 0 ? addDays(today, -(blueprint.perfectRunDays - 1)) : null;

    for (const date of rangeKeys(startDate, today)) {
      const scheduled = isScheduledOn(habit, date);

      // Weekly habits are flexible, so they land on a few days a week rather
      // than being eligible every single day.
      if (blueprint.frequency.type === 'weekly' && ![1, 3, 6].includes(dayOfWeek(date))) continue;
      if (!scheduled) continue;

      // Today is deliberately left partly undone, so the Today view has
      // something to actually check off when you open the app.
      if (date === today && index % 2 === 1) continue;

      const inPerfectRun = perfectFrom !== null && date >= perfectFrom;
      if (!inPerfectRun && random() > blueprint.probability) continue;

      const roll = random();

      // Stamp each check-in near the habit's own reminder time, with a little
      // jitter. Without this every row shares the seed script's timestamp and
      // the time-of-day insight reports a meaningless 100%.
      const [hour, minute] = blueprint.reminder.time.split(':').map(Number);
      const jitter = Math.round((random() - 0.5) * 90); // ±45 minutes
      const createdAt = new Date(`${date}T00:00:00.000Z`);
      createdAt.setUTCMinutes(hour * 60 + minute + jitter - 330); // 330 = IST offset

      checkIns.push({
        userId: user._id,
        habitId: habit._id,
        date,
        note: roll < blueprint.noteChance ? pick(NOTES[blueprint.key], random) : '',
        mood: roll < blueprint.noteChance ? pick(MOODS, random) : null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  // timestamps: false so Mongoose keeps the back-dated createdAt values above
  // rather than stamping every row with the moment the seed ran.
  await CheckIn.insertMany(checkIns, { timestamps: false });
  return { habits, checkIns };
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

async function run() {
  await connectDatabase();

  const today = todayKey('Asia/Kolkata');

  // Remove any previous demo data before rebuilding.
  const previous = await User.find({ email: { $in: [DEMO_EMAIL, ADMIN_EMAIL] } }).select('_id');
  if (previous.length > 0) {
    const ids = previous.map((u) => u._id);
    await Promise.all([
      CheckIn.deleteMany({ userId: { $in: ids } }),
      Habit.deleteMany({ userId: { $in: ids } }),
      StreakFreeze.deleteMany({ userId: { $in: ids } }),
    ]);
  }

  const demo = await seedUser({
    email: DEMO_EMAIL,
    name: 'Demo User',
    role: 'user',
    timezone: 'Asia/Kolkata',
  });
  const { habits, checkIns } = await seedHabitsFor(demo, today);

  // The admin account has no habits of its own — it exists to exercise the
  // admin panel, which only reads other people's data.
  await seedUser({
    email: ADMIN_EMAIL,
    name: 'Asense Admin',
    role: 'admin',
    timezone: 'Asia/Kolkata',
  });

  // One freeze already spent, a fortnight back. Far enough that it will not
  // fire the "your streak was saved" notice on first load — the demo should
  // show the mechanic existing, not stage a rescue that never happened.
  const spentOn = addDays(today, -13);
  await StreakFreeze.create({
    userId: demo._id,
    date: spentOn,
    habitsProtected: 2,
    seenAt: new Date(),
  });
  demo.lastReconciledDate = addDays(today, -1);
  await demo.save();

  logger.info(`Seeded ${habits.length} habits and ${checkIns.length} check-ins over ${HISTORY_DAYS} days`);
  logger.info(`One streak freeze already spent on ${spentOn}`);
  logger.info('');
  logger.info('  Demo account   ' + DEMO_EMAIL + '  /  ' + PASSWORD);
  logger.info('  Admin account  ' + ADMIN_EMAIL + '  /  ' + PASSWORD);
  logger.info('');

  await mongoose.connection.close();
}

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger.error('Seed failed:', error.message);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
