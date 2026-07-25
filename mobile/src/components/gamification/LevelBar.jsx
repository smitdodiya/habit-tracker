import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Lightning, Snowflake, CaretRight } from 'phosphor-react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { Card } from '../ui/Card.jsx';

/**
 * Level, XP and freeze balance.
 *
 * Both numbers are derived server-side from the user's actual history rather
 * than accumulated in a counter, so a retried check-in can never inflate them.
 */
/**
 * @param linkToRewards  false on the rewards screen itself, where a "View
 *                       rewards" link would point at the page you are already
 *                       on. The card then renders as plain content, not a
 *                       button, so it doesn't invite a tap that does nothing.
 */
export function LevelBar({ progress, linkToRewards = true }) {
  const { colors } = useTheme();
  const router = useRouter();
  const width = useRef(new Animated.Value(0)).current;

  const fraction = progress?.progress ?? 0;

  useEffect(() => {
    Animated.timing(width, {
      toValue: fraction,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [fraction, width]);

  if (!progress) return null;

  const toNext = Math.max(0, (progress.nextLevelXp ?? 0) - (progress.xp ?? 0));

  const Wrapper = linkToRewards ? Pressable : View;
  const wrapperProps = linkToRewards
    ? { onPress: () => router.push('/achievements'), accessibilityRole: 'button' }
    : {};

  return (
    <Wrapper {...wrapperProps}>
      <Card>
        <View style={styles.topRow}>
          <View style={[styles.levelChip, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.levelNumber, { color: colors.accentStrong }]}>{progress.level}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.level, { color: colors.text }]}>Level {progress.level}</Text>
              <Text style={[styles.title, { color: colors.textMuted }]}>{progress.title}</Text>
            </View>

            <View style={styles.xpRow}>
              <Lightning size={12} color={colors.accentStrong} weight="fill" />
              <Text style={[styles.xp, { color: colors.textMuted }]}>
                {progress.xp.toLocaleString()} XP
              </Text>
            </View>
          </View>

          <FreezePips freezes={progress.freezes} />
        </View>

        <View style={[styles.track, { backgroundColor: colors.surface3 }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: colors.accent,
                width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {toNext} XP to level {progress.level + 1}
          </Text>

          {linkToRewards ? (
            <View style={styles.viewRow}>
              <Text style={[styles.view, { color: colors.accentStrong }]}>View rewards</Text>
              <CaretRight size={11} color={colors.accentStrong} weight="bold" />
            </View>
          ) : null}
        </View>
      </Card>
    </Wrapper>
  );
}

/** Freeze balance as pips — instantly readable, no counting required. */
function FreezePips({ freezes }) {
  const { colors } = useTheme();
  if (!freezes) return null;

  return (
    <View
      style={[styles.freezes, { backgroundColor: colors.surface3 }]}
      accessibilityLabel={`${freezes.available} of ${freezes.max} streak freezes available`}
    >
      <Snowflake size={12} color={colors.accentStrong} weight="fill" />
      <View style={styles.pips}>
        {Array.from({ length: freezes.max }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              { backgroundColor: i < freezes.available ? colors.accentStrong : colors.borderStrong },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  levelNumber: { fontSize: 15, fontFamily: 'Inter_800ExtraBold' },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  level: { fontSize: 14.5, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 12.5, fontFamily: 'Inter_500Medium' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  xp: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  freezes: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 5, height: 5, borderRadius: 2.5 },
  track: { height: 7, borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  hint: { fontSize: 11.5, fontFamily: 'Inter_400Regular' },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  view: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold' },
});
