import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

export const useNotificationSettings = () => {
  const { userId } = useAppSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!userId) {
        throw new Error('missing_user_id_for_notification_settings');
      }

      const { error } = await supabaseClient.rpc('set_notifications_enabled', {
        p_enabled: enabled,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app-session', userId] });
    },
  });
};
