import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { syncPendingMeasurements } from '@/lib/sync';

export const useSync = () => {
  const supabaseClient = useSupabaseClient();
  const { userId } = useAppSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) {
        return { syncedCount: 0 };
      }

      return syncPendingMeasurements(supabaseClient, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pending-measurements'] });
    },
  });
};
