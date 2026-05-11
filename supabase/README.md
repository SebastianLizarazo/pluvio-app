# Supabase setup

1. Crear proyecto en Supabase.
2. Ejecutar `sql/supabase-schema.sql` en SQL Editor.
3. Configurar JWT template de Clerk para incluir:
   - `sub`
   - `public_metadata.role`
4. Validar RLS con usuarios `user` y `admin`.

> Nota: La migración en `supabase/migrations` es referencia para CLI.
