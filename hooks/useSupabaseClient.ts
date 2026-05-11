import { useMemo } from 'react';

import { supabase } from '@/lib/supabase';

export const useSupabaseClient = () => {
  return useMemo(() => supabase, [supabase]);
};