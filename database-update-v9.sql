-- =============================================
-- Studio Dancers - Database Update v9
-- Tablas para gestión de cursos y productos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de cursos/servicios
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
    price_type TEXT DEFAULT 'mes', -- 'mes', 'paquete', 'programa', 'clase'
    allows_installments BOOLEAN DEFAULT false,
    installment_count INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'accesorios',
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar cursos predeterminados si no existen
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
ON CONFLICT (code) DO NOTHING;

-- Insertar productos predeterminados si no existen
INSERT INTO products (code, name, description, category, price, stock, is_default, active)
VALUES
    ('camiseta-studio', 'Camiseta Studio Dancers', 'Camiseta oficial de la escuela', 'ropa', 15, 20, true, true),
    ('zapatillas-punta', 'Zapatillas de Punta', 'Zapatillas profesionales de ballet', 'calzado', 45, 10, true, true)
ON CONFLICT (code) DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(active);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Habilitar RLS (Row Level Security)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (permitir todo para usuarios autenticados y anónimos en dev)
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON courses;
CREATE POLICY "Courses are viewable by everyone" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courses are insertable by everyone" ON courses;
CREATE POLICY "Courses are insertable by everyone" ON courses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Courses are updatable by everyone" ON courses;
CREATE POLICY "Courses are updatable by everyone" ON courses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are insertable by everyone" ON products;
CREATE POLICY "Products are insertable by everyone" ON products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products are updatable by everyone" ON products;
CREATE POLICY "Products are updatable by everyone" ON products FOR UPDATE USING (true);

-- Verificar tablas creadas
SELECT 'Tablas courses y products creadas exitosamente' as mensaje;
SELECT COUNT(*) as total_cursos FROM courses WHERE active = true;
SELECT COUNT(*) as total_productos FROM products WHERE active = true;
