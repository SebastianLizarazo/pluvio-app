import { corsHeaders } from '../_shared/cors.ts';
import { requireAdminOrServiceRole } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { notifyUserStatusWithClient } from '../_shared/user-status-notify.ts';

type StatusAction = 'approved' | 'rejected';

type RequestBody = {
  userId: string;
  action: StatusAction;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAdminOrServiceRole(req);
    if (!auth.ok) {
      return auth.response;
    }

    const body = (await req.json()) as RequestBody;
    if (!body.userId || !body.action) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServiceClient();
    const notifyResult = await notifyUserStatusWithClient(supabase, body.userId, body.action, {
      applyStatus: true,
    });

    if (!notifyResult.ok) {
      return new Response(JSON.stringify(notifyResult), {
        status: notifyResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(notifyResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
