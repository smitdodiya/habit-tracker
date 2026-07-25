import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, CheckCircle, Lightning } from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useHabitStore } from '../../src/store/habitStore.js';
import { useAuthStore } from '../../src/store/authStore.js';
import { useProgressStore } from '../../src/store/progressStore.js';
import { toast } from '../../src/components/ui/Toast.jsx';
import { errorMessage } from '../../src/lib/api.js';

import { Card, ScreenHeader } from '../../src/components/ui/Card.jsx';
import { Button } from '../../src/components/ui/Button.jsx';
import { EmptyState, ListSkeleton } from '../../src/components/ui/Feedback.jsx';
import { HabitCard } from '../../src/components/habit/HabitCard.jsx';
import { LevelBar } from '../../src/components/gamification/LevelBar.jsx';
import { FreezeNotice } from '../../src/components/gamification/FreezeNotice.jsx';
import { MilestoneDialog, ConfettiBurst, celebrateHaptic } from '../../src/components/feedback/Celebration.jsx';
import { HabitSheet } from '../../src/components/habit/HabitSheet.jsx';
import { NoteSheet } from '../../src/components/habit/NoteSheet.jsx';
import { HabitMenuSheet } from '../../src/components/habit/HabitMenuSheet.jsx';
import {
  EmptyHabitsIllustration,
  AllDoneIllustration,
} from '../../src/components/illustrations/Illustrations.jsx';
import { greeting, formatLongDate } from '@habit-tracker/shared/format';

/**
 * Home / Today view (brief §04).
 *
 * Habits split into "due today" and "not scheduled today". The second group is
 * still reachable, collapsed, because people do sometimes want to tick a
 * Tuesday habit on a Monday — hiding it entirely makes the app feel like it is
 * arguing with them.
 */
export default function TodayScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const {
    habits, date, summary, freezes, freezeNotices,
    status, loadToday, checkIn, undoCheckIn, saveNote, removeHabit, dismissFreezeNotices,
  } = useHabitStore();
  const { progress, load: loadProgress } = useProgressStore();

  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [confetti, setConfetti] = useState(null);
  const [showOffSchedule, setShowOffSchedule] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [noteFor, setNoteFor] = useState(null);

  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadToday({ quiet: true }), loadProgress()]);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load your habits'));
    }
  }, [loadToday, loadProgress]);

  useEffect(() => {
    loadToday().catch((error) => toast.error(errorMessage(error, 'Could not load your habits')));
    loadProgress().catch(() => {});
  }, [loadToday, loadProgress]);

  // Reload whenever the tab regains focus, so a check-in made on the web (or a
  // day that rolled over while the app was backgrounded) shows up.
  useFocusEffect(
    useCallback(() => {
      if (status === 'ready') refresh();
    }, [status, refresh]),
  );

  const { due, offSchedule } = useMemo(
    () => ({
      due: habits.filter((h) => h.dueToday),
      offSchedule: habits.filter((h) => !h.dueToday),
    }),
    [habits],
  );

  const allDone = due.length > 0 && summary.completed === due.length;

  /** A habit close to its personal best — worth saying so. */
  const recordNudge = useMemo(() => {
    const candidates = habits
      .filter((h) => h.stats?.current > 0 && h.stats.longest > h.stats.current)
      .map((h) => ({ habit: h, gap: h.stats.longest - h.stats.current }))
      .filter((c) => c.gap >= 1 && c.gap <= 5)
      .sort((a, b) => a.gap - b.gap);
    return candidates[0] ?? null;
  }, [habits]);

  const handleCheckIn = async (habit) => {
    setBusyId(habit.id);
    celebrateHaptic();
    setConfetti(habit.color);

    try {
      const result = await checkIn(habit.id);
      loadProgress().catch(() => {});

      // The server decides whether this landed on a milestone, so the
      // celebration can never fire on a stale local count.
      if (result?.stats?.milestoneReached) {
        setMilestone({ value: result.stats.milestoneReached, habit: { ...habit, stats: result.stats } });
      }
      if (result?.newAchievements?.length) {
        const [first] = result.newAchievements;
        toast.success(`Achievement unlocked — ${first.name}`);
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save that check-in'));
    } finally {
      setBusyId(null);
    }
  };

  const handleUndo = async (habit) => {
    setBusyId(habit.id);
    try {
      await undoCheckIn(habit.id);
      loadProgress().catch(() => {});
    } catch (error) {
      toast.error(errorMessage(error, 'Could not undo that check-in'));
    } finally {
      setBusyId(null);
    }
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + 16 }]}>
        <ListSkeleton count={5} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ConfettiBurst visible={Boolean(confetti)} color={confetti} onDone={() => setConfetti(null)} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
            tintColor={colors.accent}
          />
        }
      >
        <ScreenHeader
          title={`${greeting()}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
          subtitle={date ? formatLongDate(date) : undefined}
          right={
            <Button size="sm" icon={Plus} onPress={() => { setEditing(null); setFormOpen(true); }}>
              New
            </Button>
          }
        />

        <FreezeNotice notices={freezeNotices} freezes={freezes} onDismiss={dismissFreezeNotices} />

        <LevelBar progress={progress} />

        {due.length > 0 ? (
          <Card>
            <View style={styles.progressTop}>
              <View>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Today's progress</Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>
                  {summary.completed}
                  <Text style={{ color: colors.textMuted }}> / {due.length} </Text>
                  <Text style={[styles.progressDone, { color: colors.textMuted }]}>done</Text>
                </Text>
              </View>

              {allDone ? (
                <View style={[styles.allDone, { backgroundColor: colors.successSoft }]}>
                  <CheckCircle size={15} color={colors.success} weight="fill" />
                  <Text style={[styles.allDoneText, { color: colors.success }]}>All done</Text>
                </View>
              ) : null}
            </View>

            <View
              style={[styles.track, { backgroundColor: colors.surface3 }]}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: due.length, now: summary.completed }}
            >
              <View
                style={{
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: colors.accent,
                  width: `${due.length === 0 ? 0 : (summary.completed / due.length) * 100}%`,
                }}
              />
            </View>
          </Card>
        ) : null}

        {recordNudge ? (
          <View style={[styles.nudge, { backgroundColor: colors.accentSoft }]}>
            <Lightning size={14} color={colors.accentStrong} weight="fill" />
            <Text style={[styles.nudgeText, { color: colors.text }]} numberOfLines={2}>
              {recordNudge.gap} {recordNudge.gap === 1 ? 'day' : 'days'} from your best ever on{' '}
              <Text style={{ fontFamily: 'Inter_700Bold' }}>{recordNudge.habit.name}</Text> (
              {recordNudge.habit.stats.longest})
            </Text>
          </View>
        ) : null}

        {habits.length === 0 ? (
          <EmptyState
            illustration={EmptyHabitsIllustration}
            title="No habits yet"
            description="Add the first thing you want to do consistently. Start with one — you can always add more."
            action={
              <Button size="lg" icon={Plus} onPress={() => setFormOpen(true)}>
                Add your first habit
              </Button>
            }
          />
        ) : due.length === 0 ? (
          <EmptyState
            illustration={AllDoneIllustration}
            title="Nothing scheduled today"
            description="None of your habits are due today. Enjoy the day off — or tick one off anyway if you're feeling keen."
          />
        ) : (
          <View style={styles.list}>
            {due.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                busy={busyId === habit.id}
                onCheckIn={handleCheckIn}
                onUndo={handleUndo}
                onMenu={setMenuFor}
              />
            ))}
          </View>
        )}

        {offSchedule.length > 0 ? (
          <View>
            <Pressable
              onPress={() => setShowOffSchedule((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: showOffSchedule }}
            >
              <Text style={[styles.toggle, { color: colors.textMuted }]}>
                {showOffSchedule ? 'Hide' : 'Show'} {offSchedule.length} habit
                {offSchedule.length === 1 ? '' : 's'} not due today
              </Text>
            </Pressable>

            {showOffSchedule ? (
              <View style={[styles.list, { marginTop: 12 }]}>
                {offSchedule.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    busy={busyId === habit.id}
                    onCheckIn={handleCheckIn}
                    onUndo={handleUndo}
                    onMenu={setMenuFor}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* ---- Sheets ---- */}
      <HabitSheet
        open={formOpen}
        habit={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={async () => { setFormOpen(false); setEditing(null); await refresh(); }}
      />

      <HabitMenuSheet
        habit={menuFor}
        onClose={() => setMenuFor(null)}
        onEdit={(habit) => { setMenuFor(null); setEditing(habit); setFormOpen(true); }}
        onNote={(habit) => { setMenuFor(null); setNoteFor(habit); }}
        onDetails={(habit) => { setMenuFor(null); router.push(`/habit/${habit.id}`); }}
        onDelete={async (habit) => {
          setMenuFor(null);
          try {
            await removeHabit(habit.id);
            toast.success(`"${habit.name}" deleted`);
          } catch (error) {
            toast.error(errorMessage(error, 'Could not delete that habit'));
          }
        }}
      />

      <NoteSheet
        habit={noteFor}
        onClose={() => setNoteFor(null)}
        onSave={async (payload) => {
          try {
            await saveNote(noteFor.id, payload);
            toast.success('Note saved');
          } catch (error) {
            toast.error(errorMessage(error, 'Could not save that note'));
          }
        }}
      />

      {milestone ? (
        <MilestoneDialog
          milestone={milestone.value}
          habit={milestone.habit}
          onClose={() => setMilestone(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  list: { gap: 10 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold' },
  progressValue: { fontSize: 21, fontFamily: 'Inter_800ExtraBold', marginTop: 2, letterSpacing: -0.4 },
  progressDone: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  allDoneText: { fontSize: 12.5, fontFamily: 'Inter_700Bold' },
  track: { height: 8, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
  nudgeText: { flex: 1, fontSize: 12.5, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  toggle: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingVertical: 4 },
});
