import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const createSupabaseWithClerkToken = (
  getToken: (options?: { template?: string }) => Promise<string | null>,
) => {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    accessToken: async () => {
      const token = await getToken({ template: 'supabase' });
      return token ?? '';
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};
