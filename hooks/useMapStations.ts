import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

export type MapStation = {
  pluviometerId: string;
  userId: string;
  fullName: string;
  latitude: number;
  longitude: number;
  latestMeasuredAt: string | null;
  latestRainfallMm: number;
  todayTotalMm: number;
  isOwn: boolean;
};

type PluviometerRow = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
};

type UserRow = {
  id: string;
  full_name: string;
  status: 'pending' | 'active' | 'inactive';
};

type MeasurementRow = {
  id: string;
  user_id: string;
  pluviometer_id: string;
  measured_at: string;
  rainfall_mm: number;
};

const toIsoDate = (value: string): string => new Date(value).toISOString().slice(0, 10);

export const useMapStations = () => {
  const supabaseClient = useSupabaseClient();
  const { userId } = useAppSession();

  const query = useQuery({
    queryKey: ['map-stations', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [pluviometersRes, usersRes, measurementsRes] = await Promise.all([
        supabaseClient
          .from('pluviometers')
          .select('id,user_id,latitude,longitude')
          .order('created_at', { ascending: true }),
        supabaseClient.from('app_users').select('id,full_name,status'),
        supabaseClient
          .from('measurements')
          .select('id,user_id,pluviometer_id,measured_at,rainfall_mm')
          .order('measured_at', { ascending: false })
          .limit(3000),
      ]);

      if (pluviometersRes.error) throw pluviometersRes.error;
      if (usersRes.error) throw usersRes.error;
      if (measurementsRes.error) throw measurementsRes.error;

      const pluviometers = (pluviometersRes.data as PluviometerRow[] | null) ?? [];
      const users = (usersRes.data as UserRow[] | null) ?? [];
      const measurements = (measurementsRes.data as MeasurementRow[] | null) ?? [];

      const activeUsers = new Map(users.filter((u) => u.status === 'active').map((u) => [u.id, u]));

      const today = new Date().toISOString().slice(0, 10);

      const latestByPluviometer = new Map<string, MeasurementRow>();
      const todayTotals = new Map<string, number>();

      measurements.forEach((m) => {
        if (!latestByPluviometer.has(m.pluviometer_id)) {
          latestByPluviometer.set(m.pluviometer_id, m);
        }

        if (toIsoDate(m.measured_at) === today) {
          todayTotals.set(m.pluviometer_id, (todayTotals.get(m.pluviometer_id) ?? 0) + Number(m.rainfall_mm ?? 0));
        }
      });

      const stations: MapStation[] = pluviometers
        .filter((p) => activeUsers.has(p.user_id) || p.user_id === userId)
        .map((p) => {
          const latest = latestByPluviometer.get(p.id);
          const owner = activeUsers.get(p.user_id);

          return {
            pluviometerId: p.id,
            userId: p.user_id,
            fullName: owner?.full_name ?? (p.user_id === userId ? 'Mi estación' : 'Estación'),
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            latestMeasuredAt: latest?.measured_at ?? null,
            latestRainfallMm: Number(latest?.rainfall_mm ?? 0),
            todayTotalMm: Number((todayTotals.get(p.id) ?? 0).toFixed(2)),
            isOwn: p.user_id === userId,
          };
        });

      return stations;
    },
  });

  const initialRegion = useMemo(() => {
    const first = query.data?.[0];
    if (!first) {
      return {
        latitude: 4.60971,
        longitude: -74.08175,
        latitudeDelta: 2,
        longitudeDelta: 2,
      };
    }

    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 1,
      longitudeDelta: 1,
    };
  }, [query.data]);

  return {
    ...query,
    initialRegion,
  };
};
