import { Pressable, View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * Switch control.
 *
 * Built from a Pressable rather than RN's Switch so the accent colour applies
 * identically on both platforms — the built-in Switch styles differently on
 * iOS and Android, which would break the shared design language.
 */
export function Toggle({ checked, onChange, label, description, disabled = false }) {
  const { colors } = useTheme();
  const offset = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(offset, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [checked, offset]);

  const handlePress = () => {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => {});
    onChange?.(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      style={[styles.row, { opacity: disabled ? 0.55 : 1 }]}
    >
      {(label || description) && (
        <View style={styles.text}>
          {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
          {description ? (
            <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.track,
          { backgroundColor: checked ? colors.accentStrong : colors.borderStrong },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX: offset.interpolate({ inputRange: [0, 1], outputRange: [2, 22] }) }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1 },
  label: { fontSize: 14.5, fontFamily: 'Inter_600SemiBold' },
  description: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 18 },
  track: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
