import * as Sentry from '@sentry/react-native';

import { env, isDemoMode } from '@/lib/env';

let initialized = false;

export const initSentry = (): void => {
  if (initialized) {
    return;
  }

  if (isDemoMode) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    tracesSampleRate: 1,
    environment: env.appEnv,
  });

  initialized = true;
};

export { Sentry };
