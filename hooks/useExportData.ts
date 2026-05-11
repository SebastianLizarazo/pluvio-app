import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import type { BehaviorTag, Measurement } from '@/types/domain';

type MeasurementRow = {
  id: string;
  user_id: string;
  pluviometer_id: string;
  measured_at: string;
  volume_ml: number | null;
  rainfall_mm: number;
  no_rain: boolean;
  elapsed_minutes: number | null;
  observations: string | null;
  behaviors: BehaviorTag[];
  synced: boolean;
  local_id: string | null;
  created_at: string;
  updated_at: string;
};

type ExportUserOption = {
  id: string;
  label: string;
};

const fromRow = (row: MeasurementRow): Measurement => ({
  id: row.id,
  userId: row.user_id,
  pluviometerId: row.pluviometer_id,
  measuredAt: row.measured_at,
  volumeMl: row.volume_ml,
  rainfallMm: Number(row.rainfall_mm ?? 0),
  noRain: row.no_rain,
  elapsedMinutes: row.elapsed_minutes,
  observations: row.observations,
  behaviors: row.behaviors,
  synced: row.synced,
  localId: row.local_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useExportData = () => {
  const { appUser, userId } = useAppSession();
  const supabaseClient = useSupabaseClient();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const usersQuery = useQuery({
    queryKey: ['export-users', appUser?.role],
    enabled: appUser?.role === 'admin',
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('app_users')
        .select('id,full_name,status')
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const users =
        (data as { id: string; full_name: string; status: 'pending' | 'active' | 'inactive' }[] | null) ?? [];

      const options: ExportUserOption[] = users.map((u) => ({ id: u.id, label: u.full_name }));
      return options;
    },
  });

  const measurementsQuery = useQuery({
    queryKey: ['export-measurements', userId, appUser?.role],
    enabled: Boolean(userId),
    queryFn: async () => {
      let builder = supabaseClient.from('measurements').select('*').order('measured_at', { ascending: false });

      if (appUser?.role !== 'admin') {
        builder = builder.eq('user_id', userId as string);
      }

      const { data, error } = await builder.limit(5000);
      if (error) throw error;

      return ((data as MeasurementRow[] | null) ?? []).map(fromRow);
    },
  });

  const filteredRows = useMemo(() => {
    const rows = measurementsQuery.data ?? [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return rows.filter((item) => {
      const measured = new Date(item.measuredAt);
      const inRange = measured.getTime() >= start.getTime() && measured.getTime() <= end.getTime();
      if (!inRange) return false;

      if (appUser?.role === 'admin' && selectedUserId !== 'all') {
        return item.userId === selectedUserId;
      }

      return true;
    });
  }, [appUser?.role, endDate, measurementsQuery.data, selectedUserId, startDate]);

  return {
    appUser,
    usersQuery,
    measurementsQuery,
    filteredRows,
    filters: {
      startDate,
      endDate,
      selectedUserId,
    },
    setStartDate,
    setEndDate,
    setSelectedUserId,
  };
};
