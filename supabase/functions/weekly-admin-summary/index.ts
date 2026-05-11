import { corsHeaders } from '../_shared/cors.ts';
import { sendEmailViaResend, sendExpoPushMessages } from '../_shared/notify.ts';
import { requireAdminOrServiceRole } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'pending' | 'active' | 'inactive';
};

type MeasurementRow = {
  id: string;
  user_id: string;
  measured_at: string;
  rainfall_mm: number;
  no_rain: boolean;
};

type DeviceTokenRow = {
  token: string;
  user_id: string;
  active: boolean;
};

const htmlSummary = (items: Array<{ name: string; measurements: number; totalMm: number }>) => {
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding:8px;border:1px solid #ddd;">${item.name}</td><td style="padding:8px;border:1px solid #ddd;">${item.measurements}</td><td style="padding:8px;border:1px solid #ddd;">${item.totalMm.toFixed(2)}</td></tr>`,
    )
    .join('');

  return `
    <h2>Resumen semanal PluvioApp</h2>
    <table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #ddd;">Usuario</th>
          <th style="padding:8px;border:1px solid #ddd;">Registros</th>
          <th style="padding:8px;border:1px solid #ddd;">Total mm</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
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

    const supabase = createServiceClient();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [usersRes, measurementsRes, tokensRes] = await Promise.all([
      supabase.from('app_users').select('id,full_name,email,role,status'),
      supabase
        .from('measurements')
        .select('id,user_id,measured_at,rainfall_mm,no_rain')
        .gte('measured_at', weekAgo.toISOString()),
      supabase.from('device_tokens').select('token,user_id,active').eq('active', true),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (measurementsRes.error) throw measurementsRes.error;
    if (tokensRes.error) throw tokensRes.error;

    const users = ((usersRes.data as UserRow[] | null) ?? []).filter((u) => u.status === 'active');
    const measurements = (measurementsRes.data as MeasurementRow[] | null) ?? [];
    const tokens = (tokensRes.data as DeviceTokenRow[] | null) ?? [];

    const summary = users
      .filter((u) => u.role === 'user')
      .map((u) => {
        const mine = measurements.filter((m) => m.user_id === u.id);
        const totalMm = mine.reduce((acc, m) => acc + Number(m.rainfall_mm ?? 0), 0);

        return {
          userId: u.id,
          name: u.full_name,
          measurements: mine.length,
          totalMm,
        };
      })
      .sort((a, b) => b.totalMm - a.totalMm);

    const admins = users.filter((u) => u.role === 'admin');
    const adminIds = new Set(admins.map((a) => a.id));

    const pushTargets = tokens.filter((t) => adminIds.has(t.user_id));

    const pushResults = await sendExpoPushMessages(
      pushTargets.map((target) => ({
        to: target.token,
        title: 'Resumen semanal disponible',
        body: `Usuarios analizados: ${summary.length}. Revisa el panel administrador.`,
        data: { type: 'weekly_summary' },
      })),
    );

    const emailResults = await Promise.all(
      admins.map((admin) =>
        sendEmailViaResend(
          admin.email,
          'PluvioApp — Resumen semanal de lluvias',
          htmlSummary(summary.map((item) => ({ name: item.name, measurements: item.measurements, totalMm: item.totalMm }))),
        ),
      ),
    );

    const invalidPushTokens = pushTargets
      .filter((_, idx) => pushResults[idx]?.status === 'error')
      .map((target) => target.token);

    if (invalidPushTokens.length) {
      await supabase.from('device_tokens').update({ active: false }).in('token', invalidPushTokens);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        adminsNotified: admins.length,
        usersSummarized: summary.length,
        invalidPushTokens,
        emailResults,
      }),
      {
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
