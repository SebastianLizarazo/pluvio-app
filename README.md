# PluvioApp

Aplicación híbrida (iOS + Android) para registro y análisis de datos pluviométricos.

## Stack

- React Native + Expo + Expo Router
- Clerk (autenticación)
- Supabase (DB + RLS)
- Sentry (monitoreo)
- SQLite (offline-first)
- Zustand + React Query
- React Native Paper

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_MAPS_API_KEY=
```

### Modo demo (sin credenciales reales)

Si solo quieres revisar el estado actual de la UI sin credenciales reales:

1. Copia `.env.example` a `.env`.
2. Asegúrate de usar `EXPO_PUBLIC_ENV=demo`.
3. Ejecuta:

```bash
npm run start
```

> En modo demo, autenticación, backend y mapas reales pueden no funcionar o mostrar datos no reales.

## Scripts

```bash
npm run start
npm run start:tunnel
npm run android
npm run ios
npm run web
npm run typecheck
```

### Calidad mínima (sin build)

- `npm run typecheck`: valida tipos TypeScript con `tsc --noEmit`.

> Este proyecto no tiene aún configuración de linter o runner de tests (ESLint/Jest/Vitest), por lo que no se expone `lint`/`test` hasta definir esas bases.

## SQL Supabase

Ejecutar `sql/supabase-schema.sql` en Supabase SQL Editor.

### Bootstrap de admin y patch RLS (`app_users`)

No hardcodees usuarios admin en `sql/supabase-schema.sql`. Usa scripts separados:

1. **Schema base**:

```bash
# En SQL Editor
sql/supabase-schema.sql
```

2. **Patch RLS para auto-registro seguro** (opción A: self-insert):

```bash
# En SQL Editor
sql/patch-app-users-rls-self-signup.sql
```

3. **Bootstrap admin real** (después de reemplazar placeholders):

```bash
# En SQL Editor
sql/bootstrap-admin.sql
```

Orden recomendado: `supabase-schema.sql` → `patch-app-users-rls-self-signup.sql` → `bootstrap-admin.sql`.

### Hardening aplicado (requerido antes de avanzar features)

1. **Un solo admin global**
   - Se aplica índice único parcial (`ux_app_users_single_admin`) para impedir múltiples usuarios con `role='admin'`.

2. **Self-signup seguro y orden de alta consistente**
   - `app_users` se inserta como `pending` con `pluviometer_id` nulo.
   - Luego se crea `pluviometers` y se vincula con RPC `set_my_pluviometer(...)`.

3. **Preferencias de notificación por RPC**
   - Se usa `set_notifications_enabled(...)` (security definer) para evitar abrir políticas `UPDATE` amplias.

4. **Aislamiento offline por usuario en sync**
   - La sincronización de pendientes ahora filtra por usuario autenticado (`getPendingMeasurementsByUser`).

5. **Autorización admin en Edge Functions**
   - `weekly-admin-summary` y `user-status-notify` ahora validan bearer token y rol admin antes de ejecutar operaciones con service role.

Además, en Clerk debes crear un **JWT Template** llamado `supabase` para que la app pueda enviar el token JWT a Supabase desde el cliente móvil.

Incluye:

- Tablas de negocio (`app_users`, `pluviometers`, `measurements`, `monthly_totals`, `audit_log`, `notifications`)
- Tabla de tokens push (`device_tokens`) para notificaciones remotas
- Políticas RLS por rol y ownership
- Trigger para recalcular `monthly_totals`

## Estructura inicial

```txt
/app
  /(auth)
  /(user)
  /(admin)
/components
/hooks
/stores
/lib
/utils
/constants
/types
/sql
```

## Estado actual

Se completó el setup base y un esqueleto funcional de módulos críticos:

1. Setup inicial Expo + Router + TypeScript strict.
2. Integración base de Clerk, Supabase y Sentry.
3. Diseño inicial offline-first con SQLite + sincronización por lotes + backoff.
4. Pantallas base de autenticación, dashboard usuario y panel administrador.
5. Script SQL completo con RLS y trigger de acumulados mensuales.
6. Guards de navegación por rol/estado consultando `app_users` (fuente de verdad en servidor).
7. Registro de medición conectado a usuario/pluviómetro reales (sin mocks).
8. Sync offline con política base last-write-wins por `updated_at` y auditoría de conflictos.

Siguientes pasos: conectar cada pantalla con datos reales, implementar edge functions (emails/resúmenes), notificaciones remotas y exportación con preview completo.

## Edge Functions

Se añadieron funciones en `supabase/functions/`:

- `weekly-admin-summary`
- `user-status-notify`

Revisar `supabase/functions/README.md` para secrets y payload.

Incluye scripts útiles:

```bash
npm run supabase:functions:serve
npm run supabase:functions:deploy
npm run supabase:functions:logs
```

Setup local rápido para Functions:

1. Copia `.env.local.example` a `.env.local`.
2. Completa `SUPABASE_PROJECT_REF` y secrets requeridos.
3. Exporta `SUPABASE_PROJECT_REF` en tu shell para deploy/logs remotos.
4. Levanta funciones localmente:

```bash
npm run supabase:functions:serve
```

5. Deploy remoto (requiere `SUPABASE_PROJECT_REF`):

```bash
npm run supabase:functions:deploy
```

6. Consulta logs del proyecto remoto (requiere `SUPABASE_PROJECT_REF` en entorno):

```bash
npm run supabase:functions:logs
```

> Si tu versión de Supabase CLI no soporta logs por terminal, el script abre/indica el Dashboard de Functions.

## Pruebas en celular real (antes de desplegar)

### Opción A — Expo Go (rápida para QA funcional)

> Ideal para validar flujos (login, registro, dashboard, etc.) antes de release.

1. Instala **Expo Go** en tu celular:
   - Android: Play Store
   - iOS: App Store
2. En tu PC, ejecuta:

```bash
npm run start
```

3. Escanea el QR:
   - Android: desde Expo Go
   - iOS: cámara o Expo Go
4. Si no conecta por red local, usa túnel:

```bash
npm run start:tunnel
```

#### Requisitos de conexión

- PC y celular en la misma Wi‑Fi (si usas LAN)
- Firewall permitiendo Node/Expo
- VPN desactivada (si rompe descubrimiento local)

### Opción B — Android por USB (más estable)

1. Activa **Opciones de desarrollador** + **Depuración USB** en Android.
2. Conecta el cable USB.
3. Verifica dispositivo:

```bash
adb devices
```

4. Ejecuta la app en Android:

```bash
npm run android
```

### Opción C — Dev Build (recomendado para validación pre-producción)

Usa Dev Build cuando dependencias nativas no estén soportadas en Expo Go o quieras validar comportamiento más cercano a producción.

Ejemplo:

```bash
npx expo prebuild
npx expo run:android
```

En iOS necesitas macOS para build local nativo.

## Checklist de release (staging / producción)

### 1) Configuración y secretos

- [ ] `.env` correcto para el ambiente objetivo
- [ ] Clerk JWT template `supabase` configurado
- [ ] Secrets de funciones cargados en Supabase:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM`
- [ ] `EXPO_PUBLIC_SENTRY_DSN` y `EXPO_PUBLIC_ENV` correctos

### 2) Base de datos y seguridad

- [ ] `sql/supabase-schema.sql` aplicado en el entorno objetivo
- [ ] RLS validado con usuario `user` y `admin`
- [ ] Trigger de `monthly_totals` verificado

### 3) Edge Functions

- [ ] Deploy de funciones:

```bash
npm run supabase:functions:deploy
```

- [ ] Scheduler semanal activo para `weekly-admin-summary`
- [ ] Prueba manual de `user-status-notify` y revisión de logs

### 4) Pruebas funcionales mínimas (smoke test)

- [ ] Registro + login + recuperación
- [ ] Flujo pending/active/inactive
- [ ] Registro de medición offline y sincronización online
- [ ] Dashboard, historial, mapa, análisis
- [ ] Exportación CSV/XLSX
- [ ] Notificaciones locales + centro in-app
- [ ] Acciones admin (aprobar/rechazar/eliminar) + auditoría

### 5) Observabilidad y rollback

- [ ] Sentry recibiendo eventos del ambiente correcto
- [ ] Logs de funciones sin errores críticos
- [ ] Plan de rollback definido:
  - [ ] revertir deploy de funciones
  - [ ] revertir cambios SQL en ventana controlada
  - [ ] deshabilitar scheduler temporalmente si hay incidentes
