import { useEffect, useState } from 'react';
import { BellRinging, BellSlash, PaperPlaneTilt, Warning } from '@phosphor-icons/react';

import { pushApi, habitApi } from '../api/endpoints.js';
import { errorMessage } from '../api/client.js';
import { toast } from '../store/toastStore.js';
import { useNotifications } from '../hooks/useNotifications.js';

import { Button } from '../components/ui/Button.jsx';
import { Toggle } from '../components/ui/Toggle.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyHabitsIllustration } from '../components/illustrations/Illustrations.jsx';
import { getIcon } from '../lib/icons.js';
import { describeFrequency, formatTime, withAlpha } from '../lib/format.js';

/**
 * Reminders settings (brief §04): every reminder in one list, each with an
 * on/off switch and an editable time.
 */
export function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const notifications = useNotifications();

  const load = async () => {
    try {
      const { reminders: list } = await pushApi.reminders();
      setReminders(list);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load your reminders'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** Optimistic update, rolled back if the save fails. */
  const updateReminder = async (habitId, patch) => {
    const previous = reminders;
    setReminders(reminders.map((r) => (r.habitId === habitId ? { ...r, ...patch } : r)));
    setSavingId(habitId);

    try {
      const target = previous.find((r) => r.habitId === habitId);
      await habitApi.update(habitId, {
        reminder: { enabled: patch.enabled ?? target.enabled, time: patch.time ?? target.time },
      });
    } catch (error) {
      setReminders(previous);
      toast.error(errorMessage(error, 'Could not save that reminder'));
    } finally {
      setSavingId(null);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const { background } = await notifications.enable();
      toast.success(
        background
          ? 'Notifications on. Reminders will arrive even with the app closed.'
          : 'Notifications on. Reminders will show while the app is open.',
      );
    } catch (error) {
      toast.error(error.message ?? 'Could not enable notifications');
    }
  };

  const handleTest = async () => {
    try {
      await notifications.sendTest();
      toast.success('Test notification sent');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not send a test notification'));
    }
  };

  const activeCount = reminders.filter((r) => r.enabled).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">Reminders</h1>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          {activeCount === 0
            ? 'Set a nudge for the habits you tend to forget'
            : `${activeCount} reminder${activeCount === 1 ? '' : 's'} active`}
        </p>
      </header>

      {/* ---- Permission / delivery status ---- */}
      <section className="card p-5" aria-label="Notification permission">
        {!notifications.supported ? (
          <div className="flex gap-3">
            <Warning size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div>
              <p className="text-sm font-bold text-[var(--text)]">Notifications aren't supported here</p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
                This browser doesn't support web notifications. Your reminder times are still saved and will
                work in a supported browser.
              </p>
            </div>
          </div>
        ) : notifications.permission === 'granted' ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                <BellRinging size={19} weight="fill" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--text)]">Notifications are on</p>
                {/* Registering with the browser's push service takes a few
                    seconds on a first connection, so say so rather than
                    claiming background delivery before it actually exists. */}
                <p className="text-xs text-[var(--text-muted)]">
                  {notifications.error
                    ? 'Reminders show while the app is open'
                    : notifications.subscribed
                      ? 'Reminders arrive even when the app is closed'
                      : notifications.serverEnabled
                        ? 'Connecting for background delivery…'
                        : 'Reminders show while the app is open'}
                </p>
                {notifications.error && (
                  <p className="mt-0.5 text-xs text-[var(--warning)]">
                    Background delivery unavailable — {notifications.error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {notifications.subscribed && (
                <Button variant="secondary" size="sm" onClick={handleTest}>
                  <PaperPlaneTilt size={14} />
                  Send test
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await notifications.disable();
                  toast.info('Background reminders turned off for this browser');
                }}
                loading={notifications.busy}
              >
                <BellSlash size={14} />
                Turn off
              </Button>
            </div>
          </div>
        ) : notifications.permission === 'denied' ? (
          <div className="flex gap-3">
            <Warning size={20} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div>
              <p className="text-sm font-bold text-[var(--text)]">Notifications are blocked</p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
                Your browser is blocking notifications for this site. Allow them in the site settings — usually
                the icon at the left of the address bar — then reload this page.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <BellRinging size={19} weight="fill" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--text)]">Turn on notifications</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Get a nudge at the time you set for each habit
                </p>
              </div>
            </div>

            <Button size="sm" onClick={handleEnableNotifications} loading={notifications.busy}>
              Enable
            </Button>
          </div>
        )}
      </section>

      {/* ---- Reminder list ---- */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" rounded="rounded-[14px]" />
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <EmptyState
          illustration={EmptyHabitsIllustration}
          title="No habits to remind you about"
          description="Add a habit first, then come back to set a reminder time for it."
        />
      ) : (
        <section className="space-y-2.5" aria-label="Habit reminders">
          {reminders.map((reminder) => {
            const Icon = getIcon(reminder.icon);

            return (
              <div key={reminder.habitId} className="card p-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                    style={{ background: withAlpha(reminder.color, 0.14), color: reminder.color }}
                  >
                    <Icon size={19} weight="duotone" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--text)]">{reminder.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {describeFrequency(reminder.frequency)}
                      {reminder.enabled && ` · ${formatTime(reminder.time)}`}
                    </p>
                  </div>

                  <Toggle
                    checked={reminder.enabled}
                    disabled={savingId === reminder.habitId}
                    onChange={(enabled) => updateReminder(reminder.habitId, { enabled })}
                    id={`reminder-${reminder.habitId}`}
                  />
                </div>

                {reminder.enabled && (
                  <div className="mt-3.5 flex items-center gap-3 border-t border-[var(--border)] pt-3.5">
                    <label
                      htmlFor={`time-${reminder.habitId}`}
                      className="text-[0.8125rem] font-semibold text-[var(--text-muted)]"
                    >
                      Remind me at
                    </label>
                    <input
                      id={`time-${reminder.habitId}`}
                      type="time"
                      value={reminder.time}
                      onChange={(event) => updateReminder(reminder.habitId, { time: event.target.value })}
                      className="rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[0.8125rem] font-semibold text-[var(--text)] focus:border-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <p className="px-1 text-xs leading-relaxed text-[var(--text-subtle)]">
        Reminders fire in your own timezone, and are skipped for any habit you've already ticked off that day.
      </p>
    </div>
  );
}
