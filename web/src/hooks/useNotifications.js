import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '../api/endpoints.js';

/**
 * Browser notification setup for habit reminders (brief §03 feature 5).
 *
 * Two layers, because neither alone is sufficient:
 *
 *   1. Web Push + service worker — real background delivery, works with the
 *      tab closed. Needs VAPID keys on the server (self-generated, no account).
 *   2. The Notification API on its own — a fallback for browsers that block
 *      push or where the server has no keys configured. Only fires while the
 *      app is open, but it is better than silence.
 *
 * Permission is never requested on page load. Browsers penalise unprompted
 * requests, and a permission prompt before the user has asked for reminders is
 * the fastest way to get permanently blocked.
 */

const isSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** VAPID keys travel as base64url; the subscribe call needs raw bytes. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function useNotifications() {
  const [permission, setPermission] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [serverEnabled, setServerEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  // Surfaced in the UI. A subscription that fails silently is the worst
  // outcome: the user believes reminders are on and simply never gets one.
  const [error, setError] = useState(null);

  const supported = isSupported();

  /**
   * Establishes the current state, and — when permission has already been
   * granted — finishes the setup rather than just reporting it.
   *
   * This matters on every visit after the first. Permission survives across
   * sessions, but a service worker registration or push subscription may not:
   * the user can clear site data, the browser can evict the registration, or
   * the server's VAPID keys can be rotated. Without this, the UI would happily
   * say "notifications are on" while no subscription existed and no reminder
   * could ever be delivered — the worst kind of failure, because it is silent.
   *
   * Re-subscribing here never prompts: permission is already granted, so this
   * is completing work the user has already agreed to, not asking again.
   */
  useEffect(() => {
    if (!supported) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const { enabled, publicKey } = await pushApi.publicKey();
        if (cancelled) return;
        setServerEnabled(enabled);

        if (Notification.permission !== 'granted' || !enabled || !publicKey) {
          const registration = await navigator.serviceWorker.getRegistration();
          const existing = await registration?.pushManager.getSubscription();
          if (!cancelled) setSubscribed(Boolean(existing));
          return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));

        // Re-send even for an existing subscription: the server may have lost
        // the row while the browser kept the subscription, and the endpoint
        // upsert makes this idempotent.
        const payload = subscription.toJSON();
        await pushApi.subscribe({ endpoint: payload.endpoint, keys: payload.keys });

        if (!cancelled) {
          setSubscribed(true);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setSubscribed(false);
          setError(`${caught.name ?? 'Error'}: ${caught.message ?? caught}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supported]);

  /** Registers the service worker, asks permission, and subscribes. */
  const enable = useCallback(async () => {
    if (!supported) throw new Error('This browser does not support notifications');

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        throw new Error(
          result === 'denied'
            ? 'Notifications are blocked. Enable them for this site in your browser settings.'
            : 'Notification permission was not granted',
        );
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { publicKey, enabled } = await pushApi.publicKey();
      setServerEnabled(enabled);

      if (!enabled || !publicKey) {
        // Permission is granted, so in-app reminders will work even though
        // background push is unavailable.
        setSubscribed(false);
        return { background: false };
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const payload = subscription.toJSON();
      await pushApi.subscribe({ endpoint: payload.endpoint, keys: payload.keys });

      setSubscribed(true);
      return { background: true };
    } finally {
      setBusy(false);
    }
  }, [supported]);

  /** Unsubscribes this browser. Permission itself can only be revoked by the user. */
  const disable = useCallback(async () => {
    if (!supported) return;

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await pushApi.unsubscribe(subscription.endpoint).catch(() => {});
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const sendTest = useCallback(async () => {
    await pushApi.test();
  }, []);

  return {
    supported,
    permission,
    subscribed,
    serverEnabled,
    busy,
    error,
    enable,
    disable,
    sendTest,
  };
}
