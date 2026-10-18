-- ── v52: portal de instructoras (seguridad y cierre de ciclo) ────────────────
--
-- Problema 1 (seguridad):
--   El portal de instructoras (studio-dancers-instructoras) usaba RPC
--   SECURITY DEFINER ejecutables con la anon key. Con solo conocer el id de
--   una instructora se podía:
--     - rpc_create_instructor_session: crear una sesión a su nombre sin
--       contraseña y leer sus cursos y alumnas.
--     - rpc_first_login_change_password: ponerle contraseña si aún debía
--       cambiarla.
--     - rpc_upgrade_password_hash / rpc_record_login_failure /
--       rpc_reset_login_attempts: tocar su contraseña o su bloqueo.
--   Además, la política "sessions_insert" (anon, WITH CHECK true) dejaba
--   insertar en instructor_sessions un token elegido a mano para cualquier
--   instructora: mismo efecto que la primera RPC.
--
-- Problema 2 (cierre de ciclo roto):
--   v38c/v42 dejaron cycles (solo lectura) y reportes_ciclo (solo staff) sin
--   permiso para la sesión de la instructora: el portal no podía cerrar un
--   ciclo, abrir el siguiente ni guardar los reportes para las familias.
--
-- Solución:
--   - Desde oct-2026 el login, el token de sesión y el cambio de contraseña
--     los hace la Edge Function staff-login con el service role. Las RPC
--     quedan sin uso: se quita el EXECUTE a anon, authenticated y PUBLIC, y
--     se borra "sessions_insert".
--   - cycles: la instructora puede crear y actualizar ciclos de sus cursos.
--   - reportes_ciclo: la instructora lee y escribe reportes de ciclos de sus
--     cursos, siempre en estado 'pendiente'. No puede aprobar ni tocar uno ya
--     aprobado (eso sigue siendo del staff).
--   Todo acotado con get_instructor_from_session() + instructor_courses, igual
--   que cycle_evaluations.
--
-- No afecta:
--   - rpc_delete_instructor_session (cerrar sesión) ni rpc_get_tip_reactions.
--   - Las políticas staff de v42.
--
-- Idempotente: se puede ejecutar varias veces.

-- ── 1. Sesiones: nadie inserta tokens a mano ─────────────────────────────────
DROP POLICY IF EXISTS "sessions_insert" ON public.instructor_sessions;

-- ── 2. RPC del login viejo ───────────────────────────────────────────────────

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'rpc_create_instructor_session',
        'rpc_first_login_change_password',
        'rpc_upgrade_password_hash',
        'rpc_record_login_failure',
        'rpc_reset_login_attempts'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    RAISE NOTICE 'Cerrada: %', fn.sig;
  END LOOP;
END $$;

-- ── 3. cycles: crear y cerrar ciclos de sus cursos ──────────────────────────
DROP POLICY IF EXISTS "cycles_insert_own_courses" ON public.cycles;
CREATE POLICY "cycles_insert_own_courses" ON public.cycles
  FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.instructor_courses ic
    WHERE ic.instructor_id = public.get_instructor_from_session()
      AND ic.course_id = cycles.course_id
  ));

DROP POLICY IF EXISTS "cycles_update_own_courses" ON public.cycles;
CREATE POLICY "cycles_update_own_courses" ON public.cycles
  FOR UPDATE TO anon
  USING (EXISTS (
    SELECT 1 FROM public.instructor_courses ic
    WHERE ic.instructor_id = public.get_instructor_from_session()
      AND ic.course_id = cycles.course_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.instructor_courses ic
    WHERE ic.instructor_id = public.get_instructor_from_session()
      AND ic.course_id = cycles.course_id
  ));

-- ── 4. reportes_ciclo: reportes pendientes de ciclos de sus cursos ──────────
DROP POLICY IF EXISTS "reportes_ciclo_read_own_courses" ON public.reportes_ciclo;
CREATE POLICY "reportes_ciclo_read_own_courses" ON public.reportes_ciclo
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.cycles c
    JOIN public.instructor_courses ic ON ic.course_id = c.course_id
    WHERE c.id = reportes_ciclo.cycle_id
      AND ic.instructor_id = public.get_instructor_from_session()
  ));

DROP POLICY IF EXISTS "reportes_ciclo_insert_own_courses" ON public.reportes_ciclo;
CREATE POLICY "reportes_ciclo_insert_own_courses" ON public.reportes_ciclo
  FOR INSERT TO anon
  WITH CHECK (
    estado = 'pendiente'
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      JOIN public.instructor_courses ic ON ic.course_id = c.course_id
      WHERE c.id = reportes_ciclo.cycle_id
        AND ic.instructor_id = public.get_instructor_from_session()
    )
  );

DROP POLICY IF EXISTS "reportes_ciclo_update_own_courses" ON public.reportes_ciclo;
CREATE POLICY "reportes_ciclo_update_own_courses" ON public.reportes_ciclo
  FOR UPDATE TO anon
  USING (
    estado <> 'aprobado'
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      JOIN public.instructor_courses ic ON ic.course_id = c.course_id
      WHERE c.id = reportes_ciclo.cycle_id
        AND ic.instructor_id = public.get_instructor_from_session()
    )
  )
  WITH CHECK (
    estado = 'pendiente'
    AND EXISTS (
      SELECT 1 FROM public.cycles c
      JOIN public.instructor_courses ic ON ic.course_id = c.course_id
      WHERE c.id = reportes_ciclo.cycle_id
        AND ic.instructor_id = public.get_instructor_from_session()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.cycles, public.reportes_ciclo TO anon;

-- ── Verificación ─────────────────────────────────────────────────────────────
-- a) Ninguna fila: las RPC viejas ya no las ejecuta anon ni authenticated
SELECT p.proname, r.rolname
FROM pg_proc p
CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN (
    'rpc_create_instructor_session',
    'rpc_first_login_change_password',
    'rpc_upgrade_password_hash',
    'rpc_record_login_failure',
    'rpc_reset_login_attempts'
  )
  AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');

-- b) Políticas del portal en cycles y reportes_ciclo
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('cycles', 'reportes_ciclo', 'instructor_sessions')
  AND roles::text LIKE '%anon%'
ORDER BY tablename, policyname;
