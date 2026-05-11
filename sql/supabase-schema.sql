-- Extensiones
create extension if not exists pgcrypto;

-- Usuarios de app
create table if not exists public.app_users (
  id text primary key,
  document_id text not null unique,
  full_name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  pluviometer_id uuid,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Regla de negocio: un único administrador global
create unique index if not exists ux_app_users_single_admin
  on public.app_users ((role))
  where role = 'admin';

-- Pluviómetros
create table if not exists public.pluviometers (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references public.app_users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  diameter_cm numeric not null,
  height_cm numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.app_users
  drop constraint if exists app_users_pluviometer_id_fkey,
  add constraint app_users_pluviometer_id_fkey
  foreign key (pluviometer_id) references public.pluviometers(id);

-- Registros de medición
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  pluviometer_id uuid not null references public.pluviometers(id) on delete cascade,
  measured_at timestamptz not null,
  volume_ml numeric,
  rainfall_mm numeric not null default 0,
  no_rain boolean default false,
  elapsed_minutes integer,
  observations text,
  behaviors text[] not null default '{}',
  synced boolean default true,
  local_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Acumulados mensuales
create table if not exists public.monthly_totals (
  id uuid primary key default gen_random_uuid(),
  pluviometer_id uuid not null references public.pluviometers(id) on delete cascade,
  year integer not null,
  month integer not null check (month >= 1 and month <= 12),
  total_mm numeric not null default 0,
  measurement_count integer default 0,
  unique(pluviometer_id, year, month)
);

-- Auditoría
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  action text not null check (action in ('edit', 'delete', 'approve', 'reject', 'sync_conflict')),
  target_table text not null,
  target_id text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz default now()
);

-- Notificaciones
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- Tokens de dispositivos para push remotas
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpers de claims JWT (Clerk -> Supabase)
create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'sub', ''),
    nullif(auth.jwt() -> 'claims' ->> 'sub', '')
  )::text;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'public_metadata' ->> 'role', ''),
    nullif(auth.jwt() -> 'claims' -> 'public_metadata' ->> 'role', ''),
    'user'
  )::text;
$$;

-- Helpers de perfil propio (evitan abrir UPDATE amplio por RLS)
create or replace function public.set_notifications_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_users
  set notifications_enabled = p_enabled
  where id = public.current_user_id();

  if not found then
    raise exception 'app_user_not_found_for_current_user';
  end if;
end;
$$;

create or replace function public.set_my_pluviometer(p_pluviometer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.pluviometers p
    where p.id = p_pluviometer_id
      and p.user_id = public.current_user_id()
  ) then
    raise exception 'pluviometer_not_owned_by_current_user';
  end if;

  update public.app_users
  set pluviometer_id = p_pluviometer_id
  where id = public.current_user_id()
    and role = 'user'
    and status = 'pending';

  if not found then
    raise exception 'app_user_not_pending_or_not_found';
  end if;
end;
$$;

grant execute on function public.set_notifications_enabled(boolean) to authenticated, service_role;
grant execute on function public.set_my_pluviometer(uuid) to authenticated, service_role;

-- Trigger updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pluviometers_touch on public.pluviometers;
create trigger trg_pluviometers_touch
before update on public.pluviometers
for each row execute function public.touch_updated_at();

drop trigger if exists trg_measurements_touch on public.measurements;
create trigger trg_measurements_touch
before update on public.measurements
for each row execute function public.touch_updated_at();

-- Recalcular acumulado mensual por pluviómetro y fecha
create or replace function public.rebuild_monthly_total(p_pluviometer_id uuid, p_measured_at timestamptz)
returns void
language plpgsql
as $$
declare
  v_year int;
  v_month int;
begin
  v_year := extract(year from p_measured_at at time zone 'utc');
  v_month := extract(month from p_measured_at at time zone 'utc');

  insert into public.monthly_totals (pluviometer_id, year, month, total_mm, measurement_count)
  values (
    p_pluviometer_id,
    v_year,
    v_month,
    coalesce((
      select sum(m.rainfall_mm)
      from public.measurements m
      where m.pluviometer_id = p_pluviometer_id
        and extract(year from m.measured_at at time zone 'utc') = v_year
        and extract(month from m.measured_at at time zone 'utc') = v_month
    ), 0),
    (
      select count(*)
      from public.measurements m
      where m.pluviometer_id = p_pluviometer_id
        and extract(year from m.measured_at at time zone 'utc') = v_year
        and extract(month from m.measured_at at time zone 'utc') = v_month
    )
  )
  on conflict (pluviometer_id, year, month)
  do update
    set total_mm = excluded.total_mm,
        measurement_count = excluded.measurement_count;
end;
$$;

create or replace function public.on_measurements_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.rebuild_monthly_total(new.pluviometer_id, new.measured_at);
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.rebuild_monthly_total(new.pluviometer_id, new.measured_at);
    if old.measured_at is distinct from new.measured_at or old.pluviometer_id is distinct from new.pluviometer_id then
      perform public.rebuild_monthly_total(old.pluviometer_id, old.measured_at);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.rebuild_monthly_total(old.pluviometer_id, old.measured_at);
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_measurements_monthly_totals on public.measurements;
create trigger trg_measurements_monthly_totals
after insert or update or delete on public.measurements
for each row execute function public.on_measurements_change();

-- RLS
alter table public.app_users enable row level security;
alter table public.pluviometers enable row level security;
alter table public.measurements enable row level security;
alter table public.monthly_totals enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.device_tokens enable row level security;

-- app_users policies
drop policy if exists "app_users_self_or_admin_select" on public.app_users;
create policy "app_users_self_or_admin_select"
on public.app_users for select
using (id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "app_users_admin_write" on public.app_users;
create policy "app_users_admin_write"
on public.app_users for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "app_users_self_insert_pending" on public.app_users;
create policy "app_users_self_insert_pending"
on public.app_users for insert
with check (
  id = public.current_user_id()
  and role = 'user'
  and status = 'pending'
  and pluviometer_id is null
);

-- pluviometers policies
drop policy if exists "pluviometers_own_or_admin_select" on public.pluviometers;
create policy "pluviometers_own_or_admin_select"
on public.pluviometers for select
using (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "pluviometers_own_insert" on public.pluviometers;
create policy "pluviometers_own_insert"
on public.pluviometers for insert
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "pluviometers_own_update_or_admin" on public.pluviometers;
create policy "pluviometers_own_update_or_admin"
on public.pluviometers for update
using (user_id = public.current_user_id() or public.current_user_role() = 'admin')
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');

-- measurements policies
drop policy if exists "measurements_own_or_admin_select" on public.measurements;
create policy "measurements_own_or_admin_select"
on public.measurements for select
using (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "measurements_own_insert_or_admin" on public.measurements;
create policy "measurements_own_insert_or_admin"
on public.measurements for insert
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "measurements_own_update_or_admin" on public.measurements;
create policy "measurements_own_update_or_admin"
on public.measurements for update
using (user_id = public.current_user_id() or public.current_user_role() = 'admin')
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "measurements_own_delete_or_admin" on public.measurements;
create policy "measurements_own_delete_or_admin"
on public.measurements for delete
using (user_id = public.current_user_id() or public.current_user_role() = 'admin');

-- monthly_totals policies
drop policy if exists "monthly_totals_own_or_admin_select" on public.monthly_totals;
create policy "monthly_totals_own_or_admin_select"
on public.monthly_totals for select
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.pluviometers p
    where p.id = monthly_totals.pluviometer_id
      and p.user_id = public.current_user_id()
  )
);

drop policy if exists "monthly_totals_admin_write" on public.monthly_totals;
create policy "monthly_totals_admin_write"
on public.monthly_totals for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- audit_log policies
drop policy if exists "audit_log_admin_rw" on public.audit_log;
create policy "audit_log_admin_rw"
on public.audit_log for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- notifications policies
drop policy if exists "notifications_own_or_admin_select" on public.notifications;
create policy "notifications_own_or_admin_select"
on public.notifications for select
using (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "notifications_own_update_or_admin" on public.notifications;
create policy "notifications_own_update_or_admin"
on public.notifications for update
using (user_id = public.current_user_id() or public.current_user_role() = 'admin')
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
on public.notifications for insert
with check (public.current_user_role() = 'admin');

-- device_tokens policies
drop policy if exists "device_tokens_own_or_admin_select" on public.device_tokens;
create policy "device_tokens_own_or_admin_select"
on public.device_tokens for select
using (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "device_tokens_own_insert_or_admin" on public.device_tokens;
create policy "device_tokens_own_insert_or_admin"
on public.device_tokens for insert
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');

drop policy if exists "device_tokens_own_update_or_admin" on public.device_tokens;
create policy "device_tokens_own_update_or_admin"
on public.device_tokens for update
using (user_id = public.current_user_id() or public.current_user_role() = 'admin')
with check (user_id = public.current_user_id() or public.current_user_role() = 'admin');
