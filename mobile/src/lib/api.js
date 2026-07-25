import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * API client for the native app.
 *
 * Mirrors `web/frontend/src/api/client.js` in behaviour — access token in memory, silent
 * refresh on 401, one refresh shared by concurrent failures — but the storage
 * differs by necessity:
 *
 *   Web     refresh token in an httpOnly cookie, invisible to JavaScript.
 *   Native  no cookie jar exists, so the token goes in expo-secure-store,
 *           which is the iOS Keychain and the Android Keystore. Hardware-backed
 *           where the device supports it, and not readable by other apps.
 *
 * The `X-Client: mobile` header is what tells the server to return the refresh
 * token in the response body instead of setting a cookie.
 */

const REFRESH_KEY = 'habit-tracker-refresh-token';

/**
 * A phone cannot reach `localhost` — localhost is the phone. So the base URL
 * comes from configuration, set to a tunnel or LAN address during development.
 */
export const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 20_000,
  headers: {
    'X-Client': 'mobile',
    // ngrok's free tier serves an interstitial to anything that looks like a
    // browser; this header opts out so the dev tunnel returns real JSON.
    'ngrok-skip-browser-warning': 'true',
  },
});

let accessToken = null;
let onUnauthenticated = null;

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setUnauthenticatedHandler = (handler) => {
  onUnauthenticated = handler;
};

/**
 * SecureStore is unavailable on web (Expo's web target has no Keychain), so
 * these degrade to in-memory there. That only affects the browser preview used
 * for development — on a real device the secure path always applies.
 */
let memoryFallback = null;

export async function saveRefreshToken(token) {
  if (!token) return;
  if (Platform.OS === 'web') {
    memoryFallback = token;
    return;
  }
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  } catch {
    memoryFallback = token;
  }
}

export async function loadRefreshToken() {
  if (Platform.OS === 'web') return memoryFallback;
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return memoryFallback;
  }
}

export async function clearRefreshToken() {
  memoryFallback = null;
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* nothing stored */
  }
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Concurrent 401s share one refresh rather than starting a stampede.
let refreshPromise = null;

export async function refreshSession() {
  refreshPromise ??= (async () => {
    const stored = await loadRefreshToken();
    if (!stored) throw new Error('No stored session');

    const { data } = await axios.post(
      `${API_URL}/api/auth/refresh`,
      { refreshToken: stored },
      { headers: { 'X-Client': 'mobile', 'ngrok-skip-browser-warning': 'true' } },
    );

    accessToken = data.accessToken;
    // The server rotates the refresh token on every use, so the new one has to
    // replace the old — keeping the stale one would sign the user out on the
    // next launch.
    if (data.refreshToken) await saveRefreshToken(data.refreshToken);

    return data;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthCall =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/signup');

    if (status === 401 && !original?._retried && !isAuthCall) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        accessToken = null;
        await clearRefreshToken();
        onUnauthenticated?.();
      }
    }

    return Promise.reject(error);
  },
);

/** Pulls a human-readable message out of an axios failure. */
export function errorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data?.error;
  if (!data) {
    // A network error on a phone is usually the API URL, not the server.
    if (error?.message === 'Network Error') {
      return `Cannot reach the server at ${API_URL}. Check EXPO_PUBLIC_API_URL.`;
    }
    return error?.message ?? fallback;
  }
  if (data.details?.length) return data.details[0].message;
  return data.message ?? fallback;
}

/** Field-level validation errors, keyed by field, for inline form display. */
export function fieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}
