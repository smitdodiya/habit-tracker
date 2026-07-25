/**
 * Expo app configuration.
 *
 * The API base URL is the one thing that genuinely differs between running in
 * Expo Go on a phone and running anywhere else: a phone cannot reach
 * `localhost:5000`, because localhost is the phone. It is read from
 * EXPO_PUBLIC_API_URL so the same code can point at a dev tunnel, a LAN
 * address, or production without an edit.
 */
export default {
  expo: {
    name: 'Habit Tracker',
    slug: 'habit-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'habittracker',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    splash: {
      backgroundColor: '#1A1A2E',
      resizeMode: 'contain',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.asensebranding.habittracker',
      // Brief §06: iOS 14+
      deploymentTarget: '14.0',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
    },

    android: {
      package: 'com.asensebranding.habittracker',
      adaptiveIcon: { backgroundColor: '#1A1A2E' },
      // Brief §06: Android 10+ (API 29)
      minSdkVersion: 29,
      edgeToEdgeEnabled: true,
    },

    web: {
      bundler: 'metro',
      output: 'single',
    },

    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          color: '#E94560',
        },
      ],
    ],

    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000',
    },
  },
};
