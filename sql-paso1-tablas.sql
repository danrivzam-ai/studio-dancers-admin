-- ============================================
-- PASO 1: Crear/actualizar tablas
-- Ejecutar esto PRIMERO
-- ============================================

-- Tabla courses
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

-- Tabla products (sin category inicialmente)
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

SELECT 'Paso 1 completado - Tablas creadas' as resultado;
