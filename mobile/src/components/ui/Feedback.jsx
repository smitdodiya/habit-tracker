import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { Card } from './Card.jsx';

/**
 * Loading placeholders and empty states.
 *
 * Skeletons mirror the footprint of what replaces them so the screen doesn't
 * jump when data lands, and they're hidden from screen readers — "loading" is
 * announced once by the container rather than by every shimmering rectangle.
 */

export function Skeleton({ width, height, radius = 12, style }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface3, opacity: pulse }, style]}
    />
  );
}

/** Matches the footprint of a HabitCard. */
export function HabitCardSkeleton() {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <Skeleton width={44} height={44} radius={14} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="55%" height={13} radius={6} />
        <Skeleton width="35%" height={11} radius={6} />
      </View>
      <Skeleton width={44} height={44} radius={22} />
    </Card>
  );
}

export function ListSkeleton({ count = 4 }) {
  return (
    <View style={{ gap: 10 }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <HabitCardSkeleton key={i} />
      ))}
    </View>
  );
}

/**
 * Empty state. Always pairs the explanation with a way forward — a blank
 * screen should say what to do, not just what is missing.
 */
export function EmptyState({ illustration: Illustration, title, description, action, style }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.empty, style]}>
      {Illustration ? <Illustration /> : null}
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>{description}</Text>
      ) : null}
      {action ? <View style={{ marginTop: 22 }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },
});
