import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lightning, Snowflake, Trophy } from '@phosphor-icons/react';

import { useProgressStore } from '../store/progressStore.js';
import { toast } from '../store/toastStore.js';
import { errorMessage } from '../api/client.js';

import { AchievementGrid } from '../components/gamification/Achievements.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { useCountUp } from '../lib/animate.js';

/** The trophy cabinet: level, XP, freezes and every badge. */
export function AchievementsPage() {
  const progress = useProgressStore((state) => state.progress);
  const load = useProgressStore((state) => state.load);
  const status = useProgressStore((state) => state.status);

  useEffect(() => {
    load().catch((error) => toast.error(errorMessage(error, 'Could not load your progress')));
  }, [load]);

  const xp = useCountUp(progress?.xp ?? 0);

  if (status === 'loading' || !progress) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" rounded="rounded-[14px]" />
        <Skeleton className="h-64 w-full" rounded="rounded-[14px]" />
      </div>
    );
  }

  const { level, title, xpIntoLevel, xpForNextLevel, freezes, achievements, perfectDays, totalCheckIns } =
    progress;
  const pct = xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0;

  return (
    <div className="space-y-5">
      <Link
        to="/today"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} weight="bold" />
        Back to today
      </Link>

      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Achievements</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">Everything you've earned so far</p>
      </header>

      {/* ---- Level ---- */}
      <section className="card p-5" aria-label="Level">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--accent-strong)] text-xl font-extrabold text-white"
            >
              {level}
            </span>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-[var(--text)]">{title}</p>
              <p className="flex items-center gap-1 text-[0.8125rem] text-[var(--text-muted)]">
                <Lightning size={13} weight="fill" />
                {xp.toLocaleString()} XP total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[var(--surface-3)] px-3 py-2">
            <Snowflake size={16} weight="fill" className="text-[#2D9CDB]" />
            <span className="text-[0.8125rem] font-bold text-[var(--text)]">
              {freezes.available}
              <span className="font-medium text-[var(--text-muted)]">/{freezes.max}</span>
            </span>
            <span className="text-xs text-[var(--text-muted)]">freezes</span>
          </div>
        </div>

        <div className="mt-4">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-3)]"
            role="progressbar"
            aria-valuenow={xpIntoLevel}
            aria-valuemin={0}
            aria-valuemax={xpForNextLevel}
            aria-label={`Progress to level ${level + 1}`}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700 ease-out"
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {xpIntoLevel} / {xpForNextLevel} XP toward level {level + 1}
          </p>
        </div>
      </section>

      {/* ---- Lifetime numbers ---- */}
      <section className="grid grid-cols-3 gap-3" aria-label="Lifetime totals">
        <Stat icon={Trophy} label="Badges" value={`${achievements.filter((a) => a.unlocked).length}/${achievements.length}`} />
        <Stat icon={Lightning} label="Check-ins" value={totalCheckIns} />
        <Stat icon={Snowflake} label="Perfect days" value={perfectDays} />
      </section>

      {/* ---- Badges ---- */}
      <section className="card p-5">
        <AchievementGrid achievements={achievements} />

        <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs leading-relaxed text-[var(--text-subtle)]">
          XP comes from check-ins ({10} each), perfect days ({5} bonus) and streak milestones ({25} each).
          You earn a streak freeze every 7 active days — it covers a missed day automatically, so one
          bad day never costs you a run.
        </p>
      </section>
    </div>
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
