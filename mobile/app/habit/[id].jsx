import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, PencilSimple, Trash, NotePencil, CalendarBlank, BellRinging } from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { habitApi } from '../../src/lib/endpoints.js';
import { errorMessage } from '../../src/lib/api.js';
import { toast } from '../../src/components/ui/Toast.jsx';

import { Card, SectionTitle } from '../../src/components/ui/Card.jsx';
import { Button } from '../../src/components/ui/Button.jsx';
import { CompletionRing } from '../../src/components/charts/Charts.jsx';
import { HabitSheet } from '../../src/components/habit/HabitSheet.jsx';
import { HabitMenuSheet } from '../../src/components/habit/HabitMenuSheet.jsx';
import { getIcon } from '../../src/lib/icons.js';
import {
  describeFrequency,
  categoryLabel,
  formatTime,
  formatDate,
  relativeDay,
  moodMeta,
  withAlpha,
} from '@habit-tracker/shared/format';
import { addDays, dayOfWeek, todayKey, daysBetween } from '@habit-tracker/shared/dates';

/** Habit Detail (brief §04): stats, streak history, completion graph, notes log. */
export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const today = todayKey();

  const load = useCallback(async () => {
    try {
      setData(await habitApi.get(id));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load that habit'));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const completed = useMemo(() => new Set((data?.checkIns ?? []).map((c) => c.date)), [data]);

  /** Mirrors the server's scheduling rule so days off render differently. */
  const isScheduled = useMemo(() => {
    const frequency = data?.habit?.frequency;
    if (!frequency) return () => true;
    return (date) =>
      frequency.type === 'custom' && frequency.daysOfWeek?.length
        ? frequency.daysOfWeek.includes(dayOfWeek(date))
        : true;
  }, [data]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data) return null;

  const { habit, stats, notes } = data;
  const Icon = getIcon(habit.icon);
  const historyStart = addDays(today, -89);
  const days = Array.from({ length: daysBetween(historyStart, today) + 1 }, (_, i) =>
    addDays(historyStart, i),
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <ArrowLeft size={17} color={colors.textMuted} weight="bold" />
          <Text style={[styles.backText, { color: colors.textMuted }]}>Back</Text>
        </Pressable>

        {/* ---- Header ---- */}
        <Card tint={withAlpha(habit.color, 0.07)}>
          <View style={styles.headerRow}>
            <View style={[styles.headerIcon, { backgroundColor: withAlpha(habit.color, 0.16) }]}>
              <Icon size={27} color={habit.color} weight="duotone" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                {habit.name}
              </Text>

              <View style={styles.metaRow}>
                <View style={[styles.categoryPill, { backgroundColor: colors.surface3 }]}>
                  <Text style={[styles.categoryText, { color: colors.textMuted }]}>
                    {categoryLabel(habit.category)}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <CalendarBlank size={12} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>
                    {describeFrequency(habit.frequency)}
                  </Text>
                </View>

                {habit.reminder?.enabled ? (
                  <View style={styles.metaItem}>
                    <BellRinging size={12} color={colors.textMuted} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {formatTime(habit.reminder.time)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {habit.description ? (
            <Text style={[styles.description, { color: colors.textMuted }]}>{habit.description}</Text>
          ) : null}

          <View style={styles.headerActions}>
            <Button variant="secondary" size="sm" icon={PencilSimple} style={{ flex: 1 }} fullWidth onPress={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="dangerSoft" size="sm" icon={Trash} style={{ flex: 1 }} fullWidth onPress={() => setMenuOpen(true)}>
              Delete
            </Button>
          </View>
        </Card>

        {/* ---- Streak ---- */}
        <Card>
          <SectionTitle>Streak</SectionTitle>
          <View style={styles.streakRow}>
            <View>
              <Text style={[styles.streakValue, { color: colors.text }]}>
                {stats.current}
                <Text style={[styles.streakUnit, { color: colors.textMuted }]}>
                  {' '}
                  {stats.unit}
                  {stats.current === 1 ? '' : 's'}
                </Text>
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textMuted }]}>Current streak</Text>
            </View>

            <View>
              <Text style={[styles.streakSecondary, { color: colors.text }]}>{stats.longest}</Text>
              <Text style={[styles.streakLabel, { color: colors.textMuted }]}>Longest</Text>
            </View>

            <View style={{ marginLeft: 'auto' }}>
              <CompletionRing value={stats.completionRate} size={78} strokeWidth={8} />
            </View>
          </View>

          {stats.nextMilestone ? (
            <View style={{ marginTop: 14 }}>
              <View
                style={[styles.track, { backgroundColor: colors.surface3 }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: stats.nextMilestone, now: stats.current }}
              >
                <View
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: colors.accent,
                    width: `${Math.min(1, stats.current / stats.nextMilestone) * 100}%`,
                  }}
                />
              </View>
              <Text style={[styles.trackHint, { color: colors.textMuted }]}>
                {stats.nextMilestone - stats.current} more to reach {stats.nextMilestone} {stats.unit}
                {stats.nextMilestone === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* ---- 90-day history ---- */}
        <Card>
          <SectionTitle>Last 90 days</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={styles.strip}>
              {days.map((date) => {
                const done = completed.has(date);
                const scheduled = isScheduled(date);
                return (
                  <View
                    key={date}
                    accessibilityLabel={`${formatDate(date)}: ${done ? 'done' : scheduled ? 'missed' : 'not scheduled'}`}
                    style={{
                      width: 7,
                      height: 24,
                      borderRadius: 2,
                      backgroundColor: done ? habit.color : colors.surface3,
                      opacity: done ? 1 : scheduled ? 1 : 0.4,
                    }}
                  />
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.legend}>
            <LegendDot color={habit.color} label="Done" />
            <LegendDot color={colors.surface3} label="Missed" />
            <LegendDot color={colors.surface3} label="Not scheduled" opacity={0.4} />
          </View>
        </Card>

        {/* ---- Notes ---- */}
        <Card>
          <SectionTitle>Notes{notes.length > 0 ? ` (${notes.length})` : ''}</SectionTitle>

          {notes.length === 0 ? (
            <View style={styles.emptyNotes}>
              <NotePencil size={24} color={colors.textSubtle} />
              <Text style={[styles.emptyNotesText, { color: colors.textMuted }]}>No notes yet.</Text>
              <Text style={[styles.emptyNotesHint, { color: colors.textSubtle }]}>
                Add a note when you check in to capture how it went.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 14, gap: 14 }}>
              {notes.map((note) => {
                const mood = moodMeta(note.mood);
                return (
                  <View
                    key={note.id}
                    style={[styles.note, { borderLeftColor: withAlpha(habit.color, 0.4) }]}
                  >
                    <View style={styles.noteHeader}>
                      <Text style={[styles.noteDate, { color: colors.text }]}>
                        {relativeDay(note.date, today)}
                      </Text>
                      {mood ? (
                        <Text style={[styles.noteMood, { color: colors.textMuted }]}>
                          {mood.emoji} {mood.label}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.noteBody, { color: colors.textMuted }]}>{note.note}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </ScrollView>

      <HabitSheet
        open={editOpen}
        habit={habit}
        onClose={() => setEditOpen(false)}
        onSaved={async () => {
          setEditOpen(false);
          await load();
        }}
      />

      {menuOpen ? (
        <HabitMenuSheet
          habit={{ ...habit, stats }}
          onClose={() => setMenuOpen(false)}
          onEdit={() => {
            setMenuOpen(false);
            setEditOpen(true);
          }}
          onNote={() => setMenuOpen(false)}
          onDetails={() => setMenuOpen(false)}
          onDelete={async () => {
            try {
              await habitApi.remove(habit.id);
              toast.success(`"${habit.name}" deleted`);
              router.back();
            } catch (error) {
              toast.error(errorMessage(error, 'Could not delete that habit'));
            }
          }}
        />
      ) : null}
    </View>
  );
}

function LegendDot({ color, label, opacity = 1 }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, opacity }} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  backText: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  headerRow: { flexDirection: 'row', gap: 14 },
  headerIcon: { width: 56, height: 56, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 19, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 7 },
  categoryPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, fontFamily: 'Inter_400Regular' },
  description: { fontSize: 13.5, fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: 14 },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 14 },
  streakValue: { fontSize: 30, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.8 },
  streakUnit: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  streakSecondary: { fontSize: 19, fontFamily: 'Inter_700Bold' },
  streakLabel: { fontSize: 11.5, fontFamily: 'Inter_500Medium', marginTop: 1 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  trackHint: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 7 },
  strip: { flexDirection: 'row', gap: 3 },
  legend: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 10.5, fontFamily: 'Inter_400Regular' },
  emptyNotes: { alignItems: 'center', paddingVertical: 22, gap: 5 },
  emptyNotesText: { fontSize: 13.5, fontFamily: 'Inter_500Medium', marginTop: 4 },
  emptyNotesHint: { fontSize: 11.5, fontFamily: 'Inter_400Regular', textAlign: 'center', maxWidth: 240 },
  note: { borderLeftWidth: 2, paddingLeft: 13 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDate: { fontSize: 12.5, fontFamily: 'Inter_700Bold' },
  noteMood: { fontSize: 11.5, fontFamily: 'Inter_400Regular' },
  noteBody: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginTop: 4 },
});
