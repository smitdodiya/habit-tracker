import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { pushApi } from './endpoints.js';

/**
 * Native push notifications (brief §03 feature 5, §06 "Expo Notifications").
 *
 * The device registers an Expo push token with our server; the reminder cron
 * then relays through Expo to APNs and FCM. No Apple or Google credentials are
 * needed on our side, and none of the browser VAPID machinery applies here.
 *
 * Permission is requested only when the user asks for reminders — never on
 * launch. An unprompted permission dialog is the fastest way to get denied
 * permanently, and iOS only ever asks once.
 */

// Foreground behaviour: a reminder should still be visible if the user happens
// to have the app open, otherwise it silently does nothing at exactly the
// moment it mattered.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android requires an explicit channel or notifications arrive silently. */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E94560',
  });
}

export function useNotifications() {
  const [permission, setPermission] = useState('undetermined');
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState(null);

  // Expo Go on a simulator cannot receive push at all, so the UI needs to say
  // so rather than showing a button that silently fails.
  const supported = Device.isDevice;

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then(({ status }) => setPermission(status))
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    if (!supported) throw new Error('Push notifications need a physical device');

    setBusy(true);
    try {
      await ensureAndroidChannel();

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;

      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      setPermission(status);

      if (status !== 'granted') {
        throw new Error(
          'Notifications are blocked. Enable them for Habit Tracker in your phone settings.',
        );
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      const { data: expoToken } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );

      await pushApi.subscribe(expoToken, Device.deviceName ?? 'Phone');

      setToken(expoToken);
      setRegistered(true);
      return expoToken;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      if (token) await pushApi.unsubscribe(token).catch(() => {});
      setRegistered(false);
    } finally {
      setBusy(false);
    }
  }, [token]);

  const sendTest = useCallback(() => pushApi.test(), []);

  return { supported, permission, registered, busy, enable, disable, sendTest };
}
