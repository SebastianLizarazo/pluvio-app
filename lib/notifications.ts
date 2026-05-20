import { Platform } from 'react-native';

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

const isExpoGoAndroid =
  Platform.OS === 'android' &&
  (Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAILY_REMINDER_10PM_ID = 'pluvio-daily-reminder-22';
const DAILY_REMINDER_11PM_ID = 'pluvio-daily-reminder-23';

export const requestNotificationPermission = async (): Promise<boolean> => {
  // En Expo Go Android, las push remotas no están soportadas; se omite.
  if (isExpoGoAndroid) return false;

  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted || asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

export const cancelDailyReminder = async (): Promise<void> => {
  // En Expo Go Android no hay soporte de notificaciones locales.
  if (isExpoGoAndroid) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_10PM_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_11PM_ID).catch(() => {});
};

export const scheduleDailyReminder = async (): Promise<void> => {
  // En Expo Go Android no hay soporte de notificaciones locales.
  if (isExpoGoAndroid) return;

  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_10PM_ID,
    content: {
      title: 'Recordatorio de lluvia',
      body: 'Aún no registras la medición de hoy (10:00 PM).',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 22,
      minute: 0,
    },
  });

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_11PM_ID,
    content: {
      title: 'Último recordatorio',
      body: 'Aún falta tu medición del día (11:00 PM).',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 23,
      minute: 0,
    },
  });
};
