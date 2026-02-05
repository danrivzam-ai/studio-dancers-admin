-- =============================================
-- Studio Dancers - Database Update V8
-- Descuentos en pagos + ciclo por clases
-- =============================================

-- Agregar columnas de descuento a la tabla payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_original_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_value TEXT DEFAULT NULL;

-- Agregar columnas de descuento a la tabla quick_payments (por consistencia)
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS discount_original_price DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT NULL;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS discount_value TEXT DEFAULT NULL;
