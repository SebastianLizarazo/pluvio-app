# Supabase Setup

## 1. Create Supabase Project

Create a new project at [supabase.com](https://supabase.com). Free tier is fine.

## 2. Apply SQL Scripts (in order)

Run these in the Supabase SQL Editor, in order:

### a) `sql/supabase-schema.sql`
Full database schema including:
- `app_users` — user accounts with role/status fields
- `pluviometers` — device registration
- `measurements` — rainfall records
- `monthly_totals` — aggregated data
- `audit_log` — admin action history
- `notifications` — notification preferences
- `device_tokens` — Expo push token storage
- All RLS policies by role and ownership
- Trigger for automatic `monthly_totals` recalculation

### b) `sql/patch-app-users-rls-self-signup.sql`
Adds self-signup RLS policy so new users can insert their own row during registration.

### c) `sql/bootstrap-admin.sql`
Creates the first admin user. **Before running, replace the placeholders:**

```sql
-- Find and replace:
YOUR_CEDULA         →  your document ID (e.g. "12345678")
YOUR_PASSWORD_HASH  →  bcrypt hash of your password
YOUR_EMAIL          →  your email address
```

Run the script to create your admin account. It uses UPSERT so it's safe to re-run.

## 3. Create Admin User

After applying `bootstrap-admin.sql`, your admin user exists in `app_users` with role `admin` and status `active`. You can now sign up in the app using your cedula and password.

## Auth Model

This project uses **Supabase Auth** (NOT Clerk).

- Users sign up with email format: `cedula@pluvio.app` (where `cedula` = national document ID)
- Password is set at signup time
- No Clerk involvement anywhere

The `app_users` table mirrors Supabase Auth users. When a user signs up:
1. They insert into `app_users` with status `pending`
2. Admin approves them (sets status to `active`, role to `admin` or `user`)
3. User can then access protected features

## Environment Setup for Edge Functions

For local development and deployment of Edge Functions, copy `.env.local.example` to `.env.local` and fill in:

- `SUPABASE_PROJECT_REF` — found in your Supabase project settings
- `SUPABASE_URL` — your project URL
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase API settings
- `RESEND_API_KEY` — for sending emails
- `RESEND_FROM` — sender email address

See `.env.local.example` for all required secrets.