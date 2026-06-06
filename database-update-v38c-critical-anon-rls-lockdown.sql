-- ── v38c: CIERRE CRÍTICO — políticas "Allow all" abiertas a `public`/`anon` ──
--
-- HALLAZGO (auditoría en vivo, 2026-06-06): Docenas de tablas con datos
-- sensibles tenían políticas RLS llamadas "Allow all" / "...by everyone" /
-- "<tabla>_all" otorgadas al rol `public` (que en Postgres/Supabase incluye
-- a `anon` — la API key pública embebida en el bundle JS de cualquier sitio)
-- con `USING (true) WITH CHECK (true)`.
--
-- Resultado: CUALQUIER PERSONA con la anon key de este proyecto (visible
-- inspeccionando el JS del sitio público) podía, SIN AUTENTICARSE:
--   - Leer / modificar / borrar TODA la tabla `students` (PII de alumnas:
--     nombres, cédulas, teléfonos, datos de padres)
--   - Leer / modificar / borrar `payments`, `quick_payments`, `sales`,
--     `sale_plans`, `sale_plan_payments` (todo el historial financiero)
--   - Leer / modificar / borrar `banks` (cuentas bancarias del estudio)
--   - Leer / modificar / borrar `school_settings` (config + tokens internos)
--   - Leer / modificar / borrar `expenses`, `cash_movements`, `import_logs`,
--     `reportes_ciclo`, `products`
--   - Leer la tabla `user_roles` completa (saber quién es admin)
--
-- RLS estaba "habilitado" en todas estas tablas (rls_enabled = true), pero
-- estas políticas con `USING(true)` otorgadas a `public` neutralizaban esa
-- protección por completo — es lo mismo que no tener RLS.
--
-- FIX: reemplazar cada política peligrosa por una version idéntica en
-- alcance (sigue siendo "todo permitido", sin filtros granulares — esto es
-- intencional para una operación de un solo panel admin) pero
-- **restringida a `TO authenticated`** — el mismo patrón ya usado de forma
-- segura en `cash_registers_auth_only`, `transfer_requests_auth_only`,
-- `user_roles_auth_only`, `receptionists_auth_all`, `instructors_auth_all`.
--
-- Ningún flujo legítimo se ve afectado:
--   - El panel admin/recepción/instructoras siempre usa sesión autenticada
--     (useAuth.js / Edge Function staff-login)
--   - El portal de alumnas también usa sesión autenticada — auth-alumna crea
--     "shadow users" reales de Supabase Auth y el frontend llama
--     `supabase.auth.setSession()` antes de tocar cualquier tabla
--     (ver src/lib/adultas.js → setPortalSession, llamado desde
--     ClientLoginPage ANTES de onLogin/navegación al dashboard)
--   - El catálogo público de cursos sigue funcionando vía la política ya
--     existente `courses_anon_read` (USING: active = true) — la mantenemos


-- ════════════════════════════════════════════════════════════════════════
-- Helper: por cada tabla, DROP de la política peligrosa + CREATE de la
-- versión segura (TO authenticated). Se nombra "<tabla>_authenticated_only"
-- para no chocar con nombres legacy y ser fácil de auditar a futuro.
-- ════════════════════════════════════════════════════════════════════════

-- students — PII de alumnas
DROP POLICY IF EXISTS "Allow all" ON public.students;
DROP POLICY IF EXISTS "students_authenticated_only" ON public.students;
CREATE POLICY "students_authenticated_only" ON public.students
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Nota: se conserva "students_own_courses" (anon SELECT, scoped a
-- get_instructor_from_session()) — es un mecanismo de portal/instructoras
-- separado y ya está acotado por una condición real, no por `true`.

-- payments — historial de pagos
DROP POLICY IF EXISTS "Allow all" ON public.payments;
DROP POLICY IF EXISTS "payments_authenticated_only" ON public.payments;
CREATE POLICY "payments_authenticated_only" ON public.payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- quick_payments
DROP POLICY IF EXISTS "Allow all quick_payments" ON public.quick_payments;
DROP POLICY IF EXISTS "quick_payments_authenticated_only" ON public.quick_payments;
CREATE POLICY "quick_payments_authenticated_only" ON public.quick_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales
DROP POLICY IF EXISTS "Allow all" ON public.sales;
DROP POLICY IF EXISTS "sales_authenticated_only" ON public.sales;
CREATE POLICY "sales_authenticated_only" ON public.sales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sale_plans
DROP POLICY IF EXISTS "sale_plans_all" ON public.sale_plans;
DROP POLICY IF EXISTS "sale_plans_authenticated_only" ON public.sale_plans;
CREATE POLICY "sale_plans_authenticated_only" ON public.sale_plans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sale_plan_payments
DROP POLICY IF EXISTS "sale_plan_payments_all" ON public.sale_plan_payments;
DROP POLICY IF EXISTS "sale_plan_payments_authenticated_only" ON public.sale_plan_payments;
CREATE POLICY "sale_plan_payments_authenticated_only" ON public.sale_plan_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- banks — cuentas bancarias del estudio
DROP POLICY IF EXISTS "Allow all banks" ON public.banks;
DROP POLICY IF EXISTS "banks_authenticated_only" ON public.banks;
CREATE POLICY "banks_authenticated_only" ON public.banks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- school_settings — config + tokens internos (telegram, factuplan, etc.)
DROP POLICY IF EXISTS "Allow all" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_authenticated_only" ON public.school_settings;
CREATE POLICY "school_settings_authenticated_only" ON public.school_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- expenses
DROP POLICY IF EXISTS "expenses_all" ON public.expenses;
DROP POLICY IF EXISTS "expenses_authenticated_only" ON public.expenses;
CREATE POLICY "expenses_authenticated_only" ON public.expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cash_movements
DROP POLICY IF EXISTS "cash_movements_all" ON public.cash_movements;
DROP POLICY IF EXISTS "cash_movements_authenticated_only" ON public.cash_movements;
CREATE POLICY "cash_movements_authenticated_only" ON public.cash_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- import_logs
DROP POLICY IF EXISTS "import_logs_all" ON public.import_logs;
DROP POLICY IF EXISTS "import_logs_authenticated_only" ON public.import_logs;
CREATE POLICY "import_logs_authenticated_only" ON public.import_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reportes_ciclo
DROP POLICY IF EXISTS "reportes_all" ON public.reportes_ciclo;
DROP POLICY IF EXISTS "reportes_ciclo_authenticated_only" ON public.reportes_ciclo;
CREATE POLICY "reportes_ciclo_authenticated_only" ON public.reportes_ciclo
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- products — sin uso anónimo detectado en el código (a diferencia de
-- `courses`, que sí tiene un catálogo público vía courses_anon_read)
DROP POLICY IF EXISTS "Allow all products" ON public.products;
DROP POLICY IF EXISTS "Products are deletable by everyone" ON public.products;
DROP POLICY IF EXISTS "Products are insertable by everyone" ON public.products;
DROP POLICY IF EXISTS "Products are updatable by everyone" ON public.products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "products_authenticated_only" ON public.products;
CREATE POLICY "products_authenticated_only" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- courses — SE CONSERVA el catálogo público de cursos activos
-- (courses_anon_read: anon SELECT WHERE active = true) y la política de
-- mutación ya correcta (courses_mutate_auth: authenticated). Solo se
-- eliminan las variantes legacy/duplicadas que daban `true` a `public`.
DROP POLICY IF EXISTS "Allow all courses" ON public.courses;
DROP POLICY IF EXISTS "Courses are deletable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Courses are insertable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Courses are updatable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "courses_select_anon" ON public.courses;
-- (se mantienen intactas: courses_anon_read y courses_mutate_auth)

-- user_roles — elimina el SELECT abierto a `public` (cualquiera podía ver
-- quién es admin). Las políticas "Admins can ..." y "user_roles_auth_only"
-- ya están correctamente acotadas (auth.uid() / auth.role()) y se conservan.
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;


-- ════════════════════════════════════════════════════════════════════════
-- Verificación — NINGUNA fila debe mostrar USING(true)/CHECK(true) con
-- roles que incluyan anon/public para estas tablas (excepto courses_anon_read,
-- que está correctamente acotada por `active = true`).
-- ════════════════════════════════════════════════════════════════════════
SELECT tablename, policyname, roles, cmd, qual AS using_expr, with_check
FROM pg_policies
WHERE tablename IN (
  'students','payments','quick_payments','sales','sale_plans','sale_plan_payments',
  'banks','school_settings','expenses','cash_movements','import_logs',
  'reportes_ciclo','products','courses','user_roles'
)
ORDER BY tablename, policyname;
