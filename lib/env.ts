import Constants from 'expo-constants';

type ExtraConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  sentryDsn?: string;
  mapsApiKey?: string;
  env?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

const appEnv = extra.env ?? 'development';

export const isDemoMode = appEnv === 'demo';

const required = (
  value: string | undefined,
  key: string,
  demoFallback: string,
): string => {
  if (value) {
    return value;
  }

  if (isDemoMode) {
    return demoFallback;
  }

  if (!value) {
    throw new Error(`Missing required env key: ${key}`);
  }

  return value;
};

export const env = {
  supabaseUrl: required(
    extra.supabaseUrl,
    'EXPO_PUBLIC_SUPABASE_URL',
    'https://example.supabase.co',
  ),
  supabaseAnonKey: required(
    extra.supabaseAnonKey,
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'demo-anon-key',
  ),
  sentryDsn: required(
    extra.sentryDsn,
    'EXPO_PUBLIC_SENTRY_DSN',
    'https://examplePublicKey@o0.ingest.sentry.io/0',
  ),
  mapsApiKey: required(
    extra.mapsApiKey,
    'EXPO_PUBLIC_MAPS_API_KEY',
    'demo-maps-key',
  ),
  appEnv,
};
