-- =============================================
-- Fix: Prevenir alumnos duplicados
-- Ejecutar DESPUÉS de limpiar los duplicados existentes
-- =============================================

-- 1. Índice UNIQUE parcial: no pueden existir dos alumnos ACTIVOS con la misma cédula
--    (WHERE cedula IS NOT NULL excluye registros sin cédula)
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_cedula_active
  ON students(cedula)
  WHERE cedula IS NOT NULL AND active = true;

-- 2. Índice UNIQUE parcial: no pueden existir dos alumnos ACTIVOS con el mismo
--    nombre en el mismo curso (protege contra doble-click / race condition)
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_name_course_active
  ON students(lower(trim(name)), course_id)
  WHERE active = true;

-- Verificar duplicados restantes (debe retornar 0 filas si limpiaste antes)
SELECT name, course_id, count(*) as total
FROM students
WHERE active = true
GROUP BY lower(trim(name)), course_id
HAVING count(*) > 1;
