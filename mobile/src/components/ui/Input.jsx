import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Eye, EyeSlash, WarningCircle } from 'phosphor-react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * Labelled text field with inline validation.
 *
 * The error is wired to the field with accessibility props so a screen reader
 * announces the problem rather than just the label.
 */
export function Input({
  label,
  error,
  hint,
  icon: Icon,
  secureTextEntry,
  style,
  multiline,
  ...props
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const borderColor = error ? colors.danger : focused ? colors.accentStrong : colors.borderStrong;

  return (
    <View style={style}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]} accessibilityRole="text">
          {label}
        </Text>
      )}

      <View
        style={[
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            alignItems: multiline ? 'flex-start' : 'center',
            minHeight: multiline ? 96 : 48,
          },
        ]}
      >
        {Icon && <Icon size={18} color={colors.textSubtle} style={{ marginTop: multiline ? 2 : 0 }} />}

        <TextInput
          {...props}
          multiline={multiline}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          style={[
            styles.input,
            {
              color: colors.text,
              textAlignVertical: multiline ? 'top' : 'center',
              height: multiline ? undefined : '100%',
            },
          ]}
        />

        {isPassword && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            {revealed ? (
              <EyeSlash size={18} color={colors.textSubtle} />
            ) : (
              <Eye size={18} color={colors.textSubtle} />
            )}
          </Pressable>
        )}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <WarningCircle size={13} color={colors.danger} weight="fill" />
          <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.message, { color: colors.textMuted, marginTop: 6 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  message: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
});
