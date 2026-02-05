-- ============================================
-- PASO 3: Insertar datos predeterminados
-- Ejecutar DESPUÉS de los pasos 1 y 2
-- ============================================

-- Insertar cursos
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

-- Insertar productos (sin category en el INSERT para evitar error si no existe)
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

-- Actualizar categorías de productos
UPDATE products SET category = 'ropa' WHERE code = 'camiseta-studio';
UPDATE products SET category = 'calzado' WHERE code = 'zapatillas-punta';

SELECT 'Paso 3 completado - Datos insertados' as resultado;
