-- =============================================
-- V14: Campos de ciclo de clases en cursos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar columnas de días de clase y clases por ciclo
ALTER TABLE courses ADD COLUMN IF NOT EXISTS class_days JSONB DEFAULT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS classes_per_cycle INTEGER DEFAULT NULL;

-- Actualizar CHECK constraint de price_type para incluir 'paquete'
-- Primero eliminar la constraint existente y recrearla
DO $$
BEGIN
  ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_price_type_check;
  ALTER TABLE courses ADD CONSTRAINT courses_price_type_check
    CHECK (price_type IN ('mes', 'clase', 'programa', 'paquete'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- Actualizar cursos predeterminados con sus días de clase
UPDATE courses SET class_days = '[2, 4]'::jsonb, classes_per_cycle = 8
WHERE code = 'ballet-adultos-semana';

UPDATE courses SET class_days = '[6]'::jsonb, classes_per_cycle = 4
WHERE code = 'ballet-adultos-sabados';

UPDATE courses SET class_days = '[6]'::jsonb, classes_per_cycle = 4
WHERE code = 'sabados-baby';

UPDATE courses SET class_days = '[6]'::jsonb, classes_per_cycle = 4
WHERE code = 'sabados-kids-teens';

UPDATE courses SET class_days = '[6]'::jsonb, classes_per_cycle = 4
WHERE code = 'sabados-avanzado';

-- Cursos custom de sábados creados por el usuario
UPDATE courses SET class_days = '[6]'::jsonb, classes_per_cycle = 4
WHERE code LIKE 'sabados-%' AND class_days IS NULL;
