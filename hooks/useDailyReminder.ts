import { useEffect } from 'react';

import { useUserMeasurements } from '@/hooks/useUserMeasurements';
import {
  cancelDailyReminder,
  requestNotificationPermission,
  scheduleDailyReminder,
} from '@/lib/notifications';

export const useDailyReminder = (enabled: boolean): void => {
  const { todayMeasurements, isLoading } = useUserMeasurements();

  useEffect(() => {
    if (isLoading) return;

    const syncReminder = async () => {
      if (!enabled) {
        await cancelDailyReminder();
        return;
      }

      const granted = await requestNotificationPermission();
      if (!granted) {
        await cancelDailyReminder();
        return;
      }

      if (todayMeasurements.length > 0) {
        await cancelDailyReminder();
        return;
      }

      await scheduleDailyReminder();
    };

    void syncReminder();
  }, [enabled, isLoading, todayMeasurements.length]);
};
