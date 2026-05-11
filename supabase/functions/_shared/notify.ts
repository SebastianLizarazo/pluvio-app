type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type PushResult = {
  status: 'ok' | 'error';
  details?: unknown;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const sendExpoPushMessages = async (messages: PushMessage[]): Promise<PushResult[]> => {
  if (!messages.length) return [];

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    return messages.map(() => ({
      status: 'error',
      details: { code: 'push_http_error', status: response.status },
    }));
  }

  const body = (await response.json()) as { data?: unknown[] };
  const dataArray = Array.isArray(body.data) ? body.data : [];

  return messages.map((_, idx) => {
    const row = dataArray[idx] as { status?: string } | undefined;
    return row?.status === 'ok' ? { status: 'ok', details: row } : { status: 'error', details: row };
  });
};

export const sendEmailViaResend = async (
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; details?: unknown }> => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') ?? 'PluvioApp <noreply@pluvio.app>';

  if (!apiKey) {
    return { ok: false, details: 'missing_resend_key' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    return { ok: false, details: await res.text() };
  }

  return { ok: true, details: await res.json() };
};
