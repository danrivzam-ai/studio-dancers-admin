-- ============================================================
-- v36 — Security Fixes (Supabase Linter)
-- Fixes: RLS disabled on 4 tables + SECURITY DEFINER views
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. VIEWS — Cambiar a SECURITY INVOKER
--    (las 3 vistas no se usan en el código actual, pero
--     conviene corregirlas para el linter)
-- ────────────────────────────────────────────────────────────
ALTER VIEW IF EXISTS public.daily_cash_summary  SET (security_invoker = true);
ALTER VIEW IF EXISTS public.income_summary      SET (security_invoker = true);
ALTER VIEW IF EXISTS public.debtors_priority    SET (security_invoker = true);


-- ────────────────────────────────────────────────────────────
-- 2. TABLA: tip_reactions
--    No se usa en el código. Habilitar RLS con acceso cerrado.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.tip_reactions ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados (admin) pueden operar
DROP POLICY IF EXISTS "tip_reactions_auth_all" ON public.tip_reactions;
CREATE POLICY "tip_reactions_auth_all"
  ON public.tip_reactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 3. TABLA: payment_periods
--    Solo acceso desde admin autenticado (useHonorarios)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.payment_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_periods_auth_all" ON public.payment_periods;
CREATE POLICY "payment_periods_auth_all"
  ON public.payment_periods
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 4. TABLA: payment_details
--    Solo acceso desde admin autenticado (useHonorarios)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_details_auth_all" ON public.payment_details;
CREATE POLICY "payment_details_auth_all"
  ON public.payment_details
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 5. TABLA: receptionists  ← CRÍTICO (columna password expuesta)
--
--    CONTEXTO: RecepcionLogin (panel admin) consulta esta tabla
--    sin sesión Supabase Auth (usa anon key) para autenticar
--    recepcionistas. Por eso necesitamos una política anon
--    restringida mientras migramos a RPC.
--
--    Política anon: solo SELECT de filas activas
--    Política authenticated (admin): CRUD completo
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.receptionists ENABLE ROW LEVEL SECURITY;

-- Admin autenticado: acceso total
DROP POLICY IF EXISTS "receptionists_auth_all" ON public.receptionists;
CREATE POLICY "receptionists_auth_all"
  ON public.receptionists
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon: solo SELECT de recepcionistas activos
-- (necesario para el login de recepción que usa anon key)
DROP POLICY IF EXISTS "receptionists_anon_select_active" ON public.receptionists;
CREATE POLICY "receptionists_anon_select_active"
  ON public.receptionists
  FOR SELECT
  TO anon
  USING (active = true);


-- ────────────────────────────────────────────────────────────
-- NOTA DE SEGURIDAD PENDIENTE:
-- La tabla receptionists sigue exponiendo hashes de contraseña
-- vía anon SELECT. La solución definitiva es migrar
-- RecepcionLogin a una RPC server-side:
--
--   CREATE OR REPLACE FUNCTION rpc_receptionist_login(
--     p_username TEXT, p_password TEXT
--   ) RETURNS TABLE (id UUID, name TEXT, role TEXT)
--   LANGUAGE plpgsql SECURITY DEFINER AS $$
--   BEGIN
--     RETURN QUERY SELECT r.id, r.name, 'receptionist'::TEXT
--     FROM receptionists r
--     WHERE r.username = p_username
--       AND r.password = crypt(p_password, r.password)
--       AND r.active = true;
--   END $$;
--
-- Una vez implementada la RPC, cambiar la política anon a:
--   DROP POLICY "receptionists_anon_select_active" ...
--   (sin reemplazo — login via RPC no necesita SELECT directo)
-- ────────────────────────────────────────────────────────────
