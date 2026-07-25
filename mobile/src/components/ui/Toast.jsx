import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, WarningCircle, Info, X } from 'phosphor-react-native';
import { create } from 'zustand';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * Transient messages. Same store shape as the web's toastStore, so the calling
 * code in shared screens reads identically on both platforms.
 */

let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [],

  push: (message, { tone = 'info', duration = 3400 } = {}) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, tone }] });
    if (duration > 0) setTimeout(() => get().dismiss(id), duration);
    return id;
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (message, options) => useToastStore.getState().push(message, { ...options, tone: 'success' }),
  error: (message, options) => useToastStore.getState().push(message, { ...options, tone: 'error' }),
  info: (message, options) => useToastStore.getState().push(message, { ...options, tone: 'info' }),
};

/** Mounted once at the app root. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: insets.bottom + 78 }]}
      accessibilityLiveRegion="polite"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} toast={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast: item, onDismiss }) {
  const { colors } = useTheme();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [enter]);

  const tone = {
    success: { Icon: CheckCircle, color: colors.success, bg: colors.successSoft },
    error: { Icon: WarningCircle, color: colors.danger, bg: colors.dangerSoft },
    info: { Icon: Info, color: colors.accentStrong, bg: colors.accentSoft },
  }[item.tone] ?? { Icon: Info, color: colors.accentStrong, bg: colors.accentSoft };

  const { Icon } = tone;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
        <Icon size={15} color={tone.color} weight="fill" />
      </View>

      <Text style={[styles.message, { color: colors.text }]} numberOfLines={3}>
        {item.message}
      </Text>

      <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
        <X size={13} color={colors.textSubtle} weight="bold" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 8,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { flex: 1, fontSize: 13.5, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
