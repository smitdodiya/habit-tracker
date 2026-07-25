import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Envelope, Lock, User } from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { Button } from '../../src/components/ui/Button.jsx';
import { Input } from '../../src/components/ui/Input.jsx';
import { BrandMark } from '../../src/components/illustrations/Illustrations.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { errorMessage, fieldErrors } from '../../src/lib/api.js';

/** Create account (brief §04). */
export default function SignupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      await signup(form);
      router.replace('/today');
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error, 'Could not create your account'));
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
            Start your first streak
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Free, and takes about twenty seconds
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {formError ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{formError}</Text>
            </View>
          ) : null}

          <Input
            label="Name"
            icon={User}
            placeholder="What should we call you?"
            value={form.name}
            onChangeText={set('name')}
            error={errors.name}
            autoComplete="name"
            textContentType="name"
          />

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
            style={{ marginTop: 16 }}
          />

          <Input
            label="Password"
            icon={Lock}
            placeholder="At least 8 characters"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            hint="Needs 8+ characters, including a letter and a number"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            style={{ marginTop: 16 }}
          />

          <Button size="lg" fullWidth loading={loading} onPress={handleSubmit} style={{ marginTop: 22 }}>
            Create account
          </Button>
        </View>

        <Pressable onPress={() => router.push('/login')} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.footer, { color: colors.textMuted }]}>
            Already have an account? <Text style={{ color: colors.accentStrong }}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 25, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.6, marginTop: 18, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 5 },
  card: { borderRadius: 16, borderWidth: 1, padding: 22 },
  error: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  errorText: { fontSize: 13.5, fontFamily: 'Inter_500Medium' },
  footer: { fontSize: 13.5, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 22 },
});
