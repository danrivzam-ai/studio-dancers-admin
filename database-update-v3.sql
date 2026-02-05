-- =============================================
-- STUDIO DANCERS - ACTUALIZACIÓN V3
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Agregar nuevas columnas a students
DO $$
BEGIN
  -- Cédula del alumno
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'cedula') THEN
    ALTER TABLE students ADD COLUMN cedula TEXT;
  END IF;

  -- Es menor de edad
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'is_minor') THEN
    ALTER TABLE students ADD COLUMN is_minor BOOLEAN DEFAULT true;
  END IF;

  -- Cédula del representante
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_cedula') THEN
    ALTER TABLE students ADD COLUMN parent_cedula TEXT;
  END IF;

  -- Email del representante
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_email') THEN
    ALTER TABLE students ADD COLUMN parent_email TEXT;
  END IF;

  -- Dirección del representante
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_address') THEN
    ALTER TABLE students ADD COLUMN parent_address TEXT;
  END IF;
END $$;

-- Crear tabla para pagos rápidos (clases diarias)
CREATE TABLE IF NOT EXISTS quick_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_cedula TEXT,
  customer_phone TEXT,
  class_type TEXT NOT NULL,
  class_name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  receipt_number TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Efectivo',
  bank_name TEXT,
  transfer_receipt TEXT,
  notes TEXT,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para quick_payments
ALTER TABLE quick_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all quick_payments" ON quick_payments;
CREATE POLICY "Allow all quick_payments" ON quick_payments FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_students_cedula ON students(cedula);
CREATE INDEX IF NOT EXISTS idx_students_parent_cedula ON students(parent_cedula);
CREATE INDEX IF NOT EXISTS idx_quick_payments_date ON quick_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_quick_payments_customer ON quick_payments(customer_cedula);

-- Actualizar cursos de Sábados Intensivos
UPDATE courses SET
  name = 'Sábados Intensivos - Baby Ballet',
  age_min = 3,
  age_max = 6,
  schedule = 'Sábados 2:00 - 3:00 PM (1 hora)',
  price = 75
WHERE code = 'sabados-baby';

-- Eliminar sabados-kids y sabados-teens antiguos
DELETE FROM courses WHERE code IN ('sabados-kids', 'sabados-teens', 'sabados-kids-teens');

-- Insertar nuevo curso Sábados Avanzado
INSERT INTO courses (code, name, category, age_min, age_max, schedule, price, price_type, allows_installments, installment_count, is_default)
VALUES ('sabados-avanzado', 'Sábados Intensivos - Avanzado', 'intensivo', 7, 99, 'Sábados 3:00 - 5:00 PM (2 horas)', 90.00, 'programa', true, 2, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  schedule = EXCLUDED.schedule,
  price = EXCLUDED.price,
  age_min = EXCLUDED.age_min,
  age_max = EXCLUDED.age_max;

-- =============================================
-- RESUMEN DE CAMBIOS V3:
-- =============================================
-- 1. Campo cédula para alumno
-- 2. Campo is_minor para indicar si es menor
-- 3. Campo cédula del representante
-- 4. Campo email del representante
-- 5. Campo dirección del representante
-- 6. Tabla quick_payments para pagos rápidos
-- 7. Actualización Sábados Intensivos:
--    - Baby Ballet: 3-6 años, 2-3PM, $75
--    - Avanzado: 7+ años, 3-5PM, $90
-- =============================================
