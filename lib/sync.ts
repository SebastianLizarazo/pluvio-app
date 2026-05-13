import NetInfo from '@react-native-community/netinfo';
import type { SupabaseClient } from '@supabase/supabase-js';

import { logAdminAction } from '@/lib/admin-audit';
import { Sentry } from '@/lib/sentry';
import { getPendingMeasurementsByUser, markMeasurementsAsSynced } from '@/lib/sqlite';
import type { Json } from '@/types/database';

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const BACKOFF_MS = [5000, 15000, 45000] as const;

const syncBatch = async (
  supabaseClient: SupabaseClient,
  actorUserId: string,
): Promise<number> => {
  const pending = getPendingMeasurementsByUser(actorUserId);
  if (!pending.length) return 0;

  const toUpload: typeof pending = [];
  const toMarkAsSynced: string[] = [];

  for (const localItem of pending) {
    if (!localItem.localId) {
      toUpload.push(localItem);
      continue;
    }

    const { data: remote, error } = await supabaseClient
      .from('measurements')
      .select('id, updated_at')
      .eq('local_id', localItem.localId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!remote) {
      toUpload.push(localItem);
      continue;
    }

    const localUpdatedAt = new Date(localItem.updatedAt).getTime();
    const remoteUpdatedAt = new Date(remote.updated_at as string).getTime();

    if (localUpdatedAt > remoteUpdatedAt) {
      toUpload.push(localItem);
    } else {
      toMarkAsSynced.push(localItem.id);
      await logAdminAction(
        {
          adminId: actorUserId,
          action: 'sync_conflict',
          targetTable: 'measurements',
          targetId: localItem.id,
          previousValue: { source: 'remote', updated_at: remote.updated_at } as Json,
          newValue: { source: 'local', updated_at: localItem.updatedAt } as Json,
        },
        supabaseClient,
      ).catch(() => {
        // noop audit fallback
      });
    }
  }

  if (toMarkAsSynced.length) {
    markMeasurementsAsSynced(toMarkAsSynced);
  }

  if (!toUpload.length) {
    return toMarkAsSynced.length;
  }

  // Try Edge Function first (bypasses RLS via service_role)
  // Fallback to direct client upsert if Edge Function fails
  let uploadedCount = 0;
  const uploadedIds: string[] = [];

  try {
    const edgePayload = toUpload.map((item) => ({
      id: item.id,
      userId: item.userId,
      pluviometerId: item.pluviometerId,
      measuredAt: item.measuredAt,
      volumeMl: item.volumeMl,
      rainfallMm: item.rainfallMm,
      noRain: item.noRain,
      elapsedMinutes: item.elapsedMinutes,
      observations: item.observations,
      behaviors: item.behaviors,
      localId: item.localId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const { data: edgeResult, error: edgeError } = await supabaseClient.functions.invoke(
      'sync-measurements',
      { body: { measurements: edgePayload } },
    );

    if (!edgeError && edgeResult && typeof edgeResult === 'object' && 'ok' in edgeResult) {
      const result = edgeResult as { ok: boolean; synced?: number };
      if (result.ok && result.synced !== undefined) {
        uploadedCount = result.synced;
        uploadedIds.push(...toUpload.map((item) => item.id));
      } else {
        throw new Error('Edge function returned not ok');
      }
    } else if (edgeError) {
      throw edgeError;
    } else {
      throw new Error('Unexpected edge function response');
    }
  } catch {
    // Fallback: direct upsert via client (RLS will apply, may fail for some cases)
    const payload = toUpload.map((item) => ({
      id: item.id,
      user_id: item.userId,
      pluviometer_id: item.pluviometerId,
      measured_at: item.measuredAt,
      volume_ml: item.volumeMl,
      rainfall_mm: item.rainfallMm,
      no_rain: item.noRain,
      elapsed_minutes: item.elapsedMinutes,
      observations: item.observations,
      behaviors: item.behaviors,
      synced: true,
      local_id: item.localId,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));

    const { error } = await supabaseClient
      .from('measurements')
      .upsert(payload, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      throw error;
    }

    uploadedCount = toUpload.length;
    uploadedIds.push(...toUpload.map((item) => item.id));
  }

  if (uploadedIds.length) {
    markMeasurementsAsSynced(uploadedIds);
  }

  return uploadedCount + toMarkAsSynced.length;
};

export const syncPendingMeasurements = async (
  supabaseClient: SupabaseClient,
  actorUserId: string,
): Promise<{ syncedCount: number }> => {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    return { syncedCount: 0 };
  }

  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt += 1) {
    try {
      const syncedCount = await syncBatch(supabaseClient, actorUserId);
      return { syncedCount };
    } catch (error) {
      await logAdminAction({
        adminId: actorUserId,
        action: 'sync_conflict',
        targetTable: 'measurements',
        targetId: 'batch',
        previousValue: null,
        newValue: { attempt: attempt + 1 } as Json,
      }, supabaseClient).catch(() => {
        // noop audit fallback
      });

      Sentry.captureException(error, {
        tags: { module: 'sync', attempt: String(attempt + 1) },
      });

      if (attempt === BACKOFF_MS.length - 1) {
        throw error;
      }

      await wait(BACKOFF_MS[attempt]);
    }
  }

  return { syncedCount: 0 };
};
