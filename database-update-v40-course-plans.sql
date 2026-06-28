-- ============================================================================
-- Migración v40 — Catálogo de planes de pago por curso
-- ============================================================================
-- Permite definir promos de varios meses con precio fijo (no calculado por
-- multiplicación). Ej: Ballet Adultas $44/mes, plan trimestral $120 ($12 off).
--
-- Schema:
--   - course_plans: tabla nueva con CRUD vía RLS authenticated_only
--   - payments: 3 columnas opcionales (plan_id, plan_months, plan_name)
--     que son SNAPSHOT del plan al momento del cobro. Importante: si después
--     cambia el precio del plan en el catálogo, el comprobante histórico
--     sigue mostrando lo que se cobró realmente.
--
-- Sin riesgo en datos existentes:
--   - course_plans empieza vacía → cero impacto en cursos actuales
--   - columnas en payments son NULL por default → recibos viejos no se afectan
-- ============================================================================

-- 1. Tabla course_plans
CREATE TABLE IF NOT EXISTS public.course_plans (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  months     INTEGER NOT NULL CHECK (months > 0 AND months <= 36),
  price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.course_plans IS
  'Planes de pago por curso (mensual, trimestral, semestral, anual). Cada plan tiene precio fijo y duración en meses.';
COMMENT ON COLUMN public.course_plans.months IS
  'Cuántos meses cubre el pago. 1=mensual (default), 3=trimestral, 6=semestral, 12=anual. Max 36 (3 años).';
COMMENT ON COLUMN public.course_plans.price IS
  'Precio fijo del plan (NO se multiplica por meses). Puede ser menor que tarifa mensual × meses por promoción.';

CREATE INDEX IF NOT EXISTS idx_course_plans_course_active
  ON public.course_plans(course_id) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_course_plans_sort
  ON public.course_plans(course_id, sort_order) WHERE active = true;

-- 2. RLS: solo usuarios autenticados pueden ver/modificar
ALTER TABLE public.course_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'course_plans'
      AND policyname = 'course_plans_authenticated_only'
  ) THEN
    CREATE POLICY "course_plans_authenticated_only"
      ON public.course_plans
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

-- 3. Snapshot del plan en payments (idempotente)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.course_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_months INTEGER,
  ADD COLUMN IF NOT EXISTS plan_name TEXT;

COMMENT ON COLUMN public.payments.plan_id IS
  'Referencia al plan que se cobró. SET NULL si el plan se elimina (snapshot en plan_months/plan_name preserva el historial).';
COMMENT ON COLUMN public.payments.plan_months IS
  'SNAPSHOT: cuántos meses cubrió este pago. Si NULL, fue cobro mensual estándar.';
COMMENT ON COLUMN public.payments.plan_name IS
  'SNAPSHOT: nombre del plan al momento del cobro. Si el plan cambia después, el recibo histórico mantiene este texto.';

-- 4. Verificación
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_cols_added INTEGER;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='course_plans'
  ) INTO v_table_exists;

  SELECT COUNT(*) INTO v_cols_added
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='payments'
    AND column_name IN ('plan_id', 'plan_months', 'plan_name');

  IF v_table_exists AND v_cols_added = 3 THEN
    RAISE NOTICE 'Migración v40 OK — course_plans creada + 3 cols en payments';
  ELSE
    RAISE EXCEPTION 'Migración v40 INCOMPLETA: table=%, cols=%/3', v_table_exists, v_cols_added;
  END IF;
END$$;
