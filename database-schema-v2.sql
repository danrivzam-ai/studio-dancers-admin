-- =============================================
-- STUDIO DANCERS - ESQUEMA DE BASE DE DATOS V2
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. CONFIGURACIÓN DE LA ESCUELA
-- =============================================
CREATE TABLE IF NOT EXISTS school_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT DEFAULT 'Studio Dancers',
  address TEXT DEFAULT 'Alborada - Guayaquil',
  phone TEXT,
  email TEXT,
  logo_url TEXT DEFAULT '/logo.png',
  ruc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración inicial si no existe
INSERT INTO school_settings (id, name, address, logo_url)
VALUES (1, 'Studio Dancers', 'Alborada - Guayaquil', '/logo.png')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. BANCOS PARA TRANSFERENCIAS
-- =============================================
CREATE TABLE IF NOT EXISTS banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar bancos si no existen
INSERT INTO banks (name) VALUES
  ('Banco Bolivariano'),
  ('Banco del Austro'),
  ('Banco del Pacífico'),
  ('Banco de Guayaquil'),
  ('Banco Solidario'),
  ('Banco Internacional'),
  ('Banco Pichincha'),
  ('Cooperativa Jardín Azuayo'),
  ('Cooperativa JEP'),
  ('Produbanco')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3. CURSOS Y PROGRAMAS
-- =============================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,  -- Código único (ej: 'ballet-kids', 'camp-baby')
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'regular' CHECK (category IN ('regular', 'intensivo', 'camp', 'especial')),
  age_min INT DEFAULT 3,
  age_max INT DEFAULT 99,
  schedule TEXT,
  price DECIMAL(10,2) NOT NULL,
  price_type TEXT DEFAULT 'mes' CHECK (price_type IN ('mes', 'clase', 'programa')),
  allows_installments BOOLEAN DEFAULT false,
  installment_count INT DEFAULT 1,
  active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,  -- true = curso predeterminado del sistema
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar cursos predeterminados
INSERT INTO courses (code, name, category, age_min, age_max, schedule, price, price_type, is_default) VALUES
  -- Clases Regulares
  ('individual-adultos', 'Clase Individual Adultos Principiantes', 'regular', 18, 99, 'Horario a coordinar', 12.00, 'clase', true),
  ('ballet-adultos-semana', 'Ballet Adultos Principiantes', 'regular', 18, 99, 'Martes y Jueves 7:00 - 8:30 PM', 40.00, 'mes', true),
  ('ballet-adultos-sabados', 'Ballet Adultos Intensivo Sábados', 'regular', 18, 99, 'Sábados 5:30 - 7:30 PM', 40.00, 'mes', true),
  -- Sábados Intensivos
  ('sabados-baby', 'Sábados Intensivos - Baby', 'intensivo', 3, 5, '14:00 - 15:00', 75.00, 'programa', true),
  ('sabados-kids-teens', 'Sábados Intensivos - Kids/Teens', 'intensivo', 6, 16, '15:00 - 16:30', 75.00, 'programa', true),
  -- Dance Camp 2026
  ('camp-baby', 'Dance Camp 2026 - Baby Ballet', 'camp', 3, 5, '3:00 - 4:00 PM', 99.00, 'programa', true),
  ('camp-kids', 'Dance Camp 2026 - Grupo KIDS', 'camp', 6, 9, '4:00 - 5:30 PM', 99.00, 'programa', true),
  ('camp-teens', 'Dance Camp 2026 - Grupo TEENS', 'camp', 10, 16, '5:30 - 7:00 PM', 99.00, 'programa', true)
ON CONFLICT (code) DO NOTHING;

-- Actualizar los que permiten abonos
UPDATE courses SET allows_installments = true, installment_count = 2
WHERE code IN ('sabados-baby', 'sabados-kids-teens');

-- =============================================
-- 4. PRODUCTOS (ARTÍCULOS A LA VENTA)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT,
  active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar productos predeterminados
INSERT INTO products (code, name, price, is_default) VALUES
  ('camiseta', 'Camiseta', 10.00, true),
  ('zapatillas', 'Zapatillas Ballet Media Punta', 14.00, true)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 5. ESTUDIANTES (MEJORADO)
-- =============================================
-- Primero agregar columnas si no existen
DO $$
BEGIN
  -- Agregar columnas del pagador si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'parent_phone') THEN
    ALTER TABLE students ADD COLUMN parent_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'payer_name') THEN
    ALTER TABLE students ADD COLUMN payer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'payer_phone') THEN
    ALTER TABLE students ADD COLUMN payer_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'payer_cedula') THEN
    ALTER TABLE students ADD COLUMN payer_cedula TEXT;
  END IF;

  -- Agregar columnas para tracking de abonos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'total_program_price') THEN
    ALTER TABLE students ADD COLUMN total_program_price DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'amount_paid') THEN
    ALTER TABLE students ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'balance') THEN
    ALTER TABLE students ADD COLUMN balance DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'payment_status') THEN
    ALTER TABLE students ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'));
  END IF;
END $$;

-- =============================================
-- 6. PAGOS (MEJORADO)
-- =============================================
-- Agregar columnas adicionales a payments si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_type') THEN
    ALTER TABLE payments ADD COLUMN payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'installment', 'balance'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'bank_name') THEN
    ALTER TABLE payments ADD COLUMN bank_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transfer_receipt') THEN
    ALTER TABLE payments ADD COLUMN transfer_receipt TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payer_name') THEN
    ALTER TABLE payments ADD COLUMN payer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payer_cedula') THEN
    ALTER TABLE payments ADD COLUMN payer_cedula TEXT;
  END IF;
END $$;

-- =============================================
-- 7. VENTAS (MEJORADO)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'bank_name') THEN
    ALTER TABLE sales ADD COLUMN bank_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'transfer_receipt') THEN
    ALTER TABLE sales ADD COLUMN transfer_receipt TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'payment_method') THEN
    ALTER TABLE sales ADD COLUMN payment_method TEXT DEFAULT 'cash';
  END IF;
END $$;

-- =============================================
-- 8. VISTAS ÚTILES
-- =============================================

-- Vista de estudiantes con estado de pago y colores
CREATE OR REPLACE VIEW student_payment_status AS
SELECT
  s.*,
  c.name as course_name,
  c.price as course_price,
  c.price_type,
  c.allows_installments,
  CASE
    WHEN c.price_type = 'clase' THEN 'blue'
    WHEN c.price_type = 'programa' THEN
      CASE
        WHEN COALESCE(s.balance, c.price) <= 0 THEN 'green'
        WHEN COALESCE(s.amount_paid, 0) > 0 THEN 'orange'
        ELSE 'gray'
      END
    WHEN s.next_payment_date IS NULL THEN 'gray'
    WHEN s.next_payment_date < CURRENT_DATE THEN 'red'
    WHEN s.next_payment_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'orange'
    WHEN s.next_payment_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'yellow'
    ELSE 'green'
  END as color_status,
  CASE
    WHEN c.price_type = 'clase' THEN 'Por clase'
    WHEN c.price_type = 'programa' THEN
      CASE
        WHEN COALESCE(s.balance, c.price) <= 0 THEN 'Pagado'
        WHEN COALESCE(s.amount_paid, 0) > 0 THEN 'Abono pendiente'
        ELSE 'Pendiente'
      END
    WHEN s.next_payment_date IS NULL THEN 'Sin fecha'
    WHEN s.next_payment_date < CURRENT_DATE THEN 'Vencido'
    WHEN s.next_payment_date = CURRENT_DATE THEN 'Vence hoy'
    WHEN s.next_payment_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Por vencer'
    WHEN s.next_payment_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Próximo'
    ELSE 'Al día'
  END as status_label,
  CASE
    WHEN s.next_payment_date IS NOT NULL THEN s.next_payment_date - CURRENT_DATE
    ELSE 999
  END as days_until_due
FROM students s
LEFT JOIN courses c ON s.course_id = c.code
WHERE s.active = true;

-- Vista de deudores ordenados por prioridad
CREATE OR REPLACE VIEW debtors_priority AS
SELECT * FROM student_payment_status
WHERE color_status IN ('red', 'orange', 'yellow')
ORDER BY
  CASE color_status
    WHEN 'red' THEN 1
    WHEN 'orange' THEN 2
    WHEN 'yellow' THEN 3
  END,
  days_until_due ASC;

-- Vista de resumen de ingresos
CREATE OR REPLACE VIEW income_summary AS
SELECT
  'Mensualidades' as tipo,
  COUNT(*) as cantidad,
  SUM(amount) as total
FROM payments
WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT
  'Ventas' as tipo,
  COUNT(*) as cantidad,
  SUM(total) as total
FROM sales
WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE);

-- =============================================
-- 9. FUNCIONES ÚTILES
-- =============================================

-- Función para obtener estudiantes por curso con datos para exportación
CREATE OR REPLACE FUNCTION get_students_for_export(p_course_code TEXT DEFAULT NULL)
RETURNS TABLE (
  alumno TEXT,
  edad INT,
  telefono TEXT,
  email TEXT,
  representante TEXT,
  tel_representante TEXT,
  curso TEXT,
  horario TEXT,
  mensualidad DECIMAL,
  proximo_pago DATE,
  estado TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.name,
    s.age,
    COALESCE(s.phone, '-'),
    COALESCE(s.email, '-'),
    COALESCE(s.parent_name, '-'),
    COALESCE(s.parent_phone, '-'),
    COALESCE(c.name, 'Sin curso'),
    COALESCE(c.schedule, '-'),
    s.monthly_fee,
    s.next_payment_date,
    CASE
      WHEN s.next_payment_date IS NULL THEN 'Pendiente'
      WHEN s.next_payment_date < CURRENT_DATE THEN 'Vencido'
      ELSE 'Al día'
    END
  FROM students s
  LEFT JOIN courses c ON s.course_id = c.code
  WHERE s.active = true
    AND (p_course_code IS NULL OR s.course_id = p_course_code)
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (desarrollo - permitir todo)
DROP POLICY IF EXISTS "Allow all courses" ON courses;
DROP POLICY IF EXISTS "Allow all products" ON products;
DROP POLICY IF EXISTS "Allow all banks" ON banks;

CREATE POLICY "Allow all courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all banks" ON banks FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 11. ÍNDICES PARA RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(active);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
CREATE INDEX IF NOT EXISTS idx_students_next_payment ON students(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- =============================================
-- RESUMEN DE MEJORAS:
-- =============================================
-- 1. Cursos y productos en Supabase (persistentes)
-- 2. Sistema de abonos con tracking (amount_paid, balance)
-- 3. Colores de estado automáticos (red/orange/yellow/green)
-- 4. Datos del pagador en pagos
-- 5. Información de transferencia (banco, comprobante)
-- 6. Vistas optimizadas para reportes
-- 7. Índices para mejor rendimiento
-- =============================================
