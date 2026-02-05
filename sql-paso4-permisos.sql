-- ============================================
-- PASO 4: Índices, RLS y políticas
-- Ejecutar AL FINAL
-- ============================================

-- Índices
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_active ON courses(active);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Habilitar RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Políticas courses
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON courses;
CREATE POLICY "Courses are viewable by everyone" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courses are insertable by everyone" ON courses;
CREATE POLICY "Courses are insertable by everyone" ON courses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Courses are updatable by everyone" ON courses;
CREATE POLICY "Courses are updatable by everyone" ON courses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Courses are deletable by everyone" ON courses;
CREATE POLICY "Courses are deletable by everyone" ON courses FOR DELETE USING (true);

-- Políticas products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products are insertable by everyone" ON products;
CREATE POLICY "Products are insertable by everyone" ON products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products are updatable by everyone" ON products;
CREATE POLICY "Products are updatable by everyone" ON products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Products are deletable by everyone" ON products;
CREATE POLICY "Products are deletable by everyone" ON products FOR DELETE USING (true);

-- Verificar
SELECT 'Paso 4 completado - Permisos configurados' as resultado;
SELECT COUNT(*) as total_cursos FROM courses;
SELECT COUNT(*) as total_productos FROM products;
