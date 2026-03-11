-- ============================================================
-- v30: Ventas en Abonos (sale_plans + sale_plan_payments)
-- Fecha: 2026-03-10
-- ============================================================

-- ── Tabla principal de planes de pago ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cliente
  customer_name       TEXT NOT NULL,
  customer_cedula_ruc TEXT,                        -- preparado para SRI
  customer_email      TEXT,                        -- preparado para SRI
  customer_address    TEXT,                        -- preparado para SRI

  -- Artículos vendidos (snapshot al momento de la venta)
  items               JSONB NOT NULL DEFAULT '[]', -- [{name, quantity, unit_price, product_code}]

  -- Montos
  total_amount        DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  amount_paid         DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),

  -- Estado
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','partial','paid','cancelled')),
  delivered           BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,

  -- Facturación (SRI - uso futuro)
  requires_invoice    BOOLEAN NOT NULL DEFAULT false,

  -- Auditoría
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          TEXT
);

-- ── Pagos individuales (cada abono) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_plan_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID NOT NULL REFERENCES sale_plans(id) ON DELETE CASCADE,

  amount              DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method      TEXT NOT NULL CHECK (payment_method IN ('Efectivo','Transferencia')),
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  installment_number  INT NOT NULL DEFAULT 1,      -- 1, 2, 3...
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          TEXT
);

-- ── Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sale_plans_status       ON sale_plans(status);
CREATE INDEX IF NOT EXISTS idx_sale_plans_created_at   ON sale_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_plan_payments_plan ON sale_plan_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_sale_plan_payments_date ON sale_plan_payments(payment_date);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE sale_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_plan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_plans_all"         ON sale_plans;
DROP POLICY IF EXISTS "sale_plan_payments_all" ON sale_plan_payments;

CREATE POLICY "sale_plans_all"         ON sale_plans         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "sale_plan_payments_all" ON sale_plan_payments FOR ALL USING (true) WITH CHECK (true);

-- ── Verificación ──────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('sale_plans','sale_plan_payments');
