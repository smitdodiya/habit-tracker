import { create } from 'zustand';

const STORAGE_KEY = 'habit-tracker-theme';

/** Reads the stored preference, falling back to following the OS. */
function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Adds or removes the `dark` class that all the token overrides hang off. */
function applyTheme(preference) {
  const dark = preference === 'dark' || (preference === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);

  // Keeps the mobile browser chrome in step with the app background.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0F0F1A' : '#F5F5F7');

  return dark;
}

/**
 * Theme preference: 'light' | 'dark' | 'system'.
 *
 * Persisted to localStorage so it applies before React mounts (see the inline
 * script in index.html), and mirrored to the user's profile so it follows them
 * to another device.
 */
export const useThemeStore = create((set, get) => ({
  preference: readStored(),
  isDark: false,

  initialise: () => {
    const preference = readStored();
    const isDark = applyTheme(preference);
    set({ preference, isDark });

    // Track OS changes live, but only while the user is following the system.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (get().preference === 'system') set({ isDark: applyTheme('system') });
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  },

  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      /* private browsing — the theme just won't persist across reloads */
    }
    set({ preference, isDark: applyTheme(preference) });
  },

  /** Toggle for the header button: flips to the opposite of what's showing. */
  toggle: () => {
    const next = get().isDark ? 'light' : 'dark';
    get().setPreference(next);
    return next;
  },
}));
