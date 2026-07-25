import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'phosphor-react-native';

import { useTheme } from '../src/theme/ThemeProvider.jsx';
import { Button } from '../src/components/ui/Button.jsx';
import {
  BrandMark,
  OnboardingBuildIllustration,
  OnboardingStreakIllustration,
  OnboardingReminderIllustration,
} from '../src/components/illustrations/Illustrations.jsx';

/**
 * Splash + 3-step feature overview (brief §04, §03 feature 12).
 *
 * Shown before sign-up so the value is clear before anyone is asked for an
 * email, and skippable at every step — an onboarding you can't leave is a wall,
 * not a welcome.
 */

const STEPS = [
  {
    Illustration: OnboardingBuildIllustration,
    title: 'Build the routine',
    body: 'Add the habits that matter to you — daily, certain days, or a few times a week. Check them off with a single tap.',
  },
  {
    Illustration: OnboardingStreakIllustration,
    title: 'Watch the streak grow',
    body: 'Every day you show up extends your streak. Hit 7, 30 and 100 days and the app will make a fuss about it.',
  },
  {
    Illustration: OnboardingReminderIllustration,
    title: 'Never lose the thread',
    body: 'Set a reminder for each habit and get a nudge at the right moment — even when the app is closed.',
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const { Illustration } = current;
  const isLast = step === STEPS.length - 1;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <BrandMark size={28} />
          <Text style={[styles.brandName, { color: colors.text }]}>Habit Tracker</Text>
        </View>

        <Pressable onPress={() => router.push('/signup')} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.skip, { color: colors.textMuted }]}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Illustration />
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          {current.title}
        </Text>
        <Text style={[styles.text, { color: colors.textMuted }]}>{current.body}</Text>
      </View>

      <View style={styles.footer}>
        {/* Dots double as navigation. */}
        <View style={styles.dots}>
          {STEPS.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => setStep(index)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Step ${index + 1}: ${item.title}`}
              accessibilityState={{ selected: index === step }}
            >
              <View
                style={{
                  height: 6,
                  width: index === step ? 26 : 6,
                  borderRadius: 3,
                  backgroundColor: index === step ? colors.accentStrong : colors.borderStrong,
                }}
              />
            </Pressable>
          ))}
        </View>

        <Button
          size="lg"
          fullWidth
          icon={ArrowRight}
          onPress={() => (isLast ? router.push('/signup') : setStep(step + 1))}
        >
          {isLast ? 'Get started' : 'Next'}
        </Button>

        <Pressable onPress={() => router.push('/login')} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.signIn, { color: colors.textMuted }]}>
            Already have an account? <Text style={{ color: colors.accentStrong }}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandName: { fontSize: 14.5, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.3 },
  skip: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 25,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.6,
    marginTop: 34,
    textAlign: 'center',
  },
  text: {
    fontSize: 14.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  footer: { gap: 20 },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  signIn: { fontSize: 13.5, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
