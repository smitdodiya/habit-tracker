import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

import { percent } from '../../lib/format.js';

/**
 * Charts for the Progress Dashboard.
 *
 * Recharts renders to SVG, which keeps the marks crisp and lets the design
 * tokens drive the colours — so everything recolours correctly in dark mode
 * rather than staying stuck on a light-theme palette.
 */

/** Themed tooltip shared by the charts. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 shadow-[var(--shadow-lg)]">
      <p className="text-xs font-bold text-[var(--text)]">Week of {label}</p>
      <p className="mt-0.5 text-[0.6875rem] text-[var(--text-muted)]">
        {point.completed} of {point.scheduled} completed
      </p>
      <p className="text-[0.6875rem] font-semibold text-[var(--accent-strong)]">{percent(point.rate)}</p>
    </div>
  );
}

/** Weekly completion bars (brief §04: "weekly bar chart"). */
export function WeeklyBarChart({ data = [] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--text-muted)]">Not enough data yet.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-3)' }} />
          <Bar dataKey="completed" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                // The most recent week is still in progress, so it's shown in a
                // lighter tone — comparing it like-for-like with finished weeks
                // would misrepresent it.
                fill={index === data.length - 1 ? 'var(--accent-soft)' : 'var(--accent)'}
                stroke={index === data.length - 1 ? 'var(--accent)' : 'none'}
                strokeWidth={index === data.length - 1 ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Circular completion gauge.
 * Drawn directly as SVG — a single arc doesn't need a charting library.
 */
export function CompletionRing({ value = 0, size = 108, strokeWidth = 9, label = 'Complete' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`${label}: ${percent(clamped)}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tracking-tight text-[var(--text)]">{percent(clamped)}</span>
        <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
      </div>
    </div>
  );
}

/** Horizontal bars for the per-category breakdown. */
export function CategoryBars({ data = [], labelFor }) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div key={entry.category}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[0.8125rem] font-semibold text-[var(--text)]">
              {labelFor ? labelFor(entry.category) : entry.category}
            </span>
            <span className="shrink-0 text-xs font-semibold text-[var(--text-muted)]">
              {percent(entry.rate)}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
              style={{ width: `${Math.min(1, entry.rate) * 100}%` }}
            />
          </div>

          <p className="mt-1 text-[0.6875rem] text-[var(--text-subtle)]">
            {entry.completed} of {entry.scheduled} · {entry.habits} habit{entry.habits === 1 ? '' : 's'}
          </p>
        </div>
      ))}
    </div>
  );
}
