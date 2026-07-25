import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider.jsx';

/** The standard surface: bordered, rounded, subtly raised. */
export function Card({ children, style, padded = true, tint }) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tint ?? colors.surface,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
          // Android uses elevation; iOS uses the shadow properties. Dark mode
          // gets a heavier shadow because a soft one is invisible on near-black.
          shadowOpacity: isDark ? 0.4 : 0.06,
          elevation: isDark ? 3 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Small uppercase heading used at the top of most cards. */
export function SectionTitle({ children, style }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.textMuted }, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Screen-level heading plus optional subtitle. */
export function ScreenHeader({ title, subtitle, right }) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13.5,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
