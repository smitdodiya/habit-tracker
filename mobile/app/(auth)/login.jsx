import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Envelope, Lock } from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { Button } from '../../src/components/ui/Button.jsx';
import { Input } from '../../src/components/ui/Input.jsx';
import { BrandMark } from '../../src/components/illustrations/Illustrations.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { errorMessage, fieldErrors } from '../../src/lib/api.js';

/** Sign in (brief §04). Email and password only, as agreed. */
export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      await login(form);
      router.replace('/today');
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error, 'Could not sign you in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BrandMark size={46} />
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Welcome back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sign in to pick up your streaks
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {formError ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
            </View>
          ) : null}

          <Input
            label="Email"
            icon={Envelope}
            placeholder="you@example.com"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Input
            label="Password"
            icon={Lock}
            placeholder="Your password"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            style={{ marginTop: 16 }}
          />

          <Button size="lg" fullWidth loading={loading} onPress={handleSubmit} style={{ marginTop: 22 }}>
            Sign in
          </Button>

          {/* Demo credentials — remove before a production release. */}
          <View style={[styles.demo, { borderColor: colors.borderStrong }]}>
            <Text style={[styles.demoLabel, { color: colors.textSubtle }]}>DEMO ACCOUNT</Text>
            <Text style={[styles.demoText, { color: colors.textMuted }]}>
              demo@asensebranding.com · Password123
            </Text>
            <Pressable
              onPress={() => setForm({ email: 'demo@asensebranding.com', password: 'Password123' })}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[styles.demoAction, { color: colors.accentStrong }]}>
                Fill in demo credentials
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => router.push('/signup')} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.footer, { color: colors.textMuted }]}>
            New here? <Text style={{ color: colors.accentStrong }}>Create an account</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 25, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.6, marginTop: 18 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 5 },
  card: { borderRadius: 16, borderWidth: 1, padding: 22 },
  error: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  errorText: { fontSize: 13.5, fontFamily: 'Inter_500Medium' },
  demo: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 11, padding: 13, marginTop: 20 },
  demoLabel: { fontSize: 10.5, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  demoText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  demoAction: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 6 },
  footer: { fontSize: 13.5, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 22 },
});
