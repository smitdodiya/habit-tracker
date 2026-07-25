import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider.jsx';
import { ToastHost } from '../src/components/ui/Toast.jsx';
import { useAuthStore } from '../src/store/authStore.js';

// Held until fonts and the stored session are both resolved, so the first
// frame the user sees is the real app rather than an unstyled flash.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // A font that fails to load must not brick the app — the system face is a
  // perfectly acceptable fallback, and a blank screen is not.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppGate fontsReady={fontsReady} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Resolves the session, then routes accordingly.
 *
 * Redirecting is deliberately deferred until `status` leaves 'loading',
 * otherwise a cold start bounces a signed-in user to the login screen for a
 * frame before the stored token has been read from the Keychain.
 */
function AppGate({ fontsReady }) {
  const { colors, loaded: themeLoaded, isDark } = useTheme();
  const status = useAuthStore((s) => s.status);
  const initialise = useAuthStore((s) => s.initialise);
  const [initialised, setInitialised] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialise().finally(() => setInitialised(true));
  }, [initialise]);

  const ready = fontsReady && themeLoaded && initialised && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    const inApp = segments[0] === '(tabs)' || segments[0] === 'habit' || segments[0] === 'recap';
    const onAuthScreen = segments[0] === '(auth)' || segments[0] === 'onboarding' || segments.length === 0;

    if (status === 'authed' && onAuthScreen) {
      router.replace('/today');
    } else if (status === 'guest' && inApp) {
      router.replace('/onboarding');
    }
  }, [ready, status, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="habit/[id]" />
        <Stack.Screen name="recap" options={{ presentation: 'modal' }} />
      </Stack>
      <ToastHost />
    </>
  );
}
