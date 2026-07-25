import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * The app's button.
 *
 * The accent variants use `accentStrong`, not the raw brand accent: white text
 * on #E94560 measures 3.85:1, under the 4.5:1 AA threshold, while the slightly
 * deeper shade reaches 5.07:1 and reads as the same colour (brief §05).
 *
 * Every press fires a light haptic. On a phone that is an OS convention rather
 * than an embellishment — it is what makes a tap feel acknowledged before the
 * network has answered.
 */

const SIZES = {
  sm: { height: 38, paddingHorizontal: 14, fontSize: 13, radius: 10, gap: 6 },
  md: { height: 46, paddingHorizontal: 18, fontSize: 14.5, radius: 12, gap: 8 },
  lg: { height: 54, paddingHorizontal: 22, fontSize: 15.5, radius: 14, gap: 8 },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  haptic = true,
  style,
}) {
  const { colors } = useTheme();
  const dims = SIZES[size] ?? SIZES.md;
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: colors.accentStrong, fg: '#FFFFFF', border: 'transparent' },
    navy: { bg: colors.navy, fg: colors.textInverse, border: 'transparent' },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: 'transparent' },
    dangerSoft: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
  }[variant] ?? { bg: colors.accentStrong, fg: '#FFFFFF', border: 'transparent' };

  const handlePress = (event) => {
    if (isDisabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingHorizontal,
          borderRadius: dims.radius,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={[styles.content, { gap: dims.gap }]}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.fg} />
        ) : (
          Icon && <Icon size={dims.fontSize + 3} color={palette.fg} weight="bold" />
        )}
        <Text
          style={{
            color: palette.fg,
            fontSize: dims.fontSize,
            fontFamily: 'Inter_600SemiBold',
          }}
          numberOfLines={1}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
