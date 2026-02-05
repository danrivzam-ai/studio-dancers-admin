-- Agregar columna de PIN de seguridad a school_settings
ALTER TABLE school_settings
ADD COLUMN IF NOT EXISTS security_pin VARCHAR(6) DEFAULT NULL;

-- Agregar columna deleted_at para soft delete en students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Agregar columna deleted_at para soft delete en sales
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Agregar columna deleted_at para soft delete en payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Agregar columna deleted_at para soft delete en quick_payments
ALTER TABLE quick_payments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Crear índices para mejorar performance en consultas de registros activos
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_quick_payments_deleted_at ON quick_payments(deleted_at);
