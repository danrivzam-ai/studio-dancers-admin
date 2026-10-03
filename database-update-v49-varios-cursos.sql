-- ============================================================
-- MIGRACION V49: una alumna puede estar inscrita en varios cursos
-- ============================================================
-- Modelo: un registro de students por cada inscripción (persona + curso),
-- cada uno con su propio ciclo, tarifa, pagos y recordatorios.
--
-- Antes: UNIQUE (cedula) entre activas → una adulta con cédula no podía tener
-- una segunda inscripción. Ahora: UNIQUE (cedula, course_id) entre activas →
-- no se puede repetir la misma persona en el MISMO curso, pero sí en otro.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'students'
             AND indexname = 'idx_students_unique_cedula_active') THEN
    DROP INDEX idx_students_unique_cedula_active;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'students'
                 AND indexname = 'idx_students_unique_cedula_course_active') THEN
    CREATE UNIQUE INDEX idx_students_unique_cedula_course_active
      ON students (cedula, course_id)
      WHERE cedula IS NOT NULL AND active = true;
  END IF;
END $$;
