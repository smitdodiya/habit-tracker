import { useEffect, useMemo, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Animated, Easing, Dimensions, AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Trophy } from 'phosphor-react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Check-in and milestone celebrations (brief §05).
 *
 * Confetti is hand-rolled with Animated rather than pulled from a library:
 * canvas-confetti is DOM-only, and a native confetti dependency for one effect
 * is hard to justify when forty animated views do the job — and stay on the
 * native driver, so they never stutter against JS work.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/**
 * Deliberately restrained. A full-screen shower of confetti on every single
 * check-in is exhausting by the third habit of the morning — the reward should
 * register and get out of the way. A dozen small pieces, drifting down over the
 * top third of the screen, reads as a flourish rather than a party.
 */
const PIECE_COUNT = 14;

/** Fires the platform's success haptic — the native equivalent of a sound. */
export function celebrateHaptic(strong = false) {
  if (strong) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

/**
 * A burst of falling confetti. Mounted only while `visible`, so the pieces are
 * torn down rather than animating invisibly forever.
 */
export function ConfettiBurst({ visible, color = '#E94560', onDone }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => {
        // Spread across the middle 70% of the width rather than edge to edge,
        // so the burst feels centred on the action instead of scattered.
        const spread = SCREEN_W * 0.7;
        return {
          key: i,
          x: SCREEN_W * 0.15 + (i / (PIECE_COUNT - 1)) * spread + (((i * 37) % 24) - 12),
          size: 5 + ((i * 13) % 4),
          rotate: (i * 47) % 360,
          drift: ((i * 29) % 44) - 22,
          fall: SCREEN_H * (0.26 + ((i * 17) % 10) / 100),
          // Two tones only — the habit's own colour plus a warm highlight.
          // Four competing colours looked like a birthday card.
          color: i % 3 === 0 ? '#F2C94C' : color,
        };
      }),
    [color],
  );

  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotion.current = enabled;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    // Respect the OS "reduce motion" setting — the streak number still updates,
    // so no information is carried only by the animation.
    if (reduceMotion.current) {
      onDone?.();
      return undefined;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && onDone?.());

    // Unmount on interrupt too, so a rapid second check-in restarts the burst
    // cleanly instead of leaving orphaned pieces mid-fall.
    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [visible, progress, onDone]);

  if (!visible) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((piece) => (
        <Animated.View
          key={piece.key}
          style={{
            position: 'absolute',
            left: piece.x,
            // Starts just above the fold rather than off-screen, so the pieces
            // are visible for the whole (short) animation.
            top: SCREEN_H * 0.16,
            width: piece.size,
            height: piece.size,
            borderRadius: piece.size / 2,
            backgroundColor: piece.color,
            opacity: progress.interpolate({
              inputRange: [0, 0.15, 0.7, 1],
              outputRange: [0, 0.9, 0.7, 0],
            }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, piece.fall],
                }),
              },
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, piece.drift],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0.4, 1, 0.85],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

const MILESTONE_COPY = {
  7: { title: 'One week strong', line: 'Seven days in a row. This is where it starts to stick.' },
  30: { title: 'A full month', line: 'Thirty days. What was effort is becoming routine.' },
  100: { title: 'One hundred days', line: 'A hundred days of showing up. Genuinely remarkable.' },
  365: { title: 'A whole year', line: 'Three hundred and sixty-five days. Extraordinary.' },
  4: { title: 'Four weeks running', line: 'A month of hitting your weekly target.' },
  12: { title: 'Twelve weeks', line: 'A full quarter of consistency.' },
  26: { title: 'Half a year', line: 'Twenty-six weeks on target.' },
  52: { title: 'Fifty-two weeks', line: 'A year of weekly wins.' },
};

/** Shown when a check-in lands exactly on a milestone. */
export function MilestoneDialog({ milestone, habit, onClose, onShare }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!milestone) return;
    celebrateHaptic(true);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [milestone, scale]);

  if (!milestone) return null;

  const unit = habit?.stats?.unit ?? 'day';
  const copy = MILESTONE_COPY[milestone] ?? {
    title: `${milestone} ${unit}s in a row`,
    line: 'Keep the run going.',
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.milestoneRoot}>
        <ConfettiBurst visible color={habit?.color} />

        <Animated.View
          style={[
            styles.milestoneCard,
            { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale }] },
          ]}
        >
          <View
            style={[styles.trophyWrap, { backgroundColor: `${habit?.color ?? colors.accent}22` }]}
          >
            <Trophy size={30} color={habit?.color ?? colors.accent} weight="fill" />
          </View>

          <Text style={[styles.milestoneNumber, { color: colors.text }]}>{milestone}</Text>
          <Text style={[styles.milestoneUnit, { color: colors.accentStrong }]}>
            {unit === 'week' ? 'WEEK STREAK' : 'DAY STREAK'}
          </Text>

          <Text style={[styles.milestoneTitle, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.milestoneLine, { color: colors.textMuted }]}>{copy.line}</Text>

          {habit?.name ? (
            <Text style={[styles.milestoneHabit, { color: colors.textSubtle }]} numberOfLines={1}>
              {habit.name}
            </Text>
          ) : null}

          <View style={styles.milestoneActions}>
            {onShare ? (
              <Button variant="secondary" fullWidth onPress={onShare} style={{ flex: 1 }}>
                Share
              </Button>
            ) : null}
            <Button fullWidth onPress={onClose} style={{ flex: 1 }}>
              Keep going
            </Button>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  milestoneRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,20,0.6)',
    paddingHorizontal: 32,
  },
  milestoneCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 22,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
  },
  trophyWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  milestoneNumber: { fontSize: 40, fontFamily: 'Inter_800ExtraBold', letterSpacing: -1, marginTop: 14 },
  milestoneUnit: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.4 },
  milestoneTitle: { fontSize: 16.5, fontFamily: 'Inter_700Bold', marginTop: 12, textAlign: 'center' },
  milestoneLine: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  milestoneHabit: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 12 },
  milestoneActions: { flexDirection: 'row', gap: 10, marginTop: 20, alignSelf: 'stretch' },
});
