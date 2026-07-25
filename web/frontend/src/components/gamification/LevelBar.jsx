import { Snowflake, Lightning } from '@phosphor-icons/react';
import { useCountUp } from '../../lib/animate.js';

/**
 * The level and freeze strip that sits at the top of Today.
 *
 * Two very different rewards live side by side deliberately: XP is what you've
 * built, freezes are what protects it. Seeing the freeze count next to the
 * level is what makes the safety net feel real before you ever need it.
 */
export function LevelBar({ progress, onOpenAchievements }) {
  const xp = useCountUp(progress?.xp ?? 0);

  if (!progress) return null;

  const { level, title, xpIntoLevel, xpForNextLevel, freezes } = progress;
  const pct = xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0;

  return (
    <section className="card p-4" aria-label="Your progress">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-sm font-extrabold text-[var(--accent-strong)]"
          >
            {level}
          </span>
          <div>
            <p className="text-sm font-bold leading-tight text-[var(--text)]">
              Level {level}
              <span className="ml-1.5 font-semibold text-[var(--text-muted)]">{title}</span>
            </p>
            <p className="flex items-center gap-1 text-[0.6875rem] text-[var(--text-muted)]">
              <Lightning size={11} weight="fill" />
              {xp.toLocaleString()} XP
            </p>
          </div>
        </div>

        <FreezeChip freezes={freezes} />
      </div>

      <div className="mt-3">
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"
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

        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <p className="text-[0.6875rem] text-[var(--text-muted)]">
            {xpForNextLevel - xpIntoLevel} XP to level {level + 1}
          </p>
          {onOpenAchievements && (
            <button
              type="button"
              onClick={onOpenAchievements}
              className="text-[0.6875rem] font-semibold text-[var(--accent-strong)] hover:underline"
            >
              View achievements
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Freeze balance with progress toward the next one. */
export function FreezeChip({ freezes }) {
  if (!freezes) return null;

  const { available, max, daysToNext } = freezes;

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-[var(--surface-3)] px-2.5 py-1.5"
      title={
        available > 0
          ? `${available} streak freeze${available === 1 ? '' : 'es'} — each one saves a missed day`
          : `No freezes left. Next one in ${daysToNext} day${daysToNext === 1 ? '' : 's'}.`
      }
    >
      <Snowflake
        size={14}
        weight="fill"
        className={available > 0 ? 'text-[#2D9CDB]' : 'text-[var(--text-subtle)]'}
      />

      {/* Pips rather than a number: three of something reads as a stock you
          can spend far faster than the digit "3" does. */}
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full transition-colors"
            style={{ background: index < available ? '#2D9CDB' : 'var(--border-strong)' }}
          />
        ))}
      </span>

      <span className="sr-only">
        {available} of {max} streak freezes available
      </span>

      {available === 0 && (
        <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)]">{daysToNext}d</span>
      )}
    </div>
  );
}
