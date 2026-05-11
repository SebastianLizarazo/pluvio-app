import type { SupabaseClient } from '@supabase/supabase-js';

import type { Json } from '@/types/database';
import { supabase } from '@/lib/supabase';

type AuditAction = 'edit' | 'delete' | 'approve' | 'reject' | 'sync_conflict';

interface AuditInput {
  adminId: string;
  action: AuditAction;
  targetTable: string;
  targetId: string;
  previousValue?: Json | null;
  newValue?: Json | null;
}

export const logAdminAction = async (
  input: AuditInput,
  client: SupabaseClient = supabase,
): Promise<void> => {
  const { error } = await client.from('audit_log').insert({
    admin_id: input.adminId,
    action: input.action,
    target_table: input.targetTable,
    target_id: input.targetId,
    previous_value: input.previousValue ?? null,
    new_value: input.newValue ?? null,
  });

  if (error) {
    throw error;
  }
};
