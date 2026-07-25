import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Fire, Trophy, NotePencil, DotsThreeVertical } from 'phosphor-react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { getIcon } from '../../lib/icons.js';
import { describeFrequency, formatTime, withAlpha } from '@habit-tracker/shared/format';

const DAY_MILESTONES = [7, 30, 100, 365];
const WEEK_MILESTONES = [4, 12, 26, 52];

/**
 * A single habit on the Today view.
 *
 * The row navigates to the detail screen; the circle checks in. Keeping those
 * as two separate targets means the common action stays one tap and the rest is
 * still reachable — no long-press or swipe that nobody discovers.
 */
export function HabitCard({ habit, onCheckIn, onUndo, onMenu, busy = false }) {
  const { colors } = useTheme();
  const router = useRouter();
  const Icon = getIcon(habit.icon);

  const done = Boolean(habit.checkIn);
  const offSchedule = !habit.dueToday;

  // The tick springs in rather than appearing, which is what makes checking
  // something off feel like an event.
  const tick = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(tick, {
      toValue: done ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 12,
    }).start();
  }, [done, tick]);

  return (
    <View
      style={[
        styles.card,
        {
          // A finished habit recedes rather than being crossed out: flat
          // surface, no border, dimmed. Strikethrough reads as "cancelled",
          // which is the wrong feeling for something you just achieved.
          backgroundColor: done ? colors.surface2 : colors.surface,
          borderColor: done ? 'transparent' : colors.border,
          opacity: done ? 0.72 : 1,
        },
      ]}
    >
      <Pressable
        style={styles.main}
        onPress={() => router.push(`/habit/${habit.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${habit.name}, view details`}
      >
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(habit.color, 0.14) }]}>
          <Icon size={21} color={habit.color} weight="duotone" />
        </View>

        <View style={styles.details}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: done ? colors.textMuted : colors.text }]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>

            {offSchedule ? (
              <View style={[styles.pill, { backgroundColor: colors.surface3 }]}>
                <Text style={[styles.pillText, { color: colors.textSubtle }]}>NOT DUE</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <StreakBadge stats={habit.stats} />
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
              {describeFrequency(habit.frequency)}
              {habit.reminder?.enabled ? ` · ${formatTime(habit.reminder.time)}` : ''}
            </Text>
          </View>

          {habit.checkIn?.note ? (
            <View style={styles.noteRow}>
              <NotePencil size={11} color={colors.textMuted} />
              <Text style={[styles.note, { color: colors.textMuted }]} numberOfLines={2}>
                {habit.checkIn.note}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        onPress={() => onMenu?.(habit)}
        hitSlop={8}
        style={styles.menuButton}
        accessibilityRole="button"
        accessibilityLabel={`Options for ${habit.name}`}
      >
        <DotsThreeVertical size={18} color={colors.textSubtle} weight="bold" />
      </Pressable>

      <Pressable
        onPress={() => (done ? onUndo?.(habit) : onCheckIn?.(habit))}
        disabled={busy}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done, disabled: busy }}
        accessibilityLabel={done ? `Undo check-in for ${habit.name}` : `Mark ${habit.name} as done`}
        style={({ pressed }) => [
          styles.checkButton,
          {
            backgroundColor: done ? habit.color : 'transparent',
            borderColor: done ? habit.color : colors.borderStrong,
            opacity: busy ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.9 : 1 }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: tick }], opacity: tick }}>
          <Check size={21} color="#FFFFFF" weight="bold" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/**
 * Streak chip. The unit comes from the server — daily habits streak in days,
 * flexible weekly habits in weeks — so the label always matches the schedule.
 */
export function StreakBadge({ stats, compact = false }) {
  const { colors } = useTheme();
  const { current = 0, unit = 'day' } = stats ?? {};

  const milestones = unit === 'week' ? WEEK_MILESTONES : DAY_MILESTONES;
  const atMilestone = milestones.includes(current);

  if (current === 0) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.surface3 }]}>
        <Text style={[styles.badgeText, { color: colors.textSubtle }]}>No streak yet</Text>
      </View>
    );
  }

  const label = `${current} ${unit}${current === 1 ? '' : 's'}`;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: atMilestone ? colors.accentStrong : colors.accentSoft, gap: 3 },
      ]}
    >
      {atMilestone ? (
        <Trophy size={11} color="#FFFFFF" weight="fill" />
      ) : (
        <Fire size={11} color={colors.accentStrong} weight="fill" />
      )}
      <Text
        style={[styles.badgeText, { color: atMilestone ? '#FFFFFF' : colors.accentStrong }]}
        accessibilityLabel={`Current streak ${label}`}
      >
        {compact ? current : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14.5, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  meta: { fontSize: 11, fontFamily: 'Inter_400Regular', flexShrink: 1 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  note: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic', flex: 1, lineHeight: 15 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  menuButton: { padding: 4 },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
