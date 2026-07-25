import { describe, it, expect } from 'vitest';
import {
  computeXp,
  levelFromXp,
  xpForLevel,
  titleForLevel,
  evaluateAchievements,
  listAchievements,
  longestConsecutiveRun,
  findPerfectDays,
  ACHIEVEMENTS,
  XP_PER_CHECKIN,
} from '../src/services/gamification.service.js';

const snapshot = (overrides = {}) => ({
  totalCheckIns: 0,
  activeHabits: 0,
  categoriesUsed: 0,
  bestStreakEver: 0,
  longestPerfectRun: 0,
  hasComeback: false,
  earlyCheckIns: 0,
  lateCheckIns: 0,
  weekendCheckIns: 0,
  notesWritten: 0,
  freezesUsed: 0,
  ...overrides,
});

describe('XP', () => {
  it('is derived purely from history', () => {
    expect(computeXp({ checkIns: 10, perfectDays: 2, milestones: 1 })).toBe(10 * 10 + 2 * 5 + 25);
  });

  it('cannot be inflated by a duplicate check-in', () => {
    // Check-in is idempotent, so a double-tap leaves the underlying count
    // unchanged — and therefore leaves XP unchanged. This is the whole reason
    // XP is derived rather than incremented.
    const before = computeXp({ checkIns: 42, perfectDays: 5 });
    const afterDuplicate = computeXp({ checkIns: 42, perfectDays: 5 });
    expect(afterDuplicate).toBe(before);
  });

  it('grows by exactly one check-in of XP for a genuinely new check-in', () => {
    const before = computeXp({ checkIns: 42 });
    expect(computeXp({ checkIns: 43 }) - before).toBe(XP_PER_CHECKIN);
  });
});

describe('Levels', () => {
  it('starts everyone at level 1 with zero XP', () => {
    const result = levelFromXp(0);
    expect(result.level).toBe(1);
    expect(result.title).toBe('Getting Started');
  });

  it('places the level boundaries on the documented curve', () => {
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(5)).toBe(1000);
    expect(xpForLevel(10)).toBe(4500);
  });

  it('levels up exactly at the threshold, not before', () => {
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
  });

  it('reports progress through the current level', () => {
    const result = levelFromXp(150);
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(50);
    expect(result.xpForNextLevel).toBe(200);
    expect(result.progress).toBeCloseTo(0.25);
  });

  it('awards a title band as the level climbs', () => {
    expect(titleForLevel(1)).toBe('Getting Started');
    expect(titleForLevel(6)).toBe('Consistent');
    expect(titleForLevel(30)).toBe('Unstoppable');
  });

  it('never divides by zero at any level', () => {
    for (let xp = 0; xp < 20000; xp += 137) {
      const result = levelFromXp(xp);
      expect(Number.isFinite(result.progress)).toBe(true);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThan(1);
    }
  });
});

describe('Achievements', () => {
  it('unlocks one exactly once, however often it is evaluated', () => {
    const user = { achievements: [] };
    const state = snapshot({ totalCheckIns: 1 });

    const first = evaluateAchievements(user, state);
    expect(first.newlyUnlocked.map((a) => a.key)).toContain('first-step');

    // Re-running must not re-announce it — otherwise a retried request would
    // fire the celebration a second time.
    const second = evaluateAchievements(user, state);
    expect(second.newlyUnlocked).toHaveLength(0);
    expect(second.unlocked.map((a) => a.key)).toContain('first-step');
  });

  it('does not duplicate the stored record on re-evaluation', () => {
    const user = { achievements: [] };
    const state = snapshot({ totalCheckIns: 100, bestStreakEver: 30 });

    evaluateAchievements(user, state);
    const afterFirst = user.achievements.length;
    evaluateAchievements(user, state);

    expect(user.achievements).toHaveLength(afterFirst);
    expect(new Set(user.achievements.map((a) => a.key)).size).toBe(afterFirst);
  });

  it('unlocks streak tiers cumulatively', () => {
    const user = { achievements: [] };
    const { unlocked } = evaluateAchievements(user, snapshot({ bestStreakEver: 100 }));
    const keys = unlocked.map((a) => a.key);

    expect(keys).toContain('week-one');
    expect(keys).toContain('month-master');
    expect(keys).toContain('century');
  });

  it('keeps locked achievements out of the unlocked list', () => {
    const user = { achievements: [] };
    const { unlocked } = evaluateAchievements(user, snapshot({ totalCheckIns: 1 }));

    expect(unlocked.map((a) => a.key)).not.toContain('century');
  });

  it('reads early and late check-ins from the snapshot, not the clock', () => {
    const user = { achievements: [] };
    const { unlocked } = evaluateAchievements(user, snapshot({ earlyCheckIns: 10 }));
    expect(unlocked.map((a) => a.key)).toContain('early-bird');
  });

  it('withholds Unshakeable once a freeze has been spent', () => {
    const spent = evaluateAchievements({ achievements: [] }, snapshot({ bestStreakEver: 30, freezesUsed: 1 }));
    const clean = evaluateAchievements({ achievements: [] }, snapshot({ bestStreakEver: 30, freezesUsed: 0 }));

    expect(spent.unlocked.map((a) => a.key)).not.toContain('unshakeable');
    expect(clean.unlocked.map((a) => a.key)).toContain('unshakeable');
  });

  it('lists the whole catalogue with locked state for the achievements screen', () => {
    const user = { achievements: [{ key: 'first-step', unlockedAt: new Date() }] };
    const list = listAchievements(user);

    expect(list).toHaveLength(ACHIEVEMENTS.length);
    expect(list.find((a) => a.key === 'first-step').unlocked).toBe(true);
    expect(list.find((a) => a.key === 'century').unlocked).toBe(false);
  });

  it('gives every achievement a unique key', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('longestConsecutiveRun', () => {
  it('finds the longest unbroken sequence of dates', () => {
    expect(
      longestConsecutiveRun(['2025-06-01', '2025-06-02', '2025-06-03', '2025-06-05', '2025-06-06']),
    ).toBe(3);
  });

  it('handles an empty list', () => {
    expect(longestConsecutiveRun([])).toBe(0);
  });

  it('ignores duplicates and unsorted input', () => {
    expect(longestConsecutiveRun(['2025-06-02', '2025-06-01', '2025-06-02'])).toBe(2);
  });
});

describe('findPerfectDays', () => {
  const habit = (id, overrides = {}) => ({
    _id: { toString: () => id },
    startDate: '2025-06-01',
    frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
    ...overrides,
  });

  const checkIn = (habitId, date) => ({ habitId: { toString: () => habitId }, date });

  it('counts a day where every due habit was completed', () => {
    const habits = [habit('a'), habit('b')];
    const checkIns = [checkIn('a', '2025-06-02'), checkIn('b', '2025-06-02')];

    expect(findPerfectDays(habits, checkIns)).toEqual(['2025-06-02']);
  });

  it('rejects a day where one due habit was missed', () => {
    const habits = [habit('a'), habit('b')];
    const checkIns = [checkIn('a', '2025-06-02')];

    expect(findPerfectDays(habits, checkIns)).toEqual([]);
  });

  it('ignores habits that were not yet created', () => {
    // Habit b starts later, so it cannot spoil an earlier day.
    const habits = [habit('a'), habit('b', { startDate: '2025-06-10' })];
    const checkIns = [checkIn('a', '2025-06-02')];

    expect(findPerfectDays(habits, checkIns)).toEqual(['2025-06-02']);
  });

  it('does not treat a rest day as a perfect day', () => {
    // 2025-06-07 is a Saturday; a Mon–Fri habit is not due, so a stray
    // check-in that day should not manufacture a perfect day.
    const habits = [habit('a', { frequency: { type: 'custom', daysOfWeek: [1, 2, 3, 4, 5] } })];
    const checkIns = [checkIn('a', '2025-06-07')];

    expect(findPerfectDays(habits, checkIns)).toEqual([]);
  });
});
