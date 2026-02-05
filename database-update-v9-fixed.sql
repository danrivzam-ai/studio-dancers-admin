-- =============================================
-- Studio Dancers - Database Update v9 (FIXED)
-- IMPORTANTE: Ejecutar en 3 PASOS SEPARADOS
-- =============================================

-- ============================================
-- PASO 1: EJECUTAR PRIMERO (solo esto)
-- ============================================

-- Crear tabla courses si no existe
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'regular',
    age_min INTEGER DEFAULT 3,
    age_max INTEGER DEFAULT 99,
    schedule TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_type TEXT DEFAULT 'mes',
    allows_installments BOOLEAN DEFAULT false,
    installment_count INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla products si no existe
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PASO 2: EJECUTAR SEGUNDO (solo esto)
-- Agregar columnas faltantes
-- ============================================

-- Agregar category a products si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'category'
    ) THEN
        ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'accesorios';
    END IF;
END $$;

-- Eliminar constraint viejo de price_type si existe
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_price_type_check;

-- Crear nuevo constraint que incluye 'paquete'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'courses_price_type_check'
    ) THEN
        ALTER TABLE courses ADD CONSTRAINT courses_price_type_check
        CHECK (price_type IN ('mes', 'paquete', 'programa', 'clase'));
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- ============================================
-- PASO 3: EJECUTAR TERCERO (solo esto)
-- Insertar datos predeterminados
-- ============================================

-- Insertar cursos predeterminados
INSERT INTO courses (code, name, description, category, age_min, age_max, schedule, price, price_type, allows_installments, installment_count, is_default, active)
VALUES
    ('individual-adultos', 'Clase Individual Adultos Principiantes', 'Clase privada por sesión', 'regular', 18, 99, 'Horario a coordinar', 12, 'clase', false, 1, true, true),
    ('ballet-adultos-semana', 'Ballet Adultos Principiantes', 'Clases regulares martes y jueves', 'regular', 18, 99, 'Martes y Jueves 7:00 - 8:30 PM', 40, 'mes', false, 1, true, true),
    ('ballet-adultos-sabados', 'Ballet Adultos Intensivo Sábados', 'Clases los sábados únicamente', 'regular', 18, 99, 'Sábados 5:30 - 7:30 PM', 40, 'mes', false, 1, true, true),
    ('sabados-intensivos-adultos', 'Sábados Intensivos Adultos', 'Paquete de 4 clases intensivas', 'intensivo', 18, 99, 'Sábados 2:00 - 4:00 PM', 40, 'paquete', false, 1, true, true),
    ('sabados-intensivos-ninos', 'Sábados Intensivos Niños', 'Paquete de 4 clases para niños', 'intensivo', 5, 12, 'Sábados 10:00 AM - 12:00 PM', 40, 'paquete', false, 1, true, true),
    ('camp-2026-kids', 'Dance Camp 2026 - Kids', 'Programa vacacional para niños 5-8 años', 'especial', 5, 8, '19-23 Febrero 2026', 99, 'programa', true, 2, true, true),
    ('camp-2026-tweens', 'Dance Camp 2026 - Tweens', 'Programa vacacional para tweens 9-12 años', 'especial', 9, 12, '19-23 Febrero 2026', 99, 'programa', true, 2, true, true),
    ('camp-2026-teens', 'Dance Camp 2026 - Teens', 'Programa vacacional para teens 13+ años', 'especial', 13, 17, '19-23 Febrero 2026', 99, 'programa', true, 2, true, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    price_type = EXCLUDED.price_type,
    updated_at = NOW();

-- Insertar productos predeterminados (SIN category en el INSERT)
INSERT INTO products (code, name, description, price, stock, is_default, active)
VALUES
    ('camiseta-studio', 'Camiseta Studio Dancers', 'Camiseta oficial de la escuela', 15, 20, true, true),
    ('zapatillas-punta', 'Zapatillas de Punta', 'Zapatillas profesionales de ballet', 45, 10, true, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    updated_at = NOW();

-- Actualizar category de productos después del insert
UPDATE products SET category = 'ropa' WHERE code = 'camiseta-studio' AND (category IS NULL OR category = 'accesorios');
UPDATE products SET category = 'calzado' WHERE code = 'zapatillas-punta' AND (category IS NULL OR category = 'accesorios');

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(active);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Habilitar RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para courses
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON courses;
CREATE POLICY "Courses are viewable by everyone" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courses are insertable by everyone" ON courses;
CREATE POLICY "Courses are insertable by everyone" ON courses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Courses are updatable by everyone" ON courses;
CREATE POLICY "Courses are updatable by everyone" ON courses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Courses are deletable by everyone" ON courses;
CREATE POLICY "Courses are deletable by everyone" ON courses FOR DELETE USING (true);

-- Políticas de acceso para products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are insertable by everyone" ON products;
CREATE POLICY "Products are insertable by everyone" ON products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products are updatable by everyone" ON products;
CREATE POLICY "Products are updatable by everyone" ON products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Products are deletable by everyone" ON products;
CREATE POLICY "Products are deletable by everyone" ON products FOR DELETE USING (true);

-- Verificar
SELECT 'Actualización completada' as mensaje;
SELECT COUNT(*) as total_cursos FROM courses WHERE active = true;
SELECT COUNT(*) as total_productos FROM products WHERE active = true;
