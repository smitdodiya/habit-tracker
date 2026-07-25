import { Modal, View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/ThemeProvider.jsx';

/**
 * Bottom sheet — the native equivalent of the web's Modal.
 *
 * A sheet rather than a centred dialog because it is far easier to reach
 * one-handed, which is how a habit app is actually used. Uses React Native's
 * Modal so it gets the platform's own back-button and dismissal behaviour
 * rather than a reimplementation of it.
 */
export function Sheet({ open, onClose, title, description, children, footer, fullHeight = false }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      // Android's hardware back button closes the sheet, as users expect.
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              maxHeight: fullHeight ? '94%' : '86%',
              paddingBottom: insets.bottom + 12,
              borderColor: colors.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />

          {(title || onClose) && (
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {title ? (
                  <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
                    {title}
                  </Text>
                ) : null}
                {description ? (
                  <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
              >
                <X size={18} color={colors.textMuted} weight="bold" />
              </Pressable>
            </View>
          )}

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,20,0.55)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  description: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeButton: { padding: 4 },
  body: { paddingHorizontal: 20 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
