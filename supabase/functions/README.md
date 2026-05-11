# Supabase Edge Functions

## Funciones incluidas

- `weekly-admin-summary`
  - Genera resumen semanal por usuario (registros + mm)
  - Envía push y email a admins activos
  - Desactiva tokens push inválidos (`device_tokens.active = false`)

- `user-status-notify`
  - Notifica al usuario cuando su estado cambia (approved/rejected)
  - Inserta notificación in-app
  - Envía push y email
  - Desactiva tokens push inválidos

## Variables de entorno requeridas

En Supabase Functions Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM` (opcional)

## Desarrollo local

1. En raíz del proyecto, copia `.env.local.example` a `.env.local`.
2. Completa las variables necesarias (incluyendo `SUPABASE_PROJECT_REF`).
3. Ejecuta desde la raíz:

```bash
npm run supabase:functions:serve
```

4. Para logs del proyecto remoto:

```bash
npm run supabase:functions:logs
```

> El script de logs ahora valida `SUPABASE_PROJECT_REF` y funciona en Windows/macOS/Linux sin depender de expansión POSIX.

## Invocación esperada

### user-status-notify

Payload JSON:

```json
{
  "userId": "clerk_user_id",
  "action": "approved"
}
```

### weekly-admin-summary

Sin payload obligatorio. Se recomienda scheduler semanal (lunes).

## Scheduler recomendado

1. Desplegar funciones:

```bash
npm run supabase:functions:deploy
```

2. Crear cron semanal (lunes 08:00 UTC) desde Supabase Dashboard o SQL:

```sql
select cron.schedule(
  'weekly-admin-summary-monday',
  '0 8 * * 1',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/weekly-admin-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

> Reemplaza `<PROJECT_REF>` y `<SUPABASE_SERVICE_ROLE_KEY>` por tus valores reales.
