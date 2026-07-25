import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

import { lightTheme, darkTheme, radii, spacing, typography } from '@habit-tracker/shared/theme';

/**
 * Theme for the native app.
 *
 * React Native has no CSS custom properties, so the same token values the web
 * gets from `tokens.css` are delivered here through context. Both read from
 * `shared/src/theme.js`, which is what stops the two platforms drifting into
 * "nearly the same" palette — the failure mode nobody notices until a client
 * puts the two side by side.
 *
 * Dark mode follows the OS by default and can be overridden in Settings, which
 * matches the web behaviour exactly (brief §05: a designed dark palette, not
 * an inversion).
 */

const STORAGE_KEY = 'habit-tracker-theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState('system');
  const [loaded, setLoaded] = useState(false);

  // Restore the saved preference before first paint where possible, so a dark
  // mode user doesn't get a white flash on launch.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setPreferenceState(stored);
      })
      .catch(() => {
        /* storage unavailable — fall back to following the system */
      })
      .finally(() => setLoaded(true));
  }, []);

  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkTheme : lightTheme;

  // Paints the window background too, so overscroll and the area behind the
  // navigation bar match rather than flashing white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setPreference(isDark ? 'light' : 'dark');
  }, [isDark, setPreference]);

  const value = useMemo(
    () => ({ colors, isDark, preference, setPreference, toggle, radii, spacing, typography, loaded }),
    [colors, isDark, preference, setPreference, toggle, loaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}

/**
 * Builds themed styles without re-running StyleSheet.create on every render.
 *
 * Usage: `const styles = useThemedStyles(makeStyles)` where makeStyles is a
 * module-level `(theme) => StyleSheet.create({...})`.
 */
export function useThemedStyles(factory) {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
