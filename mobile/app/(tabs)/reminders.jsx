import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellRinging, BellSlash, PaperPlaneTilt, Warning } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useNotifications } from '../../src/lib/notifications.js';
import { pushApi, habitApi } from '../../src/lib/endpoints.js';
import { errorMessage } from '../../src/lib/api.js';
import { toast } from '../../src/components/ui/Toast.jsx';

import { Card, ScreenHeader } from '../../src/components/ui/Card.jsx';
import { Button } from '../../src/components/ui/Button.jsx';
import { Toggle } from '../../src/components/ui/Toggle.jsx';
import { EmptyState, Skeleton } from '../../src/components/ui/Feedback.jsx';
import { EmptyHabitsIllustration } from '../../src/components/illustrations/Illustrations.jsx';
import { getIcon } from '../../src/lib/icons.js';
import { describeFrequency, formatTime, withAlpha } from '@habit-tracker/shared/format';

/** Reminders settings (brief §04): every reminder, toggle on/off, edit time. */
export default function RemindersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const notifications = useNotifications();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [editingTime, setEditingTime] = useState(null);

  const load = useCallback(async () => {
    try {
      const { reminders: list } = await pushApi.reminders();
      setReminders(list);
      // Rewrite the device's schedule from the server's truth, so a reminder
      // edited on the web shows up correctly here too.
      notifications.sync(list).catch(() => {});
      return list;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load your reminders'));
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync is stable
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  /** Optimistic, rolled back if the save fails. */
  const update = async (habitId, patch) => {
    const previous = reminders;
    setReminders((list) => list.map((r) => (r.habitId === habitId ? { ...r, ...patch } : r)));
    setSavingId(habitId);

    try {
      const target = previous.find((r) => r.habitId === habitId);
      await habitApi.update(habitId, {
        reminder: { enabled: patch.enabled ?? target.enabled, time: patch.time ?? target.time },
      });

      const next = previous.map((r) => (r.habitId === habitId ? { ...r, ...patch } : r));
      await notifications.sync(next);
    } catch (error) {
      setReminders(previous);
      toast.error(errorMessage(error, 'Could not save that reminder'));
    } finally {
      setSavingId(null);
    }
  };

  const activeCount = reminders.filter((r) => r.enabled).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={colors.accent}
        />
      }
    >
      <ScreenHeader
        title="Reminders"
        subtitle={
          activeCount === 0
            ? 'Nudges for the habits you forget'
            : `${activeCount} reminder${activeCount === 1 ? '' : 's'} active`
        }
      />

      {/* ---- Permission state ---- */}
      <Card>
        {!notifications.supported ? (
          <View style={styles.stateRow}>
            <Warning size={20} color={colors.warning} weight="fill" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.stateTitle, { color: colors.text }]}>Needs a real device</Text>
              <Text style={[styles.stateBody, { color: colors.textMuted }]}>
                Notifications need a real phone. Your times are still saved.
              </Text>
            </View>
          </View>
        ) : notifications.permission === 'granted' ? (
          <View>
            <View style={styles.stateRow}>
              <View style={[styles.stateIcon, { backgroundColor: colors.successSoft }]}>
                <BellRinging size={19} color={colors.success} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stateTitle, { color: colors.text }]}>Notifications are on</Text>
                <Text style={[styles.stateBody, { color: colors.textMuted }]}>
                  Reminders will arrive at your chosen times.
                </Text>
              </View>
            </View>

            <View style={styles.stateActions}>
              <Button
                variant="secondary"
                size="sm"
                icon={PaperPlaneTilt}
                style={{ flex: 1 }}
                fullWidth
                onPress={async () => {
                  try {
                    await notifications.sendTest();
                    toast.success('Test notification sent');
                  } catch (error) {
                    toast.error(errorMessage(error, 'Could not send a test'));
                  }
                }}
              >
                Send test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={BellSlash}
                style={{ flex: 1 }}
                fullWidth
                loading={notifications.busy}
                onPress={async () => {
                  await notifications.disable();
                  toast.info('Reminders turned off');
                }}
              >
                Turn off
              </Button>
            </View>
          </View>
        ) : notifications.permission === 'denied' ? (
          <View style={styles.stateRow}>
            <Warning size={20} color={colors.warning} weight="fill" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.stateTitle, { color: colors.text }]}>Notifications are blocked</Text>
              <Text style={[styles.stateBody, { color: colors.textMuted }]}>
                Turn them on in your phone settings, then come back.
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.stateRow}>
              <View style={[styles.stateIcon, { backgroundColor: colors.accentSoft }]}>
                <BellRinging size={19} color={colors.accentStrong} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stateTitle, { color: colors.text }]}>Turn on notifications</Text>
                <Text style={[styles.stateBody, { color: colors.textMuted }]}>
                  Get a nudge at the time you choose.
                </Text>
              </View>
            </View>

            <Button
              fullWidth
              style={{ marginTop: 14 }}
              loading={notifications.busy}
              onPress={async () => {
                try {
                  const count = await notifications.enable(reminders);
                  toast.success(
                    count > 0
                      ? `${count} reminder${count === 1 ? '' : 's'} scheduled`
                      : 'Notifications on',
                  );
                } catch (error) {
                  toast.error(error.message ?? 'Could not enable notifications');
                }
              }}
            >
              Enable notifications
            </Button>
          </View>
        )}
      </Card>

      {/* ---- Reminder list ---- */}
      {loading ? (
        <View style={{ gap: 10 }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={78} radius={14} />
          ))}
        </View>
      ) : reminders.length === 0 ? (
        <EmptyState
          illustration={EmptyHabitsIllustration}
          title="No habits to remind you about"
          description="Add a habit first, then set its reminder here."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {reminders.map((reminder) => {
            const Icon = getIcon(reminder.icon);
            return (
              <Card key={reminder.habitId}>
                <View style={styles.reminderRow}>
                  <View style={[styles.reminderIcon, { backgroundColor: withAlpha(reminder.color, 0.14) }]}>
                    <Icon size={19} color={reminder.color} weight="duotone" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reminderName, { color: colors.text }]} numberOfLines={1}>
                      {reminder.name}
                    </Text>
                    <Text style={[styles.reminderMeta, { color: colors.textMuted }]}>
                      {describeFrequency(reminder.frequency)}
                      {reminder.enabled ? ` · ${formatTime(reminder.time)}` : ''}
                    </Text>
                  </View>

                  <Toggle
                    checked={reminder.enabled}
                    disabled={savingId === reminder.habitId}
                    onChange={(enabled) => update(reminder.habitId, { enabled })}
                  />
                </View>

                {reminder.enabled ? (
                  <View style={[styles.timeRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Remind me at</Text>
                    <Pressable
                      onPress={() => setEditingTime(reminder)}
                      accessibilityRole="button"
                      accessibilityLabel={`Change reminder time, currently ${formatTime(reminder.time)}`}
                      style={[styles.timeButton, { borderColor: colors.borderStrong }]}
                    >
                      <Text style={[styles.timeText, { color: colors.text }]}>
                        {formatTime(reminder.time)}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      <Text style={[styles.footnote, { color: colors.textSubtle }]}>
        Reminders use your phone's clock and repeat every week.
      </Text>

      {editingTime ? (
        <DateTimePicker
          value={timeToDate(editingTime.time)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            const habitId = editingTime.habitId;
            if (Platform.OS === 'android') setEditingTime(null);
            if (event.type === 'dismissed' || !selected) return;
            update(habitId, { time: dateToTime(selected) });
            if (Platform.OS === 'ios') setEditingTime(null);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function timeToDate(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function dateToTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stateIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  stateBody: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  stateActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  reminderName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  reminderMeta: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 2 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  timeLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  timeButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  timeText: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  footnote: { fontSize: 11.5, fontFamily: 'Inter_400Regular', lineHeight: 16, paddingHorizontal: 4 },
});
