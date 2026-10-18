-- ============================================================
-- MIGRACION V51: honorarios con tarifa por horario y datos bancarios
-- ============================================================
-- payment_details.tarifa_hora → tarifa con la que se calculó cada fila del
--   comprobante (un horario puede tener tarifa propia distinta a la general).
--   En comprobantes anteriores se deduce como monto / horas_trabajadas.
-- instructors.banco_*        → cuenta donde se le paga a la instructora
--   (informativo; visible solo para el personal: RLS is_staff()).
-- Solo agrega columnas opcionales: no modifica datos existentes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'payment_details' AND column_name = 'tarifa_hora') THEN
    ALTER TABLE payment_details ADD COLUMN tarifa_hora NUMERIC(10,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instructors' AND column_name = 'banco_nombre') THEN
    ALTER TABLE instructors ADD COLUMN banco_nombre TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instructors' AND column_name = 'banco_tipo_cuenta') THEN
    ALTER TABLE instructors ADD COLUMN banco_tipo_cuenta TEXT DEFAULT NULL; -- 'ahorros' | 'corriente'
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instructors' AND column_name = 'banco_numero_cuenta') THEN
    ALTER TABLE instructors ADD COLUMN banco_numero_cuenta TEXT DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instructors' AND column_name = 'banco_titular') THEN
    ALTER TABLE instructors ADD COLUMN banco_titular TEXT DEFAULT NULL;       -- vacío = la misma instructora
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'instructors' AND column_name = 'banco_cedula_titular') THEN
    ALTER TABLE instructors ADD COLUMN banco_cedula_titular TEXT DEFAULT NULL;
  END IF;
END $$;
