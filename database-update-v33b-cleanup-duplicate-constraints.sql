-- ============================================================
-- database-update-v33b-cleanup-duplicate-constraints.sql
-- Elimina constraints duplicados que ya existían antes de v33.
-- Deja únicamente los constraints con nombres estandarizados.
-- Ejecutar en Supabase SQL Editor DESPUÉS de v33.
-- ============================================================

-- ── cash_movements — eliminar duplicados previos ─────────────
ALTER TABLE cash_movements
  DROP CONSTRAINT IF EXISTS cash_movements_amount_check,
  DROP CONSTRAINT IF EXISTS cash_movements_type_check;

-- ── payments — eliminar duplicados previos ───────────────────
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_amount_check,
  DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- ── quick_payments — eliminar duplicados previos ─────────────
ALTER TABLE quick_payments
  DROP CONSTRAINT IF EXISTS quick_payments_amount_check,
  DROP CONSTRAINT IF EXISTS quick_payments_payment_method_check;

-- ── sales — eliminar duplicados previos ──────────────────────
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_total_check,
  DROP CONSTRAINT IF EXISTS sales_payment_method_check;

-- ── expenses — eliminar duplicados previos ───────────────────
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_amount_check,
  DROP CONSTRAINT IF EXISTS expenses_payment_method_check;

-- ── cash_registers — eliminar duplicados previos ─────────────
ALTER TABLE cash_registers
  DROP CONSTRAINT IF EXISTS cash_registers_opening_amount_check,
  DROP CONSTRAINT IF EXISTS cash_registers_closing_amount_check,
  DROP CONSTRAINT IF EXISTS cash_registers_status_check;

-- ── students — eliminar duplicados previos ───────────────────
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_monthly_fee_check;

-- ── Verificación final — debe mostrar solo constraints _v33 ──
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.table_name IN (
    'payments', 'quick_payments', 'sales', 'expenses',
    'sale_plan_payments', 'cash_registers', 'cash_movements',
    'students', 'monthly_closes', 'school_settings'
  )
  AND tc.constraint_name NOT LIKE '%_not_null'
ORDER BY tc.table_name, tc.constraint_name;
