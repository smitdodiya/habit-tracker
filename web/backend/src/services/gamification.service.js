/**
 * XP, levels and achievements.
 *
 * XP is DERIVED from the user's history rather than accumulated in a counter,
 * and that is a correctness decision as much as a tidiness one. Check-in is
 * deliberately idempotent — a double-tap or a retried request hits the same
 * row twice. An `$inc`-style XP counter would happily award that twice. A
 * formula over what actually exists cannot double-count, and it lets the curve
 * be retuned later without a data migration.
 *
 * Achievements *are* stored, because they need an `unlockedAt` to drive the
 * "new!" state and to be celebrated exactly once. They stay safe by being
 * evaluated idempotently: recompute the whole set, persist only what is
 * missing, and report back only what was genuinely new.
 */

import { dayOfWeek, timeOfDayFor, daysBetween } from '../utils/date.js';
import { isScheduledOn } from '../utils/frequency.js';

// ---------------------------------------------------------------- XP

export const XP_PER_CHECKIN = 10;
export const XP_PER_PERFECT_DAY = 5;
export const XP_PER_MILESTONE = 25;

/**
 * Total XP from the raw history.
 *
 * @param totals.checkIns   lifetime check-in count
 * @param totals.perfectDays days where every due habit was completed
 * @param totals.milestones  milestone streaks reached across all habits
 */
export function computeXp({ checkIns = 0, perfectDays = 0, milestones = 0 }) {
  return checkIns * XP_PER_CHECKIN + perfectDays * XP_PER_PERFECT_DAY + milestones * XP_PER_MILESTONE;
}

/**
 * Level curve: level n begins at 50·n·(n−1) XP.
 *
 * Level 2 at 100 XP (≈10 check-ins), level 5 at 1,000, level 10 at 4,500.
 * Deliberately steepening — early levels should arrive fast enough to teach
 * the mechanic, later ones slowly enough to stay worth something.
 */
export function xpForLevel(level) {
  return 50 * level * (level - 1);
}

export const LEVEL_TITLES = [
  { from: 1, title: 'Getting Started' },
  { from: 3, title: 'Finding Rhythm' },
  { from: 6, title: 'Consistent' },
  { from: 10, title: 'Committed' },
  { from: 15, title: 'Relentless' },
  { from: 22, title: 'Unstoppable' },
];

export function titleForLevel(level) {
  return [...LEVEL_TITLES].reverse().find((band) => level >= band.from)?.title ?? 'Getting Started';
}

/** Resolves raw XP into level, title and progress toward the next level. */
export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;

  const levelStart = xpForLevel(level);
  const levelEnd = xpForLevel(level + 1);

  return {
    xp,
    level,
    title: titleForLevel(level),
    levelStartXp: levelStart,
    nextLevelXp: levelEnd,
    xpIntoLevel: xp - levelStart,
    xpForNextLevel: levelEnd - levelStart,
    progress: (xp - levelStart) / (levelEnd - levelStart),
  };
}

// ------------------------------------------------------- Achievements

/**
 * Each achievement is a pure predicate over a snapshot of the user's history,
 * so the whole set can be re-evaluated cheaply and idempotently at any time.
 *
 * `secret` ones render as "???" until earned — the mystery is most of the pull.
 */
export const ACHIEVEMENTS = [
  {
    key: 'first-step',
    name: 'First Step',
    description: 'Check in for the first time',
    icon: 'Footprints',
    test: (s) => s.totalCheckIns >= 1,
  },
  {
    key: 'week-one',
    name: 'Week One',
    description: 'Reach a 7-day streak',
    icon: 'Fire',
    test: (s) => s.bestStreakEver >= 7,
  },
  {
    key: 'month-master',
    name: 'Month Master',
    description: 'Reach a 30-day streak',
    icon: 'Medal',
    test: (s) => s.bestStreakEver >= 30,
  },
  {
    key: 'century',
    name: 'Century',
    description: 'Reach a 100-day streak',
    icon: 'Trophy',
    test: (s) => s.bestStreakEver >= 100,
  },
  {
    key: 'early-bird',
    name: 'Early Bird',
    description: 'Check in before 8am, 10 times',
    icon: 'SunHorizon',
    test: (s) => s.earlyCheckIns >= 10,
  },
  {
    key: 'night-owl',
    name: 'Night Owl',
    description: 'Check in after 10pm, 10 times',
    icon: 'MoonStars',
    test: (s) => s.lateCheckIns >= 10,
  },
  {
    key: 'perfect-week',
    name: 'Perfect Week',
    description: 'Complete every habit, 7 days running',
    icon: 'Sparkle',
    test: (s) => s.longestPerfectRun >= 7,
  },
  {
    key: 'comeback',
    name: 'Comeback',
    description: 'Return after a week away',
    icon: 'ArrowUUpLeft',
    test: (s) => s.hasComeback,
  },
  {
    key: 'collector',
    name: 'Collector',
    description: 'Track 5 habits at once',
    icon: 'Stack',
    test: (s) => s.activeHabits >= 5,
  },
  {
    key: 'centurion',
    name: 'Centurion',
    description: 'Log 100 check-ins',
    icon: 'ChartLineUp',
    test: (s) => s.totalCheckIns >= 100,
  },
  {
    key: 'note-taker',
    name: 'Note Taker',
    description: 'Write 25 reflections',
    icon: 'NotePencil',
    test: (s) => s.notesWritten >= 25,
  },
  {
    key: 'well-rounded',
    name: 'Well Rounded',
    description: 'Keep habits in 4 different categories',
    icon: 'CirclesFour',
    test: (s) => s.categoriesUsed >= 4,
  },
  {
    key: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Check in on 10 weekend days',
    icon: 'Confetti',
    secret: true,
    test: (s) => s.weekendCheckIns >= 10,
  },
  {
    key: 'unshakeable',
    name: 'Unshakeable',
    description: 'Hold a streak without spending a freeze for 21 days',
    icon: 'ShieldCheck',
    secret: true,
    test: (s) => s.bestStreakEver >= 21 && s.freezesUsed === 0,
  },
];

/**
 * Builds the snapshot the predicates run against.
 *
 * Everything is computed from data already loaded for the check-in response,
 * so this adds no extra round trips.
 */
export function buildAchievementSnapshot({
  habits,
  checkIns,
  user,
  streaks = [],
  freezesUsed = 0,
  perfectDays = [],
}) {
  const timezone = user.timezone ?? 'UTC';

  let earlyCheckIns = 0;
  let lateCheckIns = 0;
  let weekendCheckIns = 0;
  let notesWritten = 0;

  for (const checkIn of checkIns) {
    if (checkIn.note) notesWritten += 1;

    const weekday = dayOfWeek(checkIn.date);
    if (weekday === 0 || weekday === 6) weekendCheckIns += 1;

    // createdAt is a real instant, so it has to be read in the user's own
    // timezone — "before 8am" means their morning, not the server's.
    if (checkIn.createdAt) {
      const hour = Number(timeOfDayFor(checkIn.createdAt, timezone).slice(0, 2));
      if (hour < 8) earlyCheckIns += 1;
      if (hour >= 22) lateCheckIns += 1;
    }
  }

  return {
    totalCheckIns: checkIns.length,
    activeHabits: habits.filter((habit) => !habit.archived).length,
    categoriesUsed: new Set(habits.map((habit) => habit.category)).size,
    bestStreakEver: streaks.reduce((best, s) => Math.max(best, s.longest), 0),
    longestPerfectRun: longestConsecutiveRun(perfectDays),
    hasComeback: hasComebackGap(checkIns),
    earlyCheckIns,
    lateCheckIns,
    weekendCheckIns,
    notesWritten,
    freezesUsed,
  };
}

/**
 * Evaluates every achievement and records the newly earned ones.
 * Safe to call on every check-in: already-held keys are never re-added, so a
 * duplicate request cannot re-trigger a celebration.
 *
 * @returns {{unlocked: Array, newlyUnlocked: Array}}
 */
export function evaluateAchievements(user, snapshot) {
  const held = new Map((user.achievements ?? []).map((a) => [a.key, a]));
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (held.has(achievement.key)) continue;
    if (!achievement.test(snapshot)) continue;

    const record = { key: achievement.key, unlockedAt: new Date() };
    held.set(achievement.key, record);
    newlyUnlocked.push(describeAchievement(achievement, record));
  }

  if (newlyUnlocked.length > 0) {
    user.achievements = [...held.values()];
  }

  return {
    unlocked: [...held.values()].map((record) =>
      describeAchievement(
        ACHIEVEMENTS.find((a) => a.key === record.key),
        record,
      ),
    ),
    newlyUnlocked,
  };
}

/** Full catalogue with locked/unlocked state, for the achievements screen. */
export function listAchievements(user) {
  const held = new Map((user.achievements ?? []).map((a) => [a.key, a]));

  return ACHIEVEMENTS.map((achievement) => {
    const record = held.get(achievement.key);
    return {
      key: achievement.key,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      secret: Boolean(achievement.secret),
      unlocked: Boolean(record),
      unlockedAt: record?.unlockedAt ?? null,
    };
  });
}

function describeAchievement(achievement, record) {
  if (!achievement) return null;
  return {
    key: achievement.key,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    unlockedAt: record.unlockedAt,
  };
}

/** Longest run of consecutive dates in a list of date keys. */
export function longestConsecutiveRun(dateKeys) {
  const sorted = [...new Set(dateKeys)].sort();
  let longest = 0;
  let run = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return longest;
}

/** True if the user ever returned after a gap of 7 days or more. */
function hasComebackGap(checkIns) {
  const dates = [...new Set(checkIns.map((c) => c.date))].sort();
  for (let i = 1; i < dates.length; i += 1) {
    if (daysBetween(dates[i - 1], dates[i]) >= 7) return true;
  }
  return false;
}

/**
 * Days on which every habit that was due got done. Used for perfect-day XP
 * and the Perfect Week achievement.
 */
export function findPerfectDays(habits, checkIns) {
  const doneByDate = new Map();
  for (const checkIn of checkIns) {
    if (!doneByDate.has(checkIn.date)) doneByDate.set(checkIn.date, new Set());
    doneByDate.get(checkIn.date).add(checkIn.habitId.toString());
  }

  const perfect = [];
  for (const [date, doneIds] of doneByDate) {
    const due = habits.filter(
      (habit) => daysBetween(habit.startDate, date) >= 0 && isScheduledOn(habit, date),
    );
    // A day with nothing due is a rest day, not a perfect one.
    if (due.length === 0) continue;
    if (due.every((habit) => doneIds.has(habit._id.toString()))) perfect.push(date);
  }

  return perfect.sort();
}
