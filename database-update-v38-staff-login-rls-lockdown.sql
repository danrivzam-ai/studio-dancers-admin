-- ── v38: Cierre de acceso anónimo a receptionists / instructors ──────────────
-- CONTEXTO: RecepcionLogin e InstructoraLogin migraron a la Edge Function
-- `staff-login`, que valida credenciales server-side con el service role
-- (bypassa RLS por diseño). El frontend YA NO consulta estas tablas
-- directamente con la anon key para autenticar — por lo tanto cualquier
-- política que permita SELECT anónimo sobre ellas (necesaria antes para que
-- el login funcionara desde el navegador) queda obsoleta y solo añade
-- superficie de ataque (expone username + hash de contraseña a `anon`).
--
-- Esta migración:
--   1. Elimina la política anon de `receptionists` creada en v36 como parche
--      temporal (su propia nota decía: "la solución definitiva es migrar a
--      RPC/Edge Function — una vez implementada, eliminar esta política").
--   2. Asegura que `instructors` tenga RLS habilitado SIN acceso anónimo.
--   3. Mantiene acceso completo para `authenticated` (panel admin:
--      ReceptionistManager / InstructorManager) y para `service_role`
--      (Edge Functions, que lo bypassa de todas formas).

-- ────────────────────────────────────────────────────────────
-- 1. receptionists — remover el SELECT anónimo (ya no se usa)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "receptionists_anon_select_active" ON public.receptionists;

ALTER TABLE public.receptionists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receptionists_auth_all" ON public.receptionists;
CREATE POLICY "receptionists_auth_all"
  ON public.receptionists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2. instructors — asegurar RLS habilitado, sin acceso anónimo
--    (la columna `password` con el hash bcrypt vive aquí)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Por si alguna vez existió una política anónima creada manualmente
DROP POLICY IF EXISTS "instructors_anon_select" ON public.instructors;
DROP POLICY IF EXISTS "instructors_anon_select_active" ON public.instructors;
DROP POLICY IF EXISTS "instructors_anon_all" ON public.instructors;

DROP POLICY IF EXISTS "instructors_auth_all" ON public.instructors;
CREATE POLICY "instructors_auth_all"
  ON public.instructors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. Verificación — debe listar SOLO políticas "..._auth_all"
--    (ninguna con rol "anon")
-- ────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('receptionists', 'instructors')
ORDER BY tablename, policyname;
