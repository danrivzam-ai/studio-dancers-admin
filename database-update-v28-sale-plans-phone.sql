-- ============================================================
-- v28: Agregar campo customer_phone a sale_plans
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

ALTER TABLE sale_plans
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;
