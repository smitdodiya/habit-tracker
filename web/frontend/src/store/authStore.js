import { create } from 'zustand';
import { authApi } from '../api/endpoints.js';
import { setAccessToken, setUnauthenticatedHandler } from '../api/client.js';

/**
 * Session state.
 *
 * `status` distinguishes three genuinely different situations that a single
 * boolean would blur together:
 *   'loading'  — still checking for an existing session; render nothing yet
 *   'authed'   — signed in
 *   'guest'    — confirmed signed out
 * Without that distinction, a page refresh flashes the login screen before the
 * refresh call comes back.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'loading',

  /** Runs once on app start: tries to revive the session from the refresh cookie. */
  initialise: async () => {
    try {
      const { user, accessToken } = await authApi.refresh();
      setAccessToken(accessToken);
      set({ user, status: 'authed' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'guest' });
    }
  },

  login: async (credentials) => {
    const { user, accessToken } = await authApi.login(credentials);
    setAccessToken(accessToken);
    set({ user, status: 'authed' });
    return user;
  },

  signup: async (payload) => {
    const { user, accessToken } = await authApi.signup({
      ...payload,
      // Captured from the browser so check-ins land on the user's calendar day,
      // not the server's.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setAccessToken(accessToken);
    set({ user, status: 'authed' });
    return user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'guest' });
    }
  },

  /** Applies a profile change locally and on the server. */
  updateProfile: async (patch) => {
    const { user } = await authApi.updateProfile(patch);
    set({ user });
    return user;
  },

  /** Local-only update, for optimistic UI (e.g. the theme toggle). */
  patchUser: (patch) => set({ user: { ...get().user, ...patch } }),
}));

// When a refresh fails mid-session, drop straight to the signed-out state so
// the router can redirect rather than leaving the UI in a broken half-state.
setUnauthenticatedHandler(() => {
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: 'guest' });
});
