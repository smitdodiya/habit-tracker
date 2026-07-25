import { create } from 'zustand';
import { habitApi } from '../lib/endpoints.js';

/**
 * Habits and today's check-in state.
 *
 * Kept deliberately parallel to `web/frontend/src/store/habitStore.js`, including the
 * optimistic check-in: the tick and the streak update land instantly and the
 * server response reconciles the exact numbers a moment later. On a phone this
 * matters more than on the web — mobile connections drop, and a check-in that
 * waits on the network before showing anything feels broken.
 *
 * On failure the previous state is restored, so a dropped connection can never
 * leave a habit looking done when the server disagrees.
 */
export const useHabitStore = create((set, get) => ({
  habits: [],
  date: null,
  summary: { due: 0, completed: 0, extraCompleted: 0 },
  freezes: null,
  freezeNotices: [],
  status: 'idle',

  loadToday: async ({ quiet = false } = {}) => {
    if (!quiet) set({ status: 'loading' });
    try {
      const data = await habitApi.today();
      set({
        habits: data.habits,
        date: data.date,
        summary: data.summary,
        freezes: data.freezes ?? null,
        freezeNotices: data.freezeNotices ?? [],
        status: 'ready',
      });
      return data;
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  /** Clears the "a freeze saved your streak" card once it has been seen. */
  dismissFreezeNotices: () => set({ freezeNotices: [] }),

  checkIn: async (habitId, { note = '', mood = null } = {}) => {
    const previous = get().habits;
    const today = get().date;

    set({
      habits: previous.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              checkIn: { date: today, note, mood },
              stats: {
                ...habit.stats,
                completedToday: true,
                current: habit.stats.completedToday ? habit.stats.current : habit.stats.current + 1,
              },
            }
          : habit,
      ),
      summary: bumpSummary(get().summary, previous, habitId, +1),
    });

    try {
      const result = await habitApi.checkIn(habitId, { note, mood });
      set({
        habits: get().habits.map((habit) =>
          habit.id === habitId ? { ...habit, stats: result.stats, checkIn: result.checkIn } : habit,
        ),
      });
      return result;
    } catch (error) {
      set({ habits: previous, summary: recomputeSummary(previous) });
      throw error;
    }
  },

  undoCheckIn: async (habitId) => {
    const previous = get().habits;

    set({
      habits: previous.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              checkIn: null,
              stats: {
                ...habit.stats,
                completedToday: false,
                current: Math.max(0, habit.stats.current - 1),
                milestoneReached: null,
              },
            }
          : habit,
      ),
      summary: bumpSummary(get().summary, previous, habitId, -1),
    });

    try {
      const { stats } = await habitApi.undoCheckIn(habitId);
      set({
        habits: get().habits.map((habit) => (habit.id === habitId ? { ...habit, stats } : habit)),
      });
    } catch (error) {
      set({ habits: previous, summary: recomputeSummary(previous) });
      throw error;
    }
  },

  saveNote: async (habitId, { note, mood }) => {
    const { checkIn } = await habitApi.checkIn(habitId, { note, mood });
    set({
      habits: get().habits.map((habit) => (habit.id === habitId ? { ...habit, checkIn } : habit)),
    });
    return checkIn;
  },

  removeHabit: async (habitId) => {
    await habitApi.remove(habitId);
    const habits = get().habits.filter((habit) => habit.id !== habitId);
    set({ habits, summary: recomputeSummary(habits) });
  },
}));

function bumpSummary(summary, habits, habitId, delta) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit?.dueToday) return summary;
  return { ...summary, completed: Math.max(0, summary.completed + delta) };
}

function recomputeSummary(habits) {
  const due = habits.filter((habit) => habit.dueToday);
  return {
    due: due.length,
    completed: due.filter((habit) => habit.checkIn).length,
    extraCompleted: habits.filter((habit) => !habit.dueToday && habit.checkIn).length,
  };
}
