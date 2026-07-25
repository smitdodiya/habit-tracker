import { create } from 'zustand';
import { habitApi } from '../api/endpoints.js';

/**
 * Habits and today's check-in state.
 *
 * Check-ins are applied optimistically: the tick and the streak update land
 * instantly, and the server response reconciles the exact numbers a moment
 * later. If the request fails the change is rolled back and the caller is told,
 * so a dropped connection can never leave a habit looking done when it isn't.
 */
export const useHabitStore = create((set, get) => ({
  habits: [],
  date: null,
  summary: { due: 0, completed: 0, extraCompleted: 0 },
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  error: null,

  loadToday: async ({ quiet = false } = {}) => {
    if (!quiet) set({ status: 'loading', error: null });
    try {
      const { habits, date, summary } = await habitApi.today();
      set({ habits, date, summary, status: 'ready', error: null });
    } catch (error) {
      set({ status: 'error', error });
      throw error;
    }
  },

  /**
   * Marks a habit done for today.
   * Returns the server's stats so the caller can decide whether a milestone
   * celebration is warranted.
   */
  checkIn: async (habitId, { note = '', mood = null } = {}) => {
    const previous = get().habits;
    const today = get().date;

    // Optimistic: tick it, bump the streak, update the day's counter.
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
      const { stats, checkIn } = await habitApi.checkIn(habitId, { note, mood });
      set({
        habits: get().habits.map((habit) =>
          habit.id === habitId ? { ...habit, stats, checkIn } : habit,
        ),
      });
      return stats;
    } catch (error) {
      set({ habits: previous, summary: recomputeSummary(previous) });
      throw error;
    }
  },

  /** Undoes today's check-in for a habit. */
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

  /** Updates the note/mood on an existing check-in without touching the streak. */
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

  reorder: async (orderedIds) => {
    const previous = get().habits;
    const byId = new Map(previous.map((habit) => [habit.id, habit]));
    set({ habits: orderedIds.map((id) => byId.get(id)).filter(Boolean) });

    try {
      await habitApi.reorder(orderedIds);
    } catch (error) {
      set({ habits: previous });
      throw error;
    }
  },
}));

/** Adjusts the completed counter without a full recount. */
function bumpSummary(summary, habits, habitId, delta) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit?.dueToday) return summary;
  return { ...summary, completed: Math.max(0, summary.completed + delta) };
}

/** Full recount, used when rolling back to a known-good list. */
function recomputeSummary(habits) {
  const due = habits.filter((habit) => habit.dueToday);
  return {
    due: due.length,
    completed: due.filter((habit) => habit.checkIn).length,
    extraCompleted: habits.filter((habit) => !habit.dueToday && habit.checkIn).length,
  };
}
