import 'dotenv/config';

import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'PluvioApp',
  slug: 'pluvio-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.pluvio.app',
    infoPlist: {
      NSCameraUsageDescription: 'PluvioApp necesita acceso a tu cámara para escanear códigos QR.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.pluvio.app',
    permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS', 'CAMERA'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  scheme: 'pluvioapp',
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-sqlite',
    '@react-native-community/datetimepicker',
    'expo-notifications',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'PluvioApp necesita acceso a tu ubicación para registrar la estación.',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        project: 'pluvio-app',
        organization: 'local',
      },
    ],
  ],
  extra: {
    mapsApiKey: process.env.EXPO_PUBLIC_MAPS_API_KEY,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    env: process.env.EXPO_PUBLIC_ENV ?? 'development',
    eas: {
      projectId: 'pluvio-app-local',
    },
  },
};

export default config;
