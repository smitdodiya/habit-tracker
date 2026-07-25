import { api } from './api.js';

/**
 * Every server call the app makes.
 *
 * Deliberately identical in shape to `web/frontend/src/api/endpoints.js` — same paths,
 * same payloads — because both clients talk to the same API (brief §10.4).
 * Keeping the two files parallel makes a drift between platforms immediately
 * visible in a diff.
 */

export const authApi = {
  signup: (payload) => api.post('/auth/signup', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (payload) => api.patch('/auth/me', payload).then((r) => r.data),
  changePassword: (payload) => api.post('/auth/change-password', payload).then((r) => r.data),
};

export const habitApi = {
  list: (includeArchived = false) =>
    api.get('/habits', { params: { includeArchived } }).then((r) => r.data),
  today: () => api.get('/habits/today').then((r) => r.data),
  get: (id) => api.get(`/habits/${id}`).then((r) => r.data),
  create: (payload) => api.post('/habits', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/habits/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/habits/${id}`).then((r) => r.data),
  reorder: (order) => api.patch('/habits/reorder', { order }).then((r) => r.data),

  checkIn: (id, payload = {}) => api.post(`/habits/${id}/checkin`, payload).then((r) => r.data),
  undoCheckIn: (id, date) =>
    api.delete(`/habits/${id}/checkin`, { params: date ? { date } : {} }).then((r) => r.data),
  checkIns: (id, params) => api.get(`/habits/${id}/checkins`, { params }).then((r) => r.data),
};

export const statsApi = {
  dashboard: (range = '30d') => api.get('/stats/dashboard', { params: { range } }).then((r) => r.data),
  insights: () => api.get('/stats/insights').then((r) => r.data),
  recap: () => api.get('/stats/recap').then((r) => r.data),
};

export const progressApi = {
  get: () => api.get('/me/progress').then((r) => r.data),
};

export const pushApi = {
  reminders: () => api.get('/push/reminders').then((r) => r.data),
  /** Registers this device's Expo push token (see server PushSubscription). */
  subscribe: (expoToken, deviceName) =>
    api.post('/push/subscribe', { platform: 'expo', endpoint: expoToken, deviceName }).then((r) => r.data),
  unsubscribe: (expoToken) =>
    api.delete('/push/subscribe', { data: { endpoint: expoToken } }).then((r) => r.data),
  test: () => api.post('/push/test').then((r) => r.data),
};
