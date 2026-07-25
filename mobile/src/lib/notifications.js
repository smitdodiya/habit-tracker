import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { pushApi } from './endpoints.js';

/**
 * Habit reminders (brief §03 feature 5).
 *
 * Reminders are scheduled LOCALLY on the device, not pushed from the server.
 * Two reasons:
 *
 *   1. Expo Go dropped remote push in SDK 53, so a server-pushed reminder can
 *      never arrive during development. Local notifications still work.
 *   2. For a fixed daily time, local is simply better — it fires with no
 *      network, no server uptime dependency and no delivery lag.
 *
 * The server push path still exists and is registered when it can be, so a
 * real build can also receive server-side reminders (and anything else we might
 * want to send later). It is a bonus, not the mechanism.
 */

// A reminder should still show if the app happens to be open — otherwise it
// silently does nothing at exactly the moment it mattered.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android needs an explicit channel or notifications arrive silently. */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E94560',
  });
}

/** Asks for permission. Returns the resulting status. */
export async function requestPermission() {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return 'granted';

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

/**
 * Rewrites the device's scheduled reminders to match the habits.
 *
 * Cancels everything first rather than diffing: the set is small, and a
 * rebuild-from-truth cannot drift out of sync the way incremental updates can
 * when an edit is missed.
 *
 * @returns {Promise<number>} how many notifications are now scheduled
 */
export async function syncLocalReminders(reminders = []) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return 0;

  await ensureAndroidChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  let scheduled = 0;

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;

    const [hour, minute] = reminder.time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

    const content = {
      title: reminder.name,
      body: 'Time for your habit — keep the streak going.',
      sound: 'default',
      data: { habitId: reminder.habitId, url: '/today' },
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    };

    const frequency = reminder.frequency ?? {};
    const isCustomDays = frequency.type === 'custom' && frequency.daysOfWeek?.length;

    if (isCustomDays) {
      // One weekly notification per chosen day. Expo's weekday is 1-7 with
      // Sunday = 1, while we store 0-6 with Sunday = 0.
      for (const day of frequency.daysOfWeek) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour,
            minute,
          },
        });
        scheduled += 1;
      }
    } else {
      // Daily habits, and flexible "X per week" ones — for the latter any day
      // is a valid opportunity, so a daily nudge is the right prompt.
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      scheduled += 1;
    }
  }

  return scheduled;
}

/** Clears every reminder this app scheduled. */
export async function clearLocalReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Fires a notification a few seconds out, so the user can confirm it works. */
export async function sendTestNotification() {
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Habit Tracker',
      body: 'Notifications are working. Your reminders will arrive like this.',
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  });
}

/**
 * Registers this device for server-sent push, when the environment supports it.
 * Best-effort: failure here never blocks local reminders.
 */
async function registerForServerPush() {
  if (!Device.isDevice) return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await pushApi.subscribe(token, Device.deviceName ?? 'Phone');
    return token;
  } catch {
    // Expected in Expo Go, which has no push support — local reminders are
    // unaffected, so there is nothing to report to the user.
    return null;
  }
}

export function useNotifications() {
  const [permission, setPermission] = useState('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const supported = Device.isDevice;

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => setPermission(status))
      .catch(() => {});

    Notifications.getAllScheduledNotificationsAsync()
      .then((list) => setScheduledCount(list.length))
      .catch(() => {});
  }, []);

  /** Grants permission and schedules the given reminders. */
  const enable = useCallback(async (reminders) => {
    setBusy(true);
    try {
      const status = await requestPermission();
      setPermission(status);

      if (status !== 'granted') {
        throw new Error(
          'Notifications are blocked. Turn them on for Habit Tracker in your phone settings.',
        );
      }

      const count = await syncLocalReminders(reminders);
      setScheduledCount(count);

      registerForServerPush(); // best-effort, not awaited
      return count;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await clearLocalReminders();
      setScheduledCount(0);
    } finally {
      setBusy(false);
    }
  }, []);

  /** Keeps the device schedule in step after a reminder is edited. */
  const sync = useCallback(async (reminders) => {
    const count = await syncLocalReminders(reminders);
    setScheduledCount(count);
    return count;
  }, []);

  return {
    supported,
    permission,
    scheduledCount,
    busy,
    enable,
    disable,
    sync,
    sendTest: sendTestNotification,
  };
}
