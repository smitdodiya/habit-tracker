import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sun, Moon, DeviceMobile, SignOut, Lock } from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { toast } from '../../src/components/ui/Toast.jsx';
import { errorMessage, fieldErrors } from '../../src/lib/api.js';
import { authApi } from '../../src/lib/endpoints.js';

import { Card, SectionTitle, ScreenHeader } from '../../src/components/ui/Card.jsx';
import { Button } from '../../src/components/ui/Button.jsx';
import { Input } from '../../src/components/ui/Input.jsx';
import { Toggle } from '../../src/components/ui/Toggle.jsx';
import { Sheet } from '../../src/components/ui/Sheet.jsx';

/** Profile / Settings (brief §04): account, theme, notification preferences. */
export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim() || name === user?.name) return;
    setSavingName(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success('Name updated');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save your name'));
    } finally {
      setSavingName(false);
    }
  };

  const handleTheme = async (value) => {
    // Applied locally first so the change is instant, then synced so it follows
    // the user to the web app.
    setPreference(value);
    try {
      await updateProfile({ theme: value });
    } catch {
      /* the local preference still holds; syncing is a nicety */
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
    >
      <ScreenHeader title="Settings" subtitle="Your account and preferences" />

      <Card>
        <SectionTitle>Account</SectionTitle>
        <View style={{ marginTop: 14, gap: 14 }}>
          <Input label="Name" value={name} onChangeText={setName} maxLength={80} />
          <Input label="Email" value={user?.email ?? ''} editable={false} hint="Email can't be changed here." />
          <Input
            label="Timezone"
            value={user?.timezone ?? 'UTC'}
            editable={false}
            hint="Check-ins and reminders follow this."
          />

          <View style={styles.actionRow}>
            <Button loading={savingName} onPress={handleSaveName} style={{ flex: 1 }} fullWidth>
              Save changes
            </Button>
            <Button variant="secondary" icon={Lock} onPress={() => setPasswordOpen(true)} style={{ flex: 1 }} fullWidth>
              Password
            </Button>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Light, dark, or follow your phone.
        </Text>

        <View style={styles.themeRow}>
          {[
            { value: 'light', label: 'Light', Icon: Sun },
            { value: 'dark', label: 'Dark', Icon: Moon },
            { value: 'system', label: 'System', Icon: DeviceMobile },
          ].map((option) => {
            const selected = preference === option.value;
            const { Icon } = option;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleTheme(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                style={[
                  styles.themeOption,
                  {
                    borderColor: selected ? colors.accentStrong : colors.border,
                    backgroundColor: selected ? colors.accentSoft : 'transparent',
                  },
                ]}
              >
                <Icon
                  size={21}
                  color={selected ? colors.accentStrong : colors.textMuted}
                  weight={selected ? 'fill' : 'regular'}
                />
                <Text
                  style={[styles.themeLabel, { color: selected ? colors.accentStrong : colors.textMuted }]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionTitle>Notifications</SectionTitle>
        <View style={{ marginTop: 14 }}>
          <Toggle
            checked={user?.notificationsEnabled ?? true}
            onChange={async (enabled) => {
              try {
                await updateProfile({ notificationsEnabled: enabled });
                toast.success(enabled ? 'Reminders resumed' : 'All reminders paused');
              } catch (error) {
                toast.error(errorMessage(error, 'Could not update that setting'));
              }
            }}
            label="Habit reminders"
            description="Pauses every reminder without changing your times."
          />
        </View>
      </Card>

      <Card>
        <SectionTitle>Session</SectionTitle>
        <View style={{ marginTop: 14 }}>
          <Button variant="dangerSoft" icon={SignOut} onPress={logout}>
            Sign out
          </Button>
        </View>
      </Card>

      <Text style={[styles.version, { color: colors.textSubtle }]}>
        Habit Tracker 1.0.0 · Asense Branding
      </Text>

      <ChangePasswordSheet open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </ScrollView>
  );
}

function ChangePasswordSheet({ open, onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setErrors({});
    setSaving(true);
    try {
      await authApi.changePassword(form);
      toast.success('Password changed');
      setForm({ currentPassword: '', newPassword: '' });
      onClose();
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(errorMessage(error, 'Could not change your password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Change password"
      footer={
        <>
          <Button variant="secondary" fullWidth style={{ flex: 1 }} onPress={onClose}>
            Cancel
          </Button>
          <Button fullWidth style={{ flex: 1 }} loading={saving} onPress={handleSubmit}>
            Update
          </Button>
        </>
      }
    >
      <Input
        label="Current password"
        value={form.currentPassword}
        onChangeText={(v) => setForm((f) => ({ ...f, currentPassword: v }))}
        error={errors.currentPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <Input
        label="New password"
        value={form.newPassword}
        onChangeText={(v) => setForm((f) => ({ ...f, newPassword: v }))}
        error={errors.newPassword}
        hint="8+ characters, with a letter and a number"
        secureTextEntry
        autoCapitalize="none"
        style={{ marginTop: 16 }}
      />
      <View style={{ height: 8 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  hint: { fontSize: 12.5, fontFamily: 'Inter_400Regular', marginTop: 5 },
  actionRow: { flexDirection: 'row', gap: 10 },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  themeOption: { flex: 1, alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 13, paddingVertical: 15 },
  themeLabel: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold' },
  version: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 6 },
});
