# PluvioApp

Rain measurement tracking MVP for admin users.

## Tech Stack

- **Expo ~54 / React Native 0.81**
- **expo-router ~6.0.23** — file-based routing
- **Supabase** — auth, database, RLS, Edge Functions (NOT Clerk)
- **react-native-paper 5.15.2** — UI components
- **react-native-reanimated** — TankBar animation
- **SQLite (expo-sqlite)** — offline-first local storage
- **Zustand 5.x + TanStack React Query 5.x** — state management
- **@react-native-community/netinfo** — connectivity detection
- **expo-notifications** — local notifications (NOT remote push in Expo Go)
- **expo-sharing + xlsx** — CSV/XLSX export
- **@sentry/react-native** — error monitoring

## Prerequisites

- Node.js 18+
- pnpm @8.15.9 (minimum)
- Expo CLI
- Supabase account (free tier works)

## Quick Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd pluvio-app
pnpm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your values

# 3. Apply SQL scripts (in order)
# In Supabase SQL Editor, run:
# a) sql/supabase-schema.sql
# b) sql/patch-app-users-rls-self-signup.sql
# c) sql/bootstrap-admin.sql  (replace placeholders first)

# 4. Start development
pnpm start
```

## Package Manager

**pnpm @8.15.9 is required.** Newer versions have `approve-builds` issues with this project.

In `package.json`, `pnpm.onlyBuiltDependencies` is configured to handle native modules.

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (safe for client) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error tracking endpoint |
| `EXPO_PUBLIC_ENV` | `development` or `production` |
| `EXPO_PUBLIC_MAPS_API_KEY` | Google Maps API key (optional) |

## SQL Setup (order matters)

1. **`sql/supabase-schema.sql`** — full DB schema with RLS policies, triggers, tables (`app_users`, `pluviometers`, `measurements`, `monthly_totals`, `audit_log`, `notifications`, `device_tokens`)
2. **`sql/patch-app-users-rls-self-signup.sql`** — self-signup RLS policy for `app_users`
3. **`sql/bootstrap-admin.sql`** — create first admin user (UPSERT, idempotent; replace `YOUR_CEDULA`, `YOUR_PASSWORD_HASH`, `YOUR_EMAIL` placeholders first)

## App Structure

```
app/
  (auth)/           — sign-in, sign-up flows
  (admin)/          — protected admin tabs
    analysis/       — 3-tab section: Panel, Anual, Historial (Calendario + Lista sub-tabs)
components/         — shared UI (TankBar, MonthBarChart, ProgressBar)
hooks/              — useUserMeasurements, useAnalytics, usePushTokenRegistration
lib/                — sync (background sync with exponential backoff), notifications
supabase/
  functions/        — Edge Functions (sync-measurements, user-status-notify, _shared)
  README.md         — Supabase setup guide
sql/                — schema and bootstrap scripts
```

## Key Commands

```bash
pnpm start          # Start Expo dev server
pnpm android        # Run on Android device/emulator
pnpm run typecheck  # TypeScript validation
```

## Edge Functions

Located in `supabase/functions/`:

- **`sync-measurements`** — syncs local SQLite measurements to Supabase (service_role bypasses RLS)
- **`user-status-notify`** — sends push + email on account approve/reject
- **`_shared/`** — shared auth, notify, Supabase client utilities

Deploy with: `pnpm supabase:functions:deploy`

See `supabase/README.md` for secrets setup.

## Local Notifications

Uses `expo-notifications` for local daily reminders (scheduled at 22:00 and 23:00).

**Expo Go Android limitation:** Remote push notifications do NOT work in Expo Go on Android. Local notifications work fine. For remote push on Android, a Dev Build is required.

## Current State

Implemented:
- Supabase Auth with `cedula@pluvio.app` format (cedula = document ID as email)
- SQLite offline-first with `measurements` table
- Background sync with exponential backoff (5s → 15s → 45s)
- Admin dashboard with tabs: Inicio, Registrar, Mapa, Análisis, Perfil
- Analysis section with Panel, Anual, Historial sub-tabs
- TankBar animation, MonthBarChart, ProgressBar pure RN components
- Monthly/daily aggregations with dry/wet season detection (60mm threshold)
- CSV/XLSX export via expo-sharing + xlsx
- Push token registration to `device_tokens` table
- Sentry monitoring configured

Not yet implemented:
- Remote push notifications (requires Dev Build)
- Full test coverage