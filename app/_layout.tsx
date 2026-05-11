import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { OfflineBanner } from '@/components';
import { initSentry } from '@/lib/sentry';
import { initSQLite } from '@/lib/sqlite';
import { queryClient } from '@/lib/query-client';
import { darkTheme, lightTheme } from '@/constants/theme';
import { useThemeStore } from '@/stores/theme-store';

initSentry();
initSQLite();

export default function RootLayout() {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((state) => state.mode);
  const hydrate = useThemeStore((state) => state.hydrate);
  const hydrated = useThemeStore((state) => state.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={isDark ? { ...MD3DarkTheme, ...darkTheme } : { ...MD3LightTheme, ...lightTheme }}>
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(admin)" />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
