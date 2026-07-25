import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, PencilSimple, Trash, NotePencil, BellRinging, CalendarBlank } from '@phosphor-icons/react';

import { habitApi } from '../api/endpoints.js';
import { errorMessage } from '../api/client.js';
import { toast } from '../store/toastStore.js';

import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { HabitForm } from '../components/habit/HabitForm.jsx';
import { StreakSummary } from '../components/habit/StreakBadge.jsx';
import { HabitHistoryStrip } from '../components/charts/HeatmapCalendar.jsx';
import { CompletionRing } from '../components/charts/Charts.jsx';
import { getIcon } from '../lib/icons.js';
import {
  describeFrequency,
  categoryLabel,
  formatTime,
  formatDate,
  relativeDay,
  moodMeta,
  withAlpha,
} from '../lib/format.js';
import { addDays, dayOfWeek, todayKey } from '../lib/dates.js';

/**
 * Habit Detail (brief §04): per-habit stats, streak history, completion graph
 * and the notes log.
 */
export function HabitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = async () => {
    try {
      setData(await habitApi.get(id));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load that habit'));
      navigate('/today', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the id changes
  }, [id]);

  const today = todayKey();

  const completedDates = useMemo(() => (data?.checkIns ?? []).map((c) => c.date), [data]);

  /** Mirrors the server's scheduling rule so the strip greys out days off. */
  const isScheduled = useMemo(() => {
    const frequency = data?.habit?.frequency;
    if (!frequency) return () => true;

    return (date) => {
      if (frequency.type === 'custom' && frequency.daysOfWeek?.length) {
        return frequency.daysOfWeek.includes(dayOfWeek(date));
      }
      return true;
    };
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 w-full" rounded="rounded-[14px]" />
        <Skeleton className="h-52 w-full" rounded="rounded-[14px]" />
      </div>
    );
  }

  if (!data) return null;

  const { habit, stats, checkIns, notes } = data;
  const Icon = getIcon(habit.icon);
  const historyStart = addDays(today, -89);

  const handleUpdate = async (values) => {
    try {
      await habitApi.update(habit.id, values);
      toast.success('Habit updated');
      setEditOpen(false);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save those changes'));
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      await habitApi.remove(habit.id);
      toast.success(`"${habit.name}" deleted`);
      navigate('/today', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete that habit'));
    }
  };

  return (
    <div className="space-y-5">
      <Link
        to="/today"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={15} weight="bold" />
        Back to today
      </Link>

      {/* ---- Header ---- */}
      <header className="card p-5" style={{ background: withAlpha(habit.color, 0.06) }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[17px]"
              style={{ background: withAlpha(habit.color, 0.16), color: habit.color }}
            >
              <Icon size={27} weight="duotone" />
            </span>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--text)]">
                {habit.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
                <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 font-semibold">
                  {categoryLabel(habit.category)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarBlank size={12} />
                  {describeFrequency(habit.frequency)}
                </span>
                {habit.reminder?.enabled && (
                  <span className="inline-flex items-center gap-1">
                    <BellRinging size={12} />
                    {formatTime(habit.reminder.time)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              <PencilSimple size={14} />
              Edit
            </Button>
            <Button variant="danger-soft" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash size={14} />
            </Button>
          </div>
        </div>

        {habit.description && (
          <p className="mt-3.5 text-sm leading-relaxed text-[var(--text-muted)]">{habit.description}</p>
        )}
      </header>

      {/* ---- Stats ---- */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <section className="card p-5" aria-label="Streak">
          <h2 className="mb-3.5 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Streak
          </h2>
          <StreakSummary stats={stats} />
        </section>

        <section className="card flex items-center justify-center p-5" aria-label="Completion rate">
          <div className="text-center">
            <CompletionRing value={stats.completionRate} label="Complete" />
            <p className="mt-2.5 text-xs text-[var(--text-muted)]">
              {stats.total} check-in{stats.total === 1 ? '' : 's'} all time
            </p>
          </div>
        </section>
      </div>

      {/* ---- History ---- */}
      <section className="card p-5" aria-label="Recent history">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Last 90 days
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {formatDate(historyStart, { day: 'numeric', month: 'short' })} – today
          </p>
        </div>

        <HabitHistoryStrip
          dates={completedDates}
          startKey={historyStart}
          endKey={today}
          color={habit.color}
          scheduledOn={isScheduled}
        />

        <div className="mt-3 flex items-center gap-4 text-[0.6875rem] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: habit.color }} />
            Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--surface-3)]" />
            Missed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--surface-3)] opacity-40" />
            Not scheduled
          </span>
        </div>
      </section>

      {/* ---- Notes log ---- */}
      <section className="card p-5" aria-label="Notes">
        <h2 className="mb-3.5 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Notes {notes.length > 0 && <span className="text-[var(--text-subtle)]">({notes.length})</span>}
        </h2>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <NotePencil size={26} className="text-[var(--text-subtle)]" />
            <p className="mt-2 text-sm text-[var(--text-muted)]">No notes yet.</p>
            <p className="mt-0.5 max-w-xs text-xs text-[var(--text-subtle)]">
              Add a note when you check in.
            </p>
          </div>
        ) : (
          <ol className="space-y-3.5">
            {notes.map((note) => {
              const mood = moodMeta(note.mood);
              return (
                <li key={note.id} className="border-l-2 pl-3.5" style={{ borderColor: withAlpha(habit.color, 0.4) }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text)]">{relativeDay(note.date, today)}</span>
                    {mood && (
                      <span className="text-[0.6875rem] text-[var(--text-muted)]">
                        <span aria-hidden="true">{mood.emoji}</span> {mood.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">{note.note}</p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ---- Recent check-ins ---- */}
      {checkIns.length > 0 && (
        <section className="card p-5" aria-label="Recent check-ins">
          <h2 className="mb-3 text-[0.8125rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Recent check-ins
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {checkIns.slice(0, 30).map((checkIn) => (
              <li
                key={checkIn.id}
                className="rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold"
                style={{ background: withAlpha(habit.color, 0.12), color: habit.color }}
              >
                {formatDate(checkIn.date, { day: 'numeric', month: 'short' })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Dialogs ---- */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit habit" description={habit.name} size="lg">
        <HabitForm
          initial={habit}
          submitLabel="Save changes"
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this habit?"
        description={habit.name}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} fullWidth>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} fullWidth>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          This removes {stats.total} check-in{stats.total === 1 ? '' : 's'} and a {stats.longest}-{stats.unit} best
          streak. It cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
