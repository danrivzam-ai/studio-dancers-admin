-- ── v42: permisos por rol en la base (RLS) ────────────────────────────────────
--
-- Problema (detectado oct-2026):
--   1. 48 tablas tenían políticas `TO authenticated USING (true)`: cualquier
--      sesión de Supabase Auth podía leer y modificar todo. El registro público
--      (signup) está habilitado, así que cualquiera podía crearse una cuenta,
--      confirmar su correo y obtener acceso total con la anon key del bundle.
--   2. `user_roles_auth_only` (ALL, USING auth.role() = 'authenticated') permitía
--      a cualquier sesión insertarse a sí misma como 'admin' (las políticas
--      permisivas se combinan con OR y anulaban "Admins can insert roles").
--   3. Los permisos por rol (viewer/contador = solo lectura) solo existían en la UI.
--
-- Solución:
--   - is_staff():  el usuario tiene alguna fila en user_roles.
--   - can_write(): rol admin, receptionist o supervisor.
--   - is_admin():  rol admin.
--   Cada tabla afectada queda con:
--     <tabla>_staff_read  FOR SELECT USING (is_staff())
--     <tabla>_staff_write FOR ALL    USING (can_write()) WITH CHECK (can_write())
--   user_roles: cada quien ve su propio rol; el admin ve y administra todos.
--
-- No afecta:
--   - Políticas `anon` existentes (catálogo público de cursos, subida de
--     comprobantes del portal, etc.).
--   - RPCs SECURITY DEFINER (portal de alumnas, instructoras) ni Edge Functions
--     (usan service role).
--   - audit_log_insert (se mantiene: el log es fire-and-forget desde cualquier app).
--
-- Idempotente: se puede ejecutar varias veces.

-- ── Helpers ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'receptionist', 'supervisor')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;

REVOKE ALL ON FUNCTION public.is_staff()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin()  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()  TO authenticated;

-- ── Tablas operativas: reemplazar "authenticated = todo" por staff/rol ───────
DO $$
DECLARE
  t   text;
  pol record;
  tables text[] := ARRAY[
    'asistencias', 'attendance', 'banks', 'bitacora_clases', 'cash_movements',
    'ciclos', 'class_log', 'class_plans', 'course_plans', 'course_progression',
    'cycle_evaluations', 'cycle_progression', 'cycles', 'evaluations',
    'expense_categories', 'expense_subcategories', 'expenses', 'gallery_photos',
    'import_logs', 'instructor_schedule', 'instructor_sessions', 'instructors',
    'invoice_items', 'invoice_sequences', 'invoices', 'leads', 'payment_details',
    'payment_periods', 'payments', 'products', 'progresion_bloques',
    'progresion_estado', 'progresion_items', 'progresion_plantillas',
    'quick_payments', 'receptionists', 'reportes_ciclo', 'sale_plan_payments',
    'sale_plans', 'sales', 'school_settings', 'student_notes', 'students',
    'tip_reactions', 'tips_curso', 'transfer_requests', 'weekly_tips'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabla % no existe, se omite', t;
      CONTINUE;
    END IF;

    -- Quitar solo las políticas abiertas a cualquier authenticated
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND roles::text LIKE '%authenticated%'
        AND (qual = 'true' OR (qual IS NULL AND with_check = 'true'))
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_staff_read') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff())', t || '_staff_read', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_staff_write') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_write()) WITH CHECK (public.can_write())', t || '_staff_write', t);
    END IF;
  END LOOP;
END $$;

-- ── audit_log: lectura solo staff (el insert público se mantiene) ────────────
DROP POLICY IF EXISTS audit_log_select_authenticated ON public.audit_log;
DROP POLICY IF EXISTS audit_log_staff_read ON public.audit_log;
CREATE POLICY audit_log_staff_read ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff());

-- ── user_roles: cerrar auto-asignación de roles ──────────────────────────────
DROP POLICY IF EXISTS user_roles_auth_only ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Las políticas "Admins can ..." tenían un caso de arranque
-- `OR NOT EXISTS (SELECT 1 FROM user_roles)`. Con la lectura restringida, un
-- usuario sin rol no ve filas y ese NOT EXISTS le daría true: podría
-- asignarse un rol. Se reemplazan por is_admin() (SECURITY DEFINER, sin RLS).
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_update ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin());
