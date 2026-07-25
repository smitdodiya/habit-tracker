import { api } from './client.js';

/**
 * Every server call the app makes, in one place.
 * Components never talk to axios directly — they call these, so a change to a
 * URL or payload shape has exactly one place to happen.
 */

export const authApi = {
  signup: (payload) => api.post('/auth/signup', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
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
};

export const progressApi = {
  get: () => api.get('/me/progress').then((r) => r.data),
  insights: () => api.get('/me/insights').then((r) => r.data),
  recap: () => api.get('/me/recap').then((r) => r.data),
  markRecapSeen: () => api.post('/me/recap/seen').then((r) => r.data),
};

export const pushApi = {
  publicKey: () => api.get('/push/public-key').then((r) => r.data),
  reminders: () => api.get('/push/reminders').then((r) => r.data),
  subscribe: (subscription) => api.post('/push/subscribe', subscription).then((r) => r.data),
  unsubscribe: (endpoint) => api.delete('/push/subscribe', { data: { endpoint } }).then((r) => r.data),
  test: () => api.post('/push/test').then((r) => r.data),
};

export const adminApi = {
  overview: () => api.get('/admin/overview').then((r) => r.data),
  users: (search = '') => api.get('/admin/users', { params: { search } }).then((r) => r.data),
  habits: () => api.get('/admin/habits').then((r) => r.data),
  activity: () => api.get('/admin/activity').then((r) => r.data),
};

/**
 * Downloads an export as a file.
 * Uses a blob rather than a plain link because the request needs the
 * Authorization header, which a bare <a href> cannot carry.
 */
export async function downloadExport({ format = 'csv', range = '30d' }) {
  const response = await api.get('/export', {
    params: { format, range },
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;

  const disposition = response.headers['content-disposition'] ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  link.download = match?.[1] ?? `habit-tracker.${format}`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
