import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { getLocalMeasurementsByUser } from '@/lib/sqlite';
import type { BehaviorTag, Measurement } from '@/types/domain';
import { getYearMonth, toIsoDate } from '@/utils';

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

export const useUserMeasurements = () => {
  const { userId } = useAppSession();
  const supabaseClient = useSupabaseClient();

  const query = useQuery({
    queryKey: ['user-measurements', userId],
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: true,
    queryFn: async () => {
      const local = getLocalMeasurementsByUser(userId as string);

      const { data, error } = await supabaseClient
        .from('measurements')
        .select('*')
        .eq('user_id', userId as string)
        .order('measured_at', { ascending: false })
        .limit(1500);

      if (error) throw error;

      const remote = (data as MeasurementRow[] | null)?.map(fromRow) ?? [];
      const merged = new Map<string, Measurement>();

      [...remote, ...local].forEach((item) => {
        const key = item.localId ?? item.id;
        const prev = merged.get(key);
        if (!prev) {
          merged.set(key, item);
          return;
        }

        if (new Date(item.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
          merged.set(key, item);
        }
      });

      return Array.from(merged.values()).sort(
        (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
      );
    },
  });

  const derived = useMemo(() => {
    const data = query.data ?? [];
    const now = new Date();
    const today = toIsoDate(now);
    const { year, month } = getYearMonth(now);
    const semesterStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const todayMeasurements = data.filter((m) => toIsoDate(new Date(m.measuredAt)) === today);
    const monthMeasurements = data.filter((m) => {
      const ym = getYearMonth(new Date(m.measuredAt));
      return ym.year === year && ym.month === month;
    });
    const semesterMeasurements = data.filter(
      (m) => new Date(m.measuredAt).getTime() >= semesterStart.getTime(),
    );

    const todayTotalMm = todayMeasurements.reduce((acc, m) => acc + m.rainfallMm, 0);
    const monthTotalMm = monthMeasurements.reduce((acc, m) => acc + m.rainfallMm, 0);
    const semesterTotalMm = semesterMeasurements.reduce((acc, m) => acc + m.rainfallMm, 0);
    const latest = data[0] ?? null;

    return {
      todayMeasurements,
      monthMeasurements,
      todayTotalMm,
      monthTotalMm,
      semesterTotalMm,
      latest,
    };
  }, [query.data]);

  return {
    ...query,
    ...derived,
  };
};
