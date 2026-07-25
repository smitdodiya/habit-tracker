import { useEffect, useState } from 'react';
import { Fire, Trophy, CheckSquare, Target } from '@phosphor-icons/react';

import { statsApi } from '../api/endpoints.js';
import { errorMessage } from '../api/client.js';
import { toast } from '../store/toastStore.js';

import { HeatmapCalendar } from '../components/charts/HeatmapCalendar.jsx';
import { WeeklyBarChart, CompletionRing, CategoryBars } from '../components/charts/Charts.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton, StatCardSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyHabitsIllustration } from '../components/illustrations/Illustrations.jsx';
import { categoryLabel, percent } from '../lib/format.js';

/**
 * Progress Dashboard (brief §04): heatmap calendar, weekly bar chart and the
 * habit completion summary.
 *
 * One request fetches everything for the selected range — the server does the
 * aggregation so the client isn't recomputing streaks over months of data on
 * every render.
 */

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: 'Year' },
];

export function DashboardPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    statsApi
      .dashboard(range)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => toast.error(errorMessage(error, 'Could not load your progress')))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Guards against a slow earlier range overwriting a newer selection.
    return () => {
      cancelled = true;
    };
  }, [range]);

  const summary = data?.summary;
  const hasHabits = (summary?.totalHabits ?? 0) > 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Progress</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            How consistently you've shown up
          </p>
        </div>

        {/* Range selector, styled as a segmented control. */}
        <div
          role="group"
          aria-label="Date range"
          className="flex rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-1"
        >
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              aria-pressed={range === option.value}
              className={[
                'rounded-[9px] px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors',
                range === option.value
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {loading && !data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-52 w-full" rounded="rounded-[14px]" />
          <Skeleton className="h-64 w-full" rounded="rounded-[14px]" />
        </div>
      ) : !hasHabits ? (
        <EmptyState
          illustration={EmptyHabitsIllustration}
          title="Nothing to chart yet"
          description="Once you've added a habit and checked in a few times, your progress will show up here."
        />
      ) : (
        <>
          {/* ---- Summary cards ---- */}
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Fire}
              label="Best active streak"
              value={summary.currentBestStreak}
              hint={`${summary.activeStreaks} habit${summary.activeStreaks === 1 ? '' : 's'} on a run`}
            />
            <StatCard icon={Trophy} label="Longest ever" value={summary.longestStreak} hint="Personal best" />
            <StatCard
              icon={CheckSquare}
              label="Check-ins"
              value={summary.checkInsInRange}
              hint={`In the last ${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`}
            />
            <StatCard
              icon={Target}
              label="Completion"
              value={percent(summary.completionRate)}
              hint={`${summary.doneToday}/${summary.dueToday} done today`}
            />
          </section>

          {/* ---- Heatmap ---- */}
          <section className="card p-5" aria-label="Activity heatmap">
            {/* Stacks on small screens — side by side, the helper text wraps
                into an awkward two-line block next to the heading. */}
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <h2 className="text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Activity
              </h2>
              <p className="text-xs text-[var(--text-muted)]">Darker means more of that day's habits done</p>
            </div>

            <HeatmapCalendar data={data.heatmap} todayKey={data.range.today} />
          </section>

          {/* ---- Weekly chart + completion ring ---- */}
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <section className="card p-5" aria-label="Weekly completions">
              <h2 className="mb-4 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Check-ins per week
              </h2>
              <WeeklyBarChart data={data.weekly} />
              <p className="mt-2 text-[0.6875rem] text-[var(--text-subtle)]">
                The outlined bar is the current week, still in progress.
              </p>
            </section>

            <section className="card flex flex-col items-center justify-center p-5" aria-label="Overall completion">
              <h2 className="mb-4 self-start text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Overall
              </h2>
              <CompletionRing value={summary.completionRate} size={128} strokeWidth={11} />
              <p className="mt-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                {summary.checkInsInRange} check-ins across {summary.totalHabits} habit
                {summary.totalHabits === 1 ? '' : 's'}
              </p>
            </section>
          </div>

          {/* ---- Category breakdown ---- */}
          {data.categories.length > 0 && (
            <section className="card p-5" aria-label="By category">
              <h2 className="mb-4 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                By category
              </h2>
              <CategoryBars data={data.categories} labelFor={categoryLabel} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <Icon size={14} weight="fill" />
        <span className="text-[0.6875rem] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)]">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--text-subtle)]">{hint}</p>}
    </div>
  );
}
