import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Snowflake, X } from 'phosphor-react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { formatDate } from '@habit-tracker/shared/format';

/**
 * "A freeze saved your streak" card.
 *
 * This is the emotional payoff of the whole freeze mechanic: the user opens the
 * app expecting to have lost a long run, and instead finds out it was covered.
 * Shown once — the server marks the notice seen when it hands it over.
 */
export function FreezeNotice({ notices, freezes, onDismiss }) {
  const { colors } = useTheme();

  if (!notices?.length) return null;

  const [latest] = notices;
  const remaining = freezes?.available ?? 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Snowflake size={19} color={colors.accentStrong} weight="fill" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          {notices.length > 1 ? `${notices.length} freezes were used` : 'A freeze was used'}
        </Text>

        <Text style={[styles.body, { color: colors.textMuted }]}>
          {notices.length > 1
            ? `Your streaks survived ${notices.length} missed days.`
            : `You missed ${formatDate(latest.date)} — your streaks are safe.`}
        </Text>

        <Text style={[styles.meta, { color: colors.textSubtle }]}>
          {remaining} freeze{remaining === 1 ? '' : 's'} left
          {freezes?.daysToNext ? ` · next in ${freezes.daysToNext} day${freezes.daysToNext === 1 ? '' : 's'}` : ''}
        </Text>
      </View>

      <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
        <X size={15} color={colors.textMuted} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  body: { fontSize: 12.5, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 17 },
  meta: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 5 },
});
