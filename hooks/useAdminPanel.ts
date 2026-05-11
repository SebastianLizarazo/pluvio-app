import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useEdgeFunctionsClient } from '@/lib/edge-functions';
import { Sentry } from '@/lib/sentry';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { logAdminAction } from '@/lib/admin-audit';

type AppUserRow = {
  id: string;
  document_id: string;
  full_name: string;
  status: 'pending' | 'active' | 'inactive';
};

type MeasurementRow = {
  id: string;
  user_id: string;
  measured_at: string;
  rainfall_mm: number;
  no_rain: boolean;
};

export const useAdminPanel = () => {
  const supabaseClient = useSupabaseClient();
  const edge = useEdgeFunctionsClient();
  const { appUser } = useAppSession();
  const queryClient = useQueryClient();

  const pendingUsers = useQuery({
    queryKey: ['admin-pending-users'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('app_users')
        .select('id,document_id,full_name,status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as AppUserRow[] | null) ?? [];
    },
  });

  const allUsers = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('app_users')
        .select('id,document_id,full_name,status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as AppUserRow[] | null) ?? [];
    },
  });

  const globalMeasurements = useQuery({
    queryKey: ['admin-global-measurements'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('measurements')
        .select('id,user_id,measured_at,rainfall_mm,no_rain')
        .order('measured_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as MeasurementRow[] | null) ?? [];
    },
  });

  const adminMetrics = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const [usersResult, measurementsResult] = await Promise.all([
        supabaseClient.from('app_users').select('id,status', { count: 'exact' }),
        supabaseClient
          .from('measurements')
          .select('id,measured_at,rainfall_mm,no_rain', { count: 'exact' })
          .order('measured_at', { ascending: false })
          .limit(1000),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (measurementsResult.error) throw measurementsResult.error;

      const users = (usersResult.data as { id: string; status: AppUserRow['status'] }[] | null) ?? [];
      const measurements =
        (measurementsResult.data as
          | { id: string; measured_at: string; rainfall_mm: number; no_rain: boolean }[]
          | null) ?? [];

      const pendingUsersCount = users.filter((u) => u.status === 'pending').length;
      const activeUsersCount = users.filter((u) => u.status === 'active').length;
      const inactiveUsersCount = users.filter((u) => u.status === 'inactive').length;

      const now = new Date();
      const month = now.getUTCMonth();
      const year = now.getUTCFullYear();

      const monthMeasurements = measurements.filter((m) => {
        const date = new Date(m.measured_at);
        return date.getUTCFullYear() === year && date.getUTCMonth() === month;
      });

      const monthRainfallMm = monthMeasurements.reduce((acc, m) => acc + Number(m.rainfall_mm ?? 0), 0);

      return {
        totalUsers: users.length,
        pendingUsersCount,
        activeUsersCount,
        inactiveUsersCount,
        monthMeasurementsCount: monthMeasurements.length,
        monthRainfallMm: Number(monthRainfallMm.toFixed(2)),
      };
    },
  });

  const changeUserStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      Sentry.addBreadcrumb({
        category: 'admin',
        message: 'changeUserStatus called',
        level: 'info',
        data: { userId, status },
      });

      await edge.notifyUserStatus(userId, status === 'active' ? 'approved' : 'rejected');

      if (appUser?.id) {
        await logAdminAction(
          {
            adminId: appUser.id,
            action: status === 'active' ? 'approve' : 'reject',
            targetTable: 'app_users',
            targetId: userId,
            newValue: { status },
          },
          supabaseClient,
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-pending-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });

  const resendUserStatusNotification = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) => {
      Sentry.addBreadcrumb({
        category: 'admin',
        message: 'resendUserStatusNotification called',
        level: 'info',
        data: { userId, status },
      });

      await edge.notifyUserStatus(userId, status === 'active' ? 'approved' : 'rejected');
    },
  });

  const triggerWeeklySummary = useMutation({
    mutationFn: async () => {
      Sentry.addBreadcrumb({
        category: 'admin',
        message: 'triggerWeeklySummary called',
        level: 'info',
      });

      return edge.triggerWeeklySummary();
    },
  });

  const deleteMeasurement = useMutation({
    mutationFn: async (measurementId: string) => {
      const { error } = await supabaseClient.from('measurements').delete().eq('id', measurementId);
      if (error) throw error;

      if (appUser?.id) {
        await logAdminAction(
          {
            adminId: appUser.id,
            action: 'delete',
            targetTable: 'measurements',
            targetId: measurementId,
            newValue: null,
          },
          supabaseClient,
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-global-measurements'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });

  return {
    pendingUsers,
    allUsers,
    globalMeasurements,
    adminMetrics,
    changeUserStatus,
    resendUserStatusNotification,
    triggerWeeklySummary,
    deleteMeasurement,
  };
};
