import { Fire, Trophy } from '@phosphor-icons/react';

/**
 * Streak indicator.
 *
 * The unit comes from the server — daily and custom-day habits streak in days,
 * flexible weekly habits streak in weeks — so the label always matches how the
 * habit is actually scheduled.
 *
 * Milestone streaks (7/30/100 days, 4/12/52 weeks) get a filled treatment and
 * a trophy, so an earned milestone is visible at a glance on the list.
 */

const DAY_MILESTONES = [7, 30, 100, 365];
const WEEK_MILESTONES = [4, 12, 26, 52];

export function StreakBadge({ stats, size = 'md' }) {
  const { current = 0, unit = 'day', nextMilestone } = stats ?? {};

  const milestones = unit === 'week' ? WEEK_MILESTONES : DAY_MILESTONES;
  const atMilestone = milestones.includes(current);

  const sizes = {
    sm: 'gap-1 px-1.5 py-0.5 text-[0.6875rem]',
    md: 'gap-1 px-2 py-0.5 text-xs',
  };
  const iconSize = size === 'sm' ? 11 : 13;

  if (current === 0) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-[var(--surface-3)] font-semibold text-[var(--text-subtle)] ${sizes[size]}`}
      >
        No streak yet
      </span>
    );
  }

  const label = `${current} ${unit}${current === 1 ? '' : 's'}`;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-bold',
        atMilestone
          ? 'bg-[var(--accent-strong)] text-white'
          : 'bg-[var(--accent-soft)] text-[var(--accent-strong)]',
        sizes[size],
      ].join(' ')}
      // Screen readers get the full sentence; sighted users get the compact chip.
      title={nextMilestone ? `${label} — next milestone at ${nextMilestone}` : label}
    >
      {atMilestone ? <Trophy size={iconSize} weight="fill" /> : <Fire size={iconSize} weight="fill" />}
      <span className="sr-only">Current streak: </span>
      {label}
    </span>
  );
}

/**
 * Larger streak display for the habit detail header, with progress toward the
 * next milestone.
 */
export function StreakSummary({ stats }) {
  const { current = 0, longest = 0, unit = 'day', nextMilestone } = stats ?? {};
  const progress = nextMilestone ? Math.min(1, current / nextMilestone) : 1;

  return (
    <div className="space-y-2.5">
      <div className="flex items-end gap-5">
        <div>
          <p className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-[var(--text)]">{current}</span>
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {unit}
              {current === 1 ? '' : 's'}
            </span>
          </p>
          <p className="text-xs font-medium text-[var(--text-muted)]">Current streak</p>
        </div>

        <div>
          <p className="text-lg font-bold text-[var(--text)]">{longest}</p>
          <p className="text-xs font-medium text-[var(--text-muted)]">Longest</p>
        </div>
      </div>

      {nextMilestone && (
        <div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={nextMilestone}
            aria-label={`Progress to ${nextMilestone} ${unit} milestone`}
          >
            <div
              className="h-full rounded-full bg-[var(--accent-strong)] transition-[width] duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {nextMilestone - current} more to reach {nextMilestone} {unit}
            {nextMilestone === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  );
}
