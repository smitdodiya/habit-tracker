import { useState } from 'react';
import { ChartBar, ArrowRight, X } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { progressApi } from '../../api/endpoints.js';

/**
 * Prompt to view last week's recap.
 *
 * Only appears once per week and only when there is something worth reading —
 * a recap of a week with two check-ins is a reminder that you did badly, which
 * is the opposite of the point.
 */
export function RecapBanner({ recap, onDismiss }) {
  const [hidden, setHidden] = useState(false);
  const navigate = useNavigate();

  if (hidden || !recap || recap.seen || !recap.hasData) return null;
  if (recap.totals.checkIns < 3) return null;

  const dismiss = async () => {
    setHidden(true);
    onDismiss?.();
    await progressApi.markRecapSeen().catch(() => {});
  };

  return (
    <section
      className="animate-fade-in-up relative overflow-hidden rounded-[14px] border border-[var(--accent-strong)]/25 bg-[var(--accent-soft)] p-4"
      aria-label="Weekly recap available"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss recap"
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
      >
        <X size={14} weight="bold" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-strong)] text-white"
        >
          <ChartBar size={19} weight="fill" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text)]">Your week in review</p>
          <p className="text-[0.8125rem] text-[var(--text-muted)]">
            {recap.totals.checkIns} check-ins
            {recap.totals.perfectDays > 0 && `, ${recap.totals.perfectDays} perfect day${recap.totals.perfectDays === 1 ? '' : 's'}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/recap')}
          className="flex shrink-0 items-center gap-1 rounded-[10px] bg-[var(--accent-strong)] px-3 py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90"
        >
          View
          <ArrowRight size={13} weight="bold" />
        </button>
      </div>
    </section>
  );
}
