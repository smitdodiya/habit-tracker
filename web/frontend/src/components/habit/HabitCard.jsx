import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, DotsThree, NotePencil, PencilSimple, Trash, CaretRight } from '@phosphor-icons/react';

import { getIcon } from '../../lib/icons.js';
import { describeFrequency, withAlpha, formatTime } from '../../lib/format.js';
import { StreakBadge } from './StreakBadge.jsx';
import { burstConfetti } from '../feedback/Celebration.jsx';

/**
 * A single habit on the Today view.
 *
 * The whole card is a link to the detail page, with the check-in button and
 * the menu as separate controls on top — so the common action (tick it) is one
 * tap and the rest is still reachable without a long-press or a swipe nobody
 * discovers.
 */
export function HabitCard({ habit, onCheckIn, onUndo, onAddNote, onEdit, onDelete, busy = false }) {
  const Icon = getIcon(habit.icon);
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef(null);

  const done = Boolean(habit.checkIn);
  const offSchedule = !habit.dueToday;

  const handleToggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    if (done) {
      await onUndo?.(habit);
    } else {
      // Fire the burst immediately rather than after the round trip — the
      // reward should feel like a response to the tap, not to the network.
      burstConfetti(buttonRef.current, habit.color);
      await onCheckIn?.(habit);
    }
  };

  return (
    <div
      className={[
        'card group relative flex items-center gap-3 p-3 transition-all duration-200',
        done ? 'border-transparent' : 'hover:shadow-[var(--shadow)]',
      ].join(' ')}
      style={done ? { background: withAlpha(habit.color, 0.07) } : undefined}
    >
      <Link
        to={`/habits/${habit.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:scale-[1.04]"
          style={{ background: withAlpha(habit.color, 0.14), color: habit.color }}
        >
          <Icon size={21} weight="duotone" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={[
                'truncate text-sm font-bold',
                done ? 'text-[var(--text-muted)] line-through decoration-[1.5px]' : 'text-[var(--text)]',
              ].join(' ')}
            >
              {habit.name}
            </span>
            {offSchedule && (
              <span className="shrink-0 rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                Not due
              </span>
            )}
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StreakBadge stats={habit.stats} size="sm" />
            <span className="text-[0.6875rem] text-[var(--text-muted)]">
              {describeFrequency(habit.frequency)}
              {habit.reminder?.enabled && ` · ${formatTime(habit.reminder.time)}`}
            </span>
          </span>

          {habit.checkIn?.note && (
            <span className="mt-1.5 flex items-start gap-1 text-[0.6875rem] italic leading-snug text-[var(--text-muted)]">
              <NotePencil size={11} className="mt-0.5 shrink-0" />
              <span className="line-clamp-2">{habit.checkIn.note}</span>
            </span>
          )}
        </span>
      </Link>

      {/* ---- Overflow menu ---- */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={`Options for ${habit.name}`}
          aria-expanded={menuOpen}
          className="rounded-[10px] p-1.5 text-[var(--text-subtle)] opacity-0 transition-all hover:bg-[var(--surface-3)] hover:text-[var(--text)] focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
        >
          <DotsThree size={19} weight="bold" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]">
              {done && (
                <MenuItem
                  icon={NotePencil}
                  label={habit.checkIn?.note ? 'Edit note' : 'Add a note'}
                  onClick={() => {
                    setMenuOpen(false);
                    onAddNote?.(habit);
                  }}
                />
              )}
              <MenuItem
                icon={PencilSimple}
                label="Edit habit"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit?.(habit);
                }}
              />
              <MenuItem
                icon={CaretRight}
                label="View details"
                to={`/habits/${habit.id}`}
                onClick={() => setMenuOpen(false)}
              />
              <div className="my-1 h-px bg-[var(--border)]" />
              <MenuItem
                icon={Trash}
                label="Delete"
                destructive
                onClick={() => {
                  setMenuOpen(false);
                  onDelete?.(habit);
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ---- Check-in button ---- */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={busy}
        aria-pressed={done}
        aria-label={done ? `Undo check-in for ${habit.name}` : `Mark ${habit.name} as done`}
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          'active:scale-90 disabled:opacity-60',
          done ? 'border-transparent text-white' : 'border-[var(--border-strong)] text-transparent hover:border-current',
        ].join(' ')}
        style={
          done
            ? { background: habit.color, borderColor: habit.color }
            : { color: habit.color }
        }
      >
        <Check size={21} weight="bold" className={done ? 'animate-tick-pop text-white' : 'opacity-0'} />
      </button>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, to, destructive = false }) {
  const className = [
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors',
    destructive
      ? 'text-[var(--danger)] hover:bg-[var(--danger-soft)]'
      : 'text-[var(--text)] hover:bg-[var(--surface-3)]',
  ].join(' ');

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        <Icon size={15} />
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon size={15} />
      {label}
    </button>
  );
}
