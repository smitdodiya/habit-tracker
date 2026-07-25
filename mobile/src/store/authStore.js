import { create } from 'zustand';
import { authApi } from '../lib/endpoints.js';
import {
  setAccessToken,
  saveRefreshToken,
  clearRefreshToken,
  refreshSession,
  setUnauthenticatedHandler,
} from '../lib/api.js';

/**
 * Session state — the native counterpart to `web/frontend/src/store/authStore.js`.
 *
 * `status` distinguishes three states a boolean would blur: 'loading' while the
 * stored session is being checked, 'authed', and 'guest'. Without that, the app
 * flashes the login screen on every cold start before the refresh completes.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'loading',

  /** Restores a session from the Keychain on launch. */
  initialise: async () => {
    try {
      const { user } = await refreshSession();
      set({ user, status: 'authed' });
    } catch {
      setAccessToken(null);
      await clearRefreshToken();
      set({ user: null, status: 'guest' });
    }
  },

  login: async (credentials) => {
    const { user, accessToken, refreshToken } = await authApi.login(credentials);
    setAccessToken(accessToken);
    await saveRefreshToken(refreshToken);
    set({ user, status: 'authed' });
    return user;
  },

  signup: async (payload) => {
    const { user, accessToken, refreshToken } = await authApi.signup({
      ...payload,
      // Sent so check-ins land on the user's calendar day, not the server's.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setAccessToken(accessToken);
    await saveRefreshToken(refreshToken);
    set({ user, status: 'authed' });
    return user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      await clearRefreshToken();
      set({ user: null, status: 'guest' });
    }
  },

  updateProfile: async (patch) => {
    const { user } = await authApi.updateProfile(patch);
    set({ user });
    return user;
  },

  patchUser: (patch) => set({ user: { ...get().user, ...patch } }),
}));

// When a refresh fails mid-session, drop to signed-out so the router redirects
// rather than leaving the app in a broken half-state.
setUnauthenticatedHandler(() => {
  useAuthStore.setState({ user: null, status: 'guest' });
});
