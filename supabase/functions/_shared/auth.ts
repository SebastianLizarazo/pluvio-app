import { corsHeaders } from './cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AdminAuthOk = {
  ok: true;
  actorId: string | null;
  actorRole: 'admin' | 'service_role';
};

type AdminAuthError = {
  ok: false;
  response: Response;
};

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;

  return token;
};

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const requireServiceRole = async (req: Request): Promise<{ ok: true } | { ok: false; response: Response }> => {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: jsonError(401, 'missing_authorization_bearer') };
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return { ok: false, response: jsonError(403, 'service_role_required') };
  }

  return { ok: true };
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('invalid_jwt_payload');

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? `${normalized}${'='.repeat(4 - pad)}` : normalized;

  const decoded = atob(padded);
  return JSON.parse(decoded) as Record<string, unknown>;
};

const verifyAdminAgainstDatabase = async (
  token: string,
  actorId: string,
): Promise<{ ok: boolean; reason?: string }> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    return { ok: false, reason: 'missing_supabase_url_or_anon_key' };
  }

  const verifierClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await verifierClient
    .from('app_users')
    .select('id,role')
    .eq('id', actorId)
    .maybeSingle();

  if (error) {
    return { ok: false, reason: 'invalid_or_expired_token' };
  }

  if (!data) {
    return { ok: false, reason: 'actor_app_user_not_found' };
  }

  if (data.role !== 'admin') {
    return { ok: false, reason: 'admin_role_required' };
  }

  return { ok: true };
};

export const requireAdminOrServiceRole = async (
  req: Request,
): Promise<AdminAuthOk | AdminAuthError> => {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: jsonError(401, 'missing_authorization_bearer') };
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceRoleKey && token === serviceRoleKey) {
    return { ok: true, actorId: null, actorRole: 'service_role' };
  }

  let payload: Record<string, unknown>;
  try {
    payload = decodeJwtPayload(token);
  } catch {
    return { ok: false, response: jsonError(401, 'malformed_jwt_payload') };
  }

  const actorId = typeof payload.sub === 'string' ? payload.sub : null;
  if (!actorId) {
    return { ok: false, response: jsonError(401, 'missing_sub_claim') };
  }

  const adminCheck = await verifyAdminAgainstDatabase(token, actorId);
  if (!adminCheck.ok) {
    return {
      ok: false,
      response: jsonError(adminCheck.reason === 'invalid_or_expired_token' ? 401 : 403, adminCheck.reason ?? 'forbidden'),
    };
  }

  return { ok: true, actorId, actorRole: 'admin' };
};
