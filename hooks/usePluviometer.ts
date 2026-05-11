import { useQuery } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

export type PluviometerData = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  diameter_cm: number;
  height_cm: number;
};

export const usePluviometer = () => {
  const supabaseClient = useSupabaseClient();
  const { userId } = useAppSession();

  return useQuery({
    queryKey: ['pluviometer', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('pluviometers')
        .select('id,user_id,latitude,longitude,diameter_cm,height_cm')
        .eq('user_id', userId as string)
        .maybeSingle();

      if (error) throw error;
      return (data as PluviometerData | null) ?? null;
    },
  });
};
