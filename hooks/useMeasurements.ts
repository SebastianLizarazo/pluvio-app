import { useQuery } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { getPendingMeasurementsByUser } from '@/lib/sqlite';

export const usePendingMeasurements = () => {
  const { userId } = useAppSession();

  return useQuery({
    queryKey: ['pending-measurements', userId],
    enabled: Boolean(userId),
    queryFn: async () => getPendingMeasurementsByUser(userId as string),
  });
};
