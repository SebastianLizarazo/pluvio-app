import { corsHeaders } from '../_shared/cors.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

/**
 * sync-measurements Edge Function
 *
 * Receives an array of measurements and upserts them into Supabase using
 * service_role (bypasses RLS). This is called by the sync.ts client when
 * local measurements need to be uploaded to the cloud.
 *
 * Authorization: requires SUPABASE_SERVICE_ROLE_KEY bearer token.
 */

type MeasurementInput = {
  id: string;
  userId: string;
  pluviometerId: string;
  measuredAt: string;
  volumeMl: number | null;
  rainfallMm: number;
  noRain: boolean;
  elapsedMinutes: number | null;
  observations: string | null;
  behaviors: string[];
  localId: string | null;
  createdAt: string;
  updatedAt: string;
};

type SyncPayload = {
  measurements: MeasurementInput[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireServiceRole(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = (await req.json()) as SyncPayload;
    if (!body.measurements || !Array.isArray(body.measurements)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid_payload_missing_measurements' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (body.measurements.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, synced: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createServiceClient();

    // Validate user ownership for all measurements
    // We need to verify each measurement's userId matches the authenticated user or admin
    // For now, we'll insert with service role and let RLS policies handle validation on reads
    // But we need to ensure the user_id matches the token's sub claim

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const measurement of body.measurements) {
      // Validate UUID format - skip records with invalid IDs
      if (!UUID_REGEX.test(measurement.id)) {
        console.error('Invalid UUID skipped:', measurement.id);
        results.push({ id: measurement.id, ok: false, error: 'invalid_uuid_format' });
        continue;
      }

      try {
        // Upsert measurement - use id as primary key, local_id for conflict resolution
        const { error } = await supabase.from('measurements').upsert(
          {
            id: measurement.id,
            user_id: measurement.userId,
            pluviometer_id: measurement.pluviometerId,
            measured_at: measurement.measuredAt,
            volume_ml: measurement.volumeMl,
            rainfall_mm: measurement.rainfallMm,
            no_rain: measurement.noRain,
            elapsed_minutes: measurement.elapsedMinutes,
            observations: measurement.observations,
            behaviors: measurement.behaviors,
            synced: true,
            local_id: measurement.localId,
            created_at: measurement.createdAt,
            updated_at: measurement.updatedAt,
          },
          {
            onConflict: 'id',
            ignoreDuplicates: false, // overwrite if exists (update)
          },
        );

        if (error) {
          results.push({ id: measurement.id, ok: false, error: error.message });
        } else {
          results.push({ id: measurement.id, ok: true });
        }
      } catch (err) {
        results.push({
          id: measurement.id,
          ok: false,
          error: err instanceof Error ? err.message : 'unknown_error',
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return new Response(
      JSON.stringify({
        ok: failed === 0,
        synced: succeeded,
        failed: failed,
        results,
      }),
      {
        status: failed > 0 ? 207 : 200, // 207 Multi-Status if some failed
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'unknown_error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});