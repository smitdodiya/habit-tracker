import { useMemo, useState } from 'react';
import { formatDate, percent } from '../../lib/format.js';
import { startOfWeek, addDays, daysBetween, keyToDate } from '../../lib/dates.js';

/**
 * Contribution-style heatmap (brief §03 feature 6, §04 "Progress Dashboard").
 *
 * Hand-built rather than pulled from a chart library, for two reasons: the
 * colour ramp needs to come from the design tokens so it recolours properly in
 * dark mode, and every cell needs to be a real focusable element carrying its
 * own label — a canvas-rendered heatmap is invisible to a screen reader.
 *
 * Layout is a CSS grid: one column per week, seven rows Monday to Sunday.
 */

/** Maps a completion rate to one of six ramp steps. */
function heatLevel(day) {
  if (!day || day.scheduled === 0) return 0;
  if (day.completed === 0) return 0;
  const rate = day.rate;
  if (rate >= 1) return 5;
  if (rate >= 0.75) return 4;
  if (rate >= 0.5) return 3;
  if (rate >= 0.25) return 2;
  return 1;
}

const LEVEL_VARS = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)', 'var(--heat-5)'];

export function HeatmapCalendar({ data = [], todayKey }) {
  const [hovered, setHovered] = useState(null);

  const { weeks, monthLabels } = useMemo(() => {
    if (data.length === 0) return { weeks: [], monthLabels: [] };

    const byDate = new Map(data.map((day) => [day.date, day]));
    const first = data[0].date;
    const last = data[data.length - 1].date;

    // Pad to whole weeks so every column has seven rows and the grid is square.
    const gridStart = startOfWeek(first);
    const totalDays = daysBetween(gridStart, last) + 1;
    const weekCount = Math.ceil(totalDays / 7);

    const builtWeeks = [];
    const labels = [];
    let lastMonth = null;

    for (let w = 0; w < weekCount; w += 1) {
      const days = [];
      for (let d = 0; d < 7; d += 1) {
        const date = addDays(gridStart, w * 7 + d);
        // Cells outside the requested range render as gaps, not empty data.
        // daysBetween(a, b) is positive when b is later, so both ends read >= 0.
        const inRange = daysBetween(first, date) >= 0 && daysBetween(date, last) >= 0;
        days.push(inRange ? (byDate.get(date) ?? { date, completed: 0, scheduled: 0, rate: 0 }) : null);
      }
      builtWeeks.push(days);

      // Label a column when its month differs from the previous column's.
      const firstReal = days.find(Boolean);
      if (firstReal) {
        const month = keyToDate(firstReal.date).getUTCMonth();
        if (month !== lastMonth) {
          labels.push({ column: w, label: keyToDate(firstReal.date).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }) });
          lastMonth = month;
        }
      }
    }

    return { weeks: builtWeeks, monthLabels: labels };
  }, [data]);

  if (weeks.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">No activity to show yet.</p>;
  }

  const rowLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  return (
    <div>
      {/* Horizontal scroll keeps a year of data usable on a phone without
          shrinking the cells to invisibility. */}
      <div className="no-scrollbar overflow-x-auto pb-1">
        <div className="inline-flex gap-1.5">
          {/* Weekday gutter */}
          <div className="flex shrink-0 flex-col gap-[3px] pt-[18px]">
            {rowLabels.map((label, index) => (
              <div
                key={index}
                className="flex h-[13px] items-center text-[0.625rem] leading-none text-[var(--text-subtle)]"
                style={{ width: 22 }}
              >
                {label}
              </div>
            ))}
          </div>

          <div>
            {/* Month labels */}
            <div className="relative mb-1 h-[14px]">
              {monthLabels.map(({ column, label }) => (
                <span
                  key={`${column}-${label}`}
                  className="absolute text-[0.625rem] font-semibold text-[var(--text-muted)]"
                  style={{ left: column * 16 }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => {
                    if (!day) return <div key={dayIndex} className="h-[13px] w-[13px]" />;

                    const level = heatLevel(day);
                    const isToday = day.date === todayKey;
                    const label =
                      day.scheduled === 0
                        ? `${formatDate(day.date)}: nothing scheduled`
                        : `${formatDate(day.date)}: ${day.completed} of ${day.scheduled} completed`;

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onMouseEnter={() => setHovered({ ...day, label })}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered({ ...day, label })}
                        onBlur={() => setHovered(null)}
                        aria-label={label}
                        title={label}
                        className={[
                          'h-[13px] w-[13px] rounded-[3px] transition-transform hover:scale-125',
                          isToday ? 'ring-1 ring-[var(--text)] ring-offset-1 ring-offset-[var(--surface)]' : '',
                        ].join(' ')}
                        style={{ background: LEVEL_VARS[level] }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Legend + hover readout ---- */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-[1.25rem] text-xs text-[var(--text-muted)]">
          {hovered ? (
            <>
              <span className="font-semibold text-[var(--text)]">{formatDate(hovered.date)}</span>
              {hovered.scheduled === 0
                ? ' — nothing scheduled'
                : ` — ${hovered.completed}/${hovered.scheduled} done (${percent(hovered.rate)})`}
            </>
          ) : (
            'Hover a day for details'
          )}
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-[0.625rem] text-[var(--text-subtle)]">Less</span>
          {LEVEL_VARS.map((color, index) => (
            <span key={index} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: color }} />
          ))}
          <span className="text-[0.625rem] text-[var(--text-subtle)]">More</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact single-habit strip: the last N days as a row of cells.
 * Used on the habit detail page where a full calendar would be overkill.
 */
export function HabitHistoryStrip({ dates = [], startKey, endKey, color = '#E94560', scheduledOn }) {
  const completed = useMemo(() => new Set(dates), [dates]);

  const days = useMemo(() => {
    const total = daysBetween(startKey, endKey);
    if (total < 0) return [];
    return Array.from({ length: total + 1 }, (_, i) => addDays(startKey, i));
  }, [startKey, endKey]);

  return (
    <div className="no-scrollbar flex gap-[3px] overflow-x-auto pb-1">
      {days.map((date) => {
        const done = completed.has(date);
        const scheduled = scheduledOn ? scheduledOn(date) : true;

        return (
          <span
            key={date}
            title={`${formatDate(date)}: ${done ? 'done' : scheduled ? 'missed' : 'not scheduled'}`}
            aria-label={`${formatDate(date)}: ${done ? 'done' : scheduled ? 'missed' : 'not scheduled'}`}
            className="h-[22px] w-[7px] shrink-0 rounded-[2px]"
            style={{
              background: done ? color : 'var(--surface-3)',
              opacity: done ? 1 : scheduled ? 1 : 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

