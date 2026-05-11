import { useMemo } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppSession } from '@/hooks/useAppSession';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export const useNotificationsCenter = () => {
  const { userId } = useAppSession();
  const supabaseClient = useSupabaseClient();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications-center', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('notifications')
        .select('id,user_id,title,body,read,created_at')
        .eq('user_id', userId as string)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data as AppNotification[] | null) ?? [];
    },
  });

  const unreadCount = useMemo(
    () => (notificationsQuery.data ?? []).filter((item) => !item.read).length,
    [notificationsQuery.data],
  );

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId as string);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications-center', userId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId as string)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications-center', userId] });
    },
  });

  return {
    notificationsQuery,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
