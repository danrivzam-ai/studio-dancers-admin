-- ============================================================
-- MIGRACION V55: tarifa "solo este ciclo" antes del primer pago
-- ============================================================
-- next_monthly_fee_pending = true → la tarifa especial (monthly_fee) es para el
-- ciclo que ABRIRÁ el próximo pago (alumna nueva o ciclo anterior terminado).
-- Ese pago no aplica next_monthly_fee; lo marca como false. El siguiente ciclo
-- ya se cobra con next_monthly_fee.
-- Solo agrega una columna opcional: no modifica datos existentes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'students' AND column_name = 'next_monthly_fee_pending') THEN
    ALTER TABLE students ADD COLUMN next_monthly_fee_pending BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
