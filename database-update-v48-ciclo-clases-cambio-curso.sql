-- ============================================================
-- MIGRACION V48: clases del ciclo y cambio de curso programado
-- ============================================================
-- cycle_classes    → total de clases del ciclo actual cuando no es el estándar
--                    del curso: meses adelantados (8 × 3 = 24), clases
--                    congeladas (8 + 1 = 9) o conversión por cambio de curso.
--                    NULL = usar classes_per_cycle del curso.
-- frozen_classes   → clases congeladas en el ciclo actual (informativo; se
--                    reinicia al registrar el pago del siguiente ciclo).
-- next_course_id   → cambio de curso programado para la próxima renovación.
-- next_monthly_fee → tarifa que tendrá en ese curso (NULL = precio del curso).
--
-- Solo agrega columnas opcionales: no modifica datos existentes.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'students' AND column_name = 'cycle_classes') THEN
    ALTER TABLE students ADD COLUMN cycle_classes INTEGER DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'students' AND column_name = 'frozen_classes') THEN
    ALTER TABLE students ADD COLUMN frozen_classes INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'students' AND column_name = 'next_course_id') THEN
    ALTER TABLE students ADD COLUMN next_course_id TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'students' AND column_name = 'next_monthly_fee') THEN
    ALTER TABLE students ADD COLUMN next_monthly_fee NUMERIC(10,2) DEFAULT NULL;
  END IF;
END $$;
