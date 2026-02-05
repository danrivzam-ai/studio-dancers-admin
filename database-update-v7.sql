-- V7: Soporte para paquetes de clases (Sábados Intensivos)
-- Agregar columna para rastrear clases usadas en un paquete
ALTER TABLE students ADD COLUMN IF NOT EXISTS classes_used INTEGER DEFAULT NULL;

-- Agregar columna para soporte de pausa/congelamiento de clase
ALTER TABLE students ADD COLUMN IF NOT EXISTS pause_date DATE DEFAULT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Agregar soporte para anulación de comprobantes
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voided_reason TEXT DEFAULT NULL;

ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS voided BOOLEAN DEFAULT FALSE;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE quick_payments ADD COLUMN IF NOT EXISTS voided_reason TEXT DEFAULT NULL;
