import { useEffect } from 'react';
import { Platform } from 'react-native';

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

const getPlatform = (): 'ios' | 'android' | 'web' | 'unknown' => {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
};

export const usePushTokenRegistration = (): void => {
  const { appUser } = useAppSession();
  const supabaseClient = useSupabaseClient();

  useEffect(() => {
    if (!appUser?.notificationsEnabled) {
      return;
    }

    const register = async () => {
      const isExpoGoAndroid =
        Platform.OS === 'android' &&
        (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo');

      if (isExpoGoAndroid) {
        return;
      }

      try {
        const permission = await Notifications.getPermissionsAsync();
        let granted = permission.granted;

        if (!granted) {
          const requested = await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }

        if (!granted) {
          return;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        const token = tokenResponse.data;

        if (!token || !appUser.id) return;

        await supabaseClient.from('device_tokens').upsert(
          {
            user_id: appUser.id,
            platform: getPlatform(),
            token,
            active: true,
          },
          { onConflict: 'token' },
        );
      } catch {
        // En Expo Go Android (SDK 53+) push remotas no están soportadas.
        // Se ignora para no bloquear el flujo funcional del resto de la app.
      }
    };

    void register();
  }, [appUser?.id, appUser?.notificationsEnabled, supabaseClient]);
};
