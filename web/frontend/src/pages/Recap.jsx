import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkle, CheckSquare, Star, CalendarCheck } from '@phosphor-icons/react';

import { progressApi } from '../api/endpoints.js';
import { errorMessage } from '../api/client.js';
import { toast } from '../store/toastStore.js';

import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { AllDoneIllustration } from '../components/illustrations/Illustrations.jsx';
import { ShareCardActions } from '../components/share/ShareCard.jsx';
import { getIcon } from '../lib/icons.js';
import { formatDate, percent, withAlpha, WEEKDAY_INITIALS } from '../lib/format.js';
import { dayOfWeek } from '../lib/dates.js';

/**
 * Last week in review.
 *
 * Reports the week that has *finished* — a recap on a Tuesday is not a recap.
 * The tone is deliberately celebratory rather than evaluative: it exists to
 * make a good week feel good, not to grade a bad one.
 */
export function RecapPage() {
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    progressApi
      .recap()
      .then((data) => {
        setRecap(data);
        // Reaching this page counts as having seen it.
        progressApi.markRecapSeen().catch(() => {});
      })
      .catch((error) => toast.error(errorMessage(error, 'Could not load your recap')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" rounded="rounded-[14px]" />
        <Skeleton className="h-56 w-full" rounded="rounded-[14px]" />
      </div>
    );
  }

  if (!recap?.hasData) {
    return (
      <div className="space-y-5">
        <BackLink />
        <EmptyState
          illustration={AllDoneIllustration}
          title="No recap yet"
          description="Once you've had a full week of check-ins, your week in review will appear here every Monday."
        />
      </div>
    );
  }

  const { week, totals, days, busiestDay, topHabit } = recap;
  const peak = Math.max(1, ...days.map((day) => day.completed));

  return (
    <div className="space-y-5">
      <BackLink />

      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Your week in review</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {formatDate(week.start, { day: 'numeric', month: 'short' })} –{' '}
          {formatDate(week.end, { day: 'numeric', month: 'short' })}
        </p>
      </header>

      {/* ---- Headline ---- */}
      <section
        className="card overflow-hidden p-6 text-center"
        style={{ background: 'linear-gradient(160deg, var(--accent-soft), transparent)' }}
        aria-label="Week summary"
      >
        <p className="text-5xl font-extrabold tracking-tight text-[var(--text)]">{totals.checkIns}</p>
        <p className="mt-1 text-[0.8125rem] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
          check-ins this week
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
          {encouragement(totals)}
        </p>

        <div className="mt-5 flex justify-center">
          <ShareCardActions
            value={totals.checkIns}
            unit="check-ins"
            habitName="My week"
            // Zero perfect days is not something anyone wants to broadcast, so
            // the boast is only included when there is one to make.
            subtitle={[
              `${percent(totals.completionRate)} complete`,
              totals.perfectDays > 0 &&
                `${totals.perfectDays} perfect day${totals.perfectDays === 1 ? '' : 's'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
            ratio={totals.completionRate}
            accent="#E94560"
            compact
          />
        </div>
      </section>

      {/* ---- Numbers ---- */}
      <section className="grid grid-cols-3 gap-3" aria-label="Week totals">
        <Stat icon={CheckSquare} label="Completion" value={percent(totals.completionRate)} />
        <Stat icon={Sparkle} label="Perfect days" value={totals.perfectDays} />
        <Stat icon={Star} label="Notes" value={totals.notesWritten} />
      </section>

      {/* ---- Day by day ---- */}
      <section className="card p-5" aria-label="Day by day">
        <h2 className="mb-4 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Day by day
        </h2>

        <div className="flex h-28 items-end gap-2">
          {days.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[5px] bg-[var(--accent)] transition-all duration-500"
                  style={{
                    height: `${(day.completed / peak) * 100}%`,
                    minHeight: day.completed > 0 ? 4 : 0,
                  }}
                  title={`${formatDate(day.date)}: ${day.completed} of ${day.scheduled}`}
                />
              </div>
              <span className="text-[0.625rem] font-semibold text-[var(--text-muted)]">
                {WEEKDAY_INITIALS[dayOfWeek(day.date)]}
              </span>
            </div>
          ))}
        </div>

        {busiestDay && busiestDay.completed > 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <CalendarCheck size={13} />
            Your biggest day was {formatDate(busiestDay.date, { weekday: 'long' })} with{' '}
            {busiestDay.completed} check-ins.
          </p>
        )}
      </section>

      {/* ---- Star habit ---- */}
      {topHabit && (
        <section className="card p-5" aria-label="Habit of the week">
          <h2 className="mb-3.5 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Habit of the week
          </h2>

          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]"
              style={{ background: withAlpha(topHabit.color, 0.14), color: topHabit.color }}
            >
              {(() => {
                const Icon = getIcon(topHabit.icon);
                return <Icon size={22} weight="duotone" />;
              })()}
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--text)]">{topHabit.name}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {topHabit.count} check-in{topHabit.count === 1 ? '' : 's'} this week
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/today"
      className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
    >
      <ArrowLeft size={15} weight="bold" />
      Back to today
    </Link>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
        <Icon size={13} weight="fill" />
        <span className="text-[0.6875rem] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight text-[var(--text)]">{value}</p>
    </div>
  );
}

/**
 * A line of encouragement matched to how the week actually went.
 * Never scolds — a bad week is when someone most needs a reason to come back.
 */
function encouragement({ completionRate, perfectDays, checkIns }) {
  if (perfectDays >= 5) return 'An outstanding week. Almost every day, everything done.';
  if (completionRate >= 0.9) return 'Very nearly perfect. This is what consistency looks like.';
  if (completionRate >= 0.7) return 'A strong week — you showed up far more often than not.';
  if (completionRate >= 0.4) return 'Solid progress. Every one of these counts toward the habit.';
  if (checkIns > 0) return 'A quieter week, but you still showed up. That is the part that matters.';
  return 'A fresh week starts today.';
}
