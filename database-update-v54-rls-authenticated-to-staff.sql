-- ── v54: cerrar las políticas "cualquier sesión" que v42 no alcanzó ─────────
--
-- Problema (detectado oct-2026):
--   1. v42 reemplazó las políticas `TO authenticated USING (true)`, pero no
--      las que usan `auth.role() = 'authenticated'` (TO public). Son lo mismo:
--      cualquier sesión de Supabase Auth cumple. Con el registro público
--      habilitado, cualquiera podía crearse una cuenta y leer o modificar:
--        announcements, cash_registers, courses, gallery_photos,
--        instructor_courses, instructor_rhythms, inventory_movements,
--        monthly_closes, transfer_requests.
--      Las alumnas del portal también tienen sesión (shadow users de
--      auth-alumna) y cumplían esa condición.
--   2. instructor_schedule_anon_read (anon, USING true) exponía a cualquiera
--      con la anon key el horario de todas las instructoras con su tarifa por
--      hora (v51).
--
-- Solución:
--   - Cada tabla del punto 1 queda como en v42:
--       <tabla>_staff_read  FOR SELECT USING (is_staff())
--       <tabla>_staff_write FOR ALL    USING (can_write()) WITH CHECK (can_write())
--   - instructor_schedule: anon solo lee los horarios de la instructora de la
--     sesión (portal de instructoras, header x-session-token).
--
-- Quién escribe estas tablas (revisado en src/ de Admin, portal de alumnas y
-- portal de instructoras): solo el panel admin y recepción (rol receptionist,
-- incluido en can_write). El portal de alumnas solo lee announcements y sube
-- comprobantes por RPC SECURITY DEFINER.
--
-- No afecta:
--   - Lecturas públicas existentes: announcements_select_anon,
--     courses (activos), gallery_photos (activas), instructor_courses y
--     instructor_rhythms (select anon), y el INSERT anon de transfer_requests.
--   - audit_log_insert (fire-and-forget desde cualquier app).
--
-- Idempotente: se puede ejecutar varias veces.

DO $$
DECLARE
  t text;
  pol record;
  tables text[] := ARRAY[
    'announcements', 'cash_registers', 'courses', 'gallery_photos',
    'instructor_courses', 'instructor_rhythms', 'inventory_movements',
    'monthly_closes', 'transfer_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Tabla % no existe, se omite', t;
      CONTINUE;
    END IF;

    -- Quitar las políticas que solo piden "tener sesión"
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
        AND (coalesce(qual, '') ~ 'auth\.role\(\)' OR coalesce(with_check, '') ~ 'auth\.role\(\)')
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      RAISE NOTICE 'Quitada: %.%', t, pol.policyname;
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_staff_read') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_staff())', t || '_staff_read', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_staff_write') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.can_write()) WITH CHECK (public.can_write())', t || '_staff_write', t);
    END IF;
  END LOOP;
END $$;

-- ── instructor_schedule: anon solo ve el horario propio ──────────────────────
DROP POLICY IF EXISTS "instructor_schedule_anon_read" ON public.instructor_schedule;
DROP POLICY IF EXISTS "instructor_schedule_read_own_session" ON public.instructor_schedule;
CREATE POLICY "instructor_schedule_read_own_session" ON public.instructor_schedule
  FOR SELECT TO anon
  USING (instructor_id = public.get_instructor_from_session());

-- ── Verificación ─────────────────────────────────────────────────────────────
-- Ninguna fila: no quedan políticas que solo pidan tener sesión
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (coalesce(qual, '') ~ 'auth\.role\(\)' OR coalesce(with_check, '') ~ 'auth\.role\(\)');
