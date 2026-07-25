import axios from 'axios';

/**
 * The single axios instance every API module uses.
 *
 * Token handling: the access token lives in memory only (never localStorage,
 * where any injected script could read it). The refresh token is an httpOnly
 * cookie the browser sends automatically, so a page reload can silently
 * restore the session without the token ever being exposed to JavaScript.
 */

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20_000,
});

let accessToken = null;
let onUnauthenticated = null;

export function setAccessToken(token) {
  accessToken = token;
}

/** Registers the callback that runs when the session can no longer be revived. */
export function setUnauthenticatedHandler(handler) {
  onUnauthenticated = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Concurrent 401s should trigger exactly one refresh, not one per request.
let refreshPromise = null;

async function refreshAccessToken() {
  refreshPromise ??= axios
    .post('/api/auth/refresh', {}, { withCredentials: true })
    .then((response) => {
      accessToken = response.data.accessToken;
      return response.data;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/auth/refresh');
    const isLoginCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/signup');

    // A 401 on a normal call means the short-lived access token expired: try
    // once to refresh, then replay the original request.
    if (status === 401 && !original?._retried && !isRefreshCall && !isLoginCall) {
      original._retried = true;
      try {
        await refreshAccessToken();
        return api(original);
      } catch {
        accessToken = null;
        onUnauthenticated?.();
      }
    }

    return Promise.reject(error);
  },
);

/** Pulls a readable message out of an axios error for display in the UI. */
export function errorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data?.error;
  if (!data) return error?.message ?? fallback;
  if (data.details?.length) return data.details[0].message;
  return data.message ?? fallback;
}

/** Field-level validation errors, keyed by field name, for inline form display. */
export function fieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((d) => [d.field, d.message]));
}

export { refreshAccessToken };
