-- ═══════════════════════════════════════════════════════════
-- Migración v23: Carrito de ventas (multi-item por venta)
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Agregar columnas a sales para agrupar ítems de una misma venta
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_group_id UUID;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Índice para consultas rápidas por grupo
CREATE INDEX IF NOT EXISTS idx_sales_group_id ON sales(sale_group_id);

-- Las ventas existentes (sale_group_id = NULL) siguen funcionando sin cambios
