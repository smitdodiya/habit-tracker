import { create } from 'zustand';

let nextId = 1;

/**
 * Transient messages shown bottom-right (bottom-centre on mobile).
 * Deliberately tiny: an id, a tone, a message, and an auto-dismiss timer.
 */
export const useToastStore = create((set, get) => ({
  toasts: [],

  push: (message, { tone = 'info', duration = 3600 } = {}) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });

    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

/** Convenience wrappers so callers read as `toast.success('Saved')`. */
export const toast = {
  success: (message, options) => useToastStore.getState().push(message, { ...options, tone: 'success' }),
  error: (message, options) => useToastStore.getState().push(message, { ...options, tone: 'error' }),
  info: (message, options) => useToastStore.getState().push(message, { ...options, tone: 'info' }),
};
