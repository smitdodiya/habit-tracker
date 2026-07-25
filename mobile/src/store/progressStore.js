import { create } from 'zustand';
import { progressApi } from '../lib/endpoints.js';

/**
 * XP, level, freeze balance and achievements.
 *
 * All derived server-side from the user's actual history, so this store is a
 * pure cache — there is no local arithmetic that could drift from the truth.
 */
export const useProgressStore = create((set) => ({
  progress: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const progress = await progressApi.get();
      set({ progress, loading: false });
      return progress;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
}));
