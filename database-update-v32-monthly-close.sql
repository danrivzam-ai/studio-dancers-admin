-- =====================================================
-- Studio Dancers v32: Cierre mensual contable
-- =====================================================
-- Ejecutar en Supabase SQL Editor

-- 1. Tabla de cierres mensuales
CREATE TABLE IF NOT EXISTS monthly_closes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo             DATE        NOT NULL,        -- Primer día del mes: 2026-03-01

  -- Ingresos desglosados
  ingresos_alumnos    NUMERIC(12,2) DEFAULT 0,     -- payments
  ingresos_rapidos    NUMERIC(12,2) DEFAULT 0,     -- quick_payments
  ingresos_ventas     NUMERIC(12,2) DEFAULT 0,     -- sales
  ingresos_planes     NUMERIC(12,2) DEFAULT 0,     -- sale_plan_payments
  total_ingresos      NUMERIC(12,2) DEFAULT 0,

  -- Egresos
  total_egresos       NUMERIC(12,2) DEFAULT 0,

  -- Saldo
  saldo_neto          NUMERIC(12,2) DEFAULT 0,

  -- Estadísticas de alumnas al momento del cierre
  alumnas_activas     INTEGER DEFAULT 0,
  alumnas_mora        INTEGER DEFAULT 0,
  alumnas_inactivas   INTEGER DEFAULT 0,

  -- Metadata
  notas               TEXT,
  cerrado_por         UUID REFERENCES auth.users(id),
  cerrado_por_nombre  TEXT,
  closed_at           TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT monthly_closes_periodo_unique UNIQUE (periodo)
);

-- 2. RLS: solo usuarios autenticados pueden leer; solo admin puede insertar
ALTER TABLE monthly_closes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_closes_read"   ON monthly_closes;
DROP POLICY IF EXISTS "monthly_closes_insert" ON monthly_closes;

CREATE POLICY "monthly_closes_read"
  ON monthly_closes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "monthly_closes_insert"
  ON monthly_closes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Índice para consultas por periodo
CREATE INDEX IF NOT EXISTS idx_monthly_closes_periodo ON monthly_closes (periodo DESC);

-- 4. Verificar
SELECT 'Tabla monthly_closes creada OK' AS status;
