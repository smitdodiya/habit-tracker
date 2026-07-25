import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { percent, formatDate } from '@habit-tracker/shared/format';
import { startOfWeek, addDays, daysBetween, keyToDate } from '@habit-tracker/shared/dates';

/**
 * Charts for the Progress Dashboard.
 *
 * Hand-built rather than pulled from a charting library. Recharts is DOM-only,
 * and the alternatives for React Native are heavy for what amounts to a grid of
 * squares, seven bars and one arc. Building them here also means the colours
 * come from the design tokens, so they recolour correctly in dark mode.
 */

const CELL = 13;
const GAP = 3;

/** Maps a day's completion rate to one of six ramp steps. */
function heatLevel(day) {
  if (!day || day.scheduled === 0 || day.completed === 0) return 0;
  const { rate } = day;
  if (rate >= 1) return 5;
  if (rate >= 0.75) return 4;
  if (rate >= 0.5) return 3;
  if (rate >= 0.25) return 2;
  return 1;
}

/** Contribution-style calendar (brief §04). Scrolls horizontally on a phone. */
export function HeatmapCalendar({ data = [], todayKey }) {
  const { colors } = useTheme();

  const { weeks, monthLabels } = useMemo(() => {
    if (data.length === 0) return { weeks: [], monthLabels: [] };

    const byDate = new Map(data.map((d) => [d.date, d]));
    const first = data[0].date;
    const last = data[data.length - 1].date;

    // Pad to whole weeks so every column has seven rows.
    const gridStart = startOfWeek(first);
    const weekCount = Math.ceil((daysBetween(gridStart, last) + 1) / 7);

    const built = [];
    const labels = [];
    let lastMonth = null;

    for (let w = 0; w < weekCount; w += 1) {
      const days = [];
      for (let d = 0; d < 7; d += 1) {
        const date = addDays(gridStart, w * 7 + d);
        const inRange = daysBetween(first, date) >= 0 && daysBetween(date, last) <= 0;
        days.push(inRange ? (byDate.get(date) ?? { date, completed: 0, scheduled: 0, rate: 0 }) : null);
      }
      built.push(days);

      const firstReal = days.find(Boolean);
      if (firstReal) {
        const month = keyToDate(firstReal.date).getUTCMonth();
        if (month !== lastMonth) {
          labels.push({
            column: w,
            label: keyToDate(firstReal.date).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
          });
          lastMonth = month;
        }
      }
    }

    return { weeks: built, monthLabels: labels };
  }, [data]);

  // The six-step ramp is defined once in the shared theme, so the web heatmap
  // and this one are literally the same colours.
  const ramp = colors.heat;

  if (weeks.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>No activity to show yet.</Text>
    );
  }

  const rowLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ paddingTop: 18, gap: GAP }}>
            {rowLabels.map((label, i) => (
              <View key={i} style={{ height: CELL, justifyContent: 'center', width: 24 }}>
                <Text style={[styles.axis, { color: colors.textSubtle }]}>{label}</Text>
              </View>
            ))}
          </View>

          <View>
            <View style={{ height: 14, marginBottom: 4 }}>
              {monthLabels.map(({ column, label }) => (
                <Text
                  key={`${column}-${label}`}
                  style={[
                    styles.axis,
                    { color: colors.textMuted, position: 'absolute', left: column * (CELL + GAP) },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: GAP }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ gap: GAP }}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={{ width: CELL, height: CELL }} />;
                    const isToday = day.date === todayKey;
                    return (
                      <View
                        key={di}
                        accessibilityLabel={
                          day.scheduled === 0
                            ? `${formatDate(day.date)}: nothing scheduled`
                            : `${formatDate(day.date)}: ${day.completed} of ${day.scheduled} completed`
                        }
                        style={{
                          width: CELL,
                          height: CELL,
                          borderRadius: 3,
                          backgroundColor: ramp[heatLevel(day)],
                          borderWidth: isToday ? 1.5 : 0,
                          borderColor: colors.text,
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={[styles.axis, { color: colors.textSubtle }]}>Less</Text>
        {ramp.map((color, i) => (
          <View key={i} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: color }} />
        ))}
        <Text style={[styles.axis, { color: colors.textSubtle }]}>More</Text>
      </View>
    </View>
  );
}

/** Weekly completion bars. */
export function WeeklyBars({ data = [] }) {
  const { colors } = useTheme();
  if (data.length === 0) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>Not enough data yet.</Text>;
  }

  const peak = Math.max(1, ...data.map((w) => w.completed));

  return (
    <View style={styles.bars}>
      {data.map((week, index) => {
        const isCurrent = index === data.length - 1;
        return (
          <View key={week.weekStart} style={styles.barColumn}>
            <Text style={[styles.barValue, { color: colors.textMuted }]}>{week.completed}</Text>
            <View
              accessibilityLabel={`Week of ${week.label}: ${week.completed} of ${week.scheduled} completed`}
              style={{
                width: '100%',
                height: Math.max(4, (week.completed / peak) * 110),
                borderRadius: 6,
                // The current week is still running, so it's outlined rather
                // than filled — comparing it like-for-like would mislead.
                backgroundColor: isCurrent ? colors.accentSoft : colors.accent,
                borderWidth: isCurrent ? 1.5 : 0,
                borderColor: colors.accent,
              }}
            />
            <Text style={[styles.barLabel, { color: colors.textSubtle }]} numberOfLines={1}>
              {week.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Circular completion gauge — one arc, drawn directly. */
export function CompletionRing({ value = 0, size = 120, strokeWidth = 11 }) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surface3} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          fill="none"
        />
      </Svg>

      <Text style={[styles.ringValue, { color: colors.text }]}>{percent(clamped)}</Text>
      <Text style={[styles.ringLabel, { color: colors.textMuted }]}>COMPLETE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 28 },
  axis: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 150, marginTop: 12 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barValue: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  barLabel: { fontSize: 9.5, fontFamily: 'Inter_400Regular' },
  ringValue: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  ringLabel: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
});
