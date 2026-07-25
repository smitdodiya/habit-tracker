import { useState } from 'react';
import { Snowflake, X } from '@phosphor-icons/react';
import { formatDate } from '../../lib/format.js';

/**
 * "A freeze saved your streak" — shown once, the next time the user opens the
 * app after missing a day.
 *
 * The tone matters more than the mechanic here. This is the moment a user
 * would otherwise open the app, see a zero, and quietly stop coming back. It
 * should read as the app quietly having their back, never as a scolding for
 * having missed — so there is no "you missed a day" anywhere in the copy.
 */
export function FreezeNotice({ notices = [], freezes, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || notices.length === 0) return null;

  const dates = notices.map((notice) => formatDate(notice.date, { weekday: 'long' }));
  const totalHabits = notices.reduce((sum, notice) => sum + (notice.habitsProtected ?? 0), 0);

  const when =
    dates.length === 1
      ? dates[0]
      : dates.length === 2
        ? `${dates[0]} and ${dates[1]}`
        : `${dates.slice(0, -1).join(', ')} and ${dates[dates.length - 1]}`;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <section
      className="animate-fade-in-up relative overflow-hidden rounded-[14px] border border-[#2D9CDB]/30 p-4"
      style={{ background: 'rgba(45, 156, 219, 0.08)' }}
      aria-label="Streak freeze used"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
      >
        <X size={14} weight="bold" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'rgba(45, 156, 219, 0.16)', color: '#2D9CDB' }}
        >
          <Snowflake size={20} weight="fill" />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text)]">
            {notices.length === 1 ? 'A freeze saved your streak' : `${notices.length} freezes saved your streaks`}
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
            {when} {dates.length === 1 ? 'was' : 'were'} covered, so{' '}
            {totalHabits === 1 ? 'your streak is' : `${totalHabits} streaks are`} still going.
          </p>

          {freezes && (
            <p className="mt-1.5 text-xs font-semibold text-[#2D9CDB]">
              {freezes.available > 0
                ? `${freezes.available} freeze${freezes.available === 1 ? '' : 's'} left`
                : 'No freezes left'}
              <span className="font-normal text-[var(--text-subtle)]">
                {' · '}next in {freezes.daysToNext} day{freezes.daysToNext === 1 ? '' : 's'}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
