import { useEffect, useState, useMemo } from 'react';
import { Plus, CheckCircle } from '@phosphor-icons/react';

import { useHabitStore } from '../store/habitStore.js';
import { useAuthStore } from '../store/authStore.js';
import { toast } from '../store/toastStore.js';
import { errorMessage } from '../api/client.js';
import { habitApi } from '../api/endpoints.js';

import { HabitCard } from '../components/habit/HabitCard.jsx';
import { HabitForm } from '../components/habit/HabitForm.jsx';
import { NoteModal } from '../components/habit/NoteModal.jsx';
import { MilestoneDialog } from '../components/feedback/Celebration.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { PageSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyHabitsIllustration, AllDoneIllustration } from '../components/illustrations/Illustrations.jsx';
import { greeting, formatLongDate } from '../lib/format.js';

/**
 * Home / Today view (brief §04).
 *
 * Habits are split into "due today" and "not scheduled today". The second
 * group is still shown, collapsed, because people do sometimes want to tick a
 * Tuesday habit on a Monday — hiding it entirely makes the app feel like it is
 * arguing with them.
 */
export function TodayPage() {
  const { habits, date, summary, status, loadToday, checkIn, undoCheckIn, saveNote, removeHabit } =
    useHabitStore();
  const user = useAuthStore((state) => state.user);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [showOffSchedule, setShowOffSchedule] = useState(false);

  useEffect(() => {
    loadToday().catch((error) => toast.error(errorMessage(error, 'Could not load your habits')));
  }, [loadToday]);

  const { due, offSchedule } = useMemo(
    () => ({
      due: habits.filter((habit) => habit.dueToday),
      offSchedule: habits.filter((habit) => !habit.dueToday),
    }),
    [habits],
  );

  const allDone = due.length > 0 && summary.completed === due.length;

  const handleCheckIn = async (habit) => {
    setBusyId(habit.id);
    try {
      const stats = await checkIn(habit.id);
      // The server decides whether this landed on a milestone — the client
      // never guesses, so the celebration can't fire on a stale count.
      if (stats?.milestoneReached) {
        setMilestone({ value: stats.milestoneReached, habit: { ...habit, stats } });
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save that check-in'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (habit) => {
    setBusyId(habit.id);
    try {
      await undoCheckIn(habit.id);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not undo that check-in'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveHabit = async (values) => {
    setFormErrors({});
    try {
      if (editing) {
        await habitApi.update(editing.id, values);
        toast.success('Habit updated');
      } else {
        await habitApi.create(values);
        toast.success('Habit created');
      }
      await loadToday({ quiet: true });
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save that habit'));
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      await removeHabit(deleting.id);
      toast.success(`"${deleting.name}" deleted`);
      setDeleting(null);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete that habit'));
    }
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-6">
        <div className="h-20" />
        <PageSkeleton cards={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
            {greeting()}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{date && formatLongDate(date)}</p>
        </div>

        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} weight="bold" />
          New habit
        </Button>
      </header>

      {/* ---- Day progress ---- */}
      {due.length > 0 && (
        <section className="card p-4" aria-label="Today's progress">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[0.8125rem] font-semibold text-[var(--text-muted)]">Today's progress</p>
              <p className="mt-0.5 text-xl font-extrabold tracking-tight text-[var(--text)]">
                {summary.completed} <span className="text-[var(--text-muted)]">/ {due.length}</span>
                <span className="ml-1.5 text-sm font-semibold text-[var(--text-muted)]">done</span>
              </p>
            </div>

            {allDone && (
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-[0.8125rem] font-bold text-[var(--success)]">
                <CheckCircle size={15} weight="fill" />
                All done
              </span>
            )}
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"
            role="progressbar"
            aria-valuenow={summary.completed}
            aria-valuemin={0}
            aria-valuemax={due.length}
            aria-label="Habits completed today"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
              style={{ width: `${due.length === 0 ? 0 : (summary.completed / due.length) * 100}%` }}
            />
          </div>
        </section>
      )}

      {/* ---- Habit list ---- */}
      {habits.length === 0 ? (
        <EmptyState
          illustration={EmptyHabitsIllustration}
          title="No habits yet"
          description="Add the first thing you want to do consistently. Start with one — you can always add more."
          action={
            <Button size="lg" onClick={() => setFormOpen(true)}>
              <Plus size={17} weight="bold" />
              Add your first habit
            </Button>
          }
        />
      ) : due.length === 0 ? (
        <EmptyState
          illustration={AllDoneIllustration}
          title="Nothing scheduled today"
          description="None of your habits are due today. Enjoy the day off — or tick one off anyway if you're feeling keen."
        />
      ) : (
        <section aria-label="Habits due today" className="space-y-2.5">
          {due.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              busy={busyId === habit.id}
              onCheckIn={handleCheckIn}
              onUndo={handleUndo}
              onAddNote={setNoteFor}
              onEdit={(target) => {
                setEditing(target);
                setFormOpen(true);
              }}
              onDelete={setDeleting}
            />
          ))}
        </section>
      )}

      {/* ---- Off-schedule habits ---- */}
      {offSchedule.length > 0 && (
        <section aria-label="Not scheduled today">
          <button
            type="button"
            onClick={() => setShowOffSchedule((open) => !open)}
            aria-expanded={showOffSchedule}
            className="text-[0.8125rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            {showOffSchedule ? 'Hide' : 'Show'} {offSchedule.length} habit
            {offSchedule.length === 1 ? '' : 's'} not due today
          </button>

          {showOffSchedule && (
            <div className="mt-3 space-y-2.5">
              {offSchedule.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  busy={busyId === habit.id}
                  onCheckIn={handleCheckIn}
                  onUndo={handleUndo}
                  onAddNote={setNoteFor}
                  onEdit={(target) => {
                    setEditing(target);
                    setFormOpen(true);
                  }}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Dialogs ---- */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit habit' : 'New habit'}
        description={editing ? editing.name : 'What do you want to do consistently?'}
        size="lg"
      >
        <HabitForm
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          errors={formErrors}
          submitLabel={editing ? 'Save changes' : 'Create habit'}
          onSubmit={handleSaveHabit}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      {noteFor && (
        <NoteModal
          open
          habit={noteFor}
          onClose={() => setNoteFor(null)}
          onSave={async (payload) => {
            try {
              await saveNote(noteFor.id, payload);
              toast.success('Note saved');
            } catch (error) {
              toast.error(errorMessage(error, 'Could not save that note'));
            }
          }}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this habit?"
        description={deleting?.name}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} fullWidth>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} fullWidth>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          This also removes its entire check-in history and streak. It cannot be undone.
        </p>
      </Modal>

      {milestone && (
        <MilestoneDialog
          milestone={milestone.value}
          habit={milestone.habit}
          onClose={() => setMilestone(null)}
        />
      )}
    </div>
  );
}
