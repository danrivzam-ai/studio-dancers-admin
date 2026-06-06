-- ── v38d: Tres hallazgos adicionales del mismo escaneo en vivo ───────────────
--
-- 1) audit_log_select (public, USING true): exponía TODA la tabla de
--    auditoría —incluye old_data/new_data en JSONB (snapshots completos de
--    filas: pagos, alumnas, etc.), ip_address y user_agent— a cualquier
--    visitante anónimo. Se restringe a `authenticated`.
--
-- 2) sessions_select_own en `instructor_sessions` (anon, USING true): el
--    NOMBRE sugiere alcance "propio" pero la condición real era `true` —
--    es decir, CUALQUIERA podía leer la columna `token` (uuid) de las 67
--    filas existentes — tokens de sesión de instructoras, potencialmente
--    válidos. Esto habilita robo/secuestro de sesión. No se encontró
--    ninguna referencia a esta tabla en el código actual (frontend ni
--    Edge Functions) — probablemente resabio de un esquema de auth
--    anterior al actual (staff-login + shadow users). Se restringe a
--    `authenticated` por seguridad; si en el futuro se confirma que está
--    huérfana, puede evaluarse un DROP TABLE en una migración aparte.
--
-- 3) expense_categories_all / expense_subcategories_all (public, ALL,
--    USING true / CHECK true): permitían crear/editar/borrar categorías
--    y subcategorías de gastos sin autenticación — inconsistente con el
--    bloqueo recién aplicado a `expenses`. Se alinean al mismo patrón
--    `TO authenticated`.

-- 1) audit_log
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select_authenticated" ON public.audit_log;
CREATE POLICY "audit_log_select_authenticated" ON public.audit_log
  FOR SELECT TO authenticated USING (true);
-- Nota: se conserva "audit_log_insert" (public/INSERT) — el propio sistema
-- inserta registros de auditoría durante operaciones normales; no expone
-- lectura y el insert no filtra datos hacia afuera.

-- 2) instructor_sessions — cierre del token expuesto
-- (la tabla YA tenía "instructor_sessions_auth_all" FOR ALL TO authenticated
-- — cubre el SELECT necesario; solo había que eliminar la política anon
-- que exponía el token a cualquiera)
DROP POLICY IF EXISTS "sessions_select_own" ON public.instructor_sessions;
-- Se mantiene "sessions_insert" (anon/INSERT) tal cual estaba — no se
-- detectó uso actual, y un INSERT anónimo no filtra tokens existentes
-- hacia afuera (solo permitiría crear filas, no leerlas).

-- 3) expense_categories / expense_subcategories — alinear con `expenses`
DROP POLICY IF EXISTS "expense_categories_all" ON public.expense_categories;
DROP POLICY IF EXISTS "expense_categories_authenticated_only" ON public.expense_categories;
CREATE POLICY "expense_categories_authenticated_only" ON public.expense_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "expense_subcategories_all" ON public.expense_subcategories;
DROP POLICY IF EXISTS "expense_subcategories_authenticated_only" ON public.expense_subcategories;
CREATE POLICY "expense_subcategories_authenticated_only" ON public.expense_subcategories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificación
SELECT tablename, policyname, roles, cmd, qual AS using_expr
FROM pg_policies
WHERE tablename IN ('audit_log','instructor_sessions','expense_categories','expense_subcategories')
ORDER BY tablename, policyname;
