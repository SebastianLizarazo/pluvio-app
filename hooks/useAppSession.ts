import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores/app-store';
import type { AppUser } from '@/types/domain';

type AppUserRow = {
  id: string;
  document_id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'pending' | 'active' | 'inactive';
  pluviometer_id: string | null;
  notifications_enabled: boolean;
  created_at: string;
};

const mapAppUser = (row: AppUserRow): AppUser => ({
  id: row.id,
  documentId: row.document_id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  status: row.status,
  pluviometerId: row.pluviometer_id,
  notificationsEnabled: row.notifications_enabled,
  createdAt: row.created_at,
});

export const useAppSession = () => {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const setAppUser = useAppStore((state) => state.setAppUser);

  // Listen to auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
      setUserId(session?.user?.id ?? null);
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ['app-session', userId],
    enabled: sessionChecked && isSignedIn && Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId as string)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return mapAppUser(data as AppUserRow);
    },
  });

  useEffect(() => {
    setAppUser(query.data ?? null);
  }, [query.data, setAppUser]);

  return {
    ...query,
    isAuthReady: sessionChecked,
    isSignedIn,
    userId,
    appUser: query.data ?? null,
  };
};
