import { describe, it, expect } from 'vitest';
import { computeStreak } from '../src/services/streak.service.js';
import { addDays, dayOfWeek, rangeKeys, startOfWeek } from '../src/utils/date.js';

/**
 * Streaks are the feature users notice when it's wrong and never when it's
 * right, so these tests pin down the rules the service promises: the grace
 * period for an unfinished today, frequency-aware scheduling, and week-based
 * counting for flexible weekly habits.
 */

const TODAY = '2025-06-15'; // a Sunday
const habit = (overrides = {}) => ({
  startDate: '2025-01-01',
  frequency: { type: 'daily', daysOfWeek: [], timesPerWeek: 3 },
  ...overrides,
});

/** The last `n` days ending at `endKey`, inclusive. */
const lastNDays = (n, endKey = TODAY) => rangeKeys(addDays(endKey, -(n - 1)), endKey);

describe('computeStreak — daily habits', () => {
  it('counts consecutive completed days', () => {
    const result = computeStreak(habit(), lastNDays(5), TODAY);
    expect(result.current).toBe(5);
    expect(result.unit).toBe('day');
  });

  it('does not break the streak when today is still unfinished', () => {
    // Completed through yesterday; today is due but not yet ticked.
    const completed = lastNDays(5, addDays(TODAY, -1));
    const result = computeStreak(habit(), completed, TODAY);

    expect(result.current).toBe(5);
    expect(result.completedToday).toBe(false);
    expect(result.scheduledToday).toBe(true);
  });

  it('breaks the streak once a full day has been missed', () => {
    // Completed through the day before yesterday; yesterday missed.
    const completed = lastNDays(5, addDays(TODAY, -2));
    expect(computeStreak(habit(), completed, TODAY).current).toBe(0);
  });

  it('remembers the longest streak after a break', () => {
    const completed = [
      ...rangeKeys('2025-05-01', '2025-05-10'), // 10-day run
      ...lastNDays(3), // current 3-day run
    ];
    const result = computeStreak(habit(), completed, TODAY);

    expect(result.current).toBe(3);
    expect(result.longest).toBe(10);
  });

  it('never looks back past the habit start date', () => {
    // Created 3 days ago and completed every day since — the untracked days
    // before creation must not read as misses.
    const startDate = addDays(TODAY, -2);
    const result = computeStreak(habit({ startDate }), lastNDays(3), TODAY);

    expect(result.current).toBe(3);
    expect(result.completionRate).toBe(1);
  });

  it('reports a completion rate over scheduled days only', () => {
    const startDate = addDays(TODAY, -9); // 10 scheduled days
    const result = computeStreak(habit({ startDate }), lastNDays(5), TODAY);
    expect(result.completionRate).toBeCloseTo(0.5);
  });
});

describe('computeStreak — custom-day habits', () => {
  const monWedFri = habit({
    startDate: '2025-06-02',
    frequency: { type: 'custom', daysOfWeek: [1, 3, 5], timesPerWeek: 3 },
  });

  it('ignores days the habit was never scheduled on', () => {
    // Every Mon/Wed/Fri in the window completed; the Tue/Thu/Sat/Sun gaps
    // between them must not count as misses.
    const scheduled = rangeKeys('2025-06-02', '2025-06-13').filter((key) =>
      [1, 3, 5].includes(dayOfWeek(key)),
    );
    const result = computeStreak(monWedFri, scheduled, TODAY);

    expect(result.current).toBe(scheduled.length);
    expect(result.completionRate).toBe(1);
  });

  it('is not marked due on an off day', () => {
    // 2025-06-15 is a Sunday, so a Mon/Wed/Fri habit is not scheduled.
    const result = computeStreak(monWedFri, [], TODAY);
    expect(result.scheduledToday).toBe(false);
  });

  it('breaks when a scheduled day is missed', () => {
    const scheduled = rangeKeys('2025-06-02', '2025-06-13').filter((key) =>
      [1, 3, 5].includes(dayOfWeek(key)),
    );
    // Drop the most recent scheduled day (Fri 2025-06-13).
    const result = computeStreak(monWedFri, scheduled.slice(0, -1), TODAY);
    expect(result.current).toBe(0);
  });
});

describe('computeStreak — weekly habits', () => {
  const threePerWeek = habit({
    startDate: '2025-05-05', // a Monday, so weeks line up cleanly
    frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 3 },
  });

  /** Picks `count` days from the week starting at `weekStart`. */
  const daysInWeek = (weekStart, count) => rangeKeys(weekStart, addDays(weekStart, 6)).slice(0, count);

  it('counts in weeks, not days', () => {
    const completed = [
      ...daysInWeek('2025-05-26', 3),
      ...daysInWeek('2025-06-02', 3),
      ...daysInWeek('2025-06-09', 3),
    ];
    const result = computeStreak(threePerWeek, completed, TODAY);

    expect(result.unit).toBe('week');
    expect(result.current).toBe(3);
  });

  it('does not penalise the current week while it is still running', () => {
    // Weeks of May 26 and Jun 2 met the target; the week containing TODAY
    // (Jun 9-15) has only one completion so far. TODAY is the Sunday that
    // closes that week, but the streak should still show the two banked weeks.
    const completed = [
      ...daysInWeek('2025-05-26', 3),
      ...daysInWeek('2025-06-02', 3),
      '2025-06-09',
    ];
    expect(computeStreak(threePerWeek, completed, TODAY).current).toBe(2);
  });

  it('breaks when a completed week fell short of the target', () => {
    const completed = [
      ...daysInWeek('2025-05-26', 3),
      ...daysInWeek('2025-06-02', 2), // short week
      ...daysInWeek('2025-06-09', 3),
    ];
    // Only the current week counts; the shortfall before it ends the run.
    expect(computeStreak(threePerWeek, completed, TODAY).current).toBe(1);
  });

  it('prorates the first partial week so a mid-week start is not a failure', () => {
    // Habit created on a Saturday, completed that Saturday and Sunday: two of
    // the two days it existed for, which should count as a satisfied week.
    const saturdayStart = habit({
      startDate: '2025-06-07',
      frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 3 },
    });
    const completed = ['2025-06-07', '2025-06-08', ...daysInWeek('2025-06-09', 3)];

    expect(startOfWeek('2025-06-07')).toBe('2025-06-02');
    expect(computeStreak(saturdayStart, completed, TODAY).current).toBe(2);
  });
});

describe('computeStreak — milestones', () => {
  it('flags the exact day a milestone is reached', () => {
    const result = computeStreak(habit(), lastNDays(7), TODAY);
    expect(result.milestoneReached).toBe(7);
    expect(result.nextMilestone).toBe(30);
  });

  it('stays quiet between milestones', () => {
    const result = computeStreak(habit(), lastNDays(8), TODAY);
    expect(result.milestoneReached).toBeNull();
    expect(result.nextMilestone).toBe(30);
  });

  it('uses week-based milestones for weekly habits', () => {
    const weekly = habit({
      startDate: '2025-01-06',
      frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 1 },
    });
    const result = computeStreak(weekly, [], TODAY);
    expect(result.nextMilestone).toBe(4);
  });
});

describe('computeStreak — streak freezes', () => {
  it('a frozen day does not break the streak', () => {
    // Completed the last 5 days except 3 days ago, which was frozen.
    const missed = addDays(TODAY, -2);
    const completed = lastNDays(5).filter((key) => key !== missed);

    const result = computeStreak(habit(), completed, TODAY, new Set([missed]));
    expect(result.current).toBe(4);
  });

  it('a frozen day does not extend the streak either', () => {
    // Mon ✓ · Tue ❄️ · Wed ✓ is an unbroken run of two completions, not three.
    const start = addDays(TODAY, -2);
    const result = computeStreak(
      habit({ startDate: start }),
      [start, TODAY],
      TODAY,
      new Set([addDays(TODAY, -1)]),
    );

    expect(result.current).toBe(2);
  });

  it('still breaks on a missed day that was not frozen', () => {
    const missed = addDays(TODAY, -2);
    const completed = lastNDays(5).filter((key) => key !== missed);

    // Freeze covers a different, irrelevant day, so the gap still bites:
    // today and yesterday count, then the walk stops at the unprotected miss.
    const result = computeStreak(habit(), completed, TODAY, new Set(['2025-01-01']));
    expect(result.current).toBe(2);
  });

  it('counts a day that was both completed and frozen as a completion', () => {
    // A partially-missed day spends a freeze, but the habits actually done
    // that day must still earn their increment — otherwise the freeze would
    // punish the habits you did complete.
    const frozenDay = addDays(TODAY, -1);
    const result = computeStreak(habit(), lastNDays(3), TODAY, new Set([frozenDay]));

    expect(result.current).toBe(3);
  });

  it('excludes forgiven days from the completion rate', () => {
    // 10 scheduled days, 5 completed, 1 of the misses forgiven — the rate is
    // 5/9, not 5/10, because a forgiven day is not held against you.
    const startDate = addDays(TODAY, -9);
    const frozen = new Set([addDays(TODAY, -7)]);

    const result = computeStreak(habit({ startDate }), lastNDays(5), TODAY, frozen);
    expect(result.completionRate).toBeCloseTo(5 / 9);
  });

  it('bridges several frozen days in a row', () => {
    const start = addDays(TODAY, -4);
    const frozen = new Set([addDays(TODAY, -3), addDays(TODAY, -2), addDays(TODAY, -1)]);

    const result = computeStreak(habit({ startDate: start }), [start, TODAY], TODAY, frozen);
    expect(result.current).toBe(2);
  });

  it('behaves exactly as before when no freezes are passed', () => {
    const completed = lastNDays(5);
    expect(computeStreak(habit(), completed, TODAY)).toEqual(
      computeStreak(habit(), completed, TODAY, new Set()),
    );
  });

  it('lets a frozen day count toward a weekly habit quota', () => {
    // 3× per week: two completions plus a forgiven day satisfies the week.
    const weekly = habit({
      startDate: '2025-06-02',
      frequency: { type: 'weekly', daysOfWeek: [], timesPerWeek: 3 },
    });

    const withoutFreeze = computeStreak(weekly, ['2025-06-02', '2025-06-03'], TODAY);
    const withFreeze = computeStreak(
      weekly,
      ['2025-06-02', '2025-06-03'],
      TODAY,
      new Set(['2025-06-04']),
    );

    expect(withoutFreeze.current).toBe(0);
    expect(withFreeze.current).toBe(1);
  });
});

describe('computeStreak — edge cases', () => {
  it('returns a zeroed result for a habit starting in the future', () => {
    const future = habit({ startDate: addDays(TODAY, 3) });
    const result = computeStreak(future, [], TODAY);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it('handles a brand-new habit completed on its first day', () => {
    const result = computeStreak(habit({ startDate: TODAY }), [TODAY], TODAY);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.completedToday).toBe(true);
  });

  it('accepts a Set of keys as readily as an array', () => {
    const asSet = computeStreak(habit(), new Set(lastNDays(4)), TODAY);
    const asArray = computeStreak(habit(), lastNDays(4), TODAY);
    expect(asSet).toEqual(asArray);
  });
});
