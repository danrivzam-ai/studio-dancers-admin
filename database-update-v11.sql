-- ============================================================
-- MIGRACION V11: Separar fecha de pago de fecha de inicio de ciclo
-- ============================================================
-- payment_date = fecha real en que entró el dinero (contable/caja)
-- cycle_start_date = desde cuándo empieza el ciclo de clases (operativo)
-- days_late = días de atraso al momento del pago (para reportes de puntualidad)

-- 1. Agregar cycle_start_date a payments (NULL = usa payment_date por compatibilidad)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'cycle_start_date'
    ) THEN
        ALTER TABLE payments ADD COLUMN cycle_start_date DATE;
    END IF;
END $$;

-- 2. Agregar days_late a payments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'days_late'
    ) THEN
        ALTER TABLE payments ADD COLUMN days_late INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Índices para reportes futuros
CREATE INDEX IF NOT EXISTS idx_payments_cycle_start_date ON payments(cycle_start_date);
CREATE INDEX IF NOT EXISTS idx_payments_days_late ON payments(days_late);

-- 4. Comentarios descriptivos
COMMENT ON COLUMN payments.cycle_start_date IS 'Fecha de inicio del ciclo de clases. NULL = usa payment_date (retro-compatible)';
COMMENT ON COLUMN payments.days_late IS 'Días de atraso al momento del pago (0 = a tiempo o anticipado)';
