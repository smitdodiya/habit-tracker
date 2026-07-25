import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, X } from '@phosphor-icons/react';
import { Button } from '../ui/Button.jsx';
import { ShareCardActions } from '../share/ShareCard.jsx';
import { pluralise } from '../../lib/format.js';

/**
 * Check-in and milestone celebrations (brief §05, "subtle micro-animations on
 * check-in, streak milestone celebrate pop").
 *
 * Everything here respects prefers-reduced-motion: confetti is skipped
 * entirely for users who have asked for less movement, and the CSS animations
 * are neutralised globally in index.css. The information is never *only* in
 * the animation — the streak number updates regardless.
 */

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Small burst fired from a check-in button. */
export function burstConfetti(element, color = '#E94560') {
  if (prefersReducedMotion()) return;

  // Originate the burst at the button so it reads as caused by the tap.
  const rect = element?.getBoundingClientRect();
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
    : { x: 0.5, y: 0.5 };

  confetti({
    particleCount: 34,
    spread: 58,
    startVelocity: 26,
    gravity: 0.9,
    scalar: 0.72,
    ticks: 110,
    origin,
    colors: [color, '#F2C94C', '#FFFFFF'],
    disableForReducedMotion: true,
  });
}

/** Bigger, two-sided burst for a milestone. */
export function celebrateMilestone(color = '#E94560') {
  if (prefersReducedMotion()) return;

  const shared = {
    particleCount: 70,
    spread: 76,
    startVelocity: 42,
    ticks: 190,
    scalar: 0.95,
    colors: [color, '#F2C94C', '#27AE60', '#FFFFFF'],
    disableForReducedMotion: true,
  };

  confetti({ ...shared, origin: { x: 0.15, y: 0.62 }, angle: 62 });
  confetti({ ...shared, origin: { x: 0.85, y: 0.62 }, angle: 118 });
}

const MILESTONE_COPY = {
  7: { title: 'One week strong', line: 'Seven days in a row. This is where it starts to stick.' },
  30: { title: 'A full month', line: 'Thirty days. What was effort is becoming routine.' },
  100: { title: 'One hundred days', line: 'A hundred days of showing up. Genuinely remarkable.' },
  365: { title: 'A whole year', line: 'Three hundred and sixty-five days. Extraordinary.' },
  4: { title: 'Four weeks running', line: 'A month of hitting your weekly target.' },
  12: { title: 'Twelve weeks', line: 'A full quarter of consistency.' },
  26: { title: 'Half a year', line: 'Twenty-six weeks on target.' },
  52: { title: 'Fifty-two weeks', line: 'A year of weekly wins.' },
};

/**
 * The milestone pop-up.
 * Shown once when a check-in lands exactly on a milestone.
 */
export function MilestoneDialog({ milestone, habit, onClose }) {
  useEffect(() => {
    if (!milestone) return undefined;

    celebrateMilestone(habit?.color);

    // Longer than a toast, because there is a share button to notice — but
    // still self-dismissing so it never blocks the next check-in.
    const timer = setTimeout(onClose, 9000);
    return () => clearTimeout(timer);
  }, [milestone, habit?.color, onClose]);

  if (!milestone) return null;

  const unit = habit?.stats?.unit ?? 'day';
  const copy = MILESTONE_COPY[milestone] ?? {
    title: `${pluralise(milestone, unit)} in a row`,
    line: 'Keep the run going.',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[rgba(10,10,20,0.5)] backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />

      <div
        role="alertdialog"
        aria-labelledby="milestone-title"
        className="animate-celebrate relative z-10 w-full max-w-xs rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-lg)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
        >
          <X size={15} weight="bold" />
        </button>

        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: `${habit?.color ?? '#E94560'}1F`, color: habit?.color ?? '#E94560' }}
        >
          <Trophy size={30} weight="fill" />
        </div>

        <p className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--text)]">{milestone}</p>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
          {unit === 'week' ? 'week streak' : 'day streak'}
        </p>

        <h2 id="milestone-title" className="mt-3 text-base font-bold text-[var(--text)]">
          {copy.title}
        </h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">{copy.line}</p>

        {habit?.name && (
          <p className="mt-3 truncate text-xs font-semibold text-[var(--text-subtle)]">{habit.name}</p>
        )}

        {/* Pride is the most shareable emotion — offered at the exact moment
            it peaks, rather than buried in a menu afterwards. */}
        {habit?.name && (
          <div className="mt-5">
            <ShareCardActions
              value={milestone}
              unit={unit === 'week' ? 'week streak' : 'day streak'}
              habitName={habit.name}
              subtitle={`${Math.round((habit.stats?.completionRate ?? 0) * 100)}% complete`}
              ratio={habit.stats?.completionRate ?? 0.92}
              accent={habit.color ?? '#E94560'}
              compact
            />
          </div>
        )}

        <Button variant="primary" fullWidth className="mt-2.5" onClick={onClose}>
          Keep going
        </Button>
      </div>
    </div>
  );
}
