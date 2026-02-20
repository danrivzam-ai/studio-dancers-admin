-- =============================================
-- V13: Sistema de Inventario - Movimientos de stock
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  product_code TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'restock', 'adjustment', 'void_return')),
  quantity INTEGER NOT NULL, -- positivo = entrada, negativo = salida
  stock_before INTEGER,
  stock_after INTEGER,
  reference_id UUID, -- ID de la venta u otra referencia
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inv_movements_date ON inventory_movements(created_at);

-- Asegurar que products tenga columna stock con default 0
DO $$
BEGIN
  -- Si stock es NULL en algún producto, ponerlo en 0
  UPDATE products SET stock = 0 WHERE stock IS NULL;
END $$;
