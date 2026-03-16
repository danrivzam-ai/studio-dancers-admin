-- ============================================================
-- v34: Agregar student_name a sale_plans
-- Permite registrar por separado:
--   customer_name  = pagador / representante
--   student_name   = alumna (la niña)
-- Para adultas o casos donde paga la misma persona, ambos
-- campos serán iguales o student_name estará vacío.
-- ============================================================

ALTER TABLE sale_plans
  ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Índice para búsquedas por nombre de alumna
CREATE INDEX IF NOT EXISTS idx_sale_plans_student_name
  ON sale_plans (student_name);

-- Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sale_plans'
  AND column_name IN ('customer_name', 'student_name')
ORDER BY ordinal_position;
