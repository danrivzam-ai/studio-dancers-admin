-- ── v38b: Limpieza de políticas anónimas heredadas en `instructors` ──────────
-- Hallazgo en vivo (no estaban registradas en NINGÚN archivo de migración —
-- se crearon manualmente desde el dashboard en algún momento): la tabla
-- `instructors` tenía SEIS políticas que daban acceso a `anon`/`public`,
-- incluyendo dos de UPDATE. Es decir, cualquiera con la anon key (pública,
-- va en el bundle del frontend) podía LEER y MODIFICAR filas de instructoras
-- — incluyendo la columna `password` (hash bcrypt) — sin autenticarse.
--
-- Esto ya no se necesita: InstructoraLogin migró a la Edge Function
-- `staff-login`, que usa el service role (bypassa RLS) para validar
-- credenciales server-side. El frontend nunca vuelve a tocar esta tabla
-- con la anon key.

DROP POLICY IF EXISTS "instructors_read"          ON public.instructors;
DROP POLICY IF EXISTS "instructors_read_anon"     ON public.instructors;
DROP POLICY IF EXISTS "instructors_select"        ON public.instructors;
DROP POLICY IF EXISTS "instructors_select_anon"   ON public.instructors;
DROP POLICY IF EXISTS "instructors_update"        ON public.instructors;
DROP POLICY IF EXISTS "instructors_update_own"    ON public.instructors;

-- Duplicado funcional de instructors_auth_all (mismo rol, mismo alcance) —
-- se deja solo una política para evitar confusión futura.
DROP POLICY IF EXISTS "instructors_admin_all" ON public.instructors;

-- Verificación — debe listar SOLO "instructors_auth_all" (authenticated/ALL)
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'instructors'
ORDER BY policyname;
