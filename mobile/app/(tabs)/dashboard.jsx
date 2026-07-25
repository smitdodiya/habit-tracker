import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fire, Trophy, CheckSquare, Target } from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { statsApi } from '../../src/lib/endpoints.js';
import { errorMessage } from '../../src/lib/api.js';
import { toast } from '../../src/components/ui/Toast.jsx';

import { Card, SectionTitle, ScreenHeader } from '../../src/components/ui/Card.jsx';
import { EmptyState, Skeleton } from '../../src/components/ui/Feedback.jsx';
import { HeatmapCalendar, WeeklyBars, CompletionRing } from '../../src/components/charts/Charts.jsx';
import { EmptyHabitsIllustration } from '../../src/components/illustrations/Illustrations.jsx';
import { categoryLabel, percent, WEEKDAY_LABELS } from '@habit-tracker/shared/format';

/** Progress Dashboard (brief §04): heatmap, weekly chart, completion summary. */

const RANGES = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '365d', label: 'Year' },
];

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (selected) => {
      try {
        const [dashboard, insightData] = await Promise.all([
          statsApi.dashboard(selected),
          statsApi.insights().catch(() => null),
        ]);
        setData(dashboard);
        setInsights(insightData);
      } catch (error) {
        toast.error(errorMessage(error, 'Could not load your progress'));
      }
    },
    [],
  );

  useEffect(() => {
    setLoading(true);
    load(range).finally(() => setLoading(false));
  }, [range, load]);

  const summary = data?.summary;
  const hasHabits = (summary?.totalHabits ?? 0) > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load(range);
            setRefreshing(false);
          }}
          tintColor={colors.accent}
        />
      }
    >
      <ScreenHeader title="Progress" subtitle="How consistently you show up" />

      <View style={[styles.ranges, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {RANGES.map((option) => {
          const selected = range === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setRange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.range, selected && { backgroundColor: colors.accentSoft }]}
            >
              <Text
                style={[styles.rangeText, { color: selected ? colors.accentStrong : colors.textMuted }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && !data ? (
        <View style={{ gap: 14 }}>
          <Skeleton height={80} />
          <Skeleton height={180} />
          <Skeleton height={200} />
        </View>
      ) : !hasHabits ? (
        <EmptyState
          illustration={EmptyHabitsIllustration}
          title="Nothing to chart yet"
          description="Add a habit and check in a few times to see your progress."
        />
      ) : (
        <>
          <View style={styles.statGrid}>
            <StatCard Icon={Fire} label="Best streak" value={summary.currentBestStreak} hint={`${summary.activeStreaks} active`} />
            <StatCard Icon={Trophy} label="Longest ever" value={summary.longestStreak} hint="Personal best" />
            <StatCard Icon={CheckSquare} label="Check-ins" value={summary.checkInsInRange} hint={`Last ${range}`} />
            <StatCard Icon={Target} label="Completion" value={percent(summary.completionRate)} hint={`${summary.doneToday}/${summary.dueToday} today`} />
          </View>

          <Card>
            <SectionTitle>Activity</SectionTitle>
            <Text style={[styles.caption, { color: colors.textMuted }]}>
              Darker = more done that day
            </Text>
            <HeatmapCalendar data={data.heatmap} todayKey={data.range.today} />
          </Card>

          <Card>
            <SectionTitle>Check-ins per week</SectionTitle>
            <WeeklyBars data={data.weekly} />
            <Text style={[styles.caption, { color: colors.textSubtle, marginTop: 8 }]}>
              Outlined bar = this week, still going.
            </Text>
          </Card>

          <Card style={{ alignItems: 'center' }}>
            <SectionTitle style={{ alignSelf: 'flex-start' }}>Overall</SectionTitle>
            <View style={{ marginTop: 16 }}>
              <CompletionRing value={summary.completionRate} size={132} />
            </View>
            <Text style={[styles.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 14 }]}>
              {summary.checkInsInRange} check-ins across {summary.totalHabits} habit
              {summary.totalHabits === 1 ? '' : 's'}
            </Text>
          </Card>

          {insights?.hasData ? (
            <Card>
              <SectionTitle>Insights</SectionTitle>
              <View style={{ marginTop: 12, gap: 11 }}>
                {insights.bestWeekday != null ? (
                  <InsightRow
                    label="Strongest day"
                    value={WEEKDAY_LABELS[insights.bestWeekday.day]}
                    detail={percent(insights.bestWeekday.rate)}
                  />
                ) : null}
                {insights.worstWeekday != null ? (
                  <InsightRow
                    label="Toughest day"
                    value={WEEKDAY_LABELS[insights.worstWeekday.day]}
                    detail={percent(insights.worstWeekday.rate)}
                  />
                ) : null}
                {insights.peakTime ? (
                  <InsightRow label="Peak time" value={insights.peakTime.label} detail={percent(insights.peakTime.share)} />
                ) : null}
                {insights.bestHabit ? (
                  <InsightRow label="Most consistent" value={insights.bestHabit.name} detail={percent(insights.bestHabit.rate)} />
                ) : null}
              </View>
            </Card>
          ) : null}

          {data.categories?.length ? (
            <Card>
              <SectionTitle>By category</SectionTitle>
              <View style={{ marginTop: 14, gap: 13 }}>
                {data.categories.map((entry) => (
                  <View key={entry.category}>
                    <View style={styles.categoryTop}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>
                        {categoryLabel(entry.category)}
                      </Text>
                      <Text style={[styles.categoryRate, { color: colors.textMuted }]}>
                        {percent(entry.rate)}
                      </Text>
                    </View>
                    <View style={[styles.bar, { backgroundColor: colors.surface3 }]}>
                      <View
                        style={{
                          height: '100%',
                          borderRadius: 4,
                          backgroundColor: colors.accent,
                          width: `${Math.min(1, entry.rate) * 100}%`,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ Icon, label, value, hint }) {
  const { colors } = useTheme();
  return (
    <Card style={{ width: '48%' }}>
      <View style={styles.statTop}>
        <Icon size={13} color={colors.textMuted} weight="fill" />
        <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      {hint ? (
        <Text style={[styles.statHint, { color: colors.textSubtle }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

function InsightRow({ label, value, detail }) {
  const { colors } = useTheme();
  return (
    <View style={styles.insightRow}>
      <Text style={[styles.insightLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.insightRight}>
        <Text style={[styles.insightValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.insightDetail, { color: colors.accentStrong }]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  ranges: { flexDirection: 'row', gap: 4, borderRadius: 12, borderWidth: 1, padding: 4 },
  range: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  rangeText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: '4%', rowGap: 12 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: 10.5, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 23, fontFamily: 'Inter_800ExtraBold', marginTop: 5, letterSpacing: -0.5 },
  statHint: { fontSize: 10.5, fontFamily: 'Inter_400Regular', marginTop: 1 },
  caption: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 5, marginBottom: 12 },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  categoryName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  categoryRate: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  insightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  insightLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  insightRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  insightValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },
  insightDetail: { fontSize: 12, fontFamily: 'Inter_700Bold' },
});
