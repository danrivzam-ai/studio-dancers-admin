-- ============================================
-- PASO 2: Agregar columna category a products
-- Ejecutar DESPUÉS del paso 1
-- ============================================

-- Agregar columna category si no existe
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'accesorios';

-- Eliminar constraint viejo de price_type
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_price_type_check;

SELECT 'Paso 2 completado - Columnas agregadas' as resultado;
