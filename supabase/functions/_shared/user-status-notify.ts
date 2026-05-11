import { sendEmailViaResend, sendExpoPushMessages } from './notify.ts';

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type StatusAction = 'approved' | 'rejected';

type NotifyOptions = {
  applyStatus?: boolean;
};

type UserRow = {
  id: string;
  full_name: string;
  email: string;
};

type TokenRow = {
  token: string;
  active: boolean;
};

export const notifyUserStatusWithClient = async (
  supabase: SupabaseClient,
  userId: string,
  action: StatusAction,
  options: NotifyOptions = {},
) => {
  if (options.applyStatus) {
    const nextStatus = action === 'approved' ? 'active' : 'inactive';
    const { error: statusError } = await supabase.from('app_users').update({ status: nextStatus }).eq('id', userId);
    if (statusError) throw statusError;
  }

  const [userRes, tokensRes] = await Promise.all([
    supabase.from('app_users').select('id,full_name,email').eq('id', userId).maybeSingle(),
    supabase.from('device_tokens').select('token,active').eq('user_id', userId).eq('active', true),
  ]);

  if (userRes.error) throw userRes.error;
  if (tokensRes.error) throw tokensRes.error;

  const user = userRes.data as UserRow | null;
  if (!user) {
    return {
      ok: false as const,
      error: 'user_not_found',
      status: 404,
    };
  }

  const actionText = action === 'approved' ? 'aprobada' : 'rechazada';
  const notificationTitle = action === 'approved' ? 'Cuenta aprobada' : 'Cuenta rechazada';
  const notificationBody =
    action === 'approved'
      ? 'Tu cuenta fue aprobada. Ya puedes ingresar y registrar mediciones.'
      : 'Tu cuenta fue rechazada o inactivada. Contacta al administrador para más información.';

  const { error: notifInsertError } = await supabase.from('notifications').insert({
    user_id: user.id,
    title: notificationTitle,
    body: notificationBody,
    read: false,
  });

  if (notifInsertError) throw notifInsertError;

  const tokenRows = (tokensRes.data as TokenRow[] | null) ?? [];
  const pushResults = await sendExpoPushMessages(
    tokenRows.map((item) => ({
      to: item.token,
      title: notificationTitle,
      body: notificationBody,
      data: { type: 'account_status', action },
    })),
  );

  const invalidPushTokens = tokenRows
    .filter((_, idx) => pushResults[idx]?.status === 'error')
    .map((row) => row.token);

  if (invalidPushTokens.length) {
    const { error: deactivateError } = await supabase
      .from('device_tokens')
      .update({ active: false })
      .in('token', invalidPushTokens);
    if (deactivateError) throw deactivateError;
  }

  const emailResult = await sendEmailViaResend(
    user.email,
    `PluvioApp — Cuenta ${actionText}`,
    `<p>Hola ${user.full_name},</p><p>Tu cuenta en PluvioApp fue <b>${actionText}</b>.</p><p>${notificationBody}</p>`,
  );

  return {
    ok: true as const,
    userId: user.id,
    action,
    invalidPushTokens,
    emailResult,
  };
};
