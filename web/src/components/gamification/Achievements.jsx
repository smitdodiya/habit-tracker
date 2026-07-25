import { useEffect } from 'react';
import {
  Footprints,
  Fire,
  Medal,
  Trophy,
  SunHorizon,
  MoonStars,
  Sparkle,
  ArrowUUpLeft,
  Stack,
  ChartLineUp,
  NotePencil,
  CirclesFour,
  Confetti,
  ShieldCheck,
  Question,
  Lock,
} from '@phosphor-icons/react';

import { celebrateMilestone } from '../feedback/Celebration.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Achievement badges.
 *
 * Locked badges are shown, not hidden — an empty shelf motivates nobody, while
 * a shelf of silhouettes is a to-do list you actually want to work through.
 * Secret ones show as "???" because the surprise is most of their value.
 */

const ICONS = {
  Footprints,
  Fire,
  Medal,
  Trophy,
  SunHorizon,
  MoonStars,
  Sparkle,
  ArrowUUpLeft,
  Stack,
  ChartLineUp,
  NotePencil,
  CirclesFour,
  Confetti,
  ShieldCheck,
};

const iconFor = (name) => ICONS[name] ?? Trophy;

export function AchievementGrid({ achievements = [] }) {
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Achievements
        </h2>
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          {unlocked} of {achievements.length} unlocked
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {achievements.map((achievement) => (
          <AchievementBadge key={achievement.key} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

function AchievementBadge({ achievement }) {
  const { unlocked, secret, name, description, icon } = achievement;

  // A secret achievement gives nothing away until it's earned.
  const hidden = secret && !unlocked;
  const Icon = hidden ? Question : unlocked ? iconFor(icon) : Lock;

  const label = hidden ? 'Secret achievement' : name;
  const detail = hidden ? 'Keep going to discover this one' : description;

  return (
    <div
      className={[
        'flex flex-col items-center rounded-[13px] border p-3 text-center transition-all',
        unlocked
          ? 'border-[var(--accent-strong)]/25 bg-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-2)]',
      ].join(' ')}
      title={`${label} — ${detail}`}
    >
      <span
        aria-hidden="true"
        className={[
          'mb-2 flex h-11 w-11 items-center justify-center rounded-full',
          unlocked ? 'bg-[var(--accent-strong)] text-white' : 'bg-[var(--surface-3)] text-[var(--text-subtle)]',
        ].join(' ')}
      >
        <Icon size={20} weight={unlocked ? 'fill' : 'regular'} />
      </span>

      <p
        className={[
          'text-[0.6875rem] font-bold leading-tight',
          unlocked ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
        ].join(' ')}
      >
        {label}
      </p>
      <p className="mt-0.5 hidden text-[0.625rem] leading-tight text-[var(--text-subtle)] sm:block">
        {detail}
      </p>
    </div>
  );
}

/**
 * Full-screen moment when a badge is earned.
 * Queued and shown one at a time — three badges arriving at once should feel
 * like three wins, not one confusing pile.
 */
export function AchievementUnlocked({ achievement, onClose }) {
  useEffect(() => {
    if (!achievement) return undefined;
    celebrateMilestone('#F2C94C');
    const timer = setTimeout(onClose, 4800);
    return () => clearTimeout(timer);
  }, [achievement, onClose]);

  if (!achievement) return null;

  const Icon = iconFor(achievement.icon);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-[rgba(10,10,20,0.5)] backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="alertdialog"
        aria-labelledby="achievement-title"
        className="animate-celebrate relative z-10 w-full max-w-xs rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-lg)]"
      >
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">
          Achievement unlocked
        </p>

        <div
          className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'rgba(242, 201, 76, 0.16)', color: '#B8860B' }}
        >
          <Icon size={38} weight="fill" />
        </div>

        <h2 id="achievement-title" className="mt-4 text-lg font-extrabold text-[var(--text)]">
          {achievement.name}
        </h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
          {achievement.description}
        </p>

        <Button fullWidth className="mt-5" onClick={onClose}>
          Nice
        </Button>
      </div>
    </div>
  );
}
