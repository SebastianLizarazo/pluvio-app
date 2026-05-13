import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

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

  /**
   * Sync measurements via Edge Function (service role, bypass RLS).
   * Use this when the normal client-side upsert fails due to RLS constraints.
   * The Edge Function accepts measurements and upserts them with service_role.
   */
  const syncMeasurementsEdge = async (
    measurements: Array<{
      id: string;
      userId: string;
      pluviometerId: string;
      measuredAt: string;
      volumeMl: number | null;
      rainfallMm: number;
      noRain: boolean;
      elapsedMinutes: number | null;
      observations: string | null;
      behaviors: string[];
      localId: string | null;
      createdAt: string;
      updatedAt: string;
    }>,
  ) => {
    const { data, error } = await supabaseClient.functions.invoke('sync-measurements', {
      body: { measurements },
    });

    if (error) {
      throw error;
    }

    return data;
  };

  return {
    notifyUserStatus,
    triggerWeeklySummary,
    syncMeasurementsEdge,
  };
};
