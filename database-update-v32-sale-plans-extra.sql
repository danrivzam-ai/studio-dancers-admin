-- ============================================================
-- v32: Agregar columnas faltantes a sale_plans
--      customer_phone, student_id, student_name, student_course
-- Fecha: 2026-03-12
-- ============================================================

-- Teléfono del cliente (para WhatsApp)
ALTER TABLE sale_plans
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Referencia a la alumna del sistema (opcional)
ALTER TABLE sale_plans
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- Nombre de la alumna (cuando el cliente es el representante)
ALTER TABLE sale_plans
  ADD COLUMN IF NOT EXISTS student_name TEXT;

-- Curso o programa de la alumna
ALTER TABLE sale_plans
  ADD COLUMN IF NOT EXISTS student_course TEXT;

-- Índice para buscar planes por alumna
CREATE INDEX IF NOT EXISTS idx_sale_plans_student ON sale_plans(student_id);
