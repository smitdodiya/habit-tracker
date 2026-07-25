import { create } from 'zustand';
import { progressApi } from '../api/endpoints.js';

/**
 * XP, level, freezes and achievements.
 *
 * Kept separate from the habit store because it's read on several screens and
 * updated as a side effect of checking in — the check-in response carries the
 * new figures, so the common case costs no extra request.
 */
export const useProgressStore = create((set, get) => ({
  progress: null,
  status: 'idle',

  /** Newly earned achievements queued for celebration, shown one at a time. */
  celebrationQueue: [],

  load: async ({ quiet = false } = {}) => {
    if (!quiet) set({ status: 'loading' });
    try {
      const progress = await progressApi.get();
      set({ progress, status: 'ready' });

      // The progress endpoint persists newly earned achievements too, so a
      // badge unlocked by a background action still gets its moment.
      if (progress.newlyUnlocked?.length) get().queueCelebration(progress.newlyUnlocked);

      return progress;
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  /**
   * Folds the summary returned by a check-in into the cached progress, so the
   * level bar moves immediately without a second round trip.
   */
  applyCheckInResult: ({ progress: summary, newlyUnlocked }) => {
    const current = get().progress;
    if (summary) {
      set({ progress: current ? { ...current, ...summary } : null });
    }
    if (newlyUnlocked?.length) get().queueCelebration(newlyUnlocked);
  },

  queueCelebration: (achievements) =>
    set({ celebrationQueue: [...get().celebrationQueue, ...achievements] }),

  dismissCelebration: () => set({ celebrationQueue: get().celebrationQueue.slice(1) }),

  /** Local freeze-balance update, used after the Today view reports a spend. */
  setFreezes: (freezes) => {
    const current = get().progress;
    if (current) set({ progress: { ...current, freezes } });
  },
}));
