/**
 * Service worker for habit reminders.
 *
 * Kept deliberately minimal: it exists so reminders arrive when the app is
 * closed, which a page-lifetime timer can never do. There is no offline
 * caching here — the habit data is inherently live, and a stale cached Today
 * view showing yesterday's check-ins would be worse than no offline mode.
 */

// Take over immediately rather than waiting for every tab to close, so a
// freshly-granted subscription starts working right away.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Habit Tracker', body: event.data?.text() ?? 'Time for your habit.' };
  }

  const title = payload.title ?? 'Habit Tracker';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? 'Time for your habit — keep the streak going.',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      // Tagging by habit means a second reminder for the same habit replaces
      // the first instead of stacking up notifications.
      tag: payload.habitId ? `habit-${payload.habitId}` : 'habit-tracker',
      renotify: true,
      data: { url: payload.url ?? '/today', habitId: payload.habitId },
      actions: [{ action: 'open', title: 'Open' }],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/today';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if there is one — opening a duplicate every time
      // a reminder fires would litter the user's window list.
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate?.(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow?.(targetUrl);
    }),
  );
});
