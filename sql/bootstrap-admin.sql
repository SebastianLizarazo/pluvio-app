-- Bootstrap de administrador real (NO hardcodeado en schema principal)
-- Uso:
--   1) Reemplaza los placeholders __...__ por datos reales del usuario Clerk.
--   2) Ejecuta este script en Supabase SQL Editor (rol privilegiado).
--
-- Garantías:
-- - Idempotente vía UPSERT por `id` (clerk_user_id)
-- - Deja siempre `role='admin'` y `status='active'`
-- - Falla si no reemplazas placeholders para evitar promover IDs incorrectos

begin;

do $$
declare
  v_clerk_user_id text := '__CLERK_USER_ID__';
  v_document_id text := '__DOCUMENT_ID__';
  v_full_name text := '__FULL_NAME__';
  v_email text := '__EMAIL__';
begin
  if v_clerk_user_id = '__CLERK_USER_ID__'
     or v_document_id = '__DOCUMENT_ID__'
     or v_full_name = '__FULL_NAME__'
     or v_email = '__EMAIL__' then
    raise exception 'Debes reemplazar todos los placeholders (__CLERK_USER_ID__, __DOCUMENT_ID__, __FULL_NAME__, __EMAIL__) antes de ejecutar bootstrap-admin.sql';
  end if;

  insert into public.app_users (
    id,
    document_id,
    full_name,
    email,
    role,
    status
  )
  values (
    v_clerk_user_id,
    v_document_id,
    v_full_name,
    v_email,
    'admin',
    'active'
  )
  on conflict (id)
  do update set
    document_id = excluded.document_id,
    full_name = excluded.full_name,
    email = excluded.email,
    role = 'admin',
    status = 'active';
end $$;

commit;
