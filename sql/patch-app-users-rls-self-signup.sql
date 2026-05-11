-- Patch RLS para self-signup en public.app_users
-- Objetivo: habilitar INSERT del propio usuario autenticado sin permitir escalación.
--
-- Seguridad aplicada en WITH CHECK:
-- - id = current_user_id()
-- - role = 'user'
-- - status = 'pending'
-- - pluviometer_id NULL o perteneciente al mismo usuario autenticado
--
-- Nota: este script NO modifica la policy admin existente (`app_users_admin_write`).

begin;

drop policy if exists "app_users_self_insert_pending" on public.app_users;
create policy "app_users_self_insert_pending"
on public.app_users for insert
with check (
  id = public.current_user_id()
  and role = 'user'
  and status = 'pending'
  and pluviometer_id is null
);

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

create unique index if not exists ux_app_users_single_admin
  on public.app_users ((role))
  where role = 'admin';

commit;
