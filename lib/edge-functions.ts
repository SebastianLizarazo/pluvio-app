import { useSupabaseClient } from '@/hooks/useSupabaseClient';

export const useEdgeFunctionsClient = () => {
  const supabaseClient = useSupabaseClient();

  const notifyUserStatus = async (userId: string, action: 'approved' | 'rejected') => {
    const { data, error } = await supabaseClient.functions.invoke('user-status-notify', {
      body: {
        userId,
        action,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const triggerWeeklySummary = async () => {
    const { data, error } = await supabaseClient.functions.invoke('weekly-admin-summary', {
      body: {},
    });

    if (error) {
      throw error;
    }

    return data;
  };

  return {
    notifyUserStatus,
    triggerWeeklySummary,
  };
};
